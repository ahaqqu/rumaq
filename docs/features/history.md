# Purchase History

The history page displays past purchases grouped by month, giving users a record of what was bought, where, and for how much.

## What it changes

- **Monthly groups** — purchases sorted by date, grouped under month headers with a per-month total
- **Itemised rows** — each row shows date, item name + qty, store, and price
- **Pattern detection** — banner suggesting the assistant can analyse spending patterns
- **Persona** — lead text personalised by the active persona

## How it works

1. On mount, mock `HISTORY` data is loaded from `data/mock.js` and sorted newest-first
2. Purchases are grouped by `YYYY-MM` key; each group gets a header with the month name and subtotal
3. Dates are formatted using the current locale's month names from i18n
4. Store names are resolved through `storeLabel()` for display
5. A "Pattern detected" banner offers to open the assistant for deeper analysis

## API endpoint

| Method | Path               | Auth | Description                     |
| ------ | ------------------ | ---- | ------------------------------- |
| —      | —                  | —    | Fully frontend (mock data)      |

Purchase history is currently demo-only with mock data. Backend integration is planned.

## Source

- `frontend/src/pages/History.jsx` — grouped purchase table
- `frontend/src/data/mock.js` — `HISTORY` mock data and `storeLabel` helper
- `frontend/src/components/Assistant.jsx` — assistant for spending analysis
