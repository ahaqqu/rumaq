# Assistant

The assistant is a floating action button (FAB) that opens a slide-out panel for AI-powered household management tasks — planning trips, finding deals, and reducing waste.

## What it changes

- **FAB** — persistent button in the bottom-right corner, labelled with a sparkle icon
- **Dialog panel** — slide-out panel with greeting, status, and action buttons
- **Quick actions** — "Plan this week", "Cheapest store", "Use up expiring" — each triggers an AI analysis
- **Proposal** — AI returns a structured shopping proposal with trips, items, and cost estimate
- **Apply to plan** — accepted proposals navigate the user to the Plan page
- **No-key fallback** — without an AI key, the panel shows a prompt to configure one
- **Usage indicator** — shows remaining daily AI calls with warning/danger states

## How it works

1. The FAB is always visible; tapping it opens the assistant panel
2. On open, status is checked: connected (usage shown), daily limit (warning), or disconnected (no key)
3. Without a key, the panel shows an "Add API key" button that navigates to Settings
4. With a key, the panel shows a persona-personalised greeting and three quick actions
5. Tapping a quick action triggers a simulated AI call (1.1s); a loading spinner is shown
6. The response is a mock proposal with store groupings, item lists, and a total estimate
7. **Apply to Plan** closes the panel and navigates to the Plan page
8. **Change** dismisses the proposal and returns to the action list

## Source

- `frontend/src/components/Assistant.jsx` — FAB, panel, actions, proposal
- `frontend/src/components/AppShell.jsx` — mounts `Assistant` and wires `aiKey`/`assistantOpen` state
- `frontend/src/data/mock.js` — `AI_USAGE`, `usageState` helpers
- `frontend/src/lib/persona.js` — assistant greeting/question text
