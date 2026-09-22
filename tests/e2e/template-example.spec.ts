import { expect, test } from '@playwright/test'
import { site } from '../../src/config/site'

for (const width of [375, 1280]) {
  test(`fictional content has a clear template destination and no placeholder profile links at ${width}px`, async ({ page }) => {
    test.skip(!site.exampleContent, 'This check applies to the fictional example')
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 812 })
    await page.goto('/')
    const notice = page.locator('[data-template-demo]')
    await expect(notice).toContainText('Fictional demo')
    await expect(notice.getByRole('link', { name: 'Use this template' })).toHaveAttribute('href', 'https://github.com/Gvasi/career-portfolio-template')
    await expect(page.locator('a[href*="your-handle"]')).toHaveCount(0)
    expect(await notice.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true)
  })
}
