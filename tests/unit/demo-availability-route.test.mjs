import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { DateTime } from 'luxon'
import { google } from 'googleapis'
import { GET } from '../../src/app/api/schedule/availability/route.ts'
import { parseAvailabilityPayload } from '../../src/lib/contact/availabilityContract.ts'
import { parseAvailabilityRange } from '../../src/lib/contact/dateRange.ts'

const now = DateTime.fromISO('2026-09-14T09:00:00', { zone: 'Europe/Lisbon' })
const previousDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE

beforeEach(() => {
  process.env.NEXT_PUBLIC_DEMO_MODE = 'true'
  mock.method(Date, 'now', () => now.toMillis())
  mock.method(google, 'calendar', () => { throw new Error('Demo must not call Calendar') })
  mock.method(globalThis, 'fetch', async () => { throw new Error('Demo must not call an external service') })
})

afterEach(() => {
  mock.restoreAll()
  if (previousDemoMode === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE
  else process.env.NEXT_PUBLIC_DEMO_MODE = previousDemoMode
})

function request(from, to) {
  const query = new URLSearchParams({ dateFrom: from, dateTo: to, timeZone: 'Europe/Paris' })
  return GET(new Request(`http://localhost/api/schedule/availability?${query}`))
}

test('the demo route accepts the maximum 62-day range without service credentials', async () => {
  const response = await request('2026-09-14', now.plus({ days: 61 }).toISODate())
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const payload = parseAvailabilityPayload(await response.json())
  const slots = Object.values(payload.slots).flat()
  assert.ok(slots.length > 0 && slots.length <= 62 * 6)
  assert.equal(payload.slotMinutes, 30)
})

for (const [label, from, to, error] of [
  ['missing dates', '', '', /required/],
  ['invalid date', '2026-02-30', '2026-03-01', /Invalid/],
  ['invalid format', '20260914', '2026-09-15', /YYYY-MM-DD/],
  ['timestamp suffix', '2026-09-14T00:00:00Z', '2026-09-15', /YYYY-MM-DD/],
  ['reversed range', '2026-09-16', '2026-09-14', /on or after/],
  ['63 days', '2026-09-14', now.plus({ days: 62 }).toISODate(), /62 days/],
  ['ten years', '2026-09-14', '2036-09-14', /62 days/],
  ['beyond the horizon', now.plus({ days: 181 }).toISODate(), now.plus({ days: 181 }).toISODate(), /180 days ahead/],
]) {
  test(`the demo route rejects ${label} before generating a payload`, async () => {
    const response = await request(from, to)
    assert.equal(response.status, 400)
    assert.match((await response.json()).error, error)
  })
}

test('the horizon includes day 180 and calendar-day counting survives DST', async () => {
  const lastDay = now.plus({ days: 180 }).toISODate()
  assert.equal((await request(lastDay, lastDay)).status, 200)
  for (const timeZone of ['Europe/Paris', 'America/New_York']) {
    assert.doesNotThrow(() => parseAvailabilityRange({
      dateFrom: '2026-10-01', dateTo: '2026-12-01', timeZone, now,
    }))
    assert.throws(() => parseAvailabilityRange({
      dateFrom: '2026-10-01', dateTo: '2026-12-02', timeZone, now,
    }), /62 days/)
  }
})
