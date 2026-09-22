import assert from 'node:assert/strict'
import { beforeEach, afterEach, mock, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { DateTime } from 'luxon'
import { POST as book } from '../../src/app/api/schedule/book/route.ts'
import { GET as availability } from '../../src/app/api/schedule/availability/route.ts'
import { POST as contact } from '../../src/app/api/contact/route.ts'
import { BookingConflictError, createGoogleMeetBooking } from '../../src/lib/google/workspace.ts'
import { site } from '../../src/config/site.ts'

const before = { ...process.env }
let events, sends, sentRaw, inserts, busyData, calendarId, start
beforeEach(() => {
  process.env.NODE_ENV = 'test'; delete process.env.VERCEL
  for (const key of ['TURNSTILE_SECRET_KEY', 'TURNSTILE_ALLOWED_HOSTNAMES', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) delete process.env[key]
  calendarId = `fixture-${randomUUID()}`
  Object.assign(process.env, {
    GOOGLE_WORKSPACE_CLIENT_ID: 'test-client', GOOGLE_WORKSPACE_CLIENT_SECRET: 'test-secret', GOOGLE_WORKSPACE_REFRESH_TOKEN: 'test-refresh',
    GOOGLE_WORKSPACE_CALENDAR_ID: calendarId, GOOGLE_WORKSPACE_TIMEZONE: 'UTC', GOOGLE_WORKSPACE_MIN_NOTICE_HOURS: '0',
    GOOGLE_WORKSPACE_DAY_WINDOWS: '1=09:00-17:00|2=09:00-17:00|3=09:00-17:00|4=09:00-17:00|5=09:00-17:00|6=09:00-17:00|7=09:00-17:00',
    CONTACT_TO_EMAIL: 'owner@example.com', GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL: 'owner@example.com',
  })
  start = DateTime.utc().plus({ days: 2 }).startOf('day').set({ hour: 10 })
  events = new Map(); sends = 0; sentRaw = []; inserts = 0; busyData = { busy: [] }
  mock.method(google, 'calendar', () => ({
    freebusy: { query: async () => ({ data: { calendars: { [calendarId]: busyData } } }) },
    events: {
      insert: async ({ requestBody }) => { inserts++; const value = { ...requestBody, iCalUID: 'test-uid', hangoutLink: 'https://meet.google.com/test-only' }; events.set(value.id, value); return { data: value } },
      get: async ({ eventId }) => { if (!events.has(eventId)) throw { response: { status: 404 } }; return { data: events.get(eventId) } },
    },
  }))
  mock.method(google, 'gmail', () => ({ users: { messages: { send: async ({ requestBody }) => { sends++; sentRaw.push(Buffer.from(requestBody.raw, 'base64url').toString()); return { data: { id: 'test-mail' } } } } } }))
  // An unexpected fetch must never call a real service during these tests.
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request in route test') })
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
  Object.assign(process.env, before)
})

function bookingRequest(overrides = {}) {
  return new Request('http://localhost:3000/api/schedule/book', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      start: start.toISO(), end: start.plus({ minutes: 30 }).toISO(), name: 'Local fixture', email: `test-${randomUUID()}@example.com`,
      topic: 'General', timeZone: 'UTC', attemptId: randomUUID(), ...overrides,
    }),
  })
}

test('booking route creates once and reuses the receipt on an identical retry', async () => {
  const request = bookingRequest()
  const retry = request.clone()
  const first = await book(request)
  assert.equal(first.status, 200)
  const second = await book(retry)
  assert.equal(second.status, 200)
  assert.deepEqual(await second.json(), await first.json())
  assert.equal(inserts, 1); assert.equal(sends, 2)
  const event = [...events.values()][0]
  assert.equal(event.guestsCanModify, false); assert.equal(event.guestsCanInviteOthers, false)
  assert.ok(sentRaw[0].includes('multipart/alternative'))
  assert.ok(sentRaw[0].includes('text/calendar; method=REQUEST'))
  const calendar = Buffer.from(sentRaw[0].match(/filename="invite.ics"\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)(?=--)/)[1].replace(/\s/g, ''), 'base64').toString()
  assert.ok(calendar.includes(`SUMMARY:Intro with ${site.name}`))
  assert.ok(calendar.split('\r\n').every(line => Buffer.byteLength(line) <= 75))
})

test('contact sends the owner the message, then a styled acknowledgement without reflected form content', async () => {
  const request = new Request('http://localhost:3000/api/contact', { method: 'POST', body: JSON.stringify({ name: 'Untrusted visitor name', email: `qa-${randomUUID()}@example.com`, message: 'Untrusted visitor message', subject: 'Hiring' }) })
  assert.equal((await contact(request)).status, 200)
  assert.equal(sends, 2)
  const parts = [...sentRaw[1].matchAll(/Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)(?=--)/g)].map(match => Buffer.from(match[1].replace(/\s/g, ''), 'base64').toString())
  assert.equal(parts.length, 2)
  assert.ok(parts.every(content => !content.includes('Untrusted visitor')))
  assert.ok(parts[0].includes('Topic: Work')); assert.ok(parts[1].includes('<h1'))
  assert.ok(sentRaw[1].includes(`Reply-To: ${site.contactEmail}`))
  assert.ok(sentRaw[0].includes('To: owner@example.com'))
})

