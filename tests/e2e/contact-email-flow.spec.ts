import { expect, test } from '@playwright/test'
import { site } from '../../src/config/site'

// The email lane, with /api/contact intercepted. Submission relies on the
// development bot-check bypass, so these are skipped against a production build.
const production = process.env.PLAYWRIGHT_SERVER === 'production'

test('email submission succeeds, resets, and the mode switch is locked while a request is in flight', async ({ page }) => {
  test.skip(production, 'Submission needs the development bot-check bypass')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.route('**/api/schedule/availability?*', route => route.fulfill({ json: { slots: {}, slotMinutes: 30 } }))
  const bodies: Record<string, unknown>[] = []
  let release: () => void = () => {}
  await page.route('**/api/contact', async route => {
    bodies.push(route.request().postDataJSON())
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ json: { success: true, message: 'Message sent successfully' } })
  })
  await page.goto('/contact?intent=hiring')
  // An intent in the URL preselects the topic and opens the email lane.
  await expect(page.getByRole('button', { name: 'Send email' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Work' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('Your name').fill('Local fixture')
  await page.getByLabel('Email address').fill('fixture@example.com')
  await page.getByLabel('Your message').fill('Local only')
  const send = page.getByRole('button', { name: 'Send message' })
  await send.click()
  await expect(page.getByRole('button', { name: 'Sending…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Book an intro' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Send email' })).toBeDisabled()
  await page.keyboard.press('Enter')
  expect(bodies).toHaveLength(1)
  expect(bodies[0]).toMatchObject({ name: 'Local fixture', email: 'fixture@example.com', message: 'Local only', subject: 'Hiring' })
  release()
  await expect(page.getByRole('heading', { name: 'Message received.' })).toBeVisible()
  await page.getByRole('button', { name: 'Write another message' }).click()
  await expect(page.getByRole('heading', { name: 'Say hello in your own words.' })).toBeVisible()
  await expect(page.getByLabel('Your message')).toHaveValue('')
  expect(bodies).toHaveLength(1)
})

test('email submission failure shows the server message with the direct email fallback', async ({ page }) => {
  test.skip(production, 'Submission needs the development bot-check bypass')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.route('**/api/schedule/availability?*', route => route.fulfill({ json: { slots: {}, slotMinutes: 30 } }))
  await page.route('**/api/contact', route => route.fulfill({ status: 503, json: { error: 'Message delivery is not configured yet. Please use the email link or social channels for now.' } }))
  await page.goto('/contact')
  await page.getByRole('button', { name: 'Send email' }).click()
  await page.getByLabel('Your name').fill('Local fixture')
  await page.getByLabel('Email address').fill('fixture@example.com')
  await page.getByLabel('Your message').fill('Local only')
  await page.getByRole('button', { name: 'Send message' }).click()
  const alert = page.locator('.contact-stage [role="alert"]')
  await expect(alert).toContainText('Message delivery is not configured yet')
  await expect(alert.getByRole('link', { name: 'Email me directly' })).toHaveAttribute('href', `mailto:${site.contactEmail}`)
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled()
})
