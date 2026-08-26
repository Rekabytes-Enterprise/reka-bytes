# State — 2026-08-25 (PRD-04 planned · student redesign + gamification)

## Current state
PRD-04 written and approved: `docs/development/PRD-04.md` — "Soft Terminal" student-app reskin (rounded cards, pill buttons, floating sidebar, elevation) + light gamification (XpEvent ledger, shared level formula `T(n)=50·n·(n+1)`, UTC-day streaks from XpEvent∪BlockEvent, 10 derived badges with zero storage). All prior work (through PRD-03 + jotai refactor) remains done & verified: E2E 8/8 green.

## Next steps
1. **R1a** — tokens/radii/elevation in frontend globals.css @theme; Button/Badge/Card/Sidebar primitives; `:focus-visible` layering fix (loose end). Testids frozen.
2. **R1b** — reskin dashboard / learn / lesson-viewer blocks / quiz runner / profile.
3. **R2** — XpEvent migration (+ `pnpm --filter @reka-bytes/db generate` after migrate!), timestamp-preserving backfill script, pure fns in `shared/src/game/` + unit tests, DTO extension, award hooks (fire-and-forget, P2002 = no-op).
4. **R3** — dashboard widgets (level pill, XP bar, streak flame card), confetti celebrations (`canvas-confetti`, badge-diff via localStorage `rb-last-seen-badges`), profile badge grid, e2e-16-gamification.spec.
5. DESIGN.md amendments ride along R1/R3 (doc must describe shipped reality).

## Key decisions this session
- Badge unlocks stateless v1 (pure predicates over existing data); client-side diff for celebration UX.
- Inline-checks = 0 XP (anti-farm) but count toward streak activity.
- Reskin scope = student app only; landing/login/admin keep Terminal Editorial.
- No leaderboard at cohort size 5.

## Blocked / waiting on
Nothing. Phase B sims + "Vibe Coding Testing 6" regen + e2e-13 AI_MOCK verification stay queued behind PRD-04.
