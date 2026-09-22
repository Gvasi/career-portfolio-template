import { createHash, randomUUID } from 'node:crypto'
import { google } from 'googleapis'
import { DateTime } from 'luxon'
import { SITE_HOST } from '@/config/site'
import { getSecurityStore, securityKey } from '../security/securityStore'
import { coordinateBooking, BookingConflictError } from './bookingCoordinator'
import { parseFreeBusyCalendar } from './freeBusy'
import { getBookingConfig, getNotificationRecipient, GoogleWorkspaceConfigError, normalizeEmail } from './config'
import { getAuthorizedOAuthClient } from './oauth'
import { getViewerTimeZone, hasBusyConflict, isSlotAlignedToAvailabilityRule } from './availability'
import { sendBookingNotifications } from './delivery'

export async function queryBusyRanges({
  timeMin,
  timeMax,
}: {
  timeMin: string
  timeMax: string
}) {
  const config = getBookingConfig()
  const auth = getAuthorizedOAuthClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: config.organizerTimeZone,
      items: [{ id: config.calendarId }],
    },
  })

  return parseFreeBusyCalendar(response.data.calendars?.[config.calendarId])
}

export async function createGoogleMeetBooking({
  start,
  end,
  guestName,
  guestEmail,
  topic,
  notes,
  guestTimeZone,
  attemptId,
}: {
  start: string
  end: string
  guestName: string
  guestEmail: string
  topic?: string | null
  notes?: string | null
  guestTimeZone?: string | null
  attemptId: string
}) {
  const config = getBookingConfig()
  // Checked before any calendar write: a booking without a notification inbox is refused, not half-delivered.
  const notificationRecipient = getNotificationRecipient()
  const auth = getAuthorizedOAuthClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const startUtc = DateTime.fromISO(start, { setZone: true }).toUTC()
  const endUtc = DateTime.fromISO(end, { setZone: true }).toUTC()

  if (!startUtc.isValid || !endUtc.isValid || endUtc <= startUtc) {
    throw new GoogleWorkspaceConfigError('Invalid booking time range.')
  }

  if (!isSlotAlignedToAvailabilityRule(config, startUtc, endUtc)) {
    throw new BookingConflictError()
  }

  const startOrganizer = startUtc.setZone(config.organizerTimeZone)
  const endOrganizer = endUtc.setZone(config.organizerTimeZone)
  const safeGuestTimeZone = getViewerTimeZone(guestTimeZone, config.organizerTimeZone)
  const summary = topic ? `${topic} call with ${guestName}` : `Intro call with ${guestName}`
  const description = [
    topic ? `Topic: ${topic}` : null,
    notes?.trim() ? `Notes:\n${notes.trim()}` : null,
    '',
    `Booked by ${guestName} <${guestEmail}>`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const fingerprint = createHash('sha256')
    .update(JSON.stringify([attemptId, startUtc.toISO(), endUtc.toISO(), normalizeEmail(guestEmail)]))
    .digest('hex')
  let eventUid = ''
  return coordinateBooking({
    store: getSecurityStore(),
    slotKey: securityKey('booking-slot', `${config.calendarId}:${startUtc.toISO()}`),
    fingerprint,
    expiresAt: endUtc.plus({ days: 1 }).toMillis(),
    validate: async () => {
      const busy = await queryBusyRanges({ timeMin: startUtc.toISO()!, timeMax: endUtc.toISO()! })
      if (hasBusyConflict(busy, startUtc, endUtc)) throw new BookingConflictError()
    },
    recover: async eventId => {
      try {
        const result = await calendar.events.get({ calendarId: config.calendarId, eventId })
        if (result.data.status === 'cancelled') return 'cancelled'
        if (!result.data.id || result.data.extendedProperties?.private?.portfolioBooking !== 'v1') return null
        return {
          id: result.data.id,
          meetLink: result.data.hangoutLink ||
            result.data.conferenceData?.entryPoints?.find(entry => entry.entryPointType === 'video')?.uri ||
            null,
          invitationSent: false,
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status
        if (status === 410) return 'cancelled'
        if (status === 404) return null
        throw error
      }
    },
    insert: async eventId => {
      const response = await calendar.events.insert({
        calendarId: config.calendarId,
        conferenceDataVersion: 1,
        sendUpdates: 'none',
        requestBody: {
          id: eventId,
          extendedProperties: { private: { portfolioBooking: 'v1' } },
          summary,
          description,
          start: {
            dateTime: startOrganizer.toISO({ suppressMilliseconds: true }),
            timeZone: config.organizerTimeZone,
          },
          end: {
            dateTime: endOrganizer.toISO({ suppressMilliseconds: true }),
            timeZone: config.organizerTimeZone,
          },
          attendees: [
            {
              email: guestEmail,
              displayName: guestName,
            },
          ],
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
          guestsCanInviteOthers: false,
          guestsCanModify: false,
          guestsCanSeeOtherGuests: true,
        },
      })

      const meetLink =
        response.data.hangoutLink ||
        response.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri ||
        null
      eventUid = response.data.iCalUID || `${response.data.id || eventId}@${SITE_HOST}`
      return { id: response.data.id, meetLink, invitationSent: false }
    },
    notify: receipt => sendBookingNotifications({
      receipt, config, notificationRecipient, startUtc, endUtc,
      guestTimeZone: safeGuestTimeZone, guestName, guestEmail, topic, notes, summary, eventUid,
    }),
  })
}
