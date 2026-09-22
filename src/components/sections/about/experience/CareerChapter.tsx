'use client'

import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Briefcase, GraduationCap, MapPin } from 'lucide-react'
import type { Milestone } from '@/content/career'
import CareerArtwork from './CareerArtwork'

const settle = { stiffness: 150, damping: 30, mass: .7, restDelta: .001 }

export default function CareerChapter({ item, active, reduced, register }: {
  item: Milestone
  active: boolean
  reduced: boolean
  register: (node: HTMLElement | null) => void
}) {
  const element = useRef<HTMLElement>(null)
  const paragraph = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: element, offset: ['start 95%', 'start 45%'] })
  const { scrollYProgress: readingProgress } = useScroll({ target: paragraph, offset: ['start 95%', 'start 65%'] })
  const arrival = useSpring(scrollYProgress, settle)
  const reading = useSpring(readingProgress, settle)
  const dateX = useTransform(arrival, [0, .62, 1], [-22, 0, 0])
  const companyY = useTransform(arrival, [0, .12, .78, 1], [20, 20, 0, 0])
  const headingY = useTransform(arrival, [0, .15, .86, 1], [30, 30, 0, 0])
  const locationY = useTransform(arrival, [0, .22, .92, 1], [24, 24, 0, 0])
  const paragraphY = useTransform(reading, [0, .85, 1], [24, 0, 0])
  const tagsY = useTransform(reading, [0, .15, 1], [28, 28, 0])
  const Icon = item.type === 'education' ? GraduationCap : Briefcase
  return <article id={`career-${item.id}`} ref={node => { element.current = node; register(node) }} className="ae-milestone" data-active={active} aria-labelledby={`role-${item.id}`}>
    <motion.div className="ae-milestone-date" style={{ x: reduced ? 0 : dateX }}><span className="ae-large-year">{item.year}</span><span className="ae-date-range">{item.dateRange}</span></motion.div>
    <div className="ae-milestone-node" aria-hidden="true"><Icon size={17} strokeWidth={1.6}/></div>
    <div className="ae-milestone-copy">
      <motion.div className="ae-company-meta" style={{ y: reduced ? 0 : companyY }}><span className="ae-company">{item.company}</span><span className="ae-mobile-period">{item.dateRange}</span></motion.div>
      <motion.h3 id={`role-${item.id}`} style={{ y: reduced ? 0 : headingY }}>{item.role}</motion.h3>
      <motion.div className="ae-location" style={{ y: reduced ? 0 : locationY }}><MapPin size={13} aria-hidden="true"/>{item.location}</motion.div>
      <motion.p ref={paragraph} style={{ y: reduced ? 0 : paragraphY }}>{item.description}</motion.p>
    </div>
    <CareerArtwork image={item.image!} position={item.imagePosition} description={`Career illustration: ${item.role} at ${item.company}`} active={active} reduced={reduced}/>
    <motion.ul className="ae-highlights" style={{ y: reduced ? 0 : tagsY }} aria-label="Areas of experience">
      {item.highlights?.map((text, index) => <li key={text}>
        <span className="sr-only md:not-sr-only">{text}</span>
        <span className="md:hidden" aria-hidden="true">{item.mobileHighlights?.[index] ?? text}</span>
      </li>)}
    </motion.ul>
  </article>
}
