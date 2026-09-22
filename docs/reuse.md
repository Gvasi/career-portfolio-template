# Make it useful for your own site

You do not have to use the whole portfolio. Take a section, an animation, or the way a particular interaction works. This guide gives you a place to start.

The code is written for React and Next.js. The sections share styles, fonts and a few interaction helpers; they are not standalone packages you can paste into any site unchanged. If you already have a React site, start with one section on a test page and bring over its imports as you need them.

## Start with a small version

For a first portfolio, I would start with an introduction, one project you can explain well, and a way to contact you. Add the career story and toolkit when they tell the visitor something useful.

`src/app/page.tsx` is the home page's list of sections. Remove both the import and the JSX for a section you do not need. For example, remove `TechStack` and its wrapper to leave out the toolkit. Check for links to that section's anchor afterwards.

You can keep direct email as your only contact option. Change `site.contactEmail` in `src/config/site.ts` and leave the service variables empty. The site already handles this state; there is no need to set up a calendar, Redis or analytics just to introduce yourself.

## Make the terminal sound like you

Edit `codeStories` in `src/content/home.ts`. Each story has a tab title, filename, language, outcome phrase and short lines of display text.

For example, a data professional could replace one story with:

```ts
{
  title: 'Data',
  file: 'questions.sql',
  language: 'SQL',
  outcome: 'clearer answers.',
  lines: [
    'SELECT question, evidence, next_step',
    'FROM this_weeks_work',
    "WHERE useful_to_someone = true;",
  ],
}
```

These lines are displayed, not executed. They can be playful, but should still say something about you. Keep them short enough to read on a phone; the hero sentence ends with `outcome`, so read the two together.

If the terminal does not suit your work, remove the `HeroTerminal` import and `.sg-terminal-slot` element from `src/components/sections/Hero/Hero.tsx`. Then adjust the corresponding grid rules in `hero.css`—removing the component alone leaves the space reserved for it. A short written introduction or one piece of work can take its place.

## Turn a project into a story

Start with one entry in `src/content/projects.ts` and its matching story. The three tabs answer different questions:

| Part | What to tell the visitor | A useful starting sentence |
|---|---|---|
| Overview | What it does and who it helps | “A dashboard that helps a support team spot a growing queue.” |
| Decisions | One choice you made and the trade-off | “I kept the first version to three measures so the team could agree what to act on.” |
| Stack | What each tool contributes to this project | “SQL prepares the daily queue totals so every chart uses the same definition.” |

Use a real screenshot when you have one. An illustration is fine for a concept; label the status clearly and explain what is planned. Keep the `id` unique, and update the artwork path, alternative text and destination links together.

The overview expects three map parts. Decisions and tools can vary in number. Keep at least one project if you retain the section; remove the whole section if you have nothing to show yet.

## Borrow a section

Paths below are relative to the repository. Read each component's imports as you copy it; the “bring along” column lists the main shared pieces, not a promise that a single file is sufficient.

| What you want | Start here | Bring along or adapt |
|---|---|---|
| Greeting and code-story terminal | `src/components/sections/Hero/` | `src/config/site.ts`, the `hero` and `codeStories` content, `src/hooks/useMotionActivity.ts`, `src/lib/selectionMotion.ts`, portrait assets and `scripts/prepare-portrait.mjs` |
| Interactive mindset cards | `src/components/sections/WhatMovesMe/` | The folder's artwork and CSS, `SelectionPanel`, motion helpers and the words embedded in the cards |
| Chapter reader with small animations | `src/components/sections/HowIWork/` | The chapter content in `src/content/home.ts`, motion helpers, its CSS modules and `public/animations/how-i-work/` |
| Project reel and case-study dialog | `src/components/sections/Projects/` | `src/content/projects.ts`, `InteractiveDialog`, `useCollectionGesture`, motion helpers, project assets and the shared tool marks |
| Toolkit explorer | `src/components/sections/TechStack/` | `src/content/toolkit.tsx`, `src/content/toolMarks.ts`, `InteractiveDialog`, motion helpers, the folder's `tech-stack.css`, and shared dialog rules and tokens in `globals.css` |
| Career timeline or credentials | `src/components/sections/about/` | `src/content/career.ts`, the relevant CSS modules, career images and the shared gesture and motion helpers |
| Rotating closing invitation | `src/components/sections/Cta/` | `closingPhrases` in `src/content/home.ts`, `site` for the accessible label, the two hooks and `Cta.module.css` in that folder, plus shared font and colour tokens. Change its contact destination to yours |

The closing invitation is a smaller place to start than the full project reel. For a standalone animation, the next section is smaller still.

When moving a section to an existing site:

1. Keep your own page layout. Render the section inside it before changing its behaviour.
2. Resolve its `@/` imports. This template maps `@/` to `src/`; your app may use another alias.
3. Bring over the relevant CSS rules and variables, or map them to your own design tokens. Do not replace an existing app's entire global stylesheet.
4. Keep the fonts or choose your own, then check wrapping again. Some panels reserve space based on their longest text.
5. Keep keyboard controls, focus handling and reduced-motion behaviour with the visual effect. Try it on a phone before adding another section.

Some sections import the optional `trackEvent` helper. In another app, use your own consent-aware tracking or remove that call and its import. Copying a visual interaction does not require adopting this template's analytics or contact services.

## Borrow an animation

The six chapter animations are in `public/animations/how-i-work/`. Each `.json` file has a matching `-poster.webp` still image. You can reuse those assets with a Lottie player; asset terms are in [ASSETS.md](../ASSETS.md).

For the existing React behaviour, start with `SectionAccent.tsx` and `SectionAccent.module.css` in `src/components/sections/HowIWork/`. The `artwork` map chooses the file, speed and position for each chapter. It uses `useMotionActivity` to pause work offscreen and shows a still frame when the visitor prefers less motion.

Keep the still image. The animation should add character without making someone wait for the information. If you replace a JSON file, replace its poster too.

For the smaller interface transitions, look at `src/lib/selectionMotion.ts`. For offscreen and reduced-motion handling, look at `src/hooks/useMotionActivity.ts` and `src/components/layout/MotionPreferences.tsx`. These are useful patterns to adapt even if you do not keep any of the page design.

## Keep the useful parts, remove the rest

- **A smaller toolkit is fine.** Keep tools you can explain from experience. Update `techStack`, `marqueeRows`, `explorerCategories` and `toolNotes` together in `src/content/toolkit.tsx`.
- **Use your own project reasoning.** The sample decisions are examples of the format. One specific choice from your work is more useful than a polished sentence that could belong to anyone.
- **Let the reader stop early.** A clear overview should work on its own; details and interactions are there for someone who wants to explore further.
- **Check your longest content.** A long surname, job title or tool description will find layout problems that the example copy does not.
- **Check the links and the PDF.** The contact address, social profiles, project destinations and sample CV all need your attention before publishing.

Run `pnpm check:content`, then use the checklist in [customisation.md](customisation.md). Project rotation and tool-discovery tests follow your configured content. Other cases still include example-specific links or structure; review those expectations when adapting a section, while keeping checks for layout, focus and interaction behaviour. The [test guide](../tests/README.md#after-changing-the-example-content) explains the distinction.

## Share what you made

If you build something with this, you are welcome to open an issue with a link or a screenshot. Mention which part helped, or where the setup was unclear. That is useful feedback even if your site ends up looking completely different.

You can remove the visible creator credit. Keep the MIT licence notice with redistributed source, and check [ASSETS.md](../ASSETS.md) before reusing third-party marks. If the template saved you some work, a star helps other people find it.
