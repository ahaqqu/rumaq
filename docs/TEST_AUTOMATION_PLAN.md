# Test Automation Plan

Automate testing of the rumaq API (Cloudflare Worker) and web app (React SPA) with a single Docker command, and run the same suite in GitHub Actions.

## Goal

- Run API integration + web E2E tests locally with `docker compose -f docker-compose.test.yml up --build --abort-on-container-exit`
- Run the same suite in GitHub Actions on every PR/push to main
- Run read-only smoke tests against the live `rumaq.pages.dev` on a schedule
- No host tool installation required beyond Docker

---

## Tools

| Purpose | Tool | Notes |
|---|---|---|
| Browser E2E | `@playwright/test` + official `mcr.microsoft.com/playwright` Docker image | Industry standard |
| API integration tests | Vitest + Node native `fetch` | Same runner as existing worker unit tests |
| Worker runtime / local D1 | Miniflare (programmatic API) | Already a dep of wrangler; full control over D1 lifecycle without a separate CLI process |
| Reverse proxy & static SPA serve | Official `nginx:alpine` | Handles same-origin routing for cookies |
| API container | Official `node:20-slim` | Trusted Node base |
| JWT for test auth | Re-export from `worker/src/auth.ts` (uses `jose` internally) | Avoids duplicating signing logic; tokens match production format |
| DB seed/reset | Miniflare `getD1Database().exec()` | No CLI process, no SQLite file lock contention |
| Orchestration | Docker Compose | Built into Docker |
| CI | GitHub Actions + `upload-artifact` | |
| Version sync | Script reads `@playwright/test` version from `package.json` | Ensures Docker image tag matches npm package |

---

## Architecture

### Docker services (`docker-compose.test.yml`)

1. **`api`** — `node:20-slim` running the Hono Worker via Miniflare's programmatic API.
   - Config: `worker/wrangler.test.toml` with `PAGES_ORIGIN=http://localhost:3000`, local D1/R2 bindings.
   - On startup: a Node script (`tests/support/worker-server.mjs`) creates a Miniflare instance, applies D1 migrations, executes `tests/fixtures/seed.sql`, then listens for HTTP requests at `http://0.0.0.0:8787`.
   - Healthcheck: Node fetch to `/api/health`.
   - Dockerfile: `docker/Dockerfile.api`.

2. **`web`** — multi-stage Docker build → `nginx:alpine` serving the Vite production build.
   - Stage 1: `node:20-slim` runs `npm ci && npm run build`.
   - Stage 2: `nginx:alpine` copies `dist/` and serves with SPA fallback.
   - Dockerfile: `docker/Dockerfile.web`.

3. **`proxy`** — `nginx:alpine` providing a single origin at `http://localhost:3000`.
   - `/api/*` → proxy pass to `api:8787`
   - `/*` → proxy pass to `web`
   - Same-origin eliminates CORS/cookie cross-domain issues.
   - Config: `docker/nginx.proxy.conf`.

4. **`test-runner`** — `mcr.microsoft.com/playwright:<version>-jammy` with root + worker npm deps installed.
   - Runs `npm run test:api` then `npm run test:e2e` against `http://proxy:3000`.
   - Exits with test status; `--abort-on-container-exit` stops all services.
   - Dockerfile: `docker/Dockerfile.test-runner`.

### Network

All services on a single Docker Compose network. `proxy` is the only service with published ports (`3000:3000`).

---

## Authentication in tests

- No Google OAuth flow is exercised in automated tests.
- `tests/fixtures/seed.sql` inserts a deterministic test user/household/settings with known IDs.
- Test helpers re-export `signJwt` from `worker/src/auth.ts` (which uses `jose` internally) — no duplicated signing logic, and test tokens match production format exactly.
- API tests: send cookie in headers (`Cookie: rumaq_session=<token>`).
- E2E tests: Playwright `context.addCookies` before navigating.

---

## Test layers

