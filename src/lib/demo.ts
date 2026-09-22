import { DateTime, IANAZone } from 'luxon'
import type { AvailabilityPayload } from './contact/availabilityContract'
import { parseAvailabilityRange } from './contact/dateRange'

/**
 * Demo mode simulates the contact page's integrations so a visitor can see the real booking and
 * message flows without any account: the calendar shows generated availability, a booking or a
 * message "succeeds" and nothing is created or sent. It is switched on with one public variable,
 * NEXT_PUBLIC_DEMO_MODE=true, read by the server routes and by the bot check in the browser.
 * Never enable it on a real deployment: it bypasses the security gates by design.
 */
export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}

const DEMO_ZONE = 'Europe/Lisbon'
const DEMO_TIMES = ['10:00', '10:30', '11:00', '14:00', '14:30', '15:00']

/** Weekday slots for the requested range, from tomorrow on, keyed by the viewer's local date like the real route. */
export function demoAvailability(dateFrom: string, dateTo: string, viewerTimeZone: string | null, slotMinutes = 30, now = DateTime.now()): AvailabilityPayload & { demo: true } {
  const viewer = viewerTimeZone && IANAZone.isValidZone(viewerTimeZone) ? viewerTimeZone : 'UTC'
  const slots: AvailabilityPayload['slots'] = {}
  const { start: first, end: last } = parseAvailabilityRange({
    dateFrom, dateTo, timeZone: DEMO_ZONE, now,
  })
  const earliest = now.plus({ hours: 24 })
  for (let day = first; day <= last; day = day.plus({ days: 1 })) {
    if (day.weekday > 5) continue
    for (const clock of DEMO_TIMES) {
      const [hour, minute] = clock.split(':').map(Number)
      const start = day.set({ hour, minute })
      if (start < earliest) continue
      const end = start.plus({ minutes: slotMinutes })
      const key = start.setZone(viewer).toISODate()
      const time = start.toUTC().toISO()
      const until = end.toUTC().toISO()
      if (!key || !time || !until) continue
      ;(slots[key] ??= []).push({ time, end: until })
    }
  }
  return { slots, slotMinutes, demo: true }
}

/** The shape the booking route returns for a real booking, with nothing behind it. */
export function demoBookingReceipt() {
  return { id: `demo-${Date.now().toString(36)}`, meetLink: null, invitationSent: false }
}
