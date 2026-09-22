import { randomUUID } from 'node:crypto'
import { SITE_HOST } from '@/config/site'

function header(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function encodedHeader(value: string) {
  const safe = header(value)
  if (/^[\x20-\x7e]*$/.test(safe) && safe.length < 70) return safe
  // Keep each encoded-word below RFC 2047's 75-character limit without
  // splitting a UTF-8 character. Folding prevents long visitor names/subjects.
  const chunks: string[] = []
  let chunk = ''
  for (const character of safe) {
    if (Buffer.byteLength(chunk + character) > 42) { chunks.push(chunk); chunk = '' }
    chunk += character
  }
  if (chunk) chunks.push(chunk)
  return chunks.map(value => `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`).join('\r\n ')
}

function base64(value: string) {
  return Buffer.from(value).toString('base64').match(/.{1,76}/g)?.join('\r\n') || ''
}

export function buildMimeEmail({ to, subject, text, html, from, replyTo, calendarInvite }: {
  to: string; subject: string; text: string; html?: string; from?: string; replyTo?: string; calendarInvite?: string
}) {
  const alternative = `alternative-${randomUUID()}`
  const mixed = `mixed-${randomUUID()}`
  const part = (type: string, content: string) => [`Content-Type: ${type}; charset="UTF-8"`, 'Content-Transfer-Encoding: base64', '', base64(content)].join('\r\n')
  const content = html
    ? [`Content-Type: multipart/alternative; boundary="${alternative}"`, '', `--${alternative}`, part('text/plain', text), `--${alternative}`, part('text/html', html), `--${alternative}--`].join('\r\n')
    : part('text/plain', text)
  const body = calendarInvite ? [
    `Content-Type: multipart/mixed; boundary="${mixed}"`, '', `--${mixed}`, content,
    `--${mixed}`, 'Content-Type: text/calendar; method=REQUEST; charset="UTF-8"; name="invite.ics"',
    'Content-Disposition: attachment; filename="invite.ics"', 'Content-Transfer-Encoding: base64', '', base64(calendarInvite), `--${mixed}--`,
  ].join('\r\n') : content
  return Buffer.from([
    ...(from ? [`From: ${header(from)}`] : []), `To: ${header(to)}`,
    ...(replyTo ? [`Reply-To: ${header(replyTo)}`] : []), `Subject: ${encodedHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`, `Message-ID: <${randomUUID()}@${SITE_HOST}>`,
    'MIME-Version: 1.0', 'Auto-Submitted: auto-generated', 'X-Auto-Response-Suppress: All', body, '',
  ].join('\r\n')).toString('base64url')
}
