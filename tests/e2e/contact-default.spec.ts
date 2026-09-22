import { expect, test } from '@playwright/test'
import { site } from '../../src/config/site'

// The starter runs without any service configured. The contact page must then
// offer the working path (direct email) instead of a calendar that cannot load,
// and must not pretend a form can deliver. No route is mocked here: the answer
// comes from the real availability endpoint of the server under test.
for (const width of [375, 1280]) {
  for (const intent of ['', 'hiring', 'startup', 'networking']) {
    test(`unconfigured contact offers direct email at ${width}px for ${intent || 'the default URL'}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1280 ? 800 : 812 })
      const availability = page.waitForResponse(response => response.url().includes('/api/schedule/availability'))
      await page.goto(intent ? `/contact?intent=${intent}` : '/contact')
      const response = await availability
      test.skip(response.status() === 200, 'This server has booking configured; the default-experience check does not apply')
      expect(response.status()).toBe(503)
      expect((await response.json()).reason).toBe('unconfigured')

      const direct = page.locator('[data-contact-direct-email]')
      await expect(direct).toBeVisible()
      await expect(direct.getByRole('heading', { name: 'Say hello by email.' })).toBeVisible()
      await expect(direct.getByRole('link', { name: `Email ${site.contactEmail}` })).toHaveAttribute('href', `mailto:${site.contactEmail}`)
      await expect(page.getByRole('button', { name: 'Book an intro' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Send email' })).toHaveCount(0)
      await expect(page.getByText('I couldn’t load the calendar')).toHaveCount(0)
      const aside = page.locator('main aside')
      if (width === 1280) await expect(aside.getByText(site.location.label)).toBeVisible()
      else await expect(aside.getByText(site.location.label)).toBeHidden()
      await expect(aside.getByText('Google Meet')).toHaveCount(0)
    })
  }
}

test('switching to email while capability is loading still resolves the direct-email fallback', async ({ page }) => {
  let release: () => void = () => {}
  let started = false
  await page.route('**/api/schedule/availability?*', async route => {
    started = true
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ status: 503, json: { reason: 'unconfigured', error: 'Booking is not set up.' } })
  })
  await page.goto('/contact')
  await expect.poll(() => started).toBe(true)
  await page.getByRole('button', { name: 'Send email', exact: true }).click()
  release()
  await expect(page.locator('[data-contact-direct-email]')).toBeVisible()
  await expect(page.locator('form')).toHaveCount(0)
})
