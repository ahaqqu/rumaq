# Home Dashboard

The home page is the main landing after login, giving a snapshot of household stock health, upcoming shopping needs, and quick actions.

## What it changes

- **Stats bar** — total items monitored, expiring soon (7 days), nearly out (7 days)
- **Needs attention** — list of low-stock or expiring items with qty, unit, time signal
- **Next trip** — shows the latest shopping plan with store and item chips; links to Plan view
- **Quick refill** — shortcut to Add from Receipt flow
- **Tip** — contextual assistant prompt (savings tip, recipe idea)
- **Persona** — lead text is personalised by the active persona

## How it works

1. On mount, `useHome()` fires `GET /api/home` via React Query
2. The backend runs four queries against the active household:
   - Total stock count (`qty > 0`)
   - Items expiring within 7 days
   - Items with `run_out_days <= 7`
   - Low-stock/expiring items with full details (name, qty, unit, location, expiry, run-out days)
3. Response shape:
   ```json
   {
     "total_items": 42,
     "expiring_7d": 3,
     "running_out_7d": 5,
     "low_stock": [{ "id": "...", "name": "Milk", "qty": 0.5, "unit": "L", ... }],
     "expiring_soon": [],
     "next_trip": null
   }
   ```
4. The `next_trip` and `expiring_soon` fields are reserved for future features (currently always `null`/`[]`)
5. The stats bar shows four tiles; items expiring or running out get a warning style
6. The needs-attention section maps `low_stock` into rows with `TimeSignal` (expiry countdown or run-out indicator)
7. Quick actions navigate to Add from Receipt, Plan, or the assistant

## API endpoint

| Method | Path        | Auth | Description                          |
| ------ | ----------- | ---- | ------------------------------------ |
| GET    | `/api/home` | Yes  | Dashboard stats for active household |

Response has `private, no-cache` Cache-Control.

## Source

- `backend/src/apps/api.ts:354` — `GET /api/home` handler
- `frontend/src/pages/Home.jsx` — dashboard component
- `frontend/src/lib/queries/home.js` — React Query hook (`useHome`)
- `frontend/src/lib/api.js` — `getHome()` fetch client
