# RumaQ Frontend Refactor Plan

> **Goal:** Migrate the RumaQ frontend from a React 19 + Vite SPA with hand-written CSS to a modern stack using **@cloudflare/kumo**, **TanStack Router**, **TanStack Query**, **vite-plugin-pwa**, and **Tailwind v4**.
>
> **Scope:** Frontend only. The Hono backend, D1 schema, R2, and Cloudflare Pages deployment pipeline remain unchanged.
>
> **Status:** Planning document — ready for implementation handoff.

---

## 1. Context & constraints

### 1.1 Current state

- **Build tool:** Vite 8
- **Framework:** React 19 SPA
- **Styling:** Three hand-written CSS files (`tokens.css`, `base.css`, `components.css`) using BEM-style class names and OKLCH color tokens
- **Routing:** None. `App.jsx` uses `useState('view')` and conditionally renders page components
- **Server state:** Plain `fetch` wrappers in `src/lib/api.js`; loading/auth state managed locally
- **PWA:** None
- **Icons:** Custom SVG icons in `src/components/icons.jsx`
- **i18n:** `react-i18next` (keep as-is)
- **Testing:** Vitest + jsdom + React Testing Library; Playwright BDD e2e in `automation/`

### 1.2 Target state

- **Routing:** TanStack Router (file-based)
- **Server state:** TanStack Query
- **UI library:** `@cloudflare/kumo` (Base UI + Tailwind v4)
- **Styling:** Tailwind v4 utility classes + Kumo semantic tokens, overridden with RumaQ’s sky OKLCH palette
- **PWA:** `vite-plugin-pwa` with manifest, icons, precaching, and runtime API caching
- **Icons:** `@phosphor-icons/react` (Kumo’s peer dependency; aligns with the library)
- **Backend:** Unchanged (Hono on Cloudflare Workers, bundled as `frontend/dist/_worker.js`)

### 1.3 Non-goals

- Do not migrate to TanStack Start (keep Hono backend).
- Do not redesign the visual identity; preserve RumaQ’s sky OKLCH theme.
- Do not add new product features; refactor existing functionality only.
- Do not change the deployment target (Cloudflare Pages).

---

## 2. Architecture decisions

| Decision | Choice | Rationale |
|---|---|---|
| Router | TanStack Router + file-based route tree | Type-safe, naturally pairs with Query, clean replacement for view state |
| Server state | TanStack Query | Caching, retries, loading/error states, devtools |
| UI components | `@cloudflare/kumo` | Accessible, Base UI primitives, Tailwind v4 native |
| Tailwind version | v4 | Required by Kumo; CSS-first config via `@theme` |
| Styling migration | Utility-first, page-by-page | Cleaner long-term; easier to delete dead CSS |
| Icons | `@phosphor-icons/react` | Kumo peer dependency; reduces custom icon code |
| Theme strategy | RumaQ overrides Kumo semantic tokens | Keeps current identity while leveraging Kumo components |
| PWA caching | Precache static assets; runtime cache API | Simple offline shell; API data stays fresh |
| Package manager | Keep npm | Project already uses npm workspaces; Kumo is published to npm |

---

## 3. Phase-by-phase implementation

### Phase 0 — Tooling foundation

**Goal:** Add dependencies and configure Vite, Tailwind, and Kumo without changing any UI.

1. **Install runtime dependencies**
   ```bash
   npm install -w frontend \
     @cloudflare/kumo \
     @phosphor-icons/react \
     @tanstack/react-router \
     @tanstack/react-query \
     @tanstack/react-query-devtools
   ```

2. **Install dev dependencies**
   ```bash
   npm install -w frontend -D \
     @tanstack/router-vite-plugin \
     @tanstack/router-devtools \
     vite-plugin-pwa \
     tailwindcss \
     @tailwindcss/vite \
     clsx \
     tailwind-merge
   ```

3. **Verify React 19 compatibility**
   - Check `npm ls @cloudflare/kumo` peer deps.
   - If Kumo only declares React ^18, test a `<Button>` render. If it fails, temporarily pin React 18 and document in the plan; otherwise proceed.

