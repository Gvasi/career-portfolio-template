import { expect, test } from '@playwright/test'
import { projects } from '../../src/content/projects'
import { explorerCategories } from '../../src/content/toolkit'

for (const [width, height] of [[320, 568], [320, 812], [375, 667], [375, 812], [430, 932], [1280, 800]]) {
  test(`project tools stay reachable and selected when pages resize at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Explore the build', exact: true }).click()
    const dialog = page.locator('.project-dialog')
    const frame = (await dialog.boundingBox())!.height

    expect(projects.length, 'The project explorer needs at least one project.').toBeGreaterThan(0)
    for (const [index, project] of projects.entries()) {
      const expectedTools = project.story.tools.map(tool => tool.name)
      const count = expectedTools.length
      expect(count, `${project.title} needs at least one tool to explore.`).toBeGreaterThan(0)
      expect(new Set(expectedTools).size, 'Tool names must identify distinct choices.').toBe(count)
      await expect(dialog.locator('#project-dialog-title')).toHaveText(project.title)
      await dialog.getByRole('tab', { name: 'Stack', exact: true }).click()
      const grid = dialog.getByRole('group', { name: 'Project tools', exact: true })
      await expect(dialog.locator('[class*="toolCount"]')).toContainText(new RegExp(`(?:of ${count}|${count} tools)$`))
      const seen = new Set<string>()
      // Even at one tool per page, every configured tool must be reachable.
      for (let turn = 0; turn < count; turn++) {
        await expect(grid.locator('button[aria-pressed="true"]')).toHaveCount(1)
        const buttons = grid.getByRole('button')
        for (const button of await buttons.all()) {
          const name = (await button.getAttribute('aria-label'))!
          seen.add(name)
          await button.press('Enter')
          await expect(dialog.getByRole('heading', { name, exact: true })).toBeVisible()
          const label = button.locator('span').last()
          expect(await label.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1)
          if (height >= 667) {
            expect(await dialog.getByRole('tabpanel').evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1)
          }
        }
        if (width < 768) {
          const rows = await grid.evaluate(e => new Set(Array.from(e.children).map(child => Math.round(child.getBoundingClientRect().top))).size)
          expect(rows).toBeLessThanOrEqual(2)
        }
        const next = dialog.getByRole('button', { name: 'Next tools', exact: true })
        if (!await next.count() || !await next.isEnabled()) break
        await next.click()
      }
      expect([...seen].sort()).toEqual([...expectedTools].sort())
      const selected = await grid.locator('button[aria-pressed="true"]').getAttribute('aria-label')
      for (const tab of ['Overview', 'Decisions', 'Stack']) {
        await dialog.getByRole('tab', { name: tab, exact: true }).click()
        expect((await dialog.boundingBox())!.height).toBe(frame)
      }
      await expect(grid.getByRole('button', { name: selected!, exact: true })).toHaveAttribute('aria-pressed', 'true')
      if (index < projects.length - 1) await dialog.getByRole('button', { name: 'Next project', exact: true }).click()
    }

    const grid = dialog.getByRole('group', { name: 'Project tools', exact: true })
    const selected = await grid.locator('button[aria-pressed="true"]').getAttribute('aria-label')
    await page.setViewportSize({ width: width < 768 ? 1280 : 375, height: 812 })
    await expect(grid.getByRole('button', { name: selected!, exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  })
}

for (const [width, height] of [[320, 568], [375, 812], [1280, 800]]) {
  test(`toolkit pages fit, expose every tool and retain selection at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Explore toolkit' }).click()
    const dialog = page.locator('.toolkit-dialog')
    await expect(dialog.locator('.toolkit-catalog-scroll')).toHaveAttribute('style', /height:/)
    const frame = (await dialog.boundingBox())!
    expect(explorerCategories.length, 'The toolkit needs at least one category.').toBeGreaterThan(0)
    for (const category of explorerCategories) {
      const expectedTools = category.items.map(tool => tool.name)
      const count = expectedTools.length
      expect(count, `${category.label} needs at least one tool to explore.`).toBeGreaterThan(0)
      expect(new Set(expectedTools).size, 'Tool names must identify distinct choices.').toBe(count)
      await dialog.getByRole('button', { name: category.label, exact: true }).click()
      const seen = new Set<string>()
      for (let turn = 0; turn < count; turn++) {
        await expect(dialog.locator('.toolkit-tile[aria-pressed="true"]')).toHaveCount(1)
        const currentFrame = (await dialog.boundingBox())!
        expect(currentFrame.height).toBe(frame.height)
        expect(currentFrame.y).toBe(frame.y)
        if (width < 768) {
          const rows = await dialog.locator('.toolkit-catalog').evaluate(e => new Set(Array.from(e.children).map(child => Math.round(child.getBoundingClientRect().top))).size)
          expect(rows).toBeLessThanOrEqual(2)
        }
        for (const button of await dialog.locator('.toolkit-tile').all()) {
          const name = (await button.getAttribute('aria-label'))!
          seen.add(name)
          await button.press('Enter')
          await expect(dialog.getByRole('heading', { name, exact: true })).toBeVisible()
          for (const selector of ['.dialog-surface', '.toolkit-inspector', '.toolkit-catalog-scroll']) {
            expect(await dialog.locator(selector).evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1)
          }
          expect(await button.locator('.ts-item span').evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1)
        }
        const next = dialog.getByRole('button', { name: 'Next toolkit tools', exact: true })
        if (!await next.count() || !await next.isEnabled()) break
        await next.click()
      }
      expect([...seen].sort()).toEqual([...expectedTools].sort())
    }
    await dialog.screenshot({ path: `output/toolkit-${width}.png` })
    const selected = await dialog.locator('.toolkit-tile[aria-pressed="true"]').getAttribute('aria-label')
    await page.setViewportSize({ width: width < 768 ? 1280 : 375, height: 812 })
    await expect(dialog.getByRole('button', { name: selected!, exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(await dialog.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1)
  })
}
