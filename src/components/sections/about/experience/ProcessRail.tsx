'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import ProcessIllustration from './ProcessIllustration'

const subscribeHydration = () => () => {}
const clientReady = () => true
const serverReady = () => false
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify)
  return () => document.removeEventListener('visibilitychange', notify)
}
const documentVisible = () => !document.hidden
const stageDuration = 3300
const steps = [
  { number: '01', title: 'Understand', body: 'Get the full picture.' },
  { number: '02', title: 'Translate', body: 'Make the options clear.' },
  { number: '03', title: 'Build', body: 'Put ideas to work.' },
]

export default function ProcessRail({ reduced }: { reduced: boolean }) {
  const element = useRef<HTMLDivElement>(null)
  const ready = useSyncExternalStore(subscribeHydration, clientReady, serverReady)
  const foreground = useSyncExternalStore(subscribeVisibility, documentVisible, serverReady)
  const visible = useInView(element, { amount: .55 })
  const [selection, setSelection] = useState({ index: 0, version: 0 })
  const selected = selection.index
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remaining = useRef(stageDuration)
  const selectionVersion = useRef(0)
  const running = ready && visible && foreground && !reduced && !hovered && !focused

  useEffect(() => {
    if (!running) return
    const started = performance.now()
    const delay = remaining.current
    const version = selectionVersion.current
    let completed = false
    const timer = setTimeout(() => {
      completed = true
      remaining.current = stageDuration
      setSelection(value => ({ index: (value.index + 1) % steps.length, version: value.version + 1 }))
    }, delay)
    // Resume the same beat after leaving the page, rather than starting over.
    return () => {
      clearTimeout(timer)
      if (!completed && version === selectionVersion.current) remaining.current = Math.max(0, delay - (performance.now() - started))
    }
  }, [running, selection])

  const choose = (index: number) => {
    selectionVersion.current += 1
    remaining.current = stageDuration
    setSelection(value => ({ index, version: value.version + 1 }))
  }

  return <div className="ae-process-column" ref={element} data-running={running} data-stage={selected}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true) }}
    onPointerLeave={() => setHovered(false)}>
    <ProcessIllustration selected={selected} reduced={reduced}/>
    <div className="ae-process-caption"><AnimatePresence initial={false}>
      <motion.div key={selected} initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -3 }} transition={{ duration: reduced ? 0 : .5, ease: [.22, 1, .36, 1] }}>
        <strong>{steps[selected].title}</strong><p>{steps[selected].body}</p>
      </motion.div>
    </AnimatePresence></div>
    <div className="ae-process-steps" role="group" aria-label="Explore my approach"
      onFocusCapture={event => setFocused(event.target.matches(':focus-visible'))}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
      {steps.map((step, index) => <button key={step.number} type="button" className="ae-process-step" data-selected={selected === index} aria-pressed={selected === index} disabled={!ready}
        onClick={() => choose(index)} onFocus={() => choose(index)}
        onPointerEnter={event => { if (event.pointerType === 'mouse') choose(index) }}>
        <span className="ae-process-step-line" aria-hidden="true"/><span className="ae-process-number">{step.number} </span><span className="ae-process-step-title">{step.title}</span>
      </button>)}
    </div>
  </div>
}
