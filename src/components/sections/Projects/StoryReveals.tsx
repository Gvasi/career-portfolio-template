'use client'

import { useId, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { ProjectStory } from './projectTypes'
import styles from './CaseStudy.module.css'
import { useMotionActivity } from '@/hooks/useMotionActivity'

export function DecisionCard({ item }: { item: ProjectStory['decisions'][number] }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  const { active } = useMotionActivity(ref)
  return (
    <article ref={ref} className={styles.decisionShell} data-open={open} data-animated={active} aria-label={item.title}>
      <div className={styles.decisionQuestion}><p>{item.question}</p></div>
      <div className={styles.faces} aria-live="polite">
        <div className={styles.frontFace} aria-hidden={open} inert={open}>
          <h4>{item.title}</h4>
        </div>
        <div id={id} className={styles.backFace} aria-hidden={!open} inert={!open}>
          <p>{item.body}</p>
          <div className={styles.tradeoff}><span>The tradeoff</span><p>{item.takeaway}</p></div>
        </div>
      </div>
      <button
        type="button"
        className={styles.revealAction}
        aria-label={`${open ? 'Close reasoning' : 'Reveal why'}: ${item.title}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>{open ? 'Back to the choice' : 'Reveal why'}</span>
        <span className={styles.actionIcon} aria-hidden="true"><ArrowRight size={17}/></span>
      </button>
    </article>
  )
}
