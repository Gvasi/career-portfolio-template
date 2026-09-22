import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DateTime } from 'luxon'
import { parseAvailabilityPayload } from '../../src/lib/contact/availabilityContract.ts'
import { demoAvailability, demoBookingReceipt, isDemoMode } from '../../src/lib/demo.ts'

const now = DateTime.fromISO('2026-09-14T09:00:00', { zone: 'Europe/Lisbon' }) // a Monday

test('demo mode is off unless the public flag says true', () => {
  delete process.env.NEXT_PUBLIC_DEMO_MODE
  assert.equal(isDemoMode(), false)
  process.env.NEXT_PUBLIC_DEMO_MODE = 'true'
  assert.equal(isDemoMode(), true)
  delete process.env.NEXT_PUBLIC_DEMO_MODE
})

test('demo availability offers weekday slots from tomorrow, keyed by the viewer day, in the real payload shape', () => {
  const payload = demoAvailability('2026-09-14', '2026-09-20', 'Europe/Athens', 30, now)
  assert.equal(payload.demo, true)
  assert.equal(payload.slotMinutes, 30)
  const parsed = parseAvailabilityPayload(payload)
  const days = Object.keys(parsed.slots).sort()
  // Monday is within 24 hours, so it is skipped; Saturday and Sunday are never offered.
  assert.deepEqual(days, ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'])
  for (const day of days) {
    assert.equal(parsed.slots[day].length, 6)
    for (const slot of parsed.slots[day]) {
      assert.equal(Date.parse(slot.end) - Date.parse(slot.time), 30 * 60_000)
      assert.equal(DateTime.fromISO(slot.time).setZone('Europe/Athens').toISODate(), day)
    }
  }
})

test('demo availability falls back to UTC for an unknown time zone but rejects an invalid range', () => {
  const payload = demoAvailability('2026-09-14', '2026-09-16', 'Mars/Olympus', 30, now)
  assert.ok(Object.keys(payload.slots).length > 0)
  assert.throws(() => demoAvailability('nonsense', '2026-09-16', null, 30, now), /YYYY-MM-DD/)
})

test('a demo booking receipt looks like a real one with nothing behind it', () => {
  const receipt = demoBookingReceipt()
  assert.match(receipt.id, /^demo-/)
  assert.equal(receipt.meetLink, null)
  assert.equal(receipt.invitationSent, false)
})
