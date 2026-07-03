# RumaQ — Testing Strategy

RumaQ has three test layers, each with a distinct purpose and runner.

## Unit tests (Vitest)

Two separate Vitest projects:

- **Frontend** (`src/**/*.test.{js,jsx}`) — jsdom environment, coverage thresholds 90/75/85/90.
- **Worker** (`worker/src/**/*.test.ts`) — Node environment, 100% coverage threshold. D1 is mocked entirely.

Run with `npm test` (frontend) or `npm test` in `worker/` (backend). These run in the existing `ci.yml` workflow.

## Integration & E2E tests (Docker)

The test automation layer runs the same way locally and in CI via a single Docker Compose command:

```bash
npm run test:docker
```

Which runs `./automation/scripts/test-local.sh` — the full orchestration script.

Four services are orchestrated:

| Service | Image                                      | Role                                                          |
|---------|--------------------------------------------|---------------------------------------------------------------|
| `api`   | `node:22-slim`                             | Hono Worker via Miniflare's programmatic API, local D1/R2, seeded DB |
| `web`   | `nginx:alpine` (multi-stage build)         | Production Vite build served with SPA fallback                |
| `proxy` | `nginx:alpine`                             | Single origin at `localhost:3000`; `/api/*` → api, `/*` → web |
| `test-runner` | `mcr.microsoft.com/playwright`       | Runs API tests then Playwright E2E against the proxy          |

The same-origin proxy eliminates CORS/cookie cross-domain issues. The worker-server (`automation/tests/support/worker-server.mjs`) creates the Miniflare instance, applies migrations, seeds the database, and exposes test-only admin endpoints (`/api/__test/reset`, `/api/__test/seed`) — guarded by `TEST_MODE=true` so they never exist in production. Integration test helpers call these endpoints over HTTP for per-suite DB isolation.

### API integration tests

Written in Gherkin (`.feature` files) with `jest-cucumber` step definitions at `automation/tests/local/api/steps/*.steps.js`. Run by Vitest against the running stack. Reset + seed before each scenario via the admin endpoints. Auth is handled by re-exporting `signJwt` from `worker/src/auth.ts`, so test tokens match the production JWT format exactly. Run in isolation with:

```bash
npm run test:api
```

### Web E2E tests

Written in Gherkin with `playwright-bdd` step definitions at `automation/tests/local/e2e/features/*.feature`. Playwright against the proxy origin. Initial scope is a smoke test (app shell renders). E2E coverage must expand with features — every new UI flow should add or update a spec. Run with:

```bash
npm run test:e2e
```

## Production smoke tests

A scheduled GitHub Actions workflow (`.github/workflows/smoke.yml`) hits the live `rumaq.pages.dev` every 6 hours with read-only `GET` requests:

- Public: frontend loads, `/api/health` returns 200.
- Authenticated (when `RUMAQ_PROD_SESSION` secret is set): `/api/me` and `/api/stock` return 200 with the expected shape.

Smoke tests assert status and shape only — never exact values. On failure, a GitHub issue is auto-created with the `smoke-failure` label.

The smoke runner lives at `automation/scripts/run-smoke-tests.sh`. To trigger the workflow from a dev machine, use `scripts/trigger-smoke.sh`.

## Acceptance criteria for new features

- Adds or modifies an API endpoint → add/update a Vitest integration step in `automation/tests/local/api/`.
- Adds or modifies a UI flow → add/update a Playwright BDD feature + steps in `automation/tests/local/e2e/`.
- All tests must pass in Docker (`npm run test:docker`) and in CI before merge.
