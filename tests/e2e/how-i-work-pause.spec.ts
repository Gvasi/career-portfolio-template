import { expect, test, type Page } from '@playwright/test'

// Desktop How I Work rotates every 11.2 s unless the reader hovers the panel,
// keeps keyboard focus inside, or has chosen a step. Hover and focus are
// independent: the mouse leaving must not resume rotation while focus stays.
const DWELL = 11_200

async function settle(page: Page) {
  for (let i = 0; i < 2; i++) await page.evaluate(() => new Promise(resolve => { const channel = new MessageChannel(); channel.port1.onmessage = () => resolve(0); channel.port2.postMessage(0) }))
}

async function openSection(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.clock.install()
  await page.goto('/')
  await page.clock.pauseAt(new Date(Date.now() + 200))
  const section = page.locator('#how-i-work')
  await section.evaluate(element => element.scrollIntoView({ block: 'start' }))
  // The rotation timer only exists once the section's IntersectionObserver has
  // reported it on screen. That report arrives in a rendering step the paused
  // clock does not control, so wait for the same intersection through an
  // observer on the same element before advancing the clock.
  await section.evaluate(element => new Promise<void>(resolve => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); resolve() }
    }, { threshold: 0.05 })
    observer.observe(element)
  }))
  await settle(page)
  const tabs = section.locator('button[aria-pressed]')
  await expect(tabs.first()).toHaveAttribute('aria-pressed', 'true')
  return { section, tabs }
}

const activeTab = (tabs: ReturnType<Page['locator']>) => tabs.evaluateAll(buttons => buttons.findIndex(button => button.getAttribute('aria-pressed') === 'true'))

test('rotation advances after the dwell when nothing holds it', async ({ page }) => {
  const { tabs } = await openSection(page)
  await settle(page)
  await page.clock.runFor(DWELL + 100)
  await expect.poll(() => activeTab(tabs)).toBe(1)
})

test('mouse leaving the panel does not resume rotation while keyboard focus remains inside', async ({ page }) => {
  const { section, tabs } = await openSection(page)
  // Keyboard focus lands on the first step tab.
  await tabs.first().focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(tabs.first()).toBeFocused()
  const panel = section.locator('[data-how-desktop-quote]')
  const box = (await panel.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 2)
  await page.mouse.move(box.x - 200, box.y - 200)
  await page.mouse.move(box.x - 210, box.y - 205)
  await expect(tabs.first()).toBeFocused()
  await settle(page)
  await page.clock.runFor(DWELL * 2)
  expect(await activeTab(tabs)).toBe(0)
})

test('hover alone pauses, and leaving without focus lets rotation continue', async ({ page }) => {
  const { section, tabs } = await openSection(page)
  const panel = section.locator('[data-how-desktop-quote]')
  const box = (await panel.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 2)
  await settle(page)
  await page.clock.runFor(DWELL * 2)
  expect(await activeTab(tabs)).toBe(0)
  await page.mouse.move(box.x - 200, box.y - 200)
  await page.mouse.move(box.x - 210, box.y - 205)
  await settle(page)
  await page.clock.runFor(DWELL + 100)
  await expect.poll(() => activeTab(tabs)).toBe(1)
})

test('a manual selection holds for the visit, and the mobile card handles cancelled touches', async ({ page }) => {
  const { tabs } = await openSection(page)
  await tabs.nth(2).click()
  await expect(tabs.nth(2)).toHaveAttribute('aria-pressed', 'true')
  await settle(page)
  await page.clock.runFor(DWELL * 2)
  expect(await activeTab(tabs)).toBe(2)
  await page.setViewportSize({ width: 375, height: 812 })
  const card = page.locator('[data-how-mobile-card]')
  await card.scrollIntoViewIfNeeded()
  // touchstart with no touches, a cancel, and a swipe ending without a start must not throw or select.
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await card.evaluate(element => {
    element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [] }))
    element.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true }))
    element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [] }))
  })
  await page.waitForTimeout(200)
  expect(errors).toEqual([])
})
