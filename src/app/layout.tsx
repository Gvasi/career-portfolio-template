import { isDemoMode } from '@/lib/demo'
import type { Metadata, Viewport } from "next"
import { site, SITE_URL } from "@/config/site"
import { PORTRAIT_SOURCE } from "@/components/sections/Hero/portraitLoader"
import { Poppins, Fira_Code } from "next/font/google"
import "./globals.css"
import MotionPreferences from "@/components/layout/MotionPreferences"
import AnalyticsPreferences from "@/components/analytics/AnalyticsPreferences"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06254A",
}

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
})

const firaCode = Fira_Code({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
})

const title = `${site.name} — ${site.tagline}`
const indexable = !site.exampleContent && !isDemoMode()

export const metadata: Metadata = {
  title: {
    default: title,
    template: `%s | ${site.name}`
  },
  description: site.description,
  keywords: [...site.keywords],
  authors: [{ name: site.name, url: SITE_URL }],
  creator: site.name,
  publisher: site.name,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title,
    description: site.description,
    type: "website",
    url: SITE_URL,
    siteName: `${site.name} Portfolio`,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: site.description,
    ...(site.twitterHandle ? { creator: site.twitterHandle } : {}),
  },
  robots: {
    index: indexable,
    follow: indexable,
    googleBot: {
      index: indexable,
      follow: indexable,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: site.assets.favicon,
        type: "image/webp",
      }
    ],
    shortcut: site.assets.favicon,
    apple: [{ url: site.assets.appleTouchIcon, sizes: "180x180", type: "image/png" }],
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${firaCode.variable}`} suppressHydrationWarning>
      <head>
        {/* Essential local preference only. Render first-visit choices in HTML, without waiting for hydration. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=JSON.parse(localStorage.getItem('gv.analytics-consent.v1')||'null');if(p&&(p.choice==='accepted'||p.choice==='declined')&&typeof p.at==='number'&&p.at<=Date.now()&&Date.now()-p.at<15552000000)document.documentElement.setAttribute('data-gv-analytics-consent','saved')}catch(e){}})();` }} />
        <noscript><style>{'[data-analytics-panel]{display:none!important}'}</style></noscript>
      </head>
      <body className="font-[var(--font-poppins)] antialiased overflow-x-clip">
        <MotionPreferences>{children}</MotionPreferences>
        <AnalyticsPreferences />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Person",
                  "@id": `${SITE_URL}/#person`,
                  "name": site.name,
                  "jobTitle": site.role,
                  "description": site.description,
                  "url": SITE_URL,
                  "image": `${SITE_URL}${PORTRAIT_SOURCE}`,
                  "email": site.contactEmail,
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": site.location.city,
                    "addressCountry": site.location.countryCode
                  },
                  "knowsAbout": [...site.keywords],
                  "sameAs": site.exampleContent ? [] : [site.github, site.linkedin, ...site.socialRail.map(link => link.href)]
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  "name": `${site.name} Portfolio`,
                  "url": SITE_URL,
                  "description": site.description,
                  "publisher": {
                    "@id": `${SITE_URL}/#person`
                  }
                }
              ]
            })
          }}
        />
      </body>
    </html>
  )
}
