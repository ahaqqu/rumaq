# RumaQ — Enable Cloudflare Workers Cache

## Goal

Enable Cloudflare Workers Cache for the **production** deployment only, using
the **gateway + named entrypoints** pattern (Option B).

Local development and tests do not need caching, but the new code must still run
locally without errors.

## Decision log

- **Pattern:** Option B — gateway entrypoint (cache OFF) + cached named
  entrypoints (`PublicApi`, `AuthenticatedApi`).
- **Production runtime:** Migrate the API from a Cloudflare Pages Function to a
  standalone Cloudflare Worker so per-entrypoint caching is supported.
- **Production URL:** `https://rumaq-api.<account>.workers.dev` (configure via
  `WORKER_URL` env var; custom domain can be added later).
- **Cross-version cache:** default (per-version cache isolation).
- **TTLs:**
  - Public endpoints: `Cache-Control: public, max-age=60, stale-while-revalidate=300`
  - Authenticated reads: `Cloudflare-CDN-Cache-Control: public, max-age=30, stale-while-revalidate=300` + `Cache-Control: private, max-age=0` for browsers.

## Why Option B + standalone Worker

- Workers Cache cache keys do **not** include the session cookie. Caching
  authenticated responses directly would leak data across users.
- The gateway entrypoint verifies the JWT session and then calls the cached
  `AuthenticatedApi` entrypoint with `ctx.props = { userId, householdId }`.
- `ctx.props` is part of the cache key, so each household/user gets isolated
  cached entries.
- `POST`/`PATCH`/`DELETE` are never cached by Workers Cache, so mutations are
  safe even when they pass through a cached entrypoint.
- A standalone Worker is the better long-term architecture: it separates the API
  from static hosting, gives full access to Workers features (Durable Objects,
  queues, service bindings), and provides dedicated observability.

## High-level architecture

```
Browser
  │
  ▼
Cloudflare Pages (rumaq.pages.dev) — static SPA assets only
  │
  └── API calls ──► Cloudflare Worker (rumaq-api.<account>.workers.dev)
                          │
                          ▼
                  [default entrypoint]  cache OFF
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
      /api/health    /api/auth/*   authenticated /api/*
    [PublicApi]      uncached      [AuthenticatedApi]
    cache ON         in gateway    cache ON
                                   keyed by ctx.props
```

## Cache header policy

Apply headers via middleware on each Hono sub-app. No per-route boilerplate.

| Sub-app | Routes | Headers |
|---|---|---|
| `PublicApi` | `/api/health`, `/api/auth/email-status` | `Cache-Control: public, max-age=60, stale-while-revalidate=300` |
| `AuthenticatedApi` | `/api/me`, `/api/stock`, all future protected GET reads | Edge: `Cloudflare-CDN-Cache-Control: public, max-age=30, stale-while-revalidate=300`<br>Browser: `Cache-Control: private, max-age=0` |
| Auth app / gateway | `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`, `/api/auth/email-login` | None; `Set-Cookie` responses bypass cache automatically |

Note: `Cloudflare-CDN-Cache-Control` has higher precedence than `Cache-Control`
and is consumed by Cloudflare. If production testing shows that `private` in
`Cache-Control` still causes a `BYPASS`, fall back to `Cache-Control: public,
max-age=30, stale-while-revalidate=300` for authenticated reads. The `ctx.props`
partitioning still keeps the data isolated.

## Backend file changes

### New / updated files

- `backend/src/types.ts`
  - Define `Env` bindings (`DB`, `RECEIPTS`, secrets, `ASSETS`, etc.).
  - Define `AuthProps = { userId: string; householdId: string }`.
  - Extend `Env` with `props?: AuthProps` so Hono can receive the gateway props.

- `backend/src/cors.ts`
  - Extract the existing CORS origin logic into a reusable helper used by all
    three Hono sub-apps.

