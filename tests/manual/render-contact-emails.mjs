// Local previews only; no mail service or credentials are loaded.
import { mkdirSync, writeFileSync } from 'node:fs'
import { bookingConfirmation, messageAcknowledgement } from '../../src/lib/email/templates.ts'
mkdirSync('output/email-previews', { recursive: true })
const booking = bookingConfirmation({ date: 'Mon, 14 Sep 2026', time: '18:30–19:00', timeZone: 'Europe/Paris', duration: 30, topic: 'Hiring', meetLink: 'https://meet.google.com/abc-defg-hij' })
const message = messageAcknowledgement('Ideas')
for (const [name, content] of [['booking', booking], ['message', message]]) {
  writeFileSync(`output/email-previews/${name}.html`, content.html)
  writeFileSync(`output/email-previews/${name}.txt`, `Subject: ${content.subject}\n\n${content.text}`)
}
console.log('Rendered booking and message previews to output/email-previews (example data only).')
