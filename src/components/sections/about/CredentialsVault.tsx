'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import { ArrowUpRight, ArrowLeft, ArrowRight, ChevronDown, Check, GraduationCap, ChartNoAxesCombined, Layers, Compass } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import { useCollectionGesture } from '@/hooks/useCollectionGesture'
import { credentials, type Credential } from '@/content/career'
import styles from './CredentialsVault.module.css'
import MobileCredentials from './MobileCredentials'
import { credentialFocus } from './credentialFocus'

function IssuerMark({ credential }: { credential: Credential }) {
  return (
    <span className={styles.issuerMark} data-issuer={credential.issuer}>
      {credential.issuerMarkKind === 'logo' && credential.issuerLogoSrc
        ? <Image src={credential.issuerLogoSrc} alt={credential.issuerLogoAlt ?? credential.issuerDisplay} width={160} height={46} sizes="(max-width:767px) 135px, 165px" className={styles.logo}/>
        : <span>{credential.issuerDisplay}</span>}
    </span>
  )
}

/** The selected record's summary, verification link and skill list; inactive records stay mounted but hidden. */
function CredentialDetails({ credential, id, reduced, active }: { credential: Credential; id: string; reduced: boolean; active: boolean }) {
  return (
    <motion.div
      id={id}
      className={styles.details}
      data-credential-details
      data-active={active}
      role="region"
      aria-hidden={!active}
      inert={!active}
      aria-label={credential.title + ' details'}
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active || reduced ? 0 : 8 }}
      transition={{ duration: reduced ? 0 : .35 }}
    >
      <div className={styles.detailContent}>
        <span className={styles.focusLabel}>{credential.status === 'completed' ? 'What I learned' : 'What I’m learning'}</span>
        <h3>{credential.title}</h3>
        {credential.summary && <p className={styles.summary}>{credential.summary}</p>}
        {credential.example
          ? <span className={styles.degreeStatus}>Fictional credential · Layout example</span>
          : credential.verifyUrl
          ? <a className={styles.verify} href={credential.verifyUrl} target="_blank" rel="noopener noreferrer" aria-label={'Verify credential: ' + credential.title + ' (opens in a new tab)'}>Verify credential<ArrowUpRight size={18}/></a>
          : <span className={styles.degreeStatus}><GraduationCap size={18}/>{credential.type === 'degree' ? 'Degree in progress' : 'Layout sample'}</span>}
      </div>
      <ul className={styles.skills}>
        {credential.skills.map(skill => {
          const { Icon, detail } = credentialFocus[skill] ?? { Icon: Compass, detail: 'Focus area' }
          return <li key={skill}><span className={styles.skillMark}><Icon size={22} strokeWidth={1.5}/></span><span><strong>{skill}</strong><span>{detail}</span></span></li>
        })}
      </ul>
    </motion.div>
  )
}

const wrap = (index: number, count: number) => ((index % count) + count) % count