- `backend/src/apps/public.ts`
  - Hono app for public routes.
  - Mounts `/api/health` and `/api/auth/email-status`.
  - CORS middleware.
  - Response middleware that adds the public `Cache-Control` header to
    successful `GET`/`HEAD` responses.

- `backend/src/apps/auth.ts`
  - Move the existing Google OAuth and email auth routes here.
  - CORS middleware.
  - No cache headers; `Set-Cookie` responses bypass automatically.

- `backend/src/apps/api.ts`
  - Hono app for authenticated routes.
  - CORS middleware.
  - `propsAuthMiddleware`: reads `c.env.props`, validates `userId` and
    `householdId`, sets Hono variables. Return `401` if props are missing.
  - Response middleware for authenticated `GET`/`HEAD` cache headers.
  - Move existing `/api/me` and `/api/stock` here; all future protected routes
    mount in this file.

- `backend/src/gateway.ts`
  - Default `fetch` export.
  - Routing logic:
    1. `OPTIONS` requests → return CORS preflight response.
    2. Public paths → `ctx.exports.PublicApi.fetch(request)`.
    3. `/api/auth/*` → run `authApp` directly (uncached).
    4. All other `/api/*` → verify JWT cookie, look up active household, then
       `ctx.exports.AuthenticatedApi.fetch(request, { props: { userId, householdId } })`.
    5. Non-API paths → `env.ASSETS.fetch(request)` fallback.

- `backend/src/entrypoints.ts`
  - `export class PublicApi extends WorkerEntrypoint<Env>`
    - Runs `publicApp.fetch(request, env, ctx)`.
  - `export class AuthenticatedApi extends WorkerEntrypoint<Env>`
    - Runs `apiApp.fetch(request, { ...env, props: this.ctx.props }, ctx)`.

- `backend/src/index.ts`
  - Re-export the default gateway and both named entrypoint classes.

### Removed / simplified

- The monolithic Hono app in `backend/src/index.ts` is split into the three
  sub-apps above.
- `backend/src/middleware.ts` cookie verification moves into the gateway; the
  `propsAuthMiddleware` replaces it inside `api.ts`.

## Wrangler configuration changes

Update **all four** backend Wrangler files with the same `compatibility_date`
and `[exports.*]` blocks so `ctx.exports` works locally and in tests. Only the
production file enables caching.

### `backend/wrangler.cloudflare.toml`

```toml
name = "rumaq-api"
main = "src/index.ts"
compatibility_date = "2026-07-10"
compatibility_flags = ["nodejs_compat"]
account_id = "85cd0e23088e12759d05b347f0f68536"

[vars]
PAGES_ORIGIN = "https://rumaq.pages.dev"

[[d1_databases]]
binding = "DB"
database_name = "rumaq"
database_id = "0591e773-0f1b-48c9-b931-8280a00b9068"

[[r2_buckets]]
binding = "RECEIPTS"
bucket_name = "rumaq-receipts"

[cache]
enabled = true

[exports.default]
type = "worker"

[exports.default.cache]
enabled = false

[exports.PublicApi]
type = "worker"

[exports.PublicApi.cache]
enabled = true

[exports.AuthenticatedApi]
type = "worker"

[exports.AuthenticatedApi.cache]
enabled = true
```

### `backend/wrangler.local.toml`, `backend/wrangler.test.toml`, `backend/wrangler.toml.example`

- Same `compatibility_date = "2026-07-10"`.
- Same `[exports.*]` blocks so the gateway pattern works locally and in tests.
- **Do not include** the top-level `[cache]` block (or set `enabled = false`).
- `wrangler.toml.example` should include the production `[cache]` block in a
  commented/annotated section as the recommended production config.

## Frontend and deployment changes

### `frontend/src/lib/api.js`

No code change required. It already uses `import.meta.env.VITE_API_BASE || ''`,
so passing `VITE_API_BASE` at build time is enough.

### `scripts/deploy.sh`

