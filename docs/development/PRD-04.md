# PRD-04 — Student App Redesign ("Soft Terminal") + Light Gamification

> **Prerequisite**: Read `PRD.md`, `DESIGN.md`, `PRD-02.md`, and `PRD-03.md` first. This document plans the next work cycle: a full visual redesign of the student-facing frontend (rounded, modern, sleek — away from sharp blueprint corners) plus a light-touch gamification layer (XP, levels, streaks, badges).
>
> **Status**: Plan v1 (approved direction, not yet implemented)
> **Ground rule**: Anything that requires a BAML change remains **deferred** (see §9). Admin app and landing/auth pages are out of scope for the reskin (§1).

---

## 1. Overview

Two interleaved workstreams, ordered so the design system lands before the game UI sits on top of it:

1. **R1 — Soft Terminal reskin** — keep the brand DNA (acid lime, Clash Display, JetBrains Mono, dark canvas) and swap the _geometry_: hairline-divided flat sections become elevated rounded cards; square buttons become pills; the sidebar becomes a floating rail with pill nav items.
2. **R2/R3 — Light gamification** — an append-only XP ledger, derived levels/streaks/badges (no unlock storage in v1), celebration moments (confetti, "+50 XP" pops), and always-visible momentum UI (level pill, XP bar, streak card).

**Concept**: _"progress you can feel"_ — three pillars:

- **Momentum** — XP bar + level chip always visible; every action visibly moves something.
- **Celebration** — lesson complete, quiz pass, module finish each get a satisfying moment.
- **Collection** — badge grid with locked silhouettes; FOMO without pressure.

**Scope**: student frontend (`packages/frontend`) + backend read/write endpoints for gamification data. **Not in scope**: landing `/`, `/login`, `/register` (stay Terminal Editorial for now), admin app, BAML pipeline.

**Non-goals this cycle**: BAML/prompt changes, drip release, quiz gating _enforcement_ (stays advisory), avatar uploads/customization, sound effects, leaderboards.

---

## 2. Design direction — Soft Terminal

### 2.1 What stays

Palette (all HEX tokens), font stack (Clash Display / Inter / JetBrains Mono), mono uppercase labels, acid-lime accent discipline (≤20% viewport), 8px spacing scale, dark-first.

### 2.2 Radius scale (new tokens in `globals.css @theme`)

| Token         | Value          | Applies to                               |
| ------------- | -------------- | ---------------------------------------- |
| `--radius-sm` | 10px           | inputs, badges, code blocks              |
| `--radius-md` | 14px           | ghost buttons, inner panels, module rows |
| `--radius-lg` | 20px           | cards, modals, drawers                   |
| `pill`        | `rounded-full` | primary buttons, nav items, chips        |

Tailwind v4 generates `rounded-sm/md/lg` utilities from these `@theme` tokens automatically.

### 2.3 Elevation system

- Layered surfaces: `canvas` → `elevated` → subtle top-highlight (`inset 0 1px 0 rgba(255,255,255,.04)`).
- Cards: `bg-elevated` + 1px `border-line` + `rounded-lg`; hover = border brightens toward `line-strong` + lift (`translateY(-2px)`) + soft ambient shadow.
- Optional accent glow utility: radial lime at ~8% opacity behind hero/CTA cards only (used to signal _achievement_, not everywhere).

### 2.4 Component language changes

| Element        | Today                     | Becomes                                                                                       |
| -------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| Cards          | square box, hairline only | `rounded-lg` bordered card, hover lift + brighter border                                      |
| Button primary | square, mono uppercase    | **pill**, accent fill, fill-sweep hover retained                                              |
| Button ghost   | square bordered           | `rounded-md`; new `variant="danger"` styling consistent                                       |
| Sidebar nav    | left-border active stripe | floating rail, **pill-shaped active item** (lime-tinted bg); mobile drawer gets backdrop-blur |
| Badges         | square dot+mono           | pill badges, semantic color at 12% alpha bg                                                   |
| Inputs         | inset square              | `rounded-sm`, focus ring unchanged                                                            |
| Code blocks    | square                    | `rounded-sm` (round code looks wrong — deliberate exception)                                  |

