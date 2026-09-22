'use client'

import { useState, useCallback, useRef, type RefObject } from 'react'
import type { BotCheckHandle } from './BotCheck'
import { analyticsHeaders, trackEvent } from '@/lib/analytics/client'

/** The email lane. Submission state and the in-flight guard are shared with booking through the facade. */
export function useEmailSubmission({ submittingRef, botCheck, selectedTopic, website, setIsSubmitting, setSubmissionError }: {
  submittingRef: RefObject<boolean>
  botCheck: RefObject<BotCheckHandle | null>
  selectedTopic: string | null
  website: string
  setIsSubmitting: (value: boolean) => void
  setSubmissionError: (value: string | null) => void
}) {
  const [emailStep, setEmailStep] = useState<'form' | 'success'>('form')
  const [emailFormData, setEmailFormData] = useState({ name: '', email: '', message: '' })
  const analyticsStarted = useRef(false)

  const startEmailAnalytics = useCallback(() => {
    if (!analyticsStarted.current) { analyticsStarted.current = true; void trackEvent('contact_started') }
  }, [])

  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return false
    if (!emailFormData.name || !emailFormData.email || !emailFormData.message) return false
    setSubmissionError(null)
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const turnstileToken = await botCheck.current?.getToken()
      if (turnstileToken === undefined) throw new Error('The security check is not ready. Please try again.')
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...analyticsHeaders() },
        body: JSON.stringify({ ...emailFormData, website, subject: selectedTopic || 'General', turnstileToken })
      })
      if (res.ok) {
        setEmailStep('success')
        void trackEvent('contact_succeeded')
        return true
      }
      const data = await res.json().catch(() => null)
      setSubmissionError(data?.error || 'Message could not be sent right now. Please try again later.')
    } catch (error) {
      setSubmissionError(error instanceof Error && error.message !== 'Failed to fetch' ? error.message : 'Message could not be sent right now. Please try again later.')
    }
    finally { botCheck.current?.reset(); submittingRef.current = false; setIsSubmitting(false) }
    return false
  }, [emailFormData, selectedTopic, website, botCheck, submittingRef, setIsSubmitting, setSubmissionError])

  const resetEmail = useCallback(() => {
    setSubmissionError(null)
    setEmailStep('form')
    setEmailFormData({ name: '', email: '', message: '' })
  }, [setSubmissionError])

  return { emailStep, emailFormData, setEmailFormData, handleEmailSubmit, resetEmail, startEmailAnalytics }
}
