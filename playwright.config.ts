import { defineConfig } from '@playwright/test'

// Three ways to point the suite at an app, chosen by environment:
// - PLAYWRIGHT_BASE_URL=<url>: test that already running app (dev server, preview, deployment); nothing is launched.
// - PLAYWRIGHT_SERVER=production: run `next start` on PLAYWRIGHT_PORT (default 3100) from an existing `next build`;
//   a port already in use is an error, never a server to reuse.
// - default: `pnpm -s dev` on port 3000, reusing a dev server that is already listening there.
const production = process.env.PLAYWRIGHT_SERVER === 'production'
const port = Number(process.env.PLAYWRIGHT_PORT ?? (production ? 3100 : 3000))
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`
const webServer = process.env.PLAYWRIGHT_BASE_URL
  ? undefined
  : production
    ? { command: `npx next start -p ${port}`, url: baseURL, reuseExistingServer: false, timeout: 60_000 }
    : { command: 'pnpm -s dev', url: baseURL, reuseExistingServer: true, timeout: 120_000, env: { PORT: String(port) } }

export default defineConfig({
  testDir: './tests/e2e',
  // Node unit tests live in tests/unit as *.test.mjs; Playwright owns tests/e2e.
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
  },
  webServer,
})
