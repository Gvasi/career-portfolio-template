'use client'

import type { CSSProperties, RefObject } from 'react'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react'
import { primaryButtonClass, secondaryButtonClass } from './contactStyles'

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface BookingPanelProps {
  /** Slot length from the availability payload; null until it has loaded. */
  minutes: number | null
  availabilityError: string | null
  onRetryAvailability: () => void
  onSwitchToEmail: () => void
  currentMonth: Date
  isFirstMonth: boolean
  isLoadingSlots: boolean
  onMonthChange: (month: Date) => void
  daysInMonth: (number | null)[]
  isDateAvailable: (day: number) => boolean
  selectedDate: Date | null
  onDateSelect: (day: number) => void
  selectedDateLabel: string
  timeZone: string
  visitorZoneLabel: string
  availableTimes: string[]
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  timeLabel: (time: string) => string
  /** On phone widths the calendar and the times are separate steps. */
  timePanelVisible: boolean
  onShowDates: () => void
  canContinue: boolean
  onContinue: () => void
  /** Focus targets of the owner's step-change effect: the selected day and the times heading. */
  dateButtonRef: RefObject<HTMLButtonElement | null>
  timeHeadingRef: RefObject<HTMLParagraphElement | null>
}

/** The "select a slot" step of a booking: month navigation, available days and times, and the continue footer. */
export default function BookingPanel({
  minutes, availabilityError, onRetryAvailability, onSwitchToEmail,
  currentMonth, isFirstMonth, isLoadingSlots, onMonthChange, daysInMonth, isDateAvailable, selectedDate, onDateSelect, selectedDateLabel,
  timeZone, visitorZoneLabel, availableTimes, selectedTime, onTimeSelect, timeLabel,
  timePanelVisible, onShowDates, canContinue, onContinue, dateButtonRef, timeHeadingRef,
}: BookingPanelProps) {
  const monthTitle = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const shiftMonth = (months: number) => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + months, 1))
  const dayLabel = (day: number) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const noDaysThisMonth = !isLoadingSlots && !daysInMonth.some(day => day !== null && isDateAvailable(day))

  return (
    <>
      <p className="contact-meeting-meta mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1.5 text-[#06254A]"><Clock size={14} aria-hidden="true" />{minutes ? `${minutes} min · Meet` : 'Meet'}</span>
        <span>Your local time</span>
      </p>
      {availabilityError ? (
        <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p>{availabilityError}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onRetryAvailability}>Try again</button>
            <button type="button" className={secondaryButtonClass} onClick={onSwitchToEmail}>Send a message</button>
          </div>
        </div>
      ) : (
        <div className="contact-calendar-layout grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(130px,0.65fr)]">
          <div className={timePanelVisible ? 'hidden sm:block' : ''}>
            <div className="mb-1 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                disabled={isFirstMonth || isLoadingSlots}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#06254A] hover:bg-slate-100 disabled:opacity-25"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft size={20} />
              </button>
              <p className="contact-month-title text-sm font-semibold text-[#06254A]" aria-live="polite">
                {monthTitle}
                <span className="contact-calendar-loading" role="status">
                  {isLoadingSlots && <><Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /><span className="sr-only">Loading available times</span></>}
                </span>
              </p>
              <button
                type="button"
                aria-label="Next month"
                disabled={isLoadingSlots}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#06254A] hover:bg-slate-100 disabled:opacity-25"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="contact-calendar-days grid grid-cols-7 text-center" aria-busy={isLoadingSlots}>
              {WEEKDAY_INITIALS.map((day, index) => <span key={index} aria-hidden="true" className="py-2 text-xs font-medium text-slate-500">{day}</span>)}
              {daysInMonth.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} />
                const selected = selectedDate?.getDate() === day
                return (
                  <button
                    type="button"
                    key={day}
                    ref={selected ? dateButtonRef : undefined}
                    disabled={isLoadingSlots || !isDateAvailable(day)}
                    aria-label={dayLabel(day)}
                    aria-pressed={selected}
                    onClick={() => onDateSelect(day)}
                    className={`mx-auto flex min-h-11 w-full max-w-11 items-center justify-center rounded-full text-sm transition disabled:text-slate-300 ${selected ? 'bg-[#06254A] font-semibold text-white' : 'font-medium text-[#086d62] enabled:hover:bg-teal-50'}`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            {noDaysThisMonth && (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                No times this month. Try the next month or <button type="button" className="font-medium text-[#086d62] underline" onClick={onSwitchToEmail}>send a message</button>.
              </p>
            )}
          </div>
          <div className={`${timePanelVisible ? 'contact-time-reveal' : 'hidden sm:block'} sm:border-l border-slate-200 sm:pl-5`}>
            <button type="button" className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#086d62] sm:hidden" onClick={onShowDates}><ArrowLeft size={16} />Change date</button>
            <p ref={timeHeadingRef} tabIndex={-1} className="mb-1 text-sm font-medium text-[#06254A] focus:outline-none">{selectedDateLabel}</p>
            <p className="mb-3 break-words text-xs leading-5 text-slate-500" data-visitor-timezone={timeZone}>{visitorZoneLabel}</p>
            <div key={selectedDate?.toISOString()} className="contact-times grid max-h-60 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-1">
              {availableTimes.map((time, index) => (
                <button
                  style={{ '--slot-delay': `${index * 65}ms` } as CSSProperties}
                  type="button"
                  key={time}
                  aria-pressed={selectedTime === time}
                  onClick={() => onTimeSelect(time)}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-medium transition ${selectedTime === time ? 'border-[#118578] bg-[#edfaf7] text-[#086d62]' : 'border-slate-200 text-[#06254A] hover:border-[#118578]'}`}
                >
                  {timeLabel(time)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="contact-step-footer flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
        <p className="text-xs text-slate-500">{timePanelVisible ? 'Choose a time' : 'Choose a date'} · 1 of 2</p>
        <button type="button" className={primaryButtonClass} disabled={!canContinue} onClick={onContinue}>Continue<ArrowRight size={16} /></button>
      </div>
    </>
  )
}
