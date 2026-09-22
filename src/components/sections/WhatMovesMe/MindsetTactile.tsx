'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMotionActivity'
import { Materials } from './MindsetIllustrations'

const discoveries = [{ x: 86, y: 78 }, { x: 177, y: 64 }, { x: 267, y: 81 }]

/** A question unlocks a door; a book connects ideas; an insight lights up. */
function DiscoveryObject({ id, index }: { id: string; index: number }) {
  return <g strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-shadow)`}>
    {index===0 ? <g transform="rotate(-28)">
      <path d="M0-2V21H7V16H3V11H8V7H3V-2" fill={`url(#${id}-gold)`} stroke="#B49860" strokeWidth=".8"/>
      <circle cy="-10" r="11" fill={`url(#${id}-gold)`} stroke="#B49860" strokeWidth=".8"/>
      <circle cy="-10" r="5.5" fill="#F0F5EC" stroke="#B79E68" strokeWidth="1.3"/>
      <path d="M-8-12Q-7-18-1-19M-1 1V17" stroke="#FFF5D6" strokeWidth="1.3"/>
    </g> : index===1 ? <g transform="rotate(-8)">
      <path d="M-22-12Q-11-17 0-11Q11-17 22-12V17Q11 13 0 19Q-11 13-22 17Z" fill={`url(#${id}-ink)`}/>
      <path d="M-20-15Q-10-19 0-13Q10-19 20-15V13Q10 10 0 16Q-10 10-20 13Z" fill={`url(#${id}-paper)`} stroke="#BBCBBA" strokeWidth=".7"/>
      <path d="M0-12V15" stroke="#AEC3B4"/>
      <path d="M-15-8Q-9-10-5-7M-15-2Q-9-4-5-1M-15 4Q-9 2-5 5M5-7Q11-10 15-8M5-1Q11-4 15-2" stroke="#91AEA6" strokeWidth="1.2"/>
      <path d="M10 6V19L13 16L16 18V5" fill="#CC9D68"/>
    </g> : <g transform="rotate(12)">
      <path d="M-7 9C-7 3-14 0-14-9A14 14 0 0 1 14-9C14 0 7 3 7 9Z" fill={`url(#${id}-gold)`} stroke="#B79D66" strokeWidth=".8"/>
      <path d="M-4 9V-4L-8-8M4 9V-4L8-8M-4-4H4" stroke="#AD8749" strokeWidth="1.2"/>
      <path d="M-9-10Q-8-18-1-19" stroke="#FFF9E5" strokeWidth="2.2"/>
      <path d="M-7 10H7V17Q0 24-7 17Z" fill={`url(#${id}-ink)`}/>
      <path d="M-6 12H6M-5 16H5" stroke="#95BAC0" strokeWidth="1.2"/>
      <path d="M-21-11H-25M21-11H25M-15-26L-18-29M15-26L18-29M0-29V-33" stroke="#C4A874" strokeWidth="1"/>
    </g>}
  </g>
}

function DiscoveryMeadow({ id, index, x, y, found }: { id: string; index: number; x: MotionValue<number>; y: MotionValue<number>; found: boolean }) {
  const point = discoveries[index]
  // Driven by the same spring as the lens: the blades open continuously, not on a hit-test jump.
  const opening = useTransform([x,y], ([px,py]: number[]) => Math.max(found ? .18 : 0, 1-Math.hypot(px-point.x,py-point.y)/64))
  const left = useTransform(opening, [0,1], [-3,-31])
  const right = useTransform(opening, [0,1], [3,31])
  return <g transform={`translate(${point.x} ${point.y})`} className="discovery-meadow" data-discovered={found}>
    <ellipse cy="22" rx="42" ry="12" fill={`url(#${id}-moss)`}/>
    <g opacity=".5" fill={`url(#${id}-grass)`}><path d="M-24 23Q-36 5-27-10Q-18 7-24 23M25 23Q16 2 28-15Q36 7 25 23M-5 24Q-15 1-7-21Q4 3-5 24"/></g>
    <DiscoveryObject id={id} index={index}/>
    <g transform="translate(-9 23)"><motion.g className="meadow-blade-left" style={{rotate:left,originX:0,originY:0,transformBox:'view-box'}}>
      <path d="M0 0C-22-5-29-25-26-40C-14-31-3-19 0 0Z" fill={`url(#${id}-grass)`}/>
      <path d="M0 0C-7-12-5-34 4-43C10-24 8-12 0 0Z" fill={`url(#${id}-grass-light)`}/>
      <path d="M0 0Q-12-10-21-31M0 0Q2-16 3-33" stroke="#D6E7CE" strokeWidth=".65" opacity=".65"/>
    </motion.g></g>
    <g transform="translate(10 24)"><motion.g style={{rotate:right,originX:0,originY:0,transformBox:'view-box'}}>
      <path d="M0 0C4-20 19-32 29-32C27-13 15-1 0 0Z" fill={`url(#${id}-grass)`}/>
      <path d="M0 0C-9-13-14-29-8-42C3-30 7-14 0 0Z" fill={`url(#${id}-grass-light)`}/>
      <path d="M0 0Q14-12 23-25M0 0Q-5-15-7-32" stroke="#D6E7CE" strokeWidth=".65" opacity=".7"/>
    </motion.g></g>
  </g>
}

