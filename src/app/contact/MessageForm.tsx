'use client'

import type { FocusEventHandler, FormEventHandler, RefObject } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import BotCheck, { type BotCheckHandle } from './BotCheck'
import { fieldClass, primaryButtonClass } from './contactStyles'

export type MessageField = 'name' | 'email' | 'message'

interface MessageFormProps {
  mode: 'book' | 'email'
  /** For a booking, `message` carries the optional notes. */
  values: { name: string; email: string; message: string }
  onFieldChange: (field: MessageField, value: string) => void
  /** Honeypot field: real visitors never see or fill it. */
  website: string
  onWebsiteChange: (value: string) => void
  submitting: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  onFocusCapture: FocusEventHandler<HTMLFormElement>
  /** The page owns the bot check handle; the widget renders inside the form it protects. */
  botCheck: RefObject<BotCheckHandle | null>
  /** Present while confirming a booking: the chosen slot and the way back to the calendar. */
  bookingSummary?: { shortDate: string; longDate: string; time: string; details: string; onChangeTime: () => void }
}

/** The details form shared by both lanes: booking confirmation (with the chosen slot) and the email message. */
export default function MessageForm({ mode, values, onFieldChange, website, onWebsiteChange, submitting, onSubmit, onFocusCapture, botCheck, bookingSummary }: MessageFormProps) {
  const booking = mode === 'book'
  return (
    <form className="contact-form mt-4 space-y-4" onFocusCapture={onFocusCapture} onSubmit={onSubmit}>
      {booking && bookingSummary && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-sm leading-6 text-[#06254A]">
          <div className="min-w-0">
            <p><span className="sm:hidden">{bookingSummary.shortDate}</span><span className="hidden sm:inline">{bookingSummary.longDate}</span> · {bookingSummary.time}</p>
            <p className="text-slate-600">{bookingSummary.details}</p>
          </div>
          <button
            type="button"
            aria-label="Change time"
            title="Change time"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full font-medium hover:bg-teal-100"
            disabled={submitting}
            onClick={bookingSummary.onChangeTime}
          >
            <ArrowLeft size={16} /><span className="hidden sm:inline">Change time</span>
          </button>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-[#06254A]">
          Your name
          <input required autoComplete="name" name="name" maxLength={80} className={fieldClass} value={values.name} disabled={submitting} onChange={event => onFieldChange('name', event.target.value)} />
        </label>
        <label className="block text-sm font-medium text-[#06254A]">
          Email address
          <input required type="email" autoComplete="email" name="email" maxLength={254} className={fieldClass} value={values.email} disabled={submitting} onChange={event => onFieldChange('email', event.target.value)} />
        </label>
      </div>
      <label className="block text-sm font-medium text-[#06254A]">
        {booking ? 'Anything I should know? (optional)' : 'Your message'}
        <textarea
          required={!booking}
          name="message"
          rows={3}
          maxLength={2000}
          className={`${fieldClass} resize-y`}
          value={values.message}
          disabled={submitting}
          onChange={event => onFieldChange('message', event.target.value)}
          placeholder={booking ? 'A little context helps me come prepared.' : 'The unpolished version is welcome.'}
        />
      </label>
      <div className="hidden" aria-hidden="true">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={event => onWebsiteChange(event.target.value)} /></label>
      </div>
      <p className="text-xs leading-5 text-slate-500">I’ll use your details to reply{booking ? ' and arrange our call' : ''}. No mailing list, no follow-up funnel.</p>
      <BotCheck key={mode} ref={botCheck} action={booking ? 'booking' : 'contact'} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{booking ? 'Step 2 of 2 · Introduce yourself' : 'A conversation starts here.'}</span>
        <button type="submit" className={primaryButtonClass} disabled={submitting}>
          {submitting
            ? <><Loader2 size={16} className="animate-spin motion-reduce:animate-none" />{booking ? 'Booking…' : 'Sending…'}</>
            : <>{booking ? 'Confirm intro' : 'Send message'}<ArrowRight size={16} /></>}
        </button>
      </div>
    </form>
  )
}
