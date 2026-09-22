'use client'

import type { CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BriefcaseBusiness, Check, Lightbulb, MessageCircle, PenLine } from 'lucide-react'
import { CONTACT_TOPICS, CONVERSATION_CONFIRMATION, CONVERSATION_NOTES, MOBILE_CONVERSATION_NOTES } from '@/content/contact'

type ConnectionProps = { topic: string | null; mode: 'book' | 'email'; step: 0 | 1 | 2 }
const noteEase = [.22, 1, .36, 1] as const
const noteStages = ['Getting started', 'Your details', 'Connected'] as const

export function ConnectionHeading({ topic, step }: ConnectionProps) {
  const reduced = useReducedMotion()
  const key = topic || 'General'
  const message = (MOBILE_CONVERSATION_NOTES[key] || MOBILE_CONVERSATION_NOTES.General)[step]
  const TopicIcon = key === 'Hiring' ? BriefcaseBusiness : key === 'VC / Startup' ? Lightbulb : MessageCircle
  const Icon = step === 2 ? Check : step === 1 ? PenLine : TopicIcon
  const transition = { duration: reduced ? 0 : .28, ease: noteEase }
  return <>
    <div className="contact-heading">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Let’s connect.</h1>
      <span className="contact-mobile-mark" aria-hidden="true">
        <AnimatePresence initial={false} mode="sync">
          <motion.span key={`${key}-${step}`} initial={{ opacity: 0, y: reduced ? 0 : 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -3 }} transition={transition}>
            <Icon size={18} strokeWidth={1.6}/>
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
    <p className="contact-intro contact-desktop-intro max-w-lg text-[0.9375rem] leading-7 text-slate-200">A role, a project, or a question you can’t quite leave alone. I’d like to hear what’s on your mind.</p>
    <div className="contact-mobile-response">
      <p className="contact-intro contact-mobile-copy" aria-hidden="true">
        <AnimatePresence initial={false} mode="sync">
          <motion.span key={message} initial={{ opacity: 0, y: reduced ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -3 }} transition={transition}>{message}</motion.span>
        </AnimatePresence>
      </p>
      <span className="sr-only" role="status" aria-atomic="true">{message}</span>
    </div>
  </>
}

/** The notes reflect real progress, never a timer or a second task to complete. */
export default function ConnectionGraphic({ topic, mode, step }: ConnectionProps) {
  const key = topic || 'General'
  const notes = CONVERSATION_NOTES[key] || CONVERSATION_NOTES.General
  const label = CONTACT_TOPICS.find(item => item.id === key)?.label ?? 'Hello'
  const [message, detail] = notes[step]
  const footnote = step === 2
    ? (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? 'Demo complete. Nothing was booked or sent.' : CONVERSATION_CONFIRMATION[mode])
    : detail
  const Icon = [MessageCircle, PenLine, Check][step]
  return <div className="hello-machine" data-step={step + 1}>
    <div className="hello-machine-label"><span>THE HUMAN SIDE</span><span>0{step + 1} / 03</span></div>
    <div className="hello-note" aria-hidden="true">
      <span className="hello-note-back" />
      <span className="hello-note-back hello-note-back-second" />
      <span key={`${key}-${mode}-${step}`} className="hello-note-sheet" style={{ '--note-turn': step === 1 ? '-1.5deg' : '1.5deg' } as CSSProperties}>
        <span className="hello-note-top"><span>{label.toUpperCase()}</span><span className="hello-note-dot" /></span>
        <span className="hello-note-message">{message}</span>
        <span className="hello-note-bottom"><span>{footnote}</span><Icon className="hello-note-symbol" size={17} strokeWidth={1.5} /></span>
      </span>
    </div>
    <p className="sr-only" role="status">{message.replace('\n', ' ')} {footnote}</p>
    <div className="hello-note-progress">
      <ol className="hello-note-index" aria-label="Conversation progress">
        {noteStages.map((stage, i) => {
          const complete = i < step || step === 2
          return <li key={stage} aria-label={`${stage}, ${complete ? 'complete' : i === step ? 'current stage' : 'upcoming'}`} aria-current={i === step ? 'step' : undefined} data-current={i === step} data-complete={complete}>
            <Check size={10} strokeWidth={2} aria-hidden="true"/>
          </li>
        })}
      </ol>
      <span className="hello-note-progress-label" aria-hidden="true">{noteStages.map((stage, i) => <span key={stage} data-current={i === step}>{stage}</span>)}</span>
    </div>
  </div>
}
