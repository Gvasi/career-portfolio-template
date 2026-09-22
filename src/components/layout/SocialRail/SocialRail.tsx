'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { socialLinks, SocialIcon } from '../SocialLinks'
import styles from '../SiteFrame.module.css'

export default function SocialRail() {
  const [tooltip, setTooltip] = useState<string | null>(null)
  useEffect(() => {
    if (!tooltip) return
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') setTooltip(null) }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [tooltip])
  if (socialLinks.length === 0) return null
  return <aside className={styles.railPosition} aria-label="Social profiles">
    <motion.div className={styles.rail} initial={{ opacity: .7, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .6, delay: .25, ease: [.22, 1, .36, 1] }}>
      {socialLinks.map(link => <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.name + ' (opens in a new tab)'} className={styles.railLink}
        data-tooltip-visible={tooltip === link.name} onPointerEnter={() => setTooltip(link.name)} onPointerLeave={() => setTooltip(null)} onFocus={() => setTooltip(link.name)} onBlur={() => setTooltip(null)}>
        <SocialIcon name={link.name} /><span className={styles.railTooltip} aria-hidden="true">{link.name}<ArrowUpRight size={13} /></span>
      </a>)}
    </motion.div>
  </aside>
}
