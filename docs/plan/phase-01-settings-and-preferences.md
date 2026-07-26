# Phase 01 — Settings & Preferences

**Status:** Done (PR #48 — phase-01-settings-and-preferences)  
**Priority:** P0 (MVP blocker)  
**Source PR:** PR 2 — Settings & Preferences (from `docs/PROJECT_PLAN.md`)  
**Estimated effort:** Medium (mostly CRUD + encryption wiring)

---

## Objective

Persist every user-configurable preference and lookup list end-to-end: AI provider/key, locations, stores, persona, language, motion, and currency. The user impact is: _configure everything once and have it available across sessions and devices_.

This phase delivers the first fully functional settings backend and removes the mocked parts of the Settings page (locations, stores, AI usage, and the AI key save flow).

---

## Acceptance Criteria

1. A logged-in user can `GET /api/settings` and receive their current settings, including the decrypted AI provider/key only if the request is authenticated (the key is never returned in plain text to the frontend unless a separate, explicit opt-in endpoint is used; see Open Questions).
2. A logged-in user can `PATCH /api/settings` to update: `ai_provider`, `encrypted_ai_key` (supplied as plain text from the frontend, encrypted server-side), `persona_user_role`, `persona_ai_role`, `persona_enabled`, `motion_preference`, `currency`, `language` (if we decide to persist it; see Open Questions), and `theme_hue`.
3. The AI key is encrypted with AES-GCM using `WORKER_ENCRYPTION_KEY` before being stored in D1, and decrypted only when an AI call is made.
4. `GET/POST/DELETE /api/locations` and `GET/POST/DELETE /api/stores` are implemented, household-scoped, and enforce `owner`/`member` role checks (or at least household membership; see Open Questions).
5. `GET /api/ai/usage` returns today's request count and daily limit for the current user.
6. The Settings page reads real locations and stores from the API, allows adding/removing them, persists AI provider/key via the API, and shows the real `UsageMeter` from `GET /api/ai/usage`.
7. All new endpoints use Valibot validation and return consistent JSON errors through the existing `app.onError` handler.
8. API integration tests cover settings CRUD, encryption round-trip, location/store CRUD, and AI usage counter.
9. Unit tests cover the encryption helpers and Valibot schemas.
10. `vp test` and `vp check --no-fmt --no-lint` pass before the PR is opened.

---

## Dependencies

- PR 1 (Authentication) is merged or stable enough that `propsAuthMiddleware` sets `userId` and `householdId` correctly.
- D1 schema already exists (`backend/migrations/0001_schema.sql`) with `user_settings`, `locations`, `stores`, `users`, `households`, and `household_members`.
- Existing `propsAuthMiddleware` in `backend/src/auth.ts`.
- Existing Settings UI in `frontend/src/pages/Settings.jsx` (currently mocked).
- Existing API client in `frontend/src/lib/api.js`.

---

## Scope

### Backend

1. **Encryption helpers** (`backend/src/lib/crypto.ts` or similar):
   - `encryptAiKey(plainText: string, key: string): Promise<string>` — AES-GCM, returns a single string containing nonce + ciphertext + tag, base64url-encoded.
   - `decryptAiKey(cipherText: string, key: string): Promise<string>` — inverse.
   - Use `crypto.subtle.importKey` with raw key material, derive an AES-GCM key, generate a 96-bit IV, and tag length 128.
   - Format suggestion: `base64url(iv:ciphertext)` or `base64url(iv)|base64url(ciphertext)`. Keep it simple and versioned so future key rotation is possible (e.g., prefix with `v1:`).

2. **Valibot schemas** (`backend/src/schemas.ts` or inline in `apps/api.ts`):
   - `settingsPatchSchema` for `PATCH /api/settings`.
   - `locationSchema` for `POST /api/locations`.
   - `storeSchema` for `POST /api/stores`.

3. **Settings endpoints** (`backend/src/apps/api.ts`):
   - `GET /api/settings` — returns `motion_preference`, `currency`, `ai_provider`, `persona_user_role`, `persona_ai_role`, `persona_enabled`, `theme_hue`, `active_household_id`, and a boolean `has_ai_key` (never the key itself). Also include household name and maybe a list of user households if household endpoints are implemented later.
   - `PATCH /api/settings` — validates body, updates only provided fields. If `ai_key` is present, encrypt it with `WORKER_ENCRYPTION_KEY` and store in `encrypted_ai_key`. Return the updated public settings.
   - `GET /api/ai/usage` — upsert a row in `ai_usage` for today if missing, then return `{ used, daily_limit }`.

4. **Locations endpoints** (`backend/src/apps/api.ts`):
   - `GET /api/locations` — select `id`, `label`, `sort_order` from `locations` where `household_id = ?`, ordered by `sort_order, label`.
   - `POST /api/locations` — insert a new location for the household, return the created row.
   - `DELETE /api/locations/:id` — delete location only if it belongs to the household and no stock rows reference it; otherwise return 409 with a clear error. Do not allow deleting the last location if stock exists; alternatively, set `location_id` to NULL on stock.

5. **Stores endpoints** (`backend/src/apps/api.ts`):
   - `GET /api/stores` — select `id`, `label` from `stores` where `household_id = ?`, ordered by `label`.
   - `POST /api/stores` — insert a new store for the household, return the created row.
   - `DELETE /api/stores/:id` — delete store only if it belongs to the household and no purchase/plan rows reference it; otherwise return 409.

6. **Authorization checks**:
   - All endpoints use `propsAuthMiddleware`.
   - For locations/stores, verify `household_id` in the resource matches `c.get('householdId')`. Return 404 (not 403) for resources outside the household to avoid leaking IDs.

### Frontend

1. **API client additions** (`frontend/src/lib/api.js`):
   - `getSettings()` → `GET /api/settings`
   - `patchSettings(payload)` → `PATCH /api/settings`
   - `getLocations()` → `GET /api/locations`
   - `createLocation(label)` → `POST /api/locations`
   - `deleteLocation(id)` → `DELETE /api/locations/${id}`
   - `getStores()` → `GET /api/stores`
   - `createStore(label)` → `POST /api/stores`
   - `deleteStore(id)` → `DELETE /api/stores/${id}`
   - `getAiUsage()` → `GET /api/ai/usage`

2. **Settings page refactor** (`frontend/src/pages/Settings.jsx`):
   - On mount, fetch settings, locations, and stores.
   - Replace local `LOCATIONS`/`STORES` mock state with fetched data.
   - Add loading skeletons and error states.
   - Persist AI key/provider on save via `patchSettings({ ai_provider, ai_key: draft })`.
   - Persist persona fields on apply via `patchSettings`.
   - Persist motion, currency, and language changes via `patchSettings` (debounce or explicit save).
   - Wire `UsageMeter` to `getAiUsage()`.
   - Handle delete confirmation for locations/stores.

3. **UsageMeter component** (`frontend/src/components/ui.jsx` or `UsageMeter.jsx`):
   - Accept `usage` prop or fetch internally.
   - Show `used / daily_limit` with a progress bar.
   - Handle the key-missing state gracefully.

4. **Global settings provider** (optional but recommended):
   - Create `frontend/src/context/SettingsContext.jsx` to cache settings, locations, and stores and provide them to other pages (Home, Inventory, Plan).
   - This avoids prop drilling and ensures consistent data.

---

## Out of Scope

- Household creation/switching UI (covered in Phase 02/Inventory or a separate Households phase; see Phase 02).
- ~~AI key testing/validation call to the actual provider~~ — implemented as `POST /api/ai-key/test` (server validates key against provider API, decrypts saved key if none provided).
- Full persona copy generation backend (the UI calls `regenerateCopy` locally; keep it client-side for now unless AI key encryption is ready).
- Rate limiting (covered in Phase 06).
- Row-level security audit (covered in Phase 06).

---

## Database Changes

No schema changes are required. The existing `0001_schema.sql` already supports these tables. However, consider a migration if you decide to add a `language` column to `user_settings`.

If you add `language`:

```sql
ALTER TABLE user_settings ADD COLUMN language TEXT DEFAULT 'id' CHECK (language IN ('id', 'en'));
```

This is optional because i18next stores language in `localStorage` today. Decide in Open Questions.

---

## Testing Strategy

### Backend unit tests

Add to `backend/src/__tests__/`:

1. `crypto.test.ts` — AES-GCM round-trip with a known key and IV, failure cases with wrong key/tampered ciphertext, version prefix handling.
2. `settings-schema.test.ts` — validate allowed fields, reject unknown fields, test `ai_provider` enum.

### Backend integration tests

Add to `automation/tests/local/api/`:

1. `settings.feature` — scenarios:
   - GET settings returns public fields and `has_ai_key: false` for a fresh user.
   - PATCH settings encrypts the AI key and GET afterwards shows `has_ai_key: true` but no plain key.
   - PATCH settings updates persona and currency.
2. `locations.feature` — create, list, delete a location; reject deletion when referenced by stock.
3. `stores.feature` — create, list, delete a store; reject deletion when referenced by purchases.
4. `ai-usage.feature` — GET usage returns `{ used: 0, daily_limit: 20 }` for a new user; increment usage in a test and verify it is returned.

### Frontend tests

1. Update `Settings.test.jsx` to mock the new API client functions and assert loading, saving, and error states.
2. Add a test for `UsageMeter`.

### Manual verification

1. Log in via email auth or Google OAuth.
2. Navigate to Settings.
3. Add/remove locations and stores; verify they persist after reload.
4. Save an AI key; verify the network tab shows `has_ai_key: true` but no plain key.
5. Verify `UsageMeter` shows 0/20.

---

## Deployment & Secrets

- Ensure `WORKER_ENCRYPTION_KEY` is set in Cloudflare secrets for every environment. It must be a 256-bit key (32 bytes) encoded as base64 or a 32-character string. Document the generation command in `docs/ARCHITECTURE.md` or a new secrets guide.
- The AI key is encrypted at rest but travels in plain text from the frontend to the Worker over HTTPS. This is acceptable because the connection is TLS-terminated; still, never log the key.
- If you rotate `WORKER_ENCRYPTION_KEY`, old encrypted keys become undecryptable. Plan a migration strategy before rotation (see Risks).

---

## Risks & Mitigations

| Risk                                                                                            | Impact | Mitigation                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI key is accidentally logged or returned in API responses                                      | High   | Never return `encrypted_ai_key`; add an explicit test that scans the GET settings response for any key-like string.                                               |
| `WORKER_ENCRYPTION_KEY` is not set or is too short                                              | High   | Validate key length at Worker startup; throw a clear error if missing. Use a helper that derives a 256-bit key from the secret if the user provides a passphrase. |
| Encryption helper format changes and old keys break                                             | Medium | Prefix ciphertext with `v1:` and write a version-aware decrypt function.                                                                                          |
| Deleting a location/store referenced by stock/purchases leaves orphan data or fails confusingly | Medium | Return 409 with a message like "Cannot delete location because it is used by X items". Offer to reassign in the UI later.                                         |
| Frontend and backend language state diverge                                                     | Low    | Either persist language in `user_settings` or keep it in `localStorage` only. Document the decision.                                                              |
| Valibot validation errors leak internal details                                                 | Low    | Use a centralized error formatter that returns only `path` and a generic message.                                                                                 |

---

## Open Questions (Resolved)

1. **Should `language` be persisted in `user_settings` or stay in `localStorage`?** Resolved: persisted in both. Backend stores it in `user_settings.language`; frontend also keeps it in `localStorage` as fallback. Cross-device consistency is the primary path.
2. **Should the AI key be returned to the frontend for editing?** Resolved: never returned. The UI shows `has_ai_key: true/false`; changing requires re-entry.
3. **Should locations have a default that cannot be deleted?** Resolved: deletion is allowed but returns 409 if stock rows reference the location.
4. **Should store/location endpoints require `owner` role?** Resolved: any household member can edit for MVP; owner-only restrictions deferred.
5. **Should `PATCH /api/settings` allow partial updates?** Resolved: yes, only fields present in the body are updated.
6. **What is the AI usage daily limit?** Resolved: hard-coded at 20/day; configurable via a future setting.

---

## Alternatives Considered

- **Cloudflare Workers KV for settings:** Rejected because D1 is already the source of truth for users and households; KV would add another system to keep in sync.
- **Hashing the AI key instead of encrypting it:** Rejected because the Worker needs the plain key to call AI providers on the user's behalf.
- **Storing the AI key only in the browser:** Rejected because it would not be cross-device and would be lost on logout/clear data.
- **Using a separate `settings` table per household instead of per user:** Rejected because `user_settings` is per-user and `active_household_id` selects the household; household-level preferences can be added later if multi-user households need them.

---

## Implementation Notes for a Future Session

1. Start with the crypto helpers and unit tests. They are pure and safe to write without touching the UI.
2. Then implement the backend endpoints with Valibot validation and integration tests.
3. Then wire the frontend Settings page to the new endpoints.
4. Finally, run the full test suite (`vp test`, `./scripts/test.sh unit frontend`, `./scripts/test.sh automation-local`) and open the PR.

After this phase, the user should be able to configure their AI key and household lookup lists and see the changes persist across page reloads.
