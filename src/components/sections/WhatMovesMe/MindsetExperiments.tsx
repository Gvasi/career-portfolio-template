'use client'

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react'
import { motion, useMotionTemplate, useSpring } from 'framer-motion'
import { Check, ChevronRight, Code2, MessageCircle, MousePointer2, Sparkles, Users, Zap } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import { AIIllustration, PeopleIllustration } from './MindsetIllustrations'
import { CuriosityLens, LearningFlight } from './MindsetTactile'
import './experiments.css'
import SelectionPanel from '@/components/ui/SelectionPanel'
import { selectionTransition } from '@/lib/selectionMotion'

const cards = [
  { id: 'growth', Icon: Code2, label: 'Always curious', title: 'One more question.', short: 'Learn' },
  { id: 'ai', Icon: Sparkles, label: 'Co-pilot mode', title: 'AI helps. I steer.', short: 'AI' },
  { id: 'people', Icon: Users, label: 'Common ground', title: 'I hear people out.', short: 'People' },
  { id: 'proof', Icon: Zap, label: 'From idea to use', title: 'Build it. Try it. Improve it.', short: 'Build' },
] as const

const learning = [
  { tag: 'The key', body: 'I’m usually the one asking why.' },
  { tag: 'The book', body: 'That connects to something else…' },
  { tag: 'The lightbulb', body: 'One answer. Three new questions.' },
]
const ai = [
  { tag: 'Explore', body: 'What could we do differently?' },
  { tag: 'Build', body: 'Let’s give the idea a first version.' },
  { tag: 'Challenge', body: 'Looks convincing. Does it hold up?' },
  { tag: 'Own', body: 'I still own the final call.' },
]
const people = [
  { tag: 'Listen', body: 'Tell me your side. I’m listening.', Icon: Users },
  { tag: 'Ask', body: 'What would actually help?', Icon: MessageCircle },
  { tag: 'Explore', body: 'Let’s look at it from both sides.', Icon: MousePointer2 },
  { tag: 'Simplify', body: 'Let’s find a way forward.', Icon: Check },
]
const proof = [
  { tag: 'Ready', body: 'Let’s see if this could work.' },
  { tag: 'Ship', body: 'Give someone a version to try.' },
  { tag: 'Learn', body: 'Their feedback changes the plan.' },
  { tag: 'Ship again', body: 'Make the next version better.' },
]

function Progress({ step, count = 4 }: { step: number; count?: number }) {
  return <span className="thought-progress" aria-hidden="true">{Array.from({ length: count }, (_, i) => <i key={i} data-active={i === step} />)}<span>0{step + 1}<b> / 0{count}</b></span></span>
}

function useInvitation(ref: RefObject<HTMLDivElement | null>) {
  const [cue, setCue] = useState(false)
  const cancel = useRef(() => {})
  const dismiss = useCallback(() => cancel.current(), [])
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const card = element.closest('.mindset-thought-card') || element
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    let visible = false
    let hovered = card.matches(':hover')
    let phase: 'waiting' | 'playing' | 'done' = 'waiting'
    let start: ReturnType<typeof setTimeout> | undefined
    let end: ReturnType<typeof setTimeout> | undefined
    const finish = () => {
      clearTimeout(start); clearTimeout(end)
      if (phase === 'done') return
      phase = 'done'; setCue(false)
    }
    cancel.current = finish
    const update = () => {
      clearTimeout(start)
      if (media.matches) { finish(); return }
      if (!visible || document.visibilityState !== 'visible' || (fine.matches && !hovered)) {
        if (phase === 'playing') finish()
        return
      }
      if (phase !== 'waiting') return
      // Desktop follows attention; mobile introduces only the selected card.
      start = setTimeout(() => {
        phase = 'playing'; setCue(true)
        end = setTimeout(finish, 2800)
      }, fine.matches ? 220 : 450)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .6
      update()
    }, { threshold: [0, .6] })
    observer.observe(element)
    const enter = () => { hovered = true; update() }
    const leave = () => { hovered = false; update() }
    card.addEventListener('pointerenter', enter)
    card.addEventListener('pointerleave', leave)
    document.addEventListener('visibilitychange', update)
    media.addEventListener('change', update)
    fine.addEventListener('change', update)
    return () => {
      clearTimeout(start); clearTimeout(end); observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      media.removeEventListener('change', update)
      fine.removeEventListener('change', update)
      card.removeEventListener('pointerenter', enter)
      card.removeEventListener('pointerleave', leave)
      cancel.current = () => {}
    }
  }, [ref])
  return { cue, bind: {
    onPointerDownCapture: dismiss, onFocusCapture: dismiss, onKeyDownCapture: dismiss,
    onPointerMoveCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && (event.target as Element).closest('button,input')) dismiss()
    },
  } }
}

