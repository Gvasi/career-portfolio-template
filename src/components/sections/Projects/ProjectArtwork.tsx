'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { site } from '@/config/site'
import type { ProjectCardData } from './projectTypes'
import styles from './ProjectArtwork.module.css'

/** The site's own screenshot is projected onto the rendered device; the phone mock beside it repeats the greeting. */
function Laptop({ screenshot }: { screenshot: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const root = host.current
    if (!root) return
    const observer = new ResizeObserver(() => setWidth(Math.min(root.clientWidth, root.clientHeight * 1448 / 1086)))
    observer.observe(root)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={host} className={styles.laptop}>
      <div className={styles.canvas} style={{ transform: `translate(-50%, -50%) scale(${width / 1448})` }}>
        <Image className={styles.frame} src="/images/projects/laptop-frame.webp" alt="" width={1448} height={1086} sizes="(max-width:767px) 320px, 640px"/>
        <div className={styles.screen}><Image src={screenshot} alt="" width={1265} height={791} sizes="(max-width:767px) 280px, 550px"/></div>
        <div className={styles.phone}>
          <i/>
          <strong>Hi, I’m {site.firstName}.</strong>
          <Image src={site.assets.aboutPortrait} alt="" width={170} height={235} sizes="70px"/>
          <span>{site.role}</span>
          <b/>
        </div>
      </div>
    </div>
  )
}

export default function ProjectArtwork({ project, preview = false }: { project: ProjectCardData; preview?: boolean }) {
  const sizes = preview ? '(max-width:767px) 120px, 420px' : '(max-width:767px) 320px, 600px'
  return (
    <div className={styles.composition} data-art-project={project.id} data-preview={preview} aria-hidden="true">
      {project.artwork.kind === 'site-preview'
        ? <Laptop screenshot={project.artwork.screenshot}/>
        : <Image className={styles.object} src={project.artwork.src} alt="" fill sizes={sizes}/>}
    </div>
  )
}
