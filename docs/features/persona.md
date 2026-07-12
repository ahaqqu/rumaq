# Persona

The persona feature lets users personalise RumaQ's tone and appearance by defining a role relationship (e.g. "I am the king, you are the warrior").

## What it changes

- **UI copy** — lead text and instructions are rewritten by AI based on the roles.
- **AI prompt** — the assistant's system prompt includes the chosen role.
- **Theme colour** — derived from the role pair so each persona has a unique visual identity.

## How it works

Enter your roles in **Settings**, tap **Apply**. If an AI key is available, the AI is called once to rewrite all app copy. Results are cached; refreshing or logging out won't call AI again. Without an AI key, the persona falls back to a built-in style based on the detected role.

## Source

The logic lives in `frontend/src/lib/persona.js` and is managed through `PersonaContext`. Persona settings are persisted via `GET /api/settings` and `PATCH /api/settings` with a `localStorage` fallback for offline resilience.