4. **Update `frontend/vite.config.js`**
   - Add `@tailwindcss/vite` plugin **before** `react()`.
   - Add `@tanstack/router-vite-plugin`.
   - Add `vite-plugin-pwa` with a minimal config (manifest placeholders).
   - Keep the `/api` proxy.

5. **Create `frontend/src/styles.css`**
   - `@import "tailwindcss";`
   - `@import "@cloudflare/kumo/styles";` (verify exact package export path; may be `@cloudflare/kumo/dist/styles.css`)
   - Define RumaQ theme override block.

6. **Update `frontend/src/main.jsx`**
   - Replace the three CSS imports with `import './styles.css'`.

7. **Create `frontend/src/lib/cn.js`**
   ```js
   import clsx from 'clsx'
   import { twMerge } from 'tailwind-merge'
   export function cn(...inputs) { return twMerge(clsx(inputs)) }
   ```

8. **Verify build**
   - Run `npm run build -w frontend`.
   - Fix any immediate Vite/Tailwind/Kumo import errors.

**Definition of done:** `npm run build -w frontend` passes; a test page renders a Kumo `<Button>` in RumaQ colors.

---

### Phase 1 — RumaQ theme for Kumo

**Goal:** Make Kumo components render using RumaQ’s existing sky OKLCH palette.

1. **Map tokens**
   See Section 7 for the full mapping table.

2. **Create theme override CSS**
   In `frontend/src/styles.css`, add:
   ```css
   :root,
   [data-theme="rumaq"] {
     --color-kumo-canvas: var(--surface);
     --color-kumo-elevated: var(--surface-raised);
     --color-kumo-recessed: var(--surface-sunken);
     --color-kumo-base: var(--surface-raised);
     --color-kumo-line: var(--border);
     --color-kumo-hairline: var(--border-strong);
     --text-color-kumo-default: var(--text);
     --text-color-kumo-subtle: var(--text-muted);
     --text-color-kumo-inactive: var(--text-faint);
     --color-kumo-brand: var(--accent);
     --color-kumo-brand-hover: var(--accent-hover);
     --color-kumo-danger: var(--danger);
     --color-kumo-warning: var(--warn);
     --color-kumo-success: var(--ok);
     --color-kumo-info: var(--accent);
     --color-kumo-info-tint: var(--accent-soft);
     --color-kumo-danger-tint: var(--danger-soft);
     --color-kumo-warning-tint: var(--warn-soft);
     --color-kumo-success-tint: var(--ok-soft);
   }
   ```

3. **Keep RumaQ CSS variables**
   Keep the existing custom properties (or redeclare them in `styles.css`) so persona hue-shifting continues to work.

4. **Set theme attribute**
   In `main.jsx` or `__root.jsx`, add `data-theme="rumaq"` to the rendered root or `<html>`.

5. **Update persona theme application**
   In `src/lib/persona.js`, ensure `applyTheme()` mutates the CSS variables that Kumo tokens reference (e.g. `--accent`, `--accent-hover`).

**Definition of done:** Kumo `<Button variant="primary">`, `<Input>`, and `<Badge>` render in RumaQ sky colors in both light and dark browser modes.

---

### Phase 2 — TanStack Router

**Goal:** Replace `useState('view')` with a file-based route tree.

1. **Create route files**
   ```
   frontend/src/routes/
   ├── __root.jsx          # Root layout: providers + AppShell wrapper
   ├── index.jsx           # Home
   ├── inventory.jsx
   ├── add.jsx
   ├── plan.jsx
   ├── history.jsx
   └── settings.jsx
   ```

2. **Generate route tree**
   The `@tanstack/router-vite-plugin` will auto-generate `frontend/src/routeTree.gen.ts` (or `.js`). Ensure it is gitignored if generated at build time, or committed if generated once.

3. **Implement `__root.jsx`**
   - Import `PersonaProvider`.
   - Import `QueryClientProvider` (prepared in Phase 3; can stub for now).
   - Render `AppShell` or an auth gate.
   - Render `<Outlet />`.

