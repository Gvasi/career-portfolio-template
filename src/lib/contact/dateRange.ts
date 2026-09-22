import { DateTime } from 'luxon'

export class AvailabilityRangeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AvailabilityRangeError'
  }
}

/** Validate calendar-day bounds before allocating slots or querying a provider. */
export function parseAvailabilityRange({
  dateFrom,
  dateTo,
  timeZone,
  maxWindowDays = 62,
  maxLookaheadDays = 180,
  now = DateTime.now(),
}: {
  dateFrom: string
  dateTo: string
  timeZone: string
  maxWindowDays?: number
  maxLookaheadDays?: number
  now?: DateTime
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    throw new AvailabilityRangeError('Dates must use YYYY-MM-DD.')
  }

  const start = DateTime.fromISO(dateFrom, { zone: timeZone }).startOf('day')
  const end = DateTime.fromISO(dateTo, { zone: timeZone }).endOf('day')
  if (!start.isValid || !end.isValid) {
    throw new AvailabilityRangeError('Invalid availability date range.')
  }
  if (end < start) {
    throw new AvailabilityRangeError('dateTo must be on or after dateFrom.')
  }

  // Count calendar days, not elapsed hours: a range may cross a DST transition.
  const requestedDays = Math.floor(end.startOf('day').diff(start, 'days').days) + 1
  if (requestedDays > maxWindowDays) {
    throw new AvailabilityRangeError(`Availability range cannot exceed ${maxWindowDays} days.`)
  }
  const latestDay = now.setZone(timeZone).startOf('day').plus({ days: maxLookaheadDays })
  if (end.startOf('day') > latestDay) {
    throw new AvailabilityRangeError(`Availability can only be queried ${maxLookaheadDays} days ahead.`)
  }
  return { start, end }
}
