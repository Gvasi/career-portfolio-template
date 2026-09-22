import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { site } from '../src/config/site.ts'

// An editorial preflight for someone making the template their own. Deliberately
// separate from CI: a template should pass CI with its fictional example intact.
const findings = []
const flag = message => findings.push(message)
const placeholder = /example\.com|your-handle/i

if (site.exampleContent) flag('site.exampleContent is still true. Replace the fictional story before switching it off.')
for (const [field, value] of Object.entries({ url: site.url, contactEmail: site.contactEmail, github: site.github, linkedin: site.linkedin })) {
  if (placeholder.test(value)) flag(`site.${field} still uses a placeholder.`)
}
if (!site.url.startsWith('https://')) flag('Use an HTTPS public URL before publishing.')
for (const link of site.socialRail) {
  if (placeholder.test(link.href)) flag(`Replace or remove the ${link.name} social profile.`)
}

for (const filename of ['home.ts', 'career.ts', 'projects.ts', 'toolkit.tsx', 'contact.ts']) {
  const source = await readFile(new URL(`../src/content/${filename}`, import.meta.url), 'utf8')
  if (/Alex|Example Academy|Example University|Northwind|Harbourline|your-handle|example\.com/.test(source)) {
    flag(`Review src/content/${filename}: it still contains example names or destinations.`)
  }
  if (/example:\s*true/.test(source)) flag(`Replace the sample credentials in src/content/${filename}.`)
}

for (const [field, path] of Object.entries(site.assets)) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) {
    flag(`site.assets.${field} must point to a file inside public/.`)
    continue
  }
  try {
    await access(new URL(`../public${path}`, import.meta.url))
  } catch {
    flag(`Missing asset for site.assets.${field}: public${path}`)
  }
}
if (site.assets.cv.endsWith('/sample-cv.pdf')) flag('Replace the sample CV and give your PDF a personal filename in site.assets.cv.')
if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') flag('Demo mode is enabled. Remove it and rebuild before accepting real messages or bookings.')

console.log(`Content check: ${fileURLToPath(new URL('..', import.meta.url))}`)
if (findings.length) {
  console.log('\nBefore publishing under your name:\n' + findings.map(message => `- ${message}`).join('\n'))
  process.exitCode = 1
} else {
  console.log('\nNo known placeholders or missing configured assets found.')
}
console.log('\nAlso review images, the PDF, privacy wording and every claim yourself. This check cannot verify your experience or third-party accounts.\nSee docs/customisation.md for the full checklist.')
