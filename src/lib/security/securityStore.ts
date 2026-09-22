import { createHash } from 'node:crypto'

export class SecurityUnavailableError extends Error {
  constructor() { super('Protection is temporarily unavailable. Please try again shortly or use the email link.'); this.name = 'SecurityUnavailableError' }
}

export interface SecurityStore {
  get(key: string): Promise<string | null>
  claim(key: string, value: string, ttlMs: number): Promise<boolean>
  replace(key: string, expected: string, value: string | null, ttlMs: number): Promise<boolean>
  consume(key: string, max: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSeconds: number }>
}

export function securityKey(namespace: string, identity: string) {
  const scope = process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'local')
  return `portfolio:${scope}:v1:${namespace}:${createHash('sha256').update(identity).digest('hex')}`
}

const COUNT_SCRIPT = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return {n, redis.call('PTTL', KEYS[1])}`
const REPLACE_SCRIPT = `if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end; if ARGV[2] == '' then redis.call('DEL', KEYS[1]) else redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3]) end; return 1`

export function createRedisStore(url: string, token: string): SecurityStore {
  if (!url.startsWith('https://') || !token) throw new SecurityUnavailableError()
  async function command<T>(args: (string | number)[]): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args), cache: 'no-store', signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) throw new SecurityUnavailableError()
      const body = await response.json() as { result: T; error?: string }
      if (body.error || !('result' in body)) throw new SecurityUnavailableError()
      return body.result
    } catch { throw new SecurityUnavailableError() }
  }
  return {
    get: key => command<string | null>(['GET', key]),
    claim: async (key, value, ttl) => await command(['SET', key, value, 'NX', 'PX', ttl]) === 'OK',
    replace: async (key, expected, value, ttl) => await command(['EVAL', REPLACE_SCRIPT, 1, key, expected, value ?? '', ttl]) === 1,
    consume: async (key, max, window) => {
      const [count, ttl] = await command<number[]>(['EVAL', COUNT_SCRIPT, 1, key, window])
      if (!Number.isFinite(count) || !Number.isFinite(ttl) || ttl < 0) throw new SecurityUnavailableError()
      return { allowed: count <= max, retryAfterSeconds: count <= max ? 0 : Math.max(1, Math.ceil(ttl / 1000)) }
    },
  }
}

/** Development/test only. Production must never silently fall back to process memory. */
export function createMemorySecurityStore(): SecurityStore {
  const values = new Map<string, { value: string; expires: number }>()
  function current(key: string) {
    for (const [k, v] of values) if (v.expires <= Date.now()) values.delete(k)
    return values.get(key)
  }
  function write(key: string, value: string, ttl: number) {
    if (!values.has(key) && values.size >= 10_000) throw new SecurityUnavailableError()
    values.set(key, { value, expires: Date.now() + ttl })
  }
  return {
    get: async key => current(key)?.value ?? null,
    claim: async (key, value, ttl) => { if (current(key)) return false; write(key, value, ttl); return true },
    replace: async (key, expected, value, ttl) => {
      if (current(key)?.value !== expected) return false
      if (value === null) values.delete(key); else write(key, value, ttl)
      return true
    },
    consume: async (key, max, window) => {
      const previous = current(key)
      const count = Number(previous?.value ?? 0) + 1
      const ttl = previous ? previous.expires - Date.now() : window
      write(key, String(count), ttl)
      return { allowed: count <= max, retryAfterSeconds: count <= max ? 0 : Math.max(1, Math.ceil(ttl / 1000)) }
    },
  }
}

const developmentStore = createMemorySecurityStore()
export function getSecurityStore(): SecurityStore {
  const direct = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_TOKEN)
  const url = (direct ? process.env.UPSTASH_REDIS_REST_URL : process.env.KV_REST_API_URL)?.trim()
  const token = (direct ? process.env.UPSTASH_REDIS_REST_TOKEN : process.env.KV_REST_API_TOKEN)?.trim()
  if (url && token) return createRedisStore(url, token)
  if (url || token || process.env.NODE_ENV === 'production' || process.env.VERCEL) throw new SecurityUnavailableError()
  return developmentStore
}
