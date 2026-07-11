# Phase 02 — Inventory Dashboard

**Status:** Not started  
**Priority:** P0 (MVP blocker)  
**Source PR:** PR 3 — Inventory Dashboard (from `docs/PROJECT_PLAN.md`)  
**Estimated effort:** Medium-High (run-out estimation logic + UI wiring)

---

## Objective

Replace mocked inventory data with real stock from D1, compute meaningful run-out estimates from purchase history, and let users update quantities, locations, and expiry dates. The user impact is: _open the app and immediately see what is running low, expiring soon, and where it is stored_.

This phase also introduces the first household-level state that other phases depend on (Home, Plan, History).

---

## Acceptance Criteria

1. `GET /api/stock` returns real data and the computed `run_out_days` for each stock row.
2. `PATCH /api/stock/:id` updates quantity, unit, location, expiry date, and notes. It validates that the stock row belongs to the active household.
3. The Home page shows real stats: total items, items expiring within 7 days, items running out within 7 days, and the next planned trip.
4. The Inventory page supports search, location filter, urgency sort, and inline quantity updates.
5. Run-out estimates are computed from purchase history and current quantity when enough data exists; otherwise a sensible default is used.
6. Stock urgency is visually signalled (green/yellow/red) based on run-out days and expiry.
7. All endpoints use Zod validation and household-scoped queries.
8. API integration tests cover stock queries, run-out calculation, and PATCH validation.
9. Frontend tests cover Inventory filters, sorting, and updates.
10. `npm test` and `npx tsc --noEmit` pass.

---

## Dependencies

- Phase 01 (Settings & Preferences) is merged or the household is already seeded.
- `user_settings.active_household_id` is populated at signup.
- D1 schema has `stock`, `items`, `purchases`, `purchase_items`, `locations`.
- Existing `GET /api/stock` in `backend/src/apps/api.ts`.
- Existing Home and Inventory pages in `frontend/src/pages/`.

---

## Scope

### Backend

1. **Run-out estimate computation** (`backend/src/lib/stock.ts` or inline in `apps/api.ts`):
   - For each stock row, look at the last N purchases (e.g., last 3 months or last 5 purchases) of the same item.
   - Compute average daily consumption: `total_qty_consumed / days_between_first_and_last_purchase`.
   - `run_out_days = current_qty / daily_consumption`.
   - If no purchase history, set `run_out_days` to a default (e.g., 30 or NULL) and `basis` to `'default'`.
   - If the item is consumed faster than the data shows, update `basis` to `'history'`.
   - Store `run_out_days` and `basis` in the `stock` table on every stock change or purchase creation.
   - Edge case: handle zero consumption (divide by zero) by returning NULL and default basis.

2. **Stock query improvements** (`GET /api/stock`):
   - Join `items`, `locations`.
   - Add optional `q` (search by item name) and `location` filter.
   - Order by `COALESCE(run_out_days, 999), expiry_date`.
   - Return fields: `id`, `item_id`, `name`, `qty`, `unit`, `expiry_date`, `run_out_days`, `basis`, `location_id`, `location`.

3. **PATCH /api/stock/:id**:
   - Zod schema allows `qty` (number, >= 0), `unit` (string, optional), `location_id` (string, optional, must exist in household), `expiry_date` (string date, optional), `name` (string, optional, updates `items.name` canonicalization), `basis` (read-only, ignored).
   - Validate stock row belongs to the household. Return 404 if not found.
   - If `qty` is 0, keep the row but mark it as empty; optionally archive it later (out of scope).
   - Recalculate `run_out_days` after the update using the same helper.
   - Return the updated stock row.

4. **Item canonicalization** (optional but recommended):
   - When `name` is updated via PATCH, update `items.name` for the household. This keeps the item catalog clean.
   - Avoid creating duplicate `items` names for the same household; normalize case and trim whitespace.

5. **Home dashboard endpoint** (`GET /api/home` or extend `GET /api/stock`):
   - Option A: Add `GET /api/home` returning `{ total_items, expiring_7d, running_out_7d, low_stock: [...], expiring_soon: [...], next_trip: {...} }`.
   - Option B: Have the Home page compute from `GET /api/stock`. Option A is cleaner and reduces client-side logic.
   - Recommendation: implement `GET /api/home`.

### Frontend

1. **API client additions** (`frontend/src/lib/api.js`):
   - `patchStock(id, payload)` → `PATCH /api/stock/${id}`
   - `getHome()` → `GET /api/home` (if chosen)
   - Update `getStock` to accept `location` and `q`.

2. **Home page** (`frontend/src/pages/Home.jsx`):
   - Fetch home dashboard data on mount.
   - Show real stats cards.
   - Show "needs attention" list for items expiring or running out within 7 days.
   - Show next trip card (can be mocked or empty until Phase 04).
   - Add loading and error states.

3. **Inventory page** (`frontend/src/pages/Inventory.jsx`):
   - Fetch real stock on mount and on filter changes.
   - Use location filter populated from `GET /api/locations` (or SettingsContext from Phase 01).
   - Implement search debounce.
   - Show urgency chips (expiring, running out, ok).
   - Allow inline quantity edits (click-to-edit or +/- buttons).
   - Allow editing location and expiry in a simple edit mode or a bottom sheet.
   - Optimistically update the list after PATCH.

