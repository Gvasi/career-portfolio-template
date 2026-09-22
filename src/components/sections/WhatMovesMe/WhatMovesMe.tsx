'use client'

import { Zap } from 'lucide-react'
import MindsetExperiments from './MindsetExperiments'

export default function WhatMovesMe() {
  return <section id="what-moves-me" className="section-shell bg-white">
    <div className="mx-auto w-full max-w-[var(--page-max)]">
      <div className="mb-7 text-center md:mb-9">
        <div className="section-eyebrow"><Zap size={16} aria-hidden="true" /><span>Mindset</span></div>
        <h2 className="section-title text-transparent bg-clip-text bg-gradient-to-r from-[#072d5f] via-[#0b3b72] to-[#118578]">How I Think</h2>
      </div>
      <MindsetExperiments />
    </div>
  </section>
}
