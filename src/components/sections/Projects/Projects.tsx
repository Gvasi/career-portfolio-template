'use client'

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles, ChevronDown } from 'lucide-react'
import dynamic from 'next/dynamic'
import ProjectArtwork from './ProjectArtwork'
import ProjectReelEntry from './ProjectReelEntry'
import { useProjectReel } from './useProjectReel'
import { BuildInvitation, ProjectDestinations } from './ProjectActions'
import { projects as PROJECTS } from '@/content/projects'
import type { ProjectCardData } from './projectTypes'
import styles from './Projects.module.css'
import InteractiveDialog from '@/components/ui/InteractiveDialog'
import { useMediaQuery, useMotionActivity } from '@/hooks/useMotionActivity'
import { useCollectionGesture } from '@/hooks/useCollectionGesture'
import { trackEvent } from '@/lib/analytics/client'

const ProjectViewer = dynamic(() => import('./ProjectViewer'), {
  loading: () => <div className="p-8" role="status"><h2 id="project-dialog-title" className="text-xl font-semibold">Opening project…</h2></div>,
})

const AUTOPLAY_INTERVAL_MS = 6_500
const wrap = (index: number, count: number) => ((index % count) + count) % count
const pad = (value: number) => String(value).padStart(2, '0')

/**
 * The Projects section: featured stage, index menu, reel and project dialog.
 * Owns the selected project, the pause/hover/focus state that gates autoplay,
 * and hands the reel's cursor and animation to useProjectReel.
 */
