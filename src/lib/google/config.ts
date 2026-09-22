import { IANAZone } from 'luxon'
import { PUBLIC_CONTACT_EMAIL } from '../email/identity'

type AvailabilitySpan = {
  startMinutes: number
  endMinutes: number
}

type AvailabilityRule = {
  days: number[]
  spans: AvailabilitySpan[]
}

export type BookingAvailabilityConfig = {
  calendarId: string
  googleAccountEmail: string
  organizerTimeZone: string
  availabilityRules: AvailabilityRule[]
  slotMinutes: number
  minNoticeHours: number
}

export class GoogleWorkspaceConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleWorkspaceConfigError'
  }
}

export function isValidTimeZone(value: string) {
  return IANAZone.isValidZone(value)
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function parseTimeToMinutes(value: string | undefined, fallback: string) {
  const normalized = value?.trim() || fallback
  const match = /^(\d{1,2}):(\d{2})$/.exec(normalized)

  if (!match) {
    throw new GoogleWorkspaceConfigError(`Invalid time value "${normalized}". Expected HH:MM.`)
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (hours > 23 || minutes > 59) {
    throw new GoogleWorkspaceConfigError(`Invalid time value "${normalized}". Expected HH:MM.`)
  }

  return hours * 60 + minutes
}

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = value ? Number(value) : fallback
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new GoogleWorkspaceConfigError('Slot duration must be a positive number.')
  }

  return parsed
}

function parseNonNegativeNumber(value: string | undefined, fallback: number) {
  const parsed = value ? Number(value) : fallback

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new GoogleWorkspaceConfigError('Minimum notice must be zero or a positive number.')
  }

  return parsed
}

export function parsePositiveInteger(value: string | undefined, fallback: number, label: string) {
  const parsed = value ? Number(value) : fallback

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new GoogleWorkspaceConfigError(`${label} must be a positive integer.`)
  }

  return parsed
}

function parseDayList(value: string | undefined, fallback: number[]) {
  const days = (value || fallback.join(','))
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7)

  return days.length > 0 ? Array.from(new Set(days)) : fallback
}

function parseAvailabilitySpan(value: string) {
  const normalized = value.trim()
  const [startValue, endValue] = normalized.split('-')

  if (!startValue || !endValue) {
    throw new GoogleWorkspaceConfigError(
      `Invalid availability window "${normalized}". Expected HH:MM-HH:MM.`
    )
  }

  const startMinutes = parseTimeToMinutes(startValue, startValue)
  const endMinutes = parseTimeToMinutes(endValue, endValue)

  if (endMinutes <= startMinutes) {
    throw new GoogleWorkspaceConfigError(
      `Invalid availability window "${normalized}". End time must be after start time.`
    )
  }

  return { startMinutes, endMinutes }
}

function parseAvailabilitySpans(value: string | undefined, fallback: string[]) {
  const raw = value?.trim()
  const segments = (raw ? raw.split(';') : fallback)
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    throw new GoogleWorkspaceConfigError('At least one availability window is required.')
  }

  return segments.map(parseAvailabilitySpan)
}

function parseDaySpecificAvailabilityRules(value: string | undefined) {
  const raw = value?.trim()

  if (!raw) {
    return []
  }

  const rules = raw
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [dayValue, spansValue] = entry.split('=')

      if (!dayValue || !spansValue) {
        throw new GoogleWorkspaceConfigError(
          `Invalid day-specific availability rule "${entry}". Expected DAY=HH:MM-HH:MM;...`
        )
      }

      const day = Number(dayValue.trim())

      if (!Number.isInteger(day) || day < 1 || day > 7) {
        throw new GoogleWorkspaceConfigError(
          `Invalid weekday "${dayValue}" in day-specific availability rule "${entry}".`
        )
      }

      return {
        days: [day],
        spans: parseAvailabilitySpans(spansValue.trim(), []),
      }
    })

  return rules
}

