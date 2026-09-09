# PRD-05 — Interactive Lesson Kit ("Learning Loop") + Gamified Lesson Flow

> **Prerequisite**: Read `PRD.md`, `LESSON-PLAN.md` (§5.1/§11 Phase B), `DESIGN.md`, `PRD-03.md`, `PRD-04.md`.
> **Status**: Plan v1 (drafted 2026-08-27, awaiting approval)
> **Ground rule**: BAML never generates UI or code. It emits **structured scenario data** into flat block classes; every pixel of interactivity lives in hand-coded React components under our design system. `correctIndex/explanation` security posture extends to **all** gradable block types.

---

## 1. Overview

**Problem**: generated lessons render as well-typeset articles (`BlockRenderer` → document flow). They *read* like a blog. Learning research and competitor reality (Duolingo, Brilliant) both say retention comes from a **do-loop**: short concept → interact → feedback → advance. We already have the hard parts built:

- Typed block pipeline (flat `LessonBlockRaw`, one enum→type mapping in `toLessonBlocks`)
- Server-side grading + answers-stripped DTOs (`sanitizeBlocksForStudent`)
- Append-only telemetry (`BlockEvent`) and idempotent XP ledger (`XpEvent`)
- Celebration host, reduced-motion gates, design system

**Concept**: *"you learn by doing"* — three pillars:
1. **Interaction density** — a learner touches something every ~1–2 minutes; reading segments stay short.
2. **Instant feedback loops** — try again without shame; attempt ≠ failure, solving = XP.
3. **Visible momentum mid-lesson** — "n/m solved" chip, progress dots, micro-celebrations before the end-of-lesson ceremony.

**What we are NOT building this cycle** (deferred §9): screen-stepper/course-flow redesign, AI-generated runnable code (sandboxed widgets), dev-tool sims (`terminal-sim` etc.), branching multi-step scenarios >1 level deep, sound effects, leaderboards.

---

## 2. The kit — six interaction block types (v1)

All six share the same contract shape where possible: `{ type, prompt-ish fields, canonical data, feedback copy }`. zod schemas live in `packages/shared/src/blocks.ts`; sanitized variants follow the existing `WithoutAnswers<T>` pattern.

| # | Block type | Learner does | Model emits (canonical truth) | Derived by us (never model-generated) |
|---|---|---|---|---|
| 1 | `order-steps` | reorder items into correct sequence (drag + up/down button fallback) | ordered steps array, each `{ label, rationale }` | shuffled presentation order (stable seed `hash(lessonId:blockIndex)`), submit-grading |
| 2 | `match-pairs` | connect terms ↔ definitions/examples | pairs array + explicit distractors | left/right column presentation order (seeded shuffle) |
| 3 | `fill-blank` | pick words for sentence gaps | sentences with marked gap positions, correct words, distractor bank | rendered form with chips/buttons |
| 4 | `classify` | sort items into concept buckets | bucket definitions, items (incl. tricky/ambiguous-but-resolvable) | item presentation order (seeded shuffle) |
| 5 | `mini-scenario` | choose an action, see the consequence | situation text, 2–3 choices, outcome text + takeaway per choice | nothing (choice → server returns its outcome) |
| 6 | `tap-to-reveal` | click hotspots/cards to uncover insights | card front/hint + reveal content list | reveal-until-all-done counter (self-paced, ungraded) |

**Design rules baked into schemas:**

- **Flat classes only** (BAML gotcha from v2/v3): every new class is a flat set of fields with an ALL-CAPS literal discriminant; NO nested unions in BAML output. Type mapping stays centralized in `toLessonBlocks`.
- **Model emits truth, code derives disorder.** Same discipline that made `contentMarkdown` derived-only: the model gives the *correct* order/pairs/words once; shuffles are deterministic seeded transforms so every reload renders identically and solutions always exist. Never ask the model to emit "shuffled order".
- **Anything gradable follows the leak-proof rule**: correct answers, pair mappings, ordered sequence, blank solutions, and scenario outcomes are stripped by `sanitizeBlocksForStudent` and revealed only through the submit endpoint response. Exception: `tap-to-reveal` is exploration, not assessment — reveals ship inline.
- **Degradation**: if the model produces an unbuildable config (e.g., <3 pairs, empty buckets), backend validation falls back to `exercise` prose with a log line; renderer additionally renders unknown/future types as prose (forward compatibility).

### Sizing guidance (prompt-enforced, not hardcoded UI limits)

