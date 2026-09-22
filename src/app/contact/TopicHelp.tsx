'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { CONTACT_TOPICS } from '@/content/contact'

export default function TopicHelp() {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const pinned = useRef(false)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) { pinned.current = false; setOpen(false) } }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { pinned.current = false; setOpen(false); event.stopPropagation() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape, true)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true) }
  }, [open])
  return <span ref={root} className="contact-topic-help" onPointerEnter={event => { if (event.pointerType === 'mouse') setOpen(true) }} onPointerLeave={event => { if (event.pointerType === 'mouse' && !pinned.current && !root.current?.querySelector(':focus-visible')) setOpen(false) }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { pinned.current = false; setOpen(false) } }}>
    <button type="button" aria-label="About the conversation topics" aria-expanded={open} aria-describedby={open ? id : undefined} onClick={() => { pinned.current = !pinned.current; setOpen(pinned.current) }} onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setOpen(true) }}><Info size={15} strokeWidth={1.6} /></button>
    {open && <span className="contact-topic-popover" id={id} role="tooltip">{CONTACT_TOPICS.map(item => <span className="contact-topic-explanation" key={item.id}><strong>{item.label}</strong><span>{item.description}</span></span>)}</span>}
  </span>
}
