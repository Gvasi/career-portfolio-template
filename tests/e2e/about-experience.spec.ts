import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

// The About page's editorial hero and career journey (sections/about/experience).
// Phone overflow and career-date layout are covered by mobile-detail-polish.spec.ts;
// highlight-list structure by project-responsive-frame.spec.ts.

test('about career journey shows the current heading, subhead and five chapters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/about')

  const journey = page.locator('#career-journey')
  await expect(journey.getByRole('heading', { name: /How I got here/ })).toBeVisible()
  await expect(journey.getByText('From a support desk in Porto to product analytics in Lisbon.')).toBeVisible()
  await expect(journey.locator('.ae-milestone')).toHaveCount(5)
})

test('career content references local, optimised image assets only', async () => {
  const dataSource = fs.readFileSync(path.join(process.cwd(), 'src/content/career.ts'), 'utf8')
  const referenced = [...new Set(dataSource.match(/\/images\/(?:career|profile)\/[\w.-]+\.webp/g))]
  // Five chapter illustrations and the About portrait.
  expect(referenced.length).toBeGreaterThanOrEqual(6)

  for (const publicPath of referenced) {
    const diskPath = path.join(process.cwd(), 'public', publicPath)
    expect(fs.existsSync(diskPath), publicPath).toBe(true)
    const sizeInKb = fs.statSync(diskPath).size / 1024
    // Chapter illustrations stay under 300 KB and the portrait under 180 KB so the page loads quickly.
    expect(sizeInKb, publicPath).toBeLessThan(publicPath.includes('portrait') ? 180 : 300)
  }
})

test('about hero headline wraps to at most three rows and the portrait column stays bounded', async ({ page }) => {
  for (const viewport of [{ width: 1080, height: 720 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/about')

    const heading = page.locator('#about-title')
    await expect(heading).toBeVisible()
    const metrics = await page.evaluate(() => {
      const heading = document.querySelector('#about-title') as HTMLElement
      const portrait = document.querySelector('.ae-portrait-column') as HTMLElement
      const lines = Math.round(heading.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(heading).lineHeight))
      return { lines, portraitWidth: portrait.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth - window.innerWidth }
    })
    expect(metrics.lines, `${viewport.width}px`).toBeLessThanOrEqual(3)
    expect(metrics.portraitWidth, `${viewport.width}px`).toBeLessThanOrEqual(360)
    expect(metrics.overflow).toBeLessThanOrEqual(0)
  }
})
