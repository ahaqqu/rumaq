# Inventory

The inventory page shows the household's current stock, letting users browse, filter, search, and adjust quantities.

## What it changes

- **Stock list** — items grouped by location with qty, unit, and time signal (expiry countdown / run-out estimate)
- **Search** — client-side debounced search filters stock by name
- **Location filter** — chip-based filter to narrow by storage location (Kulkas, Freezer, etc.)
- **Quick qty adjust** — inline +/- buttons to increment or decrement stock without navigating away
- **TimeSignal** — visual indicator showing days until expiry or estimated run-out

## How it works

1. On mount, `useStock()` fetches stock via `GET /api/stock` with optional `location` and `q` (search) params
2. `useLocations()` fetches available locations for the filter chips
3. Search input is debounced at 300ms before triggering a re-fetch
4. Each stock row shows name, location chip, time signal, and editable qty
5. +/- buttons call `useUpdateStock` mutation which `PATCH /api/stock/:id` with the new qty
6. Qty cannot go below 0

## API endpoints

| Method | Path               | Auth | Description                          |
| ------ | ------------------ | ---- | ------------------------------------ |
| GET    | `/api/stock`       | Yes  | List stock, optional `?location=&q=` |
| PATCH  | `/api/stock/:id`   | Yes  | Update stock qty                     |

## Source

- `frontend/src/pages/Inventory.jsx` — stock list, search, filter, qty controls
- `frontend/src/lib/queries/stock.js` — `useStock`, `useUpdateStock` hooks
- `frontend/src/lib/queries/locations.js` — `useLocations` hook
- `frontend/src/components/ui.jsx` — `TimeSignal`, `LocChip` components
