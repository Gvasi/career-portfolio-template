import { site } from '@/config/site'
import { projects } from '@/content/projects'

// Keep this vocabulary small: no form values, free text or arbitrary URL parameters.
// Analytics only ever start on the public origin configured in src/config/site.ts.
export const ANALYTICS_ORIGIN = site.url
const PROJECT_IDS: readonly string[] = projects.map(project => project.id)
export const CONSENT_KEY = 'gv.analytics-consent.v1'
export const OWNER_KEY = 'gv.analytics-owner'
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000
export type Consent = 'accepted' | 'declined'
export type AnalyticsEvent = 'project_opened' | 'cv_clicked' | 'contact_started' | 'booking_started' | 'contact_succeeded' | 'booking_succeeded'
export type EventProperties = { project_id?: string; cta_source?: string }

export function safePath(path: string): string {
  return ['/', '/about', '/contact', '/privacy'].includes(path) ? path : '/other'
}

export function safeProperties(properties: EventProperties = {}): EventProperties {
  return {
    ...(PROJECT_IDS.includes(properties.project_id ?? '') ? { project_id: properties.project_id } : {}),
    ...(['project_section', 'hero'].includes(properties.cta_source ?? '') ? { cta_source: properties.cta_source } : {}),
  }
}

export function parseConsent(raw: string | null, now = Date.now()): Consent | null {
  try {
    const value = JSON.parse(raw ?? 'null')
    return value && ['accepted', 'declined'].includes(value.choice) && Number.isFinite(value.at) && value.at <= now && now - value.at < CONSENT_MAX_AGE ? value.choice : null
  } catch { return null }
}

export function validAnonymousId(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}