function CredentialCard({ credential, ordinal, cursor, progress, width, radius, mobile, reduced, moving, recordId, onSelect }: {
  credential: Credential; ordinal: number; cursor: number; progress: MotionValue<number>; width: number; radius: number; mobile: boolean; reduced: boolean; moving: boolean; recordId: string; onSelect: () => void
}) {
  const x = useTransform(progress, value => {
    const d = ordinal - value
    return Math.sign(d) * (Math.min(Math.abs(d), 1) * (mobile ? .96 : .94) + Math.max(0, Math.abs(d) - 1) * .78) * width
  })
  const scale = useTransform(progress, value => {
    const distance = Math.abs(ordinal - value)
    return mobile ? 1 - Math.min(2, distance) * .065 : 1 - Math.min(1, distance) * (radius === 1 ? .12 : .2) - Math.max(0, Math.min(2, distance) - 1) * .1
  })
  const y = useTransform(progress, value => reduced ? 0 : Math.min(2, Math.abs(ordinal - value)) * 9)
  const rotateY = useTransform(progress, value => reduced || mobile ? 0 : Math.max(-2, Math.min(2, ordinal - value)) * -6)
  const opacity = useTransform(progress, value => Math.max(0, Math.min(1, radius + 1 - Math.abs(ordinal - value))))
  const zIndex = useTransform(progress, value => 20 - Math.round(Math.abs(ordinal - value) * 4))
  const active = ordinal === cursor
  const accessible = active || (!moving && !mobile && Math.abs(ordinal - cursor) <= radius)
  const RecordIcon = credential.type === 'degree' ? GraduationCap : credential.id === 'google-data-analytics' ? ChartNoAxesCombined : Layers
  const completed = credential.status === 'completed'
  return (
    <motion.article
      className={styles.achievement}
      data-credential-card={credential.id}
      data-selected={active}
      data-status={credential.status}
      aria-hidden={!accessible}
      inert={!accessible}
      style={{ x, y, scale, rotateY, opacity, zIndex }}
    >
      <button type="button" className={styles.select} aria-label={'Explore skills: ' + credential.title} aria-pressed={active} aria-controls={recordId} aria-disabled={moving} onClick={onSelect}/>
      <div className={styles.paper}>
        <div className={styles.cardTop}><IssuerMark credential={credential}/><span className={styles.recordIcon} aria-hidden="true"><RecordIcon size={30} strokeWidth={1.35}/></span></div>
        <h3 data-credential-title>{credential.title}</h3>
        <div className={styles.cardMeta}>
          <span>{credential.year}</span>
          <span className={styles.cardStatus}>{completed && !credential.example ? <Check size={14} aria-hidden="true"/> : null}{credential.example ? 'Sample' : completed ? 'Achieved' : 'In progress'}</span>
        </div>
      </div>
    </motion.article>
  )
}

export default function CredentialsVault({ items = credentials }: { items?: Credential[] }) {
  const mobile = useMediaQuery('(max-width:767px)')
  return mobile ? <MobileCredentials items={items}/> : <DesktopCredentials items={items}/>
}

