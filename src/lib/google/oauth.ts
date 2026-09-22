import { google } from 'googleapis'
import { GoogleWorkspaceConfigError } from './config'

export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
] as const

function requireGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new GoogleWorkspaceConfigError('Google Workspace OAuth client credentials are not configured.')
  }

  return { clientId, clientSecret }
}

export function getAuthorizedOAuthClient() {
  const { clientId, clientSecret } = requireGoogleOAuthConfig()
  const refreshToken = process.env.GOOGLE_WORKSPACE_REFRESH_TOKEN?.trim()

  if (!refreshToken) {
    throw new GoogleWorkspaceConfigError('Google Workspace refresh token is not configured.')
  }

  const client = new google.auth.OAuth2(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })

  return client
}

function getSetupOAuthClient(origin: string) {
  const { clientId, clientSecret } = requireGoogleOAuthConfig()
  return new google.auth.OAuth2(clientId, clientSecret, `${origin}/api/google/oauth/callback`)
}

export function createGoogleOAuthConsentUrl(origin: string, state: string) {
  const client = getSetupOAuthClient(origin)

  return client.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: [...GOOGLE_WORKSPACE_SCOPES],
    state,
  })
}

export async function exchangeGoogleCodeForCredentials(origin: string, code: string) {
  const client = getSetupOAuthClient(origin)
  const { tokens } = await client.getToken(code)

  if (!tokens.refresh_token) {
    throw new GoogleWorkspaceConfigError(
      'Google did not return a refresh token. Re-run the consent flow with prompt=consent.'
    )
  }

  client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const userInfo = await oauth2.userinfo.get()

  return {
    refreshToken: tokens.refresh_token,
    googleAccountEmail: userInfo.data.email?.trim() || '',
  }
}
