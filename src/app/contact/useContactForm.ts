'use client'

import { useState, useCallback, useRef } from 'react'
import { Briefcase, Rocket, MessageCircle } from 'lucide-react'
import { CONTACT_TOPICS, INTENT_TOPIC_MAP } from '@/content/contact'
import { invalidateAvailability } from '@/lib/contact/availability'
import type { BotCheckHandle } from './BotCheck'
import { analyticsHeaders, trackEvent } from '@/lib/analytics/client'
import { toLocalDateKey, useBookingAvailability } from './useBookingAvailability'
import { useEmailSubmission } from './useEmailSubmission'

// Topics with icons
const topicIcons = { Hiring: Briefcase, 'VC / Startup': Rocket, General: MessageCircle }
export const TOPICS = CONTACT_TOPICS.map(topic => ({ ...topic, Icon: topicIcons[topic.id] }))

function normalizeIntent(intent?: string | null) {
  return intent?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ?? ''
}

export function getInitialTopic(intent?: string | null) {
  // A plain object inherits keys such as "constructor"; only configured intents may match.
  const normalizedIntent = normalizeIntent(intent)
  return normalizedIntent && Object.prototype.hasOwnProperty.call(INTENT_TOPIC_MAP, normalizedIntent)
    ? INTENT_TOPIC_MAP[normalizedIntent]
    : null
}

/**
 * Facade for the contact page: mode, topic, slot selection and the booking
 * submission live here; calendar availability and the email lane are hooks of
 * their own. One in-flight guard and one submission state serve both modes.
 */
