# Phase 08 — Frontend Modernization

**Status:** Partial (TanStack Router/Query + Tailwind v4 + Kumo + PWA done in PR #34; offline query persistence + optimistic mutations done in PR #76; remaining: push notifications, mobile native wrapper decision, global error boundaries)  
**Priority:** P1/P2  
**Source sections:** Section 2 of `docs/PROJECT_PLAN.md`  
**Estimated effort:** High (large refactor + PWA + offline)

---

## Objective

Modernize the frontend architecture for performance, maintainability, and offline-capable mobile use. Migrate to Tailwind v4 + Kumo theme, adopt TanStack Router and TanStack Query, make the app installable as a PWA, support optimistic updates, and add push notifications for expiry/run-out reminders. The user impact is: _a fast, app-like experience that works even with a flaky connection_.

This phase is intentionally after P0. It is a large refactor that should not block the MVP.

---

## Acceptance Criteria

1. The frontend uses Tailwind v4 with Kumo design tokens and the legacy CSS files are removed or deprecated.
2. TanStack Router is used for file-based routing; the existing route tree generation is fully utilized.
3. TanStack Query is used for server state (settings, stock, purchases, plans, history) with caching, refetching, and optimistic updates.
4. The app is installable as a PWA: manifest, icons, service worker, and offline fallback page.
5. Optimistic updates work for stock quantity changes, plan item check-off, and location/store edits.
6. Push notifications are implemented for expiry/run-out reminders via the service worker and a backend push endpoint (or a scheduled check).
7. Mobile native wrappers (iOS/Android) are scoped and a decision is documented.
8. All existing tests pass after the refactor.
9. `vp test` and `vp check --no-fmt --no-lint` pass.

---

## Dependencies

- Phases 01-05 for the backend endpoints that the frontend will consume.
- Existing `frontend/src/styles.css`, `frontend/src/routeTree.gen.ts`, `frontend/src/routes/`.
- Existing Kumo design tokens and persona system.

---

## Scope

### 1. Tailwind v4 + Kumo theme migration

- Update `frontend/src/styles.css` to use Tailwind v4 `@import "tailwindcss"` syntax.
- Map Kumo tokens to CSS custom properties and Tailwind theme extensions (colors, spacing, typography, radii, shadows).
- Remove or migrate legacy files: `frontend/src/styles/tokens.css`, `base.css`, `components.css`.
- Replace custom class names with Tailwind utilities incrementally (do not rewrite all components at once; migrate page by page).
- Keep motion preferences (`none`, `reduced`, `standard`) using Tailwind `motion-safe` and `prefers-reduced-motion`.

### 2. TanStack Router adoption

- Use the existing file-based routing in `frontend/src/routes/`.
- Define route tree for `/`, `/inventory`, `/plan`, `/history`, `/settings`, `/add`.
- Add loaders that fetch data before rendering where appropriate.
- Use `useLoaderData` and `useRouteContext`.
- Add route-level error boundaries.

### 3. TanStack Query adoption

- Create query keys for each resource type: `['settings']`, `['stock']`, `['plans']`, `['purchases']`, `['locations']`, `['stores']`, `['usage']`.
- Wrap API calls in `useQuery` and `useMutation` hooks.
- Implement optimistic updates for:
  - `patchStock` — update cached stock list immediately, roll back on error. (Done in PR #76.)
  - `updatePlanItem` — update plan items immediately, roll back on error. (Implemented with Phase 04, following the `queries/stock.js` pattern.)
  - `createLocation` / `deleteLocation` / `createStore` / `deleteStore` — update settings cache immediately.
- Use `queryClient.invalidateQueries` for background refetch after mutations where optimistic updates are not enough.
- Add global loading and error state handling via TanStack Query's `isFetching` and `isError`.

### 4. PWA manifest and service worker

- Add `frontend/public/manifest.json` with app name, icons, theme color, background color, display mode (`standalone`), start URL (`/`).
- Generate icon sizes: 192x192, 512x512, maskable icon.
- Add a service worker using Workbox or a custom Vite plugin (`vite-plugin-pwa`):
  - Precache static assets.
  - Runtime cache for API responses with a NetworkFirst strategy and a short TTL.
  - Offline fallback page (`offline.html`).
  - Handle background sync for queued mutations (optional, advanced).
- Register the service worker in `frontend/src/main.jsx`.
- Add a prompt for installability.

### 5. Offline / optimistic updates

- Detect online/offline state using `navigator.onLine` and `online`/`offline` events.
- Queue mutations when offline (optional; can be implemented via service worker background sync or an in-memory queue).
- Show a persistent indicator when offline.
- For MVP, focus on read-only offline experience (cached stock/plan) and optimistic UI for mutations when online.
- More advanced offline write support can be a follow-up.

### 6. Push notifications

- Implement Web Push in the service worker.
- Backend: add a `POST /api/push/subscribe` endpoint to store push subscriptions in D1 (new table or `user_settings` column).
- Backend: add a scheduled Worker trigger (Cron Trigger) that checks for expiring/running-out items and sends push notifications.
- Ask user permission before subscribing.
- Send notifications for items expiring in 2 days and items running out in 1 day.
- Use VAPID keys for push (generate with `web-push` or similar).
- This is P2; can be deferred if complexity is too high.

### 7. Mobile native wrappers

- Evaluate whether to build Capacitor or Cordova wrappers for iOS/Android.
- Document the decision and a rough plan.
- For P2/MVP, focus on the PWA install flow; native wrappers are future work.

### 8. Error boundaries and loading states

- Add a global error boundary using `react-error-boundary` or TanStack Router's built-in boundary.
- Add route-level skeletons and error fallbacks.
- Use the existing skeleton components and persona copy for empty/error states.

---

## Out of Scope

- Complete rewrite of the UI design (keep Kumo design).
- Server-side rendering (SSR) for Cloudflare Pages.
- React Native app.
- Real-time synchronization across devices (TanStack Query refetch is enough for MVP).
- Advanced background sync for mutations (basic offline read is enough for MVP).

---

## Database Changes

Add a table for push subscriptions if push notifications are implemented:

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
```

No other schema changes.

---

## Testing Strategy

### Unit tests

1. Update existing tests to work with TanStack Query by wrapping components in `QueryClientProvider`.
2. Add tests for optimistic update hooks.
3. Add tests for the PWA manifest and service worker registration (if feasible).

### E2E tests

1. Test PWA installability using Playwright or Lighthouse.
2. Test offline fallback page by disabling network in Playwright.
3. Test push notification subscription flow (may require manual testing).

### Manual verification

1. Run the app and verify all pages load.
2. Verify the app is installable in Chrome/Edge DevTools.
3. Test offline mode by disconnecting network and reloading.
4. Verify optimistic updates feel instant.
5. Verify motion preferences still work.

---

## Deployment & Secrets

- If push notifications are implemented, VAPID keys must be generated and stored as Worker secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
- The PWA manifest and service worker are built into the static assets; no backend changes are needed except for push subscriptions.

---

## Risks & Mitigations

| Risk                                                             | Impact | Mitigation                                                                         |
| ---------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| Large refactor breaks existing functionality                     | High   | Migrate incrementally; keep tests passing; run full E2E after each page migration. |
| Tailwind v4 has breaking changes from v3                         | High   | Read the Tailwind v4 migration guide; update config and imports; test build.       |
| TanStack Query cache gets stale or inconsistent                  | Medium | Use proper query keys and invalidation; write tests for mutations.                 |
| Service worker causes stale assets                               | Medium | Use versioned precache and runtime cache strategies; document how to unregister.   |
| Push notifications require complex setup and may not work on iOS | Medium | Defer to P2; test on Android first; document iOS limitations.                      |
| Offline mutation queue is complex                                | Medium | For MVP, only cache reads; defer write queue to later.                             |

---

## Open Questions

1. **Should we use `vite-plugin-pwa` or a custom service worker?** Recommendation: `vite-plugin-pwa` for faster setup and Workbox integration. Custom service worker only if needed.
2. **Should we migrate all pages at once or incrementally?** Recommendation: incrementally, one page per PR, to keep PRs reviewable.
3. **Should we keep React Context for persona/settings or move to TanStack Query?** Recommendation: move server state (settings, locations, stores) to TanStack Query; keep client state (persona copy, motion) in Context.
4. **Should the service worker cache API responses?** Recommendation: yes, with a NetworkFirst strategy and a short TTL (e.g., 5 minutes) for `/api/stock`, `/api/plans`, `/api/purchases`. Avoid caching `/api/settings` and AI endpoints.
5. **Should push notifications be implemented in this phase or deferred?** Recommendation: implement the subscription backend and a simple scheduled notification in this phase, but only if P2 scope is approved. Otherwise document the plan and defer.
6. **Should native wrappers be Capacitor or something else?** Recommendation: Capacitor if native wrappers are needed, but PWA is the priority.

---

## Alternatives Considered

- **Keep the existing React Context + custom CSS approach:** Rejected because TanStack Query and Tailwind v4 provide better caching, maintainability, and consistency with modern React patterns.
- **Use Redux for state:** Rejected; TanStack Query handles server state and React Context handles client state, which is enough.
- **Build a native app first instead of PWA:** Rejected because PWA is faster to ship and covers most users.
- **Use Next.js or Remix instead of Vite + TanStack Router:** Rejected because the project is already on Vite and static Pages hosting is simpler.

---

## Implementation Notes for a Future Session

1. Update Tailwind to v4 and migrate the global styles first.
2. Set up TanStack Query and wrap the app in `QueryClientProvider`.
3. Migrate the Settings page to TanStack Query as a pilot.
4. Migrate the remaining pages one by one.
5. Add PWA manifest and service worker.
6. Implement optimistic updates.
7. (Optional) Implement push notifications.
8. Run the full test suite and open one or more PRs.

After this phase, the frontend is modern, fast, and feels like a native app with offline support.
