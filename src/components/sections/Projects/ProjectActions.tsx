'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, ExternalLink, Github } from 'lucide-react'
import type { ProjectLink } from './projectTypes'
import styles from './ProjectActions.module.css'

/** A small paper object with a finished resting pose; motion follows the same layers. */
function PaperIllustration({ reduced }: { reduced: boolean }) {
  const id = useId().replace(/:/g, '')
  const transition = { duration: reduced ? 0 : .7, ease: [.22, 1, .36, 1] as const }
  return <svg className={styles.paperIllustration} viewBox="0 0 88 76" fill="none">
    <defs>
      <linearGradient id={id + '-paper'} x1="13" y1="13" x2="48" y2="66" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset=".58" stopColor="#fcfefd"/><stop offset="1" stopColor="#e8f1ef"/></linearGradient>
      <linearGradient id={id + '-back'} x1="32" y1="6" x2="77" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#edf5f4"/><stop offset="1" stopColor="#cddfdf"/></linearGradient>
      <filter id={id + '-shadow'} x="-45%" y="-30%" width="200%" height="180%"><feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#203c49" floodOpacity=".17"/></filter>
    </defs>
    <motion.g transition={transition} variants={{ rest: { x: 0, y: 0, rotate: 7 }, open: { x: 5, y: -3, rotate: 13 } }} style={{ originX: .5, originY: .9 }} filter={'url(#' + id + '-shadow)'}>
      <rect x="34" y="8" width="35" height="49" rx="4" fill={'url(#' + id + '-back)'} stroke="#acc6c8" strokeWidth=".8"/>
      <path d="M39 12h24" stroke="#fff" strokeOpacity=".9" strokeLinecap="round"/>
    </motion.g>
    <motion.g transition={transition} variants={{ rest: { x: 0, y: 0, rotate: 2 }, open: { x: 1, y: -2, rotate: 4 } }} style={{ originX: .5, originY: .9 }} filter={'url(#' + id + '-shadow)'}>
      <rect x="23" y="11" width="35" height="49" rx="4" fill="#f0f7f4" stroke="#b3cec7" strokeWidth=".8"/>
      <path d="M29 20h21m-21 5h13m-13 5h18" stroke="#abc4bd" strokeWidth="1" strokeLinecap="round"/>
    </motion.g>
    <motion.g transition={transition} variants={{ rest: { x: 0, y: 0, rotate: -3 }, open: { x: -3, y: -1, rotate: -8 } }} style={{ originX: .5, originY: .9 }} filter={'url(#' + id + '-shadow)'}>
      <rect x="12" y="16" width="35" height="49" rx="4" fill={'url(#' + id + '-paper)'} stroke="#a6bbc2" strokeWidth=".8"/>
      <path d="M14 21v38" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M19 25h18m-18 4h11" stroke="#bdcccf" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M20 52v-5m7 5V41m7 11v-8m7 8V35" stroke="#b2d5cc" strokeWidth="2" strokeLinecap="round"/>
      <motion.path d="m19 48 8-10 7 4 8-11m-6 1 6-1-.5 6" stroke="var(--c-teal-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduced ? 1 : 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : 1.25, ease: 'easeOut' }}/>
      <path d="M19 58h10" stroke="#c8d6d8" strokeLinecap="round"/>
    </motion.g>
  </svg>
}

/** One entry point for the overview, decisions and tools. */
export function BuildInvitation({ reduced, onOpen, standalone = false }: { reduced: boolean; onOpen: () => void; standalone?: boolean }) {
  const ease = [.22, 1, .36, 1] as const
  return (
    <motion.button
      type="button"
      className={styles.invitation}
      data-standalone={standalone}
      aria-label="Explore the build"
      aria-haspopup="dialog"
      onClick={onOpen}
      initial="rest"
      animate="rest"
      whileHover={reduced ? 'rest' : 'open'}
      whileFocus={reduced ? 'rest' : 'open'}
      transition={{ duration: reduced ? 0 : .6, ease }}
    >
      <span className={styles.peek} aria-hidden="true">
        <PaperIllustration reduced={reduced}/>
      </span>
      <span className={styles.primary}><span className={styles.primaryLabel}>Explore the build</span><ArrowRight size={19}/></span>
    </motion.button>
  )
}

/** Native links keep the visible segment, focus target and destination together. */
export function ProjectDestinations({ links, title, onInteract }: { links: ProjectLink[]; title: string; onInteract?: () => void }) {
  const live = links.find(link => link.type === 'demo')
  const github = links.find(link => link.type === 'github')
  const destinations = [live, github].filter((link): link is ProjectLink => Boolean(link))
  if (!destinations.length) return null
  // A lone live link reads as the project itself; beside GitHub it is the live site.
  const labelFor = (link: ProjectLink) => link.type === 'github' ? 'GitHub' : destinations.length === 1 ? 'Open project' : 'Live site'
  return (
    <div className={styles.destinations} data-project-destinations data-count={destinations.length} role="group" aria-label={title + ' destinations'}>
      {destinations.map(link => (
        <a
          key={link.type}
          className={styles.destination}
          data-destination={link.type}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={labelFor(link) + ' (opens in a new tab)'}
          aria-label={labelFor(link) + ': ' + title + ' (opens in a new tab)'}
          onClick={onInteract}
        >
          <span className={styles.destinationIcon} aria-hidden="true">
            {link.type === 'github'
              ? <Github size={17}/>
              : <><ExternalLink className={styles.mobileExternal} size={20}/><ArrowUpRight className={styles.arrowMain} size={18}/><ArrowUpRight className={styles.arrowEcho} size={18}/></>}
          </span>
          <span className={styles.destinationLabel}>{labelFor(link)}</span>
        </a>
      ))}
    </div>
  )
}
