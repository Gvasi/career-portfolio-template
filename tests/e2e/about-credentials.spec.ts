import { expect, test } from '@playwright/test'

// Desktop credentials carousel (sections/about/CredentialsVault). The phone
// wallet is covered by mobile-detail-polish.spec.ts.
const CREDENTIALS = [
  { id: 'data-analytics-certificate', title: 'Data Analytics Certificate', status: 'Sample' },
  { id: 'project-management-certificate', title: 'Project Management Certificate', status: 'Sample' },
  { id: 'business-degree', title: 'Bachelor of Business Administration', status: 'Sample' },
]

test('about credentials carousel shows every record, steps with the controls and opens the index', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about')

  const section = page.locator('[data-credentials-section]')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('heading', { name: 'Learning, with receipts.' })).toBeVisible()

  const showcase = section.getByRole('group', { name: 'Qualifications' })
  await expect(showcase).toHaveAttribute('data-count', String(CREDENTIALS.length))
  for (const credential of CREDENTIALS) {
    const card = showcase.locator(`[data-credential-card="${credential.id}"]`).first()
    await expect(card.locator('[data-credential-title]')).toHaveText(credential.title)
    await expect(card).toContainText(credential.status)
  }
  const selectedTitle = () => showcase.locator('[data-credential-card][data-selected="true"] [data-credential-title]').first()
  await expect(selectedTitle()).toHaveText(CREDENTIALS[0].title)
  await expect(section.locator('[data-credential-details][data-active="true"]')).toContainText(CREDENTIALS[0].title)

  await section.getByRole('button', { name: 'Next certificate' }).click()
  await expect(selectedTitle()).toHaveText(CREDENTIALS[1].title)
  await expect(section.locator('[data-credential-details][data-active="true"]')).toContainText(CREDENTIALS[1].title)
  await expect(section.getByRole('status')).toHaveText(CREDENTIALS[1].title + ' selected')

  await section.getByRole('button', { name: 'Browse all certificates' }).click()
  const index = section.locator('[aria-label="All certificates"]')
  await expect(index.getByRole('button')).toHaveCount(CREDENTIALS.length)
  await index.getByRole('button', { name: 'Choose certificate: ' + CREDENTIALS[2].title }).click()
  await expect(selectedTitle()).toHaveText(CREDENTIALS[2].title)
  await expect(index).toHaveCount(0)
  await expect(section.locator('[data-credential-details][data-active="true"]')).toContainText('Fictional credential')
  await expect(section.getByRole('link', { name: /Verify credential/ })).toHaveCount(0)

  // Keys are ignored while the carousel is still travelling, by design; wait for it to settle.
  await expect(showcase).toHaveAttribute('data-moving', 'false')
  // Selection changes before the carousel finishes its transition.
  await expect(section.getByRole('button', { name: 'Next certificate' })).toBeEnabled()
  await showcase.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(selectedTitle()).toHaveText(CREDENTIALS[1].title)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})
