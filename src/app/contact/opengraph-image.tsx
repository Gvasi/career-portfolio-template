// A child segment that exports its own `openGraph` metadata replaces the root
// segment's, which also drops the inherited file-convention image. Re-exporting
// the root OG image here keeps /contact covered by the same card.
export { default, alt, size, contentType } from '../opengraph-image'
