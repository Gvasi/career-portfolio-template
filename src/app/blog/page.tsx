import type { Metadata } from 'next'
import { site } from '@/config/site'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import SocialRail from '@/components/layout/SocialRail'
import ClientPageWrapper from '@/components/layout/ClientPageWrapper'
import UnderConstruction from '@/components/ui/UnderConstruction'

const description = `Upcoming notes from ${site.name} on data, automation, AI and product work.`

export const metadata: Metadata = {
    title: 'Ideas',
    description,
    robots: {
        index: false,
        follow: true,
    },
    alternates: {
        canonical: '/blog',
    },
    openGraph: {
        title: `Ideas | ${site.name}`,
        description,
        url: '/blog',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: `Ideas | ${site.name}`,
        description,
    },
}

export default function Blog() {
    return (
        <ClientPageWrapper>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <SocialRail />
            <Header />
            <main role="main" id="main-content" className="pt-24 pb-12">
                <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
                    <UnderConstruction
                        title="Ideas Coming Soon"
                        message="Short notes on data, automation, AI and product work are being shaped here."
                    />
                </div>
            </main>
            <Footer />
        </ClientPageWrapper>
    )
}
