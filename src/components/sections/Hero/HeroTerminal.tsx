'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import { useMotionActivity } from '@/hooks/useMotionActivity'
import { selectionEase as easing } from '@/lib/selectionMotion'
import { codeStories } from '@/content/home'
import TypedStory from './TypedStory'

// Typing joins the entrance while its remaining travel is already small.
const terminalTypingStart = 450
export const STORY_ROTATION_INTERVAL_MS = 4_000

// A reader pause latches: keyboard focus entering the terminal or the Pause
// control sets it, and only the Resume control clears it. Pointer movement over
// the terminal never affects rotation.
type ReaderPause = 'keyboard' | 'button' | null

/** Roving-tabindex keyboard navigation for the story tabs; null for keys the tabs do not handle. */
function arrowKeyTarget(key: string, current: number) {
  const count = codeStories.length
  if (key === 'ArrowRight') return (current + 1) % count
  if (key === 'ArrowLeft') return (current + count - 1) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

export default function HeroTerminal({ index, setIndex }: { index: number; setIndex: Dispatch<SetStateAction<number>> }) {
  const root = useRef<HTMLDivElement>(null)
  const { active, reduced } = useMotionActivity(root, { amount: .25 })
  const [arrived, setArrived] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setArrived(true), reduced ? 0 : terminalTypingStart)
    return () => clearTimeout(timer)
  }, [reduced])
  // Bumped on every selection so choosing the current tab again also restarts the dwell.
  const [selection, setSelection] = useState(0)
  const [readerPause, setReaderPause] = useState<ReaderPause>(null)
  // `active` already covers reduced motion, page visibility and viewport intersection.
  const canRotate = active && arrived && !readerPause
  useEffect(() => {
    if (!canRotate) return
    const timer = window.setTimeout(() => setIndex(current => (current + 1) % codeStories.length), STORY_ROTATION_INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [canRotate, index, selection, setIndex])
  const choose = (i: number) => { setIndex(i); setSelection(n => n + 1) }
  const story = codeStories[index]
  const playback = reduced ? 'reduced'
    : readerPause === 'button' ? 'paused'
    : readerPause === 'keyboard' ? 'keyboard'
    : !active || !arrived ? 'inactive'
    : 'auto'
  const playbackLabel = reduced ? 'Automatic rotation disabled by motion preference'
    : readerPause ? 'Resume story rotation'
    : 'Pause story rotation'
  return (
    <div
      className="sg-refined-terminal"
      ref={root}
      data-story={story.file}
      data-playback={playback}
      data-active={active}
      onFocusCapture={e => { if (e.target.matches(':focus-visible')) setReaderPause(current => current ?? 'keyboard') }}
    >
      <div className="sg-refined-terminal-bar">
        <span className="sg-window-dots" aria-hidden="true"><i/><i/><i/></span>
        <span className="sg-refined-filename">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              className="sg-filename-content"
              key={story.file}
              initial={{ opacity: 0, y: reduced ? 0 : 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -3 }}
              transition={{ duration: reduced ? 0 : .22, ease: easing }}
            >
              <span className="sg-file-symbol" aria-hidden="true">{story.language === 'SQL' ? '›_' : '{}'}</span>{story.file}
            </motion.span>
          </AnimatePresence>
        </span>
        <button
          type="button"
          className="sg-terminal-playback"
          aria-label={playbackLabel}
          title={playbackLabel}
          disabled={reduced}
          onClick={() => setReaderPause(current => current ? null : 'button')}
        >
          {readerPause ? <Play size={15} strokeWidth={1.75} aria-hidden="true"/> : <Pause size={15} strokeWidth={1.75} aria-hidden="true"/>}
        </button>
      </div>
      <div className="sg-refined-terminal-body" id="refined-story-panel" role="tabpanel" tabIndex={0} aria-label={`${story.title} code story`}>
        {/* Reserve every story at this width to keep readable wrapping stable. */}
        {codeStories.map(s => (
          <div key={s.file} className="sg-story-measure" aria-hidden="true">
            {s.lines.map((line, i) => <div className="sg-typed-row" key={i}><span className="sg-typed-number">00</span><code>{line}</code></div>)}
          </div>
        ))}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={story.file}
            initial={{ opacity: 0, y: reduced ? 0 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -4 }}
            transition={{ duration: reduced ? 0 : .22, ease: easing }}
          >
            <TypedStory story={story} active={active && arrived} reduced={reduced}/>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="sg-refined-story-tabs" role="tablist" aria-label="Code stories">
        {codeStories.map((s, i) => (
          <button
            key={s.file}
            type="button"
            role="tab"
            aria-controls="refined-story-panel"
            aria-selected={i === index}
            tabIndex={i === index ? 0 : -1}
            onClick={() => choose(i)}
            onKeyDown={e => {
              const next = arrowKeyTarget(e.key, i)
              if (next === null) return
              e.preventDefault()
              choose(next)
              ;(e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus()
            }}
          >
            {s.title}{index === i && <motion.span className="sg-refined-tab-underline" layoutId="refined-story-underline" transition={{ duration: reduced ? 0 : .55, ease: easing }}/>}
          </button>
        ))}
      </div>
    </div>
  )
}
