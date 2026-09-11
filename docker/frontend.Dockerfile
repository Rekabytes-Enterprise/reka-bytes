# docker/frontend.Dockerfile — Next.js student app (standalone output).
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
# Keep workspace state consistent (the frontend only imports shared, but the
# generated prisma client must exist for install/importers to resolve).
RUN pnpm --filter @reka-bytes/db generate
RUN pnpm --filter @reka-bytes/frontend build

# ── runner: minimal standalone server ────────────────────────────────────────
FROM base AS runner
# HOSTNAME=0.0.0.0 is REQUIRED for the standalone server to accept connections
# from outside the container.
ENV NODE_ENV=production PORT=4301 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/packages/frontend/public ./packages/frontend/public
COPY --from=build --chown=node:node /app/packages/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/packages/frontend/.next/static ./packages/frontend/.next/static
USER node
EXPOSE 4301
CMD ["node", "packages/frontend/server.js"]
