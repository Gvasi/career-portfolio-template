import { NextResponse } from 'next/server'
import { reportUnexpectedFailure, type FailurePhase } from '@/lib/serverDiagnostics'
import {
  AvailabilityRangeError,
  CalendarUnavailableError,
  buildAvailabilityQueryWindow,
  buildAvailabilitySlots,
  getBookingSlotMinutes,
  GoogleWorkspaceConfigError,
  hasGoogleWorkspaceAccess,
  queryBusyRanges,
} from '@/lib/google/workspace'
import type { AvailabilityPayload } from '@/lib/contact/availabilityContract'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/requestGuards'
import { SecurityUnavailableError } from '@/lib/security/securityStore'
import { demoAvailability, isDemoMode } from '@/lib/demo'

const AVAILABILITY_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  max: 40,
}

function normalizeDateInput(value: string | null) {
  if (!value) return null
  return value.trim()
}

export async function GET(request: Request) {
  const demo = isDemoMode()
  // Booking is an optional integration. Answered before the rate limit because the reply is constant and
  // needs no provider call; the browser reads `reason` to offer direct email.
  if (!demo && !hasGoogleWorkspaceAccess()) {
    return NextResponse.json({ error: 'Booking is not set up on this site yet.', reason: 'unconfigured' }, { status: 503 })
  }
  let phase: FailurePhase = 'request_processing'
  try {
    if (!demo) {
      const rateLimit = await checkRateLimit('schedule-availability', getClientIp(request), AVAILABILITY_RATE_LIMIT)
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.retryAfterSeconds)
      }
    }

    const { searchParams } = new URL(request.url)
    const dateFrom = normalizeDateInput(searchParams.get('dateFrom'))
    const dateTo = normalizeDateInput(searchParams.get('dateTo'))
    const viewerTimeZone = searchParams.get('timeZone')

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'dateFrom and dateTo are required.' },
        { status: 400 }
      )
    }

    if (demo) {
      return NextResponse.json(demoAvailability(dateFrom, dateTo, viewerTimeZone), {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    phase = 'availability_lookup'
    const busyRanges = await queryBusyRanges(
      buildAvailabilityQueryWindow({
        dateFrom,
        dateTo,
        viewerTimeZone,
      })
    )

    const slots = buildAvailabilitySlots({
      dateFrom,
      dateTo,
      viewerTimeZone,
      busyRanges,
    })

    const payload: AvailabilityPayload = { slots, slotMinutes: getBookingSlotMinutes() }
    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof AvailabilityRangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof GoogleWorkspaceConfigError || error instanceof CalendarUnavailableError || error instanceof SecurityUnavailableError) {
      return NextResponse.json({ error: 'The calendar is temporarily unavailable.' }, { status: 503 })
    }

    const requestId = reportUnexpectedFailure('schedule_availability', phase)
    return NextResponse.json(
      { error: 'Failed to fetch availability.' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
