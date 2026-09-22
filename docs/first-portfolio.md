# Your first portfolio

Start by running the example as it is. Then change a name and a project, see those edits on the page, and work through the rest at your own pace. Direct email is enough for a first version; you can add booking or analytics later.

## 1. Check your tools

You need [Git](https://git-scm.com/downloads), [Node.js](https://nodejs.org/en/download) and [pnpm](https://pnpm.io/installation), plus an editor for the TypeScript files. Use **Node 24 LTS** for this walkthrough; the declared minimum is Node 22.15. The walkthrough was checked on Windows with Node 24.19.0. Use pnpm **10.34.5**, the version declared in `package.json`.

If pnpm is not installed, one option after installing Node is:

```bash
npm install --global pnpm@10.34.5
```

Open a terminal and check:

```bash
git --version
node --version
pnpm --version
```

If a command is not found, finish that tool's installation and reopen the terminal before continuing. The pnpm command should print `10.34.5`.

## 2. Run your copy unchanged

On the template's GitHub page, choose **Use this template → Create a new repository**. Clone the repository you just created, replacing both names below with your own:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
pnpm install --frozen-lockfile
pnpm dev
```

Leave that terminal running and open `http://localhost:3000`. You should see Alex Example's fictional portfolio, including Home, About and Contact. If port 3000 is occupied, use the address printed in the terminal. Contact should offer direct email; you do not need an `.env.local` file or service credentials for this path. Press `Ctrl+C` in the terminal when you want to stop the server.

## 3. Make two small edits

Open `src/config/site.ts`. Inside the existing `site` object, replace these fields with your own details. For example:

```ts
name: 'Sam Rivera',
firstName: 'Sam',
monogram: 'SR',
```

Save and return to Home: the greeting should now say “Hi, I’m Sam”. This changes the shared identity, not Alex's entire story. Leave `exampleContent: true` while the rest is still fictional.

Next, find the entry with `id: 'research-dashboard'` in the `projects` array near the bottom of `src/content/projects.ts`. As a small practice edit, change just its displayed names:

```ts
id: 'research-dashboard',
story: STORIES['research-dashboard'],
title: 'Customer Insights',
shortName: 'Insights',
```

Keep the remaining fields in that entry. The project reel should now show **Customer Insights**; open it to see the same title in the dialog. Keeping the ID unchanged preserves the link to its existing story. The example description, illustration and tools are still fictional: replace those too when writing about your own work. The [project writing example](reuse.md#turn-a-project-into-a-story) explains the story fields.

**This rename needs no test edits.** The project rotation and tool-discovery tests read titles, IDs and tool lists from your content. They still check that selection works and every configured tool is reachable. Bigger changes, such as removing a section or changing link labels, can need corresponding test updates; see [the test guide](../tests/README.md#after-changing-the-example-content).

## 4. Replace the rest, or leave a section out

Follow the [customisation field map](customisation.md) for your role, location, public email, profiles, career, toolkit and page copy. Only claim experience and qualifications that are yours.

- Replace `public/images/profile/portrait-source.png` with your portrait, keeping the filename. Restart `pnpm dev` to generate its responsive sizes. Replace the separate About image at `public/images/profile/about-portrait.webp` too.
- Put your CV in `public/documents/`, for example `sam-rivera-cv.pdf`, and set `site.assets.cv` to `/documents/sam-rivera-cv.pdf`. Open the site's CV link to check the actual document.
- To omit a home section, remove its JSX and import from `src/app/page.tsx`. For example, remove `<TechStack />` and its `TechStack` import to leave out the toolkit. Then adapt tests for that section's intentional removal; keep checks for the interactions you retain. The [reuse guide](reuse.md#borrow-a-section) maps the components.
- Review every profile URL and project link. Remove unused entries from `socialRail`; do not leave placeholder accounts in a real portfolio.

Once the example story and profiles are replaced, set `site.exampleContent` to `false`. Remove `example: true` from credentials only when they describe your own qualifications. Leave `NEXT_PUBLIC_DEMO_MODE` unset for your real site. These switches affect fictional-content labels and indexing; they do not replace the content for you.

## 5. Check, then deploy

In another terminal in your project folder, run:

```bash
pnpm check:content
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
```

`check:content` reports known placeholders and missing configured assets. It is expected to fail while you are still adapting the example, and it cannot judge your claims, images or PDF for you. Investigate browser failures before updating expectations: changing your story should preserve the interactions you keep.

Open Home, About, Contact and Privacy, try the site with a keyboard and on a phone, and check the CV and every outward link. Then commit and push your changes to your own repository and follow the [numbered deployment steps](setup.md#deploying). The simplest published version uses your public email address and no service credentials.
