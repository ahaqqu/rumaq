# Restructure Plan: Isolate Frontend & Backend

## Goal

Separate the current mixed-root layout into two top-level directories (`frontend/` and `backend/`) so each layer is independently manageable.

---

## Decisions (confirmed by user)

1. **Rename** `worker/` → `backend/`.
2. **Use npm workspaces** — root `package.json` becomes a workspace orchestrator.
3. **Keep `scripts/`, `automation/`, `docs/`, `.github/` at root** — they are cross-cutting.
4. **Keep `docs/` at root** — no per-layer docs split.

---

## Target file layout

```
rumaq/
├── frontend/                       # React + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.jsx
│   │   │   ├── Assistant.jsx
│   │   │   ├── icons.jsx
│   │   │   ├── ui.jsx
│   │   │   └── *.test.jsx
│   │   ├── context/
│   │   │   └── PersonaContext.jsx
│   │   ├── data/
│   │   │   ├── mock.js
│   │   │   └── mock.test.js
│   │   ├── i18n/
│   │   │   ├── index.js
│   │   │   ├── locales/
│   │   │   │   ├── en.json
│   │   │   │   └── id.json
│   │   │   └── __tests__/
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   ├── api.test.js
│   │   │   ├── persona.js
│   │   │   └── persona.test.js
│   │   ├── pages/
│   │   │   ├── AddFromReceipt.jsx
│   │   │   ├── History.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── Plan.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── *.test.jsx
│   │   ├── styles/
│   │   │   ├── base.css
│   │   │   ├── components.css
│   │   │   └── tokens.css
│   │   ├── App.jsx
│   │   ├── App.test.jsx
│   │   ├── main.jsx
│   │   ├── main.test.jsx
│   │   └── test-setup.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── vitest.config.js
├── backend/                        # Cloudflare Worker + Hono (renamed from worker/)
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── auth.test.ts
│   │   │   ├── index.test.ts
│   │   │   └── middleware.test.ts
│   │   ├── auth.ts
│   │   ├── index.ts
│   │   └── middleware.ts
│   ├── migrations/
│   │   └── 0001_schema.sql
│   ├── dist/                       # build output (gitignored)
│   ├── .dev.vars                   # local secrets (gitignored)
│   ├── .wrangler/                  # wrangler state (gitignored)
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── wrangler.toml.example
│   ├── wrangler.cloudflare.toml    # production config
│   └── wrangler.local.toml         # local dev config
├── scripts/
│   ├── deploy.sh                   # full-stack deploy & local dev
│   ├── deploy-cf.js                # Cloudflare API helpers
│   ├── setup-db.js                 # D1 database setup
│   └── trigger-smoke.sh            # trigger production smoke test
├── automation/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.test-runner
│   │   ├── nginx.proxy.conf
│   │   └── nginx.web.conf
│   ├── scripts/
│   │   ├── generate-test-report.js
│   │   ├── run-smoke-tests.sh
│   │   └── test-local.sh
│   ├── tests/
│   │   ├── fixtures/
│   │   │   ├── reset.sql
│   │   │   └── seed.sql
│   │   ├── live/health/
│   │   ├── local/api/
│   │   └── support/
│   │       ├── auth.js
│   │       ├── db.js
│   │       └── worker-server.mjs
│   ├── docker-compose.yml
│   ├── playwright.config.js
│   └── vitest.config.integration.mjs
├── docs/
│   ├── RESTRUCTURE_PLAN.md         # this file
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── TEST_STRATEGY.md
│   ├── PROJECT_PLAN.md
│   └── features/
│       ├── persona.md
│       └── internationalisation.md
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── smoke.yml
│       └── test-automation.yml
├── package.json                    # workspace root (orchestrator)
├── package-lock.json               # workspace lockfile (regenerated)
├── README.md
├── AGENTS.md
├── .env.example
├── .gitignore
├── .dockerignore
└── coverage/                       # generated (gitignored)
```

---

## File move list (use `git mv`)

| From | To | Reason |
|---|---|---|
| `src/` | `frontend/src/` | Frontend source |
| `index.html` | `frontend/index.html` | Frontend entry |
| `vite.config.js` | `frontend/vite.config.js` | Frontend build config |
| `vitest.config.js` | `frontend/vitest.config.js` | Frontend test config |
| `package.json` (root) | `frontend/package.json` | Frontend dependencies |
| `package-lock.json` (root) | `frontend/package-lock.json` | Frontend lockfile (will be replaced by workspace root lockfile) |
| `worker/` everything | `backend/` | Backend (rename directory) |

After moves, create a new root `package.json` (see below). The old root lockfile is discarded; `npm install` at root generates a fresh one.

---

## Root `package.json` (new orchestrator)

