import assert from 'node:assert/strict'
import { beforeEach, afterEach, mock, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { POST as contact } from '../../src/app/api/contact/route.ts'
import { POST as book } from '../../src/app/api/schedule/book/route.ts'
import { GET as availability } from '../../src/app/api/schedule/availability/route.ts'

const before = { ...process.env }
const sensitive = 'visitor@example.com secret-token private-message provider-response'
let logged
beforeEach(() => {
  process.env.NODE_ENV = 'test'
  for (const key of ['VERCEL', 'NEXT_PUBLIC_DEMO_MODE', 'TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) delete process.env[key]
  Object.assign(process.env, {
    GOOGLE_WORKSPACE_CLIENT_ID: 'test-client', GOOGLE_WORKSPACE_CLIENT_SECRET: 'test-secret', GOOGLE_WORKSPACE_REFRESH_TOKEN: 'test-refresh',
    GOOGLE_WORKSPACE_CALENDAR_ID: 'fixture-calendar', GOOGLE_WORKSPACE_TIMEZONE: 'UTC', CONTACT_TO_EMAIL: 'owner@example.com',
    GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL: 'owner@example.com',
  })
  logged = []
  mock.method(console, 'error', (...args) => logged.push(args))
  // Fail before any network call; provider exceptions deliberately contain private values.
  mock.method(google, 'gmail', () => { throw new Error(sensitive) })
  mock.method(google, 'calendar', () => { throw new Error(sensitive) })
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network call') })
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
  Object.assign(process.env, before)
})

function post(path, body) {
  return new Request(`http://localhost/api/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-ID': sensitive }, body: JSON.stringify(body),
  })
}
const contactBody = { name: 'Private visitor', email: 'visitor@example.com', message: sensitive }

async function assertFailure(response, route, phase, publicMessage) {
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: publicMessage })
  const requestId = response.headers.get('x-request-id')
  assert.match(requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.deepEqual(logged, [['Unexpected API failure', { requestId, route, phase }]])
  assert.doesNotMatch(JSON.stringify(logged), /visitor@|secret-token|private-message|provider-response|Private visitor/)
  return requestId
}

test('contact failure exposes only a generated correlation ID and code-owned phase', async () => {
  const firstId = await assertFailure(await contact(post('contact', contactBody)), 'contact', 'message_delivery', 'Failed to process your message. Please try again.')
  logged.length = 0
  const secondId = await assertFailure(await contact(post('contact', contactBody)), 'contact', 'message_delivery', 'Failed to process your message. Please try again.')
  assert.notEqual(firstId, secondId)
})

test('booking provider failure preserves the generic response and excludes visitor data', async () => {
  const response = await book(post('schedule/book', {
    start: '2030-01-01T10:00:00Z', end: '2030-01-01T10:30:00Z', name: 'Private visitor', email: 'visitor@example.com', notes: sensitive, attemptId: randomUUID(),
  }))
  await assertFailure(response, 'schedule_book', 'booking_creation', 'Failed to create the booking.')
})

test('availability provider failure logs no query parameters or provider exception', async () => {
  const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  const response = await availability(new Request(`http://localhost/api/schedule/availability?dateFrom=${date}&dateTo=${date}&timeZone=UTC&private=${encodeURIComponent(sensitive)}`, { headers: { 'X-Request-ID': sensitive } }))
  await assertFailure(response, 'schedule_availability', 'availability_lookup', 'Failed to fetch availability.')
})

test('unexpected body-stream failures are distinguished from delivery failures', async () => {
  const body = new ReadableStream({ start(controller) { controller.error(new Error(sensitive)) } })
  const request = new Request('http://localhost/api/contact', { method: 'POST', body, duplex: 'half' })
  await assertFailure(await contact(request), 'contact', 'request_processing', 'Failed to process your message. Please try again.')
})

test('expected validation failures do not create unexpected-error diagnostics', async () => {
  const response = await contact(post('contact', {}))
  assert.equal(response.status, 400)
  assert.equal(response.headers.get('x-request-id'), null)
  assert.deepEqual(logged, [])
})