function ThoughtCaption({ text, className }: { text: string; className: string }) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return <span className={className} aria-live="polite"><motion.span key={text} className="thought-body" initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .22 }}>{text}</motion.span></span>
}

function CuriosityCard() {
  const [step, setStep] = useState(0)
  const sceneRef = useRef<HTMLDivElement>(null)
  const invitation = useInvitation(sceneRef)
  return <div ref={sceneRef} className="thought-scene curiosity-scene" data-cue={invitation.cue} {...invitation.bind}>
    <CuriosityLens onStep={setStep} cue={invitation.cue} />
    {/* The resting lens and the key share the first of three object thoughts. */}
    <ThoughtCaption className="curiosity-copy" text={learning[Math.max(0, step - 1)].body} />
  </div>
}

function AICard() {
  const [position, setPosition] = useState(0)
  const step = Math.min(3, Math.round(position * 3 / 100))
  const sceneRef = useRef<HTMLDivElement>(null)
  const invitation = useInvitation(sceneRef)
  const note = ai[step]
  return <div ref={sceneRef} className="thought-scene ai-scene" data-step={step} data-cue={invitation.cue} {...invitation.bind}>
    <div className="ai-glass">
      <AIIllustration step={step} />
      <ThoughtCaption className="ai-layer" text={note.body} />
    </div>
    <div className="ai-scrubber" style={{ '--range-progress': `${position}%` } as CSSProperties}><label htmlFor="mindset-ai-depth"><span>Follow my thinking</span><Progress step={step} /></label>
      <motion.input animate={{ '--thumb-invite-x': invitation.cue ? ['0px', '22px', '0px', '0px', '14px', '0px'] : '0px' }} transition={{ duration: invitation.cue ? 2.8 : .12, times: [0, .2, .4, .6, .8, 1], ease: [.4, 0, .2, 1] }} id="mindset-ai-depth" type="range" min="0" max="100" step="0.1" value={position} onKeyDown={event => { if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)) { event.preventDefault(); const forward = event.key === 'ArrowRight' || event.key === 'ArrowUp'; setPosition(value => Math.max(0, Math.min(100, value + (forward ? 100 / 3 : -100 / 3)))) } }} onChange={event => { setPosition(Number(event.target.value)) }} aria-valuetext={`${step + 1} of 4: ${note.tag}. ${note.body}`} />
      <div className="ai-milestones" aria-hidden="true">{ai.map((item, i) => <span key={item.tag} data-active={i === step}>{item.tag}</span>)}</div>
    </div>
  </div>
}

function PeopleCard() {
  const [step, setStep] = useState(0)
  const sceneRef = useRef<HTMLDivElement>(null)
  const invitation = useInvitation(sceneRef)
  const respond = (index: number) => { setStep(index) }
  const note = people[step]
  return <div ref={sceneRef} className="thought-scene conversation-scene" data-cue={invitation.cue} {...invitation.bind}>
    <div className="conversation-room">
      <PeopleIllustration step={step} />
      <ThoughtCaption className="conversation-content" text={note.body} />
    </div>
    <div className="conversation-choices" aria-label="Choose a conversational response">{people.map((item, i) => <button type="button" key={item.tag} aria-pressed={step === i} onClick={() => respond(i)}><item.Icon size={14} aria-hidden="true" /><span>{['Listen', 'Ask', 'Explore', 'Simplify'][i]}</span></button>)}</div>
    <div className="thought-controls"><span>Follow the conversation</span><Progress step={step} /></div>
  </div>
}

