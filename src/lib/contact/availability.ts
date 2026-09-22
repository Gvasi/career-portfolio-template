import { parseAvailabilityPayload, type AvailabilityPayload } from './availabilityContract'

export type { AvailabilityPayload, AvailabilitySlots, TimeSlot } from './availabilityContract'
/** The server answered that booking is not configured on this site: the page offers direct email instead of a broken calendar. */
export class BookingNotEnabledError extends Error {
  constructor() { super('Booking is not enabled'); this.name = 'BookingNotEnabledError' }
}

export const AVAILABILITY_TTL_MS = 30_000
const MAX_CACHED_MONTHS = 6
const cache = new Map<string, { payload: AvailabilityPayload; expiresAt: number }>()
const pending = new Map<string, Promise<AvailabilityPayload>>()
let generation = 0

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function availabilityUrl(month: Date, timeZone: string) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  return `/api/schedule/availability?${new URLSearchParams({ dateFrom: dateKey(start), dateTo: dateKey(end), timeZone })}`
}

export function cachedAvailability(url: string) {
  const entry = cache.get(url)
  if (entry && entry.expiresAt > Date.now()) return entry.payload
  cache.delete(url)
  return undefined
}

/** Shared only for public slots; never stores visitor details or credentials. */
export function loadAvailability(url: string): Promise<AvailabilityPayload> {
  const fresh = cachedAvailability(url)
  if (fresh) return Promise.resolve(fresh)
  const inFlight = pending.get(url)
  if (inFlight) return inFlight
  const revision = generation
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  const request = (async () => {
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
      if (response.status === 503 && await isUnconfigured(response)) throw new BookingNotEnabledError()
      if (!response.ok) throw new Error('Availability is unavailable')
      const payload = parseAvailabilityPayload(await response.json())
      if (revision === generation) {
        cache.set(url, { payload, expiresAt: Date.now() + AVAILABILITY_TTL_MS })
        while (cache.size > MAX_CACHED_MONTHS) cache.delete(cache.keys().next().value!)
      }
      return payload
    } finally {
      clearTimeout(timeout)
    }
  })().finally(() => { if (pending.get(url) === request) pending.delete(url) })
  pending.set(url, request)
  return request
}

async function isUnconfigured(response: Response) {
  try {
    const body: unknown = await response.clone().json()
    return typeof body === 'object' && body !== null && (body as { reason?: unknown }).reason === 'unconfigured'
  } catch {
    return false
  }
}

export function invalidateAvailability() {
  generation += 1
  cache.clear()
  pending.clear()
}

export function warmContactAvailability() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return loadAvailability(availabilityUrl(new Date(), zone)).catch(() => undefined)
}
