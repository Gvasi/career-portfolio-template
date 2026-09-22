import { expect, test, type Page, type Route } from '@playwright/test'
import { AVAILABILITY_TTL_MS } from '../../src/lib/contact/availability'

// Every API call is intercepted: nothing here reaches Google, Cloudflare or Redis.
// Submission cases rely on the development bot-check bypass (no Turnstile site key),
// so they are skipped against a production build.
const production = process.env.PLAYWRIGHT_SERVER === 'production'

function slotDay(url: string) {
  // The calendar requests the visitor's current month; offer slots on its last day, which is never in the past.
  return new URL(url, 'http://localhost').searchParams.get('dateTo')!
}

function payloadFor(url: string, minutes: number, count = 3) {
  const day = slotDay(url)
  const slots = Array.from({ length: count }, (_, index) => {
    const start = new Date(`${day}T10:00:00.000Z`).getTime() + index * minutes * 60_000
    return { time: new Date(start).toISOString(), end: new Date(start + minutes * 60_000).toISOString() }
  })
  return { slots: { [day]: slots }, slotMinutes: minutes }
}

async function mockAvailability(page: Page, handler: (route: Route) => Promise<void> | void) {
  await page.route('**/api/schedule/availability?*', handler)
}

async function chooseFirstSlot(page: Page, url: { current: string }) {
  await expect.poll(() => url.current).not.toBe('')
  const day = Number(slotDay(url.current).slice(-2))
  await page.getByRole('button', { name: new RegExp(`^\\w+day, ${day} `) }).click()
  await page.locator('.contact-times button').first().click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'A few details, then we’re set.' })).toBeVisible()
}

async function fillDetails(page: Page) {
  await page.getByLabel('Your name').fill('Local fixture')
  await page.getByLabel('Email address').fill('fixture@example.com')
}

for (const minutes of [15, 30, 60]) {
  test(`a ${minutes}-minute configuration is shown from the payload and submitted with the server's end instant`, async ({ page }) => {
    test.skip(production, 'Submission needs the development bot-check bypass')
    await page.setViewportSize({ width: 1280, height: 900 })
    const url = { current: '' }
    let payload: ReturnType<typeof payloadFor> | undefined
    await mockAvailability(page, route => { url.current = route.request().url(); payload = payloadFor(url.current, minutes); return route.fulfill({ json: payload }) })
    const bodies: Record<string, unknown>[] = []
    await page.route('**/api/schedule/book', route => { bodies.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true, booking: { meetLink: 'https://meet.google.com/abc-defg-hij', invitationSent: true } } }) })
    await page.goto('/contact')
    await expect(page.getByText(`${minutes}-minute intro`)).toBeVisible()
    await expect(page.getByText(`${minutes} min · Meet`)).toBeVisible()
    await chooseFirstSlot(page, url)
    await expect(page.locator('.contact-form')).toContainText(` · ${minutes} min · `)
    await fillDetails(page)
    await page.getByRole('button', { name: 'Confirm intro' }).click()
    await expect(page.getByRole('heading', { name: 'You’re on the calendar.' })).toBeVisible()
    expect(bodies).toHaveLength(1)
    const offered = payload!.slots[slotDay(url.current)][0]
    expect(bodies[0].start).toBe(offered.time)
    expect(bodies[0].end).toBe(offered.end)
    expect(Date.parse(bodies[0].end as string) - Date.parse(bodies[0].start as string)).toBe(minutes * 60_000)
  })
}

test('while availability is loading the duration number is omitted, then the 30-minute text reads as before', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await mockAvailability(page, async route => { await gate; await route.fulfill({ json: payloadFor(route.request().url(), 30) }) })
  await page.goto('/contact')
  const aside = page.locator('.contact-aside')
  await expect(aside).toContainText('Intro call')
  await expect(aside).not.toContainText('-minute')
  await expect(page.locator('.contact-meeting-meta')).toContainText('Meet')
  await expect(page.locator('.contact-meeting-meta')).not.toContainText('min ·')
  const before = await page.locator('.contact-meeting-meta').boundingBox()
  release()
  await expect(aside).toContainText('30-minute intro')
  await expect(page.locator('.contact-meeting-meta')).toContainText('30 min · Meet')
  const after = await page.locator('.contact-meeting-meta').boundingBox()
  expect(after!.height).toBe(before!.height)
})

