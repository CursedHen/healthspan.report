# Healthspan Report — General Overview

**Student:** Ali Al Hadi Arzouni
**Program:** Riipen Level UP
**Project window:** March 6, 2026 – April 30, 2026
**Total hours logged:** 60

## What the Project Is

Healthspan Report is a healthspan-focused news and research publication. The product aggregates editorial articles, research summaries, podcasts, and videos from a curated network of high-authority sources, and presents them in an editorial-first layout — closer in feel to a modern publication like *The Verge* or *Stat News* than to a wellness service or consumer app.

The product runs on a Next.js + Supabase stack and combines an automated RSS ingestion pipeline (covering articles, video channels, podcasts, and research feeds) with a lightweight editorial moderation surface, giving the team the ability to curate and quality-control content without manually authoring every story.

## Why It Exists

The original site read like a "health service" funnel — signup-forward, marketing-heavy, light on editorial content. The strategic objective during this project window was to **reposition the product** into a credible publication by:

- Leading with stories, not signup CTAs.
- Surfacing source attribution, evidence level, and read time for every card.
- Adding newsroom patterns: Latest, Most Discussed, Explainers, Research Watch.
- Moving account actions to a utility position rather than the hero.
- Aligning every page with a freshly designed Figma wireframe library.

The repositioning is documented in `docs/healthspan-ui-repositioning-gameplan.md` and was the north star for almost every UI change during my window on the project.

## My Role

I joined as a frontend / full-stack contributor working under the team that owned the design-aligned UI rebuild and the user-facing account features. Across the project I owned or co-owned:

- **Figma-to-code execution** for the homepage, articles, videos, footer, and auth pages, working from prototype frames into production CSS modules and React components.
- **Theme system implementation** — dark mode as default, light/system options, persistent preferences, and clean integration into both desktop and mobile navigation.
- **Settings surface** — a new authenticated settings page with theme switching, font and language placeholders, account information management, and password change flow.
- **Resilience polish** — thumbnail fallback hardening, lint blocker cleanup after homepage merges, and mobile alignment fixes across pages.
- **Search experience** scaffolding alongside homepage edit affordances for authenticated users.
- **Handoff documentation** so the next contributor could come up to speed quickly on environment setup, key files, and known issues.

## Outcomes

By the end of the project window:

- All public routes (homepage, articles, videos, topics, research, about) had been brought into visual and typographic alignment with the new Figma wireframes.
- A complete authenticated settings flow shipped, including password change.
- Dark mode became the product default and the theme toggle worked consistently across desktop and mobile.
- The next contributor was handed a clean branch with documented setup, runbook, and a prioritized list of follow-up work in `docs/handoff-next-contributor.md`.

## Why This Project Mattered to Me

Repositioning a live product is fundamentally different from greenfield work. Every change had to respect existing data flows (the RSS pipeline, Supabase auth) while still moving the product visually and structurally toward a very different identity. This forced me to think hard about *layered change* — designing UI work that could ship in vertical slices, one route at a time, without breaking ingestion, auth, or admin flows that other contributors were simultaneously evolving.
