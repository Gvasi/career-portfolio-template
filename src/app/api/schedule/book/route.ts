import { NextResponse } from 'next/server'
import { reportUnexpectedFailure, type FailurePhase } from '@/lib/serverDiagnostics'
import { recordServerOutcome } from '@/lib/analytics/server'
import {
  BookingConflictError,
  BookingPendingError,
  CalendarUnavailableError,
  createGoogleMeetBooking,
  GoogleWorkspaceConfigError,
  hasGoogleWorkspaceAccess,
} from '@/lib/google/workspace'
import {
  checkRateLimit,
  getClientIp,
  InvalidJsonBodyError,
  normalizeMultilineText,
  normalizeSingleLineText,
  rateLimitResponse,
  readLimitedJson,
  RequestBodyTooLargeError,
} from '@/lib/security/requestGuards'
import { BotVerificationError, verifyTurnstile } from '@/lib/security/turnstile'
import { SecurityUnavailableError } from '@/lib/security/securityStore'
import { demoBookingReceipt, isDemoMode } from '@/lib/demo'

const BOOKING_BODY_LIMIT_BYTES = 12 * 1024
const BOOKING_IP_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  max: 6,
}
const BOOKING_EMAIL_RATE_LIMIT = {
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
}

export async function POST(request: Request) {
  if (isDemoMode()) {
    // Demo deployments accept a well-formed booking and create nothing.
    try {
      const body = await readLimitedJson(request, BOOKING_BODY_LIMIT_BYTES)
      const guestEmail = normalizeSingleLineText(body.email, 254)
      if (!body.start || !body.end || !normalizeSingleLineText(body.name, 120) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        return NextResponse.json({ error: 'Start, end, name, and email are required.' }, { status: 400 })
      }
      return NextResponse.json({ success: true, demo: true, booking: demoBookingReceipt() })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 })
    }
  }
  if (!hasGoogleWorkspaceAccess()) {
    return NextResponse.json(
      { error: 'Booking is temporarily unavailable. Please send an email instead.' },
      { status: 503 }
    )
  }

  let phase: FailurePhase = 'request_processing'
  try {
    const ipRateLimit = await checkRateLimit('schedule-book-ip', getClientIp(request), BOOKING_IP_RATE_LIMIT)
    if (!ipRateLimit.allowed) {
      return rateLimitResponse(ipRateLimit.retryAfterSeconds)
    }

    const body = await readLimitedJson(request, BOOKING_BODY_LIMIT_BYTES)
    if (typeof body.website === 'string' && body.website.trim()) {
      return NextResponse.json({ error: 'Please use the email link to get in touch.' }, { status: 400 })
    }
    const start = typeof body.start === 'string' ? body.start : ''
    const end = typeof body.end === 'string' ? body.end : ''
    const guestName = normalizeSingleLineText(body.name, 80)
    const guestEmail = normalizeSingleLineText(body.email, 254).toLowerCase()
    const topic = normalizeSingleLineText(body.topic, 120)
    const notes = normalizeMultilineText(body.notes, 2000)
    const guestTimeZone = normalizeSingleLineText(body.timeZone, 100)

    if (!start || !end || !guestName || !guestEmail) {
      return NextResponse.json(
        { error: 'Start, end, name, and email are required.' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(guestEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 }
      )
    }

    const attemptId = typeof body.attemptId === 'string' ? body.attemptId : ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
      return NextResponse.json({ error: 'Please refresh the booking page and try again.' }, { status: 400 })
    }
    await verifyTurnstile(body.turnstileToken, 'booking')
    const emailRateLimit = await checkRateLimit('schedule-book-email', guestEmail, BOOKING_EMAIL_RATE_LIMIT)
    if (!emailRateLimit.allowed) {
      return rateLimitResponse(emailRateLimit.retryAfterSeconds)
    }

    phase = 'booking_creation'
    const booking = await createGoogleMeetBooking({
      start,
      end,
      guestName,
      guestEmail,
      topic: topic || null,
      notes: notes || null,
      guestTimeZone: guestTimeZone || null,
      attemptId,
    })

    recordServerOutcome(request, 'booking_succeeded', attemptId)
    return NextResponse.json({
      success: true,
      booking,
    })
  } catch (error) {
    if (error instanceof SecurityUnavailableError || error instanceof BotVerificationError || error instanceof BookingPendingError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof BotVerificationError ? 403 : 503 })
    }
    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        { error: 'That time was just taken. Please choose another slot.' },
        { status: 409 }
      )
    }

    if (error instanceof GoogleWorkspaceConfigError || error instanceof CalendarUnavailableError) {
      return NextResponse.json(
        { error: 'Booking is temporarily unavailable. Please send an email instead.' },
        { status: 503 }
      )
    }

    if (error instanceof InvalidJsonBodyError || error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const requestId = reportUnexpectedFailure('schedule_book', phase)
    recordServerOutcome(request, 'booking_failed')
    return NextResponse.json(
      { error: 'Failed to create the booking.' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
