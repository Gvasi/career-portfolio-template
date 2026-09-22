'use client'

import { useEffect, useState, type RefObject } from 'react'
import { animate, useMotionValue } from 'framer-motion'

// A step may run at most this many rows ahead of the row currently on screen,
// so a long wheel burst retargets from wherever the reel is instead of queueing.
const MAX_ROWS_AHEAD = 4
const RENDERED_ROWS_BEYOND_TRAVEL = 2
const MAX_TRAVEL_SPAN = 6

/** Owns the reel's cursor, its settled progress, bounded nudging and the travel animation. */
export function useProjectReel({ items, reduced, mobile, measureRef }: {
  items: readonly unknown[]; reduced: boolean; mobile: boolean; measureRef: RefObject<HTMLDivElement | null>
}) {
  const [cursor, setCursor] = useState(0)
  const [settled, setSettled] = useState(0)
  const [rowHeight, setRowHeight] = useState(172)
  const progress = useMotionValue(0)
  const moving = cursor !== settled
  useEffect(() => {
    const control = animate(progress, cursor, {
      duration: reduced ? 0 : mobile ? .32 : .72 + Math.min(4, Math.abs(cursor - progress.get())) * .08,
      ease: [.2, .7, .2, 1],
      onComplete: () => setSettled(cursor),
    })
    return () => control.stop()
  }, [cursor, reduced, mobile, progress])
  useEffect(() => {
    const root = measureRef.current
    if (!root) return
    const measure = () => {
      const height = Math.ceil(Math.max(0, ...Array.from(root.children, child => child.getBoundingClientRect().height)))
      if (height > 0) setRowHeight(height)
    }
    const observer = new ResizeObserver(measure)
    Array.from(root.children).forEach(child => observer.observe(child))
    const frame = requestAnimationFrame(measure)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [items, measureRef])
  // Wheel and arrow steps chain while the reel is still travelling; the animation retargets from wherever it is.
  const nudge = (direction: number) => {
    setCursor(value => Math.abs(value + direction - progress.get()) > MAX_ROWS_AHEAD ? value : value + direction)
  }
  const firstOrdinal = Math.max(Math.min(cursor, settled), cursor - MAX_TRAVEL_SPAN) - RENDERED_ROWS_BEYOND_TRAVEL
  const lastOrdinal = Math.min(Math.max(cursor, settled), cursor + MAX_TRAVEL_SPAN) + RENDERED_ROWS_BEYOND_TRAVEL
  const ordinals = items.length ? Array.from({ length: lastOrdinal - firstOrdinal + 1 }, (_, index) => firstOrdinal + index) : []
  return { cursor, setCursor, settled, moving, progress, rowHeight, nudge, ordinals }
}
