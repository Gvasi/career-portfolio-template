'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import type { AnimationItem } from 'lottie-web'
import { useMotionActivity } from '@/hooks/useMotionActivity'
import styles from './SectionAccent.module.css'

// One animation per chapter under public/animations/how-i-work: `<file>.json`
// (Lottie) and `<file>-poster.webp` (its still frame). The scale and offset
// fit each composition into the accent's square; the bundled originals are
// drawn to fill it, so they need no correction.
const artwork = {
  translator: { file: 'translate', scale: 1, mobileScale: 1, x: '0%', y: '0%', speed: .9 },
  ownership: { file: 'growth', scale: 1, mobileScale: 1, x: '0%', y: '0%', speed: .9 },
  clarity: { file: 'ai', scale: 1, mobileScale: 1, x: '0%', y: '0%', speed: .68 },
  systems: { file: 'data', scale: 1, mobileScale: 1, x: '0%', y: '0%', speed: .9 },
  growth: { file: 'systems', scale: 1, mobileScale: 1, x: '0%', y: '0%', speed: .9 },
  value: { file: 'momentum', scale: 1, mobileScale: 1, x: '0%', y: '0%', speed: .9 },
} as const

type AccentId = keyof typeof artwork

/** Preserve the original artwork with a local SVG player, loaded on demand. */
export default function SectionAccent({ id, variant = 'desktop' }: {
  id: AccentId
  variant?: 'desktop' | 'mobile'
}) {
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const player = useRef<AnimationItem | null>(null)
  const { active, reduced } = useMotionActivity(root)
  const [requested, setRequested] = useState(false)
  const [ready, setReady] = useState(false)
  const art = artwork[id]
  const source = `/animations/how-i-work/${art.file}`
  const speed = variant === 'mobile' ? Math.min(art.speed, .82) : art.speed

  useEffect(() => {
    if (active) setRequested(true)
  }, [active])

  useEffect(() => {
    if (!requested || reduced || !canvas.current) return
    const container = canvas.current
    const controller = new AbortController()
    let disposed = false
    let instance: AnimationItem | undefined
    setReady(false)

    async function load() {
      try {
        const [module, response] = await Promise.all([
          import('lottie-web/build/player/lottie_light'),
          fetch(`${source}.json`, { cache: 'force-cache', signal: controller.signal }),
        ])
        if (!response.ok) return
        const animationData = await response.json()
        if (disposed) return
        instance = module.default.loadAnimation({
          container, renderer: 'svg', loop: true, autoplay: false, animationData,
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet', hideOnTransparent: true },
        })
        player.current = instance
        instance.setSubframe(false)
        const show = () => {
          if (disposed || !instance) return
          // Start at the poster's frame so the still-to-motion handoff is quiet.
          instance.goToAndStop(Math.floor(instance.totalFrames * .3), true)
          setReady(true)
        }
        if (instance.isLoaded) show()
        else instance.addEventListener('DOMLoaded', show)
      } catch {
        // A failed request leaves the original still artwork in place.
      }
    }
    void load()
    return () => {
      disposed = true
      controller.abort()
      instance?.destroy()
      player.current = null
    }
  }, [requested, reduced, source])

  useEffect(() => {
    if (!player.current || !ready) return
    player.current.setSpeed(speed)
    if (active) player.current.play()
    else player.current.pause()
  }, [active, ready, speed])

  return <div ref={root} className={styles.accent} data-how-accent={id}
    data-variant={variant} data-active={active} data-reduced={reduced}
    data-ready={ready && !reduced} data-playing={active && ready}
    style={{ '--art-scale': variant === 'mobile' ? art.mobileScale : art.scale, '--art-x': art.x, '--art-y': art.y } as CSSProperties}
    aria-hidden="true">
    <div className={styles.artwork}>
      <Image className={styles.poster} src={`${source}-poster.webp`} alt="" width={512} height={512}
        sizes="112px" unoptimized loading="lazy" />
      <div ref={canvas} className={styles.player} />
    </div>
  </div>
}
