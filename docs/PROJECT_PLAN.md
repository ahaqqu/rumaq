# RumaQ — Project Plan

This plan lists every known work item for RumaQ, its current status, and its priority. It does not include cost or time estimates.

## Legend

- **Status:**
  - `Done` — implemented and verified in this branch.
  - `Partial` — scaffold or design exists, but not fully functional end-to-end.
  - `Not started` — no code or design yet.
- **Priority:**
  - `P0` — required for MVP; blocks release.
  - `P1` — important; improves core value and trust.
  - `P2` — valuable; can ship after MVP.

---

## 1. Product foundation

| Item | Status | Priority | Notes |
|---|---|---|---|
| Product definition & design brief | Done | P0 | `.commandcode/design/brief.md` |
| Visual design system & CSS tokens | Done | P0 | `src/styles/tokens.css`, `base.css`, `components.css` |
| README for users and developers | Done | P0 | `README.md` |
| Full-stack architecture document | Done | P0 | `docs/ARCHITECTURE.md` |
| REST API contract | Done | P0 | `docs/API.md` |
| Contribution & coding guidelines | Not started | P2 | Add `CONTRIBUTING.md` and `AGENTS.md` |

## 2. Frontend (React + Vite)

| Item | Status | Priority | Notes |
|---|---|---|---|
| Vite + React project scaffold | Done | P0 | Existing prototype |
| Responsive app shell (rail + topbar + bottombar) | Done | P0 | `src/components/AppShell.jsx` |
| Home / overview dashboard | Done | P0 | `src/pages/Home.jsx` |
| Inventory list with search and filter | Done | P0 | `src/pages/Inventory.jsx` |
| Add stock from receipt (UI flow) | Done | P0 | `src/pages/AddFromReceipt.jsx`; currently mocked |
| Shopping plan UI | Done | P0 | `src/pages/Plan.jsx`; currently mocked |
| Purchase history UI | Done | P0 | `src/pages/History.jsx` |
| Settings UI (AI key, locations, motion, currency) | Done | P0 | `src/pages/Settings.jsx` |
| Persona personalization UI | Done | P0 | `src/pages/Settings.jsx` persona section |
| Persona copy transformation | Done | P0 | `src/lib/persona.js` `speak()` |
| Persona theme color generator | Done | P0 | `src/lib/persona.js` `applyTheme()` |
| AI assistant chat panel | Done | P0 | `src/components/Assistant.jsx`; currently mocked |
| API client module | Not started | P0 | Create `src/lib/api.js` with fetch helpers |
| Authentication UI (login / logout) | Not started | P0 | Redirect to `/api/auth/login`; show user avatar |
| Error boundaries and loading states | Partial | P1 | Skeletons exist; need global error handling |
| Offline / optimistic updates | Not started | P1 | Local-first feel, sync when online |
| PWA manifest & service worker | Not started | P2 | Installable app, offline caching |
| Push notifications | Not started | P2 | Expiry/run-out reminders |
| Mobile native wrappers (iOS/Android) | Not started | P2 | Future phase |

## 3. Backend (Cloudflare Workers + Hono)

| Item | Status | Priority | Notes |
|---|---|---|---|
| Worker project scaffold | Done | P0 | `worker/` with Hono, Wrangler config example |
| Google OAuth 2.0 login & callback | Partial | P0 | `worker/src/auth.ts`; needs real credentials and testing |
| JWT session cookie middleware | Partial | P0 | `worker/src/middleware.ts`; needs end-to-end test |
| CORS configuration | Partial | P0 | Configured for Pages origin + localhost |
| Health check endpoint | Done | P0 | `GET /api/health` |
| `GET /api/me` endpoint | Done | P0 | Returns current user |
| `GET /api/stock` endpoint | Partial | P0 | Basic query exists; needs full join with estimates |
| Stock CRUD endpoints (`PATCH /api/stock/:id`) | Not started | P0 | |
| Household endpoints | Not started | P0 | Create/list households, set active |
| Location endpoints | Not started | P0 | `GET/POST/DELETE /api/locations` |
| Store endpoints | Not started | P0 | `GET/POST/DELETE /api/stores` |
| Purchase endpoints | Not started | P0 | `GET/POST /api/purchases` |
| Receipt upload to R2 | Not started | P0 | `POST /api/purchases/scan` |
| Plan endpoints | Not started | P0 | `GET/POST /api/plans`, `POST /api/plans/generate` |
| Settings endpoints | Not started | P0 | `GET/PATCH /api/settings` |
| AI chat endpoint | Not started | P0 | `POST /api/ai/chat` with streaming |
| AI usage endpoint | Not started | P0 | `GET /api/ai/usage` |
| Input validation with Zod | Not started | P0 | Add to all routes |
| Centralized error handling | Not started | P1 | JSON error responses, logging |
| Rate limiting | Not started | P1 | Per-user AI and API limits |
| Request logging / observability | Not started | P2 | Structured logs, optional analytics |

