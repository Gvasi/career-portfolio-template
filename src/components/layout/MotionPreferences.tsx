"use client"

import { MotionConfig } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export default function MotionPreferences({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  useEffect(() => {
    const root = document.documentElement
    const visibility = () => { root.dataset.pageHidden = String(document.hidden) }
    visibility()
    document.addEventListener('visibilitychange', visibility)
    // Keep the observed set so cleanup only clears attributes this effect wrote,
    // never sections of a route that has already mounted in its place.
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main section'))
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { (entry.target as HTMLElement).dataset.motionPaused = String(!entry.isIntersecting) })
    }, { rootMargin: '80px' })
    sections.forEach(section => observer.observe(section))
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      delete root.dataset.pageHidden
      sections.forEach(section => { delete section.dataset.motionPaused })
    }
  }, [pathname])
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
