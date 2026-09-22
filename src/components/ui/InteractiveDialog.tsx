'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import { X } from 'lucide-react'

/** Native top-layer modal: focus containment, inert background and Escape support. */
export default function InteractiveDialog({ open, onClose, labelledBy, children, className = '' }: {
  open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [closing, setClosing] = useState(false)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  useEffect(() => {
    if (!open) return
    const dialog = ref.current!
    const previousFocus = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(element => element.getClientRects().length > 0 && !element.closest('[inert]') && getComputedStyle(element).visibility !== 'hidden')
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus() }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keepFocus, true)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      document.removeEventListener('keydown', keepFocus, true)
      dialog.close()
      document.body.style.overflow = overflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [open])
  const close = () => {
    if (closing) return
    setClosing(true)
    timer.current = setTimeout(() => { onClose(); setClosing(false) }, reduced ? 0 : 180)
  }
  return <dialog ref={ref} aria-labelledby={labelledBy} className={`interactive-dialog ${className}`} data-closing={closing}
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => { if (event.target === event.currentTarget) close() }}>
    <div className="dialog-surface" onClick={event => event.stopPropagation()}>
      <button className="dialog-close dialog-icon-button" type="button" aria-label="Close dialog" onClick={close}><X size={20} strokeWidth={1.75} aria-hidden="true"/></button>
      {children}
    </div>
  </dialog>
}
