import { site, SITE_URL } from "@/config/site"
import { isDemoMode } from '@/lib/demo'
import type { MetadataRoute } from 'next'

const BASE_URL = SITE_URL

// /blog is intentionally excluded: it is noindex while it is under construction.
export default function sitemap(): MetadataRoute.Sitemap {
  if (site.exampleContent || isDemoMode()) return []
  // Omit lastmod until actual per-page editorial dates are tracked.
  // A rebuild does not mean that every page's content changed.
  return [
    {
      url: `${BASE_URL}/`,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
