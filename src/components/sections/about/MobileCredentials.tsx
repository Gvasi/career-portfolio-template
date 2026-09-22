'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, GraduationCap } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import { useCollectionGesture } from '@/hooks/useCollectionGesture'
import type { Credential } from '@/content/career'
import { credentialFocus } from './credentialFocus'
import styles from './MobileCredentials.module.css'

const wrap = (i: number, count: number) => ((i % count) + count) % count
const CARD_GAP = 6
// The index panel pages its titles six at a time so three, six and twelve records share one height.
const INDEX_PAGE_SIZE = 6
// Deliberate two-line labels; exact qualification titles remain in the details.
function Issuer({ item }: { item: Credential }) {
  return (
    <span className={styles.issuer} data-issuer={item.issuer}>
      {item.issuerLogoSrc && item.issuerMarkKind === 'logo'
        ? <Image src={item.issuerLogoSrc} alt={item.issuerLogoAlt ?? item.issuerDisplay} width={160} height={40} sizes="100px"/>
        : item.issuerDisplay}
    </span>
  )
}

function WalletCard({ item, ordinal, cursor, progress, width, moving, reduced, onSelect, recordId }: { item: Credential; ordinal: number; cursor: number; progress: MotionValue<number>; width: number; moving: boolean; reduced: boolean; onSelect: () => void; recordId: string }) {
  const x = useTransform(progress, p => (ordinal - p) * (width + CARD_GAP))
  const y = useTransform(progress, p => reduced ? 0 : Math.min(2, Math.abs(ordinal - p)) * 5)
  const rotate = useTransform(progress, p => reduced ? 0 : Math.max(-2, Math.min(2, ordinal - p)) * 1.2)
  const opacity = useTransform(progress, p => Math.max(0, Math.min(1, 2 - Math.abs(ordinal - p))))
  const active = ordinal === cursor
  const accessible = active || (!moving && Math.abs(ordinal - cursor) <= 1)
  return (
    <motion.article
      className={styles.card}
      data-wallet-card={item.id}
      data-selected={active}
      data-status={item.status}
      style={{ x, y, rotate, opacity }}
      inert={!accessible}
      aria-hidden={!accessible}
    >
      <button type="button" className={styles.cardSelect} aria-label={'Explore skills: ' + item.title} aria-pressed={active} aria-controls={recordId} aria-disabled={moving} onClick={onSelect}/>
      <Issuer item={item}/>
      <h3 lang="en">{item.shortTitle[0]}<br/>{item.shortTitle[1]}</h3>
      <span className={styles.cardMeta}>
        {/* A year range may break after its dash on the narrowest cards. */}
        <span>{item.year.split('–').map((part, i) => <span key={part}>{i > 0 && <>–<wbr/></>}{part}</span>)}</span>
        {item.example ? <span>Sample</span> : item.status === 'completed' ? <Check size={13} aria-label="Achieved"/> : <GraduationCap size={14} aria-label="In progress"/>}
      </span>
    </motion.article>
  )
}