test('empty availability offers the next month or a message, never a guessed slot', async ({ page }) => {
  await mockAvailability(page, route => route.fulfill({ json: { slots: {}, slotMinutes: 30 } }))
  await page.goto('/contact')
  await expect(page.getByText('No times this month.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
  expect(await page.locator('.contact-calendar-days button:enabled').count()).toBe(0)
})

test('a malformed payload or a network failure shows the retry and email fallback, and retry recovers', async ({ page }) => {
  let attempt = 0
  await mockAvailability(page, route => {
    attempt += 1
    if (attempt === 1) return route.fulfill({ json: { slots: { '2026-09-30': [{ time: '2026-09-30T10:00:00.000Z' }] } } })
    if (attempt === 2) return route.abort('failed')
    return route.fulfill({ json: payloadFor(route.request().url(), 30) })
  })
  await page.goto('/contact')
  const alert = page.locator('.contact-stage [role="alert"]')
  await expect(alert).toContainText('I couldn’t load the calendar')
  await expect(page.getByRole('button', { name: 'Send a message' })).toBeVisible()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(alert).toContainText('I couldn’t load the calendar')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.contact-calendar-days button:enabled')).toHaveCount(1)
  expect(attempt).toBe(3)
})

test('a 409 returns to the calendar with fresh availability and no stale selection', async ({ page }) => {
  test.skip(production, 'Submission needs the development bot-check bypass')
  await page.setViewportSize({ width: 1280, height: 900 })
  const url = { current: '' }
  let served = 0
  await mockAvailability(page, route => { served += 1; url.current = route.request().url(); return route.fulfill({ json: payloadFor(url.current, 30, served === 1 ? 3 : 2) }) })
  await page.route('**/api/schedule/book', route => route.fulfill({ status: 409, json: { error: 'That time was just taken. Please choose another slot.' } }))
  await page.goto('/contact')
  await chooseFirstSlot(page, url)
  await fillDetails(page)
  await page.getByRole('button', { name: 'Confirm intro' }).click()
  await expect(page.locator('.contact-stage [role="alert"]')).toContainText('That time was just taken')
  await expect(page.getByRole('heading', { name: 'Find a time that works.' })).toBeVisible()
  await expect.poll(() => served).toBe(2)
  await expect(page.locator('.contact-times button')).toHaveCount(2)
  await expect(page.locator('.contact-times button[aria-pressed="true"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
})

test('a double-click sends one request, and an identical retry after a server error reuses the attempt id', async ({ page }) => {
  test.skip(production, 'Submission needs the development bot-check bypass')
  await page.setViewportSize({ width: 1280, height: 900 })
  const url = { current: '' }
  await mockAvailability(page, route => { url.current = route.request().url(); return route.fulfill({ json: payloadFor(url.current, 30) }) })
  const bodies: Record<string, unknown>[] = []
  await page.route('**/api/schedule/book', async route => {
    bodies.push(route.request().postDataJSON())
    await new Promise(resolve => setTimeout(resolve, 300))
    return route.fulfill({ status: 500, json: { error: 'Failed to create the booking.' } })
  })
  await page.goto('/contact')
  await chooseFirstSlot(page, url)
  await fillDetails(page)
  const confirm = page.getByRole('button', { name: 'Confirm intro' })
  await confirm.dblclick()
  await expect(page.locator('.contact-stage [role="alert"]')).toContainText('Failed to create the booking.')
  expect(bodies).toHaveLength(1)
  await confirm.click()
  await expect.poll(() => bodies.length).toBe(2)
  expect(bodies[1].attemptId).toBe(bodies[0].attemptId)
  expect(bodies[1].start).toBe(bodies[0].start)
  // Changing the slot starts a new attempt.
  await page.getByRole('button', { name: 'Change time' }).click()
  await page.locator('.contact-times button').nth(1).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Confirm intro' }).click()
  await expect.poll(() => bodies.length).toBe(3)
  expect(bodies[2].attemptId).not.toBe(bodies[0].attemptId)
  expect(bodies[2].start).not.toBe(bodies[0].start)
})

test('switching to email while availability is loading and back again uses the response, not stale state', async ({ page }) => {
  // Month navigation is disabled while a month loads, so a departed-month response cannot happen through the
  // interface; the reachable race is leaving booking mode mid-request and returning to it.
  await page.setViewportSize({ width: 1280, height: 900 })
  const pending: Array<{ route: Route; url: string }> = []
  await mockAvailability(page, route => { pending.push({ route, url: route.request().url() }) })
  await page.goto('/contact')
  await expect.poll(() => pending.length).toBe(1)
  await page.getByRole('button', { name: 'Send email' }).click()
  await expect(page.getByRole('heading', { name: 'Say hello in your own words.' })).toBeVisible()
  await pending[0].route.fulfill({ json: payloadFor(pending[0].url, 30) })
  await page.getByRole('button', { name: 'Book an intro' }).click()
  await expect(page.locator('.contact-calendar-days button:enabled')).toHaveCount(1)
  await expect(page.getByText('30-minute intro')).toBeVisible()
  expect(pending.length).toBe(1)
})

test('returning to booking refreshes expired availability instead of leaving the calendar loading', async ({ page }) => {
  const now = new Date()
  await page.clock.setFixedTime(now)
  let requests = 0
  await mockAvailability(page, route => {
    requests++
    return route.fulfill({ json: payloadFor(route.request().url(), requests === 1 ? 15 : 60) })
  })
  await page.goto('/contact')
  await expect(page.getByText('15-minute intro')).toBeVisible()
  await page.getByRole('button', { name: 'Send email', exact: true }).click()
  await page.clock.setFixedTime(new Date(now.getTime() + AVAILABILITY_TTL_MS + 1))
  await page.getByRole('button', { name: 'Book an intro', exact: true }).click()
  await expect.poll(() => requests).toBe(2)
  await expect(page.getByText('60-minute intro')).toBeVisible()
  await expect(page.locator('.contact-calendar-days button:enabled')).toHaveCount(1)
})
