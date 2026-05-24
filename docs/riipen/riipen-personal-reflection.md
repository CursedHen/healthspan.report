# Personal Reflection — Healthspan Report

**Student:** Ali Al Hadi Arzouni
**Project window:** March 6, 2026 – April 30, 2026
**Total hours logged:** 60

## Project Overview and My Role

Healthspan Report is a healthspan-focused news and research publication built on Next.js 16, React 19, TypeScript, Tailwind, and Supabase, with an automated RSS ingestion pipeline that pulls from articles, video channels, podcasts, and research feeds. When I joined the team, the product was in the middle of a strategic repositioning — moving from a "wellness service" feel toward a credible editorial publication. My role was a frontend / full-stack contributor, working primarily on the design-aligned UI rebuild, the appearance and theme system, and the user-facing settings flow. By the end of the project I had also taken on resilience polish (thumbnail fallback hardening, lint clean-up) and the contributor handoff documentation.

## What I Actually Did

The bulk of my hours went into translating Figma wireframes into production code, one route at a time, in vertical slices. I started with the auth pages — login, signup, forgot password, reset password — because they were the most visually outdated. From there I moved into the homepage, where the team had decided to lead with a media-first feed and editorial sections (Latest, Most Discussed, Research Watch) instead of marketing-style hero claims. The articles and videos pages followed, with a lead-story-plus-latest-coverage layout.

Once the public surface was reasonably aligned, I moved into the appearance system: a theme toggle that supports light, dark, and system modes, with dark mode set as the product default. This required threading CSS variables through `globals.css` so that every component flipped cleanly without per-component overrides. I integrated the toggle into both the desktop header and the mobile menu, and worked through a long tail of mobile alignment issues — theme button placement, logo alignment, header spacing — that only surfaced once the toggle was live on small viewports.

The largest single feature I contributed was the settings page. This included theme switching (mirroring the global toggle), placeholders for font family and language preferences, an account information management form, and a password-change flow that calls back into Supabase auth. Because settings sit behind authentication, I also had to make sure the user-menu icons and visibility of the settings affordance behaved correctly when signed in versus signed out.

Toward the end of the window I picked up smaller but high-leverage tasks: hardening thumbnail fallback to local placeholders so broken external images never broke the card grid, resolving lint blockers after a homepage merge, and writing the next-contributor handoff doc that captures the current state of the branch, the file map, the runbook, and the known issues to inherit.

## Challenges and How I Worked Through Them

The hardest challenges were not technical in isolation — they were *systemic*. Touching the homepage meant respecting the RSS pipeline's normalized data shape; redesigning auth pages meant not breaking the email-confirmation callback; introducing a global theme system meant auditing every component that had hardcoded colors. I learned to treat the existing code as a contract and to make changes that were small enough to ship as vertical slices, not so large that they fought the rest of the team's in-flight work.

A second challenge was a type drift I discovered between `types/rss.ts` and `types/database.ts` for the `RSSContentType` union (`"research"` was supported in one and not the other). Rather than fix it under time pressure and risk silent regressions in ingestion, I documented it in the handoff doc as a clearly-scoped follow-up. That decision — to flag rather than fix — was harder than it sounds, but I think it was correct: it preserved trust with the next contributor and avoided shipping a partial fix.

## Alignment with My Learning Goals

I came into this project wanting to get real reps on production frontend work — Next.js App Router, CSS modules with design tokens, and the kind of cross-cutting concerns (theming, auth, content) that toy projects don't have. I got all of that, plus a deep lesson in *design engineering*: working from Figma frames into code in tight loops, using design tokens as the contract between the two, and resisting the temptation to deviate from the wireframes when implementation was easier.

## Key Takeaways

The biggest takeaway is that on a live product, the right unit of work is the *vertical slice*, and the right unit of communication is the *handoff doc*. The Figma↔code roundtrip taught me that design and engineering are the same job at the seams. And working around an active RSS ingestion system taught me that respecting an existing contract is often more valuable than rewriting it. I leave the project with sharper instincts for shipping carefully on shared codebases — instincts I expect to use immediately in any future product engineering role.
