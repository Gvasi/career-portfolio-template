# Setup

How to run the starter locally, what it does without any service, and what each optional integration needs. Everything here is derived from the code in this repository; the variable names are the ones the code reads (see [`.env.example`](../.env.example)).

For a guided run → personalise → deploy walkthrough, start with [Your first portfolio](first-portfolio.md). If your content is already ready, jump to [Deploying](#deploying); integrations below are optional.

## Requirements

- Node.js 22.15 or later (`package.json` `engines`). Tested with Node 22.22.0 and 24.21.0.
- pnpm 10.34.5 (`packageManager`; `corepack enable` or a global install). Dependencies install from the frozen lockfile.
- Chromium for Playwright if you want the browser tests: `npx playwright install chromium` (about 170 MB, once).

After creating your repository from the template, clone it and enter its folder:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
pnpm install --frozen-lockfile
pnpm dev            # http://localhost:3000
```

`pnpm dev` and `pnpm build` first run `scripts/prepare-portrait.mjs`, which writes the responsive WebP sizes of the hero portrait (`public/images/profile/portrait-*.webp`) from `public/images/profile/portrait-source.png` with `sharp`. The committed sizes match the placeholder, so the script changes nothing until you replace the portrait.

## Three modes

| mode | what happens |
|---|---|
| **Local demo** (`pnpm dev`, no variables) | Every page works with the example content. The contact page leads with a direct email link to `site.contactEmail` because the availability endpoint answers `503 { reason: "unconfigured" }`; the message form and calendar are not shown. The bot check is bypassed in development only when neither a Turnstile secret nor a site key is set, and the rate limit uses an in-memory store. No analytics load. Nothing is sent anywhere. |
| **Production build** (`pnpm build && pnpm start`, or a host) | The default direct-email site still needs no service credentials. If you enable real form submissions or bookings, the security gates **fail closed** unless a Turnstile secret, its allowed hostnames and a Redis store are configured. Configure these services before accepting submissions. |
| **Configured integrations** | With the Google variables and `CONTACT_TO_EMAIL` set, the contact page shows the calendar (real availability, Google Meet booking) and the message form (Gmail delivery). Analytics start only on the production origin named in `src/config/site.ts`, after the visitor accepts. |

Real booking availability comes from server-side configuration. The separate public demo flag described below is only for simulated interactions.

## Public identity is not configuration

Name, role, public URL, public contact address, social profiles and asset paths live in `src/config/site.ts`, which is imported by server and browser code alike and must never hold a secret. Environment variables hold service settings; `NEXT_PUBLIC_SITE_URL` can override `site.url` for a separate deployment.

## Environment variables

Copy `.env.example` to `.env.local` (git-ignored) and fill only what you need. `NEXT_PUBLIC_*` values are compiled into the browser bundle and are public; everything else is server-only.

### Notification inbox and delivery (Gmail API)

| variable | meaning |
|---|---|
| `CONTACT_TO_EMAIL` | The private inbox that receives visitor messages and booking notifications. **Required as soon as delivery is enabled**: there is no built-in fallback address. An empty or malformed value is a configuration error and the routes answer "not configured" instead of sending. |
| `SITE_OWNER_EMAIL_ALIASES` | Comma-separated addresses that are *you*. A message or booking from one of them skips the owner notification. The public reply address (`site.contactEmail`) and `CONTACT_TO_EMAIL` are added automatically. |

Three roles, three values: the public reply address visitors see (`site.contactEmail`, the Reply-To of acknowledgements), the private destination inbox (`CONTACT_TO_EMAIL`) and the authenticated sender (`GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL`, the Google account whose Gmail API sends). Delivery uses that account's Gmail API; there is no SMTP configuration.

### Google Calendar, Meet and Gmail (booking)

| variable | meaning |
|---|---|
| `GOOGLE_WORKSPACE_CLIENT_ID`, `GOOGLE_WORKSPACE_CLIENT_SECRET` | An OAuth web-application client from Google Cloud with the Calendar and Gmail APIs enabled. Authorised redirect URI for local setup: `http://localhost:3000/api/google/oauth/callback`. |
| `GOOGLE_WORKSPACE_REFRESH_TOKEN` | Minted once locally: with the client id/secret in `.env.local`, run `pnpm dev` and open `http://localhost:3000/api/google/oauth/start`. The helper only works for local development requests, asks for the `calendar` and `gmail.send` scopes, and writes the refresh token (and the account email) into your `.env.local`. Copy the value to your host's server-only environment. |
| `GOOGLE_WORKSPACE_GOOGLE_ACCOUNT_EMAIL` | The authorised account (organiser and sender). Filled by the helper. |
| `GOOGLE_WORKSPACE_CALENDAR_ID` | Calendar to check and write; default `primary`. |
| `GOOGLE_WORKSPACE_TIMEZONE` | Organiser time zone for the windows below; default `UTC`. Windows keep their wall-clock time across daylight-saving changes. |
| `GOOGLE_WORKSPACE_DAY_WINDOWS` | Per-weekday windows, `1` = Monday … `7` = Sunday, `HH:MM-HH:MM`, several spans per day separated by `;`, days separated by `\|`. Example: `1=18:30-20:00\|6=12:00-13:00;17:00-18:30`. Days not listed have no slots. |
| `GOOGLE_WORKSPACE_WEEKDAY_DAYS`, `GOOGLE_WORKSPACE_WEEKDAY_WINDOWS`, `GOOGLE_WORKSPACE_WEEKEND_DAYS`, `GOOGLE_WORKSPACE_WEEKEND_WINDOWS` | Older grouped form, used only when `GOOGLE_WORKSPACE_DAY_WINDOWS` is empty (defaults: days `2,3,4,5` with `12:00-13:30;16:30-18:00`, days `6,7` with `11:00-16:00`). |
| `GOOGLE_WORKSPACE_BUSINESS_DAYS`, `GOOGLE_WORKSPACE_DAY_START`, `GOOGLE_WORKSPACE_DAY_END` | Legacy single-window form (defaults `1,2,3,4,5`, `10:00`, `18:00`), used only when none of the above is set. |
| `GOOGLE_WORKSPACE_SLOT_MINUTES` | Slot length; default `30`. The availability response publishes it and the browser derives its wording from it. |
| `GOOGLE_WORKSPACE_MIN_NOTICE_HOURS` | Earliest bookable slot, hours from now; default `24`. |
| `GOOGLE_WORKSPACE_MAX_AVAILABILITY_WINDOW_DAYS` | Largest date range one availability request may ask for; default `62`. |
| `GOOGLE_WORKSPACE_MAX_AVAILABILITY_LOOKAHEAD_DAYS` | How far ahead slots may be offered; default `180`. |

Booking is available only when client id, secret and refresh token are all present, and a booking is refused before any calendar write when `CONTACT_TO_EMAIL` is missing. Every booking is checked against FreeBusy first; a busy overlap is rejected without writing anything.

### Cloudflare Turnstile (bot check)

| variable | meaning |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public widget key, rendered in the browser. |
| `TURNSTILE_SECRET_KEY` | Server-only secret used for siteverify. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Comma-separated hostnames a verified token must have been issued for (`localhost` for a local widget, your domain in production). |

Create separate widgets for local development (`localhost`) and production. Cloudflare's documented testing secrets (`1x0000…`, `2x0000…`, `3x0000…`) are refused in production builds.

### Redis (rate limits and booking coordination)

Either pair works; the Upstash pair wins when both are present:

| variable | meaning |
|---|---|
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash REST endpoint and token. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | The same store as exposed by a Vercel Marketplace integration. |

Keys are scoped by `VERCEL_ENV` (or `production`/`local`), so one store can serve preview and production. Limits are fixed in code: per client address, six bookings and eight messages per hour; per visitor email, three bookings and five messages per day.

### Optional analytics

| variable | meaning |
|---|---|
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` | Set both values. This implementation supports the EU host `https://eu.i.posthog.com` only. There is no default: a missing token, missing host or different host leaves PostHog disabled. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional GA4 measurement id. |

Even when configured, the SDKs load only on the origin given as `url` in `src/config/site.ts`, after the visitor accepts, and never when Do Not Track or Global Privacy Control is set.

### Platform variables

`VERCEL`, `VERCEL_ENV` and `NODE_ENV` are set by the platform. The code uses them for the fail-closed security gates, the store scope and the analytics origin check; do not set them by hand.

## Deploying

**Vercel is the supported deployment reference.** Start with direct email and add integrations when you need them:

1. Commit and push your personalised version to your own GitHub repository. Complete the [content checklist](customisation.md#6-search-and-replace-checklist) and tests first.
2. In Vercel, create a **New Project**, connect GitHub if needed, and import **your repository**. Follow [Vercel's Git import guide](https://vercel.com/docs/git#deploying-a-git-repository) if it is not listed.
3. Confirm the **Next.js** framework preset and repository root (the folder containing `package.json`). Use Node **24.x**, matching the reference deployment, and the pinned **pnpm 10.34.5** package manager. Keep the standard Next.js output settings; the build command is `pnpm build` and the install command is `pnpm install --frozen-lockfile`. Vercel documents its [Node version setting](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) separately.
4. Set `NEXT_PUBLIC_SITE_URL` to your intended public origin, such as `https://your-portfolio.vercel.app`, in the production environment variables before building. You can instead change the fallback `url` in `src/config/site.ts`; an environment value overrides it. This origin controls canonical URLs, sitemap, robots, structured data and the analytics gate. Leave `NEXT_PUBLIC_DEMO_MODE` **unset** and all optional service credentials absent for the direct-email path. Confirm `site.contactEmail` is your real public address and `site.exampleContent` is `false` only after replacing the sample content.
5. Choose **Deploy**, wait for a successful build, and open the assigned URL. If its final domain differs from the origin you configured, update `NEXT_PUBLIC_SITE_URL` (or `site.url`) and redeploy: public variables are included at build time. Use the stable production domain, not a temporary preview URL.
6. Check the actual hosted Home, About, Contact and Privacy pages, images, profile links and CV. Inspect page source for `rel="canonical"` and confirm its URL uses your domain; check `/robots.txt` and `/sitemap.xml` too. Contact should offer email to your address, not a simulated success or an unconfigured form. A mail link opens the visitor's email app; it is not server-side message delivery.

With the Git integration, future pushes to your production branch trigger deployments. Review the generated URL after each change. See [Vercel's deployment guide](https://vercel.com/docs/deployments) for deployment status and previews.

### Other hosts and production integrations

The code's client-address handling is written for Vercel. `getClientIp()` in `src/lib/security/requestGuards.ts` trusts `X-Forwarded-For` only when the `VERCEL` platform variable is present, because Vercel overwrites that header; anywhere else it returns the fixed identity `local-or-untrusted`, so on another host **every visitor shares one IP rate-limit bucket** (six bookings, eight messages per hour and forty availability requests per ten minutes in total, not per address) and the per-email limits are the only per-visitor ones. Before deploying elsewhere, review how your host presents the client address (its trusted proxy header) and adapt that function accordingly; do not simply trust a visitor-supplied header. The rest is a standard Next.js application. If you enable booking or message delivery, provide the required server-only variables above and expect the security gates to fail closed under `NODE_ENV=production`.

## Investigating an unexpected server error

An unexpected `500` response from contact, booking or availability includes an `X-Request-ID` header. Find that ID in your host's server logs to see the affected route and execution phase (request processing, message delivery, booking creation or availability lookup). The ID is generated by the server; it is not taken from a visitor's header. These diagnostics exclude request content and raw provider exceptions. Expected validation and configuration errors keep their existing responses.

## Tests

See [`tests/README.md`](../tests/README.md). In short: `pnpm test:unit` runs the Node tests with Google, Turnstile and Redis mocked; `pnpm test:e2e` runs the Playwright suite against the dev server on port 3000 with the API routes intercepted by fixtures where a configured service is needed. No test contacts a real service.

### Hosting a demonstration

For a demo only, set `NEXT_PUBLIC_DEMO_MODE=true` and `NEXT_PUBLIC_SITE_URL` to its public origin before building. The contact page labels submissions as simulated; no message, invitation or calendar event is sent. Demo pages are `noindex` and the demo sitemap is empty. Leave the demo flag unset on a real portfolio; use direct email or configure its integrations. Never add real service credentials to a demo deployment.

Simulated availability accepts `YYYY-MM-DD` dates, up to 62 calendar days per request and no more than 180 days ahead. Invalid or excessive ranges return 400 before any slots are generated. These demo limits do not require provider credentials and cannot be raised through the Google integration variables.
