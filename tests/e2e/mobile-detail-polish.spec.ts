import { expect, test, type Locator } from '@playwright/test'

async function captionFits(card: Locator) {
  const fit = await card.evaluate(e => {
    const box = e.getBoundingClientRect()
    const caption = e.querySelector('.thought-body')!
    const r = caption.getBoundingClientRect()
    return r.left >= box.left && r.right <= box.right && r.bottom <= box.bottom && caption.scrollWidth <= caption.clientWidth + 1
  })
  expect(fit).toBe(true)
}

for (const width of [320, 375, 1280]) {
  test(`thinking cards retain their layout through every interaction at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Decline', exact: true }).click()
    const section = page.locator('#what-moves-me')
    const heights: number[] = []
    for (const [tone, label] of [['growth', 'Learn — Always curious'], ['ai', 'AI — Co-pilot mode'], ['people', 'People — Common ground'], ['proof', 'Build — From idea to use']]) {
      if (width < 768) await section.getByRole('button', { name: label, exact: true }).click()
      const card = section.locator(`.mindset-thought-card[data-tone="${tone}"]`)
      await card.scrollIntoViewIfNeeded()
      await captionFits(card)
      heights.push((await card.boundingBox())!.height)
      if (tone === 'growth') {
        const lens = card.getByRole('button', { name: 'Explore beneath the surface with the lens' })
        for (let i = 0; i < 3; i++) { await lens.press('Enter'); await captionFits(card) }
      } else if (tone === 'ai') {
        const slider = card.getByRole('slider', { name: 'Follow my thinking' })
        for (let i = 1; i <= 3; i++) {
          await slider.press('ArrowRight')
          await expect(slider).toHaveAttribute('aria-valuetext', new RegExp(`^${i + 1} of 4:`))
          await captionFits(card)
        }
      } else if (tone === 'people') {
        for (const choice of ['Listen', 'Ask', 'Explore', 'Simplify']) {
          await card.getByRole('button', { name: choice, exact: true }).click()
          await captionFits(card)
        }
      } else {
        const launch = card.locator('.launch-control')
        for (let i = 1; i <= 3; i++) {
          await launch.click()
          await expect(card.locator('.flight-story')).toHaveAttribute('data-stage', String(i))
          await expect(launch).toHaveAttribute('aria-disabled', 'false')
          await captionFits(card)
        }
        if (width < 768) {
          const clearance = await card.evaluate(e => e.querySelector('.launch-control')!.getBoundingClientRect().top - e.querySelector('.flight-story-action')!.getBoundingClientRect().bottom)
          expect(clearance).toBeGreaterThanOrEqual(10)
        }
        await launch.click()
        await expect(card.locator('.flight-story')).toHaveAttribute('data-stage', '0')
      }
      await card.screenshot({ path: `output/mobile-detail-polish/thinking-${tone}-${width}.png` })
    }
    if (width < 768) expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
    console.log('thinking card heights', width, heights)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  })

  test(`project actions have separate touch targets and restore focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Decline', exact: true }).click()
    const open = page.getByRole('button', { name: 'Explore the build', exact: true })
    await open.click()
    const dialog = page.locator('.project-dialog')
    const close = dialog.getByRole('button', { name: 'Close dialog' })
    const visit = dialog.getByRole('link', { name: 'Visit This Portfolio (opens in a new tab)' })
    const x = (await close.boundingBox())!, arrow = (await visit.boundingBox())!
    expect(x.width).toBe(44); expect(x.height).toBe(44)
    expect(arrow.width).toBe(44); expect(arrow.height).toBe(44)
    expect(x.x - arrow.x - arrow.width).toBeGreaterThanOrEqual(10)
    expect(Math.abs(x.y - arrow.y)).toBeLessThanOrEqual(1)
    if (width < 768) {
      const tabs = (await dialog.getByRole('tablist').boundingBox())!
      expect(tabs.y - x.y - x.height).toBeGreaterThanOrEqual(14)
    }
    await dialog.screenshot({ path: `output/mobile-detail-polish/dialog-${width}.png` })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(open).toBeFocused()
    console.log('dialog action gap', width, x.x - arrow.x - arrow.width)
  })
}

for (const width of [320, 375]) {
  test(`mobile credentials keep titles, descriptions and career dates aligned at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/about')
    await page.getByRole('button', { name: 'Decline', exact: true }).click()
    const credentials = page.locator('#credentials')
    const measurements: {height: number; skillsTop: number; titleHeight: number}[] = []
    for (const id of ['data-analytics-certificate', 'project-management-certificate', 'business-degree']) {
      const record = credentials.locator(`[data-mobile-record="${id}"]`)
      await expect(record).toHaveAttribute('data-active', 'true')
      await record.scrollIntoViewIfNeeded()
      const measured = await record.evaluate(e => {
        const box = e.getBoundingClientRect(), title = e.querySelector('h3')!, skills = e.querySelector('ul')!
        return {height: box.height, skillsTop: skills.getBoundingClientRect().top - box.top, titleHeight: title.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(title).lineHeight), overflow: title.scrollWidth - title.clientWidth, tiles: Array.from(skills.children).map(li=>({y:li.getBoundingClientRect().y, width:li.getBoundingClientRect().width, height:li.getBoundingClientRect().height, description:li.querySelector('span')?.textContent}))}
      })
      expect(measured.overflow).toBeLessThanOrEqual(1)
      expect(measured.titleHeight).toBeCloseTo(measured.lineHeight, 0)
      expect(measured.tiles).toHaveLength(4)
      expect(new Set(measured.tiles.map(t=>Math.round(t.y))).size).toBe(2)
      expect(new Set(measured.tiles.map(t=>Math.round(t.height))).size).toBe(1)
      expect(measured.tiles.every(t=>t.description)).toBe(true)
      measurements.push(measured)
      await record.screenshot({path:`output/mobile-detail-polish/credential-${id}-${width}.png`})
      await credentials.getByRole('button', {name:'Next certificate', exact:true}).click()
    }
    expect(Math.max(...measurements.map(m=>m.height)) - Math.min(...measurements.map(m=>m.height))).toBeLessThanOrEqual(1)
    expect(Math.max(...measurements.map(m=>m.skillsTop)) - Math.min(...measurements.map(m=>m.skillsTop))).toBeLessThanOrEqual(1)
    const dates = await page.locator('.ae-company-meta').evaluateAll(elements => elements.map(e => {
      const period = e.querySelector('.ae-mobile-period')!.getBoundingClientRect(), company = e.querySelector('.ae-company')!.getBoundingClientRect()
      return {gap: period.top - company.bottom, alignment: Math.abs(period.left - company.left)}
    }))
    expect(dates.every(({gap, alignment})=>gap >= 3.9 && alignment <= 1)).toBe(true)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
    console.log('credential rows', width, measurements.map(({height, skillsTop, titleHeight})=>({height, skillsTop, titleHeight})))
  })
}