test('per-calendar FreeBusy errors block both availability and booking before any side effect', async () => {
  busyData = { errors: [{ reason: 'notFound' }], busy: [] }
  const date = start.toISODate()
  const result = await availability(new Request(`http://localhost:3000/api/schedule/availability?dateFrom=${date}&dateTo=${date}&timeZone=UTC`))
  assert.equal(result.status, 503)
  assert.equal((await book(bookingRequest())).status, 503)
  assert.equal(inserts, 0); assert.equal(sends, 0)
})

test('a missing Turnstile response blocks direct POST requests when protection is configured', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'test-only-secret'; process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'localhost'
  assert.equal((await book(bookingRequest())).status, 403)
  const request = new Request('http://localhost:3000/api/contact', { method: 'POST', body: JSON.stringify({ name: 'Local fixture', email: 'qa@example.com', message: 'Local only' }) })
  assert.equal((await contact(request)).status, 403)
  assert.equal(inserts, 0); assert.equal(sends, 0)
})

test('fractional timestamps cannot produce a different key for an overlapping offered slot', async () => {
  const result = await book(bookingRequest({ start: start.plus({ milliseconds: 30 }).toISO(), end: start.plus({ minutes: 30, milliseconds: 30 }).toISO() }))
  assert.equal(result.status, 409)
  assert.equal(inserts, 0); assert.equal(sends, 0)
})

test('Athens 18:00 is booked at Madrid 17:00, with guest-local email and a UTC calendar invite', async () => {
  process.env.GOOGLE_WORKSPACE_TIMEZONE = 'Europe/Madrid'
  process.env.GOOGLE_WORKSPACE_DAY_WINDOWS = '1=16:00-19:00|2=16:00-19:00|3=16:00-19:00|4=16:00-19:00|5=16:00-19:00|6=16:00-19:00|7=16:00-19:00'
  start = DateTime.now().setZone('Europe/Athens').plus({ days: 3 }).startOf('day').set({ hour: 18 })
  const result = await book(bookingRequest({ timeZone: 'Europe/Athens' }))
  assert.equal(result.status, 200)
  const event = [...events.values()][0]
  assert.equal(event.start.timeZone, 'Europe/Madrid')
  assert.equal(DateTime.fromISO(event.start.dateTime, { setZone: true }).hour, 17)
  assert.equal(DateTime.fromISO(event.start.dateTime).toMillis(), start.toMillis())
  const visitorMail = sentRaw[0]
  assert.ok(visitorMail.includes(`Reply-To: ${site.contactEmail}`))
  const text = Buffer.from(visitorMail.match(/Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)(?=--)/)[1].replace(/\s/g, ''), 'base64').toString()
  assert.ok(text.includes('18:00–18:30 · Europe/Athens'))
  const calendar = Buffer.from(visitorMail.match(/filename="invite.ics"\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)(?=--)/)[1].replace(/\s/g, ''), 'base64').toString()
  assert.ok(calendar.includes(`DTSTART:${start.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")}`))
})

for (const minutes of [15, 30, 60]) {
  // Service-level acceptance of the published slots (the booking service is called directly because the
  // route tests above already consume this process's shared in-memory IP quota). The HTTP route contract for
  // all three durations is covered in tests/booking-duration-routes.test.mjs. The availability response's
  // HTTP cache policy is not asserted here: the directly invoked handler sets no Cache-Control header itself.
  test(`availability publishes ${minutes}-minute slots and createGoogleMeetBooking accepts the offered end instant`, async () => {
    process.env.GOOGLE_WORKSPACE_SLOT_MINUTES = String(minutes)
    const date = start.toISODate()
    const response = await availability(new Request(`http://localhost:3000/api/schedule/availability?dateFrom=${date}&dateTo=${date}&timeZone=UTC`))
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.deepEqual(Object.keys(payload).sort(), ['slotMinutes', 'slots'])
    assert.equal(payload.slotMinutes, minutes)
    const slots = payload.slots[date]
    assert.equal(slots.length, (8 * 60) / minutes)
    for (const slot of slots) {
      assert.equal(Date.parse(slot.end) - Date.parse(slot.time), minutes * 60_000)
      assert.match(slot.time, /Z$/)
    }
    const chosen = slots[2]
    const booking = { guestName: 'Local fixture', guestEmail: `slot-${randomUUID()}@example.com`, topic: 'General', guestTimeZone: 'UTC', attemptId: randomUUID() }
    await createGoogleMeetBooking({ start: chosen.time, end: chosen.end, ...booking })
    const event = [...events.values()][0]
    assert.equal(DateTime.fromISO(event.end.dateTime).diff(DateTime.fromISO(event.start.dateTime), 'minutes').minutes, minutes)
    // A reconstructed 30-minute end no longer matches a differently configured slot.
    if (minutes !== 30) {
      await assert.rejects(createGoogleMeetBooking({ start: slots[4].time, end: DateTime.fromISO(slots[4].time).plus({ minutes: 30 }).toISO(), ...booking, attemptId: randomUUID() }), BookingConflictError)
    }
    assert.equal(inserts, 1)
  })
}

test('the availability payload carries no guest details or event descriptions', async () => {
  const date = start.toISODate()
  const response = await availability(new Request(`http://localhost:3000/api/schedule/availability?dateFrom=${date}&dateTo=${date}&timeZone=UTC`))
  const text = await response.text()
  assert.doesNotMatch(text, /description|attendee|email|summary/i)
})
