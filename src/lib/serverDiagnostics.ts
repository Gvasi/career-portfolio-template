import { randomUUID } from 'node:crypto'

export type FailurePhase = 'request_processing' | 'message_delivery' | 'booking_creation' | 'availability_lookup'
type DiagnosticRoute = 'contact' | 'schedule_book' | 'schedule_availability'

/** Log only code-owned labels. Never accept a request, exception or provider response here. */
export function reportUnexpectedFailure(route: DiagnosticRoute, phase: FailurePhase) {
  const requestId = randomUUID()
  console.error('Unexpected API failure', { requestId, route, phase })
  return requestId
}
