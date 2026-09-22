'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Download, Github, Globe2, Linkedin, MapPin } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import { selectionEase as easing } from '@/lib/selectionMotion'
import { site } from '@/config/site'
import { codeStories, hero } from '@/content/home'
import portraitLoader, { PORTRAIT_SOURCE } from './portraitLoader'
import HeroTerminal from './HeroTerminal'
import './hero.css'

const SOCIAL_LINKS = site.exampleContent ? [] : [
  { name: 'GitHub', href: site.github, Icon: Github, side: 'left' },
  { name: 'LinkedIn', href: site.linkedin, Icon: Linkedin, side: 'right' },
]
// The widest outcome reserves the line so the sentence never reflows while the word rotates.
const OUTCOME_RESERVE = codeStories.reduce((widest, story) => story.outcome.length > widest.length ? story.outcome : widest, '')

function Portrait() {
  return (
    <div className="sg-portrait-stage sg-refined-portrait-stage">
      <figure className="sg-portrait sg-refined-portrait sg-portrait-still">
        <span className="sg-portrait-face">
          <Image src={PORTRAIT_SOURCE} loader={portraitLoader} alt={site.name} fill loading="eager" fetchPriority="high" sizes="(max-width:767px) 157px, 340px" quality={75}/>
        </span>
      </figure>
    </div>
  )
}

function HeroSocialLinks() {
  const [tooltip, setTooltip] = useState<string | null>(null)
  useEffect(() => {
    if (!tooltip) return
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') setTooltip(null) }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [tooltip])
  if (SOCIAL_LINKS.length === 0) return null
  return (
    <div className="sg-social-links">
      {SOCIAL_LINKS.map(({ name, href, Icon, side }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} (opens in a new tab)`}
          data-tooltip-side={side}
          data-tooltip-visible={tooltip === name}
          onPointerEnter={event => { if (event.pointerType !== 'touch') setTooltip(name) }}
          onPointerLeave={() => setTooltip(null)}
          onFocus={event => { if (event.target.matches(':focus-visible')) setTooltip(name) }}
          onBlur={() => setTooltip(null)}
        >
          <Icon size={17} aria-hidden="true"/>
          <span className="sg-social-tooltip" aria-hidden="true">{name}</span>
        </a>
      ))}
    </div>
  )
}

/** The Home hero: greeting with the rotating outcome word, portrait, code-story terminal and the primary actions. */
export default function Hero() {
  const [index, setIndex] = useState(0)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const outcome = codeStories[index].outcome
  return (
    <section id="home" className="sg-surface sg-hero sg-refined-hero" aria-label={`About ${site.firstName}`}>
      <div className="sg-hero-grid">
        <div className="sg-greeting">
          <h1>{hero.greetingPrefix}<span>{site.firstName}</span>.</h1>
          <p className="sg-hero-value">{hero.valueLine}<br className="sg-desktop-break"/> {hero.valueLead}<span className="sg-hero-outcome" data-outcome={outcome}>
            <span className="sg-outcome-reserve" aria-hidden="true">{OUTCOME_RESERVE}</span>
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                className="sg-hero-outcome-word"
                key={outcome}
                initial={{ opacity: 0, y: reduced ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -4 }}
                transition={{ duration: reduced ? 0 : .22, ease: easing }}
              >
                {outcome}
                <svg viewBox="0 0 240 8" aria-hidden="true">
                  <motion.path
                    d="M2 5 Q109 0 238 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={reduced ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduced ? 0 : .6, delay: reduced ? 0 : .12, ease: easing }}
                  />
                </svg>
              </motion.span>
            </AnimatePresence>
          </span></p>
          <div className="sg-hero-meta">
            <span><MapPin/>{site.location.label}</span>
            <span><Globe2/>{hero.secondaryMeta}</span>
          </div>
        </div>
        <div className="sg-portrait-slot"><Portrait/></div>
        <div className="sg-terminal-slot"><HeroTerminal index={index} setIndex={setIndex}/></div>
        <div className="sg-actions-slot">
          <div className="sg-hero-actions">
            <a className="sg-primary-link" href="/contact">Let’s connect<ArrowRight size={18}/></a>
            <a className="sg-cv-link" href={site.assets.cv} target="_blank" rel="noopener noreferrer" aria-label="Download CV (PDF, opens in a new tab)"><Download size={16} aria-hidden="true"/><span className="sg-cv-label">Download CV</span></a>
          </div>
          <HeroSocialLinks/>
        </div>
      </div>
    </section>
  )
}
