import { expect, test } from '@playwright/test'

const ORDER = ['this-portfolio', 'research-dashboard', 'retention-signals']

async function reelCentre(page: import('@playwright/test').Page) {
  const reel = page.getByRole('group', { name: 'Project reel', exact: true })
  await reel.scrollIntoViewIfNeeded()
  // Smooth scrolling may still be travelling; wait until the page has held still.
  await page.waitForFunction(() => new Promise<boolean>(resolve => { const y = scrollY; setTimeout(() => resolve(scrollY === y), 120) }))
  const box = (await reel.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  return reel
}

test('desktop wheel notches step the reel continuously, one project per notch', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const stage = page.locator('[data-project-stage]')
  await reelCentre(page)
  await page.clock.install()
  const start = ORDER.indexOf((await stage.getAttribute('data-active'))!)
  await page.mouse.wheel(0, 100)
  await page.clock.runFor(50)
  await page.mouse.wheel(0, 100)
  await expect(stage).toHaveAttribute('data-active', ORDER[(start + 2) % 3])
  await page.clock.runFor(50)
  await page.mouse.wheel(0, -100)
  await expect(stage).toHaveAttribute('data-active', ORDER[(start + 1) % 3])
})

test('a fast burst of notches keeps the reel bounded and the page responsive', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const stage = page.locator('[data-project-stage]')
  await reelCentre(page)
  const before = await page.evaluate(() => window.scrollY)
  await page.clock.install()
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 100); await page.clock.runFor(8) }
  expect(await page.locator('article[data-project-slot]').count()).toBeLessThanOrEqual(17)
  expect(ORDER).toContain(await stage.getAttribute('data-active'))
  expect(await page.evaluate(() => window.scrollY)).toBe(before)
  await page.clock.runFor(2000)
  await expect(page.getByRole('group', { name: 'Project reel', exact: true })).toHaveAttribute('data-moving', 'false')
})

test('phone viewports leave the wheel to the page', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const stage = page.locator('[data-project-stage]')
  await reelCentre(page)
  const active = await stage.getAttribute('data-active')
  const y = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 100)
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y)
  await expect(stage).toHaveAttribute('data-active', active!)
})

test('a notch during an unfinished move retargets at once, and arrows chain the same way', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const stage = page.locator('[data-project-stage]')
  const reel = await reelCentre(page)
  const start = ORDER.indexOf((await stage.getAttribute('data-active'))!)
  await page.mouse.wheel(0, 100)
  await expect(reel).toHaveAttribute('data-moving', 'true')
  // The previous travel takes ~0.7 s; the next notch lands well inside it and must not wait.
  await page.mouse.wheel(0, 100)
  await expect(stage).toHaveAttribute('data-active', ORDER[(start + 2) % 3], { timeout: 300 })
  await expect(reel).toHaveAttribute('data-moving', 'false')
  await reel.focus()
  await page.keyboard.press('ArrowDown')
  await expect(reel).toHaveAttribute('data-moving', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(stage).toHaveAttribute('data-active', ORDER[(start + 4) % 3], { timeout: 300 })
  await page.keyboard.press('ArrowUp')
  await expect(stage).toHaveAttribute('data-active', ORDER[(start + 3) % 3], { timeout: 300 })
  await expect(reel).toHaveAttribute('data-moving', 'false')
})

test('modifier and horizontal wheels over the reel are left to the browser', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const stage = page.locator('[data-project-stage]')
  await reelCentre(page)
  const active = (await stage.getAttribute('data-active'))!
  await page.keyboard.down('Shift')
  await page.mouse.wheel(0, 100)
  await page.keyboard.up('Shift')
  await page.mouse.wheel(120, 10)
  await page.waitForTimeout(300)
  await expect(stage).toHaveAttribute('data-active', active)
})

test('phone swipes step the reel, taps and vertical drags do not', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const stage = page.locator('[data-project-stage]')
  const reel = page.getByRole('group', { name: 'Project reel', exact: true })
  await reel.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => new Promise<boolean>(resolve => { const y = scrollY; setTimeout(() => resolve(scrollY === y), 120) }))
  const start = ORDER.indexOf((await stage.getAttribute('data-active'))!)
  const swipe = (dx: number, dy: number) => reel.evaluate((element, [dx, dy]) => {
    const box = element.getBoundingClientRect()
    const x = box.x + box.width / 2, y = box.y + box.height / 2
    const init = (clientX: number, clientY: number) => ({ pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, clientX, clientY, bubbles: true, cancelable: true })
    element.dispatchEvent(new PointerEvent('pointerdown', init(x, y)))
    element.dispatchEvent(new PointerEvent('pointermove', init(x + dx / 2, y + dy / 2)))
    element.dispatchEvent(new PointerEvent('pointerup', init(x + dx, y + dy)))
  }, [dx, dy])
  await swipe(-80, 4)
  await expect(stage).toHaveAttribute('data-active', ORDER[(start + 1) % 3])
  await swipe(2, 1)
  await swipe(6, -90)
  await page.waitForTimeout(400)
  await expect(stage).toHaveAttribute('data-active', ORDER[(start + 1) % 3])
  await swipe(90, -3)
  await expect(stage).toHaveAttribute('data-active', ORDER[start])
})
