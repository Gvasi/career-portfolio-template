'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Calendar, Check, Clock, Mail, MapPin, Video } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import SocialRail from '@/components/layout/SocialRail'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import { site } from '@/config/site'
import { formatSlotTime, formatVisitorTimeZone } from '@/lib/contact/timeZone'
import { TOPICS, useContactForm } from './useContactForm'
import ConnectionGraphic, { ConnectionHeading } from './ConnectionGraphic'
import TopicHelp from './TopicHelp'
import BookingPanel from './BookingPanel'
import MessageForm, { type MessageField } from './MessageForm'
import type { BotCheckHandle } from './BotCheck'
import { primaryButtonClass, secondaryButtonClass } from './contactStyles'
import './contact.css'

const MODES = [
  { id: 'book', label: 'Book an intro', Icon: Calendar },
  { id: 'email', label: 'Send email', Icon: Mail },
] as const

/**
 * The contact page. It owns the single useContactForm invocation (mode,
 * topic, slot, both submissions and their shared in-flight guard), the bot
 * check handle, the phone-width date/time step, and the focus moves between
 * stages; BookingPanel and MessageForm render the two large steps from
 * explicit values and callbacks.
 */
export default function ContactClient({ initialIntent }: { initialIntent?: string }) {
  const botCheck = useRef<BotCheckHandle>(null)
  const form = useContactForm(initialIntent, botCheck)
  const [selectionStep, setSelectionStep] = useState<'date' | 'time'>('date')
  const [emailStarted, setEmailStarted] = useState(false)
  const mobileCalendar = useMediaQuery('(max-width: 639px)')

  // Focus targets: the stage heading on every stage change, and on phone widths the
  // selected day or the times heading when the calendar switches step.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const timeHeadingRef = useRef<HTMLParagraphElement>(null)
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const previousStage = useRef('')
  const timePanelVisible = selectionStep === 'time' && !!form.selectedDate
  const previousTimePanel = useRef(timePanelVisible)

  const stage = `${form.mode}-${form.mode === 'book' ? form.bookingStep : form.emailStep}`
  const success = stage === 'book-success' || stage === 'email-success'
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  const booking = form.mode === 'book'
  const noteStep = success ? 2 : (booking ? form.bookingStep === 'form' : emailStarted) ? 1 : 0
  const topic = TOPICS.find(item => item.id === form.selectedTopic)?.label ?? 'Hello'
  const timeLabel = (value: string) => formatSlotTime(value, form.timeZone)
  const visitorZoneLabel = formatVisitorTimeZone(form.timeZone, form.selectedTime || form.availableTimes[0] || form.selectedDate || new Date())
  const dateLabel = form.selectedDate?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) ?? ''
  const selectedTimeLabel = form.selectedTime ? timeLabel(form.selectedTime) : ''
  // Duration text comes from the server's payload; until it has loaded the number is omitted rather than assumed.
  const minutes = form.slotMinutes
  const now = new Date()
  const isFirstMonth = form.currentMonth.getFullYear() === now.getFullYear() && form.currentMonth.getMonth() === now.getMonth()
  const validTime = !!form.selectedTime && form.availableTimes.includes(form.selectedTime)
  const canContinue = !form.isLoadingSlots && (mobileCalendar && !timePanelVisible ? !!form.selectedDate : validTime)

  useEffect(() => {
    if (previousStage.current && previousStage.current !== stage) headingRef.current?.focus({ preventScroll: true })
    previousStage.current = stage
  }, [stage])

  useEffect(() => {
    if (mobileCalendar && previousTimePanel.current !== timePanelVisible) {
      (timePanelVisible ? timeHeadingRef.current : dateButtonRef.current)?.focus({ preventScroll: true })
    }
    previousTimePanel.current = timePanelVisible
  }, [timePanelVisible, mobileCalendar])

  const continueSelection = () => {
    if (!canContinue) return
    if (mobileCalendar && !timePanelVisible) setSelectionStep('time')
    else form.setBookingStep('form')
  }
  const selectDate = (day: number) => {
    form.handleDateSelect(day)
    setSelectionStep('time')
  }
  const changeTime = () => {
    setSelectionStep('time')
    form.setBookingStep('select')
  }
  const startAgain = () => {
    if (booking) {
      form.resetBooking()
      setSelectionStep('date')
    } else {
      form.resetEmail()
      setEmailStarted(false)
    }
  }
  const changeField = (field: MessageField, value: string) => {
    if (booking) form.setBookingData({ ...form.bookingData, [field === 'message' ? 'notes' : field]: value })
    else form.setEmailFormData({ ...form.emailFormData, [field]: value })
  }
  const stageHeading = success
    ? (demo ? (booking ? 'Demo booking complete.' : 'Demo message complete.') : booking ? 'You’re on the calendar.' : 'Message received.')
    : form.mode === 'email' ? 'Say hello in your own words.'
    : form.bookingStep === 'form' ? 'A few details, then we’re set.'
    : 'Find a time that works.'
  const successCopy = demo
    ? (booking ? 'That is how the booking flow works. No calendar event, invitation or meeting link was created.' : 'That is how the message flow works. Nothing was sent, and no reply will arrive.')
    : booking
    ? (form.bookingConfirmation?.invitationSent === false
      ? 'Your time is reserved. I’m looking forward to meeting you.'
      : 'Look out for your calendar invitation and Google Meet link. I’m looking forward to meeting you.')
    : 'Thanks for reaching out. I’ll read your message and get back to you.'
  const meetLink = form.bookingConfirmation?.meetLink?.startsWith('https://meet.google.com/') ? form.bookingConfirmation.meetLink : null

  return (
    <div className="contact-page flex min-h-screen flex-col bg-[var(--c-bg)]">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <SocialRail />
      <Header />
      <main id="main-content" className="contact-main flex-1 px-3 sm:px-6 lg:px-14">
        <div className="contact-workspace mx-auto max-w-[1120px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_70px_-35px_rgba(6,37,74,0.3)] lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="contact-aside relative bg-[#06254A] text-white">
            <p className="section-eyebrow section-eyebrow--inverse section-eyebrow--start mb-4 hidden lg:flex">A good place to start</p>
            <ConnectionHeading topic={form.selectedTopic} mode={form.mode} step={noteStep} />
            <ConnectionGraphic topic={form.selectedTopic} mode={form.mode} step={noteStep} />
            <div className="mt-5 hidden flex-wrap gap-x-5 lg:flex gap-y-3 text-sm text-slate-200 lg:flex-col">
              {form.bookingEnabled && <span className="flex items-center gap-2"><Clock size={16} className="text-[#71dfce]" />{minutes ? `${minutes}-minute intro` : 'Intro call'}</span>}
              {form.bookingEnabled && <span className="flex items-center gap-2"><Video size={16} className="text-[#71dfce]" />Google Meet</span>}
              <span className="flex items-center gap-2"><MapPin size={16} className="text-[#71dfce]" />{site.location.label}</span>
            </div>
          </aside>

          <div className="contact-controls min-w-0">
            {!form.bookingEnabled ? (
              // Booking and message delivery are optional integrations; until they are configured the working path is direct email.
              <div className="contact-stage" data-contact-direct-email>
                <h2 className="scroll-mt-24 text-xl font-semibold tracking-tight text-[#06254A]">Say hello by email.</h2>
                <p className="mt-3 max-w-md text-base leading-7 text-slate-600">Booking and the message form aren’t switched on for this site yet. Write to me directly and I’ll reply from the same address.</p>
                <a className={`${primaryButtonClass} mt-6`} href={`mailto:${site.contactEmail}`}>Email {site.contactEmail}<ArrowRight size={16} /></a>
              </div>
            ) : (<>
            {demo && (
              <p role="note" data-contact-demo className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">Demo mode: the calendar and the forms are simulated. Nothing is booked or sent.</p>
            )}
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" aria-label="How would you like to connect?">
              {MODES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={form.mode === id}
                  disabled={form.isSubmitting}
                  onClick={() => form.setMode(id)}
                  className={`contact-mode flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition ${form.mode === id ? 'bg-white text-[#06254A] shadow-sm' : 'text-slate-600 hover:text-[#06254A]'}`}
                >
                  <Icon size={16} className="shrink-0" />{label}
                </button>
              ))}
            </div>

            {!success && !(booking && form.bookingStep === 'form') && (
              <fieldset className="contact-topics">
                <legend className="contact-topic-legend text-sm font-medium text-slate-600"><span>What’s on your mind? <span className="font-normal">(optional)</span></span><TopicHelp /></legend>
                <div className="grid grid-cols-3 gap-2">
                  {TOPICS.map(({ id, label, Icon }) => (
                    <button
                      type="button"
                      key={id}
                      disabled={form.isSubmitting}
                      aria-pressed={form.selectedTopic === id}
                      onClick={() => form.handleTopicSelect(id)}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-medium transition ${form.selectedTopic === id ? 'border-[#118578] bg-[#edfaf7] text-[#086d62]' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}
                    >
                      <Icon size={16} />{label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div key={stage} className="contact-stage">
              <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold tracking-tight text-[#06254A] focus:outline-none">{stageHeading}</h2>
              {form.submissionError && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
                  {form.submissionError} <a href={`mailto:${site.contactEmail}`} className="font-semibold underline">Email me directly</a>.
                </div>
              )}

              {success ? (
                <div className="py-7">
                  <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#118578]"><Check size={24} /></span>
                  <p className="max-w-md text-base leading-7 text-slate-600">{successCopy}</p>
                  {!demo && booking && form.bookingConfirmation?.invitationSent === false && (
                    <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                      Your time is reserved, but the invitation email couldn’t be sent. Please <a className="underline" href={`mailto:${site.contactEmail}`}>email me</a> so I can send it to you. You don’t need to book again.
                    </p>
                  )}
                  {booking && meetLink && (
                    <a className={`${secondaryButtonClass} mt-4`} href={meetLink} target="_blank" rel="noopener noreferrer">Save your Google Meet link<ArrowRight size={16} /></a>
                  )}
                  {booking && (
                    <p className="mt-4 text-sm font-medium text-[#06254A]">{dateLabel} · {selectedTimeLabel}<span className="mt-1 block text-slate-600">{visitorZoneLabel}</span></p>
                  )}
                  <button type="button" className={`${secondaryButtonClass} mt-6`} onClick={startAgain}>{booking ? 'Book another time' : 'Write another message'}<ArrowRight size={16} /></button>
                </div>
              ) : booking && form.bookingStep === 'select' ? (
                <BookingPanel
                  minutes={minutes}
                  availabilityError={form.availabilityError}
                  onRetryAvailability={form.retryAvailability}
                  onSwitchToEmail={() => form.setMode('email')}
                  currentMonth={form.currentMonth}
                  isFirstMonth={isFirstMonth}
                  isLoadingSlots={form.isLoadingSlots}
                  onMonthChange={form.setCurrentMonth}
                  daysInMonth={form.daysInMonth}
                  isDateAvailable={form.isDateAvailable}
                  selectedDate={form.selectedDate}
                  onDateSelect={selectDate}
                  selectedDateLabel={form.selectedDate ? form.formatDate(form.selectedDate) : 'Choose a date first'}
                  timeZone={form.timeZone}
                  visitorZoneLabel={visitorZoneLabel}
                  availableTimes={form.availableTimes}
                  selectedTime={form.selectedTime}
                  onTimeSelect={form.setSelectedTime}
                  timeLabel={timeLabel}
                  timePanelVisible={timePanelVisible}
                  onShowDates={() => setSelectionStep('date')}
                  canContinue={canContinue}
                  onContinue={continueSelection}
                  dateButtonRef={dateButtonRef}
                  timeHeadingRef={timeHeadingRef}
                />
              ) : (
                <MessageForm
                  mode={form.mode}
                  values={booking
                    ? { name: form.bookingData.name, email: form.bookingData.email, message: form.bookingData.notes }
                    : form.emailFormData}
                  onFieldChange={changeField}
                  website={form.website}
                  onWebsiteChange={form.setWebsite}
                  submitting={form.isSubmitting}
                  onSubmit={event => {
                    if (booking) {
                      event.preventDefault()
                      void form.handleBookingSubmit()
                    } else {
                      void form.handleEmailSubmit(event)
                    }
                  }}
                  onFocusCapture={event => {
                    if (!booking && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
                      setEmailStarted(true)
                      form.startEmailAnalytics()
                    }
                  }}
                  botCheck={botCheck}
                  bookingSummary={booking ? {
                    shortDate: form.formatDate(form.selectedDate),
                    longDate: dateLabel,
                    time: selectedTimeLabel,
                    details: `${visitorZoneLabel}${minutes ? ` · ${minutes} min` : ''} · ${topic}`,
                    onChangeTime: changeTime,
                  } : undefined}
                />
              )}
            </div>
            </>)}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
