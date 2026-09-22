'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, cubicBezier, motion, useMotionValue, useTransform } from 'framer-motion'
import { useMotionActivity } from '@/hooks/useMotionActivity'
import { site } from '@/config/site'
import { aboutCta } from '@/content/career'
import './connected-signoff.css'

const settle=cubicBezier(.4,0,.2,1)

function InvitationUnderline(){
  return <svg className="sg-word-signature" viewBox="0 0 150 12" aria-hidden="true"><path d="M9 8.8 Q62 5.3 129 5.6 Q132 5.7 129 6.7 Q62 6.5 9 10 Q6 9.8 9 8.8Z" className="sg-signature-ink"/></svg>
}

function useInvitationOpening(active:boolean,reduced:boolean,engaged:boolean){
  const opening=useMotionValue(0)
  useEffect(()=>{
    if(reduced){opening.jump(0);return}
    if(!active)return
    let cancelled=false
    let playback:{stop:()=>void}|undefined
    const restThenOpen=()=>{
      playback=animate(opening,[0,0,1,1,0,0],{duration:11,times:[0,.09,.27,.39,.59,1],ease:settle,repeat:Infinity})
    }
    // A single owner retargets from the actual position/velocity. The idle cycle
    // cannot move the return destination or restart after a stale completion.
    if(!engaged&&opening.get()===0){restThenOpen()}
    else{
      const response=animate(opening,engaged?1.45:0,{type:'spring',stiffness:72,damping:19,mass:1,restDelta:.001,restSpeed:.005})
      playback=response
      if(!engaged)void response.then(()=>{if(!cancelled)restThenOpen()})
    }
    return()=>{cancelled=true;playback?.stop()}
  },[active,reduced,engaged,opening])
  return opening
}

export function ConnectedSignoff(){
  const ref=useRef<HTMLElement>(null);const {active,reduced}=useMotionActivity(ref,{amount:.25})
  const [hovered,setHovered]=useState(false);const [focused,setFocused]=useState(false)
  const engaged=hovered||focused
  const opening=useInvitationOpening(active,reduced,engaged)
  const paperY=useTransform(opening,[0,1.45],[0,-32])
  const paperRotate=useTransform(opening,[0,1.45],[1.5,-1])
  const pocketY=useTransform(opening,[0,1.45],[0,3])
  const pocketRotate=useTransform(opening,[0,1.45],[-3,-1.2])
  const foldX=useTransform(opening,[0,1.45],[0,-16])
  const shadowScale=useTransform(opening,[0,1.45],[1,1.08])
  const shadowOpacity=useTransform(opening,[0,1.45],[.55,.9])
  const paperShadowOpacity=useTransform(opening,[0,1.45],[.2,.65])
  return <section ref={ref} id="about-signoff" className="sg-surface sg-signoff sg-connected-signoff sg-invitation-v2 sg-invitation-v3" aria-label="Connected About invitation" data-loop-running={active&&!engaged} data-reduced={reduced}><div className="sg-signoff-inner">
    <div className="sg-signoff-copy"><h2>{aboutCta.headlineLead} <span className="sg-signature-word">{aboutCta.signatureWord}<InvitationUnderline/></span><span className="sg-invitation-punctuation">.</span></h2><p>{aboutCta.subtext}</p></div>
    <a className="sg-invitation-envelope" href={aboutCta.buttonHref} aria-label={`${aboutCta.buttonText} — open Contact`} data-engaged={engaged} onPointerEnter={e=>{if(e.pointerType==='mouse')setHovered(true)}} onPointerLeave={()=>setHovered(false)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}>
      <motion.span className="sg-invitation-ground" aria-hidden="true" style={{scaleX:reduced?1:shadowScale,opacity:reduced?.55:shadowOpacity}}/>
      <motion.span className="sg-invitation-back" aria-hidden="true" style={{y:reduced?0:pocketY,rotate:reduced?-3:pocketRotate}}/>
      <motion.span className="sg-invitation-paper-shadow" aria-hidden="true" style={{opacity:reduced?.2:paperShadowOpacity,y:reduced?0:pocketY,rotate:reduced?-3:pocketRotate}}/>
      <motion.span className="sg-invitation-paper" style={{y:reduced?0:paperY,rotate:reduced?1.5:paperRotate}}>
        <span className="sg-invitation-monogram" aria-hidden="true">{site.monogram}<span>.</span></span>
        <span className="sg-invitation-action" aria-hidden="true"><span className="sg-invitation-arrow"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5.75 18.25 18.25 5.75M6.75 5.75h11.5v11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span></span>
        <span className="sg-invitation-paper-lines" aria-hidden="true"><i/><i/></span>
        <span className="sg-invitation-label">{aboutCta.buttonText}</span>
      </motion.span>
      <motion.span className="sg-invitation-front" aria-hidden="true" style={{y:reduced?0:pocketY,rotate:reduced?-3:pocketRotate,rotateX:reduced?0:foldX}}><svg viewBox="0 0 300 86" preserveAspectRatio="none"><path d="M1 1 L146 53 Q150 55 154 53 L299 1" fill="none" stroke="currentColor" strokeWidth="1"/></svg></motion.span>
    </a>
  </div></section>
}
