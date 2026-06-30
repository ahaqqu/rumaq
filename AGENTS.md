# Agent Instructions

- Never ask user to run CLI commands—use, consider to use or create shell scripts under `scripts/`.
- `scripts/deploy.sh` is the single entrypoint for all deployments.
- Consider to use public trusted library when working with external product (e.g. cloudflare) or commonly used logic (e.g. parsing json, authentication)
- The plan is intents, direction, and guidelines, not strictly must be followed, you are allowed to be critical, verify, or provide better alternatives. Confirm to me first before deviate from plan.
- Before PR: new branch from `main`, validate with docs and update docs if required, tests for new code, `npm test` passes, match code style (e.g. named exports, no semicolons, vitest).
- When implementing or changing API behavior, read `docs/API.md` and `docs/ARCHITECTURE.md`, validate them against the code, and update whichever side (docs or code) is out of sync so they stay consistent.
- When asked to update this file, keep it concise and clear.
