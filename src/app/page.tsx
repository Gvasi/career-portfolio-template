import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Hero from '@/components/sections/Hero'
import WhatMovesMe from '@/components/sections/WhatMovesMe'
import HowIWork from '@/components/sections/HowIWork'
import TechStack from '@/components/sections/TechStack'
import Projects from '@/components/sections/Projects'
import Cta from '@/components/sections/Cta'
import Footer from '@/components/layout/Footer'
import SocialRail from '@/components/layout/SocialRail'
import ClientPageWrapper from '@/components/layout/ClientPageWrapper'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
}

export default function Home() {
  return (
    <ClientPageWrapper>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <SocialRail />
      <Header />
      <main role="main" id="main-content" className="no-x-overflow">
        <div className="section-stack">
          <Hero />
          {/* Contained sections */}
          <div className="container mx-auto px-4 sm-plus:px-6 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <WhatMovesMe />
          </div>
          {/* Full-width sections */}
          <HowIWork />
          <div className="container mx-auto px-4 sm-plus:px-6 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <Projects />
          </div>
          <div className="edge-to-edge">
            <TechStack />
          </div>
          {/* Full-width sections */}
          <Cta />
          <Footer />
        </div>
      </main>
    </ClientPageWrapper>
  )
}
