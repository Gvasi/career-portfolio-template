import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function harness(options = {}) {
  const effects = [], listeners = new Map(), captures = new Set(), steps = []
  let now = 1000, starts = 0
  const root = {
    clientHeight: 200,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
    hasPointerCapture: id => captures.has(id),
    setPointerCapture: id => captures.add(id),
  }
  const exports = {}
  const source = ts.transpileModule(readFileSync(new URL('../../src/hooks/useCollectionGesture.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(source, { exports, require: () => ({ useRef: current => ({ current }), useEffect: fn => effects.push(fn) }), performance: { now: () => now }, window: { matchMedia: () => ({ matches: true }) } })
  exports.useCollectionGesture({ current: root }, direction => steps.push(direction), { onStart: () => starts++, ...options })
  const module = exports
  const cleanup = effects.map(fn => fn()).filter(Boolean)
  return {
    steps, captures, starts: () => starts, listeners, module,
    advance: () => { now += 500 },
    tick: ms => { now += ms },
    send: (name, patch = {}) => {
      const event = { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 200, clientY: 100, prevented: false, stopped: false, preventDefault() { this.prevented = true }, stopPropagation() { this.stopped = true }, ...patch }
      listeners.get(name)?.(event)
      return event
    },
    cleanup: () => cleanup.forEach(fn => fn()),
  }
}

test('taps retain their original button target and click', () => {
  const h = harness()
  h.send('pointerdown'); h.send('pointerup', { clientX: 202 })
  assert.deepEqual(h.steps, [])
  assert.equal(h.captures.size, 0)
  assert.equal(h.send('click').prevented, false)
})

test('horizontal swipes capture the pointer, step once, and suppress the synthetic click', () => {
  const h = harness()
  h.send('pointerdown'); h.send('pointermove', { clientX: 150 }); h.send('pointerup', { clientX: 90 })
  assert.equal(h.captures.has(1), true)
  assert.deepEqual(h.steps, [1])
  assert.equal(h.send('click').prevented, true)
  h.advance()
  assert.equal(h.send('click').prevented, false)
  h.send('pointerdown'); h.send('pointerup', { clientX: 300 })
  assert.deepEqual(h.steps, [1, -1])
  assert.equal(h.starts(), 2)
})

test('vertical scrolling and cancelled touches never select a project', () => {
  const h = harness()
  h.send('pointerdown'); h.send('pointermove', { clientX: 195, clientY: 160 }); h.send('pointerup', { clientX: 100, clientY: 160 })
  h.send('pointerdown'); h.send('pointercancel'); h.send('pointerup', { clientX: 100 })
  assert.deepEqual(h.steps, [])
  assert.equal(h.captures.size, 0)
})

test('mouse dragging is opt-in and secondary pointers cannot finish a gesture', () => {
  const off = harness()
  off.send('pointerdown', { pointerType: 'mouse' }); off.send('pointerup', { pointerType: 'mouse', clientX: 100 })
  assert.deepEqual(off.steps, [])
  const on = harness({ drag: true })
  on.send('pointerdown', { pointerType: 'mouse' }); on.send('pointerup', { pointerType: 'mouse', pointerId: 2, clientX: 100 })
  assert.deepEqual(on.steps, [])
  on.send('pointerup', { pointerType: 'mouse', clientX: 100 })
  assert.deepEqual(on.steps, [1])
  on.cleanup()
  assert.equal(on.listeners.size, 0)
})

const wheel = (h, deltaY, patch = {}) => h.send('wheel', { deltaY, deltaX: 0, deltaMode: 0, cancelable: true, ctrlKey: false, metaKey: false, shiftKey: false, ...patch })

test('every mouse notch steps the reel at once, with no wait between notches', () => {
  const h = harness({ wheel: true })
  wheel(h, 100); h.tick(60); wheel(h, 100); h.tick(60); wheel(h, 100)
  assert.deepEqual(h.steps, [1, 1, 1])
  h.tick(60); wheel(h, -100)
  assert.deepEqual(h.steps, [1, 1, 1, -1])
})

test('line-mode wheels step once per notch', () => {
  const h = harness({ wheel: true })
  wheel(h, 3, { deltaMode: 1 }); h.tick(60); wheel(h, 3, { deltaMode: 1 })
  assert.deepEqual(h.steps, [1, 1])
})

test('trackpad deltas accumulate to one step per 60px', () => {
  const h = harness({ wheel: true })
  wheel(h, 20); h.tick(16); wheel(h, 20)
  assert.deepEqual(h.steps, [])
  h.tick(16); wheel(h, 20)
  assert.deepEqual(h.steps, [1])
  h.tick(16); wheel(h, 30); h.tick(16); wheel(h, 30)
  assert.deepEqual(h.steps, [1, 1])
})

test('reversing direction restarts the accumulation', () => {
  const h = harness({ wheel: true })
  wheel(h, 40); h.tick(16); wheel(h, -40); h.tick(16); wheel(h, -10)
  assert.deepEqual(h.steps, [])
  h.tick(16); wheel(h, -10)
  assert.deepEqual(h.steps, [-1])
})

test('a pause longer than 220ms drops partial accumulation', () => {
  const h = harness({ wheel: true })
  wheel(h, 40); h.tick(300); wheel(h, 40)
  assert.deepEqual(h.steps, [])
  h.tick(16); wheel(h, 20)
  assert.deepEqual(h.steps, [1])
})

test('vertical wheel over the reel never scrolls the page, even below the step threshold', () => {
  const h = harness({ wheel: true })
  assert.equal(wheel(h, 10).prevented, true)
  assert.deepEqual(h.steps, [])
})

test('horizontal and modifier wheels pass through to the browser', () => {
  const h = harness({ wheel: true })
  assert.equal(wheel(h, 10, { deltaX: 40 }).prevented, false)
  assert.equal(wheel(h, 100, { ctrlKey: true }).prevented, false)
  assert.deepEqual(h.steps, [])
})

test('non-cancelable wheel events are left to the page: no preventDefault, no step', () => {
  const h = harness({ wheel: true })
  const event = wheel(h, 100, { cancelable: false })
  assert.equal(event.prevented, false)
  assert.deepEqual(h.steps, [])
  // The next cancelable notch still steps normally.
  h.tick(16)
  assert.equal(wheel(h, 100).prevented, true)
  assert.deepEqual(h.steps, [1])
})

test('page-mode deltas use the element height and shift/meta wheels pass through', () => {
  const h = harness({ wheel: true })
  assert.equal(wheel(h, 1, { deltaMode: 2 }).prevented, true)
  assert.deepEqual(h.steps, [1])
  assert.equal(wheel(h, 100, { shiftKey: true }).prevented, false)
  assert.equal(wheel(h, 100, { metaKey: true }).prevented, false)
  assert.equal(wheel(h, 0).prevented, false)
  assert.deepEqual(h.steps, [1])
})

test('a disabled collection attaches no listeners, and cleanup removes the wheel listener too', () => {
  const off = harness({ wheel: true, disabled: true })
  assert.equal(off.listeners.size, 0)
  const on = harness({ wheel: true })
  assert.equal(on.listeners.has('wheel'), true)
  on.cleanup()
  assert.equal(on.listeners.size, 0)
})

test('the pure accumulator reproduces the notch, trackpad, reversal and idle rules', () => {
  const { createWheelAccumulator, accumulateWheelSteps, WHEEL_STEP_PIXELS, WHEEL_IDLE_RESET_MS, COARSE_WHEEL_DELTA } = harness().module
  assert.deepEqual([COARSE_WHEEL_DELTA, WHEEL_STEP_PIXELS, WHEEL_IDLE_RESET_MS], [50, 60, 220])
  const state = createWheelAccumulator()
  assert.equal(accumulateWheelSteps(state, { delta: 100, coarse: true, now: 1000 }), 1)
  assert.equal(accumulateWheelSteps(state, { delta: -100, coarse: true, now: 1016 }), -1)
  assert.equal(accumulateWheelSteps(state, { delta: 20, coarse: false, now: 1032 }), 0)
  assert.equal(accumulateWheelSteps(state, { delta: 20, coarse: false, now: 1048 }), 0)
  assert.equal(accumulateWheelSteps(state, { delta: 20, coarse: false, now: 1064 }), 1)
  assert.equal(state.total, 0)
  assert.equal(accumulateWheelSteps(state, { delta: 40, coarse: false, now: 1080 }), 0)
  assert.equal(accumulateWheelSteps(state, { delta: -40, coarse: false, now: 1096 }), 0)
  assert.equal(state.total, -40)
  assert.equal(accumulateWheelSteps(state, { delta: 40, coarse: false, now: 1096 + WHEEL_IDLE_RESET_MS + 1 }), 0)
  assert.equal(state.total, 40)
  assert.equal(accumulateWheelSteps(state, { delta: 0, coarse: false, now: 1400 }), 0)
  // 40 carried + 130 = 170: two steps, 50 left over.
  assert.equal(accumulateWheelSteps(state, { delta: 130, coarse: false, now: 1416 }), 2)
  assert.equal(state.total, 50)
})
