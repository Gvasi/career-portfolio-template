import { expect, test, type Locator } from '@playwright/test'

async function settle(dialog: Locator) {
  for (const inactive of await dialog.locator('[role="tabpanel"] > div > [data-selected="false"]').all()) {
    await expect(inactive).toHaveAttribute('aria-hidden', 'true')
    await expect(inactive).toHaveCSS('opacity', '0')
  }
}

for (const [width, height] of [[320, 568], [375, 667], [375, 812], [412, 680], [412, 720], [1280, 800]]) {
  test(`project frame adapts without nested mobile scroll at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Decline', exact: true }).click()
    await page.getByRole('button', { name: 'Explore the build', exact: true }).click()
    const dialog = page.locator('.project-dialog')
    const frameHeight = (await dialog.boundingBox())!.height
    const panel = dialog.getByRole('tabpanel')

    await dialog.getByRole('tab', { name: 'Decisions', exact: true }).click()
    await settle(dialog)
    if (width < 768) {
      const cards: number[] = []
      for (const label of ['Stories', 'Booking', 'Motion']) {
        await dialog.getByRole('button', { name: label, exact: true }).click()
        const article = dialog.getByRole('article')
        await article.getByRole('button', { name: /^Reveal why:/ }).click()
        cards.push((await article.boundingBox())!.height)
        if (width >= 375) expect(await panel.evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1)
      }
      expect(Math.max(...cards) - Math.min(...cards)).toBeLessThanOrEqual(1)
    }
    await dialog.screenshot({ path: `output/responsive-project-frame/decisions-${width}-${height}.png` })

    await dialog.getByRole('tab', { name: 'Stack', exact: true }).click()
    await settle(dialog)
    const tools = dialog.getByRole('group', { name: 'Project tools' })
    for (const tool of await tools.getByRole('button').all()) {
      await tool.click()
      const size = await tool.boundingBox()
      expect(size!.height).toBeGreaterThanOrEqual(44)
      expect(size!.width).toBeGreaterThanOrEqual(44)
      const detail = dialog.locator('[class*="toolDetail"]').first()
      if (width < 768) {
        for (const region of [tools, detail]) {
          expect(await region.evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1)
          expect(await region.evaluate(e => getComputedStyle(e).overflowY)).toBe('visible')
        }
        if (width >= 375) expect(await panel.evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1)
      }
      expect(await dialog.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1)
      expect((await dialog.boundingBox())!.height).toBe(frameHeight)
    }
    console.log('Stack reading-area overflow', width, height, await panel.evaluate(e => e.scrollHeight - e.clientHeight))
    await tools.getByRole('button', { name: 'Next.js', exact: true }).click()
    if (width >= 375 && width < 768) expect(await panel.evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1)
    await dialog.screenshot({ path: `output/responsive-project-frame/stack-${width}-${height}.png` })
  })
}

test('compact layout follows dialog height while the viewport stays tall', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  await page.getByRole('button', { name: 'Explore the build', exact: true }).click()
  const dialog = page.locator('.project-dialog')
  await dialog.getByRole('tab', { name: 'Decisions', exact: true }).click()
  await settle(dialog)
  // Model browser chrome consuming height without relying on a viewport media query.
  await page.addStyleTag({ content: '.project-dialog .dialog-surface { height:656px!important; }' })
  const article = dialog.getByRole('article')
  await expect(article).toHaveCSS('padding', '13px')
  expect(await dialog.getByRole('tabpanel').evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1)
  await page.addStyleTag({ content: '.project-dialog [role="tabpanel"] p { font-size:24px!important; }' })
  await article.getByRole('button', { name: /^Reveal why:/ }).click()
  const panel = dialog.getByRole('tabpanel')
  expect(await panel.evaluate(e => e.scrollHeight - e.clientHeight)).toBeGreaterThan(0)
  const reveal = article.getByRole('button', { name: /^Close reasoning:/ })
  await reveal.focus()
  await expect(reveal).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Explore the build', exact: true })).toBeFocused()
})

for (const width of [320, 375, 768, 1280]) {
  test(`all timeline chapters have four aligned labels at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/about')
    await page.getByRole('button', { name: 'Decline', exact: true }).click()
    const groups = page.locator('.ae-highlights')
    await expect(groups).toHaveCount(5)
    for (const group of await groups.all()) {
      await expect(group.getByRole('listitem')).toHaveCount(4)
      const layout = await group.evaluate(e => Array.from(e.children).map(li => {
        const r = li.getBoundingClientRect()
        return { top: Math.round(r.top), height: r.height, overflow: li.scrollWidth - li.clientWidth }
      }))
      expect(new Set(layout.map(item => item.top)).size).toBe(width < 768 ? 2 : 1)
      expect(layout.every(item => item.overflow <= 1)).toBe(true)
      expect(Math.max(...layout.map(item => item.height)) - Math.min(...layout.map(item => item.height))).toBeLessThanOrEqual(1)
      if (width < 768) {
        for (const label of await group.locator('[aria-hidden="true"]').all()) {
          const lines = await label.evaluate(e => e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))
          expect(lines).toBeLessThanOrEqual(1.05)
        }
      }
    }
    await page.locator('.ae-milestone').last().screenshot({ path: `output/responsive-project-frame/timeline-${width}.png` })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  })
}
