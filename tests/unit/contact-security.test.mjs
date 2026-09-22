import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { createMemorySecurityStore, createRedisStore, getSecurityStore, SecurityUnavailableError, securityKey } from '../../src/lib/security/securityStore.ts'
import { coordinateBooking, BookingConflictError, BookingPendingError } from '../../src/lib/google/bookingCoordinator.ts'
import { CalendarUnavailableError, parseFreeBusyCalendar } from '../../src/lib/google/freeBusy.ts'
import { BotVerificationError, verifyTurnstile } from '../../src/lib/security/turnstile.ts'
import { getClientIp } from '../../src/lib/security/requestGuards.ts'

const envKeys = ['NODE_ENV', 'VERCEL', 'VERCEL_ENV', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_ALLOWED_HOSTNAMES', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY']
const original = Object.fromEntries(envKeys.map(key => [key, process.env[key]]))
afterEach(() => { mock.restoreAll(); for (const key of envKeys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key] } })

test('FreeBusy rejects missing, errored and malformed calendars rather than offering free slots', () => {
  for (const value of [null, undefined, {}, { errors: [{ reason: 'notFound' }], busy: [] }, { busy: null }, { busy: [{}] }, { busy: [{ start: 'bad', end: 'bad' }] }, { busy: [{ start: '2026-09-14T10:00:00', end: '2026-09-14T11:00:00' }] }, { busy: [{ start: '2026-09-14T11:00:00Z', end: '2026-09-14T10:00:00Z' }] }]) assert.throws(() => parseFreeBusyCalendar(value), CalendarUnavailableError)
  assert.deepEqual(parseFreeBusyCalendar({ busy: [] }), [])
  const ranges = parseFreeBusyCalendar({ busy: [{ start: '2026-09-14T10:00:00+02:00', end: '2026-09-14T10:30:00+02:00' }] })
  assert.equal(ranges[0].start.toISO(), '2026-09-14T08:00:00.000Z')
})

test('concurrent counters admit only the configured number and keep the original expiry', async () => {
  const store = createMemorySecurityStore()
  const results = await Promise.all(Array.from({ length: 20 }, () => store.consume('limit', 6, 60_000)))
  assert.equal(results.filter(x => x.allowed).length, 6)
  assert.equal(results.at(-1).retryAfterSeconds, 60)
  const now = Date.now(); mock.method(Date, 'now', () => now + 61_000)
  assert.equal((await store.consume('limit', 6, 60_000)).allowed, true)
  assert.ok(!securityKey('email', 'person@example.com').includes('person@example.com'))
})

test('production cannot silently use memory when shared protection is missing', () => {
  process.env.NODE_ENV = 'production'; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN
  assert.throws(() => getSecurityStore(), SecurityUnavailableError)
})

test('Redis errors fail closed, and requests use atomic commands without automatic retries', async () => {
  const calls = []
  mock.method(globalThis, 'fetch', async (_url, options) => { calls.push(JSON.parse(options.body)); return Response.json({ result: calls.at(-1)[0] === 'EVAL' ? [7, 4000] : 'OK' }) })
  const store = createRedisStore('https://redis.example.com', 'test-secret')
  assert.equal(await store.claim('slot', 'claim', 5000), true)
  assert.equal((await store.consume('limit', 6, 60_000)).allowed, false)
  assert.deepEqual(calls[0], ['SET', 'slot', 'claim', 'NX', 'PX', 5000])
  assert.equal(calls[1][0], 'EVAL')
  mock.restoreAll(); mock.method(globalThis, 'fetch', async () => Response.json({ error: 'unavailable' }))
  await assert.rejects(store.get('slot'), SecurityUnavailableError)
})

test('Vercel IP identity ignores a forged Cloudflare header', () => {
  process.env.VERCEL = '1'
  const request = new Request('https://www.example.com/api/contact', { headers: { 'x-forwarded-for': '203.0.113.2', 'cf-connecting-ip': '198.51.100.1' } })
  assert.equal(getClientIp(request), '203.0.113.2')
})

function bookingHarness() {
  const store = createMemorySecurityStore()
  const events = new Map()
  let inserts = 0, notices = 0
  const options = {
    store, slotKey: 'same-slot', fingerprint: 'guest-a-attempt', expiresAt: Date.now() + 86_400_000,
    validate: async () => {},
    insert: async id => { inserts++; const receipt = { id, meetLink: 'https://meet.google.com/test-only', invitationSent: false }; events.set(id, receipt); return receipt },
    notify: async receipt => { notices++; return { ...receipt, invitationSent: true } },
    recover: async id => events.get(id) ?? null,
  }
  return { options, events, counts: () => ({ inserts, notices }) }
}

