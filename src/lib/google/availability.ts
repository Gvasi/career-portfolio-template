import { DateTime } from 'luxon'
import type { AvailabilitySlots } from '../contact/availabilityContract'
import { parseAvailabilityRange } from '../contact/dateRange'
import { getBookingConfig, getAvailabilitySpansForWeekday, isValidTimeZone, parsePositiveInteger, type BookingAvailabilityConfig } from './config'

export { AvailabilityRangeError } from '../contact/dateRange'

type BusyRange = {
  start: DateTime
  end: DateTime
}

export function getViewerTimeZone(value: string | null | undefined, fallback: string) {
  if (value && isValidTimeZone(value)) {
    return value
  }

  return fallback
}

export function hasBusyConflict(busyRanges: BusyRange[], startUtc: DateTime, endUtc: DateTime) {
  return busyRanges.some((range) => startUtc < range.end && endUtc > range.start)
}

// Configured windows are wall-clock times. Adding minutes to midnight is elapsed
// time and shifts a window by an hour on a daylight-saving transition day, so
// window boundaries are set as clock fields; only the slot length is elapsed time.
function localTimeAtMinute(day: DateTime, minuteOfDay: number): DateTime {
  return day.set({
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
    second: 0,
    millisecond: 0,
  })
}

function getAvailabilityRange({
  dateFrom,
  dateTo,
  viewerTimeZone,
  organizerTimeZone,
}: {
  dateFrom: string
  dateTo: string
  viewerTimeZone?: string | null
  organizerTimeZone: string
}) {
  const safeViewerTimeZone = getViewerTimeZone(viewerTimeZone, organizerTimeZone)
  const maxWindowDays = parsePositiveInteger(
    process.env.GOOGLE_WORKSPACE_MAX_AVAILABILITY_WINDOW_DAYS,
    62,
    'Maximum availability window'
  )
  const maxLookaheadDays = parsePositiveInteger(
    process.env.GOOGLE_WORKSPACE_MAX_AVAILABILITY_LOOKAHEAD_DAYS,
    180,
    'Maximum availability lookahead'
  )
  const { start: viewerRangeStart, end: viewerRangeEnd } = parseAvailabilityRange({
    dateFrom,
    dateTo,
    timeZone: safeViewerTimeZone,
    maxWindowDays,
    maxLookaheadDays,
  })

  return {
    safeViewerTimeZone,
    viewerRangeStart,
    viewerRangeEnd,
    queryStartUtc: viewerRangeStart.minus({ days: 1 }).toUTC(),
    queryEndUtc: viewerRangeEnd.plus({ days: 1 }).toUTC(),
  }
}

export function isSlotAlignedToAvailabilityRule(
  config: BookingAvailabilityConfig,
  startUtc: DateTime,
  endUtc: DateTime
) {
  const durationMinutes = endUtc.diff(startUtc, 'minutes').minutes

  // Match the exact minute-based slots the UI offers, including the reservation key.
  if (
    startUtc.second !== 0 || startUtc.millisecond !== 0 ||
    endUtc.second !== 0 || endUtc.millisecond !== 0 ||
    durationMinutes !== config.slotMinutes
  ) {
    return false
  }

  const nowWithNotice = DateTime.utc().plus({ hours: config.minNoticeHours })
  const maxLookahead = parsePositiveInteger(
    process.env.GOOGLE_WORKSPACE_MAX_AVAILABILITY_LOOKAHEAD_DAYS,
    180,
    'Maximum availability lookahead'
  )
  if (startUtc <= nowWithNotice || startUtc > DateTime.utc().plus({ days: maxLookahead })) {
    return false
  }

  const organizerStart = startUtc.setZone(config.organizerTimeZone)
  const organizerEnd = endUtc.setZone(config.organizerTimeZone)

  if (organizerStart.toISODate() !== organizerEnd.toISODate()) {
    return false
  }

  const organizerDayStart = organizerStart.startOf('day')
  const matchingSpans = getAvailabilitySpansForWeekday(config, organizerStart.weekday)

  return matchingSpans.some((span) => {
    const spanStart = localTimeAtMinute(organizerDayStart, span.startMinutes)
    const spanEnd = localTimeAtMinute(organizerDayStart, span.endMinutes)
    const minutesFromSpanStart = organizerStart.diff(spanStart, 'minutes').minutes

    return (
      organizerStart >= spanStart &&
      organizerEnd <= spanEnd &&
      minutesFromSpanStart >= 0 &&
      Math.abs(minutesFromSpanStart % config.slotMinutes) < 0.001
    )
  })
}

export function buildAvailabilityQueryWindow({
  dateFrom,
  dateTo,
  viewerTimeZone,
}: {
  dateFrom: string
  dateTo: string
  viewerTimeZone?: string | null
}) {
  const config = getBookingConfig()
  const { queryStartUtc, queryEndUtc } = getAvailabilityRange({
    dateFrom,
    dateTo,
    viewerTimeZone,
    organizerTimeZone: config.organizerTimeZone,
  })

  return {
    timeMin: queryStartUtc.toISO() || `${dateFrom}T00:00:00Z`,
    timeMax: queryEndUtc.toISO() || `${dateTo}T23:59:59Z`,
  }
}

export function buildAvailabilitySlots({
  dateFrom,
  dateTo,
  viewerTimeZone,
  busyRanges,
}: {
  dateFrom: string
  dateTo: string
  viewerTimeZone?: string | null
  busyRanges: BusyRange[]
}) {
  const config = getBookingConfig()
  const { safeViewerTimeZone, viewerRangeStart, viewerRangeEnd, queryStartUtc, queryEndUtc } =
    getAvailabilityRange({
      dateFrom,
      dateTo,
      viewerTimeZone,
      organizerTimeZone: config.organizerTimeZone,
    })
  const nowWithNotice = DateTime.utc().plus({ hours: config.minNoticeHours })
  const slots: AvailabilitySlots = {}

  let organizerDay = queryStartUtc.setZone(config.organizerTimeZone).startOf('day')
  const organizerEndDay = queryEndUtc.setZone(config.organizerTimeZone).endOf('day')

  while (organizerDay <= organizerEndDay) {
    const availabilitySpans = getAvailabilitySpansForWeekday(config, organizerDay.weekday)

    for (const span of availabilitySpans) {
      let slotStart = localTimeAtMinute(organizerDay, span.startMinutes)
      const slotCutoff = localTimeAtMinute(organizerDay, span.endMinutes)

      while (slotStart.plus({ minutes: config.slotMinutes }) <= slotCutoff) {
        const slotEnd = slotStart.plus({ minutes: config.slotMinutes })
        const slotStartUtc = slotStart.toUTC()
        const slotEndUtc = slotEnd.toUTC()

        if (slotStartUtc > nowWithNotice && !hasBusyConflict(busyRanges, slotStartUtc, slotEndUtc)) {
          const viewerSlot = slotStartUtc.setZone(safeViewerTimeZone)
          if (viewerSlot >= viewerRangeStart && viewerSlot <= viewerRangeEnd) {
            const dateKey = viewerSlot.toISODate()
            const time = slotStartUtc.toISO()
            const end = slotEndUtc.toISO()
            if (dateKey && time && end) {
              slots[dateKey] ??= []
              slots[dateKey].push({ time, end })
            }
          }
        }

        slotStart = slotStart.plus({ minutes: config.slotMinutes })
      }
    }

    organizerDay = organizerDay.plus({ days: 1 })
  }

  for (const daySlots of Object.values(slots)) {
    daySlots.sort((left, right) => left.time.localeCompare(right.time))
  }

  return slots
}
