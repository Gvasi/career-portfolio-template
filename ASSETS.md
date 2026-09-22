# Bundled assets: origin, terms, replacement

The MIT licence in [LICENSE](LICENSE) covers the code, the developer documentation and the original placeholder material listed as such below. Third-party material keeps its own terms. Every family says where it came from and what to do with it.

## 1. Placeholder artwork (original, MIT)

Flat geometric illustrations in the site's palette, written as SVG and rendered with `sharp` for this template. No photograph, stock image or generated picture was used as a source or reference; no real person is depicted. You may keep, adapt or replace them.

| files | what they are |
|---|---|
| `public/images/career/{product-development,analytics,learning,operations,support}.webp` | one 1280×853 illustration per example career chapter |
| `public/images/projects/research-dashboard.png`, `retention-signals.png` | 1448×1086 covers for the two example projects (transparent background) |
| `public/images/projects/portfolio-preview.png` | a 1280×800 screenshot of this template's own home page, shown on the laptop composition |
| `public/animations/how-i-work/{translate,growth,ai,data,systems,momentum}.json` and `*-poster.webp` | six small Lottie animations (512×512, 30 fps, looping shape layers, hand-written JSON) and their still frames |
| `public/images/favicon.webp`, `public/apple-touch-icon.png`, `src/app/favicon.ico` | the "AE" monogram tile of the example person |
| `docs/images/template-home.jpg`, `template-project.jpg`, `template-mobile.jpg` | screenshots of this template's fictional demo; capture details in `docs/images/README.md` |
| `docs/images/social-preview.jpg` | repository share card made from the real home screenshot and the adjacent editable HTML layout |

## 2. Generated illustrations

These images are offered for reuse with the template. No claim of exclusive copyright in generated imagery is made. Replace them freely; the portrait represents an invented person.

| files | origin |
|---|---|
| `public/images/profile/portrait-source.png`, its `portrait-*.webp` derivatives, `public/images/profile/about-portrait.webp`, `src/assets/opengraph/portrait.png` | A generated editorial illustration of the fictional Alex. See [artwork notes](docs/artwork.md) for provenance and replacement guidance. Responsive sizes and the sharing portrait are encoded by `scripts/prepare-portrait.mjs`. |
| `public/images/projects/laptop-frame.webp` | A transparent 1448×1086 rendering (WebP, encoded from the original PNG) of an open laptop with an empty screen, produced from a text prompt with an image-generation tool during the original site's build and kept because it carries no identity. The site projects the screenshot onto it (`src/components/sections/Projects/ProjectArtwork.tsx`). It is offered with the rest of the template; no claim of exclusive copyright in a generated image is made. |

## 3. Sample document (original, fictional; MIT)

| files | origin |
|---|---|
| `public/documents/sample-cv.pdf` | a one-page CV for the fictional Alex Example, rendered from HTML with Chromium. Every employer, institution and certificate in it is invented. Replace it with your own CV. |

## 4. Inline vector art (code, MIT)

The *What moves me* cards (`src/components/sections/WhatMovesMe/*.tsx`), the project map objects and the process illustration on the About page are SVG written in the components for the original site; they are source code and ship under the MIT licence with it.

## 5. Tool marks (third-party trademarks)

The single-path marks in `src/content/toolkit.tsx` and `src/content/toolMarks.ts` (`BrandIcon`) are vector data from the [Simple Icons](https://simpleicons.org) project (CC0 1.0). The names and logos of OpenAI, Claude, Hugging Face, LangChain, n8n, FastAPI, React, Next.js, TypeScript, GitHub, Vercel, PostgreSQL, Supabase, Snowflake, Docker, AWS, Google Analytics, PostHog, Node.js, Tailwind CSS, Redis, Google Calendar, Gmail and Framer Motion remain trademarks of their owners: they are used only to refer to the tools, and each owner's brand guidelines apply to your use. Python, Power BI, Jira, Microsoft 365 and Power Automate are shown as neutral text tiles (`TextMark`) rather than redrawn logos. Nothing here is licensed to you under MIT beyond the rendering code.

## 6. Fonts

| files | terms |
|---|---|
| `src/assets/fonts/poppins-regular.ttf`, `poppins-bold.ttf` | Poppins by the Indian Type Foundry, SIL Open Font License 1.1 ([docs/licenses/OFL-Poppins.txt](docs/licenses/OFL-Poppins.txt)). Bundled unmodified so `src/app/opengraph-image.tsx` can draw the social preview at build time; the licence text travels with the files as the OFL requires. |
| Poppins and Fira Code through `next/font/google` (`src/app/layout.tsx`) | fetched at build time from Google Fonts (both OFL); not stored in this repository. |

## 7. Not bundled, on purpose

The original site's portraits, CV, certificates, employer imagery, project screenshots and chapter animations are not part of this template. Their place is taken by the material in sections 1–3, so that everything you download here is either original to the template or covered by a licence that allows redistribution.
