# State — 2026-09-15 (site split + leads funnel — pushed dev `923321b`)

## Current state
- **2026-09-15: SITE SPLIT + LEADS FUNNEL COMMITTED `923321b` + PUSHED to origin/dev** — (1) `/` = company page (app-dev studio, free consult/mockup + PRD RM 150), academy at `/academy`, `/academy/about`; SiteNav/Footer `variant: 'main'|'academy'` (login only on academy side). (2) Lead form on `/` (#start) → `POST /api/public/leads` (rate-limit + honeypot) → `Lead` table (migration `20260914064039_leads`, applied) → admin `/leads` triage page (filters, expand, status, notes). Full details in `.pi/memory.md` (Site split + Leads funnel entries). Verified: `pnpm -r typecheck` 7/7 ✅ lint ✅ frontend build 16 routes ✅ admin 18 ✅ format ✅ Lead table in dev DB ✅. User already tagged v0.1.5 (fetched during push).
- e2e-01 updated to `goto('/academy')` — NOT re-run. No live API probe yet (dev servers down) — worth a curl smoke of `/api/public/leads` + `/api/admin/leads` when servers come up.
- next-env.d.ts quote-flips (frontend+admin) left uncommitted (generator-owned cosmetic); reverted in tree.
- Prod: v0.1.4 + v0.1.5 tags exist; v0.1.5 does NOT include this split/funnel — next image tag (v0.1.6?) will.
- Dev servers were NOT running this session; verification via typecheck/lint/build/prerendered HTML + psql only.

## Next steps
1. Main-page content backlog (user hasn't picked yet): portfolio/showcase, testimonials, FAQ, WhatsApp CTA, engagement pricing bands — showcase + FAQ recommended next.
2. Live-server smoke of leads flow + e2e re-runs (user's call).
3. Phase B — simulation template library (LESSON-PLAN §11) + real-AI scene smoke.

## Blocked / waiting on
Nothing.