4. **Implement each route**
   - Move the current page component content into `component()`.
   - Keep route components thin; the heavy lifting stays in page modules under `src/pages/` if preferred, or move pages into route files directly.

5. **Refactor `App.jsx`**
   - Remove view state.
   - Keep auth check and render `<RouterProvider router={router} />`.
   - Or remove `App.jsx` entirely and do auth in `__root.jsx` with a loader.

6. **Update `AppShell.jsx`**
   - Replace `setView` calls with `<Link to="/inventory">` etc.
   - Derive active state with `useMatch({ from: '/inventory', shouldThrow: false })`.
   - Keep rail, topbar, bottombar structure.

7. **Update `Login.jsx`**
   - After login, call `navigate({ to: '/' })` from `useNavigate`.

8. **Remove `VIEWS` array and view conditional rendering**
   - Delete from `App.jsx` once routes handle it.

**Definition of done:** All navigation works via URLs (`/`, `/inventory`, `/add`, `/plan`, `/history`, `/settings`); browser back/forward works.

---

### Phase 3 — TanStack Query

**Goal:** Move server state out of local `useState`/`useEffect`.

1. **Create query client**
   In `__root.jsx`:
   ```jsx
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 1000 * 60 * 5,
         retry: 1,
       },
     },
   })
   ```

2. **Create query hooks**
   Create `frontend/src/lib/queries/`:
   ```
   queries/
   ├── me.js
   ├── stock.js
   ├── settings.js
   ├── usage.js
   ├── locations.js
   ├── stores.js
   ├── plans.js
   ├── history.js
   └── index.js
   ```
   Each file exports:
   - `useX()` query hook
   - `useXQueryOptions()` for dependent queries
   - `useUpdateX()` mutation hook where applicable

3. **Update `api.js`**
   - Keep the low-level `request()` helper.
   - Add functions for all backend endpoints as they are needed.
   - Add typed error handling if desired.

4. **Replace local state**
   - `App.jsx`: replace `getMe()` useEffect with `useMe()`.
   - `Home.jsx`: use `useStock()`.
   - `Inventory.jsx`: use `useStock()` with filters.
   - `Settings.jsx`: use `useSettings()`, `useUpdateSettings()`.
   - `Plan.jsx`: use `usePlans()`, `useGeneratePlan()`.
   - `History.jsx`: use `useHistory()`.

5. **Add devtools**
   - Render `<ReactQueryDevtools initialIsOpen={false} />` in `__root.jsx` behind `import.meta.env.DEV`.

**Definition of done:** No page fetches data inside `useEffect`; all data fetching goes through TanStack Query hooks.

---

### Phase 4 — UI migration to Kumo + Tailwind

**Goal:** Replace custom CSS components with Kumo components and Tailwind utilities.

1. **Delete legacy CSS imports but keep files temporarily**
   They are already unimported since Phase 0. Delete them only after all pages are converted.

2. **Migrate `AppShell.jsx`**
   - Replace BEM classes (`rail`, `topbar`, `bottombar`, etc.) with Tailwind utilities.
   - Use Kumo tokens: `bg-kumo-elevated`, `border-kumo-line`, `text-kumo-default`.
   - Use `<Button>` for the primary "Add from receipt" action.

3. **Migrate shared primitives in `src/components/ui.jsx`**
   - `LocChip` → Kumo `<Badge variant="neutral">` or custom Tailwind.
   - `TimeSignal` → keep logic, use Tailwind for styling.
   - `EmptyState` → custom Tailwind or Kumo `<Card>`.
   - `SkeletonRows` → Kumo `<Skeleton>`.
   - `UsageMeter` → custom Tailwind using Kumo tokens.

4. **Migrate icons**
   - Replace custom `IconHome`, `IconBox`, etc. with Phosphor equivalents (`House`, `Package`, `ShoppingCart`, `Clock`, `Gear`, `Receipt`, `X`).
   - Update `icons.jsx` to re-export Phosphor icons, or replace imports directly in components.

