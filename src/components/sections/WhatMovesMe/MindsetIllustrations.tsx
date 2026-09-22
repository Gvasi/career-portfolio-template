'use client'

import { useId, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useMediaQuery, useMotionActivity } from '@/hooks/useMotionActivity'

export function Art({ children, place }: { children: ReactNode; place: 'garden' | 'workshop' | 'cafe' | 'sky' }) {
  const ref = useRef<HTMLDivElement>(null)
  const sceneryId = useId().replace(/:/g, '')
  const { active } = useMotionActivity(ref)
  return <div className="mindset-art" ref={ref} data-active={active} aria-hidden="true"><svg viewBox="0 0 360 150" fill="none" focusable="false"><defs><radialGradient id={`${sceneryId}-fade`} cx="50%" cy="57%" r="65%"><stop offset=".25" stopColor="white" /><stop offset=".65" stopColor="#aaa" /><stop offset="1" stopColor="black" /></radialGradient><mask id={`${sceneryId}-scenery`} x="0" y="0" width="360" height="150" maskUnits="userSpaceOnUse"><rect width="360" height="150" fill={`url(#${sceneryId}-fade)`} /></mask></defs><g mask={`url(#${sceneryId}-scenery)`}><Scenery place={place} /></g>{children}</svg></div>
}

function Scenery({ place }: { place: 'garden' | 'workshop' | 'cafe' | 'sky' }) {
  if (place === 'garden') return <g>
    <circle cx="287" cy="34" r="21" fill="#E8C777" opacity=".28" />
    <path d="M8 122Q83 82 173 116Q257 85 352 117Q281 139 197 141Q77 147 8 122Z" fill="#C1C59B" opacity=".2" />
    <path d="M28 118Q108 107 172 131Q262 111 335 125" stroke="#B4B78F" strokeOpacity=".35" />
    <g stroke="#769D7E" strokeLinecap="round"><path d="M39 119V100M39 111Q28 112 29 103Q39 102 39 111M39 107Q48 108 48 99Q39 99 39 107" fill="#AEC9A6" /><path d="M311 128V112M311 120L318 115" /></g>
    <circle cx="311" cy="109" r="4" fill="#E1BB74" />
  </g>
  if (place === 'workshop') return <g>
    <path d="M55 112V26Q55 18 63 18H121V112" stroke="#9ABAC8" strokeOpacity=".35" />
    <path d="M59 53H115M86 23V106" stroke="#ABC7D1" strokeOpacity=".4" />
    <ellipse cx="180" cy="130" rx="146" ry="13" fill="#7AA6B9" opacity=".12" />
    <path d="M260 40H317M267 41V47M310 41V47" stroke="#749BB0" strokeOpacity=".45" strokeLinecap="round" />
    <path d="M278 38V25M273 28Q278 17 283 28M292 38V21L298 18L304 21V38" stroke="#759FA5" strokeWidth="2" strokeLinecap="round" opacity=".45" />
    <path d="M75 114H93V130H75Z" fill="#CFB272" /><path d="M94 117Q106 117 102 124H94" stroke="#B99962" strokeWidth="2" />
    <path className="art-breathe" d="M81 108Q77 102 82 96M88 108Q84 102 89 96" stroke="#849FAB" strokeLinecap="round" opacity=".5" />
  </g>
  if (place === 'cafe') return <g>
    <path d="M43 115V42A35 35 0 0 1 70 9V115M53 55H76" stroke="#89B6A6" strokeOpacity=".3" strokeWidth="2" />
    <ellipse cx="180" cy="133" rx="136" ry="10" fill="#80AF9E" opacity=".12" />
    <path d="M27 117H44L42 136H30Z" fill="#D7B887" /><path d="M35 117V86M35 104Q17 104 21 89Q35 89 35 104M35 98Q51 98 48 83Q35 84 35 98" fill="#84B2A0" stroke="#679582" />
    <ellipse cx="315" cy="133" rx="16" ry="3" fill="#719D8D" opacity=".2" /><path d="M303 117H325L323 130H306Z" fill="#F9EDD1" stroke="#CFB98D" /><path d="M325 119Q337 117 332 125H324" stroke="#BBAC82" strokeWidth="2" />
  </g>
  return <g>
    <circle cx="295" cy="29" r="20" fill="#E6CA85" opacity=".35" />
    <g className="art-breathe" fill="#FFFEF4" opacity=".8"><path d="M32 44Q30 34 42 33Q44 19 58 25Q68 23 72 35Q85 35 83 44Z" /><path d="M201 23Q205 13 216 18Q220 7 232 13Q242 10 247 23Z" /></g>
    <path d="M8 137Q41 128 70 108Q88 107 115 129Q141 106 164 124Q186 140 208 130Q242 92 269 111Q298 135 351 117Q324 144 196 145Q74 150 8 137Z" fill="#9FBA98" opacity=".17" />
  </g>
}

