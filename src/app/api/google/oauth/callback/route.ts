import { NextRequest, NextResponse } from 'next/server'
import { upsertLocalEnv } from '@/lib/env/localEnv'
import {
  exchangeGoogleCodeForCredentials,
  GoogleWorkspaceConfigError,
} from '@/lib/google/workspace'
import { isLocalDevelopmentRequest } from '@/lib/security/requestGuards'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function GET(request: NextRequest) {
  if (!isLocalDevelopmentRequest(request)) {
    return NextResponse.json(
      { error: 'Google Workspace setup is only available from local development.' },
      { status: 403 }
    )
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = request.cookies.get('google_workspace_oauth_state')?.value

  if (!code) {
    return NextResponse.json({ error: 'Missing Google authorization code.' }, { status: 400 })
  }

  if (!state || state !== storedState) {
    return NextResponse.json({ error: 'Google authorization state mismatch.' }, { status: 400 })
  }

  try {
    const origin = url.origin
    const { refreshToken, googleAccountEmail } = await exchangeGoogleCodeForCredentials(origin, code)

    await upsertLocalEnv({
      GOOGLE_WORKSPACE_REFRESH_TOKEN: refreshToken,
      ...(googleAccountEmail ? { GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL: googleAccountEmail } : {}),
    })

    const response = new NextResponse(
      `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Google Workspace Connected</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f5f7fb; color: #06254A; margin: 0; padding: 40px 20px; }
      .card { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 20px; padding: 28px 32px; box-shadow: 0 18px 40px rgba(6,37,74,0.12); }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0 0 12px; line-height: 1.6; }
      code { background: #edf2f7; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Google Workspace connected</h1>
      <p>The refresh token was written to <code>.env.local</code>.</p>
      <p>Authorized Google account: <strong>${escapeHtml(googleAccountEmail || 'not detected')}</strong></p>
      <p>Restart the dev server before testing booking or contact delivery.</p>
    </div>
  </body>
</html>`,
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    )

    response.cookies.delete('google_workspace_oauth_state')

    return response
  } catch (error) {
    if (error instanceof GoogleWorkspaceConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Provider errors can carry response bodies and request details; log a fixed line only.
    console.error('Google OAuth callback failed.')
    return NextResponse.json(
      { error: 'Failed to complete Google authorization.' },
      { status: 500 }
    )
  }
}
