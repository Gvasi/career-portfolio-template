'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import { ToolMark } from '../TechStack/TechStack'
import { BrandIcon } from '../TechStack/TechIcons'
import { TOOL_MARKS } from '@/content/toolMarks'
import { DecisionCard } from './StoryReveals'
import type { ProjectCardData } from './projectTypes'
import styles from './CaseStudy.module.css'
import SelectionPanel from '@/components/ui/SelectionPanel'
import { selectionTransition } from '@/lib/selectionMotion'

export function DecisionsView({ project }: { project: ProjectCardData }) {
  const [selected, setSelected] = useState(0)
  const [learning, setLearning] = useState(false)
  const mobile = useMediaQuery('(max-width:767px)')
  const reduced = useMediaQuery('(prefers-reduced-motion:reduce)')
  const uid = useId()
  const story = project.story
  return (
    <div className={styles.decisions}>
      <div className={styles.decisionHeading}>
        <h3>{learning ? story.learning.label : 'Behind the build.'}</h3>
        <button type="button" aria-expanded={learning} aria-controls={`${uid}-learning`} onClick={() => setLearning(!learning)}>
          {learning ? <ArrowLeft size={17}/> : <Lightbulb size={17}/>}<span>{learning ? 'Choices' : 'Learning'}</span>
        </button>
      </div>
      <div hidden={learning} className={styles.choicesBody}>
        {mobile && (
          <div className={styles.choiceSelectors} aria-label="Choose a decision">
            {story.decisions.map((item, i) => (
              <button key={item.label} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)}>
                {selected === i && <motion.span className={styles.choiceMarker} layoutId={`${uid}-choice`} transition={reduced ? { duration: 0 } : selectionTransition}/>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className={styles.decisionGrid} style={{ '--decision-columns': Math.min(3, story.decisions.length) } as CSSProperties}>
          {story.decisions.map((item, i) => (
            <SelectionPanel reserveSpace={mobile} className={styles.decisionSlide} key={item.label} active={!mobile || selected === i} offset={i < selected ? -1 : 1}>
              <DecisionCard item={item}/>
            </SelectionPanel>
          ))}
        </div>
      </div>
      <div id={`${uid}-learning`} className={styles.learningPanel} hidden={!learning}>
        <Lightbulb className={styles.lessonIcon} size={32}/>
        <h4>{story.learning.title}</h4>
        <p>{story.learning.body}</p>
        <div><span>Next step</span><p>{story.next}</p></div>
      </div>
    </div>
  )
}

/** Tools that only appear in project stacks get their own mark; everything else reuses the toolkit's artwork. */
function Mark({ name }: { name: string }) {
  const brand = TOOL_MARKS[name]
  if (brand) return <BrandIcon path={brand.path} color={brand.color}/>
  return <ToolMark name={name}/>
}

export function StackView({ project }: { project: ProjectCardData }) {
  const [tool, setTool] = useState(0)
  const [capacity, setCapacity] = useState(6)
  const libraryRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const reduced = useMediaQuery('(prefers-reduced-motion:reduce)')
  const tools = project.story.tools
  // The selected item determines its page, including after the grid changes size.
  const pages = Math.max(1, Math.ceil(tools.length / capacity))
  const current = Math.min(Math.floor(tool / capacity), pages - 1)
  const start = current * capacity
  const visible = tools.slice(start, start + capacity)
  const selected = tools[Math.min(tool, tools.length - 1)]
  useEffect(() => {
    const library = libraryRef.current
    const grid = gridRef.current
    const heading = headingRef.current
    if (!library || !grid || !heading) return
    const measure = () => {
      if (!grid.clientWidth) return
      const css = getComputedStyle(grid)
      const columns = css.gridTemplateColumns.split(' ').length
      const rowHeight = parseFloat(css.getPropertyValue('--tool-row-height'))
      const gap = parseFloat(css.rowGap) || 0
      const headingCss = getComputedStyle(heading)
      const available = library.clientHeight - heading.getBoundingClientRect().height - parseFloat(headingCss.marginBottom)
      const rows = matchMedia('(max-width:767px)').matches ? parseInt(css.getPropertyValue('--tool-max-rows'), 10) : Math.max(1, Math.floor((available + gap) / (rowHeight + gap)))
      setCapacity(Math.max(1, columns * rows))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(library)
    observer.observe(grid)
    observer.observe(heading)
    const panel = library.closest('[role="tabpanel"]')
    if (panel) observer.observe(panel)
    document.fonts.ready.then(measure)
    measure()
    return () => observer.disconnect()
  }, [])
  const inspect = (index: number) => {
    setTool(index)
  }
  return (
    <div className={styles.stack}>
      <div ref={libraryRef} className={styles.toolLibrary}>
        <div ref={headingRef} className={styles.libraryHeading}>
          <span>{project.status === 'concept' ? 'Planned tools' : 'Tools'}</span>
          <span className={styles.libraryMeta}>
            <span className={styles.toolCount} aria-live="polite" aria-label={pages > 1 ? `Tools ${start + 1} to ${start + visible.length} of ${tools.length}` : undefined}>
              {pages > 1 ? `${start + 1}–${start + visible.length} of ${tools.length}` : `${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}`}
            </span>
            {pages > 1 && (
              <span className={styles.toolPager}>
                <button type="button" aria-label="Previous tools" disabled={current === 0} onClick={() => inspect((current - 1) * capacity)}><ChevronLeft size={16}/></button>
                <span aria-live="polite">{current + 1}/{pages}</span>
                <button type="button" aria-label="Next tools" disabled={current === pages - 1} onClick={() => inspect((current + 1) * capacity)}><ChevronRight size={16}/></button>
              </span>
            )}
          </span>
        </div>
        <div ref={gridRef} className={styles.toolGrid} role="group" aria-label="Project tools">
          {visible.map((item, i) => (
            <button type="button" key={item.name} aria-label={item.name} aria-pressed={tool === start + i} onClick={() => inspect(start + i)}>
              <span className={styles.toolIcon}><Mark name={item.name}/></span>
              <span className={styles.toolLabel}>{item.label ?? item.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.toolDetail} aria-live="polite">
        <motion.div key={tool} initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .32, ease: [.22, 1, .36, 1] }}>
          <div className={styles.toolDetailHeader}>
            <span className={styles.toolIcon}><Mark name={selected.name}/></span>
            <div><h3>{selected.name}</h3><p>{selected.role}</p></div>
          </div>
          <div className={styles.toolExplanation}><span>Where it fits</span><p>{selected.detail}</p></div>
          <div className={styles.toolExplanation}><span>Why this choice</span><p>{selected.why}</p></div>
        </motion.div>
      </div>
    </div>
  )
}