**Testids are untouchable** — the E2E suite keys off them; reskin is className-level only.

### 2.5 Ride-along fix

Frontend `:focus-visible` rule is unlayered (known loose end — beats Tailwind utilities → double rings). Move into `@layer base` while in `globals.css`, mirroring the admin fix.

---

## 3. Gamification mechanics

### 3.1 XP ledger

New append-only model **`XpEvent`** (same philosophy as `BlockEvent`):

```prisma
model XpEvent {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount    Int
  reason    String   // LESSON_COMPLETED | MODULE_COMPLETED | CLASS_COMPLETED | QUIZ_PASSED | PERFECT_QUIZ
  refId     String?
  createdAt DateTime @default(now())

  @@unique([userId, reason, refId]) // idempotent awards
  @@index([userId, createdAt])
}
```

Balance = sum of amounts. **Never decrement** — no penalty mechanics, ever.

### 3.2 Award table

| Event                             | XP             | Anti-farm rule                                                                               |
| --------------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| Lesson completed (auto or manual) | **50**         | unique per lesson per user (`@@unique`)                                                      |
| Module fully completed            | **+100 bonus** | once per module                                                                              |
| Class fully completed             | **+250 bonus** | once per class                                                                               |
| Quiz passed                       | **100**        | first passing attempt only (best attempt wins nothing extra later)                           |
| Perfect quiz (100%)               | **+50 bonus**  | once per quiz                                                                                |
| Inline-check answered             | **0 XP**       | practice ≠ performance; prevents re-answer farming — but counts toward daily streak activity |

Award inserts happen inside the existing lesson-complete / quiz-submit paths as **fire-and-forget** (like BlockEvent), catching unique-violations (`P2002`) as silent no-ops. Never blocks or fails the parent action.

**Worked pacing example** (sanity check): a 5-lesson module ≈ 5×50 + 100 = 350 XP → level 2 mid-module; a 20-lesson class ≈ 1000 + 4×100 module bonuses + quiz bonuses ≈ 1900 XP → ~level 4. One cohort ≈ one satisfying progression arc.

### 3.3 Levels — pure function in `shared`

Cumulative threshold to **reach** level _n_: `T(n) = 50 · n · (n+1)` → L1 @0, L2 @300, L3 @600, L4 @1000, L5 @1500, L6 @2100…

```ts
// shared/src/game/levels.ts
export function levelForXp(xp: number): { level: number; intoLevel: number; forNextLevel: number };
```

Same function powers backend DTO and frontend progress bars — single source of truth, unit-tested.

### 3.4 Streaks — computed, not stored

Distinct **UTC dates** (v1 caveat) across `XpEvent.createdAt ∪ BlockEvent.createdAt` for the user:

