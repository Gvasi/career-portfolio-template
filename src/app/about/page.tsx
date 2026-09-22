import { Metadata } from 'next'
import { site } from '@/config/site'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import SocialRail from '@/components/layout/SocialRail'
import ClientPageWrapper from '@/components/layout/ClientPageWrapper'
import { AboutExperience, CredentialsVault, ConnectedSignoff } from '@/components/sections/about'

const title = `About ${site.name} — ${site.tagline}`
const description = `${site.name} is a ${site.role} with an operations background, focused on clearer decisions through data, analysis and automation.`

export const metadata: Metadata = {
  title: `About — ${site.role}`,
  description,
  keywords: [site.name, ...site.keywords],
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title,
    description,
    url: '/about',
    type: 'profile',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
}

export default function AboutPage() {
  return (
    <ClientPageWrapper>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <SocialRail />
      <Header />
      <main id="main-content" className="section-stack relative">
        <AboutExperience />
        <CredentialsVault />
        <ConnectedSignoff />
      </main>
      <Footer />
    </ClientPageWrapper>
  )
}
