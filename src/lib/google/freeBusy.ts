import { DateTime } from 'luxon'

export class CalendarUnavailableError extends Error {
  constructor() { super('Calendar availability could not be confirmed.'); this.name = 'CalendarUnavailableError' }
}

/** Missing, errored or malformed provider data is never an empty calendar. */
export function parseFreeBusyCalendar(result: unknown) {
  if (!result || typeof result !== 'object') throw new CalendarUnavailableError()
  const calendar = result as { errors?: unknown[] | null; busy?: unknown[] | null }
  if ((calendar.errors != null && (!Array.isArray(calendar.errors) || calendar.errors.length > 0)) || !Array.isArray(calendar.busy)) throw new CalendarUnavailableError()
  return calendar.busy.map(range => {
    if (!range || typeof range !== 'object') throw new CalendarUnavailableError()
    const { start, end } = range as { start?: unknown; end?: unknown }
    if (typeof start !== 'string' || typeof end !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(start) || !/(Z|[+-]\d{2}:\d{2})$/.test(end)) throw new CalendarUnavailableError()
    const from = DateTime.fromISO(start, { setZone: true }).toUTC()
    const to = DateTime.fromISO(end, { setZone: true }).toUTC()
    if (!from.isValid || !to.isValid || to <= from) throw new CalendarUnavailableError()
    return { start: from, end: to }
  })
}
