# Contributing

Thanks for looking under the hood. Issues and small pull requests are welcome.

## Before you open a pull request

```bash
pnpm install --frozen-lockfile
pnpm check        # typecheck, lint, unit tests, production build
pnpm test:e2e     # Playwright, Chromium (run `npx playwright install chromium` once)
```

The same checks run in CI on every pull request.

## What fits here

- Fixes: a broken interaction, a layout problem at a viewport, an accessibility gap, a wrong or missing sentence in the docs.
- Small improvements that keep the starter easy to adopt: clearer configuration, a better default, a simpler customisation path.
- Tests for behaviour that matters (keyboard, reduced motion, the fail-closed security gates, booking time handling).

## What does not fit

- A content management system, a plugin system or a general-purpose framework. Content is code on purpose.
- Features that need a paid service to work at all. Every integration stays optional and the site must keep running with no environment variables.
- Changes that introduce a real person's identity. The example stays fictional (`Alex Example`); your own version lives in your repository.

## Conventions

- One change per pull request, with a short description of what and why.
- Commit messages in the form `type(scope): summary` (for example `fix(contact): keep the topic buttons at 44 px on phones`).
- Keep the existing file boundaries: identity in `src/config/site.ts`, content in `src/content/`, everything else in components and `src/lib/`. See `docs/architecture.md` for the invariants a change must keep.
- Measure text and layout changes at 1280×800 and 375×812 before you send them.

## Questions

Open an issue using the question template. For security concerns, see `SECURITY.md`.
