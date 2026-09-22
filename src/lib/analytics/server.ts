import { after } from 'next/server'
import { ANALYTICS_ORIGIN, validAnonymousId } from './policy'

export function recordServerOutcome(request: Request, event: 'contact_succeeded' | 'booking_succeeded' | 'contact_failed' | 'booking_failed', uuid?: string) {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  const id = request.headers.get('X-POSTHOG-DISTINCT-ID')
  const session = request.headers.get('X-POSTHOG-SESSION-ID')
  if (process.env.VERCEL_ENV !== 'production' || request.headers.get('origin') !== ANALYTICS_ORIGIN || request.headers.get('X-Analytics-Consent') !== 'accepted' || !validAnonymousId(id) || !token || host !== 'https://eu.i.posthog.com') return
  try { after(async () => {
    try {
      const { PostHog } = await import('posthog-node')
      const client = new PostHog(token, { host, flushAt: 1, flushInterval: 0, requestTimeout: 2500, fetchRetryCount: 0, disableGeoip: true })
      client.capture({
        distinctId: id, event, ...(uuid ? { uuid } : {}),
        properties: { $process_person_profile: false, $geoip_disable: true, $ip: null, $pathname: '/contact', ...(validAnonymousId(session) ? { $session_id: session } : {}) },
      })
      if (event.endsWith('_failed')) {
        // A fixed diagnostic never contains the provider error, request body or guest information.
        client.captureException(new Error(event), id, { $process_person_profile: false, $geoip_disable: true, $ip: null })
      }
      await client.shutdown()
    } catch { console.warn('Analytics delivery was unavailable; the contact outcome is unchanged.') }
  }) } catch { console.warn('Analytics could not be scheduled; the contact outcome is unchanged.') }
}
