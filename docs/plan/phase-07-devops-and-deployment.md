# Phase 07 — DevOps & Deployment

**Status:** Partial (Pages and Worker configs are partial, R2 guide missing, preview deployments missing, env-specific configs missing)  
**Priority:** P0/P1  
**Source sections:** Sections 3, 7 of `docs/PROJECT_PLAN.md`  
**Estimated effort:** Medium

---

## Objective

Make the deployment process repeatable, documented, and safe. Set up preview environments for pull requests, automate R2 bucket creation, separate local/dev/prod environment configs, and document secrets management. The user impact is: _the team can ship confidently and review changes on real URLs before merging_.

This phase complements Phase 05 (final deployment) and Phase 06 (security/secrets) but focuses on the developer workflow.

---

## Acceptance Criteria

1. `scripts/deploy.sh cloudflare` deploys the Worker, D1 migrations, R2 bindings, and Pages frontend in the correct order without manual steps.
2. `scripts/deploy/deploy-cf.js` automates R2 bucket creation and binding.
3. Preview deployments are enabled for pull requests on Cloudflare Pages.
4. Environment-specific configs exist for local dev (`.dev.vars`), test (`wrangler.test.toml`), and production (`wrangler.cloudflare.toml`).
5. Secrets management is documented step-by-step.
6. GitHub Actions CI remains green and includes lint, typecheck, unit tests, and build.
7. A test automation workflow can deploy to a preview environment and run integration tests against it.
8. `docs/ARCHITECTURE.md` and `README.md` are updated with the latest deployment steps.
9. `npm test` and `npx tsc --noEmit` pass.

---

## Dependencies

- Phases 01-05 for the features being deployed.
- Existing `scripts/deploy.sh`, `scripts/deploy/deploy-cf.js`, `scripts/deploy/setup-db.js`.
- Existing GitHub Actions workflows in `.github/workflows/`.
- Cloudflare account and Wrangler CLI authentication.

---

## Scope

### 1. Unify and finalize deployment scripts

- `scripts/deploy.sh`:
  - Ensure it runs in the correct order:
    1. Typecheck and lint.
    2. Backend tests.
    3. Deploy Worker (with migrations).
    4. Build frontend with the deployed Worker URL.
    5. Deploy frontend to Pages.
  - Add `--dry-run` flag to validate without deploying.
  - Add proper error handling and exit on failure.
  - Support both `cloudflare` target and future targets.

- `scripts/deploy/deploy-cf.js`:
  - Add `r2-ensure` command to create the R2 bucket if it doesn't exist.
  - Add `r2-bind` or ensure binding is documented in `wrangler.cloudflare.toml`.
  - Add `put-secrets` command to upload secrets from a local file or env vars.
  - Add `pages-bindings` command to bind the D1 database and R2 bucket to Pages if needed (Pages may not need direct bindings since the Worker handles them, but document this).
  - Add `d1-setup` improvements: auto-copy database_id into wrangler files.

- `scripts/deploy/setup-db.js`:
  - Ensure it applies migrations locally and remotely.
  - Add a `--remote` flag.
  - Document usage.

### 2. Wrangler configuration files

- `backend/wrangler.local.toml` — local dev with Miniflare, local D1, local R2 if available, `EMAIL_AUTH_ENABLED = 'true'`.
- `backend/wrangler.test.toml` — integration test config, uses Docker/local bindings, test secrets.
- `backend/wrangler.cloudflare.toml` — production config with real `database_id`, R2 bucket name, Pages origin, routes.
- `backend/wrangler.toml.example` — template with placeholders, committed to repo.
- Keep sensitive values (`database_id`, bucket names) in environment-specific files; the example file stays generic.

### 3. Environment-specific configs and `.dev.vars`

- Add `backend/.dev.vars` (or `.dev.vars.example`) for local development:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `WORKER_JWT_SECRET`
  - `WORKER_ENCRYPTION_KEY`
  - `PAGES_ORIGIN=http://localhost:5173`
  - `EMAIL_AUTH_ENABLED=true`
- Ensure `.dev.vars` is in `.gitignore`.
- Add `.env.example` at the root if not already present, documenting frontend build vars like `VITE_API_BASE`.

### 4. Cloudflare Pages preview deployments

- Enable Pages preview branches in the Cloudflare dashboard for the project.
- Configure GitHub Actions to comment the preview URL on PRs.
- Ensure the preview frontend points to the production Worker (or a staging Worker) for API calls.
- Consider binding a preview Worker deployment for PRs as well (advanced; can be deferred).
- Add a workflow step that runs smoke tests against the preview URL after deployment.

### 5. GitHub Actions CI updates

- `.github/workflows/ci.yml`:
  - Ensure it runs lint, typecheck, unit tests, and frontend build.
  - Add a step to validate Wrangler configs.
- `.github/workflows/test-automation.yml`:
  - Keep Docker-based integration tests.
  - Optionally add a job that deploys to preview and runs E2E.
- `.github/workflows/smoke.yml`:
  - Keep scheduled production smoke tests.
  - Add a post-deploy smoke trigger.
- `.github/workflows/audit.yml`:
  - Keep daily dependency audit.

