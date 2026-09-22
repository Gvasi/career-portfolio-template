import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ImageResponse } from 'next/og'
import { site, SITE_HOST } from '@/config/site'

export const alt = `${site.name} — ${site.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// The inputs live under src/assets (not public/): the bundler traces them into
// the deployed output because `new URL(..., import.meta.url)` stays a literal,
// hence the three separate constants. The fonts are Poppins (SIL OFL 1.1, see
// docs/licenses/OFL-Poppins.txt); the portrait is the placeholder illustration.
const PORTRAIT_URL = new URL('../assets/opengraph/portrait.png', import.meta.url)
const FONT_REGULAR_URL = new URL('../assets/fonts/poppins-regular.ttf', import.meta.url)
const FONT_BOLD_URL = new URL('../assets/fonts/poppins-bold.ttf', import.meta.url)

async function loadAsset(url: URL, relativePath: string): Promise<Buffer | null> {
  try {
    if (url.protocol === 'file:') {
      return await readFile(fileURLToPath(url))
    }
    const response = await fetch(url)
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer())
    }
  } catch {
    // Fall through to the filesystem lookup below.
  }

  try {
    return await readFile(join(process.cwd(), 'src', 'assets', relativePath))
  } catch {
    return null
  }
}

export default async function OpengraphImage() {
  const [portraitBuffer, regularFont, boldFont] = await Promise.all([
    loadAsset(PORTRAIT_URL, 'opengraph/portrait.png'),
    loadAsset(FONT_REGULAR_URL, 'fonts/poppins-regular.ttf'),
    loadAsset(FONT_BOLD_URL, 'fonts/poppins-bold.ttf'),
  ])

  const portrait = portraitBuffer
    ? `data:image/png;base64,${portraitBuffer.toString('base64')}`
    : null

  const fonts = [
    regularFont && { name: 'Poppins', data: regularFont, weight: 400 as const, style: 'normal' as const },
    boldFont && { name: 'Poppins', data: boldFont, weight: 700 as const, style: 'normal' as const },
  ].filter((font): font is NonNullable<typeof font> => Boolean(font))

  const fontFamily = fonts.length > 0 ? 'Poppins' : undefined

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#06254A',
          backgroundImage:
            'radial-gradient(circle at 88% 6%, rgba(45,212,191,0.26) 0%, rgba(45,212,191,0.07) 34%, rgba(6,37,74,0) 62%)',
          fontFamily,
        }}
      >
        {/* Thin brand rule along the bottom edge. */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 1200,
            height: 6,
            display: 'flex',
          }}
        >
          <div style={{ width: 552, height: 6, backgroundColor: '#2DD4BF' }} />
          <div style={{ width: 96, height: 6, backgroundColor: '#D4AF37' }} />
          <div style={{ width: 552, height: 6, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        </div>

        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            padding: '80px 74px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: 710, paddingRight: 36 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: site.name.length > 32 ? 48 : site.name.length > 23 ? 58 : 70,
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.06,
                letterSpacing: -1.6,
              }}
            >
              {site.name}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '32px 0 26px 0' }}>
              <div style={{ width: 88, height: 5, borderRadius: 3, backgroundColor: '#2DD4BF' }} />
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 9,
                  backgroundColor: '#D4AF37',
                  marginLeft: 12,
                }}
              />
            </div>

            <div style={{ fontSize: 29, color: '#DCE9F7', lineHeight: 1.3 }}>
              {site.tagline}
            </div>

            <div style={{ fontSize: 23, color: '#B6CDDF', marginTop: 26 }}>
              {`${site.location.label} · ${SITE_HOST.replace(/^www\./, '')}`}
            </div>
          </div>

          {portrait ? (
            // next/image cannot be used inside ImageResponse; satori renders raw <img>.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portrait}
              width={260}
              height={260}
              alt=""
              style={{
                width: 260,
                height: 260,
                borderRadius: 260,
                objectFit: 'cover',
                border: '4px solid rgba(45,212,191,0.55)',
              }}
            />
          ) : null}
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined }
  )
}
