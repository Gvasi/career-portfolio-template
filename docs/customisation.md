# Customisation

The starter ships with a fictional person, Alex Example. Making it yours is a short list of files, in this order. Paths are relative to the repository root.

Want to see two small changes first? [Your first portfolio](first-portfolio.md) walks through changing the greeting and one project before you work through this field map.

## 1. `src/config/site.ts` — who and where

One object, imported by pages, components, emails and structured data alike. Change every field:

| field | used by |
|---|---|
| `name`, `firstName`, `monogram` | header wordmark, phone menu, footer, page titles, structured data, email sender name and sign-off, the invitation envelope, the phone mock in the portfolio artwork |
| `role`, `tagline`, `description`, `keywords` | page metadata, the social preview image, the About metadata, structured data |
| `location` | hero meta row, contact aside, footer, structured data, social preview image |
| `url` (or `NEXT_PUBLIC_SITE_URL`) | `metadataBase`, canonical URLs, sitemap, robots, structured data, email links, the analytics origin gate and the email `Message-ID` domain — set it before your first production build |
| `contactEmail` | footer, contact page (direct email and error links), privacy page, acknowledgement `Reply-To`, structured data. This is the public address, not the private inbox (`CONTACT_TO_EMAIL`, see [setup](setup.md)) |
| `github`, `linkedin` | hero links, footer, structured data |
| `socialRail` | the side rail and the phone menu (TikTok, Instagram, YouTube, X, Facebook; delete the ones you do not use) |
| `chat` | optional footer chat row (for example a WhatsApp Business short link); leave `undefined` to omit the row |
| `twitterHandle` | the `twitter:creator` card field, if you have one |
| `assets` | paths of the About portrait, CV, favicon and Apple touch icon (the hero portrait keeps a fixed file name, see below) |

Email placeholders use the reserved `example.com` domain. Social links use `your-handle` paths for illustration; replace or remove them rather than assuming that a username is unclaimed.

## 2. `src/content/` — what the pages say

