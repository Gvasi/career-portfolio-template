import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Europe/Paris' })

for (const width of [320, 375, 1280]) {
  test(`contact feedback preserves booking space and progress at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 812 })
    await page.clock.install({ time: new Date('2026-09-13T10:00:00Z') })
    await page.route('**/api/schedule/availability?*', route => route.fulfill({ json: {
      slots: { '2026-09-14': [{ time: '2026-09-14T17:00:00.000Z', end: '2026-09-14T17:30:00.000Z' }] },
      slotMinutes: 30,
    } }))
    // This is a layout/progression check; it must never send a real request.
    await page.route('**/api/schedule/book', route => route.abort())
    await page.route('**/api/contact', route => route.abort())
    await page.goto('/contact')
    const aside = page.locator('.contact-aside')
    const controls = page.locator('.contact-controls')
    const height = (await aside.boundingBox())!.height
    const top = (await controls.boundingBox())!.y
    const response = page.locator(width < 1024 ? '.contact-mobile-response [role="status"]' : '.hello-machine [role="status"]')
    if (width >= 1024) {
      await expect(page.getByRole('list', { name: 'Conversation progress' })).toBeVisible()
      await expect(page.locator('.hello-note-index [aria-current="step"]')).toHaveAttribute('aria-label', 'Getting started, current stage')
      await expect(page.locator('.hello-note-index [data-complete="true"]')).toHaveCount(0)
    }

    for (const [topic, copy] of [['Ideas', 'What if we'], ['Hello', 'One small hello'], ['Work', 'A role worth talking about']]) {
      await page.getByRole('button', { name: topic, exact: true }).click()
      await expect(response).toContainText(copy)
      expect(Math.abs((await aside.boundingBox())!.height - height)).toBeLessThan(1)
      expect(Math.abs((await controls.boundingBox())!.y - top)).toBeLessThan(1)
    }
    if (width < 1024) expect(height).toBeLessThanOrEqual(93)
    await page.getByRole('button', { name: 'Monday, 14 September 2026', exact: true }).click()
    await page.getByRole('button', { name: '19:00', exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'A few details, then we’re set.' })).toBeVisible()
    await expect(response).toContainText('The role. The real context.')
    if (width >= 1024) {
      await expect(page.locator('.hello-note-index [aria-current="step"]')).toHaveAttribute('aria-label', 'Your details, current stage')
      await expect(page.locator('.hello-note-index [data-complete="true"]')).toHaveCount(1)
    }
    await expect(page.getByRole('button', { name: 'Confirm intro', exact: true })).toBeVisible()
    expect(Math.abs((await aside.boundingBox())!.height - height)).toBeLessThan(1)

    await page.getByRole('button', { name: 'Change time', exact: true }).click()
    await expect(response).toContainText('A role worth talking about')
    if (width >= 1024) await expect(page.locator('.hello-note-index [data-complete="true"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '19:00', exact: true })).toHaveAttribute('aria-pressed', 'true')
    if (width < 640) {
      await page.getByRole('button', { name: 'Change date', exact: true }).click()
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
      await expect(page.getByRole('button', { name: '19:00', exact: true })).toBeVisible()
      await expect(page.getByLabel('Your name', { exact: true })).toHaveCount(0)
    }

    await page.getByRole('button', { name: 'Send email', exact: true }).click()
    await page.getByLabel('Your name', { exact: true }).fill('Layout review')
    await expect(response).toContainText('The role. The real context.')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Hello', exact: true }).click()
    await expect(response).toContainText(width < 1024 ? 'No perfect opener needed.' : 'No perfect opener. Just be yourself.')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  })
}
