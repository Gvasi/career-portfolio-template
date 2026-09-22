import { expect, test } from '@playwright/test'

for (const width of [320, 375]) {
  test(`mobile decisions fit their content and retain reveal state at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Explore the build', exact: true }).click()
    const dialog = page.locator('.project-dialog')
    await dialog.getByRole('tab', { name: 'Decisions', exact: true }).click()
    const first = dialog.getByRole('article', { name: 'Let you explore my thinking.', exact: true })
    await expect(first).toBeVisible()
    const height = (await first.boundingBox())!.height
    const choices = [
      ['Stories', 'Let you explore my thinking.'],
      ['Booking', 'Put booking inside the site.'],
      ['Motion', 'Make your action feel connected.'],
    ]

    for (const [label, title] of choices) {
      await dialog.getByRole('button', { name: label, exact: true }).click()
      const article = dialog.getByRole('article', { name: title, exact: true })
      await expect.poll(async () => (await article.boundingBox())!.height).toBeCloseTo(height, 1)
      await article.getByRole('button', { name: `Reveal why: ${title}`, exact: true }).click()
      await expect(article.locator('[class*="backFace"]')).toHaveAttribute('aria-hidden', 'false')
      await expect.poll(async () => (await article.boundingBox())!.height).toBeCloseTo(height, 1)
      // Spare room is balanced around the explanation, not left below the card.
      await expect.poll(() => article.evaluate(e => {
        const face = e.querySelector('[class*="backFace"]')!
        const bounds = face.getBoundingClientRect()
        const top = face.firstElementChild!.getBoundingClientRect().top - bounds.top
        const bottom = bounds.bottom - face.lastElementChild!.getBoundingClientRect().bottom
        return Math.abs(top - bottom)
      })).toBeLessThanOrEqual(1)
      if (width === 375) {
        const footer = await dialog.getByRole('button', { name: 'Next project', exact: true }).boundingBox()
        const card = await article.boundingBox()
        expect(footer!.y - (card!.y + card!.height)).toBeLessThanOrEqual(40)
      }
    }

    await dialog.getByRole('button', { name: 'Stories', exact: true }).click()
    await expect(first.getByRole('button', { name: 'Close reasoning: Let you explore my thinking.', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await expect(dialog.getByRole('article')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
}