| file | content |
|---|---|
| `home.ts` | `hero` (greeting prefix, value sentence, secondary meta), `codeStories` (the five terminal stories with their paired outcome words — keep lines short, the terminal reserves the width of the widest story and the greeting reserves the widest outcome), `HOW_I_WORK_SECTIONS` and `HOW_I_WORK_SIDE_COPY` (six chapters; the `id` selects the animation file), `closingPhrases` (each secondary phrase's `k` becomes a `?intent=` value on the contact page) |
| `career.ts` | `milestones` (career chapters with their illustrations), `credentials` (title, short title, issuer shown as text or a logo you may reproduce, year, skills, status, verification link), `aboutIntro`, `journeyHeading`, `aboutCta` |
| `projects.ts` | the project reel: title, short name, status, links, `artwork` (`site-preview` renders your screenshot on the laptop composition; `illustration` shows a full-bleed image) and the story told by the detail dialog (three map parts, decisions, tools). The analytics allowlist of project ids is derived from this file |
| `toolkit.tsx` | the tool catalogue with its marks, the two marquee rows, three explorer categories and plain-language tool descriptions |
| `contact.ts` | the three topics, the progressive notes, the confirmation lines and the `?intent=` values that preselect a topic |

Story `map.kind` (`journey` / `workflow` / `questions`) and part `icon` names come from a fixed set in `src/components/sections/Projects/projectTypes.ts`; pick the closest.

## 3. `public/` — your images and documents

| replace | with |
|---|---|
| `images/profile/portrait-source.png` | your hero portrait (square works best) — keep the file name; `pnpm dev` or `pnpm build` regenerates `portrait-256 … 1200.webp` and the sharing-card portrait from it |
| `images/profile/about-portrait.webp` | your About portrait (portrait orientation, about 768×836) |
| `images/career/*.webp` | one landscape illustration or photograph per chapter (1280 px wide, about 3:2), referenced from `career.ts` |
| `images/projects/portfolio-preview.png` | a 1280×800 screenshot of your own home page (shown on the laptop) |
| `images/projects/research-dashboard.png`, `retention-signals.png` | your project covers (1448×1086, transparent background works best) |
| `documents/sample-cv.pdf` | your CV; update `assets.cv` in `site.ts` if you rename it |
| `images/favicon.webp`, `apple-touch-icon.png`, `src/app/favicon.ico` | your icons (256², 180², 32/16 px) |
| `animations/how-i-work/<id>.json` + `<id>-poster.webp` | the six chapter animations (Lottie, 512×512) and their still frames; keep the file names or change them in `src/components/sections/HowIWork/SectionAccent.tsx` |
| `src/assets/opengraph/portrait.png` | generated automatically from `portrait-source.png`; do not edit this derivative |

See [ASSETS.md](../ASSETS.md) for what the bundled placeholders are and their terms.

## 4. Things that still take a component edit

The starter keeps copy that is generic inside the components that render it. Change these if you want different words:

- The four *What moves me* cards: `src/components/sections/WhatMovesMe/*.tsx` (copy and inline SVG art).
- Section headings and eyebrows ("How I Think", "How I Work", "What I'm Building", "What I Build With"): in each section component under `src/components/sections/`.
- Contact stage headings, success copy and the direct-email sentence: `src/app/contact/ContactClient.tsx`; booking wording: `src/app/contact/BookingPanel.tsx`.
- Credential skill icons and one-line details: `src/components/sections/about/credentialFocus.ts` (a skill without an entry gets a compass icon and "Focus area").
- Email wording: `src/lib/email/templates.ts`; Calendar event text: `src/lib/google/calendar.ts`; calendar attachments and notifications: `src/lib/google/delivery.ts`.
- Privacy page text: `src/app/privacy/page.tsx`. Describe the services you actually enable, their account retention settings and a working contact address. The example is not a policy for every deployment. Ideas page placeholder: `src/app/blog/page.tsx`.
- Colours, fonts and spacing: `src/app/globals.css` (palette variables) and `src/app/layout.tsx` (Poppins and Fira Code through `next/font`).
- The social preview image layout: `src/app/opengraph-image.tsx`.

## 5. Behaviour you may want to keep as it is

- Terminal cadence (450 ms entrance, 4 000 ms dwell) and the reel's wheel constants are named constants in `HeroTerminal.tsx` and `src/hooks/useCollectionGesture.ts`; the tests assert them.
- The security gates fail closed in production. Keep them; configure Turnstile and Redis instead of bypassing them.
- Analytics load only after consent and only on `site.url`.

## 6. Search-and-replace checklist

Run `pnpm check:content` before publishing your version. It exits with a checklist while known placeholders remain; that is expected in the untouched template. It does not read private environment files or validate your credentials.

The project rotation and tool-discovery tests follow your configured titles, IDs, tools and toolkit categories, so the [worked project rename](first-portfolio.md#3-make-two-small-edits) needs no test edits. Other browser cases still check example-specific links or structure. Review those expectations when changing labels, IDs or whole sections; preserve rotation, keyboard, layout, motion and security checks. See [Tests](../tests/README.md#after-changing-the-example-content) before running the browser suite on your version.

Set `site.exampleContent` to `false` only after replacing Alex’s story and profile URLs. This removes the fictional-example header/footer notes, displays your configured social profiles and allows search indexing when demo mode is also off. Example profiles stay hidden while fictional content is enabled, and the example portfolio project links to this template's source. Replace that project link with your own repository when adapting the project story. Remove `example: true` from each credential once it represents your own qualification, and add a real verification URL where available. The footer credit is optional; the MIT licence notice must stay with redistributed source.

Also search the source for `Alex`, `Example`, `example.com`, `your-handle`, `Lisbon`, `Northwind`, `Harbourline` and `Porto`; every hit is a place that still refers to the fictional example.

### Toolkit and project detail layout

The toolkit explorer keeps the same frame when switching categories. It fits complete rows to the available viewport, then offers pages; phones show at most two rows. Edit `explorerCategories`, `marqueeRows` and `toolNotes` in `src/content/toolkit.tsx` together. Keep notes to about 25–35 words so the common note panel stays compact. The 20 tools are examples, not a recommendation to claim all of them. Keep only tools you can discuss from experience.

Project tool notes belong in `projects.ts`: `detail` explains their role in that project and `why` explains the choice. Put core build tools before optional integrations. An optional `label` gives a long tool name a shorter tile label; its full `name` still appears in the detail panel and accessible name. Overview diagrams use `journey`, `workflow` or `questions`; only a workflow draws connecting lines.
