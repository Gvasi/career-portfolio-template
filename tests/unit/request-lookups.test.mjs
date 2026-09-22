import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { POST as contact } from '../../src/app/api/contact/route.ts'
import { readLimitedJson, InvalidJsonBodyError, RequestBodyTooLargeError } from '../../src/lib/security/requestGuards.ts'
import { getInitialTopic } from '../../src/app/contact/useContactForm.ts'

// User-supplied keys are looked up on plain objects; inherited names such as
// "constructor" survive normalisation and must fall back like any unknown key.
const before = { ...process.env }
let sentSubjects
beforeEach(() => {
  process.env.NODE_ENV = 'test'; delete process.env.VERCEL
  for (const key of ['TURNSTILE_SECRET_KEY', 'TURNSTILE_ALLOWED_HOSTNAMES', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) delete process.env[key]
  Object.assign(process.env, {
    GOOGLE_WORKSPACE_CLIENT_ID: 'test-client', GOOGLE_WORKSPACE_CLIENT_SECRET: 'test-secret', GOOGLE_WORKSPACE_REFRESH_TOKEN: 'test-refresh',
    CONTACT_TO_EMAIL: 'owner@example.com', GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL: 'owner@example.com',
  })
  sentSubjects = []
  mock.method(google, 'gmail', () => ({ users: { messages: { send: async ({ requestBody }) => { const raw = Buffer.from(requestBody.raw, 'base64url').toString(); sentSubjects.push(/^Subject: (.*)$/m.exec(raw)?.[1]); return { data: { id: 'test-mail' } } } } } }))
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request in lookup test') })
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
  Object.assign(process.env, before)
})

const submit = subject => contact(new Request('http://localhost:3000/api/contact', { method: 'POST', body: JSON.stringify({ name: 'Local fixture', email: `lookup-${randomUUID()}@example.com`, message: 'Local only', ...(subject === undefined ? {} : { subject }) }) }))

test('contact subject lookup only matches own aliases', async () => {
  // Eight cases: the route's in-memory IP limit allows eight contact posts per process.
  const cases = [
    ['constructor', 'General inquiry from'],
    ['__proto__', 'General inquiry from'],
    [42, 'General inquiry from'],
    ['definitely-unknown', 'General inquiry from'],
    [undefined, 'General inquiry from'],
    ['job', 'Hiring inquiry from'],
    ['VC / Startup', 'Startup or partnership inquiry from'],
    ['case study', 'Project inquiry from'],
  ]
  for (const [subject, prefix] of cases) {
    sentSubjects = []
    const response = await submit(subject)
    assert.equal(response.status, 200, `subject ${JSON.stringify(subject)}`)
    assert.equal(sentSubjects[0], `${prefix} Local fixture`, `subject ${JSON.stringify(subject)}`)
  }
})

test('contact intent lookup only matches own intents', () => {
  assert.equal(getInitialTopic('constructor'), null)
  assert.equal(getInitialTopic('__proto__'), null)
  assert.equal(getInitialTopic('hasOwnProperty'), null)
  assert.equal(getInitialTopic('definitely-unknown'), null)
  assert.equal(getInitialTopic(''), null)
  assert.equal(getInitialTopic(null), null)
  assert.equal(getInitialTopic(undefined), null)
  assert.equal(getInitialTopic('hiring'), 'Hiring')
  assert.equal(getInitialTopic('Recruitment'), 'Hiring')
  assert.equal(getInitialTopic('VC / Startup'), 'VC / Startup')
  assert.equal(getInitialTopic(' business tech translator '), 'General')
})

test('readLimitedJson returns only plain objects, within the byte limit', async () => {
  const request = body => new Request('http://localhost:3000/x', { method: 'POST', body })
  assert.deepEqual(await readLimitedJson(request('{"a":1,"b":"two"}'), 100), { a: 1, b: 'two' })
  assert.deepEqual(await readLimitedJson(request(''), 100), {})
  for (const body of ['[1,2]', 'null', '"text"', '12', 'not json']) await assert.rejects(readLimitedJson(request(body), 100), InvalidJsonBodyError)
  await assert.rejects(readLimitedJson(request(JSON.stringify({ padding: 'x'.repeat(200) })), 100), RequestBodyTooLargeError)
  const parsed = await readLimitedJson(request('{"constructor":"x"}'), 100)
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'constructor'), true)
})
