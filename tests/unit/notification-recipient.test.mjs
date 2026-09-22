import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { DateTime } from 'luxon'
import { POST as book } from '../../src/app/api/schedule/book/route.ts'
import { POST as contact } from '../../src/app/api/contact/route.ts'
import { getNotificationRecipient, GoogleWorkspaceConfigError } from '../../src/lib/google/workspace.ts'
import { site } from '../../src/config/site.ts'

// The private notification inbox is configuration, never a value in source.
// These tests run the real routes with Google mocked: nothing leaves the process.
const before = { ...process.env }
let sends, sentTo, sentRaw, inserts, start
beforeEach(() => {
  process.env.NODE_ENV = 'test'; delete process.env.VERCEL
  for (const key of ['TURNSTILE_SECRET_KEY', 'TURNSTILE_ALLOWED_HOSTNAMES', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'CONTACT_TO_EMAIL', 'SITE_OWNER_EMAIL_ALIASES']) delete process.env[key]
  Object.assign(process.env, {
    GOOGLE_WORKSPACE_CLIENT_ID: 'test-client', GOOGLE_WORKSPACE_CLIENT_SECRET: 'test-secret', GOOGLE_WORKSPACE_REFRESH_TOKEN: 'test-refresh',
    GOOGLE_WORKSPACE_CALENDAR_ID: `fixture-${randomUUID()}`, GOOGLE_WORKSPACE_TIMEZONE: 'UTC', GOOGLE_WORKSPACE_MIN_NOTICE_HOURS: '0',
    GOOGLE_WORKSPACE_DAY_WINDOWS: '1=09:00-17:00|2=09:00-17:00|3=09:00-17:00|4=09:00-17:00|5=09:00-17:00|6=09:00-17:00|7=09:00-17:00',
    GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL: 'sender@example.com',
  })
  start = DateTime.utc().plus({ days: 2 }).startOf('day').set({ hour: 10 })
  sends = 0; sentTo = []; sentRaw = []; inserts = 0
  mock.method(google, 'calendar', () => ({
    freebusy: { query: async () => ({ data: { calendars: { [process.env.GOOGLE_WORKSPACE_CALENDAR_ID]: { busy: [] } } } }) },
    events: {
      insert: async ({ requestBody }) => { inserts++; return { data: { ...requestBody, id: `evt-${inserts}`, iCalUID: 'test-uid', hangoutLink: 'https://meet.google.com/test-only' } } },
      get: async () => { throw { response: { status: 404 } } },
    },
  }))
  mock.method(google, 'gmail', () => ({ users: { messages: { send: async ({ requestBody }) => {
    sends++
    const raw = Buffer.from(requestBody.raw, 'base64url').toString()
    sentRaw.push(raw); sentTo.push(raw.match(/^To: (.*)$/m)?.[1])
    return { data: { id: `msg-${sends}` } }
  } } } }))
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request in recipient test') })
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
  Object.assign(process.env, before)
})

const visitor = () => `visitor-${randomUUID()}@example.com`
const contactRequest = email => new Request('http://localhost:3000/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Fixture visitor', email, message: 'A fixture message long enough to pass validation.', subject: 'Hiring' }) })
const bookingRequest = email => new Request('http://localhost:3000/api/schedule/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: start.toISO(), end: start.plus({ minutes: 30 }).toISO(), name: 'Fixture visitor', email, topic: 'General', timeZone: 'UTC', attemptId: randomUUID() }) })

test('without CONTACT_TO_EMAIL the recipient getter refuses instead of falling back to any address', () => {
  assert.throws(() => getNotificationRecipient(), GoogleWorkspaceConfigError)
  process.env.CONTACT_TO_EMAIL = 'not-an-address'
  assert.throws(() => getNotificationRecipient(), GoogleWorkspaceConfigError)
  process.env.CONTACT_TO_EMAIL = ' inbox@example.com '
  assert.equal(getNotificationRecipient(), 'inbox@example.com')
})

test('an unconfigured recipient makes the contact route answer 503 and send nothing', async () => {
  const response = await contact(contactRequest(visitor()))
  assert.equal(response.status, 503)
  assert.match((await response.json()).error, /not configured/)
  assert.equal(sends, 0)
})

test('an unconfigured recipient refuses a booking before any calendar write or email', async () => {
  const response = await book(bookingRequest(visitor()))
  assert.equal(response.status, 503)
  assert.equal(inserts, 0); assert.equal(sends, 0)
})

test('with a fixture recipient the owner notification goes there and carries the visitor as Reply-To', async () => {
  process.env.CONTACT_TO_EMAIL = 'inbox@example.com'
  const email = visitor()
  assert.equal((await contact(contactRequest(email))).status, 200)
  assert.equal(sends, 2)
  assert.equal(sentTo[0], 'inbox@example.com')
  assert.ok(sentRaw[0].includes(`Reply-To: ${email}`))
  // The acknowledgement goes to the visitor with the public address as Reply-To.
  assert.equal(sentTo[1], email)
  assert.ok(sentRaw[1].includes(`Reply-To: ${site.contactEmail}`))
  assert.ok(sentRaw[0].includes('From: ') && sentRaw[0].includes('sender@example.com'))
})

test('a booking notifies the fixture recipient and invites the guest', async () => {
  process.env.CONTACT_TO_EMAIL = 'inbox@example.com'
  const email = visitor()
  assert.equal((await book(bookingRequest(email))).status, 200)
  assert.equal(inserts, 1); assert.equal(sends, 2)
  assert.deepEqual(sentTo.sort(), [email, 'inbox@example.com'].sort())
  const ownerMail = sentRaw.find(raw => raw.includes('To: inbox@example.com'))
  assert.ok(ownerMail.includes(`Reply-To: ${email}`))
  const guestMail = sentRaw.find(raw => raw.includes(`To: ${email}`))
  assert.ok(guestMail.includes('text/calendar; method=REQUEST'))
})

test('no original service destination survives; only the visible author credit is allowed', () => {
  const forbidden = ['gvasilakopoulos', 'outlook.com', 'wa.me/']
  const hits = []
  const walk = dir => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(ts|tsx|mjs|css)$/.test(entry)) {
        let source = readFileSync(path, 'utf8')
        // A visible, removable attribution link is intentional. Do not exempt
        // the rest of the footer, configuration or any service destination.
        if (path === join(process.cwd(), 'src', 'components', 'layout', 'Footer', 'Footer.tsx')) {
          source = source.replace('href="https://www.gvasilakopoulos.com"', 'href="AUTHOR_CREDIT"')
        }
        for (const needle of forbidden) if (source.includes(needle)) hits.push(`${path}: ${needle}`)
      }
    }
  }
  walk(join(process.cwd(), 'src'))
  assert.deepEqual(hits, [])
})
