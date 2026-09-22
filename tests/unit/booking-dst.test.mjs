import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { DateTime } from 'luxon'
import { BookingConflictError, buildAvailabilitySlots, createGoogleMeetBooking } from '../../src/lib/google/workspace.ts'

// Configured windows are wall-clock times. On a daylight-saving transition day
// the organiser's day is 23 or 25 hours long, so "minutes after midnight"
// arithmetic drifts by an hour; these fixtures pin the intended opening time.
const ZONE = 'Europe/Madrid'
const CASES = [
  { label: 'spring-forward Sunday', date: '2026-03-29', now: '2026-03-15T12:00:00Z' },
  { label: 'fall-back Sunday', date: '2026-10-25', now: '2026-10-10T12:00:00Z' },
  { label: 'ordinary Sunday', date: '2026-09-20', now: '2026-09-15T12:00:00Z' },
]

const before = { ...process.env }
let events, inserts, sentRaw, busyData, busyQueries, calendarId
beforeEach(() => {
  process.env.NODE_ENV = 'test'; delete process.env.VERCEL
  for (const key of ['TURNSTILE_SECRET_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) delete process.env[key]
  calendarId = `fixture-${randomUUID()}`
  Object.assign(process.env, {
    GOOGLE_WORKSPACE_CLIENT_ID: 'test-client', GOOGLE_WORKSPACE_CLIENT_SECRET: 'test-secret', GOOGLE_WORKSPACE_REFRESH_TOKEN: 'test-refresh',
    GOOGLE_WORKSPACE_CALENDAR_ID: calendarId, GOOGLE_WORKSPACE_TIMEZONE: ZONE, GOOGLE_WORKSPACE_MIN_NOTICE_HOURS: '0',
    GOOGLE_WORKSPACE_DAY_WINDOWS: '7=18:30-20:00', GOOGLE_WORKSPACE_SLOT_MINUTES: '30',
    CONTACT_TO_EMAIL: 'owner@example.com', GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL: 'owner@example.com',
  })
  events = new Map(); inserts = 0; sentRaw = []; busyData = { busy: [] }; busyQueries = 0
  mock.method(google, 'calendar', () => ({
    freebusy: { query: async () => { busyQueries++; return { data: { calendars: { [calendarId]: busyData } } } } },
    events: {
      insert: async ({ requestBody }) => { inserts++; const value = { ...requestBody, iCalUID: 'test-uid', hangoutLink: 'https://meet.google.com/test-only' }; events.set(value.id, value); return { data: value } },
      get: async ({ eventId }) => { if (!events.has(eventId)) throw { response: { status: 404 } }; return { data: events.get(eventId) } },
    },
  }))
  mock.method(google, 'gmail', () => ({ users: { messages: { send: async ({ requestBody }) => { sentRaw.push(Buffer.from(requestBody.raw, 'base64url').toString()); return { data: { id: 'test-mail' } } } } } }))
  // No test here may reach a real service.
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request in DST test') })
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
  Object.assign(process.env, before)
})

// Luxon's clock defaults to Date.now, so one mock fixes both clocks.
const freezeClock = iso => { const millis = DateTime.fromISO(iso).toMillis(); mock.method(Date, 'now', () => millis) }
const localTime = (iso, zone = ZONE) => DateTime.fromISO(iso).setZone(zone).toFormat('HH:mm')
const book = (start, overrides = {}) => createGoogleMeetBooking({
  start: start.toUTC().toISO(), end: start.plus({ minutes: 30 }).toUTC().toISO(), guestName: 'Local fixture', guestEmail: `guest-${randomUUID()}@example.com`,
  topic: 'General', guestTimeZone: 'Europe/Athens', attemptId: randomUUID(), ...overrides,
})

for (const { label, date, now } of CASES) {
  test(`availability opens at 18:30 Madrid on the ${label} (${date})`, () => {
    freezeClock(now)
    const slots = buildAvailabilitySlots({ dateFrom: date, dateTo: date, viewerTimeZone: ZONE, busyRanges: [] })
    assert.deepEqual(Object.keys(slots), [date])
    assert.deepEqual(slots[date].map(slot => localTime(slot.time)), ['18:30', '19:00', '19:30'])
    for (const slot of slots[date]) {
      assert.equal(DateTime.fromISO(slot.time).second, 0)
      assert.equal(localTime(slot.time, 'Europe/Athens'), DateTime.fromISO(slot.time).setZone('Europe/Athens').toFormat('HH:mm'))
    }
  })

  test(`booking 18:30 Madrid on the ${label} is accepted at that instant; 17:30 and fractions are rejected`, async () => {
    freezeClock(now)
    const start = DateTime.fromISO(`${date}T18:30`, { zone: ZONE })
    const receipt = await book(start)
    assert.equal(receipt.meetLink, 'https://meet.google.com/test-only')
    assert.equal(inserts, 1)
    const event = [...events.values()][0]
    assert.equal(event.start.timeZone, ZONE)
    assert.equal(DateTime.fromISO(event.start.dateTime, { setZone: true }).toFormat('HH:mm'), '18:30')
    assert.equal(DateTime.fromISO(event.start.dateTime).toMillis(), start.toMillis())
    assert.equal(DateTime.fromISO(event.end.dateTime).diff(DateTime.fromISO(event.start.dateTime), 'minutes').minutes, 30)
    // The guest in Athens reads the same instant one hour later.
    const guestText = Buffer.from(sentRaw[0].match(/Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)(?=--)/)[1].replace(/\s/g, ''), 'base64').toString()
    assert.ok(guestText.includes('19:30–20:00 · Europe/Athens'), guestText)
    await assert.rejects(book(DateTime.fromISO(`${date}T17:30`, { zone: ZONE })), BookingConflictError)
    await assert.rejects(book(start.plus({ milliseconds: 30 })), BookingConflictError)
    assert.equal(inserts, 1)
  })

  test(`a busy overlap on the ${label} is rejected at the FreeBusy check without a write, and the slot books once it clears`, async () => {
    freezeClock(now)
    const offered = buildAvailabilitySlots({ dateFrom: date, dateTo: date, viewerTimeZone: ZONE, busyRanges: [] })[date]
    assert.deepEqual(offered.map(slot => localTime(slot.time)), ['18:30', '19:00', '19:30'])
    // The busy interval exists before any attempt on 18:30, so the rejection must come from the provider check.
    const busyStart = DateTime.fromISO(`${date}T18:30`, { zone: ZONE }).toUTC()
    busyData = { busy: [{ start: busyStart.toISO(), end: busyStart.plus({ minutes: 30 }).toISO() }] }
    const remaining = buildAvailabilitySlots({ dateFrom: date, dateTo: date, viewerTimeZone: ZONE, busyRanges: [{ start: busyStart, end: busyStart.plus({ minutes: 30 }) }] })[date]
    assert.deepEqual(remaining.map(slot => localTime(slot.time)), ['19:00', '19:30'])
    await assert.rejects(book(DateTime.fromISO(`${date}T18:30`, { zone: ZONE })), BookingConflictError)
    assert.equal(busyQueries, 1)
    assert.equal(inserts, 0)
    assert.equal(sentRaw.length, 0)
    // Once the calendar frees up, the same slot books: the pre-write rejection left no blocking claim.
    busyData = { busy: [] }
    await book(DateTime.fromISO(`${date}T18:30`, { zone: ZONE }), { guestEmail: `again-${randomUUID()}@example.com` })
    assert.equal(busyQueries, 2)
    assert.equal(inserts, 1)
    assert.equal(DateTime.fromISO([...events.values()][0].start.dateTime).toMillis(), busyStart.toMillis())
    // The remaining offered slots book at their exact instants.
    for (const slot of remaining) await book(DateTime.fromISO(slot.time, { zone: ZONE }))
    assert.equal(inserts, 3)
    const starts = [...events.values()].map(event => DateTime.fromISO(event.start.dateTime).toMillis()).sort()
    assert.deepEqual(starts, offered.map(slot => Date.parse(slot.time)).sort())
  })
}
