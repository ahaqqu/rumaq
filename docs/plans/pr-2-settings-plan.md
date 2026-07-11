# PR 2 — Settings & Preferences: implementation plan

## Decisions locked in

| #   | Decision                                       | Implementation impact                                                                                                      |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Persona stored **both** backend + localStorage | `GET /api/settings` returns persona; `PersonaContext` seeds from API, caches in `localStorage`; "Apply" saves to both.     |
| 2   | Stores get **full CRUD UI**                    | Add add/delete controls to the Recorded Stores section, same pattern as locations.                                         |
| 3   | "Test key" performs **real AI call**           | New backend `POST /api/ai/test` that makes one tiny request to the user's provider; consumes 1 request from today's quota. |
| 4   | **Language** added to `user_settings`          | New migration column `language TEXT DEFAULT 'en' CHECK (language IN ('en','id'))`; Settings page syncs it.                 |
| 5   | AES key derived via **SHA-256**                | `crypto.subtle.digest('SHA-256', encoder.encode(WORKER_ENCRYPTION_KEY))` → 256-bit AES-GCM key. No env changes.            |
| 6   | Referenced locations/stores return **409**     | `DELETE` catches FK violations and returns `{ error: "..." }` 409.                                                         |

---

## 1. Database migration

**File:** `backend/migrations/0002_add_language.sql`

```sql
ALTER TABLE user_settings ADD COLUMN language TEXT DEFAULT 'en'
  CHECK (language IN ('en', 'id'));
```

Update `user_settings` default insert in `auth.ts` to set `language = 'en'`.

---

## 2. Backend crypto helper

**File:** `backend/src/crypto.ts`

- `deriveKey(secret: string): Promise<CryptoKey>` — SHA-256 hash of secret, import for AES-GCM.
- `encrypt(plaintext: string, secret: string): Promise<string>` — random 12-byte IV, AES-GCM encrypt, return base64url of `iv + ciphertext`.
- `decrypt(ciphertext: string, secret: string): Promise<string>` — reverse.
- Export helpers for tests.

---

## 3. Backend routes (`backend/src/index.ts`)

All protected routes added after `app.use('/api/*', requireAuth)`.

### `GET /api/settings`

Read `user_settings` for current user. Return:

```json
{
  "motion_preference": "standard",
  "currency": "idr",
  "language": "en",
  "ai_provider": "gemini",
  "ai_key_set": true,
  "persona": {
    "enabled": true,
    "user_role": "raja",
    "ai_role": "prajurit",
    "theme_hue": 270
  }
}
```

Never return the encrypted key. `persona.theme_hue` is zero if persona disabled.

### `PATCH /api/settings`

Body (all optional):

```json
{
  "motion_preference": "reduced",
  "currency": "idr",
  "language": "id",
  "ai_provider": "gemini",
  "ai_key": "...",
  "persona": { "enabled": true, "user_role": "raja", "ai_role": "prajurit" }
}
```

- If `ai_key` provided: encrypt and store, set `ai_key_set = 1`.
- If persona enabled and roles provided: derive `theme_hue` from role pair.
- Update only supplied fields + `updated_at`.

### Locations

- `GET /api/locations` — list household locations ordered by `sort_order`.
- `POST /api/locations` — body `{ "label": "Pantry" }`; `sort_order = MAX + 1`.
- `DELETE /api/locations/:id` — household-scoped; 409 if FK violation.

### Stores

- `GET /api/stores` — list household stores.
- `POST /api/stores` — body `{ "label": "Indomaret" }`.
- `DELETE /api/stores/:id` — household-scoped; 409 if FK violation.

### AI usage

- `GET /api/ai/usage` — upsert today's row with `daily_limit = 20`; return `{ provider, used, limit }`.
- `POST /api/ai/test` — decrypt stored AI key, make minimal API call to provider, increment usage, return `{ ok: true }` or `{ error }`.

All mutations use Zod validators (`@hono/zod-validator`). All queries filter by `c.get('userId')` / `c.get('householdId')`.

---

## 4. Frontend API client

**File:** `frontend/src/lib/api.js`

Add:

- `getSettings()`, `updateSettings(body)`
- `getLocations()`, `createLocation(label)`, `deleteLocation(id)`
- `getStores()`, `createStore(label)`, `deleteStore(id)`
- `getAiUsage()`, `testAiKey()`

All use existing `request()` helper with `credentials: 'include'`.

---

## 5. Frontend Settings page

**File:** `frontend/src/pages/Settings.jsx`

Changes:

- Load on mount: `getSettings()`, `getLocations()`, `getStores()`, `getAiUsage()`.
- Provider, currency, language, motion become controlled and saved via `updateSettings()`.
- AI key section:
  - Input is local draft.
  - "Test" calls `testAiKey()` (backend makes real AI call).
  - "Save key" calls `updateSettings({ ai_key: draft })`.
  - Status uses `ai_key_set` from backend.
- Locations section: add/delete call API, then re-fetch.
- Stores section: add/delete UI added, same pattern as locations.
- UsageMeter: receives real `usage` from `getAiUsage()`.
- Persona: initialize draft from backend settings + localStorage fallback; "Apply" calls `updateSettings({ persona })`, then `regenerateCopy()`.

