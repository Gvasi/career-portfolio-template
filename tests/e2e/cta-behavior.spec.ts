import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { closingPhrases } from '../../src/content/home'

for (const width of [320, 1280]) {
  test(`closing invitation is styled before hydration at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 812 } })
    try {
      const page = await context.newPage()
      await page.goto('/#contact')
      const invitation = page.locator('#contact')
      await expect(invitation.locator('#ctaButton')).toHaveAttribute('href', '/contact')
      const firstPaint = await invitation.evaluate(element => {
        const rows = Array.from(element.querySelectorAll('.primary-word')).map(row => ({
          opacity: getComputedStyle(row).opacity,
          position: getComputedStyle(row).position,
        }))
        const button = element.querySelector('#ctaButton')!.getBoundingClientRect()
        return { rows, buttonHeight: button.height, pageWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth }
      })
      expect(firstPaint.rows[0]).toEqual({ opacity: '1', position: 'absolute' })
      expect(firstPaint.rows.slice(1).every(row => row.opacity === '0' && row.position === 'absolute')).toBe(true)
      expect(firstPaint.buttonHeight).toBeGreaterThanOrEqual(44)
      expect(firstPaint.scrollWidth).toBeLessThanOrEqual(firstPaint.pageWidth)
    } finally {
      await context.close()
    }
  })
}

for (const width of [320, 375, 1280]) {
  test(`closing invitation stays readable with reduced motion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Decline', exact: true }).click()
    const invitation = page.locator('#contact')
    await invitation.scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    await expect(invitation.locator('.primary-word.idle')).toHaveText(closingPhrases[0].primary)
    await expect(invitation.locator('.secondary-word.idle')).toHaveText(closingPhrases[0].secondary[0].t)
    await expect(invitation.locator('#ctaButton')).toHaveAttribute('href', '/contact')
    const geometry = await invitation.evaluate(element => {
      const heading = element.querySelector('h2')!.getBoundingClientRect()
      const button = element.querySelector('#ctaButton')!.getBoundingClientRect()
      const phrases = Array.from(element.querySelectorAll('.primary-word.idle, .secondary-word.idle')).map(node => {
        const box = node.getBoundingClientRect()
        return { left: box.left, right: box.right, height: box.height }
      })
      return { headingHeight: heading.height, buttonHeight: button.height, phrases,
        pageWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }
    })
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.pageWidth)
    expect(geometry.buttonHeight).toBeGreaterThanOrEqual(44)
    for (const phrase of geometry.phrases) {
      expect(phrase.left).toBeGreaterThanOrEqual(0)
      expect(phrase.right).toBeLessThanOrEqual(geometry.pageWidth)
    }
    // Optional evidence for behavior-preserving refactors, outside the source tree.
    if (process.env.CTA_ARTIFACT_DIR) {
      await mkdir(process.env.CTA_ARTIFACT_DIR, { recursive: true })
      await invitation.screenshot({ path: path.join(process.env.CTA_ARTIFACT_DIR, `cta-${width}.png`) })
      console.log('CTA geometry', width, JSON.stringify(geometry))
    }
  })
}

test('closing invitation advances through a phrase set and keeps its contact destination', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  const invitation = page.locator('#contact')
  await invitation.scrollIntoViewIfNeeded()
  await expect(invitation).toHaveAttribute('data-cta-active', 'true')
  for (const phrase of closingPhrases[0].secondary) {
    await expect(invitation.locator('.secondary-word.idle')).toHaveText(phrase.t)
  }
  await expect(invitation.locator('.primary-word.idle')).toHaveText(closingPhrases[1].primary)
  await expect(invitation.locator('.secondary-word.idle')).toHaveText(closingPhrases[1].secondary[0].t)
  await invitation.locator('#ctaButton').click()
  await expect(page).toHaveURL(/\/contact$/)
  await page.goBack()
  await invitation.scrollIntoViewIfNeeded()
  await expect(invitation.locator('.primary-word.idle')).toHaveText(closingPhrases[0].primary)
  await expect(invitation.locator('.secondary-word.idle')).toHaveText(closingPhrases[0].secondary[0].t)
})

test('closing invitation stops for a live reduced-motion change and restarts after leaving the viewport', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  const invitation = page.locator('#contact')
  await invitation.scrollIntoViewIfNeeded()
  await expect(invitation).toHaveAttribute('data-cta-animating', 'true')
  await expect(invitation.locator('.secondary-word.idle')).toHaveText(closingPhrases[0].secondary[1].t)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(invitation).toHaveAttribute('data-cta-animating', 'false')
  await expect(invitation.locator('.primary-word.idle')).toHaveText(closingPhrases[0].primary)
  await expect(invitation.locator('.secondary-word.idle')).toHaveText(closingPhrases[0].secondary[0].t)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(invitation).toHaveAttribute('data-cta-animating', 'true')
  await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded()
  await expect(invitation).toHaveAttribute('data-cta-animating', 'false')
  const stopped = await invitation.locator('h2').innerHTML()
  // Advance past a complete phrase cycle: no offscreen timer may change it.
  await page.clock.install()
  await page.clock.fastForward(30_000)
  expect(await invitation.locator('h2').innerHTML()).toBe(stopped)
  await page.clock.resume()
  await invitation.scrollIntoViewIfNeeded()
  await expect(invitation).toHaveAttribute('data-cta-animating', 'true')
  await expect(invitation.locator('.secondary-word.idle')).toHaveText(closingPhrases[0].secondary[0].t)
})