```json
{
  "name": "rumaq",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev -w frontend\" \"npm run dev -w backend\"",
    "build": "npm run build -w frontend",
    "preview": "npm run preview -w frontend",
    "test": "npm run test -w frontend && npm run test -w backend",
    "test:watch": "npm run test:watch -w frontend",
    "test:api": "vitest run --config automation/vitest.config.integration.mjs",
    "test:e2e": "bddgen --config automation/playwright.config.js && playwright test --config automation/playwright.config.js",
    "test:docker": "./automation/scripts/test-local.sh",
    "smoke": "./automation/scripts/run-smoke-tests.sh",
    "db:setup": "node scripts/setup-db.js",
    "deploy": "./scripts/deploy.sh",
    "deploy:frontend": "./scripts/deploy.sh frontend",
    "deploy:backend": "./scripts/deploy.sh backend",
    "deploy:dry-run": "./scripts/deploy.sh dry-run"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^13.0.0",
    "@playwright/test": "^1.61.1",
    "concurrently": "^9.1.2",
    "cloudflare": "^6.5.0",
    "esbuild": "^0.28.1",
    "jest-cucumber": "^4.5.0",
    "miniflare": "^4.20260630.0",
    "playwright-bdd": "^9.2.0",
    "vite": "^7.3.6",
    "vitest": "^4.1.9"
  }
}
```

Notes:
- `concurrently` is added at root for parallel dev servers.
- Shared dev tools (vite, vitest, playwright, cucumber, esbuild, miniflare, cloudflare) stay at root so all workspaces can use them.
- Frontend runtime deps (react, i18next, etc.) move to `frontend/package.json`.
- Backend runtime deps (hono, zod, etc.) stay in `backend/package.json`.

---

## `frontend/package.json`

Move the current root `package.json` into `frontend/package.json` with these changes:

- `"name": "rumaq"` → `"rumaq-frontend"`
- Remove workspace/orchestration scripts (`deploy*`, `test:api`, `test:e2e`, `test:docker`, `smoke`, `db:setup`)
- Keep only: `dev`, `build`, `preview`, `test`, `test:watch`
- Keep all current dependencies and devDependencies

Result:

```json
{
  "name": "rumaq-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@cucumber/pretty-formatter": "^4.0.0",
    "i18next": "^26.3.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-i18next": "^17.0.8"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.2",
    "@vitejs/plugin-react": "^4.7.0",
    "@vitest/coverage-v8": "^4.1.9",
    "jsdom": "^29.1.1"
  }
}
```

## `backend/package.json` adjustments

- `"name": "rumaq-worker"` → `"rumaq-backend"` (optional rename)
- `"db:create": "node ../scripts/setup-db.js"` — stays valid since scripts is at root
- Remove `"dependencies"` entries if they should live at root level (but backend deps are backend-specific, so keep)

---

## Cross-reference update table

Every file below must have its path references updated. Use the "from → to" values.

### Scripts

| File | What to change |
|---|---|
| `scripts/deploy.sh` | `WORKER_DIR` → `BACKEND_DIR`; all `worker/` paths → `backend/` (wrangler configs, migrations, `.dev.vars`, `cd worker`, `install_deps` cd block) |
| `scripts/setup-db.js` | `worker/migrations` → `backend/migrations`; `worker/wrangler.*.toml` → `backend/wrangler.*.toml`; `resolve('worker', ...)` → `resolve('backend', ...)` |
| `scripts/deploy-cf.js` | No path changes needed, but verify `putSecrets` script name `rumaq-api` is correct |

### Automation

| File | What to change |
|---|---|
| `automation/docker/Dockerfile.api` | `COPY worker/package.json` → `COPY backend/package.json`; `COPY worker/tsconfig.json` → `COPY backend/tsconfig.json`; `COPY worker/migrations/` → `COPY backend/migrations/`; `COPY worker/src/` → `COPY backend/src/`; `cd worker &&` in build step → `cd backend &&` |
| `automation/docker/Dockerfile.web` | `COPY index.html` → `COPY frontend/index.html`; `COPY vite.config.js` → `COPY frontend/vite.config.js`; `COPY src/` → `COPY frontend/src/` |
| `automation/docker/Dockerfile.test-runner` | `COPY worker/package.json` → `COPY backend/package.json`; `COPY worker/tsconfig.json` → `COPY backend/tsconfig.json`; `COPY worker/migrations/` → `COPY backend/migrations/`; `COPY worker/src/` → `COPY backend/src/`; `COPY src/` → `COPY frontend/src/`; `cd worker` in CMD block → `cd backend` |
| `automation/tests/support/worker-server.mjs` | `ROOT + '/worker'` → `ROOT + '/backend'`; all `resolve(WORKER_DIR, ...)` references |
| `automation/tests/support/auth.js` | `../../../worker/src/auth.ts` → `../../../backend/src/auth.ts` |
| `automation/vitest.config.integration.mjs` | No path changes — test file patterns are already relative to root |
| `automation/playwright.config.js` | No path changes — feature/steps paths are relative to config location |
| `automation/scripts/test-local.sh` | `ROOT_DIR` stays as `../..` from `automation/scripts/` — no change needed unless Dockerfile paths change reference |
| `automation/docker-compose.yml` | Docker build context is `..` (repo root) — no change needed; but verify services still reference correct Dockerfiles |

