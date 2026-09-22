import { site, SITE_URL } from "@/config/site"
import { isDemoMode } from '@/lib/demo'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  if (site.exampleContent || isDemoMode()) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
