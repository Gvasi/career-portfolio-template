# Security

If you find a vulnerability in this template, please report it privately rather than in a public issue.

- Email: contact@gvasilakopoulos.com
- Include the affected file or route, steps to reproduce, and the impact you see.
- Please use a minimal reproduction and keep live credentials out of the report. This is a community project with best-effort maintenance; there is no guaranteed response time.

## Scope

This repository: the pages, API routes, security gates (Turnstile verification, Redis rate limits, booking coordination) and the build tooling.

Deployments made by other people from this template, and the third-party services it can be configured to use (Google, Cloudflare, Upstash, PostHog), are outside this policy. Report problems with those to their owners.

## Design notes

- The site runs with no environment variables; every integration is opt-in.
- In production builds the contact routes refuse submissions when the bot check or the rate limit is not configured. Do not bypass them; configure them.
- Credentials are read only by server modules. `NEXT_PUBLIC_*` values are public configuration, including analytics identifiers and the demo flag; never put a secret in them.
