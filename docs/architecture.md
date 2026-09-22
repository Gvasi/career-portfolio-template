# Architecture

How the site is put together, what owns which state, and the invariants a change must keep. Running and personalising it are covered by [setup.md](setup.md) and [customisation.md](customisation.md).

## Client and server

- **Pages** (`src/app/*/page.tsx`) are server components that render the section components. `layout.tsx` holds metadata, fonts and the inline consent bootstrap; `robots.ts`, `sitemap.ts` and the `opengraph-image.tsx` files follow the Next.js file conventions and must keep their names.
- **Public configuration and content** live in `src/config/site.ts` (editable identity, destinations and asset paths; safe on both sides, never a secret) and `src/content/` (the words and records each page renders). Creator attribution, service URLs and privacy explanations also appear in their relevant components; the customisation checklist covers those separately.
- **Sections** (`src/components/sections/<Feature>/`) keep feature hooks and styles beside their components. Shared hooks live in `src/hooks/`; shared UI and motion helpers live in `src/components/ui/`, `src/components/layout/` and `src/lib/selectionMotion.ts`. `globals.css` owns design tokens, base styles and shared dialog rules. Feature directories are PascalCase after their principal component; `layout`, `ui` and `about` are grouping folders.
- **API routes** (`src/app/api/**/route.ts`) call the server integrations for Google, Turnstile verification and Upstash. Browser code reaches these operations through `fetch`; nothing under `src/components` or `src/app/contact` imports `src/lib/google`, `src/lib/security` or `src/lib/email`. The public Turnstile challenge widget still loads in the browser.
- **Optional services announce themselves through the server.** Without Google configuration the availability route answers `503 { reason: "unconfigured" }`; the contact page then leads with direct email instead of a calendar. The private notification inbox is `CONTACT_TO_EMAIL` only: `getNotificationRecipient()` refuses a missing or malformed value and the routes answer "not configured" before any send or calendar write.

## Feature ownership

| feature | renders in | state owner | notes |
|---|---|---|---|
| Hero (`sections/Hero`) | `Hero.tsx` | `Hero` owns the story index; `HeroTerminal` owns playback (`arrived`, reader pause), `TypedStory` owns typing | stories and outcomes are paired in `src/content/home.ts` |
| Projects (`sections/Projects`) | `Projects.tsx` | `Projects` owns selection, autoplay gating and the dialog; `useProjectReel` owns cursor, progress and animation; the shared `useCollectionGesture` (with `wheel: true`) turns wheel packets into steps | records in `src/content/projects.ts`, types in `projectTypes.ts` |
| How I Work (`sections/HowIWork`) | `HowIWork.tsx` | one component owns measurement, selection timing, hover/focus and touch | content in `src/content/home.ts` |
| Toolkit (`sections/TechStack`) | `TechStack.tsx` | marquee pause, explorer dialog | catalogue and notes in `src/content/toolkit.tsx`, mark renderers in `TechIcons.tsx`, feature styles in `tech-stack.css` |
| Closing invitation (`sections/Cta`) | `Cta.tsx` | `useClosingReel` owns phases and timers; `useSecondaryWidth` measures the longest phrase | content in `src/content/home.ts`, scoped styles in `Cta.module.css` |
| Contact (`src/app/contact`) | `ContactClient.tsx` | one `useContactForm` invocation (mode, topic, slot, both submissions, one in-flight guard) with `useBookingAvailability` and `useEmailSubmission` beneath it; the page also owns the bot-check handle and focus moves | `BookingPanel` and `MessageForm` render from explicit values and callbacks |
| About (`sections/about`) | `AboutExperience`, `CredentialsVault` (desktop) / `MobileCredentials` (phone), `ConnectedSignoff` | each carousel owns its cursor and animation | records in `src/content/career.ts` |

## Motion invariants

