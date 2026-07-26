# Phase 06 — Security & Production Hardening

**Status:** Partial (Google OAuth integration, JWT signing, HTTPS cookies, and CORS are partial)  
**Priority:** P0/P1  
**Source sections:** Sections 3, 5, 7 of `docs/PROJECT_PLAN.md`  
**Estimated effort:** Medium

---

## Objective

Close the remaining security gaps before and after the MVP ships: finish OAuth integration, prove session handling in production, encrypt AI keys, sign R2 URLs, isolate AI prompts per household, enforce row-level security, and add rate limiting. The user impact is: _trust that the app handles data and credentials safely_.

This phase is both a prerequisite for P0 features (AI key encryption, R2 signed URLs) and a follow-up hardening effort (rate limiting, RLS audit).

---

## Acceptance Criteria

1. Google OAuth login/callback/logout is verified end-to-end with real credentials on the deployed domain.
2. Session cookies are `HttpOnly`, `Secure`, `SameSite=None` in production and work cross-origin between Pages and Workers.
3. CORS allows only the configured Pages origin in production and localhost in local/test environments.
4. AI API keys are encrypted with AES-GCM using `WORKER_ENCRYPTION_KEY` at rest and decrypted only in the Worker.
5. R2 receipt images are served only via signed URLs or the Worker proxy; the bucket is not public.
6. AI prompts and context never include another household's data.
7. Every D1 query that reads or writes household-scoped data includes `household_id = ?` (or equivalent user_id filter).
8. Rate limiting is implemented per user for AI endpoints and API endpoints.
9. A security checklist is added to `docs/ARCHITECTURE.md` or a separate `docs/SECURITY.md` and all items are marked complete.
10. `vp test` and `vp check --no-fmt --no-lint` pass.

---

## Dependencies

- Phases 01-05 for the features that need hardening (settings, stock, receipts, plans, history).
- `WORKER_ENCRYPTION_KEY` is set in all environments.
- R2 bucket is created and bound.
- Google OAuth credentials are configured.
- Existing `backend/src/auth.ts`, `backend/src/cors.ts`, `backend/src/middleware.ts`/`propsAuthMiddleware`.

---

## Scope

### 1. Finish Google OAuth integration and live test

- Configure real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Cloudflare secrets.
- Set `PAGES_ORIGIN` to the real Pages URL (e.g., `https://rumaq.pages.dev`).
- Deploy and test the full flow: login → callback → `GET /api/me` → logout.
- Verify the `rumaq_session` cookie is set correctly and sent on subsequent requests.
- Fix any issues with `SameSite=None` + `Secure` cross-origin behavior.
- Document the OAuth setup steps in `docs/ARCHITECTURE.md` or a new `docs/SECURITY.md`.

### 2. Session/JWT hardening

- Ensure `WORKER_JWT_SECRET` is a strong, random 256-bit value.
- Consider adding key rotation support: store a `kid` in the JWT header and keep a list of valid secrets. For MVP, one secret is enough if it is strong.
- Verify session duration is 30 days and the cookie expires accordingly.
- Add a `GET /api/auth/session` or extend `/api/me` to return session metadata (optional).
- Ensure logout clears the cookie in both same-origin and cross-origin scenarios.

### 3. AI key encryption

This is also covered in Phase 01, but hardening includes:

- Verify the AES-GCM implementation uses a 256-bit key derived from `WORKER_ENCRYPTION_KEY`.
- Never return the encrypted or plain key in API responses.
- Add a test that confirms the GET settings response does not contain key material.
- Document key rotation: if `WORKER_ENCRYPTION_KEY` changes, old keys cannot be decrypted. Plan a migration before rotating.

### 4. R2 signed URLs and receipt privacy

- Implement `R2Bucket.createSignedUrl` if available in the Workers runtime, or implement a Worker proxy endpoint (`GET /api/purchases/:id/receipt`).
- Verify R2 bucket is not public (no public access policy).
- Ensure signed URLs are short-lived (e.g., 15 minutes) and include the household-scoped key.
- Add tests that another household cannot fetch the receipt.

### 5. AI prompt data isolation

- Audit every AI prompt construction in `backend/src/lib/ai.ts` and `backend/src/lib/plans.ts`.
- Ensure only current household items, locations, stores, and history are included.
- Never pass another user's `item_id`, `stock_id`, or other internal IDs.
- If debugging logs are added, never log prompts with household data in production.
- Add a unit test that builds a prompt from a mock household and asserts no other household's data appears.

### 6. Row-level security review

- Audit every D1 query in `backend/src/apps/api.ts` and future helpers.
- Checklist per query:
  - Does it filter by `household_id`?
  - Does it join to another table that also filters by `household_id`?
  - Does it use `id` lookups that also verify `household_id`?
  - Does it return 404 (not 403) for resources outside the household?
- Create a shared helper `withHouseholdFilter(sql, params)` if it helps, but explicit filters are usually clearer.
- Add integration tests that attempt cross-household access for every resource type.

### 7. Rate limiting

- Implement per-user rate limiting for AI endpoints (`/api/purchases/scan`, `/api/plans/generate`, `/api/ai/chat`) using `ai_usage` or Cloudflare KV.
- Implement a simpler per-user or per-IP rate limit for all API endpoints (e.g., 100 requests/minute).
- For AI endpoints, use the existing `ai_usage` table with a default daily limit of 20.
- For general API endpoints, use Cloudflare KV or an in-memory sliding window (in-memory is okay on a single Worker instance but not ideal across instances; KV is better for production).
- Return `429 Too Many Requests` with a `Retry-After` header when limits are exceeded.
- Add tests for rate limiting behavior.

