'use client'

import Link from 'next/link'
import { useState, type ComponentProps } from 'react'

/** Reserve initial bandwidth for this page; warm navigation when interest is explicit. */
export default function IntentLink({ onMouseEnter, onFocus, onPointerDown, ...props }: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  const [interested, setInterested] = useState(false)
  return <Link {...props} prefetch={interested ? null : false}
    onMouseEnter={event => { onMouseEnter?.(event); setInterested(true) }}
    onFocus={event => { onFocus?.(event); setInterested(true) }}
    onPointerDown={event => { onPointerDown?.(event); setInterested(true) }}
  />
}
