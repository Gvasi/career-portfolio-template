'use client'

import { useEffect } from 'react'

/** Fetch only after interest in a Contact link, rather than on every page view. */
export default function ContactAvailabilityWarmup() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastAttempt = 0
    const warm = () => {
      if (Date.now() - lastAttempt < 30_000 || document.hidden) return
      lastAttempt = Date.now()
      void import('@/lib/contact/availability').then(module => module.warmContactAvailability()).catch(() => undefined)
    }
    const onIntent = (event: Event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!link) return
      const url = new URL(link.getAttribute('href')!, window.location.href)
      if (url.origin !== window.location.origin || url.pathname !== '/contact' || window.location.pathname === '/contact') return
      clearTimeout(timer)
      if (event.type === 'pointerdown' || event.type === 'focusin') warm()
      else timer = setTimeout(warm, 120)
    }
    const cancelHover = () => clearTimeout(timer)
    document.addEventListener('pointerover', onIntent, { passive: true })
    document.addEventListener('pointerout', cancelHover, { passive: true })
    document.addEventListener('pointerdown', onIntent, { passive: true })
    document.addEventListener('focusin', onIntent)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerover', onIntent)
      document.removeEventListener('pointerout', cancelHover)
      document.removeEventListener('pointerdown', onIntent)
      document.removeEventListener('focusin', onIntent)
    }
  }, [])
  return null
}
