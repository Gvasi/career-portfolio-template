'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { CONSENT_KEY, OWNER_KEY, type Consent } from '@/lib/analytics/policy'
import { CONSENT_CHANGE_EVENT, isOwnerExcluded, readConsent, saveConsentChoice, syncAnalyticsConsent, trackEvent, trackPage } from '@/lib/analytics/client'
import styles from './AnalyticsPreferences.module.css'
import { site } from '@/config/site'

function ChoiceButtons({ onSave }: { onSave: (choice: Consent) => void }) {
  return <div className={styles.actions}>
    <button type="button" onClick={() => onSave('declined')}>Decline</button>
    <button type="button" onClick={() => onSave('accepted')}>Accept</button>
  </div>
}

/** A visible entry point reopens the same two choices without a second confirmation. */
export function PrivacyCookieChoices() {
  const dialog = useRef<HTMLDialogElement>(null)
  const dialogId = useId()
  const [choice, setChoice] = useState<Consent | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  useEffect(() => {
    const refresh = () => setChoice(isOwnerExcluded() ? 'declined' : readConsent())
    const timer = window.setTimeout(refresh, 0)
    window.addEventListener(CONSENT_CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(CONSENT_CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return <div className={styles.preferences} data-cookie-settings>
    <button className={styles.manage} type="button" aria-haspopup="dialog" aria-controls={dialogId} onClick={() => {
      setChoice(isOwnerExcluded() ? 'declined' : readConsent())
      setSaveFailed(false)
      dialog.current?.showModal()
    }}>Cookie preferences</button>
    <dialog ref={dialog} id={dialogId} className={styles.dialog} aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-status`}>
      <div className={styles.dialogHeader}>
        <h2 id={`${dialogId}-title`}>Cookie preferences</h2>
        <button className={styles.close} type="button" aria-label="Close cookie preferences" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>
      </div>
      <p id={`${dialogId}-status`} className={styles.status} role="status">{saveFailed
        ? 'Your choice could not be saved. Optional cookies are off for this visit.'
        : choice === 'accepted' ? 'Optional cookies are on.' : 'Optional cookies are off.'}</p>
      <ChoiceButtons onSave={next => {
        const stored = saveConsentChoice(next)
        setChoice(stored ? next : 'declined')
        setSaveFailed(!stored)
        if (stored) dialog.current?.close()
      }} />
    </dialog>
  </div>
}

export default function AnalyticsPreferences() {
  const path = usePathname()
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const consent = readConsent()
    void syncAnalyticsConsent(consent).then(() => trackPage(window.location.pathname))
    const timer = window.setTimeout(() => setOpen(consent === null), 0)
    function changed() {
      window.clearTimeout(timer)
      setOpen(false)
    }
    function storage(event: StorageEvent) {
      if (event.key === CONSENT_KEY || event.key === OWNER_KEY || event.key === null) {
        const next = readConsent()
        if (next === null) document.documentElement.removeAttribute('data-gv-analytics-consent')
        setOpen(next === null)
        void syncAnalyticsConsent(next).then(() => trackPage(window.location.pathname))
      }
    }
    function linkClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest('a') : null
      if (target?.getAttribute('href') === site.assets.cv) void trackEvent('cv_clicked', { cta_source: 'hero' })
    }
    window.addEventListener(CONSENT_CHANGE_EVENT, changed)
    window.addEventListener('storage', storage)
    document.addEventListener('click', linkClick)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(CONSENT_CHANGE_EVENT, changed)
      window.removeEventListener('storage', storage)
      document.removeEventListener('click', linkClick)
    }
  }, [])

  useEffect(() => { void trackPage(path) }, [path])

  // Privacy provides its own preferences entry point.
  if (!open || path === '/privacy') return null
  return <section className={styles.panel} data-analytics-panel data-automatic="true" aria-labelledby="analytics-heading" aria-describedby="analytics-description">
    <div className={styles.copy}>
      <h2 id="analytics-heading" className="sr-only">Cookies</h2>
      <p id="analytics-description">Optional third-party cookies help me understand site visits. <a href="/privacy#cookies">Privacy</a>.</p>
    </div>
    <ChoiceButtons onSave={next => { saveConsentChoice(next); setOpen(false) }} />
  </section>
}