5. **Migrate pages one by one**
   - Start with `Home.jsx` (simplest), then `Inventory`, `History`, `Settings`, `Plan`, `AddFromReceipt`.
   - Replace `.btn`, `.panel`, `.list`, `.row`, `.chip`, `.badge`, `.ts`, `.empty`, `.skeleton` classes with Kumo/Tailwind.
   - Use Kumo `<Input>`, `<Select>`, `<Dialog>`, `<Button>`, `<Card>`, `<Badge>`, `<Skeleton>` where appropriate.

6. **Migrate `Assistant.jsx`**
   - Use Kumo `<Dialog>` or custom panel.
   - Use `<TextArea>` and `<Button>`.

7. **Remove `components.css` and `tokens.css` and `base.css`**
   - Only after all references are gone and tests pass.

**Definition of done:** No BEM classes remain; all styling uses Tailwind utilities or Kumo components; old CSS files are deleted.

---

### Phase 5 — PWA with `vite-plugin-pwa`

**Goal:** Make RumaQ installable and offline-capable.

1. **Configure `vite-plugin-pwa`**
   In `vite.config.js`:
   ```js
   VitePWA({
     registerType: 'prompt',
     injectRegister: 'auto',
     manifest: {
       name: 'RumaQ',
       short_name: 'RumaQ',
       description: 'Household shopping & inventory assistant',
       theme_color: '#f4f8fb',
       background_color: '#f4f8fb',
       display: 'standalone',
       start_url: '/',
       icons: [
         { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
         { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
       ],
     },
     workbox: {
       globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
       runtimeCaching: [
         {
           urlPattern: /^https?:\/\/.*\/api\//,
           handler: 'NetworkFirst',
           options: {
             cacheName: 'api-cache',
             expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
           },
         },
       ],
     },
   })
   ```

2. **Generate PWA icons**
   - Create `public/icon-192x192.png` and `public/icon-512x512.png` from the existing SVG favicon.
   - Update `index.html` `<link rel="icon" ...>` if needed.

3. **Add update prompt**
   - Create `src/components/PwaUpdatePrompt.jsx`.
   - Use `useRegisterSW` from `virtual:pwa-register/react`.
   - Show a Kumo `<Banner>` or `<Toast>` when an update is available.

4. **Add offline fallback**
   - Create `public/offline.html`.
   - Configure `navigateFallback: '/offline.html'` in workbox options.

**Definition of done:** Lighthouse PWA audit passes; app installs; refresh works offline for cached assets; API calls fall back gracefully when offline.

---

### Phase 6 — Tests, docs, and CI

**Goal:** Ensure everything works and documentation is up to date.

1. **Update test setup**
   - In `src/test-setup.js`, create a reusable `render` wrapper that provides:
     - `QueryClientProvider` with a test client
     - Router provider (memory router or stubbed)
     - `I18nextProvider`
     - `PersonaProvider`
   - Example:
     ```js
     export function renderWithProviders(ui, { route = '/' } = {}) {
       const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
       return render(ui, {
         wrapper: ({ children }) => (
           <QueryClientProvider client={queryClient}>
             <RouterProvider router={createMemoryRouter(...)} defaultComponent={() => children} />
           </QueryClientProvider>
         ),
       })
     }
     ```

2. **Update unit tests**
   - Update `App.test.jsx`, `AppShell.test.jsx`, `main.test.jsx`, and page tests.
   - Replace assertions on view state with route/navigation assertions.
   - Mock TanStack Query hooks where needed, or use MSW to mock API responses.

3. **Update e2e tests**
   - Update Playwright BDD step definitions in `automation/tests/local/e2e/` if they depend on class names or old navigation behavior.

4. **Run full test matrix**
   ```bash
   npm test -w frontend
   npm run test -w backend
   npm run test:api
   npm run test:e2e
   npm run build -w frontend
   ./scripts/deploy.sh dry-run
   ```

5. **Update documentation**
   - `docs/ARCHITECTURE.md`: update frontend technology table and request flow if PWA changes caching.
   - `docs/PROJECT_PLAN.md`: mark PWA and offline items as done; add refactor line item.
   - `AGENTS.md`: add conventions for Tailwind v4, Kumo tokens, `cn()` usage, and route file naming.
   - `README.md`: update frontend stack table.

