---
title: "I got tired of falling in love with startup names that were already taken — so I built Naamkaran"
published: false
description: "Brainstorm startup names with AI, check domain availability, and score brand uniqueness — before you commit to a name you'll regret."
tags: startup, sideproject, webdev, ai
cover_image: <!-- PRODUCT_IMAGE_URL -->
canonical_url:
---

![Naamkaran product screenshot](<!-- PRODUCT_IMAGE_URL -->)

You know the feeling.

You've been sketching wireframes for two weeks. The product finally makes sense. You grab coffee with your co-founder and someone says the magic words out loud — *that's* the name. You type it into a registrar. The `.com` is parked at $12,000. You try a `.io`. Taken. You search Twitter. A YC company from 2019 already owns the handle. Your cousin had the same idea in 2017.

Three weeks later you're in a rebrand you never planned.

Naming a company is supposed to be the fun part. In practice it's a scavenger hunt across registrars, search engines, social handles, and — if you're serious — trademark databases and company registries. Most of us only discover the dead ends *after* we've already told investors, designed a logo, and printed business cards.

I kept hitting this wall while building side projects. So I built **[Naamkaran](<!-- DEMO_URL -->)** — a name generator and viability checker that puts creativity and reality checks in the same workspace.

*Naamkaran* (नामकरण) is Hindi for "naming ceremony." The idea is simple: name your company **before** the domain registrar names your regret.

---

## The problem isn't coming up with names — it's knowing which ones are alive

Most naming tools stop at ideation. They'll spit out fifty clever portmanteaus and call it a day. That's useful for the first hour. It's useless for the moment you actually need to decide.

What you really need at decision time:

1. **Domain availability** across the TLDs you care about — without opening twelve registrar tabs
2. **Brand collision signals** — is someone already running a company, product, or campaign with this name?
3. **A way to compare finalists** — not vibes, but a score you can rank

The gap between "I like this name" and "I can register this name" is where weeks disappear.

---

## What Naamkaran does

Naamkaran is a split-pane workspace: a conversational **name generator** on the left and a live **viability panel** on the right. Every path through the tool ends in the same checks.

### Three ways to explore

**1. Manual viability check** — You already have a favorite. Type it in, optionally add a product category for sharper context, hit Check. Results stream in live.

**2. Generate names (ideas only)** — Pick a naming style, describe what you're building, and brainstorm freely. Click any suggestion to run a full analysis when you're ready. Great when you want maximum creative range.

**3. Smart pick** — Turn on Smart pick before you generate. Each candidate runs domain and brand checks automatically. Names below the bar are set aside; names scoring **60+** surface with their scores. The fastest route from product idea to an ownable shortlist.

### What "viable" means today

| Check | How it works |
|-------|--------------|
| **Domain availability** | RDAP (IANA bootstrap) with WHOIS fallback across common TLDs |
| **Brand uniqueness** | Gemini 2.5 Flash with Google Search grounding — exact name, name + category, similar spellings — with cited evidence |
| **Composite score** | 50% domain + 50% brand, streamed as checks complete |

This isn't legal clearance. But it catches the obvious collisions early — the parked domains, the well-funded competitor with the same name, the product that already owns page one of Google.

### Ten naming styles, not one generic prompt

Great names follow patterns. Naamkaran doesn't use a single "generate startup names" prompt. Each style encodes a different creative strategy:

- **Best fit** — let the model read your brief and mix approaches
- **Action phrase** — imperative + object (great for consumer apps)
- **Gen-Z** — short, vowel-forward, feed-native
- **Single word** — real English words chosen for evocation
- **Twisted word** — familiar words with ownable spelling
- **Minimal tech** — tight, terminal-aesthetic names for dev tools
- **Desi modern** — Indian-language roots in Roman script
- **Playful**, **Premium**, **Compound** — and more

Pick a lane, chat to refine ("shorter," "more Desi," "avoid hyphens"), and check when something clicks.

---

## Under the hood

Naamkaran is a Turborepo monorepo:

- **`apps/web`** — React Router static SPA on Firebase Hosting
- **`apps/functions`** — Firebase Cloud Functions with an `analyzeName` callable that runs domain and brand checks in parallel
- **`packages/shared`** — Zod schemas shared between web and functions

Checks run concurrently. Results stream to the UI so you're not staring at a blank panel while RDAP and grounded search do their work.

Bring-your-own-key (BYOK) is supported if you want to use your own Gemini API key.

---

## What's next — the checks naming actually needs

Domain + Google search gets you far. But if you're incorporating in India — or anywhere with a formal company registry — you need more.

Here's what's on the roadmap (and partially built behind a feature flag):

### Trademark checker

Search trademark databases for conflicting marks in relevant classes. Not a substitute for a lawyer, but enough to flag "this exact mark is already registered in Class 42" before you file.

### Registered company name checker (country-wise)

Cross-reference your candidate name against official company registries:

- **India first** — MCA (Ministry of Corporate Affairs) company master data via data.gov.in, with exact and partial match detection
- **More jurisdictions over time** — same pattern, country by country, as APIs and data sources allow

Registration checks are implemented in the backend but disabled until they're production-ready. When they ship, they'll fold into the same composite score so you get one place to answer: *can I actually use this name?*

---

## Try it

**[Open Naamkaran →](<!-- DEMO_URL -->)**

No account required. Open the workspace, type a name you're curious about, or turn Smart pick on and watch a scored shortlist build itself.

---

## Links

| | |
|---|---|
| **Live demo** | [<!-- DEMO_URL -->](<!-- DEMO_URL -->) |
| **GitHub** | [<!-- GITHUB_URL -->](<!-- GITHUB_URL -->) |
| **LinkedIn** | [<!-- LINKEDIN_URL -->](<!-- LINKEDIN_URL -->) |
| **Product Hunt** | [<!-- PRODUCT_HUNT_URL -->](<!-- PRODUCT_HUNT_URL -->) |

---

## Final thought

The best name is the one you can actually own — domain, search results, and eventually registry and trademark records.

Naamkaran exists to shrink the loop between "I love this name" and "yes, I can build on this." If you've ever lost a week to a name that was dead on arrival, I built this for you.

**[Start naming →](<!-- DEMO_URL -->)**

---

*Built by [<!-- YOUR_NAME -->](<!-- LINKEDIN_URL -->). Feedback, bug reports, and naming war stories welcome on [GitHub](<!-- GITHUB_URL -->).*
