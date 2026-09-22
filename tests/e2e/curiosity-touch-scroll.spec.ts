import { expect, test, type CDPSession, type Page } from '@playwright/test'

async function swipe(session: CDPSession, x: number, y: number, dx: number, dy: number) {
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let step = 1; step <= 10; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: x + dx * step / 10, y: y + dy * step / 10 }],
    })
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function waitForScrollToSettle(page: Page) {
  let previous = await page.evaluate(() => scrollY)
  let stableSamples = 0
  await expect.poll(async () => {
    const current = await page.evaluate(() => scrollY)
    stableSamples = current === previous ? stableSamples + 1 : 0
    previous = current
    return stableSamples
  }, { intervals: [50], timeout: 5000 }).toBeGreaterThanOrEqual(4)
}

async function centerLearn(page: Page) {
  // A synthetic swipe can leave compositor momentum after touchEnd. Finish
  // that gesture before measuring whether a separate lens drag scrolls.
  await waitForScrollToSettle(page)
  await page.locator('.curiosity-lens').evaluate(e => e.scrollIntoView({ block: 'center' }))
  await waitForScrollToSettle(page)
  return page.locator('.curiosity-lens').evaluate(e => {
    const button = e.getBoundingClientRect()
    const zone = e.querySelector('.curiosity-pointer-zone')!.getBoundingClientRect()
    return { left: button.left, right: button.right, zoneLeft: zone.left, zoneRight: zone.right, y: zone.y + zone.height / 2 }
  })
}

for (const width of [320, 375, 412]) {
  test(`Learn card margins scroll while the illustration remains draggable at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
    const page = await context.newPage()
    try {
      await page.goto('/')
      await page.evaluate(() => document.fonts.ready)
      await page.getByRole('button', { name: 'Decline', exact: true }).click()
      const lens = page.getByRole('button', { name: 'Explore beneath the surface with the lens' })
      const session = await context.newCDPSession(page)
      for (const side of ['left', 'right'] as const) {
        const box = await centerLearn(page)
        const x = side === 'left' ? (box.left + box.zoneLeft) / 2 : (box.right + box.zoneRight) / 2
        const initialScroll = await page.evaluate(() => scrollY)
        const initialCaption = await page.locator('.curiosity-copy').textContent()
        await swipe(session, x, box.y, 0, -110)
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(initialScroll + 50)
        await expect(page.locator('.curiosity-copy')).toHaveText(initialCaption!)
        await expect(lens).toHaveAttribute('data-exploring', 'false')
      }

      await centerLearn(page)
      const points = await lens.evaluate(e => {
        const matrix = e.querySelector('svg')!.getScreenCTM()!
        const start = new DOMPoint(86, 78).matrixTransform(matrix)
        const end = new DOMPoint(267, 81).matrixTransform(matrix)
        return { x: start.x, y: start.y, dx: end.x - start.x, dy: end.y - start.y }
      })
      const initialScroll = await page.evaluate(() => scrollY)
      const initialCaption = await page.locator('.curiosity-copy').textContent()
      await swipe(session, points.x, points.y, points.dx, points.dy)
      await expect(page.locator('.curiosity-copy')).not.toHaveText(initialCaption!)
      expect(Math.abs(await page.evaluate(() => scrollY) - initialScroll)).toBeLessThan(2)
      await lens.press('Home')
      await expect(page.locator('.curiosity-copy')).toHaveText(initialCaption!)
      await page.locator('.mindset-thought-card[data-tone="growth"]').screenshot({ path: `output/mobile-detail-polish/lens-touch-${width}.png` })
    } finally {
      await context.close()
    }
  })
}
