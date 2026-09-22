// Opt-in provider smoke test: unique, short-lived keys only; no Calendar or mail calls.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRedisStore } from '../../src/lib/security/securityStore.ts'

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
assert.ok(url && token, 'Shared-store credentials must be supplied by the environment.')
const a = createRedisStore(url, token)
const b = createRedisStore(url, token)
const prefix = `portfolio:verification:${randomUUID()}`
const ttl = 30_000
const slot = `${prefix}:slot`
const counter = `${prefix}:counter`

try {
  const claims = await Promise.all([a.claim(slot, 'visitor-a', ttl), b.claim(slot, 'visitor-b', ttl)])
  assert.equal(claims.filter(Boolean).length, 1, 'Exactly one independent client must claim a slot.')
  const owner = claims[0] ? 'visitor-a' : 'visitor-b'
  assert.equal(await b.get(slot), owner)
  assert.equal(await b.replace(slot, 'not-the-owner', null, ttl), false)
  assert.equal(await a.replace(slot, owner, 'complete', ttl), true)
  assert.equal(await b.get(slot), 'complete')
  const attempts = await Promise.all(Array.from({ length: 10 }, (_, i) => (i % 2 ? a : b).consume(counter, 3, ttl)))
  assert.equal(attempts.filter(result => result.allowed).length, 3)
  assert.ok(attempts.filter(result => !result.allowed).every(result => result.retryAfterSeconds > 0 && result.retryAfterSeconds <= 30))
  console.log('Live Redis passed: one slot claimant, atomic receipt replacement, three of ten requests admitted across independent clients.')
} finally {
  // Compare-and-delete only this run's records. TTL also covers interrupted tests.
  for (const key of [slot, counter]) {
    const value = await a.get(key)
    if (value !== null) await a.replace(key, value, null, ttl)
  }
}