function DesktopCredentials({ items }: { items: Credential[] }) {
  const [cursor, setCursor] = useState(0)
  const [settled, setSettled] = useState(0)
  const [indexOpen, setIndexOpen] = useState(false)
  const [width, setWidth] = useState(1080)
  const mobile = useMediaQuery('(max-width:767px)')
  const tablet = useMediaQuery('(max-width:1050px)')
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const showcase = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const indexButton = useRef<HTMLButtonElement>(null)
  const progress = useMotionValue(0)
  const id = useId()
  const selectedIndex = items.length ? wrap(cursor, items.length) : 0
  const selected = items[selectedIndex]
  const moving = cursor !== settled
  const radius = mobile || tablet || items.length < 5 ? 1 : 2
  const cardWidth = mobile ? Math.min(340, width - 64) : Math.min(360, width * (radius === 1 ? .34 : .232))
  useEffect(() => {
    const root = showcase.current
    if (!root) return
    const observer = new ResizeObserver(() => setWidth(root.clientWidth))
    observer.observe(root)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const control = animate(progress, cursor, { duration: reduced ? 0 : .6 + Math.min(4, Math.abs(cursor - progress.get())) * .08, ease: [.22, 1, .36, 1], onComplete: () => setSettled(cursor) })
    return () => control.stop()
  }, [cursor, reduced, progress])
  useEffect(() => {
    if (!indexOpen) return
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) setIndexOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [indexOpen])
  const choose = (next: number) => { if (!moving && items.length > 1) setCursor(next) }
  const chooseIndex = (index: number) => {
    let distance = index - selectedIndex
    if (distance > items.length / 2) distance -= items.length
    if (distance < -items.length / 2) distance += items.length
    choose(cursor + distance)
  }
  useCollectionGesture(showcase, direction => choose(cursor + direction), { disabled: items.length < 2 })
  const first = Math.min(cursor, settled) - radius - 1
  const ordinals = items.length ? Array.from({ length: Math.abs(cursor - settled) + radius * 2 + 3 }, (_, index) => first + index) : []
  const onShowcaseKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') choose(cursor + 1)
    else if (event.key === 'ArrowLeft') choose(cursor - 1)
    else if (event.key === 'Home') chooseIndex(0)
    else if (event.key === 'End') chooseIndex(items.length - 1)
    else return
    event.preventDefault()
    showcase.current?.focus({ preventScroll: true })
  }
  const chooseFromIndex = (index: number) => {
    chooseIndex(index)
    setIndexOpen(false)
    indexButton.current?.focus()
  }
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    <section id="credentials" className={'section-shell ' + styles.section} data-credentials-section aria-labelledby="credentials-title">
      <div className={styles.container}>
        <div className={styles.heading}>
          <div className={`${styles.eyebrow} section-eyebrow section-eyebrow--gold`}><span aria-hidden="true"/><span>The formal bit</span><span aria-hidden="true"/></div>
          <h2 id="credentials-title">Learning, with receipts.</h2>
        </div>
        <div
          ref={showcase}
          className={styles.showcase}
          data-credential-showcase
          data-count={items.length}
          data-moving={moving}
          role="group"
          aria-roledescription="carousel"
          aria-label="Qualifications"
          tabIndex={0}
          style={{ '--credential-width': cardWidth + 'px' } as CSSProperties}
          onKeyDown={onShowcaseKeyDown}
        >
          {ordinals.map(ordinal => {
            const credential = items[wrap(ordinal, items.length)]
            return (
              <CredentialCard
                key={ordinal}
                credential={credential}
                ordinal={ordinal}
                cursor={cursor}
                progress={progress}
                width={cardWidth}
                radius={radius}
                mobile={mobile}
                reduced={reduced}
                moving={moving}
                recordId={id + '-record-' + credential.id}
                onSelect={() => choose(ordinal)}
              />
            )
          })}
        </div>
        <div className={styles.browseBar}>
          <div ref={menu} className={styles.indexMenu} onKeyDown={event => { if (event.key === 'Escape') { setIndexOpen(false); indexButton.current?.focus() } }}>
            <button
              ref={indexButton}
              type="button"
              className={styles.indexToggle}
              aria-label="Browse all certificates"
              aria-expanded={indexOpen}
              aria-controls={id + '-index'}
              onClick={() => setIndexOpen(!indexOpen)}
            >
              All certificates <span aria-hidden="true">{pad(items.length)}</span><ChevronDown size={16}/>
            </button>
            {indexOpen && (
              <div id={id + '-index'} className={styles.allCertificates} aria-label="All certificates">
                {items.map((credential, index) => (
                  <button
                    key={credential.id}
                    type="button"
                    aria-label={'Choose certificate: ' + credential.title}
                    aria-pressed={index === selectedIndex}
                    disabled={moving}
                    onClick={() => chooseFromIndex(index)}
                  >
                    <span>{pad(index + 1)}</span>
                    <span><strong>{credential.title}</strong><small>{credential.issuerDisplay} · {credential.status === 'completed' ? 'Achieved' : 'In progress'}</small></span>
                    {index === selectedIndex && <Check size={16}/>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.progress} aria-hidden="true">{items.map((credential, index) => <span key={credential.id} data-active={index === selectedIndex}/>)}</div>
          <div className={styles.controls}>
            <button type="button" aria-label="Previous certificate" disabled={moving || items.length < 2} onClick={() => choose(cursor - 1)}><ArrowLeft size={19}/></button>
            <span className={styles.count} aria-label={`Certificate ${selectedIndex + 1} of ${items.length}`}>{pad(selectedIndex + 1)}<span> / {pad(items.length)}</span></span>
            <button type="button" aria-label="Next certificate" disabled={moving || items.length < 2} onClick={() => choose(cursor + 1)}><ArrowRight size={19}/></button>
          </div>
        </div>
        <div className={styles.detailsStack} data-credential-detail-area>
          {items.map(credential => <CredentialDetails key={credential.id} credential={credential} id={id + '-record-' + credential.id} reduced={reduced} active={credential.id === selected?.id}/>)}
        </div>
        <p className="sr-only" role="status">{selected?.title + ' selected'}</p>
      </div>
    </section>
  )
}
