// Records the raw wheel packets the project reel receives from a real mouse or
// trackpad, one labelled action at a time, and shows how many steps the reel's
// wheel accumulator makes of each. Manual only; never part of the automated suites.
//
//   node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs tests/manual/wheel-trace-capture.mjs [baseUrl] [outFile]
//
// A headed Chromium opens at the reel. For each prompted action press Enter,
// perform the action once over the reel, then wait; the capture closes after a
// second of silence. The trace is written as JSON so it can become a labelled
// fixture. Synthetic tests cannot replace this: only a physical device shows
// how its packets are really shaped.
import { createInterface } from 'node:readline/promises'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { accumulateWheelSteps, createWheelAccumulator, COARSE_WHEEL_DELTA } from '../../src/hooks/useCollectionGesture.ts'

const [baseUrl = 'http://localhost:3000', outFile = path.join('output', 'wheel-traces', `trace-${Date.now()}.json`)] = process.argv.slice(2)
const ACTIONS = [
  'one mouse notch (expect one project)',
  'three rapid notches in the same direction (expect three projects)',
  'one trackpad flick (expect one project per 60 px of travel, following the fingers)',
  'one deliberate reversal (expect the reel to turn back at once)',
]
const SILENCE_MS = 1_000

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(baseUrl + '/')
const reel = page.getByRole('group', { name: 'Project reel', exact: true })
await reel.scrollIntoViewIfNeeded()
await page.evaluate(() => {
  const stage = document.querySelector('[data-project-stage]')
  const log = { packets: [], changes: [] }
  Object.assign(window, { __trace: log })
  document.querySelector('[data-project-reel]').addEventListener('wheel', event => {
    log.packets.push({ deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode, timeMs: event.timeStamp, cancelable: event.cancelable, modifier: event.ctrlKey || event.metaKey || event.shiftKey })
  }, true)
  new MutationObserver(() => log.changes.push({ active: stage.dataset.active, timeMs: performance.now() })).observe(stage, { attributes: true, attributeFilter: ['data-active'] })
})
const readTrace = () => page.evaluate(() => { const log = window.__trace; const copy = { packets: log.packets.slice(), changes: log.changes.slice() }; log.packets.length = 0; log.changes.length = 0; return copy })

const prompt = createInterface({ input: process.stdin, output: process.stdout })
// A closed stdin (piped input, Ctrl+D) ends the session and still writes what was captured.
const ask = question => prompt.question(question).catch(() => null)
const trace = { baseUrl, userAgent: await page.evaluate(() => navigator.userAgent), platform: process.platform, capturedAt: new Date().toISOString(), device: '', actions: [] }
trace.device = (await ask('Which device is this? (e.g. "Logitech mouse", "Windows precision touchpad", "MacBook trackpad"): ')) ?? 'unknown'
for (const label of ACTIONS) {
  if ((await ask(`\nNext: ${label}. Press Enter, then perform it once over the reel...`)) === null) break
  await readTrace()
  // Wait for the first packet, then for a second of silence.
  await page.waitForFunction(() => window.__trace.packets.length > 0, null, { timeout: 30_000 }).catch(() => null)
  await page.waitForFunction(silence => { const packets = window.__trace.packets; return packets.length > 0 && performance.now() - packets[packets.length - 1].timeMs > silence }, SILENCE_MS, { timeout: 30_000 }).catch(() => null)
  const { packets, changes } = await readTrace()
  const state = createWheelAccumulator()
  // Line packets are scaled like the hook does (16 px per line); page packets use a nominal reel height.
  const policySteps = packets.filter(packet => !packet.modifier && packet.cancelable && Math.abs(packet.deltaX) <= Math.abs(packet.deltaY)).map(packet => {
    const delta = packet.deltaY * (packet.deltaMode === 1 ? 16 : packet.deltaMode === 2 ? 200 : 1)
    return accumulateWheelSteps(state, { delta, coarse: packet.deltaMode !== 0 || Math.abs(delta) >= COARSE_WHEEL_DELTA, now: packet.timeMs })
  }).filter(Boolean)
  trace.actions.push({ label, packets, reelChanges: changes, policySteps })
  const gaps = packets.slice(1).map((packet, index) => Math.round(packet.timeMs - packets[index].timeMs))
  console.log(`  ${packets.length} packets | deltaY ${packets.map(p => Math.round(p.deltaY)).join(',')} | gaps ${gaps.join(',')} ms | mode ${[...new Set(packets.map(p => p.deltaMode))].join('/')}`)
  console.log(`  accumulator steps ${JSON.stringify(policySteps)} | reel changes seen ${changes.length}`)
}
prompt.close()
await browser.close()
mkdirSync(path.dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(trace, null, 2))
console.log(`\nTrace written to ${outFile}`)
