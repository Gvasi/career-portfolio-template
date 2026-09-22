import { expect, test } from '@playwright/test'

// The phone navigation dialog (layout/Header/MobileMenu) at a phone viewport in
// Chromium. Focus containment and Escape handling are covered by the release
// matrix evidence; this spec keeps the links themselves under test.

test('mobile menu lists Home and About, links to contact, and Home works from a subpage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/about', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /open menu/i }).click()

  const menu = page.getByRole('dialog', { name: 'Navigation menu' })
  await expect(menu).toBeVisible()

  const visibleNavLabels = await menu.locator('nav[aria-label="Main navigation"] a').evaluateAll(links =>
    links.filter(link => { const rect = link.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 }).map(link => link.textContent?.trim()))
  expect(visibleNavLabels).toEqual(['Home', 'About'])
  await expect(menu.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page')
  await expect(menu.getByRole('link', { name: 'Let’s connect' })).toHaveAttribute('href', '/contact')
  await expect(menu.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href', '/')
  await expect(menu.getByRole('link', { name: /Let’s connect/ })).toHaveCount(1)

  await menu.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(menu).toBeHidden()
})
