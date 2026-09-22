import Link from '../IntentLink'
import { ArrowUpRight } from 'lucide-react'
import { SocialIcon } from '../SocialLinks'
import { site } from '@/config/site'
import styles from '../SiteFrame.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerMain}>
          <Link href="/" className={styles.footerIdentity}>
            <span className={styles.monogram} aria-hidden="true">{site.monogram}<span>.</span></span>
            <span><strong>{site.name}</strong><span className={styles.footerLocation}>{site.location.label}</span></span>
          </Link>
          <div className={styles.footerContact}>
            <span className={styles.eyebrow}>Get in touch</span>
            <a href={`mailto:${site.contactEmail}`} className={styles.footerEmail}>
              <SocialIcon name="Email" /><span>{site.contactEmail}</span><ArrowUpRight size={16} aria-hidden="true" />
            </a>
            {site.chat && (
              <a href={site.chat.href} target="_blank" rel="noopener noreferrer" className={styles.footerChat}>
                <SocialIcon name={site.chat.label === 'WhatsApp' ? 'WhatsApp' : 'Chat'} /><span>{site.chat.label}</span><span className={styles.chatLabel}>Say hello</span><ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>
          {!site.exampleContent && <nav aria-label="Professional profiles" className={styles.footerProfiles}>
            <span className={styles.eyebrow}>Elsewhere</span>
            <a href={site.github} target="_blank" rel="noopener noreferrer">
              <SocialIcon name="GitHub" /><span>GitHub</span><ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
              <SocialIcon name="LinkedIn" /><span>LinkedIn</span><ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </nav>}
        </div>
        {site.exampleContent && (
          <p className={styles.exampleNote}>
            Alex and the career details on this site are fictional examples.{' '}
            <a href="https://github.com/Gvasi/career-portfolio-template" target="_blank" rel="noopener noreferrer">Make this portfolio your own</a>
            {' '}with a template by{' '}
            <a href="https://www.gvasilakopoulos.com" target="_blank" rel="noopener noreferrer">George Vasilakopoulos</a>.
          </p>
        )}
        <div className={styles.footerBase}>
          <small>© {new Date().getFullYear()} {site.name}. <span>All rights reserved.</span></small>
          <nav aria-label="Footer navigation">
            <Link href="/">Home</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link><a href="/privacy#cookies">Privacy</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
