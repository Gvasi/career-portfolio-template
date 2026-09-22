'use client'

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import type { TouchEvent } from 'react'
import { motion, AnimatePresence, useIsPresent } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { selectionDistance, selectionTransition } from '@/lib/selectionMotion'
import { useMediaQuery, useMotionActivity, usePageVisible } from '@/hooks/useMotionActivity'
import { Workflow } from 'lucide-react'
import SectionAccent from './SectionAccent'
import copyStyles from './HowIWorkCopy.module.css'
import { HOW_I_WORK_SECTIONS as SECTIONS, HOW_I_WORK_SIDE_COPY as SIDE_COPY, type HowIWorkSection as Section } from '@/content/home'

// All six text variants share one grid cell, so the longest sets the slot size.
// Hidden variants have no artwork, interaction, or accessibility-tree presence.
function CopySlot({ id, field, mobile = false }: {
  id: Section['id']; field: 'summary' | 'quote' | 'question' | 'answer'; mobile?: boolean
}) {
  return <div className={`${copyStyles.stack} ${copyStyles[field]} ${mobile ? copyStyles.mobile : ''}`} data-how-copy={field}>
    {SECTIONS.map(section => {
      const copy = SIDE_COPY[section.id]
      const current = section.id === id
      return <div key={section.id} data-current={current} aria-hidden={!current} inert={!current}>
        {field === 'summary' ? section.items.map(line => <p key={line}>{line}</p>)
          : field === 'quote' ? (mobile ? <p>{copy.quoteLines.join(' ')}</p> : copy.quoteLines.map(line => <p key={line}>{line}</p>))
          : <p>{field === 'question' ? copy.faqQ : copy.faqA}</p>}
      </div>
    })}
  </div>
}