const flightStops = [
  { x: 111, y: 54, label: 'Ship', labelY: 88 },
  { x: 202, y: 88, label: 'Learn', labelY: 125 },
  { x: 293, y: 54, label: 'Ship again', labelY: 88 },
]
const flightLegs = [
  'M48 89C63 62 82 39 111 54',
  'M111 54C146 66 152 107 202 88',
  'M202 88C239 76 254 34 293 54',
]

/** One activation, one chapter. Each arrival and thought waits for the visitor. */
export function LearningFlight({ onStep, cue }: { onStep: (step: number) => void; cue: boolean }) {
  const id = useId().replace(/:/g, '')
  const paths = useRef<(SVGPathElement | null)[]>([])
  const reduced = useMediaQuery('(prefers-reduced-motion:reduce)')
  const [stage, setStage] = useState(0)
  const [running, setRunning] = useState(false)
  const [leg, setLeg] = useState(-1)
  const [refined, setRefined] = useState(false)
  const busy = useRef(false), alive = useRef(true)
  const x = useMotionValue(48), y = useMotionValue(89), angle = useMotionValue(-24)
  const progress = useMotionValue(0), fold = useMotionValue(0)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; x.stop(); y.stop(); angle.stop(); progress.stop(); fold.stop() }
  }, [x, y, angle, progress, fold])

  const advance = async () => {
    if (busy.current || stage === 3) return
    const path = paths.current[stage]
    if (!path) return
    busy.current = true; setLeg(stage); setRunning(true); progress.set(0)
    // Position and direction share the same arc-length parameter; no reset/fade teleport.
    const length = path.getTotalLength()
    const locate = (value: number) => {
      const distance = value * length
      const p = path.getPointAtLength(distance)
      const before = path.getPointAtLength(Math.max(0, distance - 1))
      const after = path.getPointAtLength(Math.min(length, distance + 1))
      x.set(p.x); y.set(p.y)
      angle.set(Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI)
    }
    const start = path.getPointAtLength(0), heading = path.getPointAtLength(1)
    const takeoffAngle = Math.atan2(heading.y-start.y,heading.x-start.x)*180/Math.PI
    await Promise.all([animate(fold, reduced ? 0 : -5, { duration: reduced ? 0 : .2 }),animate(angle,takeoffAngle,{duration:reduced?0:.2})])
    if (!alive.current) return
    await animate(progress, 1, { duration: reduced ? 0 : 1.05, ease: [.35, 0, .25, 1], onUpdate: locate })
    if (!alive.current) return
    locate(1)
    const next = stage + 1
    setStage(next); onStep(next)
    await Promise.all([
      animate(angle, -5, { duration: reduced ? 0 : .28, ease: 'easeOut' }),
      animate(fold, 0, { duration: reduced ? 0 : .28 }),
    ])
    if (!alive.current) return
    if (next === 2) setRefined(true)
    busy.current = false; setRunning(false)
  }

  return <div className="flight-story miniature-scene" data-stage={stage} data-running={running} data-cue={cue}>
    <div className="flight-story-action">
      <svg viewBox="0 0 360 150" fill="none" aria-hidden="true">
        <Materials id={id}/>
        <defs>
          <radialGradient id={`${id}-air`}><stop stopColor="#B6DAD0" stopOpacity=".33"/><stop offset="1" stopColor="#D4E7DE" stopOpacity="0"/></radialGradient>
          <linearGradient id={`${id}-wing`} x1="-25" y1="-15" x2="20" y2="15" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFEF5"/><stop offset=".48" stopColor="#FFF9E5"/><stop offset="1" stopColor="#D4DCD3"/></linearGradient>
          <linearGradient id={`${id}-route`} x1="48" y1="0" x2="293" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#83BDB4"/><stop offset=".52" stopColor="#BCA271"/><stop offset="1" stopColor="#258C81"/></linearGradient>
        </defs>
        <ellipse cx="185" cy="106" rx="152" ry="36" fill={`url(#${id}-air)`}/>
        {flightLegs.map((d,i)=><g key={d}>
          <path d={d} stroke="#365E69" strokeWidth="3.5" transform="translate(0 1)" opacity=".035"/>
          <path ref={el=>{paths.current[i]=el}} d={d} stroke="#C5D9D9" strokeWidth="1.5" strokeLinecap="round"/>
          <path d={d} stroke="#FFFFFF" strokeWidth=".6" transform="translate(0 -.8)" opacity=".8"/>
          <path d={d} stroke={`url(#${id}-route)`} strokeWidth="2" strokeLinecap="round" opacity={i<stage?1:0}/>
          {i===leg&&running&&<motion.path d={d} stroke={`url(#${id}-route)`} strokeWidth="2" strokeLinecap="round" style={{pathLength:progress}}/>}
        </g>)}
        {flightStops.map((stop,i)=><g key={stop.label} data-current={stage===i+1} className="flight-stop">
          <ellipse cx={stop.x} cy={stop.y+13} rx="19" ry="4" fill="#365E6910"/>
          <circle className={i===stage?'next-arrival':''} cx={stop.x} cy={stop.y} r="8" stroke={i<stage?'#5CA99A':'#9DBCB8'} fill={i<stage?'#DFEFE8':'#F4F8F4'} strokeWidth="1"/>
          <circle cx={stop.x} cy={stop.y} r="2" fill={i<stage?'#168777':'#A5BBB6'}/>
          <text x={stop.x} y={stop.labelY} textAnchor="middle" fill={stage===i+1?'#0B6E62':'#617E86'} fontSize="10" fontWeight={stage===i+1?600:400}>{stop.label}</text>
          <g transform={`translate(${stop.x} ${i===1?33:17})`}>
            <motion.g className="flight-landmark" initial={false} animate={{opacity:i<stage?1:.48,y:stage===i+1?-2:0,scale:stage===i+1?1.08:.94}} transition={{duration:reduced?0:.45,ease:[.22,1,.36,1]}} strokeLinecap="round" strokeLinejoin="round">
              {i===0 ? <g>
                <path d="M-10-5L0-10L10-5V7L0 12L-10 7Z" fill={`url(#${id}-paper)`} stroke="#9AAFA6" strokeWidth=".8"/>
                <path d="M-10-5L0 0L10-5M0 0V12" stroke="#91A99F" strokeWidth=".8"/>
                <path d="M-5-7L5-2V3L2 4V0L-8-5" fill="#D1B474"/>
              </g> : i===1 ? <g>
                <path d="M-13-7Q-6-10 0-6Q6-10 13-7V10Q6 7 0 11Q-6 7-13 10Z" fill={`url(#${id}-gold)`} stroke="#B69E6E" strokeWidth=".7"/>
                <path d="M-11-9Q-5-12 0-8Q5-12 11-9V7Q5 5 0 9Q-5 5-11 7Z" fill={`url(#${id}-paper)`}/>
                <path d="M0-7V8M-8-3L-4-2M-8 1L-4 2M4 1L6 3L9-2" stroke="#619C8F" strokeWidth="1"/>
              </g> : <g>
                <path d="M-7 12V-11" stroke="#75989F" strokeWidth="1.8"/>
                <path d="M-6-10Q0-13 5-9Q9-7 13-10V3Q7 6 2 2Q-2-1-6 2Z" fill={`url(#${id}-teal)`} stroke="#67A596" strokeWidth=".7"/>
                <path d="M-2-4L1-1L6-6" stroke="#FFFFFF" strokeWidth="1.4"/>
                <path d="M-12 13H-2" stroke="#A1BDB6" strokeWidth="1.2"/>
              </g>}
            </motion.g>
          </g>
        </g>)}
        <motion.g style={{x,y,rotate:angle}}>
          <g className="journey-rocket" filter={`url(#${id}-shadow)`}>
            {running&&<g className="rocket-exhaust"><path d="M-24-6Q-45-8-54 0Q-43 8-24 6Z" fill="#E4AD74" opacity=".5"/><path d="M-25-4Q-41-5-46 0Q-39 5-25 4Z" fill="#FFE8AD"/><path d="M-25-2L-37 0L-25 2" fill="#FFFFEA"/></g>}
            <motion.path style={{rotate:fold,originX:1,originY:.5}} d="M-18-9L-27-20Q-15-22-5-10M-18 9L-27 20Q-15 22-5 10" fill="#AF4944" stroke="#D28072" strokeWidth=".7"/>
            <path d="M-23-8H-16V8H-23Z" fill="#3C6477"/><path d="M-23-7V7" stroke="#9AB7C1" strokeWidth="1.5"/>
            <path d="M-20-10Q8-18 32 0Q8 18-20 10Z" fill={`url(#${id}-wing)`} stroke="#BDD0D0" strokeWidth=".7"/>
            <path d="M15-10Q25-6 32 0Q25 6 15 10Q20 0 15-10Z" fill="#C66559"/>
            <path d="M-17 5Q2 11 19 4Q8 14-19 9Z" fill="#90BCAF" opacity=".65"/>
            <path d="M-14-8Q1-12 14-7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="0" cy="0" r="7.3" fill="#739AA5"/><circle cx="0" cy="0" r="5.8" fill="#153E55"/><path d="M-3-1Q-2-4 1-4" stroke="#A3DBDC" strokeWidth="1.4" strokeLinecap="round"/>
            <motion.path initial={false} animate={{d:refined?'M-13 3L-26 8L-17 0Z':'M-13 3L-22 7L-17 0Z'}} transition={{duration:reduced?0:.4}} fill="#B95049"/>
            {refined&&<path d="M8 2L10 4L14-2" stroke="#328779" strokeWidth="1.4" strokeLinecap="round"/>}
          </g>
        </motion.g>
      </svg>
    </div>
    <button type="button" className="launch-control" aria-label={stage===3?'Replay the launch journey':running?'In flight':`${stage===0?'Press':'Press again'} to ${flightStops[stage].label}`} aria-description="Each press advances one stage and keeps its thought visible." aria-disabled={running} onClick={()=>{if(running)return;if(stage===3){setStage(0);setRefined(false);onStep(0);x.set(48);y.set(89);angle.set(-24);progress.set(0)}else void advance()}}><span className="launch-key">{stage===3?<><RotateCcw size={12}/><span>Replay</span></>:<><i aria-hidden="true"/><span>{running?'In flight':stage===0?'Press':'Press again'}</span></>}</span><svg className="launch-invitation-hand" viewBox="0 0 32 40" fill="none" aria-hidden="true"><path d="M11 22V6a3 3 0 0 1 6 0v11a3 3 0 0 1 5-1 3 3 0 0 1 5 2 3 3 0 0 1 3 3v7c0 4-2 7-4 9H13c-1-4-3-6-5-9l-5-7c-2-3 2-6 4-3l4 4Z" fill="#fafcfd" stroke="#547080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 17v6m5-6v7m5-5v6" stroke="#a4b5c0" strokeWidth="1.2" strokeLinecap="round"/></svg></button>
  </div>
}

