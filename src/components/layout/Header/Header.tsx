'use client'

import { useCallback, useState } from 'react'
import Link from '../IntentLink'
import { usePathname } from 'next/navigation'
import { motion, useScroll } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import HamburgerIcon from '../../ui/HamburgerIcon'
import MobileMenu from './MobileMenu'
import ContactAvailabilityWarmup from './ContactAvailabilityWarmup'
import styles from '../SiteFrame.module.css'
import { site } from '@/config/site'

const NAV_LINKS = [['/', 'Home'], ['/about', 'About']]

export default function Header() {
  const pathname = usePathname()
  const { scrollYProgress } = useScroll()
  const [isOpen, setIsOpen] = useState(false)
  const closeMenu = useCallback(() => setIsOpen(false), [])
  // The reading-progress line only makes sense on the long scrolling pages.
  const showProgress = pathname === '/' || pathname === '/about'

  return (
    <>
      <ContactAvailabilityWarmup />
      <header className={styles.header}>
        <motion.div
          className={styles.headerInner}
          initial={{ opacity: .85, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45, ease: [.22, 1, .36, 1] }}
        >
          <Link className={styles.wordmark} href="/">{site.name}</Link>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            {NAV_LINKS.map(([href, label]) => (
              <Link key={href} href={href} className={styles.navLink} aria-current={pathname === href ? 'page' : undefined}>{label}<span aria-hidden="true" /></Link>
            ))}
          </nav>
          <Link href="/contact" className={styles.headerContact} aria-current={pathname === '/contact' ? 'page' : undefined}>
            Let’s connect<ArrowUpRight size={17} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <div className={styles.mobileTrigger}><HamburgerIcon isOpen={isOpen} onClick={() => setIsOpen(true)} controls="mobile-navigation" /></div>
        </motion.div>
        {site.exampleContent && (
          <div className={styles.demoNote} data-template-demo>
            <span>Fictional demo</span>
            <a href="https://github.com/Gvasi/career-portfolio-template" target="_blank" rel="noopener noreferrer">
              Use this template<ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        )}
        {showProgress && <motion.div className={styles.progress} aria-hidden="true" style={{ scaleX: scrollYProgress }} />}
      </header>
      <MobileMenu isOpen={isOpen} onClose={closeMenu} pathname={pathname} />
    </>
  )
}
