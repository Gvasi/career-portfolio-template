import type { Metadata } from 'next'
import { site } from '@/config/site'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { PrivacyCookieChoices } from '@/components/analytics/AnalyticsPreferences'
import styles from './privacy.module.css'

const description = `Contact details, optional cookies and your privacy choices on ${site.name}’s portfolio.`

export const metadata: Metadata = {
  title: 'Privacy',
  description,
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: `Privacy | ${site.name}`,
    description,
    url: '/privacy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Privacy | ${site.name}`,
    description,
  },
}

export default function PrivacyPage() {
  return <><a href="#main-content" className="skip-link">Skip to main content</a><Header /><main id="main-content" className={styles.page}>
    <h1>Privacy</h1>
    <p className={styles.intro}>Your details are used to respond when you get in touch. Optional cookies are always your choice.</p>
    <section>
      <h2>Getting in touch</h2>
      <p>I use your name, email, message and booking details to reply or arrange a call, and keep them as needed for our conversation.</p>
    </section>
    <section id="cookies">
      <h2>Optional cookies</h2>
      <p>Cookies and browser storage remember information on your device. With your permission, they measure visits and activity on this site. You can change your choice anytime.</p>
      <PrivacyCookieChoices />
      <details className={styles.details}>
        <summary>Cookie details</summary>
        <div>
          <p><a href="https://posthog.com/privacy">PostHog</a> and <a href="https://policies.google.com/privacy">Google Analytics</a> process browser identifiers, device information and site activity with consent. Their linked policies explain international processing.</p>
          <p>Your choice and Google cookies expire after 180 days. PostHog browser storage lasts until cleared. Declining stops collection and clears this site’s measurement identifiers.</p>
          <p>PostHog reporting data is kept for one year. Google keeps event data for two months and user data for 14 months after the last activity. These limits do not apply to Google’s aggregated reports.</p>
        </div>
      </details>
    </section>
    <section>
      <h2>Your information</h2>
      <p>This site is managed by {site.name}. Hosting, security, email and scheduling services process information needed to run the site and handle requests. To access, correct or delete your information, or ask a privacy question, <a href={`mailto:${site.contactEmail}`}>email me</a>.</p>
    </section>
  </main><Footer /></>
}
