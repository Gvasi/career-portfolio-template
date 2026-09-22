'use client'

import type { PostHog } from 'posthog-js'
import { SITE_HOST } from '@/config/site'
import { ANALYTICS_ORIGIN, CONSENT_KEY, OWNER_KEY, parseConsent, safePath, safeProperties, validAnonymousId, type AnalyticsEvent, type Consent, type EventProperties } from './policy'

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
let posthog: PostHog | undefined
let initializing: Promise<void> | undefined
let choice: Consent | null = null
let lastPath: string | undefined
let gaStarted = false
let epoch = 0

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function readConsent() {
  try { return parseConsent(localStorage.getItem(CONSENT_KEY)) } catch { return null }
}

export function isOwnerExcluded() {
  try { return localStorage.getItem(OWNER_KEY) === 'true' } catch { return true }
}

export const CONSENT_CHANGE_EVENT = 'gv:consent-change'

/** An explicit new choice replaces the retired browser-exclusion preference. */
export function saveConsentChoice(next: Consent) {
  let stored = false
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: next, at: Date.now() }))
    if (next === 'accepted') localStorage.removeItem(OWNER_KEY)
    stored = true
  } catch { /* If saving fails, optional tracking stops for this visit. */ }
  void syncAnalyticsConsent(stored ? next : 'declined').then(() => trackPage(window.location.pathname))
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT))
  return stored
}

function enabled() {
  return typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && window.location.origin === ANALYTICS_ORIGIN && navigator.doNotTrack !== '1' && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl && choice === 'accepted' && readConsent() === 'accepted' && !isOwnerExcluded()
}

function referrer() {
  try { return new URL(document.referrer).origin } catch { return '' }
}

function googleDisabled(disabled: boolean) {
  if (gaId) Object.defineProperty(window, `ga-disable-${gaId}`, { value: disabled, writable: true, configurable: true })
}

function clearAnalyticsStorage() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('ph_') && token && key.includes(token)) localStorage.removeItem(key)
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('ph_') && token && key.includes(token)) sessionStorage.removeItem(key)
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim()
      if (name === '_ga' || name.startsWith('_ga_') || (name.startsWith('ph_') && token && name.includes(token))) {
        for (const domain of ['', location.hostname, `.${SITE_HOST.replace(/^www\./, '')}`]) document.cookie = `${name}=; Max-Age=0; Path=/;${domain ? ` Domain=${domain};` : ''} SameSite=Lax; Secure`
      }
    }
  } catch { /* Storage restrictions must not break the site. */ }
}

function startGoogle() {
  if (!gaId || !/^G-[A-Z0-9]+$/.test(gaId) || !enabled()) return
  googleDisabled(false)
  if (gaStarted) return
  gaStarted = true
  window.dataLayer = window.dataLayer ?? []
  // gtag.js reads the Arguments object it is handed; a rest-parameter array is not processed as a command.
  // eslint-disable-next-line prefer-rest-params
  window.gtag = function () { window.dataLayer?.push(arguments) }
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
  window.gtag('js', new Date())
  window.gtag('config', gaId, {
    send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
    page_location: ANALYTICS_ORIGIN + safePath(location.pathname), page_referrer: referrer(),
    cookie_expires: 15552000, cookie_update: false,
  })
  const script = document.createElement('script')
  script.id = 'gv-google-analytics'
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  script.async = true
  document.head.appendChild(script)
}

async function initialize() {
  if (!enabled()) return
  startGoogle()
  if (posthog || !token || host !== 'https://eu.i.posthog.com') return
  if (!initializing) {
    const startedAt = epoch
    initializing = import('posthog-js').then(({ default: sdk }) => {
      if (!enabled() || epoch !== startedAt) return
      sdk.init(token, {
        api_host: host, ui_host: 'https://eu.posthog.com', defaults: '2026-05-30',
        autocapture: false, capture_pageview: false, capture_pageleave: false,
        capture_dead_clicks: false, rageclick: false, capture_heatmaps: false,
        capture_exceptions: false, capture_performance: false, disable_session_recording: true,
        disable_surveys: true, advanced_disable_flags: true, disable_external_dependency_loading: true,
        person_profiles: 'never', persistence: 'localStorage', cross_subdomain_cookie: false,
        respect_dnt: true, save_referrer: false, store_google: false, ip: false,
        before_send: event => {
          if (!event || !enabled()) return null
          const permitted = ['$pageview', 'project_opened', 'cv_clicked', 'contact_started', 'booking_started']
          if (!permitted.includes(event.event)) return null
          // Rebuild the payload so SDK defaults cannot add query strings, form data or personal profiles.
          const source = event.properties ?? {}
          const props: Record<string, unknown> = {
            ...safeProperties(source), distinct_id: source.distinct_id,
            // Required by the SDK for ingestion; this is the public project token.
            token,
            $current_url: ANALYTICS_ORIGIN + safePath(location.pathname),
            $pathname: safePath(location.pathname), $host: SITE_HOST,
            $referrer: referrer(), $referring_domain: referrer() ? new URL(referrer()).hostname : '',
            $process_person_profile: false, $geoip_disable: true, $ip: null,
          }
          for (const key of ['$session_id', '$window_id', '$device_type', '$browser', '$os', '$screen_width', '$screen_height', '$lib', '$lib_version']) {
            if (source[key] !== undefined) props[key] = source[key]
          }
          event.properties = props
          return event
        },
      })
      posthog = sdk
    }).catch(() => { /* Analytics blocking must not affect navigation or forms. */ }).finally(() => { initializing = undefined })
  }
  await initializing
}

export async function syncAnalyticsConsent(next: Consent | null) {
  choice = next
  if (!enabled()) {
    epoch++
    lastPath = undefined
    googleDisabled(true)
    posthog?.opt_out_capturing()
    clearAnalyticsStorage()
    return
  }
  await initialize()
  if (enabled() && posthog?.has_opted_out_capturing()) posthog.opt_in_capturing()
}

export async function trackPage(path: string) {
  const route = safePath(path)
  if (!enabled()) return
  await initialize()
  if (!enabled() || safePath(location.pathname) !== route || lastPath === route) return
  lastPath = route
  posthog?.capture('$pageview')
  window.gtag?.('event', 'page_view', { send_to: gaId, page_location: ANALYTICS_ORIGIN + route, page_title: route === '/' ? 'Home' : route.slice(1), page_referrer: referrer() })
}

export async function trackEvent(event: AnalyticsEvent, properties: EventProperties = {}) {
  if (!enabled()) return
  await initialize()
  if (!enabled()) return
  // Successful conversions are emitted by the server to PostHog, once per confirmed operation.
  if (event !== 'contact_succeeded' && event !== 'booking_succeeded') posthog?.capture(event, safeProperties(properties))
  window.gtag?.('event', event, { ...safeProperties(properties), send_to: gaId, page_location: ANALYTICS_ORIGIN + safePath(location.pathname) })
}

export function analyticsHeaders(): Record<string, string> {
  // A form submission must never wait for the optional analytics chunk or network.
  if (!enabled()) return {}
  const id = posthog?.get_distinct_id()
  const session = posthog?.get_session_id()
  return validAnonymousId(id ?? null) ? {
    'X-Analytics-Consent': 'accepted', 'X-POSTHOG-DISTINCT-ID': id!,
    ...(validAnonymousId(session ?? null) ? { 'X-POSTHOG-SESSION-ID': session! } : {}),
  } : {}
}
