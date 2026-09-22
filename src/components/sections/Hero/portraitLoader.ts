import type { ImageLoaderProps } from 'next/image'
import portrait256 from '../../../../public/images/profile/portrait-256.webp'
import portrait384 from '../../../../public/images/profile/portrait-384.webp'
import portrait640 from '../../../../public/images/profile/portrait-640.webp'
import portrait750 from '../../../../public/images/profile/portrait-750.webp'
import portrait828 from '../../../../public/images/profile/portrait-828.webp'
import portrait1080 from '../../../../public/images/profile/portrait-1080.webp'
import portrait1200 from '../../../../public/images/profile/portrait-1200.webp'

/** The hero portrait source. Replace the file and keep the name: the script and the imports below read it. */
export const PORTRAIT_SOURCE = '/images/profile/portrait-source.png'

// Static imports of the sizes written by scripts/prepare-portrait.mjs produce
// content-hashed URLs with Next's immutable asset caching.
const portraits: Record<number, string> = {
  256: portrait256.src, 384: portrait384.src, 640: portrait640.src,
  750: portrait750.src, 828: portrait828.src, 1080: portrait1080.src,
  1200: portrait1200.src,
}

export default function portraitLoader({ src, width, quality = 75 }: ImageLoaderProps) {
  if (src === PORTRAIT_SOURCE && quality === 75 && portraits[width]) return portraits[width]
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`
}