function buildAvailabilityRules() {
  const daySpecificRules = parseDaySpecificAvailabilityRules(process.env.GOOGLE_WORKSPACE_DAY_WINDOWS)

  if (daySpecificRules.length > 0) {
    return daySpecificRules
  }

  const hasSelectiveConfig = Boolean(
    process.env.GOOGLE_WORKSPACE_WEEKDAY_DAYS?.trim() ||
    process.env.GOOGLE_WORKSPACE_WEEKDAY_WINDOWS?.trim() ||
    process.env.GOOGLE_WORKSPACE_WEEKEND_DAYS?.trim() ||
    process.env.GOOGLE_WORKSPACE_WEEKEND_WINDOWS?.trim()
  )

  if (!hasSelectiveConfig) {
    const legacyDays = parseDayList(process.env.GOOGLE_WORKSPACE_BUSINESS_DAYS, [1, 2, 3, 4, 5])
    const legacySpan = {
      startMinutes: parseTimeToMinutes(process.env.GOOGLE_WORKSPACE_DAY_START, '10:00'),
      endMinutes: parseTimeToMinutes(process.env.GOOGLE_WORKSPACE_DAY_END, '18:00'),
    }

    if (legacySpan.endMinutes <= legacySpan.startMinutes) {
      throw new GoogleWorkspaceConfigError('Booking end time must be after the start time.')
    }

    return [
      {
        days: legacyDays,
        spans: [legacySpan],
      },
    ]
  }

  const rules: AvailabilityRule[] = [
    {
      days: parseDayList(process.env.GOOGLE_WORKSPACE_WEEKDAY_DAYS, [2, 3, 4, 5]),
      spans: parseAvailabilitySpans(process.env.GOOGLE_WORKSPACE_WEEKDAY_WINDOWS, [
        '12:00-13:30',
        '16:30-18:00',
      ]),
    },
    {
      days: parseDayList(process.env.GOOGLE_WORKSPACE_WEEKEND_DAYS, [6, 7]),
      spans: parseAvailabilitySpans(process.env.GOOGLE_WORKSPACE_WEEKEND_WINDOWS, ['11:00-16:00']),
    },
  ]

  const filteredRules = rules.filter((rule) => rule.days.length > 0 && rule.spans.length > 0)

  if (filteredRules.length === 0) {
    throw new GoogleWorkspaceConfigError('At least one availability rule must be configured.')
  }

  return filteredRules
}

export function getAvailabilitySpansForWeekday(config: BookingAvailabilityConfig, weekday: number) {
  const spans = config.availabilityRules
    .filter((rule) => rule.days.includes(weekday))
    .flatMap((rule) => rule.spans)
    .sort((a, b) => a.startMinutes - b.startMinutes)
  // Non-overlapping windows and exact minute alignment give each reservable slot one identity.
  if (spans.some((span, index) => index > 0 && span.startMinutes < spans[index - 1].endMinutes)) {
    throw new GoogleWorkspaceConfigError('Availability windows must not overlap.')
  }
  return spans
}

/**
 * The private inbox that receives visitor messages and booking notifications.
 * Required whenever delivery is enabled: there is no built-in fallback address,
 * so a missing or malformed CONTACT_TO_EMAIL is a configuration error and the
 * routes answer with their "not configured" response instead of sending.
 */
export function getNotificationRecipient() {
  const recipient = process.env.CONTACT_TO_EMAIL?.trim() ?? ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new GoogleWorkspaceConfigError('CONTACT_TO_EMAIL is not configured with a valid notification address.')
  }
  return recipient
}

export function getBookingConfig(): BookingAvailabilityConfig {
  const organizerTimeZone = process.env.GOOGLE_WORKSPACE_TIMEZONE?.trim() || 'UTC'

  if (!isValidTimeZone(organizerTimeZone)) {
    throw new GoogleWorkspaceConfigError(`Invalid organizer timezone "${organizerTimeZone}".`)
  }

  return {
    calendarId: process.env.GOOGLE_WORKSPACE_CALENDAR_ID?.trim() || 'primary',
    googleAccountEmail: process.env.GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL?.trim() || '',
    organizerTimeZone,
    availabilityRules: buildAvailabilityRules(),
    slotMinutes: parsePositiveNumber(process.env.GOOGLE_WORKSPACE_SLOT_MINUTES, 30),
    minNoticeHours: parseNonNegativeNumber(process.env.GOOGLE_WORKSPACE_MIN_NOTICE_HOURS, 24),
  }
}

export function isOwnerAliasEmail(email: string) {
  const aliases = new Set<string>([PUBLIC_CONTACT_EMAIL])

  const configuredAliases = process.env.SITE_OWNER_EMAIL_ALIASES
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean) ?? []

  for (const alias of configuredAliases) {
    aliases.add(normalizeEmail(alias))
  }

  const contactRecipient = process.env.CONTACT_TO_EMAIL?.trim()
  if (contactRecipient) {
    aliases.add(normalizeEmail(contactRecipient))
  }

  const googleAccountEmail = process.env.GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL?.trim()
  if (googleAccountEmail) {
    aliases.add(normalizeEmail(googleAccountEmail))
  }

  return aliases.has(normalizeEmail(email))
}

/** The configured slot length only; the rest of the booking configuration stays private. */
export function getBookingSlotMinutes() {
  return getBookingConfig().slotMinutes
}

export function hasGoogleWorkspaceClientCredentials() {
  return Boolean(
    process.env.GOOGLE_WORKSPACE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_WORKSPACE_CLIENT_SECRET?.trim()
  )
}

export function hasGoogleWorkspaceAccess() {
  return Boolean(
    process.env.GOOGLE_WORKSPACE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_WORKSPACE_CLIENT_SECRET?.trim() &&
    process.env.GOOGLE_WORKSPACE_REFRESH_TOKEN?.trim()
  )
}
