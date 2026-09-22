import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, mock, test } from 'node:test'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { google } from 'googleapis'

// The callback writes the refresh token to `.env.local` in the working
// directory, so this process moves into a scratch directory before the route
// module resolves that path. The working directory's own `.env.local` (if any)
// is never read into a fixture, copied or removed: only its fingerprint is kept
// in memory to prove it is untouched afterwards, whether it exists or not.
function fileFingerprint(file) {
  try {
    return createHash('sha256').update(readFileSync(file)).digest('hex')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}
const originalCwd = process.cwd()
const originalEnvPath = path.join(originalCwd, '.env.local')
const originalEnvBefore = fileFingerprint(originalEnvPath)
const scratch = mkdtempSync(path.join(tmpdir(), 'portfolio-oauth-'))
let callback, start, NextRequest
try {
  process.chdir(scratch)
  try {
    ;({ GET: callback } = await import('../../src/app/api/google/oauth/callback/route.ts'))
    ;({ GET: start } = await import('../../src/app/api/google/oauth/start/route.ts'))
    ;({ NextRequest } = await import('next/server'))
  } finally {
    process.chdir(originalCwd)
  }
} catch (error) {
  rmSync(scratch, { recursive: true, force: true })
  throw error
}
after(() => { rmSync(scratch, { recursive: true, force: true }) })
const assertOriginalEnvUntouched = () => {
  assert.equal(fileFingerprint(originalEnvPath) === originalEnvBefore, true, 'the working directory .env.local changed (or appeared/disappeared) during the OAuth fixture')
}

const before = { ...process.env }
let oauthCalls, errors
beforeEach(() => {
  process.env.NODE_ENV = 'test'; delete process.env.VERCEL
  Object.assign(process.env, { GOOGLE_WORKSPACE_CLIENT_ID: 'test-client', GOOGLE_WORKSPACE_CLIENT_SECRET: 'test-secret' })
  oauthCalls = []
  errors = []
  mock.method(console, 'error', (...args) => { errors.push(args) })
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request in OAuth test') })
})
afterEach(() => {
  mock.restoreAll()
  rmSync(path.join(scratch, '.env.local'), { force: true })
  for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
  Object.assign(process.env, before)
  // Holds after successes and failures alike: the fixture only ever wrote inside the scratch directory.
  assertOriginalEnvUntouched()
})

const callbackRequest = (url, cookieState) => {
  const request = new NextRequest(url, { headers: cookieState ? { cookie: `google_workspace_oauth_state=${cookieState}` } : {} })
  return callback(request)
}

function mockOAuthClient({ getToken, userinfo }) {
  mock.method(google.auth, 'OAuth2', function OAuth2(...args) {
    oauthCalls.push(args)
    return { getToken, setCredentials() {}, generateAuthUrl: () => 'https://accounts.google.com/o/oauth2/auth?client_id=test-client' }
  })
  mock.method(google, 'oauth2', () => ({ userinfo: { get: userinfo } }))
}

test('production and non-local requests are rejected before any provider call or write', async () => {
  mockOAuthClient({ getToken: async () => { throw new Error('must not be called') }, userinfo: async () => { throw new Error('must not be called') } })
  process.env.NODE_ENV = 'production'
  assert.equal((await callbackRequest('http://localhost:3000/api/google/oauth/callback?code=abc&state=s', 's')).status, 403)
  assert.equal((await start(new Request('http://localhost:3000/api/google/oauth/start'))).status, 403)
  process.env.NODE_ENV = 'test'
  assert.equal((await callbackRequest('https://www.example.com/api/google/oauth/callback?code=abc&state=s', 's')).status, 403)
  assert.equal((await start(new Request('https://www.example.com/api/google/oauth/start'))).status, 403)
  assert.equal(oauthCalls.length, 0)
  assert.equal(existsSync(path.join(scratch, '.env.local')), false)
})

test('missing code and state mismatch are rejected without a token exchange', async () => {
  mockOAuthClient({ getToken: async () => { throw new Error('must not be called') }, userinfo: async () => { throw new Error('must not be called') } })
  assert.equal((await callbackRequest('http://localhost:3000/api/google/oauth/callback?state=s', 's')).status, 400)
  assert.equal((await callbackRequest('http://localhost:3000/api/google/oauth/callback?code=abc&state=other', 's')).status, 400)
  assert.equal((await callbackRequest('http://localhost:3000/api/google/oauth/callback?code=abc&state=s')).status, 400)
  assert.equal(oauthCalls.length, 0)
})

test('a provider failure logs one fixed line without the error, URL or token material', async () => {
  const providerError = Object.assign(new Error('invalid_grant'), { response: { status: 400, data: { error: 'invalid_grant', secret: 'raw-provider-body-4XyZ' } }, config: { url: 'https://oauth2.googleapis.com/token?code=abc' } })
  mockOAuthClient({ getToken: async () => { throw providerError }, userinfo: async () => { throw new Error('must not be called') } })
  const response = await callbackRequest('http://localhost:3000/api/google/oauth/callback?code=abc&state=s', 's')
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'Failed to complete Google authorization.' })
  assert.deepEqual(errors.filter(args => !String(args[0]).includes('[MODULE_TYPELESS_PACKAGE_JSON]')), [['Google OAuth callback failed.']])
  assert.equal(existsSync(path.join(scratch, '.env.local')), false)
})

test('a successful exchange writes the token to the scratch env file and escapes the account email in HTML', async () => {
  mockOAuthClient({ getToken: async () => ({ tokens: { refresh_token: 'refresh-fixture', access_token: 'access-fixture' } }), userinfo: async () => ({ data: { email: 'owner<script>@example.com' } }) })
  const response = await callbackRequest('http://localhost:3000/api/google/oauth/callback?code=abc&state=s', 's')
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.ok(html.includes('owner&lt;script&gt;@example.com'))
  assert.ok(!html.includes('refresh-fixture'))
  assert.match(response.headers.get('set-cookie') ?? '', /google_workspace_oauth_state=;/)
  const written = readFileSync(path.join(scratch, '.env.local'), 'utf8')
  assert.ok(written.includes('GOOGLE_WORKSPACE_REFRESH_TOKEN="refresh-fixture"'))
  assert.ok(written.includes('GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL="owner<script>@example.com"'))
  assertOriginalEnvUntouched()
  // Node's own module-type warning may share console.error; the route itself logged nothing.
  assert.deepEqual(errors.filter(args => String(args[0]).includes('OAuth')), [])
})

test('the start route sets a state cookie and redirects without contacting Google', async () => {
  mockOAuthClient({ getToken: async () => { throw new Error('must not be called') }, userinfo: async () => { throw new Error('must not be called') } })
  const response = await start(new Request('http://localhost:3000/api/google/oauth/start'))
  assert.ok([302, 307].includes(response.status))
  assert.match(response.headers.get('location') ?? '', /^https:\/\/accounts\.google\.com\//)
  assert.match(response.headers.get('set-cookie') ?? '', /google_workspace_oauth_state=[^;]+; .*HttpOnly/i)
})
