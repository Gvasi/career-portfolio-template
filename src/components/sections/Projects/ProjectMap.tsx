'use client'

import { useId, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useMotionActivity } from '@/hooks/useMotionActivity'
import type { PartIcon, ProjectStory } from './projectTypes'
import styles from './ProjectMap.module.css'

/** Small vector objects, drawn locally: no screenshots or raster scaling required. */
function MapGlyph({ icon }: { icon: PartIcon }) {
  const uid = useId().replace(/:/g, '')
  return <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${uid}-paper`} x1="14" y1="8" x2="64" y2="74" gradientUnits="userSpaceOnUse"><stop stopColor="#f1f7f8"/><stop offset="1" stopColor="#c9e4e2"/></linearGradient>
      <linearGradient id={`${uid}-gold`} x1="20" y1="10" x2="63" y2="66" gradientUnits="userSpaceOnUse"><stop stopColor="#dcefeb"/><stop offset="1" stopColor="#83bdb5"/></linearGradient>
    </defs>
    {/* One glyph per line: each is a small self-contained drawing. */}
    <g strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icon === 'checkout' && <><rect x="8" y="14" width="64" height="50" rx="7" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><path d="M8 27h64" stroke="#769f9a"/><circle cx="17" cy="21" r="2" fill="#168478"/><path d="M25 21h12M17 37h20m-20 7h14" stroke="#769f9a"/><rect x="17" y="51" width="46" height="7" rx="3.5" fill="#168478"/><circle cx="55" cy="39" r="9" fill="#155565" stroke="#9ecfc5"/><path d="M52 34v10m0-5 5-5m-5 5 5 5" stroke="#c9e4e2"/></>}
      {icon === 'stories' && <g className={styles.journal}><path d="M8 21Q23 13 40 23Q57 13 72 21v43Q55 57 40 67Q23 57 8 64Z" fill="#145561" stroke="#75a79f"/><path d="M12 17Q27 12 40 22Q53 12 68 17v43Q53 55 40 63Q27 55 12 60Z" fill={`url(#${uid}-paper)`} stroke="#b4d3c5"/><path d="M40 22v41M19 27q8-2 15 2m-15 6q8-2 15 2m-15 6q8-2 15 2m12-15q7-4 15-3m-15 11q7-4 15-3" stroke="#6e9e92" strokeWidth="1.5"/><path d="M54 15v20l4-4 4 1V14" fill={`url(#${uid}-gold)`} stroke="#8bbeb6"/><path d="m19 51 13 2" stroke="#5e9d94"/></g>}
      {icon === 'message' && <><path className={styles.replyBubble} d="M32 33h29a9 9 0 0 1 9 9v12a9 9 0 0 1-9 9v8L49 63H32a8 8 0 0 1-8-8V41a8 8 0 0 1 8-8Z" fill="#9ccbc4" stroke="#cce6e1"/><path d="M10 20a9 9 0 0 1 9-9h29a9 9 0 0 1 9 9v21a9 9 0 0 1-9 9H29L16 60V50a9 9 0 0 1-6-9Z" fill={`url(#${uid}-paper)`} stroke="#b0d6ca"/><g className={styles.messageDots} fill="#177d73" stroke="none"><circle cx="23" cy="31" r="2.5"/><circle cx="34" cy="31" r="2.5"/><circle cx="45" cy="31" r="2.5"/></g><path d="M48 52h12" stroke="#727f67"/></>}
      {icon === 'meeting' && <><rect x="12" y="18" width="48" height="47" rx="8" fill="#164f5d" stroke="#86b7a9"/><rect x="14" y="14" width="46" height="47" rx="8" fill={`url(#${uid}-paper)`} stroke="#a7ccbd"/><path d="M14 28h46M26 9v13M47 9v13" stroke="#9ccbc4" strokeWidth="3.5"/><path d="M24 38h6m9 0h6m-21 10h6" stroke="#73998e"/><circle cx="57" cy="56" r="15" fill="#155565" stroke="#a8d6cf" strokeWidth="2.5"/><circle cx="57" cy="56" r="11.5" stroke="#8cc4b7" strokeWidth="1"/><path className={styles.clockHands} d="M57 48v8l6 3" stroke="#eff7e9"/></>}
      {icon === 'data' && <><path d="M15 16v48h51" stroke="#8cbdb8"/><path d="m22 53 12-15 11 5 18-24" stroke={`url(#${uid}-gold)`} strokeWidth="3"/><path d="M29 25v29m-5-23h10v12H24Zm22-13v30m-5-23h10v14H41Z" fill={`url(#${uid}-paper)`} stroke="#a9d6cd"/><circle cx="63" cy="19" r="5" fill="#a8d6cf" stroke="#dcefeb"/></>}
      {icon === 'rules' && <><path d="M24 25h25v29H27" stroke="#a1d8cc"/><rect x="12" y="14" width="24" height="22" rx="6" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><rect x="43" y="44" width="24" height="22" rx="6" fill={`url(#${uid}-gold)`} stroke="#c9e4e2"/><path d="m20 25 3 3 5-7m24 34h7m-3-3 3 3-3 3" stroke="#286862"/><circle cx="50" cy="25" r="5" fill="#168478" stroke="#b3e4d4"/></>}
      {icon === 'activity' && <><rect x="18" y="12" width="43" height="56" rx="7" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><path d="M28 25h13m-13 9h24m-24 8h16" stroke="#769f9a"/><path d="m27 57 8-8 8 5 12-12" stroke="#168478" strokeWidth="3"/><circle cx="59" cy="18" r="8" fill={`url(#${uid}-gold)`} stroke="#c9e4e2"/></>}
      {icon === 'retention' && <><circle cx="32" cy="30" r="9" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><path d="M16 59v-7a16 16 0 0 1 32 0v7Z" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><path d="M52 24a20 20 0 0 1 3 34m-1-43-2 10 10 1" stroke={`url(#${uid}-gold)`} strokeWidth="3"/><circle cx="56" cy="57" r="4" fill="#90d8c1" stroke="#c9ecdf"/></>}
      {icon === 'promotion' && <><path d="m16 22 45-5 4 17a7 7 0 0 0 2 14l2 10-45 8-2-12a7 7 0 0 0-3-14Z" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><path d="m49 24 6 32" stroke="#8db6af" strokeDasharray="2 5"/><path d="m29 52 13-19" stroke="#168478" strokeWidth="3"/><circle cx="29" cy="36" r="3" stroke="#168478"/><circle cx="42" cy="49" r="3" stroke="#168478"/><path d="m12 13 3 4m7-10v6" stroke="#a8d6cf"/></>}
      {icon === 'value' && <><path d="m51 52 14 15" stroke="#a8d6cf" strokeWidth="8"/><circle cx="35" cy="35" r="22" fill="#1a5160" stroke={`url(#${uid}-gold)`} strokeWidth="4"/><circle cx="35" cy="35" r="17" stroke="#9ecfc5"/><path d="M25 44V33m10 11V25m10 19V30" stroke={`url(#${uid}-paper)`} strokeWidth="4"/><path d="M23 27a15 15 0 0 1 15-7" stroke="#d4eee4"/></>}
      {icon === 'bots' && <><path d="M40 22V12" stroke="#8bbeb6"/><circle cx="40" cy="10" r="4" fill={`url(#${uid}-gold)`} stroke="#c9e4e2"/><rect x="18" y="22" width="44" height="38" rx="10" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><circle cx="31" cy="39" r="4.5" fill="#168478"/><circle cx="49" cy="39" r="4.5" fill="#168478"/><path d="M31 51h18" stroke="#73998e" strokeWidth="2.5"/><rect x="26" y="64" width="28" height="8" rx="4" fill={`url(#${uid}-gold)`} stroke="#c9e4e2"/><circle cx="50" cy="68" r="3" fill="#f1f7f8"/></>}
      {icon === 'copy' && <><rect x="12" y="18" width="30" height="42" rx="6" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><path d="M19 30h16m-16 8h16m-16 8h10" stroke="#769f9a"/><rect x="38" y="28" width="30" height="42" rx="6" fill={`url(#${uid}-gold)`} stroke="#c9e4e2"/><path d="M45 40h16m-16 8h16m-16 8h10" stroke="#397e75"/><path d="M46 20h20m-4-4 4 4-4 4" stroke="#168478" strokeWidth="2.5"/><path d="M34 68H14m4 4-4-4 4-4" stroke="#168478" strokeWidth="2.5"/></>}
      {icon === 'wallet' && <><rect x="12" y="20" width="42" height="14" rx="6" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><rect x="12" y="28" width="52" height="34" rx="8" fill={`url(#${uid}-gold)`} stroke="#c9e4e2"/><rect x="46" y="38" width="20" height="14" rx="5" fill="#155565" stroke="#9ecfc5"/><circle cx="56" cy="45" r="3" fill="#90d8c1"/><circle cx="64" cy="62" r="9" fill="#155565" stroke="#9ecfc5"/><path d="m59.5 62 3 3 6-6" stroke="#eff7e9" strokeWidth="2.5"/></>}
      {icon === 'qr' && <><rect x="12" y="12" width="52" height="52" rx="8" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><rect x="19" y="19" width="12" height="12" rx="2" fill="#145561"/><rect x="45" y="19" width="12" height="12" rx="2" fill="#145561"/><rect x="19" y="45" width="12" height="12" rx="2" fill="#145561"/><path d="M37 21h4v4h-4zM37 31h4v4h-4zM45 37h4v4h-4zM37 43h4v4h-4zM51 45h4v4h-4zM45 51h4v4h-4z" fill="#168478"/><circle cx="63" cy="63" r="11" fill={`url(#${uid}-gold)`} stroke="#8bbeb6"/><path d="M60 58v10m0-5 5-5m-5 5 5 5" stroke="#22675f" strokeWidth="2.5"/></>}
      {icon === 'confirm' && <><rect x="8" y="34" width="18" height="18" rx="4" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><rect x="31" y="34" width="18" height="18" rx="4" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><rect x="54" y="34" width="18" height="18" rx="4" fill="#168478" stroke="#b3e4d4"/><path d="M26 43h5m18 0h5" stroke="#8cbdb8" strokeWidth="2.5"/><path d="m58 43 3 3 6-6" stroke="#eff7e9" strokeWidth="2.5"/><circle cx="40" cy="16" r="9" fill={`url(#${uid}-gold)`} stroke="#c9e4e2"/><path d="M40 11v5l3 2" stroke="#22675f" strokeWidth="2.5"/><path d="M40 25v9" stroke="#8bbeb6" strokeDasharray="2 3"/></>}
      {icon === 'ledger' && <><rect x="16" y="12" width="48" height="56" rx="6" fill={`url(#${uid}-paper)`} stroke="#a7cbc6"/><rect x="16" y="12" width="9" height="56" rx="6" fill="#145561"/><path d="M33 26h22m-22 10h22m-22 10h14" stroke="#769f9a"/><rect x="33" y="54" width="22" height="6" rx="3" fill={`url(#${uid}-gold)`} stroke="#c9e4e2"/><circle cx="62" cy="62" r="9" fill={`url(#${uid}-gold)`} stroke="#8bbeb6"/><path d="M59 62h6m-3-3v6" stroke="#22675f" strokeWidth="2.5"/></>}
    </g>
  </svg>
}

/** The overview diagram: the story's parts on a winding route, one selected at a time, with its detail beneath. */
export default function ProjectMap({ story }: { story: ProjectStory }) {
  const [selected, setSelected] = useState(0)
  // A signal travels the route between the previous and the new selection; the key restarts its animation.
  const [travel, setTravel] = useState<{ from: number; to: number; key: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const { active, reduced } = useMotionActivity(ref)
  const uid = useId()
  const parts = story.map.parts
  const fullRoute = connectionPath(0, parts.length - 1, parts.length)
  const select = (index: number) => {
    if (index === selected) return
    setTravel(previous => ({ from: selected, to: index, key: (previous?.key ?? 0) + 1 }))
    setSelected(index)
  }
  return (
    <>
      <div ref={ref} className={styles.map} data-animated={active} data-kind={story.map.kind}>
        <div className={styles.mapScene}>
          <p className={styles.sceneLabel}><span aria-hidden="true"/>{story.map.label}</p>
          <div className={styles.diagram}>
            {story.map.kind === 'workflow' && <svg className={styles.connections} viewBox="0 0 600 160" preserveAspectRatio="none" aria-hidden="true">
              <path className={styles.routeShadow} d={fullRoute}/>
              <path d={fullRoute}/>
              {travel && <path className={styles.signal} key={travel.key} pathLength={1} data-from={travel.from} data-to={travel.to} d={connectionPath(travel.from, travel.to, parts.length)}/>}
            </svg>}
            <div className={styles.nodes} style={{ '--parts': parts.length } as CSSProperties}>
              {parts.map((item, i) => (
                <button
                  type="button"
                  key={item.label}
                  className={styles.node}
                  aria-pressed={selected === i}
                  aria-controls={`${uid}-detail`}
                  aria-label={`Explore ${item.label}`}
                  data-invite={i === (selected + 1) % parts.length}
                  onClick={() => select(i)}
                >
                  <span className={styles.glyph}><MapGlyph icon={item.icon}/></span>
                  <span className={styles.nodeLabel}>{item.label}<span className={styles.nodeAction} aria-hidden="true"><ArrowRight size={13}/></span></span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div id={`${uid}-detail`} className={styles.detail} aria-live="polite">
          {parts.map((part, i) => (
            <motion.div
              key={part.label}
              className={styles.detailPane}
              aria-hidden={selected !== i}
              inert={selected !== i}
              initial={false}
              animate={{ opacity: selected === i ? 1 : 0, x: reduced || selected === i ? 0 : 10 }}
              style={{ visibility: selected === i ? 'visible' : 'hidden' }}
              transition={{ duration: reduced ? 0 : .38, ease: [.22, 1, .36, 1] }}
            >
              <h4>{part.title}</h4>
              <p>{part.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  )
}

/** A cubic route through the node centres, alternating between two heights, from one part index to another. */
function connectionPath(from: number, to: number, count: number) {
  const point = (i: number) => ({ x: (i + .5) * 600 / count, y: i % 2 ? 62 : 86 })
  const start = point(from)
  let path = `M${start.x} ${start.y}`
  const step = from <= to ? 1 : -1
  for (let i = from; i !== to; i += step) {
    const a = point(i)
    const b = point(i + step)
    const middle = (a.x + b.x) / 2
    path += `C${middle} ${a.y} ${middle} ${b.y} ${b.x} ${b.y}`
  }
  return path
}
