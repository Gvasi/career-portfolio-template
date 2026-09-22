// Explicit local QA helper: validate real widget tokens without creating events or sending email.
import { createServer } from 'node:http'
import { verifyTurnstile } from '../../src/lib/security/turnstile.ts'

if (!process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_ALLOWED_HOSTNAMES !== 'localhost') {
  throw new Error('Run with the localhost widget credentials, never the production widget.')
}
const server = createServer(async (req, res) => {
  if (req.headers.origin !== 'http://localhost:3000' || !['/contact', '/booking'].includes(req.url)) {
    res.writeHead(403).end(); return
  }
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return }
  if (req.method !== 'POST') { res.writeHead(405).end(); return }
  try {
    const chunks = []; let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > 4096) { res.writeHead(413).end(); return }
      chunks.push(chunk)
    }
    const { token } = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    await verifyTurnstile(token, req.url.slice(1))
    console.log(`Verified live ${req.url.slice(1)} token for localhost.`)
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
  } catch {
    console.log(`Rejected invalid or reused ${req.url.slice(1)} token.`)
    res.writeHead(403, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: false }))
  }
})
server.listen(3198, '127.0.0.1', () => console.log('Local token-only validation ready on 127.0.0.1:3198. No Calendar/mail handlers.'))
