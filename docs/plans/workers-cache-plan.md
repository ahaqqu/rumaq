# RumaQ — Enable Cloudflare Workers Cache

## Goal

Enable Cloudflare Workers Cache for the **production** deployment only, using
the **gateway + single cached entrypoint** pattern.

Local development and tests do not need caching, but the new code must still run
locally without errors.

## Decision log

- **Pattern:** Gateway entrypoint (cache OFF) + single cached named entrypoint
  (`CachedApi`). Auth routes handled directly in the gateway; they never reach
  the cached entrypoint because the gateway routes by path first.
- **Production runtime:** Migrate the API from a Cloudflare Pages Function to a
  standalone Cloudflare Worker so per-entrypoint caching is supported.
- **Production URL:** `https://api.rumaq.workers.dev` (configure via
  `WORKER_URL` env var; custom domain can be added later).
- **Cross-version cache:** default (per-version cache isolation).
- **Cache headers per path:** branch on path within a single Hono app:
  - Public GET routes: `Cache-Control: public, max-age=60, stale-while-revalidate=300`
  - Authenticated GET reads: `Cloudflare-CDN-Cache-Control: public, max-age=30, stale-while-revalidate=300` + `Cache-Control: private, max-age=0`

## Why this approach

- Workers Cache cache keys do **not** include the session cookie. Caching
  authenticated responses directly would leak data across users.
- The gateway entrypoint verifies the JWT session and then calls the cached
  `CachedApi` entrypoint with `ctx.props = { userId, householdId }`.
- `ctx.props` is part of the cache key, so each household/user gets isolated
  cached entries. Requests without props (public routes) get a separate cache
  partition from requests with props.
- `POST`/`PATCH`/`DELETE` are never cached by Workers Cache, so mutations are
  safe even when they pass through a cached entrypoint.
- Auth routes (login, callback, logout, email-login) are handled directly in
  the gateway via `authApp.fetch()` — they never enter the cached entrypoint.
  Safety comes from path-based routing, not implicit cache bypass. Workers
  Cache does not have documented `Set-Cookie` auto-bypass behavior.
