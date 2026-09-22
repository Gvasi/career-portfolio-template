// Public identity and destinations of the site. Everything here is safe in the
// browser bundle and in server code alike: no secrets, no service credentials.
// Replace the example values with your own (see docs/customisation.md); the
// service configuration lives in environment variables (see docs/setup.md).

export const site = {
  /** Keep true for the fictional demo. Replace its content and profiles before setting false. */
  exampleContent: true,
  /** Full name, as shown in the header, the footer, page titles and emails. */
  name: 'Alex Example',
  /** Used in the greeting, the email sign-off and the terminal's phone mock. */
  firstName: 'Alex',
  /** Two or three letters for the invitation envelope and the icon set. */
  monogram: 'AE',
  /** One-line role for page titles, the social preview image and structured data. */
  role: 'Product Analyst',
  /** Short line under the name on the social preview image. */
  tagline: 'Product Analyst · Data & Automation',
  /** Metadata description, reused by the structured data. */
  description: 'Product Analyst in Lisbon turning product questions into clear analyses, small automations and useful first versions.',
  /** Search keywords for the page metadata. */
  keywords: ['Product analytics', 'Data analysis', 'Automation', 'SQL', 'Python', 'Lisbon Portugal'],
  location: { city: 'Lisbon', countryCode: 'PT', label: 'Lisbon, Portugal' },
  /** Canonical public URL, without a trailing slash: metadataBase, sitemap, robots, structured data and the analytics origin gate. */
  url: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://portfolio.example.com').replace(/\/$/, ''),
  /** Public reply address shown to visitors and used as the Reply-To of acknowledgements. Not the notification inbox (that is CONTACT_TO_EMAIL). */
  contactEmail: 'hello@example.com',
  /** The two primary profiles: hero links, footer links and structured data. */
  github: 'https://github.com/your-handle',
  linkedin: 'https://www.linkedin.com/in/your-handle/',
  /** Optional social profiles for the side rail and the phone menu (any of TikTok, Instagram, YouTube, X, Facebook); delete the ones you do not use. */
  socialRail: [
    { name: 'TikTok', href: 'https://www.tiktok.com/@your-handle' },
    { name: 'Instagram', href: 'https://www.instagram.com/your-handle/' },
    { name: 'YouTube', href: 'https://www.youtube.com/@your-handle' },
    { name: 'X', href: 'https://x.com/your-handle' },
    { name: 'Facebook', href: 'https://www.facebook.com/your-handle' },
  ] as const satisfies readonly { name: 'TikTok' | 'Instagram' | 'YouTube' | 'X' | 'Facebook'; href: string }[],
  /** Optional chat link in the footer (for example a WhatsApp Business short link). Leave undefined to omit the row. */
  chat: undefined as { label: string; href: string } | undefined,
  /** X (Twitter) handle for the summary card, if you have one. */
  twitterHandle: undefined as string | undefined,
  // The hero portrait is not configurable by path: replace the file
  // public/images/profile/portrait-source.png and keep its name, because
  // scripts/prepare-portrait.mjs and the static imports in portraitLoader.ts
  // read the fixed names.
  assets: {
    /** Editorial portrait on the About page and in the portfolio project artwork. */
    aboutPortrait: '/images/profile/about-portrait.webp',
    /** The document behind the "Download CV" action. */
    cv: '/documents/sample-cv.pdf',
    favicon: '/images/favicon.webp',
    appleTouchIcon: '/apple-touch-icon.png',
  },
} as const

export const SITE_URL: string = site.url

/** Host name of the public URL, used for the email Message-ID domain and the analytics host label. */
export const SITE_HOST = new URL(site.url).host
