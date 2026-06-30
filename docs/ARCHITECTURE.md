# RumaQ — Full-Stack Architecture

This document describes the production architecture for RumaQ on Cloudflare's free tier. It is designed for a single household (MVP) but keeps the data model ready for multi-household expansion.

## 1. Goals & constraints

- **Low friction.** Users photograph receipts; the system infers stock. Manual logging is a fallback, never the default.
- **Cheap to run.** Everything sits on Cloudflare's free tier (Pages, Workers, D1, R2).
- **Privacy first.** Users bring their own AI key. The backend stores it encrypted and only uses it on their behalf.
- **Fast and local-feeling.** The API edge is close to users; the UI stays optimistic and shows loading states that name the work.

## 2. High-level stack

| Layer | Service | Role | Free-tier limit |
|---|---|---|---|
| Frontend | Cloudflare Pages | Hosts the React + Vite SPA | Unlimited requests, 500 builds/mo |
| API | Cloudflare Workers | Hono HTTP API, auth, AI proxy | 100,000 requests/day |
| Database | Cloudflare D1 | Relational SQLite database | 500 MB storage, 100,000 queries/day |
| Files | Cloudflare R2 | Receipt image storage | 10 GB storage, 10 M reads/mo |
| Cache/metadata | Cloudflare KV (optional) | Rate-limit counters, AI usage windows | 1 GB, 100,000 reads/day |
| Auth | Google OAuth 2.0 | SSO login, managed inside the Worker | Free |
| AI | OpenAI / Gemini / Anthropic / OpenCode | External LLM calls proxied through the Worker | User's own billing |

## 3. Repository layout

```
rumaq/
├── src/                    # React SPA (Pages)
│   ├── pages/              # Home, Inventory, Plan, History, Settings
│   ├── components/         # AppShell, Assistant, UI primitives
│   ├── lib/                # API client, persona engine, helpers
│   └── styles/             # CSS tokens and components
├── worker/                 # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts        # Hono app entrypoint
│   │   ├── auth.ts         # Google OAuth 2.0 + JWT sessions
│   │   ├── middleware.ts   # auth, household context
│   │   └── __tests__/      # Worker tests
│   ├── migrations/         # D1 schema migrations
│   ├── wrangler.local.toml # Local dev config
│   ├── wrangler.cloudflare.toml # Production config
│   └── wrangler.toml.example # Template
├── scripts/                # Setup and deployment scripts
└── docs/
    ├── ARCHITECTURE.md     # this file
    ├── API.md              # REST API contract
    └── PROJECT_PLAN.md     # work items and PR plan
```

## 4. Request flow

```
User browser
    │
    ▼
Cloudflare Pages (rumaq.pages.dev)
    │
    ├── static assets (CSS, JS, icons)
    └── API calls ───────────────► Cloudflare Worker (api.rumaq.pages.dev)
                                      │
                                      ├── Verify signed JWT cookie
                                      ├── Attach current user + household
                                      └── Query / mutate Cloudflare D1
```

Receipt images flow through the Worker into R2. The Worker returns signed URLs so the frontend never talks to R2 directly.

## 5. Authentication

