import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import {
  createGoogleOAuthConsentUrl,
  GoogleWorkspaceConfigError,
  hasGoogleWorkspaceClientCredentials,
} from '@/lib/google/workspace'
import { isLocalDevelopmentRequest } from '@/lib/security/requestGuards'

export async function GET(request: Request) {
  if (!isLocalDevelopmentRequest(request)) {
    return NextResponse.json(
      { error: 'Google Workspace setup is only available from local development.' },
      { status: 403 }
    )
  }

  if (!hasGoogleWorkspaceClientCredentials()) {
    return NextResponse.json(
      { error: 'Add GOOGLE_WORKSPACE_CLIENT_ID and GOOGLE_WORKSPACE_CLIENT_SECRET to .env.local first.' },
      { status: 400 }
    )
  }

  try {
    const origin = new URL(request.url).origin
    const state = randomUUID()
    const redirectUrl = createGoogleOAuthConsentUrl(origin, state)
    const response = NextResponse.redirect(redirectUrl)

    response.cookies.set('google_workspace_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: new URL(request.url).protocol === 'https:',
      maxAge: 60 * 10,
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof GoogleWorkspaceConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Failed to start Google authorization.' },
      { status: 500 }
    )
  }
}