export function useContactForm(initialIntent: string | null | undefined, botCheck: React.RefObject<BotCheckHandle | null>) {
  const initialTopic = getInitialTopic(initialIntent)
  const [modeState, setModeState] = useState<'book' | 'email'>(() => initialTopic ? 'email' : 'book')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(initialTopic ?? 'General')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeState, setSelectedTimeState] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const bookingAnalyticsStarted = useRef(false)
  const countedBookings = useRef(new Set<string>())
  const bookingAttempt = useRef<{ slot: string; id: string } | null>(null)
  const [bookingConfirmation, setBookingConfirmation] = useState<{ meetLink?: string | null; invitationSent?: boolean } | null>(null)
  const [website, setWebsite] = useState('')
  const [bookingStep, setBookingStep] = useState<'select' | 'form' | 'success'>('select')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState({ name: '', email: '', notes: '' })

  const calendar = useBookingAvailability()
  const { currentMonth, prime, changeMonth: changeCalendarMonth, isDateAvailable, getSlotsForDate, retryAvailability, timeZone } = calendar
  const email = useEmailSubmission({ submittingRef, botCheck, selectedTopic, website, setIsSubmitting, setSubmissionError })

  const setMode = useCallback((nextMode: 'book' | 'email') => {
    if (nextMode === modeState) return
    setSubmissionError(null)
    if (nextMode === 'book') prime()
    setModeState(nextMode)
  }, [prime, modeState])

  const setSelectedTime = useCallback((nextTime: string | null) => {
    setSubmissionError(null)
    setSelectedTimeState(nextTime)
  }, [])

  const changeMonth = useCallback((month: Date) => {
    changeCalendarMonth(month)
    setSelectedDate(null)
    setSelectedTimeState(null)
    setSubmissionError(null)
  }, [changeCalendarMonth])

  const handleTopicSelect = useCallback((topicId: string) => {
    setSubmissionError(null)
    setSelectedTopic(topicId)
  }, [])

  const handleDateSelect = useCallback((day: number) => {
    if (!isDateAvailable(day)) return
    if (!bookingAnalyticsStarted.current) { bookingAnalyticsStarted.current = true; void trackEvent('booking_started') }
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSubmissionError(null)
    setSelectedDate(date)
    setSelectedTimeState(null)
  }, [currentMonth, isDateAvailable])

  const handleBookingSubmit = useCallback(async () => {
    if (submittingRef.current) return false
    if (!selectedDate || !selectedTimeState || !bookingData.name || !bookingData.email) return false
    // The submitted end is the server's own instant for the chosen slot, never a reconstructed length.
    const slot = getSlotsForDate(selectedDate).find(candidate => candidate.time === selectedTimeState)
    if (!slot) {
      setSubmissionError('That time is no longer offered. Please choose another slot.')
      setSelectedTimeState(null)
      setBookingStep('select')
      retryAvailability()
      return false
    }
    setSubmissionError(null)
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const turnstileToken = await botCheck.current?.getToken()
      if (turnstileToken === undefined) throw new Error('The security check is not ready. Please try again.')
      const attemptKey = `${slot.time}:${bookingData.email.trim().toLowerCase()}`
      if (bookingAttempt.current?.slot !== attemptKey) bookingAttempt.current = { slot: attemptKey, id: crypto.randomUUID() }
      const res = await fetch('/api/schedule/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...analyticsHeaders() },
        body: JSON.stringify({
          start: slot.time,
          end: slot.end,
          name: bookingData.name,
          email: bookingData.email,
          topic: selectedTopic,
          notes: bookingData.notes,
          website,
          timeZone,
          turnstileToken,
          attemptId: bookingAttempt.current.id,
        })
      })
      if (res.ok) {
        const data = await res.json()
        invalidateAvailability()
        setBookingConfirmation(data.booking ?? null)
        setBookingStep('success')
        if (!countedBookings.current.has(bookingAttempt.current.id)) {
          countedBookings.current.add(bookingAttempt.current.id)
          void trackEvent('booking_succeeded')
        }
        return true
      }
      const data = await res.json().catch(() => null)
      if (res.status === 409) {
        bookingAttempt.current = null
        setSelectedTimeState(null)
        setBookingStep('select')
        retryAvailability()
      }
      setSubmissionError(data?.error || 'Booking is unavailable right now. Please use the email option instead.')
    } catch (error) {
      setSubmissionError(error instanceof Error && error.message !== 'Failed to fetch' ? error.message : 'Booking is unavailable right now. Please use the email option instead.')
    }
    finally { botCheck.current?.reset(); submittingRef.current = false; setIsSubmitting(false) }
    return false
  }, [selectedDate, selectedTimeState, bookingData, selectedTopic, website, botCheck, getSlotsForDate, retryAvailability, timeZone])

  const resetBooking = useCallback(() => {
    bookingAttempt.current = null
    setSubmissionError(null)
    setBookingStep('select')
    setBookingConfirmation(null)
    setSelectedDate(null)
    setSelectedTimeState(null)
    setBookingData({ name: '', email: '', notes: '' })
    retryAvailability()
  }, [retryAvailability])

  const formatDate = useCallback((date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }, [])

  const availableTimes = getSlotsForDate(selectedDate).map(slot => slot.time)

  return {
    startEmailAnalytics: email.startEmailAnalytics,
    mode: modeState, setMode, bookingConfirmation,
    selectedTopic, handleTopicSelect,
    selectedDate, handleDateSelect,
    selectedTime: selectedTimeState, setSelectedTime,
    currentMonth, setCurrentMonth: changeMonth,
    daysInMonth: calendar.daysInMonth,
    getDateKey: calendar.getDateKey,
    isDateAvailable: calendar.isDateAvailable,
    availableTimes,
    isLoadingSlots: calendar.isLoadingSlots, availabilityError: calendar.availabilityError, bookingEnabled: calendar.bookingEnabled, retryAvailability, timeZone, website, setWebsite,
    slotMinutes: calendar.slotMinutes,
    bookingStep, setBookingStep,
    bookingData, setBookingData,
    handleBookingSubmit,
    resetBooking,
    emailStep: email.emailStep,
    emailFormData: email.emailFormData, setEmailFormData: email.setEmailFormData,
    handleEmailSubmit: email.handleEmailSubmit,
    resetEmail: email.resetEmail,
    isSubmitting,
    submissionError,
    formatDate,
    formatDateKey: toLocalDateKey,
  }
}
