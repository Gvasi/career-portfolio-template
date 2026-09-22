import { NextResponse } from 'next/server'
import { isIP } from 'node:net'
import { getSecurityStore, securityKey } from './securityStore'

type RateLimitConfig = {
  windowMs: number
  max: number
}

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body is too large.')
    this.name = 'RequestBodyTooLargeError'
  }
}

export class InvalidJsonBodyError extends Error {
  constructor() {
    super('Invalid JSON body.')
    this.name = 'InvalidJsonBodyError'
  }
}

function normalizeHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || ''
}

export function getClientIp(request: Request) {
  // Vercel overwrites X-Forwarded-For. Never prefer a visitor-supplied Cloudflare header.
  if (!process.env.VERCEL) return 'local-or-untrusted'
  const ip = normalizeHeaderValue(request.headers.get('x-forwarded-for'))
  return isIP(ip) ? ip : 'unknown'
}

export async function checkRateLimit(
  namespace: string,
  identity: string,
  { windowMs, max }: RateLimitConfig
) {
  return getSecurityStore().consume(securityKey(namespace, identity || 'unknown'), max, windowMs)
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  )
}

export async function readLimitedJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const contentLength = request.headers.get('content-length')
  const declaredBytes = contentLength ? Number(contentLength) : 0

  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new RequestBodyTooLargeError()
  }

  const reader = request.body?.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let bytes = 0
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > maxBytes) {
          await reader.cancel()
          throw new RequestBodyTooLargeError()
        }
        text += decoder.decode(value, { stream: true })
      }
      text += decoder.decode()
    } finally {
      reader.releaseLock()
    }
  }

  try {
    const body: unknown = text.trim() ? JSON.parse(text) : {}
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new InvalidJsonBodyError()
    // Only a plain object survives the checks above; its values stay unknown for the callers to narrow.
    return body as Record<string, unknown>
  } catch {
    throw new InvalidJsonBodyError()
  }
}

export function normalizeSingleLineText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''

  return value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function normalizeMultilineText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''

  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function isLocalDevelopmentRequest(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  const url = new URL(request.url)
  const hostname = url.hostname.toLowerCase()

  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}