- Every animation respects `prefers-reduced-motion`: `useMotionActivity` reports `reduced`, and reduced rendering shows the same content without cycling.
- The hero and project reel rotate only while eligible: page visible, element intersecting, not paused by the reader. The hero terminal rotates every 4 000 ms of eligible dwell after a 450 ms entrance; hovering never pauses it; keyboard focus latches a pause that only the title-bar control clears. Projects autoplay every 6 500 ms while nothing is hovered, focused, selected, open or moving.
- The closing invitation runs while at least 18% is in view and the page is visible. It restarts from the first phrase on re-entry; reduced motion, including preference changes during a visit, shows the first pair without timers. Its secondary phrases start 3 000 ms apart, with 600 ms exits and 700 ms entrances. Between phrase sets the primary exits for 600 ms, rests for 400 ms, enters for 1 000 ms, then waits 450 ms.
- Timers, animation frames, observers and listeners are cleaned up on unmount; a remount starts fresh.
- Stable keys and `layoutId`s (story file names, project ids, credential ids) keep transitions continuous.

## Project reel wheel behaviour

The reel follows the wheel continuously. `useCollectionGesture` (option `wheel: true`) owns the listener and the pure accumulator `accumulateWheelSteps`: a pixel-mode delta of `COARSE_WHEEL_DELTA` (50 px) or more, or any line/page-mode delta, is one whole step at once — a mouse notch moves one project immediately; smaller pixel deltas (a trackpad) accumulate to one step per `WHEEL_STEP_PIXELS` (60 px), so the reel keeps moving while the fingers move; partial accumulation is dropped after `WHEEL_IDLE_RESET_MS` (220 ms) or on a direction change.

- These are interaction tuning values, not device facts: browsers expose no reliable device identity, and a large pixel delta can come from a notched mouse or a fast trackpad flick alike.
- Steps chain while the reel is still travelling instead of waiting for the previous move to settle; arrow keys chain the same way. Travel is bounded to `MAX_ROWS_AHEAD` rows ahead of the visible position and only the rows around the cursor are rendered, so a free-spinning wheel cannot pile up work.
- Modifier, horizontal-dominant, phone-viewport and non-cancelable packets pass through to the browser; every other vertical packet over the reel is claimed (preventDefault), even below the step threshold, so the page does not scroll under the reel.
- Synthetic tests prove the rules, not devices. `tests/manual/wheel-trace-capture.mjs` records a real mouse or trackpad for the owner's check.

## Booking invariants

- Availability is loaded independently of the selected contact mode. An unconfigured response must reveal direct email even when an intent link opens the message form or the visitor changes modes while loading.
- Real and demo availability share calendar-date validation in `src/lib/contact/dateRange.ts`. Validate the range before provider queries or slot allocation; demo limits are fixed at 62 days per request and 180 days ahead.
- The server is authoritative for slot length and instants: the availability response carries `slotMinutes` and each slot's `end`; the browser submits the offered `end`, never a reconstructed one, and derives its duration copy from the payload.
- Configured windows keep their wall-clock time across daylight-saving changes (`localTimeAtMinute`).
- A booking reaches FreeBusy before it writes; a busy overlap is rejected with no Calendar insert and no email. One attempt id per slot and email keeps a double submit to one request.
- Turnstile verification and the Redis-backed rate limit fail closed; the analytics client only loads on the production origin after consent.

## The Google / email / security services

Routes import the stable public API from `src/lib/google/workspace.ts`. Implementation lives in focused modules:

| Module | Owns |
|---|---|
| `config.ts` | Environment parsing, availability rules, identity aliases and configuration errors |
| `oauth.ts` | OAuth clients, consent URL and setup token exchange |
| `availability.ts` | Date ranges, timezone conversion, slot generation and alignment checks |
| `calendar.ts` | FreeBusy requests and Calendar/Meet creation through the booking coordinator |
| `delivery.ts` | Calendar attachments, Gmail delivery and post-booking notifications |
| `bookingCoordinator.ts` | Reservations, idempotency and recovery through the security store |
| `freeBusy.ts` | Validation of Google's FreeBusy response |

`src/lib/security/*` holds request guards, Turnstile and the store; `src/lib/email/*` builds MIME messages and templates. The small modules make each responsibility easier to locate, but do not change the transaction boundary: validate availability before insertion, persist the booking receipt before notification, and do not insert a second event when retrying. Preserve the timezone, concurrency and privacy guarantees covered by the unit tests.

## Tests

See `tests/README.md` for the layout, commands and the record of retired cases.
