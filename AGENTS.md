# Agent Instructions

- Never ask user to run CLI commands, except shell scripts under `scripts/`.
- Do not read or display the contents of `.env` files.
- `scripts/deploy.sh` is the single entrypoint for all deployments. Deploy to Cloudflare via `./scripts/deploy.sh cloudflare`.
- `scripts/test-unit.sh`, `scripts/test-automation-local.sh`, `scripts/test-automation-live.sh` are the entrypoints for tests.
- Consider to use public trusted library when working with external product (e.g. cloudflare) or commonly used logic (e.g. parsing json, authentication)
- The plan is intents, direction, and guidelines, not strictly must be followed, you are allowed to be critical, verify, or provide better alternatives. Confirm to me first before deviate from plan.
- Never commit and push directly to main branch, always use PR, except I asked it explicitly.
- Before create PR: new branch from `main`, read docs (README.md and all md files in docs folder), validate them against the code, update whichever side (docs or code) is out of sync so they stay consistent, meet all acceptance criterias in `docs/TEST_STRATEGY.md` passes, match code style (e.g. named exports, no semicolons, vitest).
- Before merge PR: ensure github action success.
- When asked to update this file, keep it concise and clear.

## Frontend conventions (post-refactor)

- **Styling**: Use Tailwind v4 utility classes. Import from `src/lib/cn.js` for conditional classes.
- **Kumo tokens**: Reference via `bg-kumo-elevated`, `text-kumo-default`, `border-kumo-line`, etc.
- **Components**: Prefer Kumo components (`<Button>`, `<Input>`, `<Badge>`, `<Card>`, `<Skeleton>`, `<Dialog>`) over custom HTML.
- **Icons**: Use `@phosphor-icons/react` (imported via `src/components/icons.jsx` re-exports).
- **Routing**: File-based routes in `src/routes/`. Use `<Link>`, `useNavigate()`, `useMatches()` from `@tanstack/react-router`.
- **Server state**: Use TanStack Query hooks from `src/lib/queries/`. Mutations use `useMutation` with `onSuccess` invalidation.
- **Route tree**: Auto-generated at build time by `@tanstack/router-plugin/vite` as `src/routeTree.gen.ts` (committed so test imports resolve). Regenerate with `npx @tanstack/router-generator --generator src/routes` after adding routes.
- **Shared state**: `AppContext` (`src/context/AppContext.jsx`) for `aiKey`, `motion`, `assistantOpen`.
- **Auth**: Handled in `src/routes/__root.jsx` via `useMe()` query. Unauthenticated users see `<Login>`.
- **PWA**: Service worker managed by `vite-plugin-pwa`. Update prompt in `<PwaUpdatePrompt>`.
- **Test wrapper**: Use `renderWithProviders` pattern with `QueryClientProvider` + router mocks.