- A single cached entrypoint is simpler than splitting into public + auth
  sub-apps, while achieving the same cache isolation via `ctx.props`.
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
  └── API calls ──► Cloudflare Worker (api.rumaq.workers.dev)
                          │
                          ▼
                  [default entrypoint]  cache OFF
                          │
              ┌───────────┼────────────────┐
              ▼           ▼                ▼
        /api/auth/*   public GET      authenticated /api/*
        (handled      /api/health     (JWT valid)
         in gateway)  /api/auth/        │
        never enters   email-status      │
        CachedApi        │              │
              │          │              │
              ▼          ▼              ▼
                  [CachedApi entrypoint]  cache ON
                  keyed by ctx.props (absent = public, present = per-user)
```

Auth routes (`/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`,
`/api/auth/email-login`) are handled directly in the gateway via
`authApp.fetch()`. They never enter the cached entrypoint. No reliance on
implicit cache bypass.

## Cache header policy

Apply headers via Path-based middleware on the single Hono app. No per-route
boilerplate.

| Path pattern | Method | Headers |
|---|---|---|
| `/api/health`, `/api/auth/email-status` | GET | `Cache-Control: public, max-age=60, stale-while-revalidate=300` |
| `/api/me`, `/api/stock`, all future protected GET reads | GET | Edge: `Cloudflare-CDN-Cache-Control: public, max-age=30, stale-while-revalidate=300`<br>Browser: `Cache-Control: private, max-age=0` |
| Auth routes (handled in gateway) | GET/POST | None; never reach the cached entrypoint |

Note: `Cloudflare-CDN-Cache-Control` has higher precedence than `Cache-Control`
and is consumed by Cloudflare. If production testing shows that `private` in
`Cache-Control` still causes a `BYPASS`, fall back to `Cache-Control: public,
max-age=30, stale-while-revalidate=300` for authenticated reads. The `ctx.props`
partitioning still keeps the data isolated.

## Backend file changes

### New / updated files

- `backend/src/types.ts`
  - Define `Env` bindings (`DB`, `RECEIPTS`, secrets, etc.).
  - Define `AuthProps = { userId: string; householdId: string }`.
  - Extend `Env` with `props?: AuthProps` so Hono can receive the gateway props.

- `backend/src/cors.ts`
  - Extract the existing CORS origin logic into a reusable helper used by
    both the gateway and the `CachedApi` app.

- `backend/src/apps/auth.ts`
  - Move the existing Google OAuth and email auth routes here (extracted from
    `auth.ts`).
  - CORS middleware (reused via `cors.ts`).
  - No cache headers; never reaches the cached entrypoint.

- `backend/src/apps/api.ts`
  - **Single** Hono app for all cached routes (public + authenticated).
  - CORS middleware.
  - `propsAuthMiddleware`: reads `c.env.props`, validates `userId` and
    `householdId` when props are present, sets Hono variables. If props are
    missing, the request is treated as a public route — no auth required.
    Return `401` if the path requires auth but props are missing.
  - Response middleware that branches on path:
    - Public paths (`/api/health`, `/api/auth/email-status`): `Cache-Control: public, max-age=60`
    - Authenticated paths: `Cloudflare-CDN-Cache-Control: public, max-age=30` + `Cache-Control: private, max-age=0`
  - Mount existing `/api/me`, `/api/stock`, `/api/health`,
    `/api/auth/email-status` routes here; all future routes mount in this file.

- `backend/src/gateway.ts`
  - Default `fetch` export.
  - Routing logic:
    1. `OPTIONS` requests → return CORS preflight response (via `cors.ts`).
    2. Auth paths (`/api/auth/login`, `/api/auth/callback`,
       `/api/auth/logout`, `/api/auth/email-login`) → run `authApp.fetch()`
       directly (uncached; handled by gateway routing, never cached).
    3. All other `/api/*` → verify JWT cookie, look up active household, then
       `ctx.exports.CachedApi.fetch(request, { ...env, props: { userId, householdId } })`.
    4. Public `/api/health` and `/api/auth/email-status` → also go through
       step 3 but without JWT; the gateway passes no `props` and `CachedApi`
       handles them as public routes.
    5. Non-API paths → `env.ASSETS.fetch(request)` fallback.

- `backend/src/entrypoints.ts`
  - `import { WorkerEntrypoint } from "cloudflare:workers"`
  - `export class CachedApi extends WorkerEntrypoint<Env>`
    - Runs `apiApp.fetch(request, env, ctx)`.
    - `env.props` is set by the gateway when calling via `ctx.exports`.
  - Note: The `cloudflare:workers` import is a Workers runtime module. The
    esbuild Docker build handles it (existing `sed` fix in Dockerfile.api still
    applies). Unit tests that import `entrypoints.ts` need the module mocked
    (but tests can avoid this by testing `apiApp` directly via `app.request()`).

- `backend/src/index.ts`
  - Re-export the default gateway and the `CachedApi` entrypoint class.

### Files that stay

- `backend/src/auth.ts`
  - Auth helper utilities (JWT sign/verify, password hashing, etc.) stay.
  - The `authApp` Hono instance stays but moves the route definitions to
    `backend/src/apps/auth.ts` (or stays in `auth.ts` if preferred and is
    imported by the gateway).

### Removed / simplified

- The monolithic Hono app in `backend/src/index.ts` is split into the gateway,
  `CachedApi` entrypoint, and the `authApp` helper.
- `backend/src/middleware.ts` cookie verification moves into the gateway; the
  `propsAuthMiddleware` replaces it inside `api.ts`.

### Gateway routing logic

```
if (method === 'OPTIONS') → cors preflight

if (path starts with '/api/') {
  // Auth routes: always handled in gateway, never reach cached entrypoint
  if (path is auth route) → return authApp.fetch(request, env, ctx)

  // All other API routes: verify JWT, dispatch to CachedApi with/without props
  token = getCookie(request, 'rumaq_session')
  if (token) {
    userId, householdId = await verifySession(token, env)
    if (userId) {
      return ctx.exports.CachedApi.fetch(request, { ...env, props: { userId, householdId } })
    }
  }
  // No valid JWT — still dispatch through CachedApi without props
  // (handles public routes like /api/health and /api/auth/email-status)
  return ctx.exports.CachedApi.fetch(request, { ...env })
}

// Non-API
return env.ASSETS.fetch(request)
```

This avoids accidentally routing authenticated users' auth requests
(e.g. POST /api/auth/logout with a valid cookie) through CachedApi.

## Wrangler configuration changes

Update **all four** backend Wrangler files with the same `compatibility_date`
and `[exports.*]` blocks so `ctx.exports` works locally and in tests. Only the
production file enables caching.

### `backend/wrangler.cloudflare.toml`

```toml
name = "api"
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

[exports.CachedApi]
type = "worker"

[exports.CachedApi.cache]
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
   WORKER_URL="${WORKER_URL:-https://api.rumaq.workers.dev}"
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
  - Gateway routes public requests through `CachedApi` without props,
    authenticated requests through `CachedApi` with props, and auth routes
    through the gateway's `authApp`.
- Update `backend/src/__tests__/middleware.test.ts`:
  - `propsAuthMiddleware` sets Hono variables from `env.props`.
  - Missing props returns `401`.
  - Missing props on a public route returns success.

### BDD / Integration test infrastructure changes

The refactored backend exports named entrypoint classes (`CachedApi`) in
addition to the default gateway. The test infrastructure needs updates to
support this.

#### `automation/tests/support/worker-server.mjs`

**Current:** Creates a Miniflare instance programmatically without a wrangler
config. Calls `mf.dispatchFetch()` which only invokes the default export.

**Required change:** Miniflare must know about the `CachedApi` named entrypoint
so `ctx.exports.CachedApi.fetch()` works inside the gateway. Two options:

**Decision: Option A (TEST_MODE short-circuit).** The test-mode short-circuit
is the primary approach. If Miniflare later gains solid named-entrypoint
support, we can switch to Option B and drop the `TEST_MODE` branch. Production
is verified separately via the `curl -I` smoke tests (see "Production
verification" below) — the `Cf-Cache-Status` header confirms real Workers Cache
behavior, which Miniflare can't reproduce anyway.

#### `automation/docker/Dockerfile.api`

No changes needed to the build step itself (`npx esbuild src/index.ts ...`) —
the new `src/index.ts` re-exports the gateway and `CachedApi` class, and
esbuild bundles them correctly. The `sed` fix for `cloudflare:workers` still
applies.

#### `automation/tests/support/auth.js`

No change required. It imports `{ signJwt }` from `../../../backend/src/auth.ts`.
`auth.ts` keeps its utility exports (`signJwt`, `verifyJwt`, etc.) — only route
definitions move.

#### `automation/tests/support/db.js`

No change required. Test admin endpoints (`/api/__test/reset`, `/api/__test/seed`)
are intercepted by `worker-server.mjs` before reaching the worker.

### BDD feature/scenario additions

Add cache header scenarios to existing API feature files:

**`automation/tests/local/api/features/health.feature`** — add:

```gherkin
Scenario: Health check returns public cache headers
  Given the API is running
  When I send a GET request to /api/health
  Then the response status should be 200
  And the response should have public cache headers with max-age=60
```

**`automation/tests/local/api/features/me.feature`** — add:

```gherkin
Scenario: Authenticated response has per-user cache headers
  Given the database has seed data
  And I am authenticated as a test user
  When I send a GET request to /api/me
  Then the response status should be 200
  And the response should have authenticated cache headers

Scenario: Different users get isolated cache entries
  Given the database has seed data
  And I am authenticated as "test@rumaq.dev"
  When I send a GET request to /api/me
  Then the Cf-Cache-Status should be "MISS" for a fresh request

  Given I am authenticated as "alice@rumaq.dev"
  When I send a GET request to /api/me
  Then the Cf-Cache-Status should be "MISS" (different user = different cache key)
```

**`automation/tests/local/api/features/stock.feature`** — add:

```gherkin
Scenario: Authenticated stock response has per-user cache headers
  Given the database has seed data
  And I am authenticated as a test user
  When I send a GET request to /api/stock
  Then the response status should be 200
  And the response should have authenticated cache headers
```

### Step definition updates

**`automation/tests/local/api/steps/helpers.js`** — add assertion methods:

```js
expectPublicCacheHeaders() {
  const cc = this.response.headers.get('Cache-Control') || ''
  expect(cc).toMatch(/public/)
  expect(cc).toMatch(/max-age=60/)
}

expectAuthenticatedCacheHeaders() {
  const cdnCC = this.response.headers.get('Cloudflare-CDN-Cache-Control') || ''
  expect(cdnCC).toMatch(/public/)
  expect(cdnCC).toMatch(/max-age=30/)
  const cc = this.response.headers.get('Cache-Control') || ''
  expect(cc).toMatch(/private/)
  expect(cc).toMatch(/max-age=0/)
}

expectCfCacheStatus(expected) {
  const status = this.response.headers.get('Cf-Cache-Status') || ''
  expect(status).toBe(expected)
}
```

### Existing integration / E2E tests

- Run `npm run test:api` and `npm run test:e2e` after the refactor.
- The existing scenarios (health, me, stock, auth) should pass without
  modification — the API contract is unchanged, only cache headers are added.
- No integration tests directly import the monolithic `app` — they all go
  through HTTP `fetch()`.

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

# Auth routes should bypass cache (no Cf-Cache-Status header)
curl -I "https://$WORKER_URL/api/auth/login"  # expects 302, Set-Cookie
```

Check the `Cf-Cache-Status` response header for `HIT`, `MISS`, or `UPDATING`.

## Documentation updates

- `docs/ARCHITECTURE.md`
  - Update the request-flow diagram to show Pages → standalone Worker.
  - Add a "Caching" subsection explaining the gateway pattern, `ctx.props`
    isolation, and path-based auth route separation.
- `docs/API.md`
  - Note that public endpoints are cached and authenticated endpoints are cached
    per user/household.
- `backend/wrangler.toml.example`
  - Add the production `[cache]` and `[exports.*]` blocks with comments.
- `README.md`
  - Update deploy steps if the `WORKER_URL` env var or deploy command changes.

## Error responses

The `onError` handler in `api.ts` must set `Cache-Control: private, no-cache` on
error responses. Without explicit cache headers, Workers Cache may cache a 500
response and serve it to subsequent requests until the TTL expires.

## Design decisions

### Cache invalidation on writes: tag-based purge

When a user performs a write, the cached GET for that user is stale up to 30s.
The chosen approach is **tag-based purge on writes**:

- Add `Cache-Tag: user:<userId>, household:<householdId>` to cached GET responses.
- On write, call `ctx.cache.purge({ tags: [...] })` from inside the `CachedApi`
  entrypoint (purge is scoped to the owning entrypoint).
- Write handlers that touch cached data call back through the `CachedApi`
  entrypoint to trigger the purge.

### Deploy-time cache invalidation: skip

The blog states "Cross-version cache: default (per-version cache isolation)."
Assuming Workers Cache truly keys on version, old cached responses invalidate
automatically on deploy. No explicit purge on deploy — if it turns out version
isolation doesn't hold, we add a `wrangler deploy --purge` then.

### Tracking-parameter cache fragmentation: normalize in gateway

Strip known tracking params (`utm_*`, `fbclid`, `gclid`, etc.) from the URL
before forwarding to `CachedApi`. Implemented as a lightweight URL middleware
in the gateway. Collapses tracking URLs into a single cache entry.

## Implementation order

1. Refactor backend into gateway + `CachedApi` entrypoint + `authApp` helper.
2. Update all Wrangler files (`compatibility_date`, `[exports.*]`, production
   `[cache]`).
3. Update backend unit tests for the new structure.
4. Update BDD test infrastructure:
   - Update `worker-server.mjs` Miniflare config for named entrypoints.
   - Add cache header assertion helpers to `helpers.js`.
   - Add cache header scenarios to feature files + step definitions.
5. Run `npm run test:api` and `npm run test:e2e` to verify tests pass.
6. Update `scripts/deploy.sh` to deploy standalone Worker and build frontend
   with `VITE_API_BASE`. Add Worker secret setup.
7. Update documentation (`ARCHITECTURE.md`, `API.md`, `wrangler.toml.example`,
   `README.md`).
8. Deploy and verify with `curl -I`.
9. Open a PR.
