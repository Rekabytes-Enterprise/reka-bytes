# Reka Bytes

> **Reka** × **Bytes** — where creativity meets computer science fundamentals.
> Academy teaching people how to vibe code _properly_.

## Stack

| Layer       | Tech                                                       | Port     |
| ----------- | ---------------------------------------------------------- | -------- |
| Backend API | Hono + Prisma 7 + PostgreSQL 17 + Redis 7                  | **4300** |
| Frontend    | Next.js 16 / React 19 / Tailwind 4 / jotai / framer-motion | **4301** |
| Admin       | Next.js 16                                                 | **4302** |
| Shared      | zod schemas, types, error contract, theme tokens           | —        |
| E2E         | Playwright (video + screenshots)                           | —        |

Node 22 · pnpm 11.

## Quick start

```bash
# 1. Infrastructure only (postgres + redis)
docker compose up -d

# 2. Install
pnpm install

# 3. Database — copy .env.example → .env in packages/db first
pnpm db:migrate

# Admin login comes from packages/backend/.env (ADMIN_EMAIL / ADMIN_PASSWORD) — no seeding needed

# 4. Run apps — in separate terminals, from each package dir
cd packages/backend  && pnpm dev   # :4300
cd packages/frontend && pnpm dev   # :4301
cd packages/admin    && pnpm dev   # :4302
```

Each package owns its own `.env` — copy every `*.env.example` next to it.

## E2E

```bash
pnpm test:e2e   # videos + screenshots land in packages/e2e/artifacts/
```

## Docs

- [PRD](docs/development/PRD.md) — phased roadmap (Phase 0 → 5)
- [Design System](docs/development/DESIGN.md) — "Terminal Editorial" direction, HEX tokens, hooks spec
