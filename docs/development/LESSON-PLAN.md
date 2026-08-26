# LESSON-PLAN — Interactive Lesson Engine (Blocks + Simulations)

> **Prerequisite**: Read `PRD.md` (phased roadmap), `PRD-02.md` (Phase 1 classroom + AI Masterclass), and `DESIGN.md` (Terminal Editorial system) before this document. This document supersedes the "lesson = one markdown string" model from Phase 1.

| Field | Value |
|---|---|
| Product name | Reka Bytes |
| Feature | Interactive Lesson Engine — structured blocks, simulations, sandboxed widgets |
| Owner | Founder |
| Status | Draft v1 |
| Design spec | `docs/development/DESIGN.md` |
| Depends on | AI Masterclass v2 pipeline (`packages/baml`), Lesson viewer (`packages/frontend`), Admin wizard (`packages/admin`) |

---

## 1. Problem

The current lesson viewer renders a single markdown string via `react-markdown`. The AI Masterclass produces well-*structured* teaching prose, but the *medium* is a text wall: headings, paragraphs, tables, code blocks. For an audience of non-CS learners ("vibe coders"), reading is the weakest possible delivery format.

**Goal**: every lesson is an interactive learning experience — diagrams, inline checks, guided exercises, and full **simulations** (terminal practice, prompt-builder, debugging scenarios) — where the AI generates the *scenario data* and, for advanced widgets, the *widget code itself*, inside a security sandbox.

**Non-goals (this plan)**:
- Multiplayer / live cohort features (Phase 3+).
- Video hosting changes.
- Replacing the module quiz (module-level quizzes stay; we *add* inline checks).

---

## 2. Core Principle — The Container Rule

> **The model never ships executable content into our page. It only fills data into containers we built — except for sandboxed widgets, where the code it writes can never touch our origin.**

This is a hardening of the existing Phase 1 XSS boundary (no `rehype-raw`). Every rendering path in this plan must satisfy it:

| Content type | Who writes it | How it's rendered | Boundary |
|---|---|---|---|
| Prose, tables, code | AI (markdown) | `react-markdown`, no raw HTML | unchanged |
| Diagrams | AI (mermaid source) | mermaid.js, `htmlLabels: false`, sanitized | SVG only, no HTML injection |
| Interactive blocks | AI (JSON payload) | fixed React components (block registry) | zod-validated payload, our code |
| Simulations (templates) | AI (JSON scenario) | fixed React simulation shells | zod-validated scenario, our code |
| Free-form widgets | AI (HTML/JS document) | `<iframe sandbox="allow-scripts">`, no same-origin, no network | browser sandbox — see §7 |

If a future block type can't satisfy this table, it doesn't ship.

---

## 3. Architecture Overview

```
┌──────────────────────────── packages/baml ────────────────────────────┐
│  WriteLesson (v3)        →  LessonBlock[] (typed JSON, zod-backed)    │
│  GenerateWidgetScenario  →  scenario JSON per simulation block       │
│  GenerateWidgetCode      →  self-contained HTML doc (free-form only) │
└──────────────┬────────────────────────────────────────────────────────┘
               │ single transactional DB write (unchanged pattern)
┌──────────────▼────────────────────────────────────────────────────────┐
│  packages/db     Lesson.blocks Json   (markdown kept as fallback)     │
└──────────────┬────────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────── packages/frontend ─────────────────┐
│  BlockRenderer → block registry (type → React component)             │
│  ├─ prose / callout / key-terms / comparison / steps / recap          │
│  ├─ mermaid-diagram                                                   │
│  ├─ inline-check (mini quiz, client-graded)                           │
│  ├─ exercise (guided try-it with reveal)                              │
│  └─ simulation shells: terminal / prompt-builder / debug-scenario /   │
│     order-steps / match-pairs / predict-output                        │
└───────────────────────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────── packages/admin ────────────────────┐
│  Wizard step 4 review: block-level preview + widget safety panel      │
│  /content lesson editor: block-aware (edit JSON payloads, not raw)    │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 4. Lesson Block System

### 4.1 Block model (shared schema, `packages/shared/src/blocks.ts`)

A lesson body becomes an ordered array of typed blocks. One zod discriminated union is the single source of truth for: BAML output schema, DB validation, frontend renderer, and admin editor.

```ts
type LessonBlock =
  | { type: 'prose';        markdown: string }
  | { type: 'callout';      variant: 'info' | 'warning' | 'mistake' | 'tip'; title: string; markdown: string }
  | { type: 'key-terms';    terms: { term: string; definition: string }[] }
  | { type: 'comparison';   headers: [string, string]; rows: [string, string][] }
  | { type: 'mermaid';      source: string; caption?: string }
  | { type: 'steps';        title: string; steps: { title: string; markdown: string }[] }
  | { type: 'inline-check'; question: string; options: string[]; correctIndex: number;
                              explanation: string }
  | { type: 'exercise';     prompt: string; starter?: string; solution: string;
                              hints: string[] }              // progressive reveal
  | { type: 'simulation';   sim: SimKind; scenario: SimScenario }  // §5
  | { type: 'widget';       title: string; html: string }          // §7 sandboxed artifact
  | { type: 'recap';        points: string[] }
