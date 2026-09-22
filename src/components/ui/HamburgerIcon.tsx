import styles from '../layout/SiteFrame.module.css'
import { motion, useReducedMotion } from 'framer-motion'

interface HamburgerIconProps {
  isOpen: boolean
  onClick: () => void
  controls?: string
}

export default function HamburgerIcon({ isOpen, onClick, controls }: HamburgerIconProps) {
  const reduced = useReducedMotion()
  return (
    <button type="button" className={styles.menuToggle} onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen} aria-controls={controls}>
      <span className={styles.menuGlyph} aria-hidden="true">
        <motion.span initial={false} animate={{ y: isOpen ? 0 : -4, rotate: isOpen ? 45 : 0 }} transition={{ duration: reduced ? 0 : .4, ease: [.4, 0, .2, 1] }} />
        <motion.span initial={false} animate={{ y: isOpen ? 0 : 4, rotate: isOpen ? -45 : 0 }} transition={{ duration: reduced ? 0 : .4, ease: [.4, 0, .2, 1] }} />
      </span>
    </button>
  )
}
