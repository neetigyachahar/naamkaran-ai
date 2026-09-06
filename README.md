# Naamkaran

Turborepo monorepo for the name viability checker (`naamkaran-407d7`).

**Live:** [naamkaran-ai.web.app](https://naamkaran-ai.web.app) · **Blog:** [I got tired of falling in love with product names that were already taken — so I built Naamkaran](https://dev.to/neetigyachahar/i-got-tired-of-falling-in-love-with-product-names-that-were-already-taken-so-i-built-naamkaran-3gmk)

## Screenshots

**Workspace** — generate names and run viability checks side by side.

![Naamkaran workspace](assets/naamkaran-ai.png)

**Smart pick** — generate and validate names in one flow.

![Naamkaran Smart pick](assets/naamkaran-ai-smart-pick.png)

## Apps

- `apps/web` — React Router (static SPA) hosted on Firebase Hosting
- `apps/functions` — Firebase Cloud Functions (TypeScript) with `analyzeName` callable, powered by free [OpenRouter](https://openrouter.ai) models
- `packages/shared` — Zod schemas shared between web and functions

## Getting started

```bash
bun install
bun run build
```

### Environment

**Functions** (Firebase Secret Manager):

```bash
# Get a key at https://openrouter.ai/keys
firebase functions:secrets:set OPENROUTER_API_KEY
# Only needed when registration checks are enabled:
firebase functions:secrets:set DATA_GOV_IN_API_KEY
```

Users can also bring their own OpenRouter key (BYOK) from the app header. The
model defaults to free `:free` models (e.g. `minimax/minimax-m3:free`); note
that OpenRouter's web-search step for brand checks bills a small per-query cost
to whichever key is used, even when the model itself is free.

**Web** — copy `apps/web/.env.example` to `apps/web/.env` and fill in Firebase config from the console.

For local emulators, set `VITE_USE_FIREBASE_EMULATOR=true`.

## Development

```bash
# Terminal 1: Firebase emulators (functions + hosting)
bun run emulators

# Terminal 2: Web dev server
bun run dev --filter=web
```

## Deploy

```bash
bun run deploy
```

## Architecture

`analyzeName` runs checks in parallel:

1. **Domain** — RDAP (IANA bootstrap) with WHOIS fallback
2. **Brand uniqueness** — a free OpenRouter model grounded with OpenRouter's web-search plugin (multi-angle search, cited sources)

Composite score: domain 35% + brand 35% + MCA name forms 30%.

**Registration checks** (MCA company-name forms via data.gov.in) are enabled via
`REGISTRATION_CHECK_ENABLED` in `apps/functions/src/config/features.ts`.
