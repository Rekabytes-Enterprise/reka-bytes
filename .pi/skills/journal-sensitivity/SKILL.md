---
name: journal-sensitivity
description: NEVER-include list and phrasing rules for journal posts. **Load BEFORE writing any journal content** — this is step 1 of the `journal-write` workflow. The journal is public-facing marketing; anything in the NEVER list would leak competitive intel, security posture, or internals. Use when writing journal posts, reviewing drafts, or when the user says "check if this is OK to post", "is this sensitive", "what can I share publicly".
---

# journal-sensitivity

## The NEVER list (do not write about)

The journal is **public**. Anyone can read it. Treat every sentence as if a
competitor, a security researcher, and a sophisticated customer are all
reading it at once. When in doubt, **cut and generalize**.

### Code & architecture internals

- ❌ File paths in the monorepo (`packages/backend/src/services/...`)
- ❌ Function / class / variable names from source code
- ❌ Schema field names, internal API shapes, endpoint paths beyond the
  public ones (`/api/public/*`)
- ❌ Error codes that hint at internals (`api_misconfigured`, `network_error`,
  `baml_validation_error`)
- ❌ Database column names, JSON column shapes, migration filenames
- ❌ Internal package names beyond the public ones (it's fine to mention
  `@reka-bytes/shared` as a concept; specific file paths are not)
- ❌ ESLint rule configurations, ban lists, cast exemptions

### Security & infrastructure

- ❌ BACKEND_URL, deployment URLs, container registry details (GHCR org/repo)
- ❌ CSP rules (the meta tag content, the sandbox attribute choices)
- ❌ Rate-limit codes (`leads`, `ai`) and their limits
- ❌ Sandbox hardening logic (what we block, why, regex patterns)
- ❌ Cookie names, JWT signing details, session lifetime values
- ❌ Environment variable names that hint at infra (`OPENROUTER_API_KEY`,
  `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `AI_MOCK`, `AI_TIMEOUT_MS`)
- ❌ Honeypot field names (`website` on the lead form)
- ❌ Admin route paths beyond the fact that an admin console exists

### Unreleased work & roadmap

- ❌ Features in PRs that haven't shipped to `main` or `dev`
- ❌ Speculative next-quarter plans, even at the headline level
- ❌ Internal phase/PRD roadmap (PRD-NN filenames, ring numbers)
- ❌ Any work tagged "draft", "wip", "todo" in commit messages
- ❌ "Coming soon" teasers for unreleased features
- ✅ OK to mention **shipped tags** (`v0.1.0`, `v0.1.5`) — those are public
  via GitHub Releases
- ✅ OK to mention "we're always shipping" in generic terms

### Internal numbers & metrics

- ❌ Exact cohort capacity (the number itself, even if "small" is fine)
- ❌ Exact user counts, revenue, MAU, conversion rates
- ❌ Per-feature cost, AI API spend, hosting bills
- ❌ Internal review/approval counts, application funnel drop-off
- ❌ Specific cohort names tied to internal metrics
- ✅ OK to use ranges ("a few hundred", "low five figures", "weeks, not months")
- ✅ OK to mention the existence of an approval process without the workflow
- ✅ OK to mention "5 seats per cohort" — that's already on `/academy`

### People & relationships

- ❌ Customer/student names, emails, application content, decision notes
- ❌ Admin identities, auditor identities
- ❌ Specific Discord server IDs, channel names, invite mechanics
- ❌ Names of partner orgs unless they're already public on `/` or `/academy`
- ✅ OK to refer to "we", "the team", "the cohort" in generic terms
- ✅ OK to mention that the founder is a "SWE grad + Google Certified PM" —
  that's on `/academy`

### AI / model details

- ❌ BAML prompt contents (full or excerpt)
- ❌ Specific model names with reasoning about why we picked them
- ❌ Prompt engineering rationale that hints at exploitation
- ❌ Daily limit values, retry strategies, timeout tuning values
- ❌ Reasoning model timing data that reveals model identity
- ✅ OK to say "we use a reasoning model for the lesson pipeline" (no specifics)
- ✅ OK to say "the AI took 30+ minutes for a full class" (time observation,
  no model name)
- ✅ OK to say "we use BAML for structured outputs" (technology mention, no
  prompt content)

### Pricing & business specifics

- ❌ Customer LTV, deal sizes, internal margin discussions
- ❌ Cohort price beyond what's on the public `/` page (RM 150 PRD is public;
  anything else: ask)
- ❌ Specific supplier / contractor / vendor names unless already public
- ❌ Discount structures, partner pricing
- ✅ OK to mention pricing model types (fixed scope / MVP first / retainer) —
  those are on `/`

### Engineering process internals

- ❌ Specific tool names beyond the public stack (Next.js, Hono, Prisma, BAML
  are all fine to mention; specific config of those tools is not)
- ❌ CI pipeline steps and tooling
- ❌ Docker image sizes, layer composition
- ❌ Test counts, specific E2E spec names beyond category
- ❌ "We have N tests, M E2E specs, typecheck takes X seconds"
- ✅ OK to say "we typecheck and lint every push" (process, no specifics)
- ✅ OK to say "we test the major user journeys end-to-end" (no counts)

## The phrasing test

For anything borderline, run the test:

> **"Would a competitor or a security researcher gain an edge from this?"**

If yes → cut. If the post is weaker for it, rephrase generically. Examples:

- ❌ "We set `request_timeout_ms: 0` in our BAML http block because reasoning
  models exceed the 300s default"
- ✅ "Reasoning models regularly take 5+ minutes per pass, so we let the
  generation run without an arbitrary cap"
- ❌ "Our admin login posts to `/api/admin/login` with an env-admin fallback"
- ✅ "The admin console has its own login surface, separate from the public one"
- ❌ "We hardened scenes with CSP `default-src 'none'; script-src 'unsafe-inline'`"
- ✅ "Interactive scenes run in a sandboxed iframe with no network access"

## When to ASK THE USER

If you're unsure whether something is OK to include, **stop and ask**. Show
the user the proposed sentence and ask: "Is this OK publicly, or should I
generalize?"

Default to generalization. The cost of oversharing is high; the cost of a
follow-up question is low.

## What IS OK (positive list)

- ✅ High-level architecture ("a Next.js app proxying to a Hono backend")
- ✅ Shipped features with public-facing names ("Cohort 001", "the leads
  funnel", "the journal")
- ✅ Process observations ("CI runs on every push to dev")
- ✅ Reasoning behind choices at the decision-level, not implementation-level
  ("we chose Hono because Express felt heavy for our surface area")
- ✅ Lessons learned that don't reveal proprietary patterns
- ✅ Generic dev wisdom that could apply to any project
- ✅ Brand voice, founder voice, personality
- ✅ Engineering fundamentals being taught (those are public pedagogy)

## Maintain this list

Found a new category that's borderline? Add it to the NEVER list with a
one-line rationale. The list is meant to grow — every leak prevented by it
justifies the maintenance cost.

When you redact a sentence during drafting, note the rule that triggered
the redaction in your post-write summary to the user. They can override, but
they should know what they're choosing to expose.