const TabButton = ({
  section,
  isActive,
  onClick,
  tabRef,
}: {
  section: Section
  isActive: boolean
  onClick: () => void
  tabRef: (el: HTMLButtonElement | null) => void
}) => {
  return (
    <motion.button
      ref={tabRef}
      onClick={onClick}
      aria-pressed={isActive}
      whileHover={{ scale: isActive ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative px-5 py-3 text-sm font-semibold transition-colors duration-300 z-10
        ${isActive
          ? 'text-[var(--c-navy)]'
          : 'text-slate-600 hover:text-slate-700'
        }
      `}
    >
      <span className="relative">
        {section.title}
        {/* Hover underline accent */}
        {!isActive && (
          <motion.span
            aria-hidden='true'
            className="absolute -bottom-0.5 left-0 right-0 h-px bg-[var(--c-primary)]"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </span>
    </motion.button>
  )
}

const ContentPanel = ({
  section,
  index,
  direction,
}: {
  section: Section
  index: number
  direction: number
}) => {
  const sectionNumber = String(index + 1).padStart(2, '0')
  const panelRef = useRef<HTMLDivElement>(null)
  const { reduced } = useMotionActivity(panelRef)
  const present = useIsPresent()

  return (
    <motion.div
      ref={panelRef}
      key={section.id}
      initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : direction * selectionDistance }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduced ? 0 : -direction * selectionDistance }}
      transition={reduced ? { duration: 0 } : selectionTransition}
      aria-hidden={!present} inert={!present}
      data-content-panel
      className="pt-2 [grid-area:1/1]"
    >
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[280px]">
        {/* Left: Number-as-hero with thematic accent, vertically centered */}
        <div className="relative flex flex-col justify-center h-full py-6">
          {/* Thematic accent - top right */}
          <div className="absolute top-2 right-0">
            <SectionAccent id={section.id} />
          </div>

          {/* Large section number as hero */}
          <span aria-hidden="true"
            className="text-6xl font-bold text-[var(--c-primary)]/20 mb-2 tracking-tight"
          >
            {sectionNumber}
          </span>

          <h3 className="text-3xl font-bold text-[var(--c-navy)] mb-4">{section.title}</h3>

          <CopySlot id={section.id} field="summary" />

          {/* Subtle bottom accent line */}
          <div className="w-16 h-0.5 bg-gradient-to-r from-[var(--c-primary)] to-transparent mt-6" />
        </div>

        {/* Right: Quote card with shimmer effect */}
        <div className="h-full flex items-center">
          <div data-how-desktop-quote className="bg-gradient-to-br from-[var(--c-navy)] via-[#072d4f] to-[#083454] rounded-2xl p-7 text-white relative overflow-hidden w-full">

            {/* Subtle decorative glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-[var(--c-primary)]/10 rounded-full blur-2xl" />

            <div className="relative">
              <span className="text-4xl text-[var(--c-primary)]/50 font-serif leading-none">&ldquo;</span>
              <div className="mt-2 mb-6"><CopySlot id={section.id} field="quote" /></div>

              <div className="pt-5 border-t border-white/10">
                <CopySlot id={section.id} field="question" />
                <CopySlot id={section.id} field="answer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Phone layout: the chapters as a horizontally scrollable tab strip above one panel.
const MobileHorizontalTabs = ({
  sections,
  activeIndex,
  onSelect,
  direction,
}: {
  sections: readonly Section[]
  activeIndex: number
  onSelect: (index: number) => void
  direction: number
}) => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  // Scroll active tab into view
  useEffect(() => {
    const activeTab = tabRefs.current[activeIndex]
    const container = scrollContainerRef.current
    if (activeTab && container) {
      const tabRect = activeTab.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const scrollLeft = activeTab.offsetLeft - (containerRect.width / 2) + (tabRect.width / 2)
      container.scrollTo({ left: scrollLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    }
  }, [activeIndex, prefersReducedMotion])

  const activeSection = sections[activeIndex]

  const clearTouch = () => {
    touchStartX.current = null
    touchStartY.current = null
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch) { clearTouch(); return }
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const touch = event.changedTouches[0]
    if (!touch) { clearTouch(); return }
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    if (Math.abs(deltaX) > 45 && Math.abs(deltaY) < 40) {
      if (deltaX < 0 && activeIndex < sections.length - 1) {
        onSelect(activeIndex + 1)
      } else if (deltaX > 0 && activeIndex > 0) {
        onSelect(activeIndex - 1)
      }
    }
  }

  return (
    <div className="px-2">
      {/* Horizontal scrollable pill tabs */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto pb-3 -mx-2 px-2 scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        {sections.map((section, index) => {
          const isActive = index === activeIndex
          const sectionNumber = String(index + 1).padStart(2, '0')

          return (
            <motion.button
              key={section.id}
              ref={(el) => { tabRefs.current[index] = el }}
              onClick={() => onSelect(index)}
              className={`
                relative flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-full shrink-0
                transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/50
                ${isActive
                  ? 'bg-[var(--c-navy)] text-white shadow-lg shadow-[var(--c-navy)]/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
              style={{ scrollSnapAlign: 'center' }}
              whileTap={{ scale: 0.97 }}
              aria-label={`Step ${index + 1}: ${section.title}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className={`text-sm font-mono ${isActive ? 'text-[var(--c-primary)]' : 'text-slate-600'}`}>
                {sectionNumber}
              </span>
              <span className="text-sm font-semibold">{section.title}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-primary)]" />
              )}
            </motion.button>
          )
        })}
      </div>

      <div className="mb-4 flex items-center justify-between px-1 text-xs text-slate-500">
        <span>Swipe or choose a step</span>
        <span className="shrink-0 whitespace-nowrap font-mono tabular-nums text-[#087568]">{String(activeIndex + 1).padStart(2, '0')} / 06</span>
      </div>

      {/* Content card - swipe feel */}
      <div className="relative grid">
      <AnimatePresence mode="sync" initial={false}>
        <PresenceCard
          key={activeSection.id}
          initial={{ opacity: prefersReducedMotion ? 1 : 0, x: prefersReducedMotion ? 0 : direction * selectionDistance }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -direction * selectionDistance }}
          transition={prefersReducedMotion ? { duration: 0 } : selectionTransition}
          className="[grid-area:1/1] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(6,37,74,0.1)]"
          data-how-mobile-card
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={clearTouch}
          style={{ touchAction: 'pan-y' }}
        >
          {/* Header with accent and number */}
          <div
            className="relative min-h-[6rem] border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5"
            data-how-mobile-header
          >
            {/* Thematic accent - top right */}
            <div
              className="absolute right-4 top-1/2 h-[5.25rem] w-[5.25rem] -translate-y-1/2"
              data-how-mobile-accent
            >
              <SectionAccent id={activeSection.id} variant="mobile" />
            </div>

            {/* Section number and title */}
            <div className="pr-24">
              <span aria-hidden="true" className="text-3xl font-bold text-[var(--c-primary)]/20 tracking-tight">
                {String(activeIndex + 1).padStart(2, '0')}
              </span>
              <h3 className="text-xl font-bold text-[var(--c-navy)] -mt-1">{activeSection.title}</h3>
            </div>
          </div>

          {/* Tagline */}
          <div className="px-5 py-4 border-b border-slate-100"><CopySlot id={activeSection.id} field="summary" mobile /></div>

          {/* Quote card */}
          <div className="px-2.5 py-3">
            <div
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--c-navy)] via-[#072d4f] to-[#083454] p-5 text-white"
              data-how-mobile-quote
            >

              {/* Subtle glow */}
              <div className="absolute -top-8 -right-8 w-16 h-16 bg-[var(--c-primary)]/10 rounded-full blur-xl" />

              <div className="relative">
                <span className="text-2xl text-[var(--c-primary)]/50 font-serif leading-none">&ldquo;</span>
                <div className="mt-1 mb-3"><CopySlot id={activeSection.id} field="quote" mobile /></div>

                <div className="pt-3 border-t border-white/10">
                  <CopySlot id={activeSection.id} field="question" mobile />
                  <CopySlot id={activeSection.id} field="answer" mobile />
                </div>
              </div>
            </div>
          </div>
        </PresenceCard>
      </AnimatePresence>
      </div>

    </div>
  )
}

// Exiting cards remain painted briefly but leave the accessibility tree immediately.
function PresenceCard(props: HTMLMotionProps<'div'>) {
  const present = useIsPresent()
  return <motion.div {...props} aria-hidden={!present} inert={!present} />
}

export default function HowIWork() {
  const pageVisible = usePageVisible()
  const [isVisible, setIsVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  // Hover and keyboard focus hold rotation independently; either one is enough.
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const isPaused = hovered || focused
  const [userPaused, setUserPaused] = useState(false)
  const [isOnScreen, setIsOnScreen] = useState(false)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [desktopPanelMinHeight, setDesktopPanelMinHeight] = useState(0)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const desktopPanelShellRef = useRef<HTMLDivElement | null>(null)
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])

  const handleTabChange = useCallback((newIndex: number) => {
    setDirection(newIndex > activeIndex ? 1 : -1)
    setActiveIndex(newIndex)
    // Manual selection keeps the reader in control for the rest of this visit.
    setUserPaused(true)
  }, [activeIndex])

  // The sliding indicator follows the active tab's measured box.
  useEffect(() => {
    const activeTab = tabsRef.current[activeIndex]
    if (activeTab) {
      setIndicatorStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      })
    }
  }, [activeIndex, isVisible, isDesktopViewport])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const updateViewportMode = (event?: MediaQueryListEvent) => {
      setIsDesktopViewport(event?.matches ?? media.matches)
    }
    updateViewportMode()
    media.addEventListener('change', updateViewportMode)
    return () => media.removeEventListener('change', updateViewportMode)
  }, [])

  useLayoutEffect(() => {
    if (!isDesktopViewport) return
    const shell = desktopPanelShellRef.current
    if (!shell) return

    const measure = () => {
      const panel = shell.querySelector<HTMLElement>('[data-content-panel]')
      if (!panel) return
      const nextHeight = Math.ceil(panel.getBoundingClientRect().height)
      if (nextHeight > 0) {
        setDesktopPanelMinHeight(prev => (nextHeight > prev ? nextHeight : prev))
      }
    }

    const rafId = window.requestAnimationFrame(measure)
    window.addEventListener('resize', measure)

    let resizeObserver: ResizeObserver | null = null
    const panel = shell.querySelector<HTMLElement>('[data-content-panel]')
    if (panel && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measure())
      resizeObserver.observe(panel)
    }

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', measure)
      resizeObserver?.disconnect()
    }
  }, [activeIndex, isDesktopViewport])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsOnScreen(entry.isIntersecting)
      if (entry.isIntersecting) setIsVisible(true)
    }, { threshold: 0.05 })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Auto-rotation gives each visible panel 11.2 seconds of reading time.
  useEffect(() => {
    // Keep mobile content stable and user-controlled: no auto-rotation on touch layouts.
    if (!pageVisible || isPaused || userPaused || prefersReducedMotion || !isOnScreen || !isDesktopViewport) return

    const delay = 11200

    const timer = setTimeout(() => {
      setDirection(1)
      setActiveIndex((prev) => (prev + 1) % SECTIONS.length)
    }, delay)

    return () => clearTimeout(timer)
  }, [pageVisible, isPaused, userPaused, prefersReducedMotion, isOnScreen, activeIndex, isDesktopViewport])

  const activeSection = SECTIONS[activeIndex]

  return (
    <section
      id='how-i-work'
      className="relative section-shell bg-white"
      ref={containerRef}
    >
      <div className="container mx-auto px-4 sm-plus:px-6 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        {/* Section Header */}
        <div className="text-center mb-7 md:mb-9">
          <div className="section-eyebrow"><Workflow size={16} aria-hidden="true"/><span>Approach</span></div>
          <h2 className="section-title text-transparent bg-clip-text bg-gradient-to-r from-[#072d5f] via-[#0b3b72] to-[#18b08f]">How I Work</h2>
        </div>

        {/* Desktop: Tab Bar + Content */}
        {isDesktopViewport && (
          <motion.div
            className="hidden lg:block max-w-5xl mx-auto"
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocused(false) }}
            initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
          {/* Tab Bar */}
          <div className="relative flex justify-center">
            {/* Tab container with visible pill background */}
            <div className="relative flex items-center bg-slate-100/80 backdrop-blur-sm rounded-full p-1.5 shadow-inner">
              {/* Sliding indicator */}
              <motion.div
                className="absolute h-[calc(100%-12px)] bg-white rounded-full shadow-md"
                initial={false}
                animate={{
                  left: indicatorStyle.left,
                  width: indicatorStyle.width,
                }}
                transition={prefersReducedMotion ? { duration: 0 } : selectionTransition}
                style={{ top: '6px' }}
              />

              {/* Tabs */}
              {SECTIONS.map((section, index) => (
                <TabButton
                  key={section.id}
                  section={section}
                  isActive={activeIndex === index}
                  onClick={() => handleTabChange(index)}
                  tabRef={(el) => { tabsRef.current[index] = el }}
                />
              ))}
            </div>
          </div>

          {/* Content Panel - pause rotation on hover */}
          <div
            ref={desktopPanelShellRef}
            className="mt-8 grid"
            style={desktopPanelMinHeight > 0 ? { minHeight: `${desktopPanelMinHeight}px` } : undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <AnimatePresence mode="sync" initial={false}>
              <ContentPanel
                key={activeIndex}
                section={activeSection}
                index={activeIndex}
                direction={direction}

              />
            </AnimatePresence>
          </div>
          </motion.div>
        )}

        {/* Mobile: Horizontal Scrollable Tabs */}
        {!isDesktopViewport && (
          <motion.div
            className="block lg:hidden mt-4"
            initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.15 }}
          >
            <MobileHorizontalTabs
              sections={SECTIONS}
              activeIndex={activeIndex}
              onSelect={handleTabChange}
              direction={direction}

            />
          </motion.div>
        )}
      </div>
    </section>
  )
}
