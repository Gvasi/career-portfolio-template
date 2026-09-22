import { google } from 'googleapis'
import { DateTime } from 'luxon'
import { site } from '@/config/site'
import { buildMimeEmail } from '../email/mime'
import { bookingConfirmation, emailTopic } from '../email/templates'
import { PUBLIC_CONTACT_EMAIL } from '../email/identity'
import { getAuthorizedOAuthClient } from './oauth'
import { getBookingConfig, isOwnerAliasEmail, normalizeEmail, type BookingAvailabilityConfig } from './config'
import type { BookingReceipt } from './bookingCoordinator'

const ORGANIZER_NAME = site.name

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatIcsDate(dateTime: DateTime) {
  return dateTime.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'")
}

function buildCalendarInviteIcs({
  uid,
  summary,
  description,
  startUtc,
  endUtc,
  organizerEmail,
  attendeeEmail,
  attendeeName,
  meetLink,
}: {
  uid: string
  summary: string
  description: string
  startUtc: DateTime
  endUtc: DateTime
  organizerEmail: string
  attendeeEmail: string
  attendeeName: string
  meetLink?: string | null
}) {
  const lines = [
    'BEGIN:VCALENDAR',
    `PRODID:-//${escapeIcsText(ORGANIZER_NAME)}//Portfolio Booking//EN`,
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(DateTime.utc())}`,
    `DTSTART:${formatIcsDate(startUtc)}`,
    `DTEND:${formatIcsDate(endUtc)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `ORGANIZER;CN=${escapeIcsText(ORGANIZER_NAME)}:mailto:${organizerEmail}`,
    `ATTENDEE;CN=${escapeIcsText(attendeeName)};RSVP=TRUE:mailto:${attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'TRANSP:OPAQUE',
    ...(meetLink
      ? [
          `LOCATION:${escapeIcsText(`Google Meet - ${meetLink}`)}`,
          `URL:${escapeIcsText(meetLink)}`,
        ]
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  // RFC 5545 folds content lines at 75 octets, preserving UTF-8 characters.
  return lines.map(line => {
    const folded: string[] = []
    let chunk = ''
    for (const character of line) {
      if (Buffer.byteLength(chunk + character) > 75) { folded.push(chunk); chunk = ' ' }
      chunk += character
    }
    folded.push(chunk)
    return folded.join('\r\n')
  }).join('\r\n') + '\r\n'
}

async function sendRawGmailMessage(raw: string) {
  const auth = getAuthorizedOAuthClient()
  const gmail = google.gmail({ version: 'v1', auth })

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
    },
  })
}

function getSenderHeader(config: BookingAvailabilityConfig) {
  return config.googleAccountEmail
    ? `${ORGANIZER_NAME} <${config.googleAccountEmail}>`
    : undefined
}

function formatTimeForZone(dateTime: DateTime, timeZone: string) {
  return dateTime.setZone(timeZone).toLocaleString(DateTime.DATETIME_FULL)
}

export async function sendEmail({
  subject,
  message,
  html,
  to,
  replyTo,
}: {
  subject: string
  message: string
  html?: string
  to: string
  replyTo?: string
}) {
  const config = getBookingConfig()
  await sendRawGmailMessage(
    buildMimeEmail({
      to,
      replyTo,
      subject,
      text: message,
      html,
      from: getSenderHeader(config),
    })
  )
}

/** Delivery happens only after the coordinator has committed the Calendar receipt. */
export async function sendBookingNotifications({
  receipt, config, notificationRecipient, startUtc, endUtc, guestTimeZone,
  guestName, guestEmail, topic, notes, summary, eventUid,
}: {
  receipt: BookingReceipt
  config: BookingAvailabilityConfig
  notificationRecipient: string
  startUtc: DateTime
  endUtc: DateTime
  guestTimeZone: string
  guestName: string
  guestEmail: string
  topic?: string | null
  notes?: string | null
  summary: string
  eventUid: string
}): Promise<BookingReceipt> {
  const { meetLink } = receipt
  const senderHeader = getSenderHeader(config)
  const organizerDisplayTime = formatTimeForZone(startUtc, config.organizerTimeZone)
  const guestLocalStart = startUtc.setZone(guestTimeZone).setLocale('en')
  const guestEmailContent = bookingConfirmation({
    date: guestLocalStart.toFormat('ccc, d LLL yyyy'),
    time: `${guestLocalStart.toFormat('HH:mm')}–${endUtc.setZone(guestTimeZone).toFormat('HH:mm')}`,
    timeZone: guestTimeZone,
    duration: config.slotMinutes,
    topic,
    meetLink,
  })
  const organizerBody = [
    'New booking confirmed.',
    '',
    `Guest: ${guestName}`,
    `Email: ${guestEmail}`,
    `When: ${organizerDisplayTime} (${config.organizerTimeZone})`,
    `Duration: ${config.slotMinutes} minutes`,
    ...(topic ? [`Topic: ${topic}`] : []),
    ...(meetLink ? [`Google Meet: ${meetLink}`] : []),
    ...(notes?.trim() ? ['', 'Notes:', notes.trim()] : []),
    '',
    'The event has been added to your Google Calendar.',
  ].join('\n')
  const calendarInvite = buildCalendarInviteIcs({
    uid: eventUid,
    summary: `Intro with ${ORGANIZER_NAME}`,
    description: [
      `Topic: ${emailTopic(topic)}`,
      'To change or cancel this intro, reply to the confirmation email.',
      ...(meetLink ? [`Google Meet: ${meetLink}`] : []),
    ].join('\n'),
    startUtc,
    endUtc,
    organizerEmail: config.googleAccountEmail || notificationRecipient,
    attendeeEmail: guestEmail,
    attendeeName: 'Guest',
    meetLink,
  })
  const normalizedGuestEmail = normalizeEmail(guestEmail)
  const normalizedRecipientEmail = normalizeEmail(notificationRecipient)
  const skipOwnerNotification = isOwnerAliasEmail(guestEmail)

  const notificationResults = await Promise.allSettled([
    sendRawGmailMessage(
      buildMimeEmail({
        to: guestEmail,
        subject: guestEmailContent.subject,
        text: guestEmailContent.text,
        html: guestEmailContent.html,
        replyTo: PUBLIC_CONTACT_EMAIL,
        from: senderHeader,
        calendarInvite,
      })
    ),
    ...(normalizedRecipientEmail !== normalizedGuestEmail && !skipOwnerNotification
      ? [
          sendRawGmailMessage(
            buildMimeEmail({
              to: notificationRecipient,
              subject: `New booking: ${summary}`,
              text: organizerBody,
              replyTo: guestEmail,
              from: senderHeader,
            })
          ),
        ]
      : []),
  ])

  return {
    id: receipt.id,
    meetLink,
    invitationSent: notificationResults[0]?.status === 'fulfilled',
  }
}
