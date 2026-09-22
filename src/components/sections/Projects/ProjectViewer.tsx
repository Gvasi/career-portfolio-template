'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUpRight, Compass, GitBranch, Layers3 } from 'lucide-react'
import Image from 'next/image'
import type { ProjectCardData } from './projectTypes'
import styles from './CaseStudy.module.css'
import { DecisionsView, StackView } from './CaseStudyViews'
import ProjectMap from './ProjectMap'

const views = ['Overview', 'Decisions', 'Stack'] as const
export default function ProjectViewer({ project, initialView = 0 }: { project: ProjectCardData; initialView?: 0 | 2 }) {
  const [view, setView] = useState<number>(initialView)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const uid = useId()
  const story = project.story
  const visit = project.links.find(link => link.type === 'demo')?.url
  useEffect(() => { panelRef.current?.scrollTo({ top: 0 }) }, [view])
  const chooseTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % views.length
    else if (event.key === 'ArrowLeft') next = (index + views.length - 1) % views.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = views.length - 1
    else return
    event.preventDefault()
    setView(next)
    tabs.current[next]?.focus()
  }
  const tabIcons = [<Compass key="overview" size={17}/>, <GitBranch key="decisions" size={17}/>, <Layers3 key="stack" size={17}/>]
  return (
    <div className={styles.viewer} data-status={project.status}>
      <header className={styles.header}>
        <div className={styles.projectIdentity}>
          <div className={styles.thumbnail}><Image src={project.thumbnail} alt={project.thumbnailAlt} width={80} height={64} sizes="64px"/></div>
          <div className={styles.identity}>
            <div className={styles.titleLine}>
              <h2 id="project-dialog-title">{project.title}</h2>
              <span className={styles.projectStatus}><i aria-hidden="true"/>{project.statusLabel}</span>
            </div>
            <p>{story.subtitle}</p>
          </div>
        </div>
        <div role="tablist" aria-label="Explore this project" className={styles.tabs}>
          <span aria-hidden="true" className={styles.tabActive} style={{ transform: `translateX(${view * 100}%)` }}/>
          {views.map((label, i) => (
            <button
              key={label}
              ref={el => { tabs.current[i] = el }}
              type="button"
              role="tab"
              id={`${uid}-tab-${i}`}
              aria-selected={view === i}
              aria-controls={`${uid}-panel`}
              tabIndex={view === i ? 0 : -1}
              onKeyDown={e => chooseTab(e, i)}
              onClick={() => setView(i)}
            >
              <span className={styles.tabLabel}>{tabIcons[i]}<span>{label}</span></span>
            </button>
          ))}
        </div>
        {visit && (
          <a className={`${styles.visit} dialog-icon-button`} href={visit} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${project.title} (opens in a new tab)`}>
            <ArrowUpRight size={20} strokeWidth={1.75} aria-hidden="true"/>
          </a>
        )}
      </header>
      <div ref={panelRef} id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${view}`} tabIndex={0} className={styles.panel}>
        <div className={styles.views}>
          <div data-selected={view === 0} aria-hidden={view !== 0} inert={view !== 0} className={styles.view}>
            <div className={styles.overviewIntro}><h3>{story.intro}</h3><p>{story.summary}</p></div>
            <ProjectMap story={story}/>
          </div>
          <div data-selected={view === 1} aria-hidden={view !== 1} inert={view !== 1} className={styles.view}>
            <DecisionsView project={project}/>
          </div>
          <div data-selected={view === 2} aria-hidden={view !== 2} inert={view !== 2} className={styles.view}>
            <StackView project={project}/>
          </div>
        </div>
      </div>
    </div>
  )
}
