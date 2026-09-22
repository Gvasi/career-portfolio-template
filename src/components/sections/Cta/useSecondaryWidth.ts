'use client'

import { useEffect, type RefObject } from 'react'
import { closingPhrases } from '@/content/home'

/** Reserve the longest phrase's width so the centered heading does not jump. */
export function useSecondaryWidth(containerRef: RefObject<HTMLSpanElement | null>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let resizeTimer: ReturnType<typeof setTimeout> | undefined

    function measure() {
      if (!container?.parentElement) return
      const probe = document.createElement('span')
      probe.style.cssText = `position:absolute;visibility:hidden;font-weight:800;white-space:nowrap;font-size:${getComputedStyle(container.parentElement).fontSize};`
      document.body.appendChild(probe)
      let maxWidth = 0
      for (const set of closingPhrases) {
        for (const phrase of set.secondary) {
          probe.textContent = phrase.t
          maxWidth = Math.max(maxWidth, probe.getBoundingClientRect().width)
        }
      }
      container.style.minWidth = `${Math.ceil(maxWidth + 100)}px`
      probe.remove()
    }

    function onResize() {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(measure, 100)
    }

    measure()
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
    }
  }, [containerRef])
}