export default function MobileCredentials({ items }: { items: Credential[] }) {
  const [cursor, setCursor] = useState(0)
  const [settled, setSettled] = useState(0)
  const [indexOpen, setIndexOpen] = useState(false)
  const [indexPage, setIndexPage] = useState(0)
  const [width, setWidth] = useState(100)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const showcase = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const indexButton = useRef<HTMLButtonElement>(null)
  const progress = useMotionValue(0)
  const id = useId()
  const selected = items.length ? wrap(cursor, items.length) : 0
  const moving = cursor !== settled
  useEffect(() => {
    const root = showcase.current
    if (!root) return
    const observer = new ResizeObserver(() => setWidth((root.clientWidth - CARD_GAP * 2 - 4) / 3))
    observer.observe(root)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const controller = animate(progress, cursor, { duration: reduced ? 0 : .5 + Math.min(3, Math.abs(cursor - progress.get())) * .05, ease: [.22, 1, .36, 1], onComplete: () => setSettled(cursor) })
    return () => controller.stop()
  }, [cursor, progress, reduced])
  useEffect(() => {
    if (!indexOpen) return
    const outside = (e: PointerEvent) => { if (!menu.current?.contains(e.target as Node)) setIndexOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [indexOpen])
  const choose = (next: number) => { if (!moving && items.length > 1) setCursor(next) }
  const chooseIndex = (next: number) => {
    let distance = next - selected
    if (distance > items.length / 2) distance -= items.length
    if (distance < -items.length / 2) distance += items.length
    choose(cursor + distance)
    setIndexOpen(false)
    indexButton.current?.focus({ preventScroll: true })
  }
  useCollectionGesture(showcase, d => choose(cursor + d), { disabled: items.length < 2 })
  const ordinals = items.length ? Array.from({ length: Math.abs(cursor - settled) + 5 }, (_, i) => Math.min(cursor, settled) - 2 + i) : []
  const pageCount = Math.ceil(items.length / INDEX_PAGE_SIZE)
  const pageStart = indexPage * INDEX_PAGE_SIZE
  const onWalletKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') choose(cursor + 1)
    else if (e.key === 'ArrowLeft') choose(cursor - 1)
    else return
    e.preventDefault()
    showcase.current?.focus({ preventScroll: true })
  }
  const toggleIndex = () => {
    setIndexPage(Math.floor(selected / INDEX_PAGE_SIZE))
    setIndexOpen(!indexOpen)
  }
  const recordStatus = (item: Credential) => item.type === 'degree' ? 'Degree in progress' : item.issuer === 'Layout sample' ? 'Layout sample' : 'Learning record'
  return (
    <section id="credentials" className={'section-shell ' + styles.section} data-credentials-section aria-labelledby={id + '-heading'}>
      <header className={styles.heading}><span>The formal bit</span><h2 id={id + '-heading'}>Learning, with receipts.</h2></header>
      <div
        ref={showcase}
        className={styles.wallet}
        data-credential-wallet
        data-moving={moving}
        role="group"
        aria-roledescription="carousel"
        aria-label="Qualifications"
        tabIndex={0}
        style={{ '--wallet-width': width + 'px' } as CSSProperties}
        onKeyDown={onWalletKeyDown}
      >
        {ordinals.map(ordinal => {
          const item = items[wrap(ordinal, items.length)]
          return (
            <WalletCard
              key={ordinal}
              item={item}
              ordinal={ordinal}
              cursor={cursor}
              progress={progress}
              width={width}
              moving={moving}
              reduced={reduced}
              recordId={id + '-record-' + item.id}
              onSelect={() => choose(ordinal)}
            />
          )
        })}
      </div>
      <div className={styles.controls}>
        <div ref={menu} className={styles.indexMenu} onKeyDown={e => { if (e.key === 'Escape') { setIndexOpen(false); indexButton.current?.focus() } }}>
          <button ref={indexButton} className={styles.indexToggle} type="button" aria-label="Browse all certificates" aria-expanded={indexOpen} aria-controls={id + '-index'} onClick={toggleIndex}>
            All certificates <span aria-hidden="true">{items.length}</span><ChevronDown size={15}/>
          </button>
          {indexOpen && (
            <div className={styles.indexPanel} id={id + '-index'} aria-label="All certificates">
              <div className={styles.indexHeading}>
                <span>Choose a qualification</span>
                {items.length > INDEX_PAGE_SIZE && (
                  <div className={styles.pages}>
                    <button type="button" aria-label="Previous qualification page" disabled={indexPage === 0} onClick={() => setIndexPage(indexPage - 1)}><ArrowLeft size={16}/></button>
                    <span>{indexPage + 1} / {pageCount}</span>
                    <button type="button" aria-label="Next qualification page" disabled={indexPage >= pageCount - 1} onClick={() => setIndexPage(indexPage + 1)}><ArrowRight size={16}/></button>
                  </div>
                )}
              </div>
              <div className={styles.indexGrid}>
                {items.slice(pageStart, pageStart + INDEX_PAGE_SIZE).map((item, i) => (
                  <button key={item.id} type="button" aria-label={'Choose certificate: ' + item.title} aria-pressed={selected === pageStart + i} disabled={moving} onClick={() => chooseIndex(pageStart + i)}>
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={styles.steps}>
          <button type="button" aria-label="Previous certificate" disabled={moving || items.length < 2} onClick={() => choose(cursor - 1)}><ArrowLeft size={18}/></button>
          <span>{String(selected + 1).padStart(2, '0')} <span>/ {String(items.length).padStart(2, '0')}</span></span>
          <button type="button" aria-label="Next certificate" disabled={moving || items.length < 2} onClick={() => choose(cursor + 1)}><ArrowRight size={18}/></button>
        </div>
      </div>
      <div className={styles.records} data-mobile-records>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            id={id + '-record-' + item.id}
            className={styles.record}
            data-mobile-record={item.id}
            data-active={index === selected}
            aria-hidden={index !== selected}
            inert={index !== selected}
            role="region"
            aria-label={item.title + ' details'}
            initial={false}
            animate={{ opacity: index === selected ? 1 : 0, y: index === selected || reduced ? 0 : 5 }}
            transition={{ duration: reduced ? 0 : .28 }}
          >
            <h3 className={styles.detailTitle} aria-label={item.title}>{item.detailTitle}{item.abbreviation && <abbr title={item.title}>{item.abbreviation}</abbr>}</h3>
            <p className={styles.detailMeta}>{item.issuerDisplay}{item.type === 'certificate' && ' · Certificate'} · {item.year}</p>
            <div className={styles.detailLabel}>
              <span>{item.status === 'completed' ? 'What I learned' : 'What I’m learning'}</span>
              <span>{item.example ? 'Sample' : item.status === 'completed' ? 'Achieved' : 'In progress'}</span>
            </div>
            <p className={styles.summary}>{item.summary}</p>
            <ul className={styles.skills} aria-label="Key skills">
              {item.skills.map(skill => <li key={skill}><strong>{skill}</strong>{credentialFocus[skill]?.detail && <span>{credentialFocus[skill].detail}</span>}</li>)}
            </ul>
            {item.example
              ? <span className={styles.verify}>Fictional credential · Layout example</span>
              : item.verifyUrl
              ? <a href={item.verifyUrl} target="_blank" rel="noopener noreferrer" className={styles.verify} aria-label={'Verify credential: ' + item.title + ' (opens in a new tab)'}>Verify credential<ArrowUpRight size={17}/></a>
              : <span className={styles.verify}>{recordStatus(item)}<GraduationCap size={17}/></span>}
          </motion.div>
        ))}
      </div>
      <span className="sr-only" role="status">{items[selected]?.title + ' selected'}</span>
    </section>
  )
}
