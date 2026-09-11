#!/bin/sh
# Container entrypoint, ported from mokara's packages/backend/scripts/start.sh
# (PRD-07 §5.2): migrations run on EVERY backend start, before the server —
# idempotent and forward-only, so `prisma migrate deploy` is a fast no-op when
# the database is already current and applies the full history on first boot.
#
# Why baked in here instead of a Coolify pre-deploy field: it removes a manual
# step someone WILL forget (the v0.1.1 first deploy 500'd on every table query
# with P2021 until migrations were run by hand).
set -e

cd /app/packages/db
./node_modules/.bin/prisma migrate deploy

# exec so SIGTERM reaches tsx/Hono directly (graceful shutdown in app code).
cd /app/packages/backend
exec ./node_modules/.bin/tsx src/index.ts
