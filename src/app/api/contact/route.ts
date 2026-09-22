import { NextRequest, NextResponse } from 'next/server'
import { reportUnexpectedFailure, type FailurePhase } from '@/lib/serverDiagnostics'
import { SITE_HOST } from '@/config/site'
import { recordServerOutcome } from '@/lib/analytics/server'
import { messageAcknowledgement } from '@/lib/email/templates'
import { PUBLIC_CONTACT_EMAIL } from '@/lib/email/identity'
import { BotVerificationError, verifyTurnstile } from '@/lib/security/turnstile'
import { SecurityUnavailableError } from '@/lib/security/securityStore'
import { isDemoMode } from '@/lib/demo'
import {
  getNotificationRecipient,
  GoogleWorkspaceConfigError,
  hasGoogleWorkspaceAccess,
  isOwnerAliasEmail,
  sendEmail,
} from '@/lib/google/workspace'
import {
  checkRateLimit,
  getClientIp,
  InvalidJsonBodyError,
  normalizeMultilineText,
  normalizeSingleLineText,
  rateLimitResponse,
  readLimitedJson,
  RequestBodyTooLargeError,
} from '@/lib/security/requestGuards'

const CONTACT_BODY_LIMIT_BYTES = 12 * 1024
const CONTACT_IP_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  max: 8,
}
const CONTACT_EMAIL_RATE_LIMIT = {
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
}

const SUBJECT_LABELS = {
  hiring: 'Work',
  startup: 'Ideas',
  consulting: 'Project',
  general: 'Hello',
} as const

const SUBJECT_PREFIXES: Record<keyof typeof SUBJECT_LABELS, string> = {
  hiring: 'Hiring inquiry from',
  startup: 'Startup or partnership inquiry from',
  consulting: 'Project inquiry from',
  general: 'General inquiry from',
}

const SUBJECT_ALIASES: Record<string, keyof typeof SUBJECT_LABELS> = {
  hiring: 'hiring',
  recruitment: 'hiring',
  job: 'hiring',
  startup: 'startup',
  partnership: 'startup',
  vc: 'startup',
  'vc-startup': 'startup',
  consulting: 'consulting',
  freelance: 'consulting',
  project: 'consulting',
  'case-study': 'consulting',
  general: 'general',
  other: 'general',
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function normalizeSubject(subject: unknown): keyof typeof SUBJECT_LABELS {
  if (typeof subject !== 'string' || !subject.trim()) {
    return 'general'
  }

  // A plain object inherits keys such as "constructor"; only the aliases above may match.
  const normalizedKey = normalizeKey(subject)
  return Object.prototype.hasOwnProperty.call(SUBJECT_ALIASES, normalizedKey)
    ? SUBJECT_ALIASES[normalizedKey]
    : 'general'
}

function buildEmailBody({
  name,
  email,
  company,
  subjectLabel,
  message,
}: {
  name: string
  email: string
  company?: string
  subjectLabel: string
  message: string
}) {
  return [
    'New contact form submission',
    '',
    `From: ${name}`,
    `Email: ${email}`,
    `Company: ${company || 'Not provided'}`,
    `Topic: ${subjectLabel}`,
    '',
    'Message:',
    message,
    '',
    `Sent from the ${SITE_HOST} contact form`,
  ].join('\n')
}

export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    // Demo deployments accept a well-formed message and send nothing.
    try {
      const body = await readLimitedJson(request, CONTACT_BODY_LIMIT_BYTES)
      const email = normalizeSingleLineText(body.email, 254)
      if (!normalizeSingleLineText(body.name, 120) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !normalizeMultilineText(body.message, 5000)) {
        return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 })
      }
      return NextResponse.json({ success: true, demo: true, message: 'Demo: nothing was sent' })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 })
    }
  }
  let phase: FailurePhase = 'request_processing'
  try {
    const ipRateLimit = await checkRateLimit('contact-ip', getClientIp(request), CONTACT_IP_RATE_LIMIT)
    if (!ipRateLimit.allowed) {
      return rateLimitResponse(ipRateLimit.retryAfterSeconds)
    }

    const body = await readLimitedJson(request, CONTACT_BODY_LIMIT_BYTES)
    if (typeof body.website === 'string' && body.website.trim()) {
      return NextResponse.json({ error: 'Please use the email link to get in touch.' }, { status: 400 })
    }
    const name = normalizeSingleLineText(body.name, 80)
    const email = normalizeSingleLineText(body.email, 254).toLowerCase()
    const company = normalizeSingleLineText(body.company, 120)
    const message = normalizeMultilineText(body.message, 2000)
    const normalizedSubject = normalizeSubject(body.subject)

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    await verifyTurnstile(body.turnstileToken, 'contact')
    const emailRateLimit = await checkRateLimit('contact-email', email, CONTACT_EMAIL_RATE_LIMIT)
    if (!emailRateLimit.allowed) {
      return rateLimitResponse(emailRateLimit.retryAfterSeconds)
    }

    const emailSubject = `${SUBJECT_PREFIXES[normalizedSubject]} ${name}`
    const subjectLabel = SUBJECT_LABELS[normalizedSubject]
    const emailBody = buildEmailBody({
      name,
      email,
      company,
      subjectLabel,
      message,
    })
    const acknowledgement = messageAcknowledgement(subjectLabel)
    const skipOwnerNotification = isOwnerAliasEmail(email)

    if (!hasGoogleWorkspaceAccess()) {
      return NextResponse.json(
        { error: 'Message delivery is not configured yet. Please use the email link or social channels for now.' },
        { status: 503 }
      )
    }

    phase = 'message_delivery'
    // Delivery to the owner is the primary outcome. An acknowledgement failure
    // must not ask the visitor to resend a message already delivered.
    if (!skipOwnerNotification) {
      await sendEmail({
        to: getNotificationRecipient(),
        subject: emailSubject,
        message: emailBody,
        replyTo: email,
      })
    }
    try {
      await sendEmail({
        to: email,
        subject: acknowledgement.subject,
        message: acknowledgement.text,
        html: acknowledgement.html,
        replyTo: PUBLIC_CONTACT_EMAIL,
      })
    } catch (error) {
      if (skipOwnerNotification) throw error
      console.warn('Contact delivered; acknowledgement could not be sent.')
    }

    if (!skipOwnerNotification) recordServerOutcome(request, 'contact_succeeded')
    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    })
  } catch (error) {
    if (error instanceof SecurityUnavailableError || error instanceof BotVerificationError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof BotVerificationError ? 403 : 503 })
    }
    if (error instanceof GoogleWorkspaceConfigError) {
      return NextResponse.json(
        { error: 'Message delivery is not configured yet. Please use the email link or social channels for now.' },
        { status: 503 }
      )
    }

    if (error instanceof InvalidJsonBodyError || error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const requestId = reportUnexpectedFailure('contact', phase)
    recordServerOutcome(request, 'contact_failed')
    return NextResponse.json(
      { error: 'Failed to process your message. Please try again.' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
