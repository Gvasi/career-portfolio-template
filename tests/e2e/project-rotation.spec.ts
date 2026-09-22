import { expect, test } from '@playwright/test'
import { projects } from '../../src/content/projects'

for (const width of [375, 1280]) {
  test(`project rotation follows the ${width < 768 ? 'manual mobile' : 'desktop'} policy`, async ({ page }) => {
    test.skip(projects.length < 2, 'Rotation requires at least two projects in the content catalogue.')
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/')
    const stage = page.locator('[data-project-stage]')
    const reel = page.getByRole('group', { name: 'Project reel', exact: true })
    await stage.scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    await expect(stage).toBeInViewport()
    await expect(reel).toHaveAttribute('data-rotating', width < 768 ? 'false' : 'true')
    const initial = await stage.getAttribute('data-active')
    await page.clock.install()
    await page.clock.runFor(7000)
    if (width >= 768) {
      await expect(stage).not.toHaveAttribute('data-active', initial!)
      return
    }
    await expect(stage).toHaveAttribute('data-active', initial!)
    const target = projects.find(project => project.id !== initial)!
    await page.getByRole('button', { name: `Select project: ${target.title}`, exact: true }).click()
    await expect(stage).toHaveAttribute('data-active', target.id)
    await page.clock.runFor(7000)
    await expect(stage).toHaveAttribute('data-active', target.id)
  })
}
