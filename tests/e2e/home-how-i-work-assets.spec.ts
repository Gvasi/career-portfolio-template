import { expect, test } from '@playwright/test'

for (const width of [320, 375, 1280]) {
  test(`How I Work keeps original artwork and loads only selected motion at ${width}px`, async ({ page }) => {
    const requests: string[] = []
    page.on('request', request => requests.push(request.url()))
    await page.setViewportSize({ width, height: 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-page-hidden', 'false')
    const section = page.locator('#how-i-work')
    await section.scrollIntoViewIfNeeded()
    const steps = ['Translate', 'Value', 'AI', 'Data', 'Systems', 'Momentum']
    const assets = ['translate', 'growth', 'ai', 'data', 'systems', 'momentum']
    const ids = ['translator', 'ownership', 'clarity', 'systems', 'growth', 'value']

    for (let i = 0; i < steps.length; i++) {
      const title = steps[i]
      await section.getByRole('button', { name: width < 1024 ? new RegExp(`Step \\d: ${title}$`) : title, exact: width >= 1024 }).press('Enter')
      await expect(section.getByRole('heading', { name: title, exact: true })).toBeVisible()
      const accent = section.locator('[data-how-accent]')
      await expect(accent.locator('img')).toHaveAttribute('src', `/animations/how-i-work/${assets[i]}-poster.webp`)
      await expect.poll(() => accent.locator('img').evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true)
      expect(await accent.locator('svg').count()).toBe(0)
      expect(await accent.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0)
    }
    expect(requests.filter(url => /\.wasm(?:\?|$)|\/how-i-work\/[^/]+\.json/.test(url))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)

    // Each selection fetches its own data; other tabs are not warmed in the background.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    let accent = section.locator('[data-how-accent="value"]')
    await expect(accent).toHaveAttribute('data-ready', 'true')
    await expect(accent.locator('svg')).toBeVisible()
    expect(requests.filter(url => /\/how-i-work\/[^/]+\.json/.test(url)).map(url => new URL(url).pathname)).toEqual(['/animations/how-i-work/momentum.json'])
    for (let i = 0; i < steps.length; i++) {
      await section.getByRole('button', { name: width < 1024 ? new RegExp(`Step \\d: ${steps[i]}$`) : steps[i], exact: width >= 1024 }).press('Enter')
      accent = section.locator(`[data-how-accent="${ids[i]}"]`)
      await expect(accent).toHaveAttribute('data-ready', 'true')
      await expect(accent.locator('svg')).toBeVisible()
      const fits = await accent.evaluate(e => {
        const r = e.getBoundingClientRect()
        const panel = e.closest('[data-how-mobile-header], [data-content-panel]')!.getBoundingClientRect()
        return r.left >= panel.left && r.right <= panel.right + 1
      })
      expect(fits).toBe(true)
    }
    expect(requests.filter(url => /\.wasm(?:\?|$)|cdn\.jsdelivr\.net/.test(url))).toEqual([])
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(accent).toHaveAttribute('data-playing', 'false')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(accent.locator('svg')).toHaveCount(0)
  })
}
