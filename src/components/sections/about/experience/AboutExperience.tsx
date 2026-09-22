'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, MotionConfig, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { aboutIntro, journeyHeading, milestones } from '@/content/career'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import DepthFrame from './DepthFrame'
import ProcessRail from './ProcessRail'
import CareerChapter from './CareerChapter'
import './about-experience.css'

const ease = [.22, 1, .36, 1] as const

function AboutHero({ reduced }: { reduced: boolean }) {
  const enter = (delay: number, fade = true) => ({
    initial: reduced ? false as const : { opacity: fade ? 0 : 1, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : .85, delay: reduced ? 0 : delay, ease },
  })
  return <section id="about" className="ae-hero ae-section-width" aria-labelledby="about-title">
    <div className="ae-hero-grid">
      <div className="ae-hero-copy">
        <motion.h1 id="about-title" {...enter(.14, false)}>People bring me problems. I help find a way forward<span>.</span></motion.h1>
        <motion.p className="ae-hero-description" {...enter(.26, false)}>{aboutIntro.dek}</motion.p>
      </div>
      <motion.div className="ae-portrait-column" {...enter(.22)}>
        <DepthFrame portrait reduced={reduced}>
          <div className="ae-portrait-image"><Image src={aboutIntro.portraitSrc} alt={aboutIntro.portraitAlt} fill priority sizes="(max-width:767px) 45vw, (max-width:1100px) 320px, 24vw" /></div>
        </DepthFrame>
      </motion.div>
      <ProcessRail reduced={reduced}/>
    </div>
  </section>
}

function CareerTimeline({ reduced }: { reduced: boolean }) {
  const rows = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const [active, setActive] = useState(-1)
  const progress = useMotionValue(0)
  const smoothProgress = useSpring(progress, { stiffness: 120, damping: 30, restDelta: .0005 })
  const cursorPosition = useTransform(reduced ? progress : smoothProgress, value => `${value * 100}%`)

  useEffect(() => {
    let frame = 0
    let current = -1
    const geometry: { tops: number[]; start: number; end: number } = { tops: [], start: 0, end: 1 }
    const measure = () => {
      const items = itemRefs.current.filter((item): item is HTMLElement => Boolean(item))
      geometry.tops = items.map(item => item.getBoundingClientRect().top + window.scrollY)
      geometry.start = geometry.tops[0] ?? 0
      const last = items.at(-1)
      geometry.end = last ? last.getBoundingClientRect().bottom + window.scrollY : 1
    }
    const update = () => {
      frame = 0
      if (document.hidden) return
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      const sightline = atEnd ? geometry.end : window.scrollY + Math.min(window.innerHeight * .42, 340)
      let next = -1
      geometry.tops.forEach((top, index) => { if (top <= sightline) next = index })
      if (current !== next) { current = next; setActive(next) }
      progress.set(Math.max(0, Math.min(1, (sightline - geometry.start) / Math.max(1, geometry.end - geometry.start))))
    }
    const schedule = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(update) }
    const resize = () => { measure(); schedule() }
    const observer = new ResizeObserver(resize)
    if (rows.current) observer.observe(rows.current)
    measure(); schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', schedule)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', schedule) }
  }, [progress])

  return <section id="career-journey" className="ae-journey" aria-labelledby="journey-title">
    <div className="ae-section-width">
      <div className="ae-journey-heading">
        <p className="ae-eyebrow section-eyebrow"><Sparkles size={16} aria-hidden="true"/>The journey</p>
        <h2 id="journey-title">{journeyHeading.title}<span>.</span></h2>
        <p>{journeyHeading.subhead}</p>
      </div>
      <div className="ae-milestones" ref={rows}>
        <div className="ae-journey-line" aria-hidden="true"><motion.div style={{ scaleY: reduced ? progress : smoothProgress }}/><motion.i className="ae-journey-cursor" style={{ top: cursorPosition }}/></div>
        {milestones.map((item, index) => <CareerChapter key={item.id} item={item} active={index === active} reduced={reduced} register={node => { itemRefs.current[index] = node }}/>) }
      </div>
    </div>
  </section>
}

export default function AboutExperience() {
  // Stable server markup; CSS suppresses motion before this preference hydrates.
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return <MotionConfig reducedMotion="user">
    <div className="about-experience"><AboutHero reduced={reduced}/><CareerTimeline reduced={reduced}/></div>
  </MotionConfig>
}
