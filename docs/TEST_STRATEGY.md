# RumaQ — Testing Strategy

## Unit test

| Location                          | Runner | Environment | Coverage                |
| --------------------------------- | ------ | ----------- | ----------------------- |
| `frontend/src/**/*.test.{js,jsx}` | Vitest | jsdom       | 90/75/85/90             |
| `backend/src/**/*.test.ts`        | Vitest | Node        | 90/80/85/90 (D1 mocked) |

```
./scripts/test.sh unit
```

## Local automation test

All services behind `nginx` proxy at `localhost:3000`. Worker exposes `TEST_MODE`-guarded admin endpoints. Gherkin features + `jest-cucumber` for API, `playwright-bdd` for E2E. Run by Vitest + Playwright inside Docker.

```
./scripts/test.sh automation-local
```

## Live production automation test

Runs every 6 hours via `.github/workflows/smoke.yml`. Two base URLs: `rumaq.pages.dev` (frontend), `api.rumaq.workers.dev` (API). Run by Cucumber-js (API health) and Playwright (E2E login/logout). On failure → auto-creates issue with `smoke-failure` label.

```
./scripts/test.sh automation-live
```

## Acceptance criteria

- Meet unit tests coverages criteria
- New API endpoint → add scenario in `automation/tests/local/api/`
- New UI flow → add scenario in `automation/tests/local/e2e/`
- Must pass `./scripts/test.sh automation-local`
- API doc drift check: after adding or modifying backend routes, run `./scripts/docs.sh` and ensure `docs/API.md` is up to date. The CI `docs` job fails if `git diff --exit-code docs/API.md` is non-zero.
