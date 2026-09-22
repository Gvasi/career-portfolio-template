import { expect, test, type Locator, type Page } from '@playwright/test'

// The hero terminal rotates its five code stories every 4 s of eligible dwell.
// The page clock is installed before navigation and paused once the page is up,
// so every JS timer only moves through clock.runFor(); IntersectionObserver and
// React's scheduler still run in real time, so gates that depend on them poll.
// Native animation timelines are separate, so visible transitions have their
// own real-clock test below; fake time verifies the dwell/state contract only.
const STORIES = ['business.py', 'signal.sql', 'ai.py', 'product.py', 'translator.ts']
const OUTCOMES = ['better decisions.', 'clearer insights.', 'cleaner workflows.', 'clearer decisions.', 'shared clarity.']
const INTERVAL = 4_000
// The terminal's entrance delay before rotation becomes eligible. It starts at
// hydration, which the fake clock cannot pin to a moment: a remote origin
// hydrates later than localhost, so the boundary is located, not assumed.
const ARRIVAL = 450
const ARRIVAL_STEP = 10
const ARRIVAL_BUDGET = ARRIVAL + 2_000

// Lets React flush any pending commit/effect work before the fake clock moves.
async function settle(page: Page) {
  for (let i = 0; i < 2; i++) await page.evaluate(() => new Promise(resolve => { const channel = new MessageChannel(); channel.port1.onmessage = () => resolve(0); channel.port2.postMessage(0) }))
}
async function advance(page: Page, ms: number) { await settle(page); await page.clock.runFor(ms) }

// Walks the page clock in small steps until playback is eligible, so a dwell
// measured from here overshoots the real boundary by at most one step.
async function reachAutoPlayback(page: Page, terminal: Locator) {
  for (let elapsed = 0; elapsed <= ARRIVAL_BUDGET; elapsed += ARRIVAL_STEP) {
    if ((await terminal.getAttribute('data-playback')) === 'auto') return
    await advance(page, ARRIVAL_STEP)
  }
  throw new Error(`playback did not become eligible within ${ARRIVAL_BUDGET} ms of page time`)
}

async function setPageVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate(state => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
    document.dispatchEvent(new Event('visibilitychange'))
  }, state)
}

// Brings the terminal to the start of a dwell on the paused clock. When the page
// hydrated early enough for rotation to become eligible before the clock was
// paused (a remote origin still loading images while the entrance timer ran in
// real time), the running dwell has an unknown remainder; cycling page
// visibility ends it and starts a fresh one, because the terminal treats
// visibility as eligibility. Otherwise the boundary is simply located.
async function startFreshDwell(page: Page, terminal: Locator) {
  await expect(terminal).toHaveAttribute('data-active', 'true')
  if ((await terminal.getAttribute('data-playback')) === 'auto') {
    await setPageVisibility(page, 'hidden')
    await expect(terminal).toHaveAttribute('data-playback', 'inactive')
    await setPageVisibility(page, 'visible')
  }
  await reachAutoPlayback(page, terminal)
  await expect(terminal).toHaveAttribute('data-playback', 'auto')
}

async function openHero(page: Page, width = 1280, height = 800) {
  await page.setViewportSize({ width, height })
  await page.clock.install()
  await page.goto('/')
  await page.clock.pauseAt(new Date(Date.now() + 200))
  const terminal = page.locator('.sg-refined-terminal')
  await startFreshDwell(page, terminal)
  return terminal
}

test('stories advance every four seconds of eligible dwell, with the outcome paired', async ({ page }) => {
  const terminal = await openHero(page)
  await expect(terminal).toHaveAttribute('data-story', STORIES[0])
  for (let step = 1; step <= 5; step++) {
    await advance(page, INTERVAL - 100)
    await expect(terminal).toHaveAttribute('data-story', STORIES[(step - 1) % 5])
    await advance(page, 100)
    await expect(terminal).toHaveAttribute('data-story', STORIES[step % 5])
    await expect(page.locator('.sg-hero-outcome')).toHaveAttribute('data-outcome', OUTCOMES[step % 5])
  }
})

test('visible filename, code and outcome follow a complete automatic rotation', async ({ page }) => {
  // Use the browser's real clock for both JS and native animation timelines.
  // Fast-forwarding performance.now() can put a native animation's startTime
  // ahead of document.timeline; resuming fake time does not remove that offset.
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const terminal = page.locator('.sg-refined-terminal')
  await expect(terminal).toHaveAttribute('data-playback', 'auto')
  for (let step = 0; step <= STORIES.length; step++) {
    const index = step % STORIES.length
    await expect(terminal).toHaveAttribute('data-story', STORIES[index], { timeout: 7_000 })
    await expect(page.locator('.sg-refined-filename')).toContainText(STORIES[index])
    await expect(page.locator('.sg-typed-story')).toHaveAttribute('data-code-story', STORIES[index])
    await expect(page.locator('.sg-hero-outcome')).toHaveAttribute('data-outcome', OUTCOMES[index])
  }
})