4. **Stock list item component** (if not already present):
   - Extract a reusable `StockRow` or `StockCard` component.
   - Display name, qty, unit, location, expiry date, run-out days, and urgency color.

5. **Persona copy**:
   - Use `personaText` for empty states and lead text.

---

## Out of Scope

- Receipt scanning (Phase 03).
- Shopping plan generation (Phase 04).
- Purchase history UI (Phase 05).
- Household switching (Phase 06 or a separate phase).
- Full natural-language quick add (Phase 10).
- Notifications/push reminders (Phase 08).

---

## Database Changes

No schema changes are strictly required. However, consider adding a composite index to speed up the run-out calculation query:

```sql
CREATE INDEX IF NOT EXISTS idx_purchase_items_item_date ON purchase_items(item_id, created_at);
```

Also consider adding an index on `stock(household_id, item_id)` to speed up the join when computing run-out for all stock rows.

If you decide to track `basis` more granularly, the existing `stock.basis TEXT` column is enough.

---

## Testing Strategy

### Backend unit tests

1. `run-out.test.ts` — scenarios:
   - No history → default run_out_days and `basis: 'default'`.
   - Two purchases 30 days apart, 3 units total, current qty 1 → run_out_days ≈ 10.
   - Current qty 0 → run_out_days = 0 or NULL.
   - Multiple items, different households → isolated correctly.

### Backend integration tests

Add to `automation/tests/local/api/`:

1. `stock.feature` — scenarios:
   - GET stock returns seeded locations and empty stock for a new user.
   - PATCH stock updates qty and recalculates run_out_days.
   - PATCH stock with another household's ID returns 404.
   - Search and location filters work.
2. `home.feature` — scenarios:
   - GET /api/home returns zero stats for a new user.
   - After adding stock and a purchase, expiring and running-out counts are correct.

### Frontend tests

1. Update `Home.test.jsx` to mock `getHome` and assert stats render.
2. Update `Inventory.test.jsx` to mock `getStock`, `patchStock`, and `getLocations`.
3. Test that urgency colors are applied based on `run_out_days` and `expiry_date`.

### Manual verification

1. Log in.
2. Verify Home shows 0 stats and friendly empty state.
3. Add a purchase manually (if Phase 03 is not done, insert directly into D1 or create a temporary test endpoint).
4. Verify Home and Inventory reflect the new stock and run-out estimates.
5. Edit a stock quantity and confirm the estimate recalculates.

---

## Deployment & Secrets

- No new secrets. This phase uses existing `DB` and `WORKER_JWT_SECRET`.
- Ensure D1 indexes are applied by running migrations if new indexes are added.

---

## Risks & Mitigations

| Risk                                                                        | Impact | Mitigation                                                                                                          |
| --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| Run-out calculation is inaccurate with sparse purchase history              | High   | Always fall back to a default basis, label it clearly in the UI, and let the user override qty/expiry.              |
| `run_out_days` becomes stale if purchase history changes but stock does not | Medium | Recalculate `run_out_days` when a new purchase is inserted (Phase 03) and via a scheduled job later (out of scope). |
| Large households with many stock rows slow down the query                   | Medium | Add indexes; paginate stock results if needed.                                                                      |
| PATCH allows changing another household's stock                             | High   | Strictly filter by `household_id` in the WHERE clause and return 404. Add integration test.                         |
| Home dashboard becomes too many queries                                     | Medium | Implement `GET /api/home` with a single optimized query or a few batched queries.                                   |

---

## Open Questions

1. **What is the default `run_out_days` when no history exists?** 30 days is a safe default for most pantry items. Perishable items should rely on expiry date instead.
2. **Should items be shared across households?** No, `items` is household-scoped. Keep it that way.
3. **Should we allow negative stock?** No, reject `qty < 0` in Zod validation.
4. **Should PATCH allow renaming the item, and should that rename affect purchase history?** Yes, update `items.name`; it is a canonical label, so history stays linked by `item_id`.
5. **Should we archive zero-qty stock?** Not in this phase. Keep the row with `qty = 0` and `run_out_days = 0`.
6. **Should `GET /api/home` include the next shopping plan?** Only if Phase 04 is done. For this phase, return `next_trip: null` or omit it.

---

## Alternatives Considered

- **Compute run-out on the fly instead of storing it:** Rejected because it requires scanning purchase history for every stock row on every `GET /api/stock`, which is expensive and scales poorly.
- **Use a separate `stock_stats` view or table:** Rejected for MVP; the `run_out_days` and `basis` columns are sufficient. A materialized view can be added later.
- **Client-side run-out calculation:** Rejected because purchase history is not exposed to the frontend in bulk and the logic belongs near the data.

---

## Implementation Notes for a Future Session

1. Write the run-out helper and unit tests first. It is the most complex piece of this phase.
2. Then update `GET /api/stock` to return the computed fields and add integration tests.
3. Then implement `PATCH /api/stock/:id` and test it.
4. Then implement `GET /api/home` (if chosen) and wire Home/Inventory.
5. Run the full test suite before opening the PR.

After this phase, the Home and Inventory pages show real data and the user can keep stock quantities up to date.