Google OAuth 2.0 is implemented inside the Worker using the [Authorization Code flow](https://developers.google.com/identity/protocols/oauth2/web-server) with PKCE.

1. `GET /api/auth/login`
   - Generates a `state` nonce and PKCE `code_verifier`.
   - Stores the verifier in a short-lived signed cookie.
   - Redirects the browser to Google's authorization endpoint.

2. `GET /api/auth/callback`
   - Validates the `state` parameter.
   - Exchanges the authorization code for an access token.
   - Fetches user info (`email`, `name`, `picture`, `sub`) from Google's userinfo endpoint.
   - Upserts the user in D1.
   - Issues a long-lived signed JWT in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie named `rumaq_session`.

3. `POST /api/auth/logout`
   - Clears the session cookie.

4. Protected-route middleware
   - Reads `rumaq_session`, verifies the HMAC signature and expiration, and attaches `userId` and `householdId` to the Hono context.
   - Loads the active household from `user_settings.active_household_id` (or the first household the user belongs to).

**Why not Cloudflare Access?** Access is simpler, but in-app OAuth keeps the API self-contained, lets us store the user record in D1 for personalization, and makes local development straightforward with wrangler.

## 6. Database

Cloudflare D1 runs SQLite at the edge. The schema is relational and normalized so the same Worker can serve a single household today and multiple households later without rewrites.

See [`worker/migrations/0001_schema.sql`](../worker/migrations/0001_schema.sql) for the full DDL.

Core entities:

- `users` — Google-authenticated accounts.
- `households` + `household_members` — one or more households per user.
- `locations`, `stores` — household-scoped lookup lists.
- `items` — canonical product catalog inside a household.
- `stock` — current on-hand quantity, expiry, run-out estimate.
- `purchases` + `purchase_items` — receipt history; the substrate for all estimates.
- `plans` + `plan_items` — AI-generated shopping trips.
- `user_settings` — AI provider/key, motion preference, currency, and persona roles.
- `ai_usage` — daily request counter per user.

## 7. AI integration

Users supply their own API key in Settings. The frontend sends it to the Worker, where it is encrypted with `WORKER_ENCRYPTION_KEY` (AES-GCM via Web Crypto) before being stored in D1. The Worker decrypts it only when making an AI call on the user's behalf.

AI lanes (MVP):

1. **Receipt → stock.** Image uploaded to R2; Worker sends the image URL + prompt to the user's chosen LLM and returns parsed line items for confirmation.
2. **Plan a trip.** Worker asks the LLM to build a shopping plan from low stock + expiry + history.
3. **Chat assistant.** The Worker proxies a streamed chat request; the system prompt includes the user's persona setting.

Daily usage is tracked in `ai_usage` so the app can show the meter and cap requests at 20/day per user by default.

## 8. Deployment

### Prerequisites

- Node.js 20+
- A Cloudflare account
- A Google Cloud project with OAuth 2.0 credentials
- Wrangler CLI authenticated (`wrangler login` or `export CLOUDFLARE_API_TOKEN=...`)

### One-time setup

1. Create the D1 database (run from `worker/`):
   ```bash
   cd worker && npm run db:create
   ```
2. Apply migrations (run from `worker/`):
   ```bash
   cd worker && npm run db:migrate
   ```
3. Set secrets (run from `worker/`):
   ```bash
   cd worker && wrangler secret put GOOGLE_CLIENT_ID
   cd worker && wrangler secret put GOOGLE_CLIENT_SECRET
   cd worker && wrangler secret put WORKER_JWT_SECRET
   cd worker && wrangler secret put WORKER_ENCRYPTION_KEY
   ```
4. Deploy the Worker (run from `worker/`):
   ```bash
   cd worker && npm run deploy
   ```
5. Deploy the frontend to Pages (run from root):
   ```bash
   npm run deploy:frontend
   ```

Or run the full-stack deploy script from root:
```bash
npm run deploy
```

To serve the Worker under `api.rumaq.pages.dev`, configure a Cloudflare Workers route or custom domain for the `rumaq-api` service. Otherwise the default URL is `rumaq-api.YOUR_SUBDOMAIN.workers.dev`.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Worker secret | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Worker secret | Google OAuth client secret |
| `WORKER_JWT_SECRET` | Worker secret | HMAC key for session JWT |
| `WORKER_ENCRYPTION_KEY` | Worker secret | AES-GCM key for AI keys |
| `VITE_API_BASE` | Pages env | `https://api.rumaq.pages.dev` (must match the deployed Worker URL) |

## 9. Free-tier headroom

With ~10 active users and daily use:

- **Workers:** 100k/day ≈ 69 req/min — plenty.
- **D1:** 100k queries/day; a typical session issues ~20 queries.
- **R2:** receipt images are small JPEGs/HEICs; 10 GB holds years of photos.
- **AI cost:** borne by the user, not the platform.

If usage grows, the first upgrade is Workers Paid ($5/mo) for higher request and D1 limits.

## 10. Security checklist

- [x] Session JWT is `HttpOnly`, `Secure`, `SameSite=Lax`, and signed.
- [ ] AI API keys are encrypted at rest and only decrypted in the Worker.
- [x] Google OAuth `state` and PKCE verifier prevent CSRF/replay.
- [ ] R2 objects are private; frontend receives time-limited signed URLs.
- [x] D1 queries are parameterized; no string concatenation.
- [x] CORS allows only the Pages origin in production.
- [ ] AI prompts never expose another user's data.