6. **Open PR**
   - Branch from `main`.
   - Include the plan doc in the PR.
   - Ensure GitHub Actions pass before merging.

**Definition of done:** All tests pass, build succeeds, docs are in sync, and GitHub Actions are green.

---

## 4. Route mapping

| Current view state | TanStack route | Route file | Page component |
|---|---|---|---|
| `home` | `/` | `src/routes/index.jsx` | `Home` |
| `inventory` | `/inventory` | `src/routes/inventory.jsx` | `Inventory` |
| `add` | `/add` | `src/routes/add.jsx` | `AddFromReceipt` |
| `plan` | `/plan` | `src/routes/plan.jsx` | `Plan` |
| `history` | `/history` | `src/routes/history.jsx` | `History` |
| `settings` | `/settings` | `src/routes/settings.jsx` | `Settings` |

---

## 5. Query hooks inventory

Create these in `src/lib/queries/`:

| Hook | Query key | API function | Notes |
|---|---|---|---|
| `useMe()` | `['me']` | `getMe()` | Auth gate |
| `useStock({ location, q })` | `['stock', { location, q }]` | `getStock(...)` | Used on Home and Inventory |
| `useSettings()` | `['settings']` | `getSettings()` | New backend endpoint needed |
| `useUpdateSettings()` | mutation | `updateSettings(...)` | Optimistic update |
| `useUsage()` | `['usage']` | `getUsage()` | New backend endpoint needed |
| `useLocations()` | `['locations']` | `getLocations()` | New backend endpoint needed |
| `useStores()` | `['stores']` | `getStores()` | New backend endpoint needed |
| `usePlans()` | `['plans']` | `getPlans()` | New backend endpoint needed |
| `useGeneratePlan()` | mutation | `generatePlan(...)` | |
| `useHistory({ ... })` | `['history', filters]` | `getPurchases(...)` | New backend endpoint needed |
| `useLogout()` | mutation | `logout()` | Clears `['me']` query |

> **Note:** Several backend endpoints (`/api/settings`, `/api/locations`, `/api/stores`, `/api/plans`, `/api/purchases`, `/api/ai/usage`) are currently not implemented. This refactor assumes they are added in parallel backend PRs or already exist. If not, stub the query hooks and mark the backend work as a dependency.

---

## 6. Theme token mapping

Map RumaQ custom properties to Kumo semantic tokens. Keep the underlying RumaQ variables so persona hue-shifting still works.

| RumaQ variable | Kumo token | Usage |
|---|---|---|
| `--surface` | `color-kumo-canvas` | App background |
| `--surface-raised` | `color-kumo-elevated` / `color-kumo-base` | Cards, rail, panels |
| `--surface-sunken` | `color-kumo-recessed` | Hover states, inset areas |
| `--border` | `color-kumo-line` | Dividers, input borders |
| `--border-strong` | `color-kumo-hairline` | Stronger borders |
| `--text` | `text-color-kumo-default` | Primary text |
| `--text-muted` | `text-color-kumo-subtle` | Secondary text |
| `--text-faint` | `text-color-kumo-inactive` | Placeholder, disabled |
| `--accent` | `color-kumo-brand` | Primary buttons, links |
| `--accent-hover` | `color-kumo-brand-hover` | Primary button hover |
| `--accent-soft` | `color-kumo-info-tint` | Tinted backgrounds |
| `--danger` | `color-kumo-danger` | Errors, danger badges |
| `--danger-soft` | `color-kumo-danger-tint` | Danger backgrounds |
| `--warn` | `color-kumo-warning` | Warnings |
| `--warn-soft` | `color-kumo-warning-tint` | Warning backgrounds |
| `--ok` | `color-kumo-success` | Success states |
| `--ok-soft` | `color-kumo-success-tint` | Success backgrounds |

---

## 7. File-level task checklist

Use this checklist during implementation and in the PR description.

