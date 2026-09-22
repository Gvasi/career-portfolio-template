'use client'

import { motion, useTransform, type MotionValue } from 'framer-motion'
import ProjectArtwork from './ProjectArtwork'
import type { ProjectCardData } from './projectTypes'
import styles from './Projects.module.css'

export function ProjectThumbnail({ item }: { item: ProjectCardData }) {
  return <div className={styles.thumbnail} data-cover={item.id}><ProjectArtwork project={item} preview/></div>
}

export const previewName = (item: ProjectCardData) => item.shortName ?? item.title

/** Shared progress keeps the floating folios continuous through loop boundaries. */
export default function ProjectReelEntry({ item, ordinal, cursor, moving, progress, height, reduced, mobile, onSelect }: {
  item: ProjectCardData; ordinal: number; cursor: number; moving: boolean; progress: MotionValue<number>; height: number; reduced: boolean; mobile: boolean
  onSelect: () => void
}) {
  const y = useTransform(progress, value => mobile ? 0 : Math.sin(Math.max(-2.5, Math.min(2.5, ordinal - value)) * .38) * height * .99 / Math.sin(.38))
  const x = useTransform(progress, value => mobile ? (ordinal - value) * 101 : 0)
  const rotateX = useTransform(progress, value => reduced || mobile ? 0 : (ordinal - value) * -8)
  const rotateY = useTransform(progress, value => reduced || !mobile ? 0 : (ordinal - value) * -12)
  const scale = useTransform(progress, value => mobile || reduced ? 1 : 1 - Math.min(2.5, Math.abs(ordinal - value)) * .1)
  const z = useTransform(progress, value => reduced ? 0 : -Math.min(2.5, Math.abs(ordinal - value)) * (mobile ? 20 : 48))
  const opacity = useTransform(progress, value => Math.max(0, Math.min(1, 2 - Math.abs(ordinal - value))))
  const zIndex = useTransform(progress, value => 10 - Math.round(Math.abs(ordinal - value) * 2))
  const active = ordinal === cursor
  const accessible = active || (!moving && Math.abs(ordinal - cursor) <= 1)
  return <article className={styles.reelItem} data-project-slot={item.id} data-selected={active} inert={!accessible} aria-hidden={!accessible}>
    <motion.div className={styles.reelEntry} style={{ x, y, rotateX, rotateY, scale, z, opacity, zIndex }}>
      <div className={styles.reelFace}>
        <button type="button" className={styles.openButton} aria-label={'Select project: ' + item.title} aria-pressed={active} aria-disabled={moving && !mobile} onClick={onSelect}/>
        <ProjectThumbnail item={item}/><span className={styles.mobileName} aria-hidden="true">{previewName(item)}</span>
        <div className={styles.copy}><h3 className={styles.title}>{item.title}</h3><span className={styles.status} data-status={item.status}><i aria-hidden="true"/>{item.statusLabel}</span></div>
      </div>
    </motion.div>
  </article>
}
