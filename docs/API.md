# RumaQ — REST API Contract

Base URL: `https://api.rumaq.workers.dev/api`

All paths are relative to this base. The Worker mounts routes under `/api/*`.
Protected endpoints require the `rumaq_session` cookie. Responses are JSON.
Errors use `{ "error": "..." }`.

## Caching

- **Public GET endpoints** (`/health`, `/auth/email-status`): `Cache-Control: public, max-age=60`.
- **Authenticated GET endpoints** (`/me`, `/stock`): `Cache-Control: private, no-cache` — never cached at the edge.
- **Error responses**: `Cache-Control: private, no-cache`.

## Implemented endpoints

| Method | Path                     | Auth | Query               | Body                  | Description                                                                                |
| ------ | ------------------------ | ---- | ------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/health`            | —    | —                   | —                     | Public health check. Returns `{ ok: true }`.                                               |
| GET    | `/api/auth/email-status` | —    | —                   | —                     | Reports whether email/password auth is enabled. Returns `{ enabled: boolean }`.            |
| GET    | `/api/auth/login`        | —    | —                   | —                     | Redirects to Google OAuth 2.0 login.                                                       |
| GET    | `/api/auth/callback`     | —    | —                   | —                     | Google OAuth callback. Sets `rumaq_session` and redirects to `/`.                          |
| ALL    | `/api/auth/logout`       | —    | —                   | —                     | Clears the session cookie. `POST` returns `{ ok: true }`; `GET` redirects to `/`.          |
| POST   | `/api/auth/email-login`  | —    | —                   | `{ email, password }` | Validates credentials and sets `rumaq_session`. Returns `403` when email auth is disabled. |
| GET    | `/api/me`                | Yes  | —                   | —                     | Returns the current user: `{ user: { id, email, name, picture } }`.                        |
| GET    | `/api/stock`             | Yes  | `{ location?, q? }` | —                     | Current inventory for the active household. Returns `{ stock: [...] }`.                    |

## Planned endpoints

The following contracts are planned but not yet implemented:

### Households

- `GET /households` — list households for the current user.
- `POST /households` — create a household.
- `PATCH /households/:id` — update household name or active status.

### Purchases

- `GET /purchases?store=&from=&to=` — purchase history grouped by month.
- `POST /purchases` — record a confirmed purchase and update stock.
- `POST /purchases/scan` — upload a receipt image, run AI OCR, return parsed line items.

### Plans

- `GET /plans?status=active` — list shopping plans.
- `POST /plans/generate` — ask AI to generate a shopping plan.
- `POST /plans` — save a generated plan as active.
- `PATCH /plans/:id/items/:itemId` — mark a plan item as bought or skipped.

### Locations & Stores

- `GET /locations`, `POST /locations`, `DELETE /locations/:id`
- `GET /stores`, `POST /stores`, `DELETE /stores/:id`

### Settings

- `GET /settings` — get current user settings.
- `PATCH /settings` — update settings.

### AI Assistant

- `POST /ai/chat` — send a message to the AI assistant.
- `GET /ai/usage` — today's AI usage meter.

## Auto-generating this document

The backend is built with [Hono](https://hono.dev/) and [Zod](https://zod.dev/). The cleanest way to auto-generate an OpenAPI spec from the current routes is to add [`hono-openapi`](https://github.com/rhinobase/hono-openapi) and swap `@hono/zod-validator` for `@hono/standard-validator` (Zod v4 is Standard Schema compliant). `hono-openapi` can then emit an OpenAPI document that can be rendered to Markdown with tools such as [`widdershins`](https://github.com/Mermade/widdershins) or served interactively with Swagger UI / Scalar.

For a fully custom Markdown table like the one above, an alternative is to introspect `Hono.prototype` / the route registry at build time, but Hono v4 stores route handlers as composed instance properties, so a small adapter or custom route registrar is required to keep the generated output reliable.