/** Pointer exploration, with spatial keyboard navigation and persistent discoveries. */
export function CuriosityLens({ onStep, cue }: { onStep: (step: number) => void; cue: boolean }) {
  const id = useId().replace(/:/g, '')
  const frame = useRef<SVGSVGElement>(null)
  const reduced = useMediaQuery('(prefers-reduced-motion:reduce)')
  const targetX = useMotionValue(86), targetY = useMotionValue(78)
  const smoothX = useSpring(targetX, { stiffness: 420, damping: 38 })
  const smoothY = useSpring(targetY, { stiffness: 420, damping: 38 })
  const x = reduced ? targetX : smoothX, y = reduced ? targetY : smoothY
  const magnifyX = useTransform(x, value => -.22 * value)
  const magnifyY = useTransform(y, value => -.22 * value)
  const [exploring, setExploring] = useState(false)
  const [found, setFound] = useState<number[]>([])
  const current = useRef(-1)
  const touch = useRef<{ x:number; y:number; offsetX:number; offsetY:number } | null>(null)
  useEffect(() => {
    if (!cue || exploring || reduced) return
    const lensButton = frame.current?.closest('button')
    const origin = targetX.get()
    const animation = animate(targetX, [origin, origin + 28, origin, origin, origin + 18, origin], { duration: 2.8, times: [0, .2, .4, .6, .8, 1], ease: [.4, 0, .2, 1] })
    return () => {
      animation.stop()
      if (!lensButton?.matches(':hover, :focus-within')) targetX.set(origin)
    }
  }, [cue, exploring, reduced, targetX])
  const explore = (px: number, py: number) => {
    targetX.set(Math.max(48, Math.min(294, px))); targetY.set(Math.max(38, Math.min(105, py)))
    const index = discoveries.findIndex(p => Math.hypot(p.x - px, p.y - py) < 36)
    if (index >= 0 && current.current !== index) {
      current.current = index; onStep(index + 1)
      setFound(previous => previous.includes(index) ? previous : [...previous, index])
    }
  }
  const point = (clientX: number, clientY: number) => {
    const matrix = frame.current?.getScreenCTM()
    if (!matrix) return
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
    explore(p.x, p.y)
  }
  const rest = () => {
    setExploring(false)
    targetX.set(discoveries[0].x); targetY.set(discoveries[0].y)
  }
  return <button type="button" className="curiosity-lens miniature-scene" aria-label="Explore beneath the surface with the lens" aria-description="Move your pointer or drag to uncover connections. Use arrow keys to move the lens, or Enter to visit the next discovery." data-exploring={exploring}
    onPointerEnter={e => { if (e.pointerType === 'mouse') setExploring(true) }}
    onPointerMove={e => { if(e.pointerType==='mouse') point(e.clientX,e.clientY); else if(touch.current){const matrix=frame.current?.getScreenCTM();if(matrix){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());explore(p.x-touch.current.offsetX,p.y-touch.current.offsetY)}} }}
    onPointerDown={e => { if (!e.isPrimary || e.button!==0) return; setExploring(true); e.currentTarget.setPointerCapture(e.pointerId); if(e.pointerType==='touch'){const matrix=frame.current?.getScreenCTM();if(matrix){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());const near=Math.hypot(p.x-targetX.get(),p.y-targetY.get())<72;touch.current={x:e.clientX,y:e.clientY,offsetX:near?p.x-targetX.get():0,offsetY:near?p.y-targetY.get():0};if(!near)explore(p.x,p.y)}}else point(e.clientX,e.clientY) }}
    onPointerUp={e => { if(e.pointerType!=='mouse'){if(touch.current&&Math.hypot(e.clientX-touch.current.x,e.clientY-touch.current.y)<6)point(e.clientX,e.clientY);touch.current=null;setExploring(false)} }} onPointerCancel={()=>{touch.current=null;rest()}} onPointerLeave={e=>{if(e.pointerType==='mouse')rest()}}
    onFocus={()=>setExploring(true)} onBlur={rest}
    onKeyDown={e=>{const delta=12; if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();setExploring(true);if(e.key==='Home')explore(86,78);else if(e.key==='End')explore(267,81);else explore(targetX.get()+(e.key==='ArrowRight'?delta:e.key==='ArrowLeft'?-delta:0),targetY.get()+(e.key==='ArrowDown'?delta:e.key==='ArrowUp'?-delta:0))}}}
    onClick={e=>{if(e.detail===0){const next=discoveries[(current.current+1)%3]; explore(next.x,next.y)}}}>
    <svg ref={frame} viewBox="0 0 360 150" fill="none" aria-hidden="true">
      <Materials id={id} />
      <defs>
        <radialGradient id={`${id}-ground`}><stop stopColor="#DAE6D4" stopOpacity=".5"/><stop offset="1" stopColor="#E8F0F1" stopOpacity="0"/></radialGradient>
        <radialGradient id={`${id}-moss`}><stop stopColor="#9EBA9D" stopOpacity=".32"/><stop offset="1" stopColor="#C7D9BB" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-grass`} x1="0" y1="-42" x2="0" y2="2" gradientUnits="userSpaceOnUse"><stop stopColor="#BCD2AE"/><stop offset=".6" stopColor="#8BAF99"/><stop offset="1" stopColor="#568E82"/></linearGradient>
        <linearGradient id={`${id}-grass-light`} x1="0" y1="-43" x2="0" y2="2" gradientUnits="userSpaceOnUse"><stop stopColor="#D5DDB1"/><stop offset=".6" stopColor="#A8C3A4"/><stop offset="1" stopColor="#74A292"/></linearGradient>
        <linearGradient id={`${id}-steel`} x1="0" y1="-38" x2="15" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="#FCFFFF"/><stop offset=".22" stopColor="#ADC4CD"/><stop offset=".49" stopColor="#EDF8FB"/><stop offset=".74" stopColor="#759AA8"/><stop offset="1" stopColor="#D3E5EB"/></linearGradient>
        <linearGradient id={`${id}-grip`} x1="26" y1="24" x2="47" y2="50" gradientUnits="userSpaceOnUse"><stop stopColor="#36657C"/><stop offset=".45" stopColor="#153950"/><stop offset="1" stopColor="#071F35"/></linearGradient>
        <clipPath id={`${id}-lens`}><motion.circle cx={x} cy={y} r="31"/></clipPath>
      </defs>
      <ellipse cx="180" cy="86" rx="153" ry="51" fill={`url(#${id}-ground)`}/>
      {discoveries.map((_,i)=><DiscoveryMeadow key={i} id={id} index={i} x={x} y={y} found={found.includes(i)}/>)}
      <g clipPath={`url(#${id}-lens)`}><rect className="lens-field" width="360" height="150" fill="#F5F8F9"/><motion.g style={{x:magnifyX,y:magnifyY}}><g transform="scale(1.22)">{discoveries.map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y})`}><DiscoveryObject id={id} index={i}/></g>)}</g></motion.g></g>
      <motion.g style={{x,y}}>
        <ellipse cx="2" cy="12" rx="35" ry="30" fill="#0D3A4E" opacity=".08"/>
        <g filter={`url(#${id}-shadow)`}>
          <path d="M25 25L45 47" stroke={`url(#${id}-steel)`} strokeWidth="11" strokeLinecap="round"/>
          <path d="M32 33L48 50" stroke={`url(#${id}-grip)`} strokeWidth="13" strokeLinecap="round"/>
          <path d="M31 32L45 46" stroke="#7096AA" strokeWidth="1.2" strokeLinecap="round"/>
          <circle r="33.5" fill="none" stroke="#123B4E" strokeWidth="5"/>
          <circle r="33.5" fill="none" stroke={`url(#${id}-steel)`} strokeWidth="3.3"/>
          <circle r="30.5" fill="none" stroke="#153C4D" strokeWidth="1.2"/>
          <circle r="29.5" fill="#E9F6F4" fillOpacity=".08" stroke="#88C6CD" strokeWidth="1.2"/>
          <path d="M-32 1A32 32 0 0 1 15-28" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity=".9"/>
          <path d="M-24-8A25 25 0 0 1-2-25" stroke="#FFF" strokeWidth="2.4" strokeLinecap="round" opacity=".65"/>
        </g>
      </motion.g>
      <rect className="curiosity-pointer-zone" x="42" y="18" width="276" height="108" rx="18" fill="transparent" />
    </svg>
  </button>
}

