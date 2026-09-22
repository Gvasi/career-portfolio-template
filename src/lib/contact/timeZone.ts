/** All slot labels use the same visitor zone sent to availability and booking. */
export function formatSlotTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: timeZone || 'UTC',
  }).format(new Date(value))
}

export function formatVisitorTimeZone(timeZone: string, instant: string | Date = new Date()) {
  if (!timeZone) return 'Your local timezone'
  const offset = new Intl.DateTimeFormat('en-GB', {
    timeZone, timeZoneName: 'shortOffset',
  }).formatToParts(new Date(instant)).find(part => part.type === 'timeZoneName')?.value
  return `${timeZone.replaceAll('_', ' ')}${offset ? ` · ${offset}` : ''}`
}
