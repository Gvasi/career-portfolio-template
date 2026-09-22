import { expect, test, type Page } from '@playwright/test'

// Consent persistence and the preference controls, on the local build. The
// analytics SDK itself is gated on the production origin, so nothing here can
// show an eligible SDK starting or stopping; only the stored choice and the UI.
const CONSENT_KEY = 'gv.analytics-consent.v1'
const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000

const storedConsent = (page: Page) => page.evaluate(key => {
  const raw = localStorage.getItem(key)
  return raw ? (JSON.parse(raw) as { choice: string; at: number }) : null
}, CONSENT_KEY)

async function expectStored(page: Page, choice: 'accepted' | 'declined', notBefore: number) {
  await expect.poll(() => storedConsent(page).then(value => value?.choice ?? null)).toBe(choice)
  const value = (await storedConsent(page))!
  expect(Number.isFinite(value.at)).toBe(true)
  expect(value.at).toBeGreaterThanOrEqual(notBefore)
  expect(value.at).toBeLessThanOrEqual(Date.now() + 60_000)
  expect(Date.now() - value.at).toBeLessThan(CONSENT_MAX_AGE)
}

test('first visit on Home: Decline persists, hides the banner, and survives a reload', async ({ page }) => {
  await page.goto('/')
  expect(await storedConsent(page)).toBeNull()
  const panel = page.locator('[data-analytics-panel]')
  await expect(panel).toBeVisible()
  const decline = panel.getByRole('button', { name: 'Decline', exact: true })
  await expect(decline).toBeVisible()
  await expect(decline).toBeEnabled()
  const before = Date.now() - 5_000
  await decline.click()
  await expectStored(page, 'declined', before)
  await expect(panel).toBeHidden()
  await page.reload()
  await expect(page.locator('[data-analytics-panel]')).toHaveCount(0)
  await expectStored(page, 'declined', before)
  expect(await page.evaluate(() => document.documentElement.dataset.gvAnalyticsConsent)).toBe('saved')
})

test('Privacy page: the Cookie preferences dialog accepts, then revokes, and the revocation survives a reload', async ({ page }) => {
  await page.goto('/privacy')
  // Privacy provides its own entry point instead of the first-visit banner.
  await expect(page.locator('[data-analytics-panel]')).toHaveCount(0)
  const open = page.getByRole('button', { name: 'Cookie preferences', exact: true })
  await open.click()
  const dialog = page.getByRole('dialog', { name: 'Cookie preferences' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('status')).toHaveText('Optional cookies are off.')

  const beforeAccept = Date.now() - 5_000
  await dialog.getByRole('button', { name: 'Accept', exact: true }).click()
  await expectStored(page, 'accepted', beforeAccept)
  await expect(dialog).toBeHidden()

  await open.click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('status')).toHaveText('Optional cookies are on.')
  const beforeDecline = Date.now() - 5_000
  await dialog.getByRole('button', { name: 'Decline', exact: true }).click()
  await expectStored(page, 'declined', beforeDecline)
  await expect(dialog).toBeHidden()

  await page.reload()
  await expectStored(page, 'declined', beforeDecline)
  await open.click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('status')).toHaveText('Optional cookies are off.')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect(await storedConsent(page)).toMatchObject({ choice: 'declined' })
})
