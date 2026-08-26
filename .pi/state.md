# State — 2026-08-25 (PRD-04 shipped · E2E 22/22 green)

## Current state
PRD-04 fully shipped:
- **R1 — Soft Terminal reskin**: tokens (radius/elevation), primitives (Button/StatusBadge/Card/Field), floating sidebar, rounded blocks (callout/key-terms/comparison/steps/recap/inline-check/mermaid), pill quiz & lesson nav. DESIGN.md §5a.
- **R2 — Data layer**: XpEvent migration, idempotent timestamp-preserving backfill, pure-fn game module (levels/streaks/badges/profile) + 22/22 unit tests via `tsx --test`. learn.service award hooks fire-and-forget from completeLesson, checkInlineAnswer auto-complete, submitQuiz. LearnDashboardDTO gains `game` + `quizAvgScore`.
- **R3 — Game UI**: LevelPill, XpBar, StreakCard, QuizAvgCard, BadgeGrid, LevelRing, XpToastHost (canvas-confetti + badge-diff via localStorage), profile page rewrite. DESIGN.md §5b. e2e-16 covers the full loop.

Verified: pnpm -r typecheck ✅ · lint ✅ · admin+frontend builds ✅ · **E2E 22/22 green** (e2e-01..15 unchanged + new e2e-16). Three phase commits on top of the initial commit.

## Next steps
1. **Phase B** — simulation template library (`docs/development/LESSON-PLAN.md` §11).
2. One real-AI WriteLesson smoke (`packages/backend/scripts/ai-smoke.ts`) to validate v3 schema on the live model.
3. Re-run interrupted real generation ("Vibe Coding Testing 6") if user asks.

## Key decisions this session
- Badge unlocks stateless v1 (pure predicates over existing data); client-side diff for celebration UX.
- Inline-checks = 0 XP (anti-farm) but count toward streak activity.
- Reskin scope = student app only; landing/login/admin keep Terminal Editorial.
- No leaderboard at cohort size 5.
- Game `useBadgeDiff` takes `enabled: boolean` to skip effects while data loads (avoids first-load false-diffs that spam toasts).
- Hook order: dashboard calls `useBadgeDiff` before any early returns (rules-of-hooks).

## Blocked / waiting on
Nothing.