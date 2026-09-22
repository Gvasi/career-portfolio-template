'use client'

import './tech-stack.css'
import { useLayoutEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Cpu, Pause, Play, Layers3, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMotionActivity } from '@/hooks/useMotionActivity'
import InteractiveDialog from '@/components/ui/InteractiveDialog'
import { marqueeRows, explorerCategories, techStack, TOOL_COUNT, type TechItem, type TechRow } from '@/content/toolkit'
import { toolNotes } from '@/content/toolkit'
import { TOOL_MARKS } from '@/content/toolMarks'
import { BrandIcon } from './TechIcons'

/** Reuse the same local brand artwork in project details. */
export function ToolMark({ name }: { name: string }) {
  const item = techStack.find(tool => tool.name === name)
  if (item?.image) return <Image src={item.image} alt="" width={32} height={32}/>
  if (item?.icon) return item.icon
  const mark = TOOL_MARKS[name]
  return mark ? <BrandIcon path={mark.path} color={mark.color} /> : <Layers3 size={28} aria-hidden="true" />
}

// Each group repeats its row so the group stays wider than the viewport; the track
// still holds two groups (the second aria-hidden) for the seamless -50% loop.
const GROUP_REPEAT = 2
const LARGEST_CATEGORY = Math.max(...explorerCategories.map(category => category.items.length))

const SHORT_LABELS: Record<string, string> = { 'Google Analytics': 'Analytics', 'Power Automate': 'Automate', 'PostgreSQL': 'Postgres', 'Tailwind CSS': 'Tailwind', 'Microsoft 365': 'MS 365', 'Framer Motion': 'Motion' }

function TechStackItem({ tech, hidden = false, compact = false }: { tech: TechItem; hidden?: boolean; compact?: boolean }) {
  return (
    <div className="ts-item" data-tech={tech.name} aria-hidden={hidden || undefined}>
      {tech.image ? (
        <Image
          src={tech.image}
          alt={tech.seoAlt || tech.name}
          width={64}
          height={64}
          className="w-16 h-16 object-contain"
          loading="lazy"
        />
      ) : (
        <div role="img" aria-label={tech.seoAlt || `${tech.name} icon`}>
          {tech.icon}
        </div>
      )}
      <span className="text-sm font-medium text-gray-700">{compact ? SHORT_LABELS[tech.name] ?? tech.name : tech.name}</span>
    </div>
  )
}

function TechStackGroup({
  items,
  keyPrefix,
  hidden = false,
}: {
  items: TechItem[]
  keyPrefix: string
  hidden?: boolean
}) {
  return (
    <div className="ts-group" aria-hidden={hidden || undefined}>
      {Array.from({ length: GROUP_REPEAT }).flatMap((_, pass) =>
        items.map((tech, i) => <TechStackItem key={`${keyPrefix}-${pass}-${i}`} tech={tech} hidden={hidden || pass > 0} />)
      )}
    </div>
  )
}

function TechStackMarquee({ rows, paused }: { rows: TechRow[]; paused: boolean }) {
  return (
    <div className="ts-marquee" data-paused={paused}>
      {rows.map((row, rowIndex) => (
        <div key={row.caption} className="ts-row">
          <div className="toolkit-row-caption mx-auto w-full max-w-[var(--page-max)] px-4 sm-plus:px-6">
            <span className="relative text-[0.8125rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {row.caption}
            </span>
          </div>
          <div className={row.reverse ? 'ts-track ts-rev' : 'ts-track'} aria-label={row.ariaLabel}>
            <TechStackGroup items={row.items} keyPrefix={`row${rowIndex}-a`} />
            <TechStackGroup items={row.items} keyPrefix={`row${rowIndex}-b`} hidden />
          </div>
        </div>
      ))}
    </div>
  )
}