### 6. Secrets management documentation

- Create or update `docs/ARCHITECTURE.md` section on secrets:
  - How to generate `WORKER_JWT_SECRET` and `WORKER_ENCRYPTION_KEY`.
  - How to set secrets via Wrangler: `wrangler secret put <name>`.
  - How to bulk upload from `.dev.vars` (if supported).
  - How to rotate secrets.
  - Which secrets are required for local vs test vs prod.

### 7. R2 bucket creation guide

- Add to `README.md` or `docs/ARCHITECTURE.md`:
  - How to create the bucket via `deploy-cf.js r2-ensure` or the dashboard.
  - How to bind the bucket in `wrangler.cloudflare.toml`.
  - How to verify the bucket is private.

---

## Out of Scope

- Multi-region deployments.
- Terraform/Pulumi infrastructure-as-code.
- Kubernetes or non-Cloudflare hosting.
- Blue/green deployments.
- Canary releases.
- Advanced observability dashboards (Phase 09 may include some).

---

## Database Changes

No schema changes. This phase is about tooling and configuration.

---

## Testing Strategy

### Script tests

1. Add a `--dry-run` test that runs `scripts/deploy.sh cloudflare --dry-run` in CI and validates exit code.
2. Test `deploy-cf.js` commands against local Wrangler mock or with `--dry-run`.

### CI tests

1. Ensure CI still passes after config changes.
2. Open a test PR and verify the preview URL is generated and commented.
3. Run integration tests against the preview URL if configured.

### Manual verification

1. Run `scripts/deploy.sh cloudflare` from a clean checkout and verify it deploys.
2. Verify the live URL works.
3. Open a PR and verify the preview deployment.
4. Verify secrets are set correctly and not leaked in logs.

---

## Deployment & Secrets

- The deployment script itself must not print secrets. Use `wrangler secret put` or Cloudflare API calls that do not echo values.
- Keep `wrangler.cloudflare.toml` and `wrangler.local.toml` in version control. Keep `.dev.vars` out of version control.
- Document how to rotate `WORKER_JWT_SECRET` and `WORKER_ENCRYPTION_KEY` safely (this usually requires re-encrypting data).

---

## Risks & Mitigations

| Risk                                                       | Impact | Mitigation                                                                                    |
| ---------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Deployment script fails silently or deploys out of order   | High   | Add `set -e` or equivalent; validate each step; add `--dry-run`.                              |
| Preview deployments point to the wrong Worker              | High   | Make `VITE_API_BASE` configurable per environment; default to production Worker for previews. |
| Secrets are leaked in CI logs                              | High   | Use GitHub secrets and Wrangler's secret management; never echo values.                       |
| `.dev.vars` is accidentally committed                      | High   | Add to `.gitignore` and use `.dev.vars.example` as a template.                                |
| Wrangler config drift causes local/test/prod inconsistency | Medium | Keep configs in version control; use a schema validation script if possible.                  |
| Preview deployments are not gated                          | Low    | Add a manual approval step or only run on non-draft PRs.                                      |

---

## Open Questions

1. **Should preview deployments use a separate staging Worker or the production Worker?** Recommendation: use the production Worker for simplicity, but be aware that preview frontend tests will write to production data. A staging Worker/database is better but adds cost/complexity. Document the decision.
2. **Should D1 migrations run automatically in CI?** Recommendation: run migrations as part of `deploy.sh` but not automatically on PR; require manual approval for production schema changes.
3. **Should R2 bucket creation be part of `deploy.sh` or a separate setup command?** Recommendation: separate setup command (`deploy-cf.js r2-ensure`) that is run once, but `deploy.sh` should verify the binding exists.
4. **Should the CI build the frontend with a production API base even for PRs?** Yes, because the production Worker is the stable API target for previews.
5. **Should we use Wrangler Pages Functions or keep the SPA on Pages?** Keep the SPA on Pages; the Worker is the API. This is already the architecture.

---

## Alternatives Considered

- **Use GitHub Actions for all deployments instead of `deploy.sh`:** Rejected because a local script is useful for manual deploys and debugging. Keep both.
- **Use a single `wrangler.toml` with environment overrides:** Rejected because separate files are clearer and match the current pattern (`wrangler.local.toml`, `wrangler.cloudflare.toml`, `wrangler.test.toml`).
- **Deploy Worker only after Pages build:** Rejected because the frontend build needs the deployed Worker URL to set `VITE_API_BASE`. Order: Worker first, then Pages.
- **Use Cloudflare Pages Direct Upload via API:** `wrangler pages deploy` is the current path; keep it.

---

## Implementation Notes for a Future Session

1. Audit the existing `deploy.sh` and `deploy-cf.js` and list gaps.
2. Add R2 bucket automation and update the docs.
3. Create/update environment-specific Wrangler configs.
4. Add `.dev.vars.example` and document secrets.
5. Enable Pages preview deployments in the Cloudflare dashboard and add a GitHub Actions step to comment the URL.
6. Run a test deploy and verify the live URL.
7. Run the full CI test suite and open a PR.

After this phase, the team has a reliable, repeatable deployment workflow with preview environments and clear documentation.