test('two simultaneous visitors cannot both insert the same slot; retries do not resend', async () => {
  const h = bookingHarness(); let release
  const gate = new Promise(resolve => { release = resolve })
  const first = coordinateBooking({ ...h.options, validate: () => gate })
  await assert.rejects(coordinateBooking({ ...h.options, fingerprint: 'guest-b' }), BookingConflictError)
  release(); const result = await first
  assert.equal(result.invitationSent, true)
  assert.deepEqual(await coordinateBooking(h.options), result)
  assert.deepEqual(h.counts(), { inserts: 1, notices: 1 })
})

test('a Calendar write timeout retains the claim and a retry recovers without a duplicate', async () => {
  const h = bookingHarness()
  await assert.rejects(coordinateBooking({ ...h.options, insert: async id => { await h.options.insert(id); throw new Error('timeout after write') } }), /timeout/)
  const result = await coordinateBooking(h.options)
  assert.equal(result.invitationSent, false)
  assert.deepEqual(h.counts(), { inserts: 1, notices: 0 })
})

test('an uncertain write with no visible event does not release the slot for another insert', async () => {
  const h = bookingHarness()
  await assert.rejects(coordinateBooking({ ...h.options, insert: async () => { throw new Error('timeout') } }))
  await assert.rejects(coordinateBooking(h.options), BookingPendingError)
  await assert.rejects(coordinateBooking({ ...h.options, fingerprint: 'guest-b' }), BookingConflictError)
  assert.equal(h.counts().inserts, 0)
})

test('a pre-write failure releases the claim, while a cancelled completed meeting can be replaced', async () => {
  const h = bookingHarness()
  await assert.rejects(coordinateBooking({ ...h.options, validate: async () => { throw new CalendarUnavailableError() } }))
  const first = await coordinateBooking(h.options)
  h.events.set(first.id, 'cancelled')
  const second = await coordinateBooking({ ...h.options, fingerprint: 'replacement-attempt' })
  assert.notEqual(first.id, second.id)
  assert.deepEqual(h.counts(), { inserts: 2, notices: 2 })
})

test('notification failure never makes a confirmed event retryable as a new booking', async () => {
  const h = bookingHarness()
  const first = await coordinateBooking({ ...h.options, notify: async () => { throw new Error('gmail down') } })
  assert.equal(first.invitationSent, false)
  assert.deepEqual(await coordinateBooking(h.options), first)
  assert.equal(h.counts().inserts, 1)
})

function turnstileEnv() {
  process.env.TURNSTILE_SECRET_KEY = 'test-only-private-key'
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'www.example.com,example.com'
}

test('Turnstile verifies action, hostname and rejects failed or reused tokens', async () => {
  turnstileEnv()
  for (const response of [{ success: false, 'error-codes': ['timeout-or-duplicate'] }, { success: true, action: 'contact', hostname: 'attacker.example' }, { success: true, action: 'booking', hostname: 'www.example.com' }]) {
    mock.method(globalThis, 'fetch', async () => Response.json(response))
    await assert.rejects(verifyTurnstile('dummy-token', 'contact'), BotVerificationError)
    mock.restoreAll()
  }
  mock.method(globalThis, 'fetch', async (_url, options) => {
    const body = JSON.parse(options.body); assert.equal(body.response, 'dummy-token'); assert.ok(body.idempotency_key)
    return Response.json({ success: true, action: 'contact', hostname: 'www.example.com' })
  })
  await verifyTurnstile('dummy-token', 'contact')
})

test('Turnstile missing, oversized tokens and service outages cannot reach side effects', async () => {
  turnstileEnv()
  await assert.rejects(verifyTurnstile('', 'booking'), BotVerificationError)
  await assert.rejects(verifyTurnstile('x'.repeat(2049), 'booking'), BotVerificationError)
  mock.method(globalThis, 'fetch', async () => { throw new Error('offline') })
  await assert.rejects(verifyTurnstile('token', 'booking'), SecurityUnavailableError)
  delete process.env.TURNSTILE_SECRET_KEY; process.env.NODE_ENV = 'production'
  await assert.rejects(verifyTurnstile('token', 'booking'), SecurityUnavailableError)
})