### Tooling
- [ ] Install Kumo, TanStack, PWA, Tailwind dependencies
- [ ] Update `vite.config.js`
- [ ] Create `src/styles.css`
- [ ] Update `src/main.jsx`
- [ ] Create `src/lib/cn.js`
- [ ] Verify build passes

### Theme
- [ ] Port RumaQ tokens to Kumo semantic tokens in `styles.css`
- [ ] Set `data-theme="rumaq"`
- [ ] Update `src/lib/persona.js` to mutate Kumo-referenced variables
- [ ] Verify Kumo components render in RumaQ colors

### Router
- [ ] Create `src/routes/__root.jsx`
- [ ] Create route files for `/`, `/inventory`, `/add`, `/plan`, `/history`, `/settings`
- [ ] Refactor `App.jsx` to use `RouterProvider`
- [ ] Update `AppShell.jsx` navigation to use `<Link>` and `useMatch`
- [ ] Update `Login.jsx` to navigate after login
- [ ] Remove `VIEWS` array and view state

### Query
- [ ] Create `QueryClient` in `__root.jsx`
- [ ] Create query/mutation hooks in `src/lib/queries/`
- [ ] Replace `useEffect` data fetching in all pages
- [ ] Add `ReactQueryDevtools`

### UI migration
- [ ] Migrate `AppShell.jsx` to Tailwind + Kumo
- [ ] Migrate `src/components/ui.jsx` primitives
- [ ] Replace custom icons with Phosphor icons
- [ ] Migrate `Home.jsx`
- [ ] Migrate `Inventory.jsx`
- [ ] Migrate `History.jsx`
- [ ] Migrate `Settings.jsx`
- [ ] Migrate `Plan.jsx`
- [ ] Migrate `AddFromReceipt.jsx`
- [ ] Migrate `Assistant.jsx`
- [ ] Delete `tokens.css`, `base.css`, `components.css`

### PWA
- [ ] Configure `vite-plugin-pwa` in `vite.config.js`
- [ ] Generate `public/icon-192x192.png` and `public/icon-512x512.png`
- [ ] Create `src/components/PwaUpdatePrompt.jsx`
- [ ] Create `public/offline.html`
- [ ] Verify Lighthouse PWA audit

### Tests & docs
- [ ] Update `src/test-setup.js` with providers
- [ ] Update `App.test.jsx`
- [ ] Update `AppShell.test.jsx`
- [ ] Update page tests
- [ ] Update e2e step definitions if needed
- [ ] Run `npm test -w frontend && npm run test -w backend && npm run test:api && npm run test:e2e`
- [ ] Run `npm run build -w frontend`
- [ ] Update `docs/ARCHITECTURE.md`
- [ ] Update `docs/PROJECT_PLAN.md`
- [ ] Update `AGENTS.md`
- [ ] Update `README.md`
- [ ] Open PR from new branch

---

## 8. Testing strategy

### Unit tests
- Use a custom `renderWithProviders` helper that wraps every test in QueryClient + Router + i18n + Persona providers.
- Mock TanStack Query hooks only when testing pure UI behavior; otherwise let queries hit MSW or mock `api.js` functions.
- Keep coverage above thresholds: statements 90%, branches 75%, functions 85%, lines 90%.

### E2E tests
- Update Playwright BDD steps that reference old class names or button text.
- Verify navigation via URLs, not via internal view state.
- Add a PWA installability check if feasible in CI.

### Manual checks
- Verify persona hue-shifting still updates accent colors.
- Verify dark mode (if enabled) uses Kumo `light-dark()` correctly.
- Verify PWA install prompt on mobile/desktop.
- Verify offline refresh of the home page.

---

