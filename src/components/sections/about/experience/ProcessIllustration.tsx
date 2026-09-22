'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'

const ease = [.45, 0, .2, 1] as const
const signals = [
  [{ x: 86, y: 113, w: 102, h: 5 }, { x: 86, y: 141, w: 80, h: 5 }, { x: 86, y: 169, w: 94, h: 5 }],
  [{ x: 96, y: 118, w: 18, h: 12 }, { x: 136, y: 118, w: 18, h: 12 }, { x: 176, y: 118, w: 18, h: 12 }],
  [{ x: 94, y: 165, w: 23, h: 25 }, { x: 130, y: 144, w: 23, h: 46 }, { x: 166, y: 123, w: 23, h: 67 }],
]

/** One folio; the same three signals become a brief, a table and a report. */
export default function ProcessIllustration({ selected, reduced }: { selected: number; reduced: boolean }) {
  const id = useId().replace(/:/g, '')
  const transition = { duration: reduced ? 0 : 1.05, ease }
  const layer = (stage: number) => ({ initial: false as const, animate: { opacity: selected === stage ? 1 : 0 }, transition: { duration: reduced ? 0 : .55 } })
  return <div className="ae-folio-float"><svg className="ae-process-illustration" viewBox="26 18 278 276" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-paper`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff"/><stop offset=".58" stopColor="#fcfdfe"/><stop offset="1" stopColor="#eaf0f5"/></linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2=".85"><stop stopColor="#f8fbfd"/><stop offset=".3" stopColor="#b7c7d2"/><stop offset=".55" stopColor="#eff4f7"/><stop offset="1" stopColor="#9bafbf"/></linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".98"/><stop offset=".6" stopColor="#e9f2f6" stopOpacity=".83"/><stop offset="1" stopColor="#d2e6ec" stopOpacity=".96"/></linearGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f8fbfd"/><stop offset=".23" stopColor="#a7bbc9"/><stop offset=".45" stopColor="#edf5f8"/><stop offset=".75" stopColor="#617e92"/><stop offset="1" stopColor="#d7e5ec"/></linearGradient>
      <radialGradient id={`${id}-ground`}><stop stopColor="#173e59" stopOpacity=".2"/><stop offset="1" stopColor="#173e59" stopOpacity="0"/></radialGradient>
      <filter id={`${id}-shadow`} x="-40%" y="-25%" width="190%" height="185%"><feDropShadow dx="0" dy="13" stdDeviation="9" floodColor="#193b55" floodOpacity=".13"/><feDropShadow dx="0" dy="2" stdDeviation="1.4" floodColor="#193b55" floodOpacity=".12"/></filter>
      <filter id={`${id}-lens-shadow`} x="-35%" y="-35%" width="190%" height="190%"><feDropShadow dx="-3" dy="7" stdDeviation="5" floodColor="#193b55" floodOpacity=".2"/></filter>
      <clipPath id={`${id}-lens`}><circle cx="218" cy="167" r="31"/></clipPath>
    </defs>
    <ellipse cx="162" cy="271" rx="117" ry="18" fill={`url(#${id}-ground)`}/>
    <motion.g initial={false} animate={{ rotate: reduced ? 0 : [-6, -2, -4][selected], y: reduced ? 0 : [0, -3, 0][selected] }} transition={transition} style={{ transformOrigin: '155px 152px' }}>
      <rect x="79" y="38" width="164" height="211" rx="14" fill="#f7f9fb" stroke="#d4dfe7" transform="rotate(7 161 146)"/>
      <path d="M86 48h144v187H86z" fill="none" stroke="#e7edf1" transform="rotate(7 161 146)"/>
      <rect x="65" y="37" width="172" height="214" rx="14" fill={`url(#${id}-edge)`} filter={`url(#${id}-shadow)`}/>
      <rect x="66" y="34" width="170" height="211" rx="13" fill={`url(#${id}-paper)`} stroke="#c7d4df"/>
      <path d="M78 35h144a12 12 0 0 1 12 12v184" fill="none" stroke="#fff" strokeWidth="1.6"/>
      <path d="M78 242h142" stroke="#fff" strokeWidth="1.4"/>
      <rect x="84" y="55" width="20" height="20" rx="6" fill="#0c3555"/>
      <path d="M90 69V62m4 7V59m4 10V64" stroke="#d7e9ee" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M115 60h43M115 69h25" stroke="#456681" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M84 88h134" stroke="#dae3eb"/>
      <motion.g {...layer(0)}>
        {[0, 1, 2].map(row => <g key={row}>
          <circle cx="77" cy={115 + row * 28} r="2" fill="#a6b9c8"/>
          <path d={`M86 ${123 + row * 28}h${[68, 98, 58][row]}`} stroke="#ced9e2" strokeWidth="2" strokeLinecap="round"/>
        </g>)}
        <rect x="84" y="198" width="132" height="25" rx="5" fill="#e9f0f4"/>
        <path d="M94 210h51m8 0h16" stroke="#839eaf" strokeWidth="2" strokeLinecap="round"/>
        <path d="m197 207 4 3-4 3" fill="none" stroke="#54778d" strokeWidth="1.5" strokeLinecap="round"/>
      </motion.g>
      <motion.g {...layer(1)}>
        <rect x="82" y="100" width="135" height="111" rx="7" fill="#fff" stroke="#c5d6e0"/>
        <path d="M83 136h133M83 159h133M83 184h133M123 101v109M162 101v109" stroke="#d9e5eb"/>
        {[0,1,2].map(row => <g key={row}>
          <rect x="94" y={145 + row*23} width="15" height="4" rx="2" fill="#89a4b7"/>
          <rect x="135" y={145 + row*23} width="15" height="4" rx="2" fill="#506e86"/>
          <path d={`m177 ${146+row*23} 3 3 5-6`} fill="none" stroke="#17877c" strokeWidth="1.6" strokeLinecap="round"/>
        </g>)}
        <path d="M86 225h29m6 0h14" stroke="#9eafbd" strokeWidth="2" strokeLinecap="round"/>
      </motion.g>
      <motion.g {...layer(2)}>
        <path d="M84 105h28m7 0h13" stroke="#a3b6c5" strokeWidth="2" strokeLinecap="round"/>
        <path d="M85 190h118M85 162h118M85 134h118" stroke="#e0e8ee"/>
        <path d="M200 111v76" stroke="#d8e4eb"/>
        <path d="M208 119h11m-11 7h7m-7 32h11m-11 7h7" stroke="#9bb1c1" strokeWidth="2" strokeLinecap="round"/>
        <path d="M101 218h35m13 0h35" stroke="#afc1ce" strokeWidth="1.3"/>
        {[93,142,191].map((x,i)=><g key={x}><rect x={x-7} y="211" width="14" height="14" rx="4" fill={i===2?'#148679':'#eaf0f5'} stroke={i===2?'#148679':'#acbecb'}/>{i===2&&<path d={`m${x-3} 218 2 2 4-4`} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>}</g>)}
      </motion.g>
      {signals[selected].map((signal,i)=><motion.rect className="ae-folio-signal" key={i} initial={false} animate={{attrX:signal.x,attrY:signal.y,width:signal.w,height:signal.h,rx:selected===0?2.5:3,fill:i===2?'#148679':i===1?'#406983':'#93acbd'}} transition={{...transition,delay:reduced?0:i*.07}}/>)}
    </motion.g>
    <motion.g {...layer(0)} animate={{opacity:selected===0?1:0,x:reduced||selected===0?0:13,y:reduced||selected===0?0:8}} transition={transition}>
      <g filter={`url(#${id}-lens-shadow)`}>
        <path d="m242 193 25 29" stroke="#416078" strokeWidth="12" strokeLinecap="round"/>
        <path d="m242 193 25 29" stroke={`url(#${id}-metal)`} strokeWidth="9" strokeLinecap="round"/>
        <circle cx="218" cy="167" r="38" fill={`url(#${id}-metal)`} stroke="#8ca5b6" strokeWidth=".8"/>
        <circle cx="218" cy="167" r="32.5" fill={`url(#${id}-glass)`} stroke="#6c8a9f" strokeWidth="1"/>
        <g clipPath={`url(#${id}-lens)`}>
          <path d="M183 148h48m-48 11h68m-68 11h50" stroke="#a4bdcb" strokeWidth="3" strokeLinecap="round"/>
          <rect x="186" y="178" width="58" height="8" rx="3" fill="#16897e"/>
          <path d="M185 150c14-15 32-18 56-13" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="8"/>
        </g>
        <path d="M190 150a32 32 0 0 1 42-12" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
      </g>
    </motion.g>
  </svg></div>
}