### 1. Unit tests (existing, unchanged)
- `npm test` (Vitest) in root (`src/**/*.test.{js,jsx}`) and `worker/` (`src/**/*.test.ts`).
- Run in CI as before. Optionally also inside Docker.

### 2. API integration tests (new)
- Location: `tests/api/*.test.js`
- Framework: Vitest + Node native fetch
- Config: `vitest.config.integration.mjs` with `include: ['tests/api/**/*.test.js']` and `envDir: './tests'` to load `tests/.env`.
- Endpoints:
  - `/api/health` — 200 + shape
  - `/api/me` — 401 without auth, 200 + shape with auth
  - `/api/stock` — 401 without auth, 200 + array with auth
- Helpers:
  - `tests/support/auth.js` — `signTestCookie()` re-exporting `signJwt` from `worker/src/auth.ts`
  - `tests/support/db.js` — `resetDb()`, `seedDb()` using Miniflare's `getD1Database().exec()`

### 3. Web E2E tests (new)
- Location: `tests/e2e/*.spec.js`
- Framework: Playwright
- Initial scope: main page smoke test (app shell renders, dashboard visible)
- Config: `playwright.config.js` with `baseURL: 'http://localhost:3000'`

---

## Test data lifecycle

- `tests/fixtures/seed.sql`: inserts deterministic test user, household, settings, locations, stock items.
- `tests/fixtures/reset.sql`: truncates all tables.
- Fresh database on every Docker Compose run (container-local volume).
- Reset via Miniflare's programmatic D1 API (`db.exec(sql)`) — no wrangler CLI involved, so no SQLite file lock contention.
- The `tests/support/db.js` helper calls `resetDb()` in `beforeAll` of each API test suite, then `seedDb()` — fully isolated and safe because Miniflare gives exclusive access to its D1 binding.

---

## Local usage

```bash
# Install Docker + Docker Compose (one-time)
# Run all tests:
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

### npm scripts (added to root `package.json`)

| Script | Command |
|---|---|
| `test:docker` | `docker compose -f docker-compose.test.yml up --build --abort-on-container-exit` |
| `test:api` | `vitest run --config vitest.config.integration.mjs` |
| `test:e2e` | `playwright test` |
| `test:seed` | `wrangler d1 execute rumaq --local --config worker/wrangler.test.toml --file tests/fixtures/seed.sql` |
| `test:reset` | `wrangler d1 execute rumaq --local --config worker/wrangler.test.toml --file tests/fixtures/reset.sql` |

Note: `test:seed` and `test:reset` use the wrangler CLI for local dev outside Docker. Inside Docker, seed/reset is handled by Miniflare's API in `tests/support/worker-server.mjs`.

---

## GitHub Actions

### 1. Test automation (PR/push to main) — `.github/workflows/test-automation.yml`

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
```

### 2. Production smoke tests (scheduled) — `.github/workflows/smoke.yml`

- Schedule: every 6 hours (`cron: '0 */6 * * *'`)
- Public checks (always run):
  - `GET https://rumaq.pages.dev/` — page loads
  - `GET https://api.rumaq.pages.dev/api/health` — 200
- Authenticated checks (only if `secrets.RUMAQ_PROD_SESSION` is set):
  - `GET /api/me` with `rumaq_session` cookie → 200 + shape
  - `GET /api/stock` with `rumaq_session` cookie → 200 + array shape
- On failure: create a GitHub Issue via `actions/github-script` or Slack notification.
- Token is stored as `RUMAQ_PROD_SESSION` repository secret; refreshed via a `workflow_dispatch` workflow or manually every ~30 days.

Rules for production smoke tests:
- Only `GET` requests.
- Assert status and response shape, **never exact values**.
- Use a dedicated test Google account with its own household.

---

## Implementation phases

### Phase 0 — Test environment files