```

Rules:
- **`correctIndex` in `inline-check` follows the existing quiz security rule**: stripped server-side before the DTO reaches the client; grading happens on submit (inline checks are formative — no server record needed, so grading can be client-side *after* the answer payload is sanitized; see §8.2).
- Every block payload is zod-validated at three points: BAML output parse, DB write, API read.
- Unknown block types render as a styled "unsupported block" placeholder — never crash, never raw-render.

### 4.2 Storage & migration

```prisma
model Lesson {
  // existing fields unchanged
  content  String?  @map("content")        // legacy markdown — kept during migration, then optional
  blocks   Json?                            // LessonBlock[] — new canonical body
}
```

- **Migration v1**: backfill script converts existing markdown lessons into blocks — heuristic split on the known teaching structure (`Why this matters` → `The concept` → … → `Recap`) into `prose` / `callout` / `key-terms` / `recap`. Imperfect splits are fine: a single `prose` block containing the whole legacy markdown is the guaranteed-correct fallback.
- **Renderer fallback**: if `blocks` is null/empty, render `content` markdown as today. Old lessons never break.
- **Admin editor**: `/content` lesson editor gets block-aware editing (edit payloads in structured forms; prose blocks keep the markdown textarea + live preview). Raw-JSON escape hatch for the founder-admin.

### 4.3 BAML — `WriteLesson` v3

- Output schema becomes the zod-mirrored block union (BAML struct with the same field names; enum of block types).
- The existing teaching-structure prompt mandate (Why this matters → concept → walkthrough → mistakes → try it → recap) maps 1:1 onto block types — the structure is now *enforced by the schema*, not just prose instruction.
- Keep the `callWriteLesson` retry wrapper (BamlValidationError / BamlClientHttpError) unchanged.
- **Token/latency budget**: structured output is larger than raw markdown. Expect +30–60% per lesson pass; acceptable given concurrency 4 and the outline checkpoint already gating cost.
- Lesson regen endpoint (step 3 per-lesson regen) returns blocks; the PUT lesson path writes `blocks` (+ regenerated `content` markdown flattened from blocks, for backward compat and search).

---

## 5. Simulation Templates (the default interactive layer)

**Decision**: simulations come from a **fixed library of shells** — we write the interactive React experience once, the AI fills the *scenario data*. This is reliable, on-brand (Terminal Editorial), cheap to generate, and impossible to XSS. Free-form AI-written widgets (§7) are the advanced tier on top, not the foundation.

### 5.1 Launch library (v1 — six shells)

| Shell | Learner interaction | AI-generated scenario data |
|---|---|---|
| `terminal-sim` | Type commands into a fake terminal; simulated filesystem responds | filesystem tree, command responses, goal ("find the file the error mentions"), success condition |
| `prompt-builder` | Assemble a prompt from draggable fragments; see how a simulated AI misreads weak prompts | task, fragment pool (good/distractor/bad), per-combination feedback table, winning combination |
| `debug-scenario` | Read broken code + error, pick/apply the fix, see consequence | code with bug, 3–4 fix options with realistic outcomes, explanation |
| `order-steps` | Drag steps into the correct order (e.g., deploy pipeline, git flow) | shuffled steps, correct order, per-step rationale |
| `match-pairs` | Match terms to definitions / concepts to examples | pairs, distractors |
| `predict-output` | Read a snippet, predict what it prints, step through line-by-line reveal | code, line-by-line state commentary, options, explanation |

### 5.2 Scenario schema

Each shell owns a zod schema (`packages/shared/src/sims/<kind>.ts`). Example, `terminal-sim`:

```ts
terminalSimScenario = {
  briefing: string,            // goal in learner language
  fs: { name, kind: 'dir'|'file', content? , children? }[],
  allowedCommands: string[],   // shell only responds to these (others get a friendly "command not found")
  responses: Record<command, string>,
  goal: { check: { command: string }, successMessage: string },
  hints: string[]
}
```

- Generation: new BAML function `GenerateWidgetScenario(kind, lessonContext)` — small, fast pass, runs per simulation block during `WriteLesson` (same concurrency pattern as quizzes). Scenario is part of the block payload, so it persists with the lesson.
- Validation failure → retry (reuse the `callWriteLesson` pattern) → on final failure, degrade gracefully to an `exercise` block. **A lesson never fails to publish because a simulation scenario came back malformed.**

### 5.3 Shell UX contract (all shells)

- Terminal Editorial styling: `bgInset` panel, hairline border + corner ticks, mono type, acid-lime success states.
- Self-contained: no network calls, no backend dependency — a simulation must work with the scenario JSON alone.
- Completion signal: each shell emits `onComplete()` when the learner solves it → feeds lesson progress + telemetry (§9).
- `prefers-reduced-motion` respected (framer-motion, same as wizard).
- Mobile: shells must be usable at 375px (order-steps/match-pairs become tap-to-swap instead of drag).

---

## 6. Diagrams (mermaid)

- New block `mermaid`: AI emits mermaid source; frontend renders with `mermaid` npm package, `securityLevel: 'strict'`, `htmlLabels: false`.
- Render is client-side, lazy-loaded (`next/dynamic`) — mermaid is heavy (~500KB) and most lessons won't have diagrams on first paint.
- Failure mode: mermaid parse error → render the source in a styled code block with a "diagram failed to render" note. Never blank.
- BAML prompt guidance: flowchart/graph only (v1) — sequence/class diagrams are more error-prone from LLMs.

---

## 7. Free-form Sandboxed Widgets (advanced tier)

For experiences the template library can't express, the AI may write a **complete self-contained HTML document** (inline CSS + JS, no external requests), rendered as:

```html
<iframe sandbox="allow-scripts" srcdoc="{widget html}" ...>
```

- **No `allow-same-origin`**: the widget has an opaque origin — it cannot read our cookies, localStorage, DOM, or call our API. No `allow-top-navigation`. No network (CSP `default-src 'none'` inside the srcdoc + served from a blob/opaque origin).
- Height auto-resize via `postMessage` handshake with a strict origin/target check.
- **Generation & gating**:
  - New BAML function `GenerateWidgetCode(spec)` produces the HTML doc.
  - Server-side static checks before persisting: no `<script src=`, no `fetch`/`XMLHttpRequest`/`WebSocket`/`import(`, size cap (~200KB). Fail → fall back to a template simulation.
  - **Admin preview is mandatory**: wizard step 4 renders every `widget` block in the real sandbox; admin must expand and eyeball it before publish (same philosophy as the outline checkpoint — human approves before it goes live).
- Widgets are the *rare* block — BAML guidance caps them at ~1 per lesson, only when a template doesn't fit. The template library is the workhorse.

---

## 8. Security Model (summary)

### 8.1 Threat: AI-generated content as an XSS vector
- Markdown: unchanged boundary (no raw HTML).
- Mermaid: `securityLevel: 'strict'`, htmlLabels off.
- Block/scenario payloads: zod at every boundary; renderers only read validated fields.
- Widgets: browser sandbox (opaque origin, no network) — even fully malicious code is contained. Static checks are defense-in-depth, not the boundary.

### 8.2 Threat: answer leakage (inline checks)
- `inline-check.correctIndex` is **stripped from the lesson DTO** exactly like module-quiz `correctIndex` today. The client sends the chosen index; the *sanitized* block (shipped with explanation withheld) is graded client-side against a per-request HMAC, or — simpler v1 — inline checks are graded by a tiny `POST /api/learn/lessons/:id/check` endpoint that holds the full block server-side. **Pick the endpoint** (v1): reuses the existing quiz-grading pattern, zero crypto to get wrong. Formative only — attempts are not recorded.

### 8.3 Threat: prompt injection via uploaded PDFs
- Same exposure as today (PDF text → model). The sandbox means even a fully-injected model output can't escalate beyond rendering weird-but-contained content. Admin review (step 4) remains the human gate.

---

## 9. Progress, Telemetry & the Module Map

### 9.1 Block-level engagement (lightweight)
- Shells and exercises emit `onComplete` → `POST /api/learn/progress/block` (debounced, fire-and-forget). Stored as `{lessonId, blockIndex, kind, completedAt}` on `LessonProgress.blockEvents Json?`.
- Powers: "2 of 3 simulations solved" on the lesson header, and (later) analytics on which blocks students actually finish.

### 9.2 Lesson completion redefinition
- "Mark Complete" stays manual, but the button shows state: `3/5 interactive blocks solved`. Completing all simulations is *encouraged*, never forced (no gates — this is a teaching tool, not compliance).

### 9.3 Graphical module map (frontend-only, ships with Phase A)
- `/learn` class overview becomes a **learning path**: modules as nodes on a vertical path, lessons as dots, states (done / current / locked), progress % per module. Pure presentational component over existing data — no pipeline change, big perceived-polish win.

---

## 10. Admin Wizard & Editor Changes

- **Step 4 (review lessons)**: ModuleCard accordions render the *actual block components* (read-only) instead of raw markdown — admin sees exactly what students will see. Widget blocks show the safety panel (static-check results + sandboxed preview + "I reviewed this" checkbox required for publish if any widget exists).
- **Step 3 (outline checkpoint)**: outline gains a per-lesson `interactions` plan (which shells the lesson will use). Admin can strike interactions here before lesson passes run — cheapest place to change course.
- **`/content` manual editor**: block-aware forms per §4.2; "Add simulation" picker inserts a simulation block with a hand-editable scenario form (JSON textarea is acceptable for founder-admin v1).

---

## 11. Delivery Phases

### Phase A — Foundations + visual upgrade (no pipeline rewrite)
1. `packages/shared/src/blocks.ts` — block union + zod.
2. `Lesson.blocks Json` column + backfill migration (markdown → blocks, fallback intact).
3. Frontend `BlockRenderer` + registry: prose, callout, key-terms, comparison, steps, recap, mermaid, inline-check (server-graded endpoint).
4. `WriteLesson` v3 emits blocks; regen path updated; legacy markdown fallback kept.
5. Module map on `/learn` (§9.3).

**Exit**: E2E green (existing 14 + lesson-render assertions), old lessons render via fallback, new AI lesson renders as blocks with ≥1 mermaid + ≥2 inline-checks.

### Phase B — Simulation template library
1. Six shells (§5.1) + scenario schemas; `GenerateWidgetScenario` BAML pass; graceful degradation to `exercise`.
2. `onComplete` → block progress events; lesson header "n/m solved".
3. Wizard step 4 renders simulations read-only; step 3 outline shows interactions plan.

**Exit**: a real-PDF class generated E2E where every lesson contains ≥1 working simulation; mobile-usable at 375px; reduced-motion respected.

### Phase C — Sandboxed widgets + polish
1. `GenerateWidgetCode` + static checks + iframe sandbox + postMessage resize.
2. Step 4 widget safety panel + mandatory admin review checkbox.
3. Block-level analytics surfaced in admin (per-block completion rates).

**Exit**: widget passes static checks and is un-clickable/un-readable from parent origin (manual security test checklist in e2e); admin cannot publish with an unreviewed widget.

---

## 12. Acceptance Criteria (overall)

- [ ] No lesson renders raw HTML from any AI source (regression test: inject `<img onerror>` / `<script>` via a mocked lesson — must render inert).
- [ ] `correctIndex` for inline-checks never reaches the client pre-submit.
- [ ] Widget iframes have opaque origin; automated e2e asserts no same-origin access and no network from the frame.
- [ ] Every block type has a failure mode that degrades visibly, never blank/crash.
- [ ] Legacy markdown lessons render identically post-migration.
- [ ] All shells + widgets respect `prefers-reduced-motion` and work at 375px.
- [ ] `pnpm -r typecheck && pnpm -r lint` clean; e2e suite extended for blocks + simulations.

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Structured output raises BAML parse failures | Existing retry wrapper + zod validation + per-block degradation |
| Token cost/latency growth per lesson | Outline checkpoint already gates spend; scenario pass is small; concurrency 4 unchanged |
| LLM-authored widget code quality | Widgets are capped/rare; static checks; mandatory admin preview; templates are the default |
| Mermaid render failures | Strict mode + graceful code-block fallback |
| Migration corrupts existing lessons | `blocks` nullable + markdown fallback; backfill is additive, never destructive |
| Scope creep in shell library | Six shells, hard cap for v1; new shells require a new scenario schema + review |

## 14. Open Questions

1. Inline-check grading: server endpoint (recommended v1) vs HMAC client grading — confirm endpoint.
2. Should inline-check completion count toward `LessonProgress` completion %, or be formative-only? (Plan assumes formative-only.)
3. Terminal-sim: teach real command syntax (bash/git) per class topic, or a universal fake shell across all classes? (Plan assumes per-class scenario data, shared shell.)
4. Do we retro-fit the existing "Vibe Coding Testing" classes with simulations via regen, or only new classes? (Plan assumes new classes first, regen on demand.)