test('hovering the body, title bar and tabs never pauses rotation', async ({ page }) => {
  const terminal = await openHero(page)
  for (const selector of ['.sg-refined-terminal-body', '.sg-refined-terminal-bar', '.sg-refined-story-tabs']) {
    const box = (await page.locator(selector).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 3)
    const before = STORIES.indexOf((await terminal.getAttribute('data-story'))!)
    await expect(terminal).toHaveAttribute('data-playback', 'auto')
    await advance(page, INTERVAL)
    await expect(terminal).toHaveAttribute('data-story', STORIES[(before + 1) % 5])
    await advance(page, INTERVAL)
    await expect(terminal).toHaveAttribute('data-story', STORIES[(before + 2) % 5])
  }
})

test('choosing a tab, including the selected one, restarts a single dwell', async ({ page }) => {
  const terminal = await openHero(page)
  const data = page.getByRole('tab', { name: 'Data' })
  await data.click()
  await expect(terminal).toHaveAttribute('data-story', 'signal.sql')
  await advance(page, 3_000)
  await data.click()
  await advance(page, 3_000)
  await expect(terminal).toHaveAttribute('data-story', 'signal.sql')
  await advance(page, 1_000)
  await expect(terminal).toHaveAttribute('data-story', 'ai.py')
  // Only one timer existed: the next change is a full interval later, not sooner.
  await advance(page, INTERVAL - 500)
  await expect(terminal).toHaveAttribute('data-story', 'ai.py')
  await advance(page, 500)
  await expect(terminal).toHaveAttribute('data-story', 'product.py')
})

test('the title-bar control pauses and resumes rotation', async ({ page }) => {
  const terminal = await openHero(page)
  await page.getByRole('button', { name: 'Pause story rotation' }).click()
  await expect(terminal).toHaveAttribute('data-playback', 'paused')
  await expect(page.getByRole('button', { name: 'Resume story rotation' })).toBeVisible()
  await advance(page, INTERVAL * 2 + 500)
  await expect(terminal).toHaveAttribute('data-story', STORIES[0])
  // A tab click while paused changes the story but does not clear the explicit pause.
  await page.getByRole('tab', { name: 'AI' }).click()
  await expect(terminal).toHaveAttribute('data-story', 'ai.py')
  await advance(page, INTERVAL * 2)
  await expect(terminal).toHaveAttribute('data-story', 'ai.py')
  await expect(terminal).toHaveAttribute('data-playback', 'paused')
  await page.getByRole('button', { name: 'Resume story rotation' }).click()
  await expect(terminal).toHaveAttribute('data-playback', 'auto')
  await advance(page, INTERVAL)
  await expect(terminal).toHaveAttribute('data-story', 'product.py')
})

test('keyboard entry pauses until an explicit resume; arrows, Home and End still navigate', async ({ page }) => {
  const terminal = await openHero(page)
  // Tabbing into the terminal lands on the control first and latches the pause.
  let inside = ''
  for (let presses = 0; presses < 20 && !inside; presses++) {
    await page.keyboard.press('Tab')
    inside = await page.evaluate(() => document.activeElement?.closest('.sg-refined-terminal') ? document.activeElement!.className : '')
  }
  expect(inside).toBe('sg-terminal-playback')
  await expect(page.getByRole('button', { name: 'Resume story rotation' })).toBeFocused()
  await expect(terminal).toHaveAttribute('data-playback', 'keyboard')
  await advance(page, INTERVAL * 2 + 500)
  await expect(terminal).toHaveAttribute('data-story', STORIES[0])
  await page.keyboard.press('Tab')
  await expect(page.getByRole('tabpanel')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('tab', { name: 'Business' })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Data' })).toBeFocused()
  await expect(terminal).toHaveAttribute('data-story', 'signal.sql')
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: 'Bridge' })).toBeFocused()
  await expect(terminal).toHaveAttribute('data-story', 'translator.ts')
  await page.keyboard.press('ArrowRight')
  await expect(terminal).toHaveAttribute('data-story', 'business.py')
  await page.keyboard.press('ArrowLeft')
  await expect(terminal).toHaveAttribute('data-story', 'translator.ts')
  await page.keyboard.press('Home')
  await expect(terminal).toHaveAttribute('data-story', 'business.py')
  await advance(page, INTERVAL * 2)
  await expect(terminal).toHaveAttribute('data-story', 'business.py')
  // Escape is not intercepted, and leaving the terminal keeps the pause.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tab', { name: 'Business' })).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.sg-refined-terminal')))).toBe(false)
  await expect(terminal).toHaveAttribute('data-playback', 'keyboard')
  await advance(page, INTERVAL * 2)
  await expect(terminal).toHaveAttribute('data-story', 'business.py')
  // Explicit resume from the control, activated by keyboard, lets rotation continue while it keeps focus.
  await page.getByRole('button', { name: 'Resume story rotation' }).focus()
  await page.keyboard.press('Enter')
  await expect(terminal).toHaveAttribute('data-playback', 'auto')
  await expect(page.getByRole('button', { name: 'Pause story rotation' })).toBeFocused()
  await advance(page, INTERVAL)
  await expect(terminal).toHaveAttribute('data-story', 'signal.sql')
  // Moving keyboard focus onto a tab pauses again.
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('tab', { name: 'Data' })).toBeFocused()
  await expect(terminal).toHaveAttribute('data-playback', 'keyboard')
})

