import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

// Same encoder as Next's image optimizer (sharp is pinned to the version Next resolves),
// run before the first visit so the hero portrait is ready as static WebP. The
// source is the fixed portrait-source.png documented in site.ts; the sizes
// match the static imports in src/components/sections/Hero/portraitLoader.ts.
// Nothing is written when a size is already up to date.
const source = new URL('../public/images/profile/portrait-source.png', import.meta.url)
const widths = [256, 384, 640, 750, 828, 1080, 1200]

const original = await readFile(source)

await Promise.all(widths.map(async width => {
  const output = new URL(`../public/images/profile/portrait-${width}.webp`, import.meta.url)
  const image = await sharp(original)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer()
  const existing = await readFile(output).catch(error => {
    if (error.code !== 'ENOENT') throw error
    return null
  })
  if (!existing?.equals(image)) await writeFile(output, image)
}))

// The sharing card uses the same source, so changing a portrait cannot leave
// the previous person's face in a social preview. Keep the literal asset path
// in opengraph-image.tsx so Next includes this file in the deployment.
const shareOutput = new URL('../src/assets/opengraph/portrait.png', import.meta.url)
const shareImage = await sharp(original).rotate().resize(520, 520, { fit: 'cover' }).png().toBuffer()
const previousShare = await readFile(shareOutput).catch(error => {
  if (error.code !== 'ENOENT') throw error
  return null
})
if (!previousShare?.equals(shareImage)) await writeFile(shareOutput, shareImage)
