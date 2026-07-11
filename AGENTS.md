# Agent Instructions

- Never ask user to run CLI commands, except shell scripts under `scripts/`.
- Do not read or display the contents of `.env` files.
- `scripts/deploy.sh` is the single entrypoint for all deployments. Deploy to Cloudflare via `./scripts/deploy.sh cloudflare`.
- `scripts/test-unit.sh`, `scripts/test-automation-local.sh`, `scripts/test-automation-live.sh` are the entrypoints for tests.
- Consider to use public trusted library when working with external product (e.g. cloudflare) or commonly used logic (e.g. parsing json, authentication)
- The plan is intents, direction, and guidelines, not strictly must be followed, you are allowed to be critical, verify, or provide better alternatives. Confirm to me first before deviate from plan.
- Never commit and push directly to main branch, always use PR, except I asked it explicitly.
- Before creating a PR, follow the `/pr-creation` skill.
- When implementing a complex or unclear plan from a file, follow the `/guided-implementation` skill.
- Before merging a PR, ensure the GitHub Action succeeds.
- When asked to update this file, keep it concise and clear.
- Follow `docs/FRONTEND_CONVENTIONS.md` for frontend coding conventions.
- Follow `docs/BACKEND_CONVENTIONS.md` for backend coding conventions.

