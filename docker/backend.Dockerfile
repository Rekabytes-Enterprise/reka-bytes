# docker/backend.Dockerfile — Hono API (tsx-run TS, no compile step).
# Build context = repository root (pnpm workspace).

FROM node:22-bookworm-slim AS base
# Debian slim keeps glibc — the @boundaryml/baml native binding and Prisma
# engines ship glibc builds; alpine/musl would gamble on platform support.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
# Pin must match `packageManager` in the root package.json.
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# ── build: install workspace, generate Prisma client ─────────────────────────
FROM base AS build
WORKDIR /app
# Manifests first — this layer caches across source-only changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/baml/package.json packages/baml/
COPY packages/e2e/package.json packages/e2e/
RUN pnpm install --frozen-lockfile
COPY . .
# Prisma client output (packages/db/src/generated) is gitignored → must be
# generated inside the image. baml_client is committed, so no BAML step.
RUN pnpm --filter @reka-bytes/db generate

# ── runner: full workspace (tsx is a devDep; prisma CLI kept so Coolify
#    pre-deploy can run `pnpm --filter @reka-bytes/db deploy`) ───────────────
FROM base AS runner
ENV NODE_ENV=production PORT=4300
WORKDIR /app
COPY --from=build /app ./
USER node
WORKDIR /app/packages/backend
EXPOSE 4300
# tsx as PID 1 — receives SIGTERM directly; the app handles graceful shutdown.
CMD ["node_modules/.bin/tsx", "src/index.ts"]
