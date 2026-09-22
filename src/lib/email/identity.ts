import { site } from '@/config/site'

// Three different roles: the public reply address below (visible to visitors,
// Reply-To of acknowledgements), the private notification inbox
// (CONTACT_TO_EMAIL, server-only) and the authenticated Google account that
// sends (GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL). A forwarding address alone is
// not an authenticated sender.
export const PUBLIC_CONTACT_EMAIL: string = site.contactEmail
