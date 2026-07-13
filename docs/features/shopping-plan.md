# Shopping Plan

The shopping-plan feature generates AI-powered shopping lists organised by store, helping users plan their next grocery trips based on what's running out or expiring.

## What it changes

- **AI list** — generates a multi-store shopping plan with itemised prices and reasoning
- **Regenerate** — replaces the current plan with a fresh AI-generated one
- **Check-off** — interactive checklist to track what's been bought
- **Grand total** — per-store and overall cost estimate
- **No-key fallback** — shows sample plan when AI key is missing

## How it works

1. The Plan page is mounted with an `aiKey` prop; without one it shows a prompt to configure a key
2. On initial render, a mock plan (`PLAN` from `data/mock.js`) is displayed for demo purposes
3. Tapping **Regenerate** triggers a simulated 1.3s AI call, replacing the plan
4. Each trip is grouped by store with items, quantities, and price estimates
5. Users check items off as they shop; when all items are checked, an "all bought" banner appears
6. The **Ask Assistant** button opens the assistant panel for custom requests

## API endpoint

| Method | Path         | Auth | Description                  |
| ------ | ------------ | ---- | ---------------------------- |
| —      | —            | —    | Fully frontend (mock data)   |

The shopping plan is currently demo-only with mock data. Real AI integration is planned for a future iteration.

## Source

- `frontend/src/pages/Plan.jsx` — plan page with regenerate, checklist, trip grouping
- `frontend/src/data/mock.js` — `PLAN` mock data and helpers
- `frontend/src/components/Assistant.jsx` — assistant panel with proposal generation
