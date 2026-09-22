import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { availabilityUrl, AVAILABILITY_TTL_MS, cachedAvailability, invalidateAvailability, loadAvailability } from '../../src/lib/contact/availability.ts'

const url = availabilityUrl(new Date(2026, 8, 1), 'Europe/Paris')
const slots = { '2026-09-14': [{ time: '2026-09-14T16:30:00.000Z', end: '2026-09-14T17:00:00.000Z' }] }
const payload = { slots, slotMinutes: 30 }
const empty = { slots: {}, slotMinutes: 30 }
beforeEach(() => invalidateAvailability())
afterEach(() => { mock.restoreAll(); invalidateAvailability() })

test('month boundaries and viewer timezone stay in the cache key', () => {
  const query = new URL(url, 'http://localhost').searchParams
  assert.equal(query.get('dateFrom'), '2026-09-01')
  assert.equal(query.get('dateTo'), '2026-09-30')
  assert.equal(query.get('timeZone'), 'Europe/Paris')
  assert.notEqual(url, availabilityUrl(new Date(2026, 8, 1), 'America/New_York'))
  assert.match(availabilityUrl(new Date(2028, 1, 1), 'UTC'), /dateTo=2028-02-29/)
})

test('preload and page share one pending request; mode return uses fresh data', async () => {
  let complete
  const fetch = mock.method(globalThis, 'fetch', () => new Promise(resolve => { complete = resolve }))
  const preload = loadAvailability(url)
  const page = loadAvailability(url)
  assert.equal(preload, page)
  complete(Response.json(payload))
  assert.deepEqual(await page, payload)
  assert.deepEqual(await loadAvailability(url), payload)
  assert.equal(fetch.mock.callCount(), 1)
})

test('expired slots are fetched again, including valid empty calendars', async () => {
  let now = 100_000
  mock.method(Date, 'now', () => now)
  const fetch = mock.method(globalThis, 'fetch', async () => Response.json(empty))
  await loadAvailability(url)
  assert.deepEqual(cachedAvailability(url), empty)
  now += AVAILABILITY_TTL_MS
  assert.equal(cachedAvailability(url), undefined)
  await loadAvailability(url)
  assert.equal(fetch.mock.callCount(), 2)
})

test('failed requests do not become an empty-calendar success or block retry', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }))
  await assert.rejects(loadAvailability(url))
  assert.equal(cachedAvailability(url), undefined)
  fetch.mock.mockImplementation(async () => Response.json(payload))
  assert.deepEqual(await loadAvailability(url), payload)
})

test('malformed or incoherent payloads are rejected, never cached as an empty calendar', async () => {
  const malformed = [
    { slots },
    { slots: [], slotMinutes: 30 },
    { slots: { '2026-09-14': { time: '2026-09-14T16:30:00.000Z', end: '2026-09-14T17:00:00.000Z' } }, slotMinutes: 30 },
    { slots: { '2026-09-14': [{ time: '2026-09-14T16:30:00.000Z' }] }, slotMinutes: 30 },
    { slots: { '2026-09-14': [{ time: 'not a date', end: '2026-09-14T17:00:00.000Z' }] }, slotMinutes: 30 },
    { slots: { '2026-09-14': [{ time: '2026-09-14T17:00:00.000Z', end: '2026-09-14T16:30:00.000Z' }] }, slotMinutes: 30 },
    { slots, slotMinutes: 45 },
    { slots, slotMinutes: 0 },
    { slots, slotMinutes: '30' },
    'not json shaped',
    null,
  ]
  for (const body of malformed) {
    mock.method(globalThis, 'fetch', async () => Response.json(body))
    await assert.rejects(loadAvailability(url), /Invalid availability response/, JSON.stringify(body))
    assert.equal(cachedAvailability(url), undefined)
    mock.restoreAll()
  }
  for (const minutes of [15, 30, 60]) {
    const end = new Date(Date.parse('2026-09-14T16:30:00.000Z') + minutes * 60_000).toISOString()
    const body = { slots: { '2026-09-14': [{ time: '2026-09-14T16:30:00.000Z', end }] }, slotMinutes: minutes }
    mock.method(globalThis, 'fetch', async () => Response.json(body))
    invalidateAvailability()
    assert.deepEqual(await loadAvailability(url), body)
    mock.restoreAll()
  }
})

test('a late pre-booking response cannot overwrite availability after invalidation', async () => {
  const completions = []
  mock.method(globalThis, 'fetch', () => new Promise(resolve => completions.push(resolve)))
  const older = loadAvailability(url)
  invalidateAvailability()
  const newer = loadAvailability(url)
  completions[0](Response.json(payload))
  await older
  assert.equal(cachedAvailability(url), undefined)
  assert.equal(loadAvailability(url), newer)
  completions[1](Response.json(empty))
  await newer
  assert.deepEqual(cachedAvailability(url), empty)
})

test('the browser cache stays bounded when browsing many months', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json(payload))
  const months = Array.from({ length: 7 }, (_, index) => availabilityUrl(new Date(2026, 8 + index, 1), 'UTC'))
  for (const month of months) await loadAvailability(month)
  assert.equal(cachedAvailability(months[0]), undefined)
  assert.deepEqual(cachedAvailability(months[6]), payload)
})