### CI/CD

| File | What to change |
|---|---|
| `.github/workflows/ci.yml` | `working-directory: worker` → `working-directory: backend` in `test-backend` job; `npm ci` in frontend job runs from root (workspace install); build job runs `npm run build` from root (workspace) |
| `.github/workflows/smoke.yml` | No path changes — smoke test runner references `automation/scripts/` directly |
| `.github/workflows/test-automation.yml` | No path changes — `test-local.sh` uses relative paths from its own location |

### Ignore files

| File | What to change |
|---|---|
| `.gitignore` | `worker/` → `backend/`; `worker/wrangler.toml` → `backend/wrangler.toml`; `worker/.dev.vars` → `backend/.dev.vars`; `worker/.wrangler` → `backend/.wrangler` |
| `.dockerignore` | `worker/` → `backend/`; `worker/.wrangler` → `backend/.wrangler`; `worker/.dev.vars` → `backend/.dev.vars`; `worker/wrangler.toml` → `backend/wrangler.toml` |

### Documentation

| File | What to change |
|---|---|
| `README.md` | Update repository layout diagram; replace `worker/` → `backend/` everywhere; replace `src/` → `frontend/src/`; update "Quick start" commands — `cd worker && npm run dev` → `npm run dev -w backend` or `cd backend && npm run dev`; update `cd worker && npm test` → `cd backend && npm test` |
| `docs/ARCHITECTURE.md` | Update section 3 "Repository layout" tree; update all `worker/` references throughout; update `src/` → `frontend/src/`; update CLI commands in deployment section (section 8) |
| `docs/TEST_STRATEGY.md` | Update `worker/src/**/*.test.ts` → `backend/src/**/*.test.ts`; update command `npm test` in `worker/` → `npm test` in `backend/` or `npm run test -w backend`; update all `worker/` path references |
| `docs/PROJECT_PLAN.md` | Update `worker/`, `src/` file references to `backend/` and `frontend/src/` |
| `AGENTS.md` | Update any path references if present |

### Files that need NO changes (relative paths stay valid)

| File | Reason |
|---|---|
| `backend/wrangler.local.toml` | `main = "src/index.ts"` is relative to `backend/` |
| `backend/wrangler.cloudflare.toml` | Same as above |
| `backend/tsconfig.json` | `"include": ["src/**/*.ts"]` is relative to `backend/` |
| `backend/vitest.config.ts` | `include: ['src/**/*.test.ts']` is relative to `backend/` |
| `frontend/vitest.config.js` | `include: ['src/**/*.test.{js,jsx}']` is relative to `frontend/` |
| `frontend/vite.config.js` | No hard-coded paths that need updating |
| `frontend/index.html` | `<script type="module" src="/src/main.jsx">` — Vite serves from project root (frontend/) |
| `src/lib/api.js` | `VITE_API_BASE` env var — not a file path |
| `src/context/PersonaContext.jsx` | No file-path imports to worker |

### Edge case to verify

| File | Question |
|---|---|
| `automation/tests/support/auth.js` | Does `../../../backend/src/auth.ts` resolve correctly from `automation/tests/support/`? Yes — from `automation/tests/support/`, `../..` goes to root, then `backend/src/auth.ts` is correct. |
| `automation/tests/support/worker-server.mjs` | Does `resolve(ROOT, 'backend/dist/index.mjs')` work? Yes, if `esbuild` output goes to `backend/dist/`. However `Dockerfile.api` builds `dist/index.mjs` inside `backend/`. The path from `worker-server.mjs` needs to match. |
| `scripts/setup-db.js` | `resolve('backend', 'migrations')` from root is correct. But the script also calls `wrangler d1 migrations apply` with `--config` pointing to `worker/wrangler.*.toml` — those must be updated. |

---

## Implementation steps (execution order)

### Step 1: Branch
```bash
git checkout -b restructure/frontend-backend-isolation
```

### Step 2: Rename worker → backend
```bash
git mv worker backend
```

### Step 3: Create frontend/ and move frontend files
```bash
mkdir frontend
git mv src frontend/
git mv index.html frontend/
git mv vite.config.js frontend/
git mv vitest.config.js frontend/
git mv package.json frontend/rumaq-frontend.json   # temporary rename to avoid conflict
git mv package-lock.json frontend/
```

### Step 4: Write new root package.json
Create root `package.json` as workspace orchestrator (see content above).

