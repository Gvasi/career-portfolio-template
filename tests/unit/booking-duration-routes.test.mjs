import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { DateTime } from 'luxon'
import { POST as book } from '../../src/app/api/schedule/book/route.ts'
import { GET as availability } from '../../src/app/api/schedule/availability/route.ts'

// The duration contract through the real HTTP handlers: the availability GET
// publishes slotMinutes and per-slot end instants, and the booking POST accepts
// exactly those instants (and rejects a reconstructed 30-minute end). This file
// runs in its own process (the runner's per-file isolation) so its five booking
// POSTs stay under the route's unchanged in-memory limit of six per hour per IP.
// Google is fully mocked; any other outbound fetch throws.
const FIXTURE_NOW = DateTime.fromISO('2026-09-15T12:00:00Z').toMillis()
const DATE = '2026-09-17'
const before = { ...process.env }
let events, inserts, sentRaw, calendarId
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
  events = new Map(); inserts = 0; sentRaw = []
  mock.method(Date, 'now', () => FIXTURE_NOW)
  mock.method(google, 'calendar', () => ({
    freebusy: { query: async () => ({ data: { calendars: { [calendarId]: { busy: [] } } } }) },
    events: {
      insert: async ({ requestBody }) => { inserts++; const value = { ...requestBody, iCalUID: 'test-uid', hangoutLink: 'https://meet.google.com/test-only' }; events.set(value.id, value); return { data: value } },
      get: async ({ eventId }) => { if (!events.has(eventId)) throw { response: { status: 404 } }; return { data: events.get(eventId) } },
    },
  }))
  mock.method(google, 'gmail', () => ({ users: { messages: { send: async ({ requestBody }) => { sentRaw.push(Buffer.from(requestBody.raw, 'base64url').toString()); return { data: { id: 'test-mail' } } } } } }))
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request in duration route test') })
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
  Object.assign(process.env, before)
})

const bookingRequest = (slot, overrides = {}) => new Request('http://localhost:3000/api/schedule/book', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    start: slot.time, end: slot.end, name: 'Local fixture', email: `duration-${randomUUID()}@example.com`,
    topic: 'General', timeZone: 'UTC', attemptId: randomUUID(), ...overrides,
  }),
})

for (const minutes of [15, 30, 60]) {
  test(`${minutes}-minute configuration: availability GET publishes the contract and the booking POST accepts an offered slot exactly`, async () => {
    process.env.GOOGLE_WORKSPACE_SLOT_MINUTES = String(minutes)
    const response = await availability(new Request(`http://localhost:3000/api/schedule/availability?dateFrom=${DATE}&dateTo=${DATE}&timeZone=UTC`))
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.deepEqual(Object.keys(payload).sort(), ['slotMinutes', 'slots'])
    assert.equal(payload.slotMinutes, minutes)
    const slots = payload.slots[DATE]
    assert.equal(slots.length, (8 * 60) / minutes)
    for (const slot of slots) assert.equal(Date.parse(slot.end) - Date.parse(slot.time), minutes * 60_000)
    const chosen = slots[2]
    const booked = await book(bookingRequest(chosen))
    const body = await booked.json()
    assert.equal(booked.status, 200, JSON.stringify(body))
    assert.equal(body.success, true)
    assert.deepEqual(Object.keys(body.booking).sort(), ['id', 'invitationSent', 'meetLink'])
    assert.equal(body.booking.meetLink, 'https://meet.google.com/test-only')
    assert.equal(body.booking.invitationSent, true)
    assert.equal(inserts, 1)
    const event = [...events.values()][0]
    assert.equal(DateTime.fromISO(event.start.dateTime).toMillis(), Date.parse(chosen.time))
    assert.equal(DateTime.fromISO(event.end.dateTime).toMillis(), Date.parse(chosen.end))
    assert.equal(event.start.timeZone, 'UTC')
    assert.equal(sentRaw.length, 2)
    if (minutes !== 30) {
      // A browser that still reconstructed end = start + 30 min would no longer match the offered slot.
      const other = slots[4]
      const guessed = await book(bookingRequest(other, { end: DateTime.fromISO(other.time).plus({ minutes: 30 }).toISO() }))
      assert.equal(guessed.status, 409)
      assert.deepEqual(await guessed.json(), { error: 'That time was just taken. Please choose another slot.' })
      assert.equal(inserts, 1)
      assert.equal(sentRaw.length, 2)
    }
  })
}
