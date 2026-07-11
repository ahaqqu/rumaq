# RumaQ

Household shopping & inventory assistant. Snap a receipt — stock updates. Know what's running out, where it is, and when it expires. AI builds a per-store shopping plan.

---

## For users

- **Track stock** — photo a receipt; items, prices, and store are read automatically.
- **Home dashboard** — items nearing expiry or running out within 3 days.
- **Shopping plans** — AI groups needs by store; check off as you buy.
- **Assistant** — ask for plans, recipes, or store recommendations.
- **Persona** — set roles ("I am the king, you are the warrior") and the app's tone and colour adapt. See [`docs/features/persona.md`](docs/features/persona.md).

### Quick start

1. Sign in with Google.
2. Add an AI key in **Settings** (OpenAI / Gemini / Anthropic / OpenCode).
3. Snap a receipt via **Add from receipt**.
4. Check the home page and ask the assistant for a plan.

---

## For developers

| Layer    | Technology                                                                              |
| -------- | --------------------------------------------------------------------------------------- |
| Frontend | React + Vite + TanStack Router + TanStack Query + Cloudflare Kumo UI → Cloudflare Pages |
| Backend  | Cloudflare Workers + Hono                                                               |
| Database | Cloudflare D1 (SQLite)                                                                  |
| Files    | Cloudflare R2                                                                           |
| Auth     | Google OAuth 2.0 + JWT                                                                  |
| AI       | BYO key proxied through the Worker                                                      |

### Quick start

```bash
./scripts/deploy.sh
```

Prepares config, dependencies, database, and build, then starts dev servers on `localhost:5173` / `:8787`. Idempotent from clean checkout.

> Before first run, edit `backend/.dev.vars` with real secrets (Google OAuth, JWT secret, encryption key).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full architecture, auth flow, and free-tier limits.

### Testing

```bash
./scripts/test-unit.sh             # unit tests (Vitest)
./scripts/test-automation-local.sh # integration + E2E in Docker (Miniflare + Playwright)
```

See [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md).

---

## For cloud ops

### Deploy

```bash
./scripts/deploy.sh cloudflare
```

Creates D1 database and R2 bucket if missing, deploys Worker and Pages. Idempotent. Prompts for `account_id` first time.

### Production smoke tests

A scheduled GitHub Actions workflow (`.github/workflows/smoke.yml`) verifies `rumaq.pages.dev` and `api.rumaq.workers.dev` every 6 hours — includes API health checks and a Playwright login/logout test via email form. On failure, a `smoke-failure` issue is auto-created.

```bash
./scripts/test-automation-live.sh
```

---

## Further docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — full-stack architecture
- [`docs/API.md`](docs/API.md) — REST API contract
- [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md) — testing strategy
- [`docs/features/persona.md`](docs/features/persona.md) — persona personalisation
- [`docs/features/internationalisation.md`](docs/features/internationalisation.md) — i18n
- [`backend/migrations/0001_schema.sql`](backend/migrations/0001_schema.sql) — D1 schema

## Agent skills

This project uses agent skills to keep complex workflows consistent. Invoke them with `/<skill-name>`.

| Skill | When to use | How to use | Benefit |
| ----- | ----------- | ---------- | ------- |
| `/pr-creation` | Creating or opening a pull request | Mention or invoke `/pr-creation` | Ensures a green gate, proper description, and review rules before submitting |
| `/guided-implementation` | Implementing a difficult or unclear plan from a markdown file | Invoke `/guided-implementation` with the plan file path | Confirms the high-level approach before coding and protects architecture decisions |

### `/pr-creation`

Use whenever creating a PR. It creates a branch, analyzes security and performance, runs the full gate (lint, style, tests), validates docs, and writes the PR description. See [`.commandcode/skills/pr-creation/SKILL.md`](.commandcode/skills/pr-creation/SKILL.md).

### `/guided-implementation`

Use when asked to implement a plan that may be ambiguous, cross-cutting, or architectural. It reads the plan, `docs/ARCHITECTURE.md`, and `docs/TEST_STRATEGY.md`; analyzes the plan critically; proposes a step-by-step implementation; and waits for your confirmation before deviating from the plan or making architecture changes. See [`.commandcode/skills/guided-implementation/SKILL.md`](.commandcode/skills/guided-implementation/SKILL.md).
