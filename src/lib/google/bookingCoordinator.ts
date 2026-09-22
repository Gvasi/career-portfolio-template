import { createHash } from 'node:crypto'
import { SecurityUnavailableError, type SecurityStore } from '../security/securityStore'

export class BookingConflictError extends Error {
  constructor() { super('The selected time is no longer available.'); this.name = 'BookingConflictError' }
}
export class BookingPendingError extends Error {
  constructor() { super('Your booking is still being checked. Please try again shortly without changing the time, or email me.'); this.name = 'BookingPendingError' }
}
export type BookingReceipt = { id?: string | null; meetLink: string | null; invitationSent: boolean }
type Claim = { fingerprint: string; eventId: string; state: 'pending' | 'complete'; receipt?: BookingReceipt }

/** Durable claims outlive uncertain Calendar writes; only a confirmed pre-write failure releases one. */
export async function coordinateBooking({ store, slotKey, fingerprint, expiresAt, validate, insert, notify, recover }: {
  store: SecurityStore; slotKey: string; fingerprint: string; expiresAt: number
  validate: () => Promise<void>
  insert: (eventId: string) => Promise<BookingReceipt>
  notify: (receipt: BookingReceipt) => Promise<BookingReceipt>
  recover: (eventId: string) => Promise<BookingReceipt | 'cancelled' | null>
}): Promise<BookingReceipt> {
  const ttl = Math.max(60_000, expiresAt - Date.now())
  const eventId = `portfolio${createHash('sha256').update(`${slotKey}:${fingerprint}`).digest('hex')}`
  const pending = JSON.stringify({ fingerprint, eventId, state: 'pending' } satisfies Claim)
  if (!await store.claim(slotKey, pending, ttl)) {
    const raw = await store.get(slotKey)
    if (!raw) throw new BookingPendingError()
    let existing: Claim
    try { existing = JSON.parse(raw) as Claim } catch { throw new SecurityUnavailableError() }
    // Checking the provider also allows a manually cancelled, completed intro to be booked again.
    const recovered = await recover(existing.eventId)
    if (recovered === 'cancelled' && existing.state === 'complete') {
      if (!await store.replace(slotKey, raw, null, ttl)) throw new BookingPendingError()
      if (existing.fingerprint === fingerprint) throw new BookingConflictError()
      return coordinateBooking({ store, slotKey, fingerprint, expiresAt, validate, insert, notify, recover })
    }
    if (existing.fingerprint !== fingerprint) throw new BookingConflictError()
    if (recovered && recovered !== 'cancelled') {
      if (existing.state === 'pending') await store.replace(slotKey, raw, JSON.stringify({ ...existing, state: 'complete', receipt: recovered }), ttl)
      return existing.receipt ?? recovered
    }
    // A timeout/404 is not permission to repeat an insert or send a second invitation.
    throw new BookingPendingError()
  }
  try { await validate() } catch (error) {
    await store.replace(slotKey, pending, null, ttl)
    throw error
  }
  // No auto-release after insert begins: a network error might hide a successful Google write.
  const receipt = await insert(eventId)
  const committed = JSON.stringify({ fingerprint, eventId, state: 'complete', receipt } satisfies Claim)
  if (!await store.replace(slotKey, pending, committed, ttl)) throw new BookingPendingError()
  let notified = receipt
  try { notified = await notify(receipt) } catch { /* The event is reserved; retrying must not duplicate it. */ }
  try { await store.replace(slotKey, committed, JSON.stringify({ fingerprint, eventId, state: 'complete', receipt: notified } satisfies Claim), ttl) } catch { /* A safe unnotified receipt remains recoverable. */ }
  return notified
}