function ProofCard() {
  const [step, setStep] = useState(0)
  const sceneRef = useRef<HTMLDivElement>(null)
  const invitation = useInvitation(sceneRef)
  return <div ref={sceneRef} className="thought-scene proof-scene" data-cue={invitation.cue} {...invitation.bind}>
    <LearningFlight onStep={setStep} cue={invitation.cue} />
    <ThoughtCaption className="proof-page" text={proof[step].body} />
  </div>
}

const scenes = [CuriosityCard, AICard, PeopleCard, ProofCard]

function ThoughtCard({ index, selected, offset }: { index: number; selected: boolean; offset: number }) {
  const titleId = useId()
  const mobile = useMediaQuery('(max-width:767px)')
  const fine = useMediaQuery('(hover:hover) and (pointer:fine)')
  const reduced = useMediaQuery('(prefers-reduced-motion:reduce)')
  const rx = useSpring(0, { stiffness: 170, damping: 28 })
  const ry = useSpring(0, { stiffness: 170, damping: 28 })
  const lift = useSpring(0, { stiffness: 200, damping: 27 })
  const zoom = useSpring(1, { stiffness: 200, damping: 27 })
  const transform = useMotionTemplate`perspective(1100px) translateY(${lift}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${zoom})`
  const reset = () => { rx.set(0); ry.set(0); lift.set(0); zoom.set(1) }
  const card = cards[index]
  const Scene = scenes[index]
  return <SelectionPanel className="mindset-card-slot" active={!mobile || selected} offset={offset}>
    <motion.article className="mindset-thought-card" data-tone={card.id} aria-labelledby={titleId} style={{ transform: fine && !reduced ? transform : 'none' }}
      onPointerEnter={event => { if (fine && !reduced && event.pointerType === 'mouse') { lift.set(-2); zoom.set(1.008) } }}
      onPointerMove={event => { if (!fine || reduced || event.pointerType !== 'mouse' || event.buttons || (event.target as Element).closest('button,input')) return; const rect = event.currentTarget.parentElement!.getBoundingClientRect(); rx.set((.5 - (event.clientY - rect.top) / rect.height) * 2.4); ry.set(((event.clientX - rect.left) / rect.width - .5) * 2.4) }}
      onPointerLeave={event => { if (!event.buttons) reset() }}
      onPointerUp={event => { const r = event.currentTarget.parentElement!.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) reset() }}>

      <span className="thought-card-light" aria-hidden="true" />
      <header className="thought-card-header"><div className="mindset-lab-label"><span><card.Icon size={15} />{card.label}</span><span>0{index + 1}</span></div><h3 id={titleId}>{card.title}</h3></header>
      <Scene />
    </motion.article>
  </SelectionPanel>
}

export default function MindsetExperiments() {
  const [selected, setSelected] = useState(0)
  const selectionId = useId()
  const reduced = useMediaQuery('(prefers-reduced-motion:reduce)')
  return <div className="mindset-labs">
    <div className="mindset-lab-selector" aria-label="Choose a way into my thinking">{cards.map((card, index) => <button type="button" key={card.id} aria-label={`${card.short} — ${card.label}`} aria-pressed={selected === index} onClick={() => { if (index !== selected) { setSelected(index) } }}>{selected === index && <motion.i className="mindset-selection-ink" layoutId={selectionId} aria-hidden="true" transition={reduced ? { duration: 0 } : selectionTransition}/>}<card.Icon size={17} /><span>{card.short}</span></button>)}</div>
    <div className="mindset-card-grid">{cards.map((card, index) => <ThoughtCard key={card.id} index={index} selected={selected === index} offset={index < selected ? -1 : 1} />)}</div>
    <div className="mindset-mobile-footer"><span>Four ways into my thinking.</span><span>0{selected + 1} / 04 <ChevronRight size={12} /></span></div>
  </div>
}