- `order-steps`: 4–6 steps · `match-pairs`: 3–5 pairs incl. ≤2 distractors · `fill-blank`: ≤2 blanks per sentence, ≤4 sentences · `classify`: 2–3 buckets, 4–6 items · `mini-scenario`: exactly 1 situation, 2–3 choices · `tap-to-reveal`: 3–6 cards.
- Per lesson target: **≥2 interactive moments**, distributed across segments (not stacked at the end). Total interactions per lesson cap ~5 so prose teaching structure (why→concept→walkthrough→mistakes→try→recap) survives intact.

---

## 3. Pipeline changes (packages/baml + backend wiring)

### 3.1 `GenerateOutline` gains an interactions plan

Outline per lesson adds a `plannedInteractions[]`: `{ kind: ..., purpose }` entries (1–3 per lesson). Prompt instructs: place interactions where source material offers *classifiable/sequenceable/comparable* content; prefer concepts over trivia; align each with a lesson section.

Admin still approves the outline at `awaiting_approval` — the checkpoint now shows the pedagogy plan too (wizard step 3 chips).

### 3.2 Lessons pass implements the plan

`WriteLesson` receives the outline's planned interactions for that lesson and is instructed to emit corresponding blocks **inside the normal teaching structure** (e.g., `order-steps` lands after a process explanation, not appended arbitrarily). Rules added to prompts:

- Every interaction's data must be derivable from the analyzed source PDF content (course-specific vocabulary/terms defined earlier in the lesson).
- Distractors must be *plausible but wrong*; rationales teach, not mock.
- If a planned interaction cannot be honestly built from source material → emit the fallback (`exercise`) instead. Never invent filler interactions.

### 3.3 No new BAML pass

Scenarios ride inside the existing flat lesson blocks — no extra latency multiplier beyond what richer outputs cost. `withBamlRetry` already wraps the pass; retry policy unchanged. ClientRegistry, `http { request_timeout_ms: 0 }`, prompt delimiters `#"..."#` — all as-is (gotchas honored, nothing new to fight).

### 3.4 `regenerate-outline` / per-lesson regen

Unchanged semantics: outline regen re-plans interactions; per-lesson regen re-emits blocks (fallback chain already exists).

---

## 4. Backend + data changes

| Area | Change |
|---|---|
| `packages/shared/src/blocks.ts` | 6 new block schemas + `WithoutAnswers` variants; single discriminated union grows (11 → 17 types) |
| `toLessonBlocks` | map new ALL-CAPS enum values → lowercase types (one place, as today) |
| `sanitizeBlocksForStudent` | strip: correct sequence indices, pair mapping, blank solutions, classify memberships, choice outcomes (mini-scenario treated exactly like quiz `explanation`); NOT stripping tap-to-reveal |
| Grading endpoint | generalize `checkInlineAnswer` → accept `kind` + answer payload; per-type validators (pure functions in shared so frontend unit tests can reuse scoring logic); response returns `{ correct?, solutionData/outcomeText, feedbackCopy }` |
| Auto-complete | current rule (lesson completes when every inline-check **attempted**) extends to all gradable interaction blocks; `tap-to-reveal` requires completion (all cards revealed) — consistent "attempted beats perfect" philosophy |
| `BlockEvent` | no migration needed — `kind` column already exists; record `kind: 'order-steps'` etc. with payload `{blockIndex, answerSummary, correct}` |
| XP ledger | new reason `INTERACTIVE_SOLVED` (+15 XP, **first-solve only per block**, idempotent via existing `@@unique([userId, reason, refId])`; `refId = lessonId:blockIndex`). Zero-X repeat attempts retained as streak activity (anti-farm posture matches inline-checks) |
| Quiz generation | untouched (quizzes keep generating FROM written lessons) |

Badge stretch (optional R4): `INTERACTOR` — solve N distinct interactions, computed by counting `XpEvent` rows with reason `INTERACTIVE_SOLVED` (derived predicate, zero storage, consistent with badges.ts).

---

## 5. Frontend renderer workstream (`packages/frontend`)

New folder `components/student/blocks/interactive/`, one component per type + shared internals:

- `useInteractionState(block)` hook family — attempts, solved, satisfied-for-completion; plugs into the existing lesson-complete registry (`onLessonCompleted` threading from PRD-03).
- Feedback affordances: instant correctness shading, try-again reset, per-item rationale on solve; aria-live announcements; keyboard-operable alternatives (up/down buttons for ordering, select-then-place for match/classify, radio groups for scenario/fill-blank).
- Micro-celebrations on solve: single confetti burst via existing celebrations host patterns; gated by reduced-motion (same guard as PRD-04).
- Header chip inside lesson viewer: `solved n/m` progress pill (reuses `LevelPill`/badge visual language from DESIGN §5b).
- Full mobile usability at 375px: touch targets ≥44px, drag everywhere has a non-drag alternative.
- Styling rides the Soft Terminal light palette exclusively (`@theme` tokens; no local hexes — the byte-stream/instructor-flow lesson is absorbed as a rule).

