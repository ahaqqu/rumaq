# RumaQ — Testing Strategy

## Unit test

| Location | Runner | Environment | Coverage |
|----------|--------|-------------|----------|
| `frontend/src/**/*.test.{js,jsx}` | Vitest | jsdom | 90/75/85/90 |
| `backend/src/**/*.test.ts` | Vitest | Node | 90/80/85/90 (D1 mocked) |

```bash
npm test
npm run test -w frontend
npm run test -w backend
```

## Local automation test

All services behind `nginx` proxy at `localhost:3000`. Worker server exposes `TEST_MODE`-guarded admin endpoints (`/api/__test/reset`, `/api/__test/seed`).

```bash
npm run test:docker    # runs ./automation/scripts/test-local.sh
```

### API (`automation/tests/local/api/`)

Gherkin features + `jest-cucumber`, run by Vitest. Auth tokens signed via `signJwt` from `backend/src/auth.ts`. Email/password login tested with seed user `test@rumaq.dev` / `password123`.

```bash
npm run test:api
```

### E2E (`automation/tests/local/e2e/`)

Gherkin features + `playwright-bdd`, run by Playwright.

```bash
npm run test:e2e
```

## Live production automation test

Runs via `.github/workflows/smoke.yml` (every 6 hours) or `scripts/trigger-smoke.sh`. Two base URLs: `rumaq.pages.dev` (frontend), `api.rumaq.workers.dev` (API). On any failure → auto-creates issue with `smoke-failure` label.

### Health (`automation/tests/live/health/`)

Cucumber-js features + step definitions. Read-only `GET`:
- Public: frontend loads, `/api/health` returns `{ ok: true }`.
- Authenticated: passes `RUMAQ_PROD_SESSION` (GitHub secret, pre-obtained JWT) as `Cookie` header, asserts `/api/me` returns user, `/api/stock` returns array.

### E2E (`automation/tests/live/e2e/login.spec.js`)

Playwright: fills email form (`alice@rumaq.dev` / `password123`), clicks submit, verifies redirect + "Alice" visible, navigates to `/api/auth/logout`, verifies redirect back to login.

## Acceptance criteria

- New API endpoint → add scenario in `automation/tests/local/api/`
- New UI flow → add scenario in `automation/tests/local/e2e/`
- Must pass `npm run test:docker` and CI before merge