1. In `do_cloudflare`, call `deploy_worker()` **before** building the frontend.
2. Require or prompt for `WORKER_URL`, e.g.:
   ```bash
   WORKER_URL="${WORKER_URL:-https://rumaq-api.<account>.workers.dev}"
   ```
3. Build the frontend with the Worker URL:
   ```bash
   VITE_API_BASE="$WORKER_URL" npm run build -w frontend
   ```
4. Add a `put_worker_secrets()` step that sets secrets on the Worker:
   ```bash
   printf '%s' "$val" | npx wrangler secret put "$key" --config backend/wrangler.cloudflare.toml
   ```
5. Update `deploy_frontend()` to deploy only static assets to Pages. Remove the
   `_worker.js` bundling step. If SPA fallback is needed, add `_routes.json` or
   `_redirects` instead of relying on a Worker.

### Environment variables / secrets

The Worker needs the same bindings and secrets as the old Pages Function:

- Bindings: `DB`, `RECEIPTS`, `PAGES_ORIGIN`.
- Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `WORKER_JWT_SECRET`,
  `WORKER_ENCRYPTION_KEY`, `EMAIL_AUTH_ENABLED`.

`PAGES_ORIGIN` stays as the Pages production origin so CORS remains restricted.

## Testing plan

### Unit tests

- Update `backend/src/__tests__/index.test.ts`:
  - `/api/health` returns public cache headers.
  - `/api/auth/email-status` returns public cache headers.
  - `/api/me` and `/api/stock` return authenticated cache headers and do not
    leak data across different `ctx.props`.
  - Gateway routes public requests to `PublicApi`, authenticated requests to
    `AuthenticatedApi`, and auth routes to the uncached auth app.
- Update `backend/src/__tests__/middleware.test.ts`:
  - `propsAuthMiddleware` sets Hono variables from `env.props`.
  - Missing props returns `401`.

### Integration / E2E tests

- Run `npm run test:api` and `npm run test:e2e` after the refactor.
- Update any integration tests that directly imported the old monolithic `app`.

### Production verification

After deploy:

```bash
# Public endpoint should be MISS then HIT
curl -I "https://$WORKER_URL/api/health"
curl -I "https://$WORKER_URL/api/health"

# Authenticated endpoint: same user should be MISS then HIT
curl -I -b "rumaq_session=<user-a-token>" "https://$WORKER_URL/api/me"
curl -I -b "rumaq_session=<user-a-token>" "https://$WORKER_URL/api/me"

# Different user should be a separate cache entry (MISS, not user A's data)
curl -I -b "rumaq_session=<user-b-token>" "https://$WORKER_URL/api/me"
```

Check the `Cf-Cache-Status` response header for `HIT`, `MISS`, or `UPDATING`.

## Documentation updates

- `docs/ARCHITECTURE.md`
  - Update the request-flow diagram to show Pages → standalone Worker.
  - Add a "Caching" subsection explaining the gateway pattern and `ctx.props`
    isolation.
- `docs/API.md`
  - Note that public endpoints are cached and authenticated endpoints are cached
    per user/household.
- `backend/wrangler.toml.example`
  - Add the production `[cache]` and `[exports.*]` blocks with comments.
- `README.md`
  - Update deploy steps if the `WORKER_URL` env var or deploy command changes.

## Implementation order

1. Refactor backend into gateway + sub-apps + named entrypoints.
2. Update all Wrangler files (`compatibility_date`, `[exports.*]`, production
   `[cache]`).
3. Update backend tests for the new structure.
4. Update `scripts/deploy.sh` to deploy the standalone Worker and build the
   frontend with `VITE_API_BASE`.
5. Add Worker secret setup to `scripts/deploy.sh`.
6. Update documentation.
7. Deploy and verify with `curl -I`.
8. Open a PR.

## Fallback note

If during implementation you discover that Pages Functions can support the same
`[exports.*]` / `WorkerEntrypoint` pattern after all, the standalone Worker
migration can be skipped and the same backend code can run inside Pages. The
plan assumes that is not the case based on current Cloudflare documentation.