---

## 6. PersonaContext sync

**File:** `frontend/src/context/PersonaContext.jsx`

- Accept settings from outside (via prop or direct call) so the Settings page can seed it from API.
- `setPersona` still saves to `localStorage` immediately.
- After "Apply" succeeds in Settings, also persist to backend via `updateSettings`.

---

## 7. i18n language sync

**File:** `frontend/src/i18n/index.js`

- On init, read language from `localStorage` (existing), then override with backend setting if available.
- When `changeLanguage` is called, update `localStorage` and call `updateSettings({ language })` in the background.
- On app load, if backend language differs from localStorage, prefer backend (server wins).

---

## 8. Frontend App state

**File:** `frontend/src/App.jsx`

- Lift `settings` (or relevant fields like `provider`, `currency`, `language`) into App state, or keep them localized to Settings and use the API client as source of truth.
- Approach: keep Settings as the only consumer of settings endpoints. Other pages that need currency/motion can fetch or receive props. For MVP, Settings manages its own data.

---

## 9. Tests

### Backend unit (`backend/src/__tests__/`) — all must hit 100% coverage

- `crypto.test.ts` — round-trip, tamper detection, wrong key fails.
- `settings.test.ts` — GET/PATCH shape, encryption round-trip, partial update, persona hue derivation, language validation.
- `locations.test.ts` — CRUD, household isolation, 409 on referenced delete.
- `stores.test.ts` — same as locations.
- `usage.test.ts` — GET creates row, limit defaults to 20.
- `ai.test.ts` — `POST /api/ai/test` success/failure, usage increment.

### Frontend unit — 90/75/85/90 thresholds

- `api.test.js` — add tests for all new client functions.
- `Settings.test.jsx` — mock API responses, test async load/save, location/store add/delete, provider/currency/language change, test key flow.

### Integration BDD — feature files + steps

- `automation/tests/local/api/features/settings.feature` — GET settings, PATCH settings (key save, persona, language).
- `automation/tests/local/api/features/locations.feature` — list, create, delete, 409 on referenced.
- `automation/tests/local/api/features/stores.feature` — list, create, delete, 409 on referenced.
- `automation/tests/local/api/features/ai-usage.feature` — GET usage, POST test key.
- Extend `helpers.js` with expectations for settings/locations/stores/usage shapes.

### E2E

- Extend or add `automation/tests/local/e2e/features/settings.feature` with Playwright steps confirming settings page loads, sections render, save triggers API call.

---

## 10. Docs update

- `docs/PROJECT_PLAN.md` — mark PR 2 items as `Done`.
- `docs/API.md`:
  - Update `GET /settings` and `PATCH /settings` to include `language`.
  - Add `POST /api/ai/test` endpoint definition.

---

## 11. Verification before PR

```bash
npm test
npx tsc --noEmit
npm run test:api # if integration stack is running
npm run test:docker
```

---

## 12. Files to create/modify

### Create

| File                                                    | Purpose                     |
| ------------------------------------------------------- | --------------------------- |
| `backend/src/crypto.ts`                                 | AES-GCM encrypt/decrypt     |
| `backend/src/__tests__/crypto.test.ts`                  | Crypto unit tests           |
| `backend/src/__tests__/settings.test.ts`                | Settings unit tests         |
| `backend/src/__tests__/locations.test.ts`               | Locations unit tests        |
| `backend/src/__tests__/stores.test.ts`                  | Stores unit tests           |
| `backend/src/__tests__/usage.test.ts`                   | AI usage unit tests         |
| `backend/src/__tests__/ai.test.ts`                      | AI test endpoint unit tests |
| `backend/migrations/0002_add_language.sql`              | Add language column         |
| `automation/tests/local/api/features/settings.feature`  | Integration BDD             |
| `automation/tests/local/api/features/locations.feature` | Integration BDD             |
| `automation/tests/local/api/features/stores.feature`    | Integration BDD             |
| `automation/tests/local/api/features/ai-usage.feature`  | Integration BDD             |

### Modify

| File                                          | Changes                                                   |
| --------------------------------------------- | --------------------------------------------------------- |
| `backend/src/index.ts`                        | Add settings, locations, stores, ai/usage, ai/test routes |
| `backend/src/auth.ts`                         | Set default `language = 'en'` on user_settings insert     |
| `frontend/src/lib/api.js`                     | Add all new API client functions                          |
| `frontend/src/lib/api.test.js`                | Test new API functions                                    |
| `frontend/src/pages/Settings.jsx`             | Wire to real endpoints, add store CRUD                    |
| `frontend/src/pages/Settings.test.jsx`        | Update for async API behavior                             |
| `frontend/src/context/PersonaContext.jsx`     | Accept backend seed data                                  |
| `frontend/src/i18n/index.js`                  | Sync language with backend                                |
| `automation/tests/local/api/steps/helpers.js` | Add settings/locations/stores/usage matchers              |
| `automation/tests/fixtures/seed.sql`          | Add language=id to user_settings seed                     |
| `docs/PROJECT_PLAN.md`                        | Mark PR 2 items Done                                      |
| `docs/API.md`                                 | Add language field, ai/test endpoint                      |