Unknown block types render as prose paragraphs (defensive registry default) so future additions can't 500 a lesson page.

---

## 6. Admin wizard integration (`packages/admin`)

- Step 3 checkpoint: render `plannedInteractions` chips per lesson (read-only) — admin reviews pedagogy before spending generation budget.
- Step 4 preview: new block types render in a **solution-visible review mode** (labelled "preview with solutions") — easiest honest check that scenario data is sane; read-only, no grading calls.
- `/content` tree editor: minimal JSON passthrough editing for new types initially (structured editors deferred); must never allow admins to publish past zod validation.
- `AI_MOCK=1` fixture updated: lesson 1 gains ≥1 `order-steps`, ≥1 `match-pairs`, ≥1 `tap-to-reveal` (keeps e2e meaningful without model access).

---

## 7. Execution order & verification

| Ring | Delivers | Verify |
|---|---|---|
| **R1** | shared schemas + sanitize + validators + `toLessonBlocks` + BAML classes/prompts + db generate if needed | `pnpm -r typecheck`, `pnpm -r lint`, `pnpm --filter @reka-bytes/shared test` |
| **R2** | 6 renderer components + state hooks + registry + unknown-type fallback | typecheck/lint/build frontend, manual smoke vs fixture lesson |
| **R3** | grading endpoint generalization + auto-complete/XP wiring + header chip + celebrations | shared tests + curl probes against user-run dev servers; e2e-09/10/14/16 regressions remain green (user-approved run only) |
| **R4** | wizard step 3/4 surfaces + AI_MOCK fixture refresh + optional INTERACTOR badge | build admin + frontend, e2e suite full pass (user-approved run only) |

New e2e spec (written in R4, executed only with permission): mock-generated lesson containing ≥3 interaction types → student solves them → lesson auto-completes → `XpEvent` row with reason `INTERACTIVE_SOLVED` exists → dashboard reflects XP.

Order note: R1/R2 are parallelizable only after schemas freeze; BAML prompt quality iteration happens after R2 exists (can't judge interactions without rendering).

---

## 8. Risks & mitigations

1. **Model fumbles configs** (most likely failure mode) → flat schemas + sizing constraints in prompts + `withBamlRetry` + graceful degradation to `exercise`; renderer never trusts shape (zod parse at ingest boundary, prose-fallback on miss).
2. **Lesson bloat / interaction stacking** → plannedInteractions cap (≤3/lesson) + density prompt rules + write-pass instruction to preserve teaching structure.
3. **Answer leakage regression** → all gradable types route through sanitize+submit like quizzes do; add shared unit test asserting serialized student DTO contains none of: solution index/order/pair-map/word/outcome strings.
4. **Regeneration invalidates solved state** → refId includes blockIndex; regeneration may shift indexes (acceptable: rare, admin-triggered; treat as natural reset).
5. **Drag-heavy UX on touch/reduced-motion** → mandatory non-drag alternatives from day one (R2 checklist), not a later patch.
6. **Old lessons / future enums** → prose fallback for unknown types keeps old classes renderable forever.

## 9. Deferred

- Screen-stepper lesson flow (blog→screens redesign) — depends on this kit landing first; spec its own cycle (candidate: PRD-06), including resume-at-screen persistence.
- Dev-tool sims (`terminal-sim`, `predict-output`, debug scenarios) — LESSON-PLAN §5.1 remains the reference for a later developer-track cycle.
- Sandboxed AI-authored widgets (Phase C static checks + iframe sandbox + admin review gate).
- Branching scenarios (>1 decision deep), leaderboards, sounds, avatar rewards.

## 10. Decisions recorded

- **D1** — Interactivity = parameterized coded templates fed by AI-generated scenario data; BAML stays code-free and flat-schema'd (extends proven v3 architecture).
- **D2** — "Model emits truth, derives are ours": canonical correct data only from the model; all randomization/derivation is deterministic seed-based in code (mirrors `contentMarkdown` precedent).
- **D3** — Gradable interactions inherit the quiz security contract end-to-end (strip→submit→reveal); exploration-only blocks (tap-to-reveal) ship inline.
- **D4** — Attempts satisfy completion, solves earn XP (+15, first-solve, idempotent) — keeps the anti-farm stance while making learning itself feel rewarded.
- **D5** — Kit v1 = 6 types chosen for grading simplicity × pedagogy value; dev-tool sims explicitly excluded to avoid scope collision with the deferred Phase C/B tracks.