## 4. Database (Cloudflare D1)

| Item | Status | Priority | Notes |
|---|---|---|---|
| Relational schema design | Done | P0 | `worker/migrations/0001_schema.sql` |
| Migration runner / setup script | Done | P0 | `scripts/setup-db.js` |
| Seed default locations & stores | Not started | P0 | Run after household creation |
| Run-out estimate computation | Not started | P0 | SQL/view or Worker logic from purchase history |
| Index tuning | Partial | P0 | Basic indexes in schema; validate with query patterns |
| Multi-household data isolation | Partial | P0 | Schema ready; enforce in all queries |
| Backup / export strategy | Not started | P2 | Periodic D1 export |

## 5. Authentication & security

| Item | Status | Priority | Notes |
|---|---|---|---|
| Google OAuth 2.0 integration | Partial | P0 | Code complete; needs secrets and live test |
| Session JWT signing | Partial | P0 | `worker/src/auth.ts`; verify key rotation story |
| Secure AI key encryption | Not started | P0 | AES-GCM with `WORKER_ENCRYPTION_KEY` |
| R2 signed URLs for receipts | Not started | P0 | Don't expose bucket directly |
| HTTPS-only cookies | Partial | P0 | Set `Secure`; verify on deployed domain |
| CORS restricted to Pages origin | Partial | P0 | Configured; verify in production |
| CSRF protection via OAuth state | Done | P0 | `state` + PKCE in `worker/src/auth.ts` |
| Row-level security review | Not started | P1 | Ensure every query filters by household |

## 6. AI features

| Item | Status | Priority | Notes |
|---|---|---|---|
| BYO AI key in settings | Done | P0 | UI exists; backend encryption pending |
| Receipt OCR → parsed items | Not started | P0 | Backend prompt + image proxy |
| Shopping plan generation | Not started | P0 | Low-stock + expiry + history → grouped plan |
| Assistant chat with system prompt | Not started | P0 | Include persona setting in prompt |
| Daily AI usage meter | Partial | P0 | UI exists; backend counter pending |
| Use-it-up expiry recipe nudge | Not started | P1 | Suggest recipes for near-expiry items |
| Cheapest-store recommendation | Not started | P1 | From price history; Haqita integration later |
| Consumption calibration | Not started | P1 | Detect actual vs estimated depletion |
| Natural-language quick add | Not started | P1 | Parse "beli 2L susu di Indomaret" |
| Trip optimization | Not started | P2 | Group plan by location/time |
| Price memory & alerts | Not started | P2 | Track price changes per store/product |

## 7. DevOps & deployment

| Item | Status | Priority | Notes |
|---|---|---|---|
| Cloudflare Pages deployment config | Partial | P0 | Vite build ready; need `wrangler pages deploy` |
| Cloudflare Worker deployment config | Partial | P0 | `worker/wrangler.toml.example`; user must copy and fill |
| D1 database creation guide | Done | P0 | `scripts/setup-db.js` + README |
| R2 bucket creation guide | Not started | P0 | Add to README or script |
| GitHub Actions CI | Not started | P1 | Build + typecheck on PR |
| Preview deployments for PRs | Not started | P1 | Cloudflare Pages preview branches |
| Secrets management documentation | Partial | P0 | Listed in `docs/ARCHITECTURE.md`; add step-by-step |
| Environment-specific configs | Not started | P1 | `.dev.vars` for local, secrets for prod |

## 8. Quality assurance

| Item | Status | Priority | Notes |
|---|---|---|---|
| Frontend production build | Done | P0 | `npm run build` passes |
| Worker TypeScript typecheck | Done | P0 | `npx tsc --noEmit` passes |
| Unit tests | Not started | P1 | Add Vitest for `src/lib/persona.js` |
| API integration tests | Not started | P1 | Test Worker routes with Miniflare |
| End-to-end tests | Not started | P2 | Playwright for critical flows |
| Accessibility audit | Not started | P1 | Keyboard navigation, contrast, labels |
| Performance budget | Not started | P2 | Bundle size, First Contentful Paint |

---

## Immediate next steps (recommended order)

1. **Set up live Cloudflare resources** (D1, R2, secrets) and verify Google OAuth end-to-end.
2. **Build the API client** on the frontend and replace mock data with real endpoints.
3. **Implement remaining CRUD endpoints** in the Worker with Zod validation.
4. **Encrypt and store AI keys**, then build the AI proxy endpoints.
5. **Add tests** for persona logic and core API routes.
