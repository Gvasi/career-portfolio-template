import { expect, test } from '@playwright/test'
import { site } from '../../src/config/site'
import { hero as hero_copy } from '../../src/content/home'

// The current hero (sections/Hero): greeting with the accented name, the value
// line with its rotating outcome, portrait, code-story terminal and the two
// actions. Outcome rotation and terminal fit are covered by hero-terminal.spec.ts.
const PHONE_WIDTHS = [320, 360, 375, 430]

test('homepage hero exposes a single H1 with the accented name and the value line', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const hero = page.locator('#home')
  const heading = hero.locator('h1')

  await expect(heading).toHaveCount(1)
  await expect(heading).toHaveText(`Hi, I’m ${site.firstName}.`)
  await expect(heading.locator('> span')).toHaveText(site.firstName)
  await expect(hero.locator('.sg-hero-value')).toContainText(hero_copy.valueLine)

  const colors = await page.evaluate(() => {
    const heading = document.querySelector('#home h1') as HTMLElement
    const name = document.querySelector('#home h1 > span') as HTMLElement
    return { heading: getComputedStyle(heading).color, name: getComputedStyle(name).color }
  })
  expect(colors.heading).toBe('rgb(6, 37, 74)')
  expect(colors.name).not.toBe(colors.heading)
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  await expect(hero.locator('img')).toBeVisible()
  await expect.poll(() => hero.locator('img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.evaluate(() => document.fonts.ready)
  // Keep a real rendering with the test artifacts; also used for the README
  // and the portfolio's laptop preview when preparing a release.
  await page.screenshot({ path: 'output/template-home.png' })
})

test('homepage hero keeps the value line readable on narrow phones', async ({ page }) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/')
    const valueSize = await page.locator('#home .sg-hero-value').evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize))
    expect(valueSize).toBeGreaterThanOrEqual(14)
  }
})

test('homepage CTA shows the first navy phrase before scroll activation', async ({ page }) => {
  await page.goto('/')

  const cta = page.locator('#contact')

  await expect(cta).toHaveAttribute('data-cta-active', 'false')
  await expect(cta.locator('.primary-container')).toContainText('Idea worth trying?')

  const primaryColor = await cta.locator('.primary-word.idle').evaluate((node) =>
    window.getComputedStyle(node).color
  )

  expect(primaryColor).toBe('rgb(6, 37, 74)')
})

test('homepage CTA button is visible immediately and compact on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  const cta = page.locator('#contact')
  const button = cta.locator('#ctaButton')

  await expect(cta).toHaveAttribute('data-cta-active', 'false')
  await expect(button).toBeVisible()

  const styles = await button.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const computed = window.getComputedStyle(node)

    return {
      animationName: computed.animationName,
      opacity: computed.opacity,
      transform: computed.transform,
      width: rect.width,
      height: rect.height,
    }
  })

  expect(styles.opacity).toBe('1')
  expect(styles.transform).toBe('none')
  expect(styles.animationName).toBe('none')
  expect(styles.width).toBeLessThanOrEqual(240)
  expect(styles.height).toBeGreaterThanOrEqual(44)
})

test('homepage CTA starts the phrase animation when scrolled into view', async ({ page }) => {
  await page.goto('/')

  const cta = page.locator('#contact')
  await cta.scrollIntoViewIfNeeded()

  await expect(cta).toHaveAttribute('data-cta-active', 'true')
  await expect(cta.locator('.secondary-container')).toContainText("Let's build the first version.")
})

test('homepage hero stacks greeting, portrait beside the value copy, terminal, then actions on phones', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) throw new Error(`${selector} missing`)
      return element.getBoundingClientRect()
    }
    const heading = rect('#home h1')
    const portrait = rect('#home .sg-portrait')
    const meta = rect('#home .sg-hero-meta')
    const terminal = rect('#home .sg-terminal-slot')
    const actions = rect('#home .sg-actions-slot')
    return {
      headingBottom: heading.bottom,
      portraitTop: portrait.top, portraitBottom: portrait.bottom, portraitHeight: portrait.height, portraitLeft: portrait.left,
      metaTop: meta.top, metaBottom: meta.bottom, metaRight: meta.right,
      terminalTop: terminal.top, terminalBottom: terminal.bottom,
      actionsTop: actions.top,
    }
  })

  expect(metrics.headingBottom).toBeLessThan(metrics.portraitTop)
  // The value copy and meta share the row with the portrait, to its left.
  expect(metrics.metaTop).toBeGreaterThanOrEqual(metrics.portraitTop)
  expect(metrics.metaBottom).toBeLessThanOrEqual(metrics.portraitBottom)
  expect(metrics.metaRight).toBeLessThanOrEqual(metrics.portraitLeft)
  expect(metrics.portraitBottom).toBeLessThan(metrics.terminalTop)
  expect(metrics.terminalBottom).toBeLessThan(metrics.actionsTop)
  expect(metrics.portraitHeight).toBeLessThanOrEqual(185)
})

test('homepage hero has no horizontal overflow on mobile widths', async ({ page }) => {
  for (const width of PHONE_WIDTHS) {
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  }
})

test('homepage hero keeps mobile actions side by side without overlap', async ({ page }) => {
  for (const width of PHONE_WIDTHS) {
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/')

    const layout = await page.evaluate(() => {
      const actions = document.querySelector('#home .sg-hero-actions') as HTMLElement | null
      const links = Array.from(document.querySelectorAll('#home .sg-hero-actions > a')) as HTMLElement[]

      if (!actions || links.length !== 2) {
        throw new Error('Hero action links missing')
      }

      const actionRect = actions.getBoundingClientRect()
      const [primaryRect, secondaryRect] = links.map(link => link.getBoundingClientRect())

      return {
        primaryTop: primaryRect.top,
        secondaryTop: secondaryRect.top,
        primaryRight: primaryRect.right,
        secondaryLeft: secondaryRect.left,
        primaryHeight: primaryRect.height,
        secondaryHeight: secondaryRect.height,
        actionLeft: actionRect.left,
        actionRight: actionRect.right,
        viewportWidth: window.innerWidth,
      }
    })

    expect(Math.abs(layout.primaryTop - layout.secondaryTop)).toBeLessThanOrEqual(2)
    expect(layout.primaryRight).toBeLessThanOrEqual(layout.secondaryLeft)
    expect(layout.primaryHeight).toBeLessThanOrEqual(52)
    expect(layout.secondaryHeight).toBeLessThanOrEqual(52)
    expect(layout.actionLeft).toBeGreaterThanOrEqual(0)
    expect(layout.actionRight).toBeLessThanOrEqual(layout.viewportWidth)
  }
})
