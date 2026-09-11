# Deploy — GHCR images + Coolify

Pushing a version tag (`v0.1.0`, `v0.2.1`, …) runs
`.github/workflows/release.yml`, which builds three images and pushes them to
GHCR:

| Image                                              | Port | What                               |
| -------------------------------------------------- | ---- | ---------------------------------- |
| `ghcr.io/rekabytes-enterprise/reka-bytes-backend`  | 4300 | Hono API (tsx)                     |
| `ghcr.io/rekabytes-enterprise/reka-bytes-frontend` | 4301 | Next 16 student app (standalone)   |
| `ghcr.io/rekabytes-enterprise/reka-bytes-admin`    | 4302 | Next 16 admin console (standalone) |

Each tag produces: `v0.1.0`, `0.1.0`, `0.1`, and `latest`. First push creates
the GHCR packages **private** — make them public under repo → Packages if you
want anonymous pulls (Coolify pulls fine either way once authenticated).

## Releasing

```bash
git tag v0.1.0 && git push origin v0.1.0
```

## Coolify setup (3 × "Docker Image" resources)

Point each resource at its `:latest` (or pinned `0.1`) image and give it the
env vars below. Put all three in the same project/environment so they share a
network — the Next apps reach the backend through the `/api/*` rewrite proxy,
so `BACKEND_URL` must use the **Coolify-internal hostname** of the backend
resource (e.g. `http://reka-bytes-backend:4300`), never the public URL.

### backend (`reka-bytes-backend`)

| Var                                                             | Notes                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `PORT`                                                          | baked as 4300                                                                              |
| `DATABASE_URL`                                                  | e.g. `postgresql://…:5432/rekabytes?schema=public` (Coolify DB internal port)              |
| `REDIS_URL`                                                     | e.g. `redis://reka-redis:6379`                                                             |
| `JWT_SECRET`                                                    | `openssl rand -hex 32`                                                                     |
| `CORS_ORIGINS`                                                  | public origins, comma-separated (e.g. `https://app.example.com,https://admin.example.com`) |
| `RATE_LIMIT_PER_MINUTE`                                         | auth rate limit                                                                            |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`                 | admin seed creds (admin console login validates against these — no DB row)                 |
| `OPENROUTER_API_KEY` / `AI_MODEL` / `AI_TIMEOUT_MS` / `AI_MOCK` | AI Masterclass; see `packages/backend/.env.example`                                        |

Health check: `GET /health` → `{"data":{"status":"ok"}}`.

### frontend (`reka-bytes-frontend`) & admin (`reka-bytes-admin`)

| Var           | Notes                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `PORT`        | baked (4301 / 4302)                                                                                        |
| `BACKEND_URL` | `http://reka-bytes-backend:4300` — internal, the `/api/*` rewrite proxies there (cookies stay same-origin) |
| `LEG_*`       | operator identity for legal pages + footer — see `packages/frontend/.env.example` (frontend only)          |

Admin has no `LEG_*` vars. Health check for both: `GET /`.

## Database migrations

**Automatic since v0.1.2.** The backend image's CMD is `start.sh`, which runs
`prisma migrate deploy` on **every container start** before the server boots —
idempotent and forward-only, so first boot applies the full history and later
deploys are fast no-ops. No Coolify pre-deploy field, nothing to remember.

Manual fallback (if you ever need to run it by hand): Coolify → backend →
**Terminal** → `pnpm db:deploy`.

Skip-migrations symptom, for the record: every table-reading API 500s with
`P2021: The table public.<T> does not exist` while the backend itself is up.

## Domain layout

Use **distinct subdomains** for frontend vs admin (e.g. `app.example.com` /
`admin.example.com`). The session cookie `rb_session` is host-only, so
separate subdomains get separate cookie jars — this is the prod equivalent of
the local `localhost:4301` vs `127.0.0.1:4302` habit and prevents admin
sessions leaking into the student app.

## Image layout notes

- Base: `node:22-bookworm-slim` (glibc — required by `@boundaryml/baml`
  native bindings and Prisma engines; don't switch to alpine).
- Next apps run Next **standalone** (`output: 'standalone'` in next.config) —
  self-contained `server.js` + traced node_modules; `HOSTNAME=0.0.0.0` and
  `PORT` are baked in the image.
- Backend runs TS via `tsx` as PID 1 (graceful SIGTERM handled in app code);
  Prisma client is generated at image build (`packages/db/src/generated` is
  gitignored). `baml_client` is committed — no generation step needed.
- pnpm is baked via corepack (`pnpm@11.9.0` — keep in sync with root
  `packageManager` when bumping).
- If bumping pnpm/node versions: update `FROM` line + the two
  `corepack prepare` lines in all three `docker/*.Dockerfile`.
