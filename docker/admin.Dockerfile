# docker/admin.Dockerfile — Next.js admin console (standalone output).
# Build context = repository root (pnpm workspace).

FROM node:22-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Pin must match `packageManager` in the root package.json.
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# ── deps: install the whole workspace (frozen lockfile, cached layer) ────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
COPY packages/admin/package.json packages/admin/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/baml/package.json packages/baml/
COPY packages/e2e/package.json packages/e2e/
RUN pnpm install --frozen-lockfile

# ── build: standalone bundle ─────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app ./
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @reka-bytes/db generate
RUN pnpm --filter @reka-bytes/admin build

# ── runner: minimal standalone server ────────────────────────────────────────
FROM base AS runner
# HOSTNAME=0.0.0.0 is REQUIRED for the standalone server to accept connections
# from outside the container.
ENV NODE_ENV=production PORT=4302 HOSTNAME=0.0.0.0
WORKDIR /app
# NOTE: packages/admin has no public/ directory (nothing static to ship).
COPY --from=build --chown=node:node /app/packages/admin/.next/standalone ./
COPY --from=build --chown=node:node /app/packages/admin/.next/static ./packages/admin/.next/static
USER node
EXPOSE 4302
CMD ["node", "packages/admin/server.js"]
