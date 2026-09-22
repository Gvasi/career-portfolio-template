import { site, SITE_HOST } from '@/config/site'
import { PUBLIC_CONTACT_EMAIL } from './identity'

const NAME = site.name
const FIRST_NAME = site.firstName
const SITE = site.url
const SITE_DISPLAY = SITE_HOST.replace(/^www\./, '')

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function emailTopic(value?: string | null) {
  switch (value?.trim().toLowerCase()) {
    case 'hiring': case 'work': return 'Work'
    case 'vc / startup': case 'startup': case 'ideas': return 'Ideas'
    case 'project': case 'consulting': return 'Project'
    default: return 'Hello'
  }
}

function paragraph(text: string) {
  return `<p style="margin:0 0 20px;color:#425b70;font-size:16px;line-height:1.65">${escapeEmailHtml(text)}</p>`
}

function frame(preheader: string, eyebrow: string, title: string, content: string, reason: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEmailHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;color:#06254a;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeEmailHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe3e9;border-radius:20px">
<tr><td style="padding:28px 28px 22px;border-bottom:1px solid #e4e9ee"><a href="${SITE}" style="color:#06254a;text-decoration:none;font-size:15px;font-weight:bold">${escapeEmailHtml(NAME)}<span style="color:#118578">.</span></a></td></tr>
<tr><td style="padding:30px 28px 12px"><p style="margin:0 0 12px;color:#118578;font-size:12px;line-height:1.5;font-weight:bold;letter-spacing:1.6px">${escapeEmailHtml(eyebrow)}</p>
<h1 style="margin:0 0 24px;color:#06254a;font-size:28px;line-height:1.2;letter-spacing:-.6px">${escapeEmailHtml(title)}</h1>${content}
<p style="margin:28px 0 24px;color:#06254a;font-size:16px;line-height:1.6">Speak soon,<br><strong>${escapeEmailHtml(FIRST_NAME)}</strong><br><a href="mailto:${PUBLIC_CONTACT_EMAIL}" style="color:#425b70;font-size:13px;text-decoration:none;word-break:break-word">${PUBLIC_CONTACT_EMAIL}</a></p></td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #e4e9ee;color:#60758a;font-size:12px;line-height:1.6">${escapeEmailHtml(reason)}<br><a href="${SITE}" style="color:#425b70;text-decoration:underline">${SITE_DISPLAY}</a></td></tr>
</table></td></tr></table></body></html>`
}

export function messageAcknowledgement(topic: string) {
  const label = emailTopic(topic)
  const subject = `Message received — ${NAME}`
  const intro = 'Thanks for getting in touch. Your message has reached me, and I’ll read it personally.'
  const next = 'If you’d like to add anything, just reply to this email.'
  return {
    subject,
    text: ['Thanks for reaching out.', '', intro, '', `Topic: ${label}`, '', next, '', 'Speak soon,', FIRST_NAME, PUBLIC_CONTACT_EMAIL, '', `You’re receiving this confirmation because your email was used on ${SITE_DISPLAY}. If that wasn’t you, no action is needed.`].join('\n'),
    html: frame('Your message has reached me. You can reply here to add anything.', 'MESSAGE RECEIVED', 'Thanks for reaching out.',
      paragraph(intro) + `<p style="margin:0 0 22px;padding:14px 16px;background:#f5f7f9;border-radius:10px;color:#425b70;font-size:14px;line-height:1.5">Topic <strong style="color:#06254a">${label}</strong></p>` + paragraph(next),
      'You’re receiving this confirmation because your email was used on my contact form. If that wasn’t you, no action is needed.'),
  }
}

export function bookingConfirmation({ date, time, timeZone, duration, topic, meetLink }: {
  date: string; time: string; timeZone: string; duration: number; topic?: string | null; meetLink?: string | null
}) {
  // Only Google-generated meeting URLs become active links. Do not reflect form
  // notes or names into automatic email sent to an unverified recipient.
  let safeMeetLink: string | null = null
  try { const url = new URL(meetLink || ''); if (url.protocol === 'https:' && url.hostname === 'meet.google.com' && !url.username && !url.password) safeMeetLink = url.href } catch { /* No meeting URL yet. */ }
  const label = emailTopic(topic)
  const rows = [['When', date], ['Time', `${time} · ${timeZone}`], ['Duration', `${duration} minutes`], ['Topic', label]]
  const details = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 24px;background:#f5f7f9;border-radius:12px"><tr><td style="padding:14px 18px">${rows.map(([key, value]) => `<p style="margin:8px 0;color:#06254a;font-size:15px;line-height:1.6"><span style="color:#60758a">${key}</span><br><strong>${escapeEmailHtml(value)}</strong></p>`).join('')}</td></tr></table>`
  const join = safeMeetLink
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 16px"><tr><td bgcolor="#06254a" style="border-radius:24px;text-align:center"><a href="${escapeEmailHtml(safeMeetLink)}" style="display:inline-block;padding:15px 24px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold">Join Google Meet &rarr;</a></td></tr></table><p style="margin:0 0 24px;color:#60758a;font-size:12px;line-height:1.6;word-break:break-all">Or open <a href="${escapeEmailHtml(safeMeetLink)}" style="color:#425b70">${escapeEmailHtml(safeMeetLink)}</a></p>`
    : paragraph('Your time is reserved. I’ll follow up with the meeting link before we speak.')
  const next = 'Add the attached invite.ics file to your calendar. Need to change or cancel? Reply to this email and I’ll help.'
  return {
    subject: `Your intro with ${FIRST_NAME} — ${date}`,
    text: ['Your intro is booked.', '', 'Thanks for making time. I’m looking forward to our conversation.', '', ...rows.map(([key, value]) => `${key}: ${value}`), '', safeMeetLink ? `Join Google Meet: ${safeMeetLink}` : 'I’ll follow up with the meeting link before we speak.', '', next, '', 'Speak soon,', FIRST_NAME, PUBLIC_CONTACT_EMAIL, '', `This confirms an intro booked through ${SITE_DISPLAY}. If you didn’t book it, reply to let me know.`].join('\n'),
    html: frame(`${date}, ${time} (${timeZone}). Your meeting details and calendar invite.`, 'BOOKING CONFIRMED', 'Your intro is booked.',
      paragraph('Thanks for making time. I’m looking forward to our conversation.') + details + join + paragraph(next),
      'This confirms an intro booked through my website. If you didn’t book it, reply to let me know.'),
  }
}