test('a hidden page or an offscreen terminal stops rotation without a catch-up burst', async ({ page }) => {
  const terminal = await openHero(page)
  await setPageVisibility(page, 'hidden')
  await expect(terminal).toHaveAttribute('data-playback', 'inactive')
  await advance(page, INTERVAL * 3)
  await expect(terminal).toHaveAttribute('data-story', STORIES[0])
  await setPageVisibility(page, 'visible')
  await expect(terminal).toHaveAttribute('data-playback', 'auto')
  await advance(page, INTERVAL)
  await expect(terminal).toHaveAttribute('data-story', STORIES[1])
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(terminal).toHaveAttribute('data-playback', 'inactive')
  await advance(page, INTERVAL * 3)
  await expect(terminal).toHaveAttribute('data-story', STORIES[1])
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(terminal).toHaveAttribute('data-playback', 'auto')
  await advance(page, INTERVAL)
  await expect(terminal).toHaveAttribute('data-story', STORIES[2])
})

test('client navigation away and back leaves exactly one timer', async ({ page }) => {
  const terminal = await openHero(page)
  await page.getByRole('link', { name: 'About' }).first().click()
  await expect(page).toHaveURL(/\/about$/)
  await page.getByRole('link', { name: 'Home' }).first().click()
  await expect(page).toHaveURL(/\/$/)
  await startFreshDwell(page, terminal)
  await advance(page, INTERVAL)
  await expect(terminal).toHaveAttribute('data-story', STORIES[1])
  await advance(page, INTERVAL - 200)
  await expect(terminal).toHaveAttribute('data-story', STORIES[1])
  await advance(page, 200)
  await expect(terminal).toHaveAttribute('data-story', STORIES[2])
})

test('reduced motion shows whole stories at once, never cycles, and keeps every story reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install()
  await page.goto('/')
  await page.clock.pauseAt(new Date(Date.now() + 200))
  const terminal = page.locator('.sg-refined-terminal')
  await expect(terminal).toHaveAttribute('data-playback', 'reduced')
  await expect(page.getByRole('button', { name: 'Automatic rotation disabled by motion preference' })).toBeDisabled()
  await expect(page.locator('.sg-typed-story')).toHaveAttribute('data-writing', 'false')
  await advance(page, INTERVAL * 3)
  await expect(terminal).toHaveAttribute('data-story', STORIES[0])
  for (const [i, name] of ['Business', 'Data', 'AI', 'Product', 'Bridge'].entries()) {
    await page.getByRole('tab', { name }).click()
    await expect(terminal).toHaveAttribute('data-story', STORIES[i])
    await expect(page.locator('.sg-typed-story')).toHaveAttribute('data-writing', 'false')
    await expect(page.locator('.sg-typed-story .sg-code-written').last()).not.toBeEmpty()
    await expect(page.locator('.sg-hero-outcome')).toHaveAttribute('data-outcome', OUTCOMES[i])
    await advance(page, INTERVAL)
    await expect(terminal).toHaveAttribute('data-story', STORIES[i])
  }
})

for (const width of [320, 375, 428, 1280]) {
  test(`all five stories keep the terminal's dimensions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const terminal = page.locator('.sg-refined-terminal')
    const sizes: string[] = []
    for (const name of ['Business', 'Data', 'AI', 'Product', 'Bridge']) {
      await page.getByRole('tab', { name }).click()
      await expect(terminal).toHaveAttribute('data-story', STORIES[['Business', 'Data', 'AI', 'Product', 'Bridge'].indexOf(name)])
      sizes.push(await terminal.evaluate(element => {
        const body = element.querySelector('.sg-refined-terminal-body')!
        const bar = element.querySelector('.sg-refined-terminal-bar')!.getBoundingClientRect()
        const button = element.querySelector('.sg-terminal-playback')!.getBoundingClientRect()
        const box = element.getBoundingClientRect()
        return JSON.stringify({ width: box.width, height: box.height, bar: bar.height, button: [button.width, button.height], overflow: body.scrollWidth > body.clientWidth })
      }))
    }
    expect(new Set(sizes).size).toBe(1)
    const size = JSON.parse(sizes[0])
    expect(size.overflow).toBe(false)
    expect(size.bar).toBe(width < 768 ? 38 : 44)
    expect(size.button).toEqual([44, 44])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })
}