- `current`: consecutive days ending today, **or** yesterday (grace: yesterday's activity keeps the streak visually alive until the day ends).
- `longest`: max historical run.
- `activeToday`: boolean → drives the streak card's dim/flame-lit state.

No table needed; cheap indexed queries at cohort scale.

### 3.5 Badge catalog v1 — all derived, zero storage

Every badge is a **pure predicate over existing data** (LessonProgress, QuizAttempt, BlockEvent, activity days). Evaluated server-side on dashboard/profile fetch; no unlock rows in v1.

| Key               | Name            | Unlocked when…                                    | Source                      |
| ----------------- | --------------- | ------------------------------------------------- | --------------------------- |
| `first-steps`     | First Steps     | ≥1 completed lesson                               | LessonProgress              |
| `module-slayer`   | Module Slayer   | every lesson of any module complete               | LessonProgress              |
| `class-conqueror` | Class Conqueror | every lesson of any published class complete      | LessonProgress              |
| `halfway-there`   | Halfway There   | ≥50% of any class complete                        | LessonProgress              |
| `sharp-shooter`   | Sharp Shooter   | ≥10 correct inline-checks total                   | BlockEvent (`correct=true`) |
| `perfect-run`     | Perfect Run     | any quiz attempt scored 100                       | QuizAttempt                 |
| `quiz-champion`   | Quiz Champion   | ≥5 distinct quizzes passed                        | QuizAttempt                 |
| `week-warrior`    | Week Warrior    | longest streak ≥ 7 days                           | derived (§3.4)              |
| `fortnight-flow`  | Fortnight Flow  | longest streak ≥ 14 days                          | derived (§3.4)              |
| `comeback-kid`    | Comeback Kid    | returned after a gap ≥ 5 days between active days | activity days               |

Locked badges render as faint silhouettes with hint text (collection pull without pressure).

---

## 4. Backend & data changes

| Layer                   | Change                                                                                                                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db` schema    | Add `XpEvent` (+ relation on `User`). One migration. **Run `pnpm --filter @reka-bytes/db generate` after migrate** (generator does not auto-regenerate)                                                                                                                          |
| Backfill                | `packages/backend/scripts/xp-backfill.ts`: seed 50 XP per historical completed lesson, quiz bonuses, module/class bonuses — **with `createdAt` copied from the source timestamps** so streak/badge history derives honestly. Idempotent (unique constraint makes re-runs no-ops) |
| `shared/src/content.ts` | Extend `LearnDashboardDTO` with `game: GamificationDTO` (below); add `GamificationDTO`, `BadgeKey` types + zod schemas                                                                                                                                                           |
| `learn.service.ts`      | Award hooks in lesson-complete + quiz-submit paths; `getDashboard` computes/aggregates `game` (single group-by over XpEvent + the pure functions)                                                                                                                                |
| Routes                  | No new endpoints required for dashboard; profile stats may reuse the same service (`GET /api/learn/me/stats` only if dashboard payload proves too heavy — decide during R3)                                                                                                      |

```ts
interface GamificationDTO {
  xp: { balance: number; level: number; intoLevel: number; forNextLevel: number };
  streak: { current: number; longest: number; activeToday: boolean };
  badges: { key: BadgeKey; unlocked: boolean }[];
}
```

Pure functions (`levels.ts`, `streaks.ts`, `badges.ts`) live in `shared/src/game/` with unit tests — no DB mocking needed.

---

## 5. UI integration by surface

| Surface                           | Treatment                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard header**              | avatar chip + **level pill** (`LVL 3`, lime tint) beside greeting; slim animated XP bar beneath (lime fill on `inset` track)                                                                                        |
| **Stat row**                      | 3 rounded cards: Level ring w/ XP-to-next · Streak card (**flame icon**, lit when `activeToday`, dims otherwise with "complete today's lesson to keep your streak") · Quiz average                                  |
| **Continue hero card**            | glow gradient border; CTA carries a `+50 XP` preview chip                                                                                                                                                           |
| **Recent scores / announcements** | standard cards; scores get pill result badges                                                                                                                                                                       |
| **Learn page**                    | classes as cards with overall progress bar; modules = collapsible rounded cards; per-module progress bar replaces bare `3/5 ✓`; lesson rows get rounded hover states; module completion → brief shimmer on the card |
| **Lesson viewer**                 | blocks restyled to the radius scale (callout/key-terms/comparison/steps); on auto-complete: confetti burst + floating **"+50 XP"** toast; inline-check feedback keeps reveal-in, adds micro-spring                  |
| **Quiz runner**                   | pass screen: animated score reveal + XP pop; perfect score = extra flourish                                                                                                                                         |
| **Profile**                       | identity card (initials avatar, level ring, joined date), **badge grid** (unlocked = lime-tinted; locked = silhouette + hint), stats summary, danger-ghost pill logout                                              |
| **Sidebar footer**                | mini level ring around user initials — constant momentum reminder                                                                                                                                                   |

Empty states across all pages: dashed rounded panels ("not yet" feel).

## 6. Celebrations & motion

- Confetti via `canvas-confetti` (~6 KB, pure JS — no `allowBuilds` entry needed); colors = accent lime, success green, off-white.
- Client-side badge-diff celebrations: unlocked set diffs against `localStorage['rb-last-seen-badges']` → new keys fire one toast + confetti each. Server stays stateless; acceptable multi-device edge case for v1.
- Card entrance: staggered fade-rise (60ms), hover lifts spring `y:-2`. All gated behind `prefers-reduced-motion` (pattern already in `globals.css`): reduced-motion ⇒ no confetti particles, instant reveals, static badges.

## 7. Guardrails

- **Anti-gaming**: XP awards idempotent via unique constraints; inline-checks worth 0 XP; no decrement paths.
- **No dark patterns**: no loss mechanics, no purchasable streak freezes, nothing time-limited.
- **A11y**: status never color-only (flame has text + aria-label); focus rings preserved; hit targets ≥44px; reduced-motion honored.
- **No leaderboard** — cohort of 5 makes it more demotivating than fun. Revisit at scale.
- Streak timezone = UTC for v1 (documented limitation; per-user TZ is a future refinement).

## 8. Execution order & verification

| #   | Workstream                                                                                                  | Effort      | Depends on | Verify                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------- | ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | R1a — tokens/radii/elevation + Button/Badge/Card/Sidebar primitives + `:focus-visible` layering fix         | ~½ session  | —          | typecheck/lint/build; visual pass                                                                                                                        |
| 2   | R1b — pages: dashboard, learn, lesson viewer + blocks, quiz runner, profile                                 | ~1 session  | R1a        | **existing E2E stays green (testids untouched)**                                                                                                         |
| 3   | R2 — XpEvent migration + backfill + shared pure fns + unit tests + DTO + award hooks                        | ~1 session  | —          | unit tests; API probe shows `game` on dashboard; backfill idempotent                                                                                     |
| 4   | R3 — dashboard widgets, celebrations, profile badge grid, sidebar ring, Learn progress bars                 | ~1 session  | R1b + R2   | new **e2e-16-gamification.spec.ts**: complete mock lesson → XP appears, level renders, `first-steps` unlocks; hard reload → celebration does NOT re-fire |
| 5   | Docs — amend DESIGN.md (§2/§5 geometry + new "Gamification visual language" subsection); PRD-04 status flip | rides along | each phase | review                                                                                                                                                   |

DESIGN.md amendment summary (applied during R1/R3, not before — the doc must describe shipped reality): retire _"Hairlines over cards / No rounded shadow-card soup"_ **for the student app**, add radius/elevation tokens, pill buttons, pill nav, tinted pill badges, XP-bar/level-pill/confetti specs.

Known gotchas to respect while executing:

- Playwright `reuseExistingServer` happily tests stale code — restart dev servers after backend changes.
- After schema edits run `pnpm --filter @reka-bytes/db generate` manually.
- Never put non-primitive objects in React dep arrays (wizard loop bug precedent).

## 9. Deferred (do NOT pull into this cycle)

- Any BAML/prompt/pipeline change (Phase B simulation shells remain next-content-cycle per LESSON-PLAN §11)
- Drip release, quiz gating enforcement (PRD-02 §14 deferrals stand)
- Avatar upload/customization, sound design, seasonal events
- Leaderboards, weekly goals, XP for admin-granted actions
- Per-user timezone streaks; server-side badge-unlock storage (revisit if notifications ship)

## 10. Decisions recorded

| Decision                                        | Rationale                                                                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Stateless badge derivation v1 (no unlock table) | Pure functions over existing data = zero extra migrations, idempotent, trivially testable; client-side localStorage diff drives celebrations |
| Inline-checks award 0 XP                        | They're practice; awarding them invites re-answer farming and dilutes completion as the signal                                               |
| XP ledger append-only, never decremented        | Positive-only framing; simpler mental model; matches BlockEvent telemetry philosophy                                                         |
| Backfill copies original timestamps             | Students' streaks and badge eligibility reflect real history instead of resetting at launch                                                  |
| Levels as shared pure function                  | Backend DTO + frontend bars must never disagree; one tested formula                                                                          |
| No leaderboard at cohort size 5                 | Social comparison hurts more than it motivates at tiny N                                                                                     |
| Reskin = student app only                       | Landing/login/admin keep Terminal Editorial; avoids a half-redesigned public funnel; student app is the daily-use surface                    |
| Testids frozen through R1                       | E2E suite is the regression net; styling changes only                                                                                        |
