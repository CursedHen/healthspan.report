# Healthspan Report — Technical Overview

**Student:** Ali Al Hadi Arzouni
**Project window:** March 6, 2026 – April 30, 2026

## Stack at a Glance

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI runtime | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + CSS Modules + global CSS variables |
| State | Zustand |
| Auth + DB | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Content ingestion | Custom RSS pipeline using `rss-parser` + custom YouTube parser |
| Hosting | Vercel (with cron-driven ingestion) |

The codebase is organized into the standard Next.js App Router shape: `app/` for routes and route handlers, `components/` for shared UI broken into `articles`, `comments`, `layout`, `navigation`, `sections`, `topics`, `ui`, `videos`, plus `lib/` for server logic (RSS, content, topics, actions) and `utils/supabase/` for Supabase client/server entry points.

## Architecture I Worked Across

### 1. Routing & Page Surface

The App Router holds the public editorial routes (`/`, `/articles`, `/videos`, `/topics`, `/research`, `/about`, `/search`) and the authenticated routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/check-email`, `/settings`). Most of my work touched the public route shells and the authenticated settings flow.

### 2. RSS / Content Pipeline

The content layer is a three-tier fallback:

1. **DB-first** — `app/api/rss/items/route.ts` serves persisted normalized items.
2. **Cache** — `app/api/rss/route.ts` falls back to a cache layer when DB is unavailable.
3. **Direct feed** — last-resort live fetch using `lib/rss/rssFetcher.ts` and `lib/rss/youtubeParser.ts`.

Sources are seeded from `data/feeds.json` via `app/api/rss/seed/route.ts` and ingested via `app/api/rss/ingest/route.ts` (cron-secured for production). Operational visibility is exposed by `app/api/rss/status/route.ts`. I did not redesign this pipeline, but I had to *respect* it on every UI change, because cards, thumbnails, and feed sections all bind to the normalized RSS shape it produces.

### 3. Auth & User Flows

Authentication uses Supabase SSR. I worked on the visual layer of `app/login`, `app/signup`, `app/forgot-password`, `app/reset-password`, and built into `app/settings` the password-change form (which calls back into Supabase auth). The email verification callback route (`app/api/auth/confirm/route.ts`) was the integration point for signup confirmations.

### 4. Theme System

The appearance toggle lives in `components/ui/ThemeToggle.tsx` (+ matching CSS module) and is integrated into `components/layout/Header.tsx` and `components/layout/MobileMenu.tsx`. Tokens are driven through CSS variables in `app/globals.css` so dark, light, and system-following modes flip cleanly without re-rendering trees.

### 5. Design System & Tokens

`app/globals.css` holds the canonical color palette, spacing scale, and typography tokens. A significant share of the work was rewriting hardcoded `px`/`rem` values into named variables so that further Figma iterations could be applied centrally rather than per-component.

## Modules I Touched (with rationale)

| Path | Why I touched it |
|---|---|
| `app/page.tsx`, `app/page.module.css` | Homepage media-first feed + section layout |
| `app/articles/page.tsx`, `app/articles/page.module.css` | Lead-story + latest coverage layout |
| `app/videos/`, `app/topics/`, `app/research/`, `app/about/` | Typography and spacing unification |
| `app/login`, `app/signup`, `app/forgot-password`, `app/reset-password` | Figma-aligned auth pages |
| `app/settings/page.tsx`, `app/settings/page.module.css` | New settings surface (theme, account info, password) |
| `app/search/` | Search route and result composition |
| `components/layout/Header.tsx`, `components/layout/MobileMenu.tsx` | Theme toggle integration, navigation polish |
| `components/layout/Footer.tsx`, `components/layout/Footer.module.css` | Footer redesign + form proportions |
| `components/ui/ThemeToggle.tsx` | Appearance system implementation |
| `components/articles/`, `components/videos/` | Card layouts, thumbnail fallback, edit affordances |
| `app/globals.css` | Design tokens, color variables, dark-mode-default |

## Engineering Practices I Followed

- **Vertical-slice delivery.** Each PR shipped one route or one feature end-to-end (e.g., "auth pages aligned with Figma", "homepage media-first feed", "settings page with theme switcher"). This was explicit in the gameplan — generate one route at a time rather than a full-site rewrite.
- **CSS variables over hardcoded values.** Replaced one-off `px`/`rem` constants with tokens from `globals.css` so future Figma updates could be applied centrally.
- **Defensive rendering.** Hardened thumbnail fallbacks to local placeholders so a broken external image never breaks the card grid.
- **Type-driven data flow.** Surfaced a known type drift between `types/rss.ts` (`"article" | "video" | "topic" | "research"`) and `types/database.ts` (`"article" | "video" | "topic"`) and flagged it in the handoff doc as a follow-up so the next contributor could decide whether to extend or normalize.
- **Lint-clean merges.** After homepage merges from teammate branches, I ran the lint pass and resolved blockers before the changes hit `main` (visible in the commit history).

## Known Risks / Follow-Ups Documented

These are captured in `docs/handoff-next-contributor.md` so the next contributor can pick them up cleanly:

1. `RSSContentType` mismatch between `types/rss.ts` and `types/database.ts`.
2. Mojibake character (`â†`) in `app/forgot-password/page.tsx` back-arrow text.
3. Missing `.env.example` to make onboarding faster.
4. Local `main` branch can lag behind `origin/main` if not frequently fetched.

## Local Runbook (for reproducibility)

```bash
npm install
npm run dev             # http://localhost:3000
npm run lint
# Verify content layer:
curl http://localhost:3000/api/rss?type=article
curl http://localhost:3000/api/rss/status
# Trigger seed/ingestion in dev:
curl -X POST http://localhost:3000/api/rss/seed
curl -X POST http://localhost:3000/api/rss/ingest
```

Required env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`.
