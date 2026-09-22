import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildMimeEmail } from '../../src/lib/email/mime.ts'
import { bookingConfirmation, messageAcknowledgement } from '../../src/lib/email/templates.ts'
import { site } from '../../src/config/site.ts'

test('visitor templates include usable meeting details and allow only Google Meet links', () => {
  const fixture = { date: 'Mon, 14 Sep 2026', time: '18:30–19:00', timeZone: 'Europe/Paris', duration: 30, topic: 'Hiring', meetLink: 'https://meet.google.com/abc-defg-hij' }
  const email = bookingConfirmation(fixture)
  assert.equal(email.subject, `Your intro with ${site.firstName} — Mon, 14 Sep 2026`)
  for (const value of ['Europe/Paris', '30 minutes', 'Work', 'invite.ics', 'cancel', fixture.meetLink]) {
    assert.ok(email.text.includes(value)); assert.ok(email.html.includes(value))
  }
  assert.ok(!bookingConfirmation({ ...fixture, meetLink: 'https://meet.google.com.evil.test/a' }).html.includes('href="https://meet.google.com.evil'))
  assert.ok(!bookingConfirmation({ ...fixture, meetLink: 'javascript:alert(1)' }).html.includes('javascript:'))
})

test('automatic responses do not reflect untrusted topic markup, and details are escaped', () => {
  const injection = '<img src=x onerror=alert(1)>'
  const ack = messageAcknowledgement(injection)
  assert.ok(!ack.html.includes(injection)); assert.ok(ack.text.includes('Topic: Hello'))
  const booking = bookingConfirmation({ date: injection, time: '10:00', timeZone: 'UTC', duration: 30, topic: injection })
  assert.ok(!booking.html.includes(injection)); assert.ok(booking.html.includes('&lt;img'))
  assert.ok(!ack.html.includes('<img')); assert.ok(!ack.html.includes('<script'))
})

test('MIME has plain/HTML alternatives, an intact calendar attachment, encoded Unicode and safe headers', () => {
  const invite = 'BEGIN:VCALENDAR\r\nSUMMARY:Intro with the owner\r\nEND:VCALENDAR'
  const mail = messageAcknowledgement('Ideas')
  const raw = Buffer.from(buildMimeEmail({ to: 'visitor@example.com', from: 'Owner <owner@example.com>', replyTo: 'owner@example.com\r\nBcc: unwanted@example.com', subject: mail.subject, text: mail.text, html: mail.html, calendarInvite: invite }), 'base64url').toString()
  assert.ok(raw.includes('multipart/mixed')); assert.ok(raw.includes('multipart/alternative'))
  assert.ok(raw.includes('text/calendar; method=REQUEST')); assert.ok(raw.includes('filename="invite.ics"'))
  assert.ok(!raw.includes('\r\nBcc:')); assert.ok(raw.includes('Auto-Submitted: auto-generated'))
  const subject = raw.match(/Subject: =\?UTF-8\?B\?(.+?)\?=/)[1]
  assert.equal(Buffer.from(subject, 'base64').toString(), mail.subject)
  const parts = [...raw.matchAll(/Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)(?=--)/g)].map(match => Buffer.from(match[1].replace(/\s/g, ''), 'base64').toString())
  assert.deepEqual(parts, [mail.text, mail.html, invite])
  assert.ok(!/(?<!\r)\n/.test(raw))
})
