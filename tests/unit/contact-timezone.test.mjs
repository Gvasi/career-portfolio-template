import assert from 'node:assert/strict'
import { test, afterEach } from 'node:test'
import { DateTime } from 'luxon'
import { formatSlotTime, formatVisitorTimeZone } from '../../src/lib/contact/timeZone.ts'
import { buildAvailabilitySlots } from '../../src/lib/google/workspace.ts'

const before = { ...process.env }
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
  Object.assign(process.env, before)
})

test('the same instant reads 18:00 in Greece and 17:00 in Spain in summer and winter', () => {
  for (const [date, offset] of [['2027-01-11', 'GMT+2'], ['2027-07-11', 'GMT+3']]) {
    const instant = DateTime.fromISO(`${date}T18:00`, { zone: 'Europe/Athens' }).toUTC().toISO()
    assert.equal(formatSlotTime(instant, 'Europe/Athens'), '18:00')
    assert.equal(formatSlotTime(instant, 'Europe/Madrid'), '17:00')
    assert.equal(formatVisitorTimeZone('Europe/Athens', instant), `Europe/Athens · ${offset}`)
  }
})

test('the timezone offset follows the appointment date across daylight saving', () => {
  assert.equal(formatVisitorTimeZone('Europe/Athens', '2027-03-27T16:00:00Z'), 'Europe/Athens · GMT+2')
  assert.equal(formatVisitorTimeZone('Europe/Athens', '2027-03-28T15:00:00Z'), 'Europe/Athens · GMT+3')
})

test('availability groups a Spain evening slot under the visitor’s next calendar day', () => {
  Object.assign(process.env, {
    GOOGLE_WORKSPACE_TIMEZONE: 'Europe/Madrid', GOOGLE_WORKSPACE_MIN_NOTICE_HOURS: '0',
    GOOGLE_WORKSPACE_DAY_WINDOWS: '1=23:00-23:30|2=23:00-23:30|3=23:00-23:30|4=23:00-23:30|5=23:00-23:30|6=23:00-23:30|7=23:00-23:30',
  })
  const day = DateTime.now().setZone('Europe/Madrid').plus({ days: 3 }).startOf('day')
  const nextDay = day.plus({ days: 1 }).toISODate()
  const result = buildAvailabilitySlots({ dateFrom: nextDay, dateTo: nextDay, viewerTimeZone: 'Europe/Athens', busyRanges: [] })
  assert.deepEqual(Object.keys(result), [nextDay])
  assert.equal(result[nextDay].length, 1)
  assert.equal(formatSlotTime(result[nextDay][0].time, 'Europe/Athens'), '00:00')
  assert.equal(DateTime.fromISO(result[nextDay][0].time).setZone('Europe/Madrid').toISODate(), day.toISODate())
})
