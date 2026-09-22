'use client'

import { useRef, type ReactNode, type PointerEvent } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

export default function DepthFrame({ children, className = '', reduced = false, portrait = false, active = false }: {
  children: ReactNode
  className?: string
  reduced?: boolean
  portrait?: boolean
  active?: boolean
}) {
  const bounds = useRef<DOMRect | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(y, { stiffness: 100, damping: 22 })
  const rotateY = useSpring(x, { stiffness: 100, damping: 22 })
  const lightX = useTransform(rotateY, [-4, 4], ['28%', '72%'])
  const reset = () => { x.set(0); y.set(0); bounds.current = null }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== 'mouse' || !bounds.current) return
    const rect = bounds.current
    x.set(((event.clientX - rect.left) / rect.width - .5) * (portrait ? 6 : 3))
    y.set(-((event.clientY - rect.top) / rect.height - .5) * (portrait ? 4 : 2))
  }
  return <div className={`ae-depth-stage ${portrait ? 'ae-is-portrait' : ''} ${className}`} data-active={active}
    onPointerEnter={event => { if (!reduced && event.pointerType === 'mouse') bounds.current = event.currentTarget.getBoundingClientRect() }}
    onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
    <motion.div className="ae-depth-object" style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY, transformPerspective: 1100 }}>
      <div className="ae-frame-backing" aria-hidden="true" />
      <div className="ae-photo-frame">
        {children}
        <motion.div aria-hidden="true" className="ae-frame-light" style={{ backgroundPositionX: lightX }} />
        {portrait && <><i className="ae-frame-corner ae-top-corner" aria-hidden="true" /><i className="ae-frame-corner ae-bottom-corner" aria-hidden="true" /></>}
      </div>
    </motion.div>
  </div>
}
