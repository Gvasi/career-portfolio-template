import { expect, test } from '@playwright/test'

for (const width of [320, 375, 1280]) {
  test(`mindset interactions work with keyboard and complete captions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-page-hidden', 'false')
    const section = page.locator('#what-moves-me')
    await section.scrollIntoViewIfNeeded()

    for (let index = 0; index < 4; index++) {
      if (width < 768) await section.locator('.mindset-lab-selector button').nth(index).press('Enter')
      const card = section.locator('.mindset-thought-card').nth(index)
      await expect(card).toBeVisible()
      await expect(card.getByRole('heading')).toBeVisible()
      const caption = card.locator('.thought-body')
      const initial = await caption.innerText()
      // Enter visits the next discovery; the first visit's thought matches the resting caption, so two are needed.
      if (index === 0) { await card.locator('.curiosity-lens').press('Enter'); await card.locator('.curiosity-lens').press('Enter') }
      if (index === 1) await card.getByRole('slider').press('End')
      if (index === 2) await card.getByRole('button', { name: 'Simplify', exact: true }).press('Enter')
      if (index === 3) await card.locator('.launch-control').press('Enter')
      await expect(caption).not.toHaveText(initial)
      expect(await caption.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true)

      if (index === 3) {
        for (let step = 2; step <= 3; step++) {
          await expect(card.locator('.launch-control')).toHaveAttribute('aria-disabled', 'false')
          await card.locator('.launch-control').press('Enter')
          await expect(card.locator('.flight-story')).toHaveAttribute('data-stage', String(step))
        }
        await expect(card.locator('.launch-control')).toHaveAttribute('aria-disabled', 'false')
        await card.getByRole('button', { name: 'Replay the launch journey' }).press('Enter')
        await expect(caption).toHaveText(initial)
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
}