### Step 5: Finalize frontend/package.json
Move `frontend/rumaq-frontend.json` to `frontend/package.json` with the adjusted content.

### Step 6: Update all cross-reference files
Use the table above. Process in this order:
1. `.gitignore` and `.dockerignore`
2. `scripts/deploy.sh` and `scripts/setup-db.js`
3. All Dockerfiles
4. `automation/tests/support/worker-server.mjs` and `auth.js`
5. `.github/workflows/ci.yml`
6. `README.md` and all `docs/*.md`

### Step 7: Install and regenerate lockfile
```bash
rm package-lock.json
rm frontend/package-lock.json    # old root lockfile moved to frontend/
npm install
```

### Step 8: Validate
```bash
npm test                          # must pass
npm run build                     # must pass
./scripts/deploy.sh dry-run       # must pass
./automation/scripts/test-local.sh --build   # rebuild Docker images
./automation/scripts/test-local.sh           # run full Docker test suite (optional but recommended)
```

### Step 9: Commit and PR
```bash
git add -A
git commit -m "refactor: isolate frontend and backend into separate directories"
git push origin restructure/frontend-backend-isolation
```

Create a PR and verify CI passes before merging.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Git history lost on moves | Use `git mv` (not plain `mv`) to preserve rename tracking |
| CI breaks because npm workspaces install differently | Install `npm ci` only works with lockfile — use `npm install` or `npm ci --install-strategy=nested`; test locally first |
| Docker build context wrong after paths change | Dockerfiles use `COPY` with `..` context from `automation/docker/` — since context is repo root, paths are relative to root. Verify each `COPY` destination. `COPY package.json` without a leading subdir targets the root of the build context. After the move, `COPY frontend/package.json` is needed. |
| `worker-server.mjs` references `worker/` paths for bundled worker | Must update all path resolutions to `backend/` |
| `auth.js` imports `worker/src/auth.ts` via relative path | Update the `../../../worker/` → `../../../backend/` |
| Root package.json scripts no longer run correctly | All scripts updated to use npm workspace syntax (`-w frontend`, `-w backend`) or updated internal paths |
| npm workspace hoisting issues | Some packages may be hoisted differently. Check if any import breaks because a peer dependency is no longer resolvable. Add `nohoist` config if needed. |
| `miniflare` from root `node_modules` vs worker `node_modules` | With workspaces, root `node_modules` holds hoisted packages. Ensure miniflare is installed at root level (already in root devDependencies). |
| `@cloudflare/workers-types` used only in backend | Should stay in `backend/package.json` devDependencies, but also install it at root if needed for the workspace. Actually, workspace packages can depend on their own types — root hoists them if compatible. Types are dev-time only, so hoisting is fine. |
| Wrangler config `main = "src/index.ts"` fails because cwd is root | The `dev` and `deploy` scripts run from `backend/` (`npm run dev -w backend` runs in `backend/` directory). The wrangler config in `backend/` uses paths relative to `backend/`. |

## Rollback plan

If something goes wrong after the PR, revert with:

```bash
git revert <merge-commit>
```

Or if not yet merged, delete the branch and start over — no production impact.

---

## Test commands reference

After implementation, these commands must work:

```bash
# Install
npm install

# Run all tests
npm test

# Run frontend tests only
npm run test -w frontend

# Run backend tests only
npm run test -w backend

# Build frontend
npm run build

# Start dev servers
npm run dev

# Dry-run deploy
./scripts/deploy.sh dry-run

# Full Docker test suite
./automation/scripts/test-local.sh

# API integration tests only
npm run test:api

# E2E tests only
npm run test:e2e
```

---

## Files that must be read for context before implementation

Before making changes, read these files to understand the current state:

- `package.json` (root) — current scripts, deps
- `package-lock.json` (root) — current lockfile
- `src/lib/api.js` — frontend API client (env var reference)
- `worker/package.json` — backend deps
- `worker/wrangler.local.toml` — backend config
- `worker/wrangler.cloudflare.toml` — backend config
- `scripts/deploy.sh` — deployment orchestration
- `scripts/setup-db.js` — DB setup paths
- `automation/docker/Dockerfile.api` — backend Docker build
- `automation/docker/Dockerfile.web` — frontend Docker build
- `automation/docker/Dockerfile.test-runner` — test runner Docker build
- `automation/tests/support/worker-server.mjs` — test server paths
- `automation/tests/support/auth.js` — test auth import path
- `.github/workflows/ci.yml` — CI paths
- `.gitignore` — ignore patterns
- `.dockerignore` — docker ignore patterns
- `README.md` — project documentation
- `docs/ARCHITECTURE.md` — architecture documentation
- `docs/TEST_STRATEGY.md` — test strategy documentation
- `docs/PROJECT_PLAN.md` — project plan
- `AGENTS.md` — agent instructions
