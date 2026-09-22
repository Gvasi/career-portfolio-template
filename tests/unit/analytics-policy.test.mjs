import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Test the real TypeScript in an isolated runtime; no browser automation or provider requests.
function moduleFrom(file, globals = {}, dependencies = {}) {
  const exports = {}
  const source = ts.transpileModule(readFileSync(new URL(`../../src/lib/analytics/${file}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(source, { exports, require: name => {
    if (name in dependencies) return dependencies[name]
    throw new Error(`Unexpected dependency: ${name}`)
  }, console, URL, ...globals })
  return exports
}
// The policy derives its origin and project allowlist from the public site configuration; fixtures stand in for it here.
const siteFixture = { site: { url: 'https://portfolio.example.com' }, SITE_HOST: 'portfolio.example.com', SITE_URL: 'https://portfolio.example.com' }
const projectsFixture = { projects: [{ id: 'this-portfolio' }, { id: 'research-dashboard' }] }
const policy = moduleFrom('policy', {}, { '@/config/site': siteFixture, '@/content/projects': projectsFixture })
const id = '019932aa-aaaa-7aaa-8aaa-aaaaaaaaaaaa'
function harness({ origin = policy.ANALYTICS_ORIGIN, dnt = '0', sdkFails = false } = {}) {
  const stored = new Map()
  const storage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) }
  const events = [], scripts = []
  let config, imports = 0, optedOut = false
  const sdk = {
    init: (_token, options) => { config = options },
    capture: (event, properties = {}) => {
      const result = config.before_send({ event, properties: { ...properties, token: 'phc_test', distinct_id: id, $session_id: id, $device_type: 'Desktop', $current_url: 'https://example.com/?email=secret@example.com', email: 'secret@example.com', $initial_utm_campaign: 'private' } })
      if (result && !optedOut) events.push(result)
    },
    opt_out_capturing: () => { optedOut = true },
    opt_in_capturing: () => { optedOut = false },
    has_opted_out_capturing: () => optedOut,
    get_distinct_id: () => id, get_session_id: () => id,
  }
  const location = { origin, hostname: new URL(origin).hostname, pathname: '/' }
  const window = { location, dispatchEvent: () => true }
  const dependencies = { './policy': policy, '@/config/site': siteFixture }
  Object.defineProperty(dependencies, 'posthog-js', { get() { imports++; if (sdkFails) throw new Error('blocked'); return sdk } })
  const api = moduleFrom('client', {
    process: { env: { NODE_ENV: 'production', NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test', NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com', NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST123' } },
    window, location, Event, navigator: { doNotTrack: dnt }, localStorage: storage, sessionStorage: storage,
    document: { referrer: 'https://www.google.com/search?q=private', cookie: '', createElement: () => ({}), head: { appendChild: el => scripts.push(el) } },
  }, dependencies)
  const save = value => storage.setItem(policy.CONSENT_KEY, JSON.stringify({ choice: value, at: Date.now() }))
  return { api, save, events, scripts, window, location, stored, storage, config: () => config, imports: () => imports }
}

test('consent expires, malformed values fail closed, and arbitrary routes/properties are excluded', () => {
  for (const raw of [null, 'broken', '{}', JSON.stringify({ choice: 'accepted', at: Date.now() + 10000 }), JSON.stringify({ choice: 'accepted', at: 0 })]) assert.equal(policy.parseConsent(raw), null)
  assert.equal(policy.safePath('/contact?email=private'), '/other')
  assert.equal(JSON.stringify(policy.safeProperties({ project_id: 'private', email: 'secret' })), '{}')
  assert.equal(policy.validAnonymousId('someone@example.com'), false)
})

test('unknown/declined consent, localhost, previews and DNT never load providers or return tracking headers', async () => {
  for (const settings of [{}, { origin: 'http://localhost:3000' }, { origin: 'https://preview.vercel.app' }, { dnt: '1' }]) {
    const h = harness(settings)
    await h.api.syncAnalyticsConsent(null)
    await h.api.trackPage('/')
    assert.equal(h.imports(), 0)
    if (Object.keys(settings).length) { h.save('accepted'); await h.api.syncAnalyticsConsent('accepted') }
    else { h.save('declined'); await h.api.syncAnalyticsConsent('declined') }
    await h.api.trackEvent('contact_started')
    assert.equal(h.imports(), 0)
    assert.equal(h.scripts.length, 0)
    assert.equal(JSON.stringify(h.api.analyticsHeaders()), '{}')
  }
})

test('consented route views deduplicate, payloads exclude private fields and conversions have one PostHog authority', async () => {
  const h = harness(); h.save('accepted')
  await h.api.syncAnalyticsConsent('accepted')
  await Promise.all([h.api.trackPage('/'), h.api.trackPage('/')])
  assert.equal(h.events.length, 1)
  h.location.pathname = '/about'
  await h.api.trackPage('/about')
  await h.api.trackEvent('project_opened', { project_id: 'this-portfolio', cta_source: 'project_section' })
  await h.api.trackEvent('contact_succeeded')
  assert.equal(h.events.length, 3)
  assert.equal(h.events[2].properties.project_id, 'this-portfolio')
  // PostHog drops events if before_send removes this required routing property.
  for (const event of h.events) assert.equal(event.properties.token, 'phc_test')
  assert.equal(/secret|private|email|\?/.test(JSON.stringify(h.events)), false)
  assert.equal(h.config().disable_session_recording, true)
  assert.equal(h.config().autocapture, false)
  assert.equal(h.config().advanced_disable_flags, true)
  assert.equal(h.api.analyticsHeaders()['X-POSTHOG-DISTINCT-ID'], id)
  assert.equal(h.scripts.length, 1)
})

test('withdrawal during lazy loading prevents late initialization and collection', async () => {
  const h = harness(); h.save('accepted')
  const loading = h.api.syncAnalyticsConsent('accepted')
  h.save('declined'); await h.api.syncAnalyticsConsent('declined'); await loading
  await h.api.trackPage('/')
  assert.equal(h.config(), undefined)
  assert.equal(h.events.length, 0)
  assert.equal(h.window['ga-disable-G-TEST123'], true)
  assert.equal(JSON.stringify(h.api.analyticsHeaders()), '{}')
})

test('withdrawal and owner exclusion stop an initialized SDK; blocked SDK never breaks a form', async () => {
  const h = harness(); h.save('accepted'); await h.api.syncAnalyticsConsent('accepted')
  h.save('declined'); await h.api.syncAnalyticsConsent('declined'); await h.api.trackEvent('cv_clicked')
  assert.equal(h.events.length, 0)
  h.stored.set(policy.OWNER_KEY, 'true'); h.save('accepted'); await h.api.syncAnalyticsConsent('accepted')
  assert.equal(JSON.stringify(h.api.analyticsHeaders()), '{}')
  const blocked = harness({ sdkFails: true }); blocked.save('accepted')
  await assert.doesNotReject(blocked.api.syncAnalyticsConsent('accepted'))
  assert.equal(JSON.stringify(blocked.api.analyticsHeaders()), '{}')
})

test('server outcomes require consent and production origin, run after response and reuse booking UUID', async () => {
  const jobs = [], events = []
  const api = moduleFrom('server', { process: { env: { VERCEL_ENV: 'production', NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test', NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com' } } }, {
    './policy': policy, 'next/server': { after: work => jobs.push(work) },
    'posthog-node': { PostHog: class { capture(event) { events.push(event) } async shutdown() {} } },
  })
  const request = headers => ({ headers: new Headers(headers) })
  const headers = { origin: policy.ANALYTICS_ORIGIN, 'X-Analytics-Consent': 'accepted', 'X-POSTHOG-DISTINCT-ID': id }
  for (const patch of [{ origin: 'http://localhost:3000' }, { 'X-Analytics-Consent': 'declined' }, { 'X-POSTHOG-DISTINCT-ID': 'email@example.com' }]) api.recordServerOutcome(request({ ...headers, ...patch }), 'booking_succeeded', id)
  assert.equal(jobs.length, 0)
  api.recordServerOutcome(request(headers), 'booking_succeeded', id)
  assert.equal(events.length, 0)
  await jobs[0]()
  assert.equal(events[0].uuid, id)
  assert.equal(JSON.stringify(events).includes('email'), false)
})

test('explicit Accept replaces legacy exclusion; direct Decline stops providers', async () => {
  const h = harness()
  h.stored.set(policy.OWNER_KEY, 'true')
  assert.equal(h.api.saveConsentChoice('accepted'), true)
  await h.api.trackPage('/')
  assert.equal(h.stored.has(policy.OWNER_KEY), false)
  assert.equal(h.api.readConsent(), 'accepted')
  assert.equal(h.events.length, 1)
  assert.equal(h.api.saveConsentChoice('declined'), true)
  await h.api.trackEvent('contact_started')
  assert.equal(h.events.length, 1)
  assert.equal(h.api.readConsent(), 'declined')
  assert.equal(h.window['ga-disable-G-TEST123'], true)
})

test('a failed preference write disables tracking immediately, even after acceptance', async () => {
  const h = harness()
  h.save('accepted')
  await h.api.syncAnalyticsConsent('accepted')
  h.storage.setItem = () => { throw new Error('storage unavailable') }
  assert.equal(h.api.saveConsentChoice('declined'), false)
  await h.api.trackEvent('contact_started')
  assert.equal(h.events.length, 0)
  assert.equal(h.window['ga-disable-G-TEST123'], true)
  assert.equal(JSON.stringify(h.api.analyticsHeaders()), '{}')
})
