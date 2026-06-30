# Agent Instructions

- Never ask user to run CLI commands—use, consider to use or create shell scripts under `scripts/`.
- `scripts/deploy.sh` is the single entrypoint for all deployments.
- Before PR: new branch from `main`, `npm test` passes, tests for new code, docs updated, no commented-out code/console.log, match code style (named exports, no semicolons, vitest).
- When asked to update this file, keep it compact and clear.
