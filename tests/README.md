# Tests

```text
tests/
  unit/      Node test runner, *.test.mjs — pure logic, hooks through a small harness, API routes with mocked Google/Turnstile/Redis
  e2e/       Playwright, *.spec.ts — the rendered site in Chromium
  helpers/   register-typescript.mjs — the loader that lets Node import the TypeScript sources with the @/ alias
  manual/    helpers that are never auto-run: a Redis smoke test, a Turnstile widget check, email previews, the wheel trace recorder
```

## Commands

| command | what it runs |
|---|---|
| `pnpm test:unit` | every `tests/unit/*.test.mjs` through the TypeScript loader (each file in its own process) |
| `pnpm test:e2e` | Playwright against the dev server on port 3000 (reused if already running) |
| `PLAYWRIGHT_SERVER=production pnpm test:e2e` | `next start` of an existing build on port 3100; submission cases skip because they need the development bot-check bypass |
| `PLAYWRIGHT_BASE_URL=<url> pnpm test:e2e` | an already running app; nothing is launched. Point it only at an origin you own, and add `PLAYWRIGHT_SERVER=production` when that origin is a production build so the submission cases skip (they intercept the API routes and create nothing, but they need the development bot-check bypass to submit) |
| `pnpm check` | typegen + tsc, eslint, unit tests, production build |

Only Chromium is configured (`npx playwright install chromium` once). WebKit and Firefox are not configured as projects; a Chromium result says nothing about those engines.

## After changing the example content

The project rotation and tool-discovery tests derive project titles, IDs, tool lists and toolkit categories from `src/content/`. Renaming **Research Dashboard** to **Customer Insights**, or changing its tools, needs no duplicate fixture edit in these tests. They compare the rendered choices against the configured content and retain checks for selection, reachability, keyboard behavior and stable layout. Each tested project/category must have distinct, nonempty tool choices; rotation cases require at least two projects.

Run the focused cases while editing:

```bash
pnpm test:e2e tests/e2e/project-rotation.spec.ts tests/e2e/project-tool-discovery.spec.ts
```

Then run the full suite before publishing. Other tests still contain expectations tied to the example: `mobile-detail-polish.spec.ts` expects the **Visit This Portfolio** link, for instance. Search `tests/e2e/` for old labels and IDs when changing them, and adapt section-specific tests if you deliberately remove a section. Preserve functional assertions for keyboard use, layout, focus, motion, rotation and selected state; investigate a behavior failure rather than replacing a specific check with a generic “page loads” assertion. Server security tests do not need weakening to personalise a site.

The [first-portfolio walkthrough](../docs/first-portfolio.md#3-make-two-small-edits) shows the source edits that accompany this example. `pnpm check:content` is a separate editorial preflight: its expected placeholder report in the untouched template is not a browser-test failure.

## What the suites cover

Unit (`tests/unit`): the analytics consent policy and property allowlist; availability windows, slot generation and daylight-saving edges; the booking and contact routes end to end with mocked Google (idempotent retries, FreeBusy rejection, duration contract, acknowledgement emails); the notification recipient (a missing `CONTACT_TO_EMAIL` refuses instead of falling back, and no destination of the original site survives in `src/`); MIME encoding and email templates; Turnstile and rate-limit security gates; the local OAuth helper; request parsing; the collection gesture hook including the wheel accumulator.

Browser (`tests/e2e`): the hero headline and terminal dwell with a paused page clock, plus a real-time full story cycle; the How I work chapters, their animations and the pause behaviour; the What moves me lens; the project reel (wheel policy with synthetic packets, rotation, keyboard, phone swipes, dialog, decision layout, responsive frame, tool discovery); the About journey, credentials carousel and phone wallet; the mobile menu; the privacy preferences; the contact page in its default state (direct email when booking is not configured) and with mocked availability, booking and email delivery; the contact note layout; the closing invitation's pre-hydration styling with JavaScript disabled, complete phrase-set transition, navigation/remount and reduced-motion geometry at 320, 375 and 1280 pixels.

For a visual comparison of the closing invitation, set `CTA_ARTIFACT_DIR` to an absolute directory outside the repository when running `cta-behavior.spec.ts`. The reduced-motion cases save a settled screenshot and log geometry at each size. Real-time animation cases deliberately avoid mocking the page clock because CSS and browser animation timelines need to agree.

Every browser test that needs a configured service intercepts the API route with a fixture; the default-state test deliberately does not, so it proves what a visitor sees on an unconfigured server. No test contacts a real service.

The default contact checks cover bare URLs and recognized intents at desktop and phone sizes, switching modes while capability is loading, and returning to booking after cached slots expire. Demo route tests exercise strict dates, the 62-day range and 180-day horizon, including DST boundaries. The closing invitation is checked when reduced motion changes during a visit and when it leaves the viewport.

CI runs the full browser suite against a production build, then runs `contact-email-flow.spec.ts` and `contact-booking-flow.spec.ts` against a separate development server. This second step exercises the submission cases that intentionally skip in production; their API calls remain intercepted.

Three timing-sensitive specs (`hero-terminal`, `how-i-work-pause`, `about-credentials`) wait for the actual state boundary (a fresh dwell, an observed intersection, a settled carousel) instead of assuming localhost timing, so they also pass on slower or remote origins.

## Manual helpers (read their header comments first)

```bash
node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs tests/manual/wheel-trace-capture.mjs
```

records a real mouse or trackpad's wheel packets over the project reel, one labelled action at a time, and shows how many steps the wheel accumulator makes of each. `render-contact-emails.mjs` writes example email previews to `output/email-previews`; `contact-security-live.mjs` (Redis) and `turnstile-live-server.mjs` (a localhost Turnstile widget) need opt-in credentials from the environment and stop without them. None of them is part of the automated suites.
