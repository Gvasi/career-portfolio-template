'use client'

import { useEffect, useState, type RefObject } from 'react'
import { closingPhrases } from '@/content/home'
import { useMotionActivity } from '@/hooks/useMotionActivity'

// Keep these durations in sync with the keyframes in Cta.module.css.
const TIMINGS = {
  primaryExit: 600,
  clearStage: 400,
  primaryEnter: 1000,
  pauseAfterPrimary: 450,
  secondaryEnter: 700,
  secondaryDisplay: 3000,
  secondaryExit: 600,
} as const

type RowPhase = 'hidden' | 'entering' | 'idle' | 'exiting'

interface ReelState {
  primaryIndex: number
  primaryPhase: RowPhase
  secondaryIndex: number
  secondaryPhase: RowPhase
}

const INITIAL_STATE: ReelState = {
  primaryIndex: 0,
  primaryPhase: 'idle',
  secondaryIndex: -1,
  secondaryPhase: 'hidden',
}

/** Restart the phrase sequence when visible; reduced motion keeps the first pair. */
export function useClosingReel(rootRef: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<ReelState>(INITIAL_STATE)
  const { active, reduced, inView } = useMotionActivity(rootRef, { amount: 0.18 })

  useEffect(() => {
    if (!active) return

    let primaryIndex = 0
    let secondaryIndex = -1
    const timers = new Set<ReturnType<typeof setTimeout>>()

    function schedule(callback: () => void, delay: number) {
      const timer = setTimeout(() => {
        timers.delete(timer)
        callback()
      }, delay)
      timers.add(timer)
    }

    function clearTimers() {
      timers.forEach(clearTimeout)
      timers.clear()
    }

    function showNextSecondary() {
      const hasCurrentPhrase = secondaryIndex >= 0
      if (hasCurrentPhrase) {
        setState(previous => ({ ...previous, secondaryPhase: 'exiting' }))
      }
      schedule(() => {
        secondaryIndex = (secondaryIndex + 1) % closingPhrases[primaryIndex].secondary.length
        setState(previous => ({ ...previous, secondaryIndex, secondaryPhase: 'entering' }))
        schedule(() => {
          setState(previous => ({ ...previous, secondaryPhase: 'idle' }))
        }, TIMINGS.secondaryEnter)
      }, hasCurrentPhrase ? TIMINGS.secondaryExit : 0)
    }

    function secondaryTick() {
      showNextSecondary()
      schedule(secondaryTick, TIMINGS.secondaryDisplay)
    }

    function startSecondaryCycle() {
      showNextSecondary()
      // This is a start-to-start interval, including exit/entrance time; it is
      // deliberately not an additional three-second hold after every entrance.
      schedule(secondaryTick, TIMINGS.secondaryDisplay)
      schedule(advancePrimary, closingPhrases[primaryIndex].secondary.length * TIMINGS.secondaryDisplay)
    }

    function advancePrimary() {
      // Cancel the secondary tick due at the same boundary, so an outgoing set
      // cannot restart while the next primary phrase is entering.
      clearTimers()
      setState(previous => ({ ...previous, primaryPhase: 'exiting', secondaryPhase: 'exiting' }))
      schedule(() => {
        setState(previous => ({ ...previous, primaryPhase: 'hidden', secondaryPhase: 'hidden' }))
        schedule(() => {
          primaryIndex = (primaryIndex + 1) % closingPhrases.length
          secondaryIndex = -1
          setState({ primaryIndex, primaryPhase: 'entering', secondaryIndex, secondaryPhase: 'hidden' })
          schedule(() => {
            setState(previous => ({ ...previous, primaryPhase: 'idle' }))
            schedule(startSecondaryCycle, TIMINGS.pauseAfterPrimary)
          }, TIMINGS.primaryEnter)
        }, TIMINGS.clearStage)
      }, TIMINGS.primaryExit)
    }

    schedule(() => setState(INITIAL_STATE), 0)
    schedule(startSecondaryCycle, TIMINGS.pauseAfterPrimary)
    return clearTimers
  }, [active])

  const visibleState: ReelState = reduced
    ? { ...INITIAL_STATE, secondaryIndex: 0, secondaryPhase: 'idle' }
    : state
  return { ...visibleState, isActive: inView, isAnimating: active }
}