export function Materials({ id }: { id: string }) {
  return <defs>
    <linearGradient id={`${id}-ink`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#467D9F" /><stop offset=".48" stopColor="#174563" /><stop offset="1" stopColor="#06254A" /></linearGradient>
    <linearGradient id={`${id}-teal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#D0F6E8" /><stop offset=".48" stopColor="#79C9BA" /><stop offset="1" stopColor="#238E83" /></linearGradient>
    <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFF0C8" /><stop offset=".48" stopColor="#DCC18A" /><stop offset="1" stopColor="#A78A50" /></linearGradient>
    <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFFEF5" /><stop offset=".55" stopColor="#F3F3E7" /><stop offset="1" stopColor="#DCE9DE" /></linearGradient>
    <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFFFFF" stopOpacity=".85" /><stop offset=".5" stopColor="#BBE2E0" stopOpacity=".22" /><stop offset="1" stopColor="#709DA8" stopOpacity=".5" /></linearGradient>
    <filter id={`${id}-shadow`} x="-50%" y="-50%" width="210%" height="230%" colorInterpolationFilters="sRGB"><feDropShadow dx="0" dy="1.5" stdDeviation=".7" floodColor="#1D4855" floodOpacity=".18" /></filter>
    <filter id={`${id}-soft`} x="-50%" y="-100%" width="200%" height="300%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="2" /></filter>
  </defs>
}

function Spark({ x, y, gold = false }: { x: number; y: number; gold?: boolean }) {
  return <path d={`M${x} ${y - 5}Q${x} ${y} ${x + 5} ${y}Q${x} ${y} ${x} ${y + 5}Q${x} ${y} ${x - 5} ${y}Q${x} ${y} ${x} ${y - 5}Z`} fill={gold ? '#CEAE69' : '#509D94'} />
}

export function AIIllustration({ step }: { step: number }) {
  const id = useId().replace(/:/g, '')
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return <Art place="workshop"><Materials id={id} />
    <ellipse cx="183" cy="137" rx="53" ry="5" fill="#163E57" opacity=".12" filter={`url(#${id}-soft)`} />
    <g filter={`url(#${id}-shadow)`}>
      <path d="M155 105H202L211 128Q180 138 147 128Z" fill={`url(#${id}-paper)`} stroke="#9BBAC0" />
      <path d="M164 112H195V123H164Z" fill={`url(#${id}-ink)`} />
      {[0, 1, 2, 3].map(i => <rect key={i} x={168+i*6} y="115" width="4" height="5" rx="1" fill={i <= step ? '#83D3BB' : '#355D72'} />)}
      <motion.g initial={false} animate={{ rotate: [0, -7, 8, 0][step], y: [0, -2, 0, -3][step] }} style={{ originX: .5, originY: 1 }} transition={{ duration: reduced ? 0 : .38 }}>
        <path d="M180 32V20" stroke="#668FA2" strokeWidth="3" /><circle cx="180" cy="17" r="5" fill={`url(#${id}-gold)`} />
        <rect x="129" y="58" width="12" height="26" rx="6" fill={`url(#${id}-gold)`} />
        <rect x="219" y="58" width="12" height="26" rx="6" fill={`url(#${id}-gold)`} />
        <rect x="138" y="34" width="84" height="70" rx="24" fill={`url(#${id}-paper)`} stroke="#A7C5C7" />
        <path d="M150 45Q176 35 205 44" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <rect x="146" y="48" width="68" height="43" rx="16" fill={`url(#${id}-ink)`} />
        <motion.g initial={false} animate={{ x: [0, 3, -3, 0][step] }} transition={{ duration: reduced ? 0 : .25 }}>
          {step === 3 ? <path d="M156 66Q162 56 168 66M191 66Q197 56 203 66" stroke="#A5F0D5" strokeWidth="3" strokeLinecap="round" /> : <g className="robot-eye"><rect x="159" y={step === 2 ? 63 : 59} width="7" height={step === 2 ? 6 : 12} rx="3.5" fill="#A5F0D5" /><rect x="193" y="59" width="7" height="12" rx="3.5" fill="#A5F0D5" /></g>}
          <path d={step === 2 ? 'M176 80L184 78' : 'M175 77Q180 82 185 77'} stroke="#A5F0D5" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      </motion.g>
      <motion.g initial={false} animate={{ rotate: [0, -20, 18, -35][step] }} style={{ originX: 1, originY: .5 }} transition={{ duration: reduced ? 0 : .4 }}><path d="M151 111L129 98L116 107" stroke="#84AAA9" strokeWidth="8" strokeLinecap="round" /><circle cx="114" cy="109" r="7" fill={`url(#${id}-gold)`} /></motion.g>
      <motion.g initial={false} animate={{ rotate: [0, -18, 10, -32][step] }} style={{ originX: 0, originY: .5 }} transition={{ duration: reduced ? 0 : .4 }}><path d="M207 111L229 99L241 82" stroke="#84AAA9" strokeWidth="8" strokeLinecap="round" /><circle cx="243" cy="78" r="7" fill={`url(#${id}-gold)`} /></motion.g>
    </g>
    <motion.g initial={false} animate={{ opacity: 1, y: step % 2 ? -2 : 1 }} transition={{ duration: reduced ? 0 : .35 }}>
      <path d="M254 50Q247 50 247 43V23Q247 16 255 16H282Q290 16 290 24V43Q290 50 282 50H262L254 58Z" fill="#FCFAE9" stroke="#C8C9AC" />
      {step === 0 && <path d="M265 26L259 32L265 38M274 26L280 32L274 38" stroke="#458677" strokeWidth="2" strokeLinecap="round" />}
      {step === 1 && <path d="M262 38L275 25M262 25L276 39M260 23L265 23M276 39V34" stroke="#458677" strokeWidth="2" strokeLinecap="round" />}
      {step === 2 && <><path d="M264 27C264 20 275 20 275 27C275 32 269 31 269 35" stroke="#9C7B40" strokeWidth="2" /><circle cx="269" cy="41" r="1.4" fill="#9C7B40" /></>}
      {step === 3 && <path d="M260 32L267 39L280 24" stroke="#458677" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
    </motion.g>
  </Art>
}

export function PeopleIllustration({ step }: { step: number }) {
  const id = useId().replace(/:/g, '')
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return <Art place="cafe"><Materials id={id} />
    <ellipse cx="180" cy="131" rx="113" ry="6" fill="#326E59" opacity=".1" filter={`url(#${id}-soft)`} />
    <path d="M109 97C112 134 236 136 252 96" stroke="#8DBBAA" strokeDasharray="2 5" strokeLinecap="round" />
    <motion.path d="M153 77C182 39 191 115 216 75" stroke="#309E88" strokeWidth="2" strokeLinecap="round" initial={false} animate={{ pathLength: [.15, .4, .75, 1][step] }} transition={{ duration: reduced ? 0 : .8 }} />
    <g className="art-breathe" filter={`url(#${id}-shadow)`}>
      <path d="M65 33Q65 23 80 23H162Q176 23 176 38V72Q176 87 160 87H102L80 101L84 87H80Q65 87 65 72Z" fill={`url(#${id}-gold)`} stroke="#D7BF87" transform="rotate(-6 120 62)" />
      <path d="M72 33Q73 28 81 28H157" stroke="#FFFAE4" strokeWidth="2" strokeLinecap="round" transform="rotate(-6 120 62)" />
      {[103, 121, 139].map((x, index) => <motion.g key={x} animate={{ y: step === index ? -4 : 0 }} initial={false} transition={{ duration: reduced ? 0 : .4 }}><circle className="conversation-dot" style={{ animationDelay: `${index * .2}s` }} cx={x} cy="59" r="5" fill="#9D814B" opacity=".7" /><circle cx={x - 1} cy="57" r="1.5" fill="#F7ECCB" /></motion.g>)}
    </g>
    <motion.g initial={false} animate={{ y: [4, 0, -3, -1][step], rotate: [4, 1, -3, 0][step] }} style={{ originX: .5, originY: .5 }} transition={{ duration: reduced ? 0 : .6, ease: [.22, 1, .36, 1] }} filter={`url(#${id}-shadow)`}>
      <path d="M193 59Q193 46 207 46H284Q299 46 299 60V94Q299 109 284 109H275L281 124L259 109H207Q193 109 193 94Z" fill={`url(#${id}-ink)`} stroke="#4D897F" />
      <path d="M200 58Q201 52 208 52H280" stroke="#8BBDB6" strokeOpacity=".7" strokeWidth="1.5" strokeLinecap="round" />
      <g stroke="#D0F4E3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {step === 0 && <>{[230, 247, 264].map(x => <circle key={x} cx={x} cy="80" r="2.5" fill="#D0F4E3" stroke="none" />)}</>}
        {step === 1 && <><path d="M241 72C241 63 256 63 256 72C256 78 248 77 248 83" /><circle cx="248" cy="92" r="1.3" fill="#D0F4E3" stroke="none" /></>}
        {step === 2 && <><path d="M248 69L252 65A8 8 0 0 1 263 76L255 84A8 8 0 0 1 244 83M246 87L242 91A8 8 0 0 1 231 80L239 72A8 8 0 0 1 250 73M240 83L254 73" /></>}
        {step === 3 && <path d="M234 79L244 89L263 68" strokeWidth="3.2" />}
      </g>
    </motion.g>
    <g className="art-breathe"><Spark x={46} y={93} /><Spark x={314} y={28} gold /></g>
  </Art>
}