export default function Projects({ items = PROJECTS }: { items?: ProjectCardData[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [indexOpen, setIndexOpen] = useState(false)
  const reelRef = useRef<HTMLDivElement | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  const activityRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const indexButton = useRef<HTMLButtonElement | null>(null)
  const { active, reduced } = useMotionActivity(activityRef)
  const mobile = useMediaQuery('(max-width:767px)')
  const { cursor, setCursor, moving, progress, rowHeight, nudge: nudgeReel, ordinals } = useProjectReel({ items, reduced, mobile, measureRef })
  const previewIndex = items.length ? wrap(cursor, items.length) : 0
  const preview = items[previewIndex]
  const hasDestinations = preview?.links.some(link => link.type === 'demo' || link.type === 'github') ?? false
  const rotating = !mobile && active && !paused && !hovered && !focused && !selected && !indexOpen && !moving && items.length > 1

  useEffect(() => {
    if (!rotating) return
    const timer = window.setInterval(() => setCursor(value => value + 1), AUTOPLAY_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [rotating, setCursor])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    // A selection belongs to this visit. Restart on return, not while offscreen.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) return
      setPaused(false)
      setHovered(false)
      setFocused(false)
      setIndexOpen(false)
    }, { threshold: 0 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!indexOpen) return
    const outside = (event: globalThis.PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setIndexOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [indexOpen])

  const choose = (next: number) => {
    if (moving && !mobile) return
    setPaused(true)
    setCursor(next)
  }
  const nudge = (direction: number) => {
    setPaused(true)
    nudgeReel(direction)
  }
  useCollectionGesture(reelRef, nudge, { wheel: true, drag: mobile, onStart: () => setPaused(true), disabled: items.length < 2 })
  useCollectionGesture(stageRef, direction => choose(cursor + direction), { drag: mobile, onStart: () => setPaused(true), disabled: !mobile || items.length < 2 })

  const chooseIndex = (index: number) => {
    let distance = index - previewIndex
    if (distance > items.length / 2) distance -= items.length
    if (distance < -items.length / 2) distance += items.length
    choose(cursor + distance)
    setIndexOpen(false)
    indexButton.current?.focus()
  }
  const onReelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nudge(1)
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nudge(-1)
    else return
    event.preventDefault()
    reelRef.current?.focus({ preventScroll: true })
  }
  // Hover and focus each pause autoplay on their own; a mouse leaving must not cancel a keyboard focus.
  const pauseOnMouse = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === 'mouse') setHovered(true) }
  const resumeOnLeave = () => setHovered(false)
  const pauseOnFocus = (event: FocusEvent<HTMLDivElement>) => setFocused(event.target.matches(':focus-visible'))
  const resumeOnBlur = (event: FocusEvent<HTMLDivElement>) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }

  const projectIndex = items.findIndex(project => project.id === selected)
  const project = items[projectIndex]
  const navigate = (direction: number) => { setSelected(items[wrap(projectIndex + direction, items.length)].id) }
  const openProject = () => {
    setPaused(true)
    setSelected(preview.id)
    void trackEvent('project_opened', { project_id: preview.id, cta_source: 'project_section' })
  }

  return (
    <section ref={sectionRef} id="projects" className={'section-shell bg-white ' + styles.showcase} aria-labelledby="projects-heading">
      <div className={styles.sectionHeading}>
        <div className="section-eyebrow"><Sparkles size={16} aria-hidden="true"/><span>Recent work</span></div>
        <h2 id="projects-heading" className="section-title text-transparent bg-clip-text bg-gradient-to-r from-[#072d5f] via-[#0b3b72] to-[var(--c-teal-ink)]">What I’m Building</h2>
      </div>
      <div ref={activityRef} className={styles.catalogue}>
        {preview && (
          <div
            ref={stageRef}
            className={styles.stage}
            data-project-stage
            data-active={preview.id}
            data-cover={preview.id}
            onPointerEnter={pauseOnMouse}
            onPointerLeave={resumeOnLeave}
            onFocusCapture={pauseOnFocus}
            onBlurCapture={resumeOnBlur}
          >
            <div className={styles.stageHeader}>
              <span className={styles.stageEdition} aria-hidden="true">{pad(previewIndex + 1)}<span>/ {pad(items.length)}</span></span>
              <span className={styles.editionLine} aria-hidden="true"/>
            </div>
            <div className={styles.featureBody}>
              <div className={styles.featureCopy}>
                <div className={styles.featureText}>
                  {items.map(item => (
                    <motion.div
                      key={item.id}
                      data-project-copy
                      data-active={item.id === preview.id}
                      aria-hidden={item.id !== preview.id}
                      inert={item.id !== preview.id}
                      initial={false}
                      animate={{ opacity: item.id === preview.id ? 1 : 0, y: item.id === preview.id || reduced ? 0 : 10 }}
                      transition={{ duration: reduced ? 0 : .4, delay: item.id === preview.id && !reduced ? .08 : 0, ease: [.22, 1, .36, 1] }}
                    >
                      <span className={styles.featureStatus + ' ' + styles.status} data-status={item.status}><i aria-hidden="true"/>{item.statusLabel}</span>
                      <h3 className={styles.stageTitle}>{item.title}</h3>
                      <p className={styles.stageSummary}>{item.story.summary}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className={styles.stageArt} aria-hidden="true">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={preview.id}
                    className={styles.art}
                    data-cover={preview.id}
                    initial={{ opacity: 0, x: reduced ? 0 : 18, rotate: reduced ? 0 : 2 }}
                    animate={{ opacity: 1, x: 0, rotate: 0 }}
                    exit={{ opacity: 0, x: reduced ? 0 : -12 }}
                    transition={{ duration: reduced ? 0 : .45, ease: [.22, 1, .36, 1] }}
                  >
                    <ProjectArtwork project={preview}/>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <div className={styles.featureActions} data-has-destinations={hasDestinations}>
              <BuildInvitation reduced={reduced} standalone={!hasDestinations} onOpen={openProject}/>
              <div className={styles.destinationStack}>
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    data-active={item.id === preview.id}
                    aria-hidden={item.id !== preview.id}
                    inert={item.id !== preview.id}
                    initial={false}
                    animate={{ opacity: item.id === preview.id ? 1 : 0, y: item.id === preview.id || reduced ? 0 : 5 }}
                    transition={{ duration: reduced ? 0 : .3 }}
                  >
                    <ProjectDestinations links={item.links} title={item.title} onInteract={() => setPaused(true)}/>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className={styles.index} onPointerEnter={pauseOnMouse} onPointerLeave={resumeOnLeave} onFocusCapture={pauseOnFocus} onBlurCapture={resumeOnBlur}>
          <div className={styles.indexHeading}>
            <div
              ref={menuRef}
              className={styles.indexMenu}
              onKeyDown={event => {
                if (event.key !== 'Escape' || !indexOpen) return
                event.stopPropagation()
                setIndexOpen(false)
                indexButton.current?.focus()
              }}
            >
              <button
                ref={indexButton}
                type="button"
                className={styles.indexToggle}
                aria-expanded={indexOpen}
                aria-controls="project-index"
                onClick={() => setIndexOpen(!indexOpen)}
              >
                All projects <span>{pad(items.length)}</span><ChevronDown size={15} aria-hidden="true"/>
              </button>
              {indexOpen && (
                <div id="project-index" className={styles.allProjects} aria-label="All projects">
                  {items.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      data-project-card={item.id}
                      aria-label={'Choose from index: ' + item.title}
                      aria-pressed={preview?.id === item.id}
                      disabled={moving}
                      onClick={() => chooseIndex(index)}
                    >
                      <span className={styles.choiceNumber}>{pad(index + 1)}</span>
                      <span>{item.title}</span>
                      <span className={styles.choiceDot} data-status={item.status} aria-label={item.statusLabel}/>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={styles.reelHousing}>
            <div
              ref={reelRef}
              className={styles.reelWindow}
              data-project-reel
              data-rotating={rotating}
              data-moving={moving}
              role="group"
              aria-roledescription="carousel"
              aria-label="Project reel"
              tabIndex={0}
              onKeyDown={onReelKeyDown}
              style={{ '--reel-row-height': rowHeight + 'px' } as CSSProperties}
            >
              {/* Every face is laid out once, hidden, so the row height fits the tallest title. */}
              <div ref={measureRef} className={styles.reelMeasure} aria-hidden="true" inert>
                {items.map(item => (
                  <div key={item.id} className={styles.reelFace}>
                    <div className={styles.thumbnail}/>
                    <div className={styles.copy}><h3 className={styles.title}>{item.title}</h3><span className={styles.status}>{item.statusLabel}</span></div>
                  </div>
                ))}
              </div>
              {ordinals.map(ordinal => {
                const item = items[wrap(ordinal, items.length)]
                return (
                  <ProjectReelEntry
                    key={ordinal}
                    item={item}
                    ordinal={ordinal}
                    cursor={cursor}
                    moving={moving}
                    progress={progress}
                    height={rowHeight}
                    reduced={reduced}
                    mobile={mobile}
                    onSelect={() => choose(ordinal)}
                  />
                )
              })}
            </div>
          </div>
          <span className={styles.reelHint} aria-hidden="true">Scroll to explore</span>
        </div>
      </div>
      {project && (
        <InteractiveDialog open onClose={() => setSelected(null)} labelledBy="project-dialog-title" className="project-dialog">
          <ProjectViewer key={project.id} project={project}/>
          <div className={styles.modalNavigation}>
            <button type="button" onClick={() => navigate(-1)} aria-label="Previous project"><ArrowLeft size={18}/><span>Previous</span></button>
            <span className="font-mono text-xs">{pad(projectIndex + 1)} <span className="text-slate-500">/ {pad(items.length)}</span></span>
            <button type="button" onClick={() => navigate(1)} aria-label="Next project"><span>Next project</span><ArrowRight size={18}/></button>
          </div>
        </InteractiveDialog>
      )}
    </section>
  )
}
