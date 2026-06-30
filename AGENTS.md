# Agent Instructions

- Never ask user to run CLI commands, except shell scripts under `scripts/`.
- `scripts/deploy.sh` is the single entrypoint for all deployments.
- Consider to use public trusted library when working with external product (e.g. cloudflare) or commonly used logic (e.g. parsing json, authentication)
- The plan is intents, direction, and guidelines, not strictly must be followed, you are allowed to be critical, verify, or provide better alternatives. Confirm to me first before deviate from plan.
- Never commit and push directly to main branch, always use PR, except I asked it explicitly.
- Before create PR: new branch from `main`, read docs (README.md and all md files in docs folder), validate them against the code, update whichever side (docs or code) is out of sync so they stay consistent, tests for new code, `npm test` passes, match code style (e.g. named exports, no semicolons, vitest).
- Before merge PR: ensure github action success, read docs (README.md and all md files in docs folder), validate them against the code, update whichever side (docs or code) is out of sync so they stay consistent.
- When asked to update this file, keep it concise and clear.
