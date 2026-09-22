'use client'

// The two mark renderers of the toolkit. `BrandIcon` draws a single-path
// vector mark (the catalogue in src/content/toolkit.tsx says where the paths
// come from and that the trademarks stay with their owners). `TextMark` is the
// neutral alternative for a tool without a verified mark: a rounded tile with
// a short label in the site's own colours, so nothing is redrawn from memory.
interface BrandIconProps {
  path: string
  color: string
  viewBox?: string
}

export function BrandIcon({ path, color, viewBox = '0 0 24 24' }: BrandIconProps) {
  return (
    <svg viewBox={viewBox} role="img" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" aria-hidden="true">
      <path d={path} fill={color} />
    </svg>
  )
}

export function TextMark({ label }: { label: string }) {
  const fontSize = label.length > 2 ? 9 : 11
  return (
    <svg viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#06254A" />
      <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fill="#2DD4BF" fontFamily="var(--font-fira-code), ui-monospace, monospace" fontSize={fontSize} fontWeight="600" letterSpacing="-.02em">{label}</text>
    </svg>
  )
}