function ToolkitExplorer({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState(0)
  const [selected, setSelected] = useState('Power BI')
  const [capacity, setCapacity] = useState(6)
  const catalog = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const inspector = useRef<HTMLDivElement>(null)
  const items = explorerCategories[category].items
  const activeTool = items.find(item => item.name === selected) ?? items[0]
  const selectedIndex = items.indexOf(activeTool)
  const current = Math.floor(selectedIndex / capacity)
  const pages = Math.ceil(items.length / capacity)
  const start = current * capacity
  const visible = items.slice(start, start + capacity)
  useLayoutEffect(() => {
    const host = catalog.current
    const tiles = grid.current
    const content = body.current
    const note = inspector.current
    const surface = host?.closest<HTMLElement>('.dialog-surface')
    if (!host || !tiles || !content || !note || !surface) return
    let disposed = false
    const measure = () => {
      if (disposed || !host.clientWidth) return
      const css = getComputedStyle(tiles)
      const columns = css.gridTemplateColumns.split(' ').length
      const rowHeight = parseFloat(css.getPropertyValue('--catalog-row-height'))
      const gap = parseFloat(css.rowGap) || 0
      const rowLimit = parseInt(css.getPropertyValue('--catalog-max-rows'), 10)
      const layout = getComputedStyle(content)
      const stacked = layout.gridTemplateColumns.split(' ').length === 1
      // The heading and categories share a row in landscape. Measure their
      // combined footprint rather than adding their individual heights.
      const chrome = surface.scrollHeight - content.offsetHeight
      const room = parseFloat(getComputedStyle(surface).maxHeight) - chrome
        - parseFloat(layout.paddingTop) - parseFloat(layout.paddingBottom)
        - (stacked ? note.offsetHeight + (parseFloat(layout.rowGap) || 0) : 0)
      const rows = Math.max(1, Math.min(rowLimit, Math.ceil(LARGEST_CATEGORY / columns), Math.floor((room + gap) / (rowHeight + gap))))
      // Every category shares the same complete rows at this viewport. Only a
      // viewport/font change can move the frame; browsing never resizes it.
      host.style.height = `${rows * rowHeight + (rows - 1) * gap}px`
      setCapacity(columns * rows)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(surface)
    observer.observe(note)
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    document.fonts.ready.then(measure)
    measure()
    return () => {
      disposed = true
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [])
  const showCategory = (index: number) => {
    setCategory(index)
    setSelected(explorerCategories[index].items[0].name)
  }
  return (
    <InteractiveDialog open onClose={onClose} labelledBy="toolkit-dialog-title" className="toolkit-dialog">
      <div className="toolkit-explorer-heading">
        <h2 id="toolkit-dialog-title">Inside the toolkit.</h2>
      </div>
      <div className="toolkit-explorer-bar">
        <div className="toolkit-categories" aria-label="Tool categories">
          {explorerCategories.map(({ label, shortLabel }, index) => (
            <button key={label} type="button" aria-label={label} aria-pressed={category === index} onClick={() => showCategory(index)}>
              <span className="toolkit-category-full">{label}</span>
              <span className="toolkit-category-short" aria-hidden="true">{shortLabel}</span>
            </button>
          ))}
        </div>
      </div>
      <div ref={body} className="toolkit-explorer-body">
        <div ref={inspector} className="toolkit-inspector" aria-live="polite" aria-atomic="true">
          {/* Shared grid cell reserves the tallest note at the current font/width.
              Inactive notes don't enter the accessibility tree or announce. */}
          <div className="toolkit-inspector-notes">
            {techStack.map(tool => (
              <div key={tool.name} className="toolkit-inspector-content" data-selected={activeTool?.name === tool.name} aria-hidden={activeTool?.name !== tool.name}>
                <div className="toolkit-inspector-heading">
                  <span className="toolkit-inspector-mark" aria-hidden="true"><ToolMark name={tool.name} /></span>
                  <h3>{tool.name}</h3>
                </div>
                <p>{toolNotes[tool.name]}</p>
              </div>
            ))}
          </div>
        </div>
        <div ref={catalog} className="toolkit-catalog-scroll" aria-label="Browse tools">
          <div ref={grid} className="toolkit-catalog">
            {visible.map(tech => (
              <button
                type="button"
                key={tech.name}
                className="toolkit-tile"
                aria-label={tech.name}
                aria-pressed={activeTool?.name === tech.name}
                onClick={() => setSelected(tech.name)}
                onFocus={() => setSelected(tech.name)}
              >
                <TechStackItem tech={tech} compact />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="toolkit-explorer-footer">
        <div className="toolkit-page-summary">
          <span>{explorerCategories[category].label}</span>
          <span aria-live="polite">{pages > 1 ? `${start + 1}–${start + visible.length} of ${items.length} tools` : `${items.length} tools`}</span>
        </div>
        {pages > 1 && <div className="toolkit-pager" aria-label="Tool pages">
          <button type="button" aria-label="Previous toolkit tools" disabled={current === 0} onClick={() => setSelected(items[(current - 1) * capacity].name)}><ChevronLeft size={17}/></button>
          <span aria-live="polite">{current + 1}/{pages}</span>
          <button type="button" aria-label="Next toolkit tools" disabled={current === pages - 1} onClick={() => setSelected(items[(current + 1) * capacity].name)}><ChevronRight size={17}/></button>
        </div>}
      </div>
    </InteractiveDialog>
  )
}

export default function TechStack() {
  const [paused, setPaused] = useState(false)
  const [exploring, setExploring] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const { active, reduced } = useMotionActivity(ref)
  return (
    <section id="work" ref={ref} className="section-shell toolkit-section overflow-hidden">
      <div className="text-center mb-6 px-4 sm-plus:px-6">
        <div className="section-eyebrow"><Cpu size={16} aria-hidden="true" /><span>Toolkit</span></div>
        <h2 className="section-title text-transparent bg-clip-text bg-gradient-to-r from-[#072d5f] via-[#0b3b72] to-[var(--c-teal-ink)] mb-2 md:mb-4">What I Build With</h2>
      </div>
      {reduced ? (
        // Reduced motion lists every tool instead of scrolling them past.
        <div className="toolkit-library">
          {marqueeRows.map(row => (
            <div key={row.caption}>
              <h3 className="mb-5 text-center text-xs font-semibold tracking-widest text-slate-500">{row.caption}</h3>
              <div className="toolkit-grid">{row.items.map(tech => <TechStackItem key={tech.name} tech={tech} />)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="edge-to-edge"><TechStackMarquee rows={marqueeRows} paused={paused || !active || exploring} /></div>
      )}
      <div className="toolkit-dock">
        <span className="toolkit-dock-line" aria-hidden="true" />
        <div className="toolkit-dock-controls">
          {!reduced && (
            <button
              type="button"
              className="toolkit-dock-motion"
              aria-label={paused ? 'Play tools' : 'Pause tools'}
              title={paused ? 'Play tools' : 'Pause tools'}
              aria-pressed={paused}
              onClick={() => setPaused(value => !value)}
            >
              <span className="toolkit-equalizer" data-playing={!paused && active && !exploring} aria-hidden="true"><i /><i /><i /></span>
              <span className="toolkit-motion-icon">{paused ? <Play size={14} /> : <Pause size={14} />}</span>
            </button>
          )}
          <button type="button" className="toolkit-dock-explore" aria-haspopup="dialog" onClick={() => setExploring(true)}>
            <Layers3 size={18} /><span>Explore toolkit</span><span className="toolkit-dock-count">{TOOL_COUNT}</span><ArrowUpRight size={16} />
          </button>
        </div>
        <span className="toolkit-dock-line" aria-hidden="true" />
      </div>
      {exploring && <ToolkitExplorer onClose={() => setExploring(false)} />}
    </section>
  )
}
