import { expect, test } from '@playwright/test'

// InteractiveDialog is the native <dialog> used by the toolkit explorer and the
// project viewer: focus moves in, Tab stays inside, Escape and the backdrop
// close it, and focus plus body scrolling come back afterwards.

test('toolkit dialog: focus entry, tab containment, Escape, backdrop, focus and scroll restoration', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const open = page.getByRole('button', { name: 'Explore toolkit' })
  await open.scrollIntoViewIfNeeded()
  await open.click()
  const dialog = page.locator('dialog.toolkit-dialog')
  await expect(dialog).toHaveJSProperty('open', true)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true)
  // Tab from the last control wraps to the first, and Shift+Tab from the first wraps to the last.
  const controls = await dialog.evaluate(element => Array.from(element.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(control => control.getClientRects().length > 0 && !control.closest('[inert]')).length)
  expect(controls).toBeGreaterThan(2)
  for (let i = 0; i < controls + 2; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true)
  }
  await page.keyboard.press('Shift+Tab')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(open).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  // Backdrop click closes as well.
  await open.click()
  await expect(dialog).toHaveJSProperty('open', true)
  await page.mouse.click(8, 8)
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  await expect(open).toBeFocused()
  expect(errors).toEqual([])
})

test('unmounting the page while the dialog is still closing restores scrolling without errors', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const open = page.getByRole('button', { name: 'Explore toolkit' })
  await open.scrollIntoViewIfNeeded()
  await open.click()
  await expect(page.locator('dialog.toolkit-dialog')).toHaveJSProperty('open', true)
  // Start the 180 ms close, then leave the route before it finishes.
  await page.keyboard.press('Escape')
  await page.evaluate(() => { const link = document.querySelector<HTMLAnchorElement>('header a[href="/about"]'); link?.click() })
  await expect(page).toHaveURL(/\/about$/)
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  expect(await page.locator('dialog.interactive-dialog').count()).toBe(0)
  expect(errors).toEqual([])
})

test('project dialog: previous/next navigation keeps focus inside and Escape restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const open = page.getByRole('button', { name: /Explore the build/ }).first()
  await open.scrollIntoViewIfNeeded()
  await open.click()
  const dialog = page.locator('dialog.project-dialog')
  await expect(dialog).toHaveJSProperty('open', true)
  await expect(page.getByRole('heading', { name: /Opening project|./ }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Next project' }).click()
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true)
  await page.getByRole('button', { name: 'Previous project' }).click()
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(open).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})
