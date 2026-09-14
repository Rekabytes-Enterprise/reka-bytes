# State — 2026-09-15 (site split + leads funnel — UNCOMMITTED)

## Current state
- **2026-09-15: SITE SPLIT + LEADS FUNNEL SHIPPED, UNCOMMITTED (working tree dirty, no commit yet)** — (1) `/` = company page (app-dev studio, free consult/mockup + PRD RM 150), academy at `/academy`, `/academy/about`; SiteNav/Footer `variant: 'main'|'academy'` (login only on academy side). (2) Lead form on `/` (#start) → `POST /api/public/leads` (rate-limit + honeypot) → `Lead` table (migration `20260914064039_leads`, applied) → admin `/leads` triage page (filters, expand, status, notes). Full details in `.pi/memory.md` (Site split + Leads funnel entries). Verified: `pnpm -r typecheck` 7/7 ✅ lint ✅ frontend build 16 routes ✅ admin 18 ✅ format ✅ Lead table in dev DB ✅.
- e2e-01 updated to `goto('/academy')` — NOT re-run. No live API probe yet (dev servers down) — worth a curl smoke of `/api/public/leads` + `/api/admin/leads` when servers come up.
- `next-env.d.ts` shows a benign Next-owned diff after build (routes.d.ts import path) — leave it.
- Prod tag v0.1.5 still pending (user pushes tag when ready — scenes + quiz resilience + legal force-dynamic + this split + leads all ride the next image).
- Dev servers were NOT running this session; verification via typecheck/lint/build/prerendered HTML + psql only.

## Next steps
1. User: review + commit (say the word). Consider a real-AI + live-server smoke of the leads flow when dev servers are up.
2. Main-page content backlog (user hasn't picked yet): portfolio/showcase, testimonials, FAQ, WhatsApp CTA, engagement pricing examples.
3. Phase B — simulation template library (LESSON-PLAN §11) + real-AI scene smoke + e2e re-runs (user's call).

## Blocked / waiting on
Nothing.
