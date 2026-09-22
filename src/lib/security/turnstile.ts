import { randomUUID } from 'node:crypto'
import { SecurityUnavailableError } from './securityStore'

export class BotVerificationError extends Error {
  constructor() { super('Please complete the security check and try again.'); this.name = 'BotVerificationError' }
}

export async function verifyTurnstile(token: unknown, action: 'contact' | 'booking') {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  // A local design preview needs no external account. Never bypass on Vercel/production.
  if (!secret && process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return
  const hostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
  if (!secret || !hostnames.length) throw new SecurityUnavailableError()
  if (process.env.NODE_ENV === 'production' && /^[123]x0{10,}/.test(secret)) throw new SecurityUnavailableError()
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) throw new BotVerificationError()
  let data: { success?: boolean; action?: string; hostname?: string; 'error-codes'?: string[] }
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ secret, response: token, idempotency_key: randomUUID() }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new SecurityUnavailableError()
    data = await response.json()
  } catch { throw new SecurityUnavailableError() }
  if (data['error-codes']?.some(code => ['internal-error', 'invalid-input-secret', 'missing-input-secret'].includes(code))) throw new SecurityUnavailableError()
  if (data.success !== true || data.action !== action || !hostnames.includes(data.hostname?.toLowerCase() ?? '')) throw new BotVerificationError()
}
