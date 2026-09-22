import { useEffect, useRef } from 'react'
import Link from '../IntentLink'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import HamburgerIcon from '../../ui/HamburgerIcon'
import { SocialIcon, socialLinks } from '../SocialLinks'
import styles from '../SiteFrame.module.css'
import { site } from '@/config/site'

interface MobileMenuProps { isOpen: boolean; onClose: () => void; pathname: string }

export default function MobileMenu({ isOpen, onClose, pathname }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const savedOverflow = useRef<string | null>(null)
  const controls = useAnimationControls()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    let cancelled = false
    if (isOpen) {
      if (!dialog.open) {
        savedOverflow.current = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        controls.set({ '--menu-presence': reduceMotion ? 1 : 0 })
        dialog.showModal()
        dialog.querySelector<HTMLElement>('[data-menu-panel]')?.scrollTo(0, 0)
        dialog.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
      }
      void controls.start({ '--menu-presence': 1, transition: { duration: reduceMotion ? 0 : .46, ease: [.4, 0, .2, 1] } })
    } else if (dialog.open) {
      void controls.start({ '--menu-presence': 0, transition: { duration: reduceMotion ? 0 : .34, ease: [.4, 0, .2, 1] } }).then(() => {
        if (cancelled) return
        dialog.close()
        if (savedOverflow.current !== null) document.body.style.overflow = savedOverflow.current
        savedOverflow.current = null
      })
    }
    return () => { cancelled = true; controls.stop() }
  }, [isOpen, controls, reduceMotion])

  useEffect(() => {
    if (!isOpen) return
    const media = window.matchMedia('(min-width: 768px)')
    const closeOnDesktop = () => { if (media.matches) onClose() }
    media.addEventListener('change', closeOnDesktop)
    return () => media.removeEventListener('change', closeOnDesktop)
  }, [isOpen, onClose])

  useEffect(() => () => {
    if (savedOverflow.current !== null) document.body.style.overflow = savedOverflow.current
  }, [])

  return <motion.dialog id="mobile-navigation" ref={dialogRef} className={styles.menuDialog}
    aria-label="Navigation menu" initial={false} animate={controls} data-closing={!isOpen}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const links = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'))
      const first = links[0]
      const last = links[links.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={styles.menuPanel} data-menu-panel>
    <div className={styles.menuMasthead}>
      <Link href="/" className={styles.wordmark} onClick={onClose}>{site.name}</Link>
      <HamburgerIcon isOpen={isOpen} onClick={onClose} controls="mobile-navigation" />
    </div>
    <div className={styles.menuBody}>
      <nav aria-label="Main navigation" className={styles.menuNav}>
        {[['/', 'Home'], ['/about', 'About']].map(([href, label], index) => <motion.div key={href}
          initial={false} animate={{ opacity: isOpen ? 1 : .5, y: isOpen ? 0 : -7 }}
          transition={{ duration: reduceMotion ? 0 : .35, delay: isOpen && !reduceMotion ? .04 + index * .05 : 0, ease: [.22, 1, .36, 1] }}>
          <Link href={href} aria-current={pathname === href ? 'page' : undefined} onClick={onClose} className={styles.menuNavLink}>
            <span>{label}</span><span className={styles.menuNavEnd} aria-hidden="true"><i /><ArrowUpRight size={23} strokeWidth={1.5} /></span>
          </Link>
        </motion.div>)}
      </nav>
      <Link href="/contact" onClick={onClose} className={styles.menuContact}>Let’s connect<ArrowRight size={20} strokeWidth={1.7} aria-hidden="true" /></Link>
      {socialLinks.length > 0 && <div className={styles.menuSocials}><span className={styles.eyebrow}>Elsewhere</span><nav aria-label="Social profiles">{socialLinks.map(link => <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.name + ' (opens in a new tab)'}><SocialIcon name={link.name} /></a>)}</nav></div>}
    </div>
    </div>
  </motion.dialog>
}