Create:
- `worker/wrangler.test.toml` — local D1/R2 bindings, `PAGES_ORIGIN=http://localhost:3000`
- `worker/.dev.vars.test` — template with dummy OAuth/secret values (committed, gitignored path is `.dev.vars`)
- `tests/.env` — `TEST_BASE_URL=http://localhost:3000`, `TEST_JWT_SECRET`, deterministic user/household IDs
- `vitest.config.integration.mjs` — separate config with `include: ['tests/api/**/*.test.js']`, `envDir: './tests'`, and no coverage thresholds (integration tests don't count toward unit coverage)

### Phase 1 — Docker harness

Create:
- `docker/Dockerfile.api` — runs `node tests/support/worker-server.mjs`
- `docker/Dockerfile.web`
- `docker/Dockerfile.test-runner`
- `docker/nginx.proxy.conf`
- `docker/nginx.web.conf`
- `docker-compose.test.yml`
- `tests/support/worker-server.mjs` — creates Miniflare instance, applies migrations, seeds DB, starts HTTP server

### Phase 2 — Test data & helpers

Create:
- `tests/fixtures/seed.sql`
- `tests/fixtures/reset.sql`
- `tests/support/auth.js` — re-exports `signJwt` from `worker/src/auth.ts`; adds `signTestCookie()` convenience wrapper
- `tests/support/db.js` — `resetDb()`, `seedDb()` using Miniflare's programmatic D1 API (not wrangler CLI)

### Phase 3 — API integration tests

Create:
- `tests/api/health.test.js`
- `tests/api/me.test.js`
- `tests/api/stock.test.js`

### Phase 4 — Web E2E smoke test

Create:
- `playwright.config.js`
- `tests/e2e/smoke.spec.js`

### Phase 5 — npm scripts & GitHub Actions

Update:
- `package.json` — add scripts (`test:api` uses the integration vitest config)
- `.github/workflows/test-automation.yml` — Docker compose CI
- `.github/workflows/smoke.yml` — scheduled production smoke tests with `workflow_dispatch` support for token refresh

### Phase 6 — Acceptance criteria template

For each new feature:
- If it adds/modifies an API endpoint: add/update Vitest API test in `tests/api/`.
- If it adds/modifies a UI flow: add/update Playwright spec in `tests/e2e/`.
- E2E coverage must grow with features — a single smoke test is not sufficient long-term.
- Tests must pass in Docker and GitHub Actions before merge.

---

## Package additions

Root `package.json` devDependencies:
- `@playwright/test` (pinned to match Playwright Docker image tag)
- `playwright`

Worker `package.json` already includes `wrangler` (which brings in `miniflare`), `vitest`, `@vitest/coverage-v8`.

---

## Risks & notes

- **DB reset concurrency (resolved)**: Using Miniflare's programmatic D1 API (`getD1Database().exec()`) instead of `wrangler d1 execute` eliminates SQLite file lock contention entirely. Reset and seed can run before every test suite with no risk.
- **Playwright version sync**: The Docker image tag (e.g., `mcr.microsoft.com/playwright:v1.45.0-jammy`) must match `@playwright/test` npm version. The `Dockerfile.test-runner` should read the version from `package.json` (e.g., via `grep` or a build ARG from `docker-compose.test.yml`).
- **Auth token rotation**: Production smoke session token expires after 30 days. Add a `workflow_dispatch`-triggered workflow (in `smoke.yml`) that generates fresh tokens using OAuth client credentials, so rotation is a button click, not a manual process.
- **E2E scope**: Start with main page smoke only. E2E coverage must expand alongside features — the acceptance criteria template (Phase 6) enforces this per-feature.
- **No staging**: All mutable/stateful testing runs in local Docker only. Production tests are read-only.
- **Worker unit tests still use mocks**: The existing unit tests in `worker/src/__tests__/` mock D1 entirely. The new API integration tests in `tests/api/` are the layer that exercises real SQLite via Miniflare. Both are valuable and complementary.
