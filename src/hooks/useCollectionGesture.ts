'use client'

import { useEffect, useRef, type RefObject } from 'react'

// Current wheel policy values (interaction tuning, not hardware constants):
// a pixel-mode delta at or above COARSE_WHEEL_DELTA, or any line/page-mode
// delta, counts as one whole step at once; smaller pixel deltas accumulate to
// one step per WHEEL_STEP_PIXELS, with partial accumulation dropped after
// WHEEL_IDLE_RESET_MS or on a direction change. Browsers expose no reliable
// device identity: a large pixel delta can come from a notched mouse or from a
// fast trackpad flick alike, so this is a coarse-event heuristic only.
export const COARSE_WHEEL_DELTA = 50
export const WHEEL_STEP_PIXELS = 60
export const WHEEL_IDLE_RESET_MS = 220
const LINE_HEIGHT_PIXELS = 16

export type WheelAccumulator = { total: number; last: number }

export function createWheelAccumulator(): WheelAccumulator {
  return { total: 0, last: 0 }
}

/** Returns the signed number of steps one wheel delta (already in pixels) produces, updating the accumulator. */
export function accumulateWheelSteps(state: WheelAccumulator, { delta, coarse, now }: { delta: number; coarse: boolean; now: number }) {
  if (now - state.last > WHEEL_IDLE_RESET_MS) state.total = 0
  state.last = now
  if (!delta) return 0
  const direction = Math.sign(delta)
  if (coarse) { state.total = 0; return direction }
  if (direction !== Math.sign(state.total)) state.total = 0
  state.total += delta
  let steps = 0
  while (Math.abs(state.total) >= WHEEL_STEP_PIXELS) { state.total -= WHEEL_STEP_PIXELS * direction; steps += direction }
  return steps
}

/** Horizontal touch gestures leave vertical page scrolling to the browser. */
export function useCollectionGesture(ref: RefObject<HTMLElement | null>, step: (direction: number) => void, options: { wheel?: boolean; disabled?: boolean; drag?: boolean; onStart?: () => void } = {}) {
  const callback = useRef({ step, onStart: options.onStart })
  useEffect(() => { callback.current = { step, onStart: options.onStart } }, [step, options.onStart])
  const { wheel = false, disabled = false, drag = false } = options
  useEffect(() => {
    const root = ref.current
    if (!root || disabled) return
    let start: { id: number; x: number; y: number } | null = null
    const accumulator = createWheelAccumulator()
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || (event.pointerType === 'mouse' && !drag)) return
      start = { id: event.pointerId, x: event.clientX, y: event.clientY }
      callback.current.onStart?.()
    }
    const pointerMove = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return
      const dx = Math.abs(event.clientX - start.x)
      const dy = Math.abs(event.clientY - start.y)
      if (dy > 10 && dy > dx * 1.4) { start = null; return }
      // Capture only after horizontal intent; ordinary taps keep their button target.
      if (dx > 10 && dx > dy * 1.4 && !root.hasPointerCapture(event.pointerId)) root.setPointerCapture(event.pointerId)
    }
    const pointerUp = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      start = null
      if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        callback.current.step(dx < 0 ? 1 : -1)
        // The touch's synthetic click must not select the card under its endpoint.
        suppressClickUntil = performance.now() + 350
      }
    }
    let suppressClickUntil = 0
    const click = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation() }
    }
    const cancel = () => { start = null }
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !window.matchMedia('(hover:hover) and (min-width:768px)').matches) return
      // Once a scroll sequence is already in flight (page momentum passing over the reel) the browser
      // delivers non-cancelable events; preventDefault would be ignored, so that scroll stays with the page.
      if (!event.cancelable) return
      const delta = event.deltaY * (event.deltaMode === 1 ? LINE_HEIGHT_PIXELS : event.deltaMode === 2 ? root.clientHeight : 1)
      const coarse = event.deltaMode !== 0 || Math.abs(delta) >= COARSE_WHEEL_DELTA
      const steps = accumulateWheelSteps(accumulator, { delta, coarse, now: performance.now() })
      if (!delta) return
      event.preventDefault()
      for (let remaining = Math.abs(steps); remaining > 0; remaining--) callback.current.step(Math.sign(steps))
    }
    root.addEventListener('pointerdown', pointerDown)
    root.addEventListener('pointermove', pointerMove, { passive: true })
    root.addEventListener('pointerup', pointerUp)
    root.addEventListener('pointercancel', cancel)
    root.addEventListener('click', click, true)
    if (wheel) root.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      root.removeEventListener('pointerdown', pointerDown)
      root.removeEventListener('pointermove', pointerMove)
      root.removeEventListener('pointerup', pointerUp)
      root.removeEventListener('pointercancel', cancel)
      root.removeEventListener('click', click, true)
      root.removeEventListener('wheel', onWheel)
    }
  }, [ref, wheel, disabled, drag])
}