## 9. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Kumo does not support React 19 | High | Check peer deps before install; temporarily pin React 18 if needed |
| Tailwind v4 breaks existing tooling | Medium | Verify Vite plugin compatibility; pin versions if necessary |
| Kumo CSS import path is different than expected | Low | Inspect `node_modules/@cloudflare/kumo/package.json` exports |
| Test coverage drops below thresholds | Medium | Update tests incrementally per phase; do not delete old CSS until coverage is green |
| PWA service worker intercepts `/api` proxy in dev | Medium | Configure `runtimeCaching` and dev-only `navigateFallback` correctly |
| Persona hue-shifting breaks | Medium | Keep RumaQ CSS variables; update only the mapping in `styles.css` |
| Backend endpoints missing | High | Coordinate with backend PRs; stub query hooks and mark dependencies |
| npm peer dependency warnings | Low | Use `--legacy-peer-deps` only as last resort; prefer fixing version constraints |

---

## 10. Handoff notes

- **Start here:** Phase 0, then Phase 1.
- **Do not skip:** The theme mapping in Phase 1; without it Kumo components will look like Cloudflare orange/blue.
- **Backend dependency:** If backend endpoints are not ready, stub the query hooks and add TODO comments linking to backend PRs.
- **Branching:** Create a single long-lived feature branch `refactor/frontend-kumo-tanstack` from `main`. Each phase can be a commit; do not merge until Phase 6 is complete.
- **Communication:** Update this document as the implementation evolves. Mark completed checklist items.

---

## 11. Appendix — example snippets

### `frontend/vite.config.js` target shape

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    TanStackRouterVite(),
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'RumaQ',
        short_name: 'RumaQ',
        theme_color: '#f4f8fb',
        background_color: '#f4f8fb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
```

### `frontend/src/styles.css` target shape

```css
@import "tailwindcss";
@import "@cloudflare/kumo/styles";

:root,
[data-theme="rumaq"] {
  --surface: oklch(0.945 0.028 230);
  --surface-raised: oklch(0.975 0.018 230);
  --surface-sunken: oklch(0.915 0.032 230);
  --border: oklch(0.88 0.025 230);
  --border-strong: oklch(0.8 0.032 230);
  --text: oklch(0.28 0.03 235);
  --text-muted: oklch(0.5 0.025 235);
  --text-faint: oklch(0.62 0.022 235);
  --accent: oklch(0.48 0.13 230);
  --accent-hover: oklch(0.42 0.14 230);
  --accent-soft: oklch(0.9 0.05 230);
  --danger: oklch(0.58 0.16 25);
  --danger-soft: oklch(0.93 0.04 25);
  --warn: oklch(0.72 0.14 65);
  --warn-soft: oklch(0.93 0.05 65);
  --ok: oklch(0.62 0.11 155);
  --ok-soft: oklch(0.93 0.035 155);

  --color-kumo-canvas: var(--surface);
  --color-kumo-elevated: var(--surface-raised);
  --color-kumo-recessed: var(--surface-sunken);
  --color-kumo-base: var(--surface-raised);
  --color-kumo-line: var(--border);
  --color-kumo-hairline: var(--border-strong);
  --text-color-kumo-default: var(--text);
  --text-color-kumo-subtle: var(--text-muted);
  --text-color-kumo-inactive: var(--text-faint);
  --color-kumo-brand: var(--accent);
  --color-kumo-brand-hover: var(--accent-hover);
  --color-kumo-danger: var(--danger);
  --color-kumo-danger-tint: var(--danger-soft);
  --color-kumo-warning: var(--warn);
  --color-kumo-warning-tint: var(--warn-soft);
  --color-kumo-success: var(--ok);
  --color-kumo-success-tint: var(--ok-soft);
  --color-kumo-info: var(--accent);
  --color-kumo-info-tint: var(--accent-soft);
}
```

### `frontend/src/routes/__root.jsx` target shape

```jsx
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PersonaProvider } from '../context/PersonaContext.jsx'
import AppShell from '../components/AppShell.jsx'
import { useMe } from '../lib/queries/me.js'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

function RootComponent() {
  const { data: me, isLoading } = useMe()
  if (isLoading) return null
  if (!me) return <Login />
  return (
    <PersonaProvider>
      <AppShell user={me.user}>
        <Outlet />
      </AppShell>
    </PersonaProvider>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
```

> **Note:** The exact import paths and APIs for Kumo and TanStack Router may have minor version differences. Verify against installed package versions.