### 8. CORS and cookie security

- Review `backend/src/cors.ts`:
  - Production: allow only `PAGES_ORIGIN`.
  - Local/test: allow `http://localhost:5173`, `http://localhost:8788`, and the test harness origin.
  - Do not allow wildcard `*` in production.
- Verify `Access-Control-Allow-Credentials: true` is set for authenticated requests.
- Ensure `OPTIONS` preflight is handled correctly.
- Add tests that unauthorized origins are rejected.

---

## Out of Scope

- Formal security audit by a third party.
- SOC 2 compliance.
- Advanced threat detection.
- Bot protection (Cloudflare Turnstile could be added later).
- Penetration testing (manual testing only).

---

## Database Changes

No schema changes are required. Consider adding an index if rate-limit queries are slow:

```sql
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date);
```

This index already exists in `0001_schema.sql`.

---

## Testing Strategy

### Unit tests

1. `crypto.test.ts` (from Phase 01) — encryption/decryption round-trip.
2. `prompt-isolation.test.ts` — mock two households and assert prompt only contains one household's data.
3. `cors.test.ts` — test allowed and rejected origins.

### Integration tests

Add to `automation/tests/local/api/`:

1. `security.feature` — scenarios:
   - User A cannot read User B's stock, locations, stores, purchases, plans, or settings.
   - User A cannot modify User B's resources.
   - Receipt image is not accessible without a valid session or signed URL.
   - Settings response does not contain AI key material.
   - AI usage limit blocks further AI requests.
2. `rate-limit.feature` — scenarios:
   - Exceeding the AI daily limit returns 429.
   - General API rate limit returns 429.

### Manual verification

1. Deploy to production.
2. Test OAuth login/logout with a real Google account.
3. Inspect cookies: `HttpOnly`, `Secure`, `SameSite=None`.
4. Inspect CORS headers from a non-allowed origin.
5. Upload a receipt and verify the R2 object cannot be accessed directly without the signed URL.
6. Verify another user's data is not visible.

---

## Deployment & Secrets

- Ensure all required secrets are set in Cloudflare for every environment.
- Add a Worker startup check that fails fast if `WORKER_JWT_SECRET`, `WORKER_ENCRYPTION_KEY`, or `GOOGLE_CLIENT_ID` is missing.
- Document how to generate a strong `WORKER_JWT_SECRET` and `WORKER_ENCRYPTION_KEY`.
- Document the OAuth redirect URI format (`https://api.rumaq.workers.dev/api/auth/callback`).

---

## Risks & Mitigations

| Risk                                                               | Impact | Mitigation                                                                             |
| ------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------- |
| Cross-origin cookies fail in production                            | High   | Test `SameSite=None` + `Secure` early; use `credentials: 'include'` in frontend fetch. |
| AI key leaked in logs or responses                                 | High   | Add explicit tests; never log keys; return only `has_ai_key`.                          |
| Bucket is accidentally made public                                 | High   | Verify bucket policy; use signed URLs or Worker proxy.                                 |
| Rate limiter uses in-memory state and is bypassed across instances | Medium | Use Cloudflare KV for general API rate limits; use `ai_usage` for AI limits.           |
| Missing `household_id` filter in a new endpoint                    | High   | Code review checklist; integration tests for every resource.                           |
| CORS too permissive or too restrictive                             | Medium | Test both local dev and production; reject wildcard in production.                     |
| JWT secret is weak                                                 | High   | Document generation command using `openssl rand -hex 32` or similar.                   |

---

## Open Questions

1. **Should rate limiting use KV or a D1 table?** Recommendation: KV for general API rate limits because it is fast and has TTL; `ai_usage` for AI limits because it is already per-user and day.
2. **Should we add a `nonce` or `jti` claim to JWTs to prevent replay?** Not necessary for MVP; the session is long-lived and the cookie is HttpOnly. Consider adding later if needed.
3. **Should we log all AI prompts for abuse detection?** No, because prompts contain household data. Log only metadata (provider, token count, user_id, timestamp) if needed.
4. **Should rate limits be configurable per user?** Not for MVP; use a global default (e.g., 20 AI requests/day, 100 API requests/minute).
5. **Should we add CSRF protection beyond OAuth state/PKCE?** For cookie-based API, `SameSite=None` + CORS is the current model. If the API is called from a form or link, CSRF is not a concern because the API expects JSON and preflight checks the origin. Document this decision.

---

## Alternatives Considered

- **Cloudflare Access instead of custom OAuth:** Rejected earlier because it would complicate local dev and user onboarding. Reconsider only if OAuth maintenance becomes burdensome.
- **Storing AI keys in KV instead of D1:** Rejected because D1 is the source of truth for user settings; KV would add another system.
- **Returning the AI key to the frontend for client-side calls:** Rejected for security; the Worker proxies all AI calls.
- **Public R2 bucket with obfuscated keys:** Rejected; signed URLs are the correct pattern.

---

## Implementation Notes for a Future Session

1. Start with the security checklist and audit existing queries.
2. Fix any missing `household_id` filters and add tests.
3. Implement AI key encryption and verify it in tests.
4. Implement R2 signed URLs or proxy and verify bucket privacy.
5. Add rate limiting to AI endpoints and general API.
6. Test OAuth on the live domain.
7. Update security documentation.
8. Run the full test suite and open a security-focused PR.

After this phase, the app has a defensible security posture for an MVP and is safe for production use.
