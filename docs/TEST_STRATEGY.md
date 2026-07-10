# RumaQ — Testing Strategy

## Unit tests (Vitest)

| Location | Environment | Coverage |
|----------|-------------|----------|
| `frontend/src/**/*.test.{js,jsx}` | jsdom | 90/75/85/90 |
| `backend/src/**/*.test.ts` | Node | 90/80/85/90 (D1 mocked) |

```bash
npm test                      # all workspaces
npm run test -w frontend
npm run test -w backend
```

## Integration & E2E (Docker)

```bash
npm run test:docker    # runs ./automation/scripts/test-local.sh
```

Four services behind `nginx` proxy at `localhost:3000`:

| Service | Role |
|---------|------|
| `api` | Miniflare (Hono Worker), local D1/R2, seeded DB |
| `web` | Production Vite build, nginx |
| `proxy` | `/api/*` → api, `/*` → web |
| `test-runner` | Runs API tests then Playwright E2E |

Worker server exposes `TEST_MODE`-guarded admin endpoints (`/api/__test/reset`, `/api/__test/seed`) for per-suite DB isolation.

### API tests (`automation/tests/local/api/`)

Gherkin features + `jest-cucumber` steps, run by Vitest. Auth tokens signed via `signJwt` from `backend/src/auth.ts` (matches production format). Email/password login tested against `/api/auth/email-login` with seed user `test@rumaq.dev` / `password123`.

```bash
npm run test:api
```

### E2E tests (`automation/tests/local/e2e/`)

Gherkin features + `playwright-bdd` steps, run by Playwright against `localhost:3000`.

```bash
npm run test:e2e
```

## Production smoke tests

GitHub Actions workflow `.github/workflows/smoke.yml` — runs every 6 hours. Uses two base URLs: `ctx.base` (frontend at `rumaq.pages.dev`) and `ctx.apiBase` (API at `api.rumaq.workers.dev`).

### API health (`automation/tests/live/health/`)

Read-only `GET` requests:
- Public: frontend loads, `/api/health` returns `{ ok: true }`.
- Authenticated: passes `RUMAQ_PROD_SESSION` (GitHub secret, pre-obtained JWT) as `Cookie` header, asserts `/api/me` returns a user object and `/api/stock` returns an array.

On failure → auto-creates GitHub issue with `smoke-failure` label.

### Login/logout (`automation/tests/live/e2e/login.spec.js`)

Playwright spec: navigates to app, fills email form (`alice@rumaq.dev` / `password123`), clicks submit, verifies redirect + "Alice" visible, navigates to `/api/auth/logout`, verifies redirect back to login page.

```bash
npx playwright test --config automation/playwright.live.config.js
```

Trigger smoke workflow: `scripts/trigger-smoke.sh`

## Acceptance criteria

- New API endpoint → add scenario in `automation/tests/local/api/`
- New UI flow → add scenario in `automation/tests/local/e2e/`
- Must pass `npm run test:docker` and CI before merge
