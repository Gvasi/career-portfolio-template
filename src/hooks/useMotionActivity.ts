'use client'

import { useCallback, useSyncExternalStore, type RefObject } from 'react'
import { useInView } from 'framer-motion'

const serverFalse = () => false
const serverTrue = () => true
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify)
  return () => document.removeEventListener('visibilitychange', notify)
}
const getVisibility = () => document.visibilityState === 'visible'

/** Stable server snapshot prevents reduced-motion hydration mismatches. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback((notify: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', notify)
    return () => media.removeEventListener('change', notify)
  }, [query])
  const snapshot = useCallback(() => window.matchMedia(query).matches, [query])
  return useSyncExternalStore(subscribe, snapshot, serverFalse)
}

export function usePageVisible() {
  return useSyncExternalStore(subscribeVisibility, getVisibility, serverTrue)
}

/** Continuous motion only runs while someone can actually see it. */
export function useMotionActivity(
  ref: RefObject<HTMLElement | null>,
  { amount = 0.1 }: { amount?: number } = {},
) {
  const inView = useInView(ref, { amount })
  const visible = usePageVisible()
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return { active: inView && visible && !reduced, reduced, inView }
}
