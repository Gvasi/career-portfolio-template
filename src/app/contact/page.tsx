import { site, SITE_URL } from '@/config/site'
import type { Metadata } from 'next'
import ContactClient from './ContactClient'

const description = 'Book an intro call or send a message — about data, automation, AI workflows, hiring, or a product idea.'

export const metadata: Metadata = {
  title: 'Contact',
  description,
  openGraph: {
    title: `Contact ${site.name} — Let's Connect`,
    description,
    type: 'website',
    url: `${SITE_URL}/contact`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `Contact ${site.name}`,
    description,
  },
  alternates: {
    canonical: '/contact',
  }
}

type ContactPageProps = {
  searchParams?: Promise<{ intent?: string | string[] | undefined }>
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const intent = Array.isArray(resolvedSearchParams?.intent)
    ? resolvedSearchParams.intent[0]
    : resolvedSearchParams?.intent

  return <ContactClient key={intent ?? 'default'} initialIntent={intent} />
}
