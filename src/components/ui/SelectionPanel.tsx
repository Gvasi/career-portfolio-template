'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import { selectionDistance, selectionTransition } from '@/lib/selectionMotion'

/** Retain state; reserveSpace also keeps inactive content's intrinsic grid size. */
export default function SelectionPanel({ active, offset = 1, className = '', reserveSpace = false, children }: {
  active: boolean; offset?: number; className?: string; reserveSpace?: boolean; children: ReactNode
}) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return <motion.div className={className} data-selected={active}
    aria-hidden={!active} inert={!active}
    initial={active ? 'selected' : 'rest'} animate={active ? 'selected' : 'departed'}
    variants={{
      rest: { opacity: 0, x: reduced ? 0 : offset * selectionDistance, display: reserveSpace ? 'flex' : 'none', visibility: 'hidden' },
      selected: { display: 'flex', visibility: 'visible', opacity: 1, x: 0 },
      departed: { opacity: 0, x: reduced ? 0 : offset * selectionDistance, transitionEnd: { display: reserveSpace ? 'flex' : 'none', visibility: 'hidden' } },
    }}
    transition={reduced ? { duration: 0 } : selectionTransition}>
    {children}
  </motion.div>
}
