# Plan — Auto-generate `docs/API.md` from the Hono backend

## Goal

Replace the manually-maintained `docs/API.md` with a generated version derived directly from the backend route definitions, while keeping the output concise (a single table for implemented endpoints + bullet list for planned endpoints).

## Decisions

- Use [`hono-openapi`](https://github.com/rhinobase/hono-openapi). It generates an OpenAPI document from existing Hono routes without requiring a full switch to `OpenAPIHono`.
- Swap `@hono/zod-validator` for `@hono/standard-validator`. `hono-openapi` reads Standard Schema-compliant validators; Zod v4 is compliant, but only through `@hono/standard-validator`.
- Keep `docs/API.md` as Markdown, not a hosted Swagger UI. A Markdown file is easier to read in-repo and matches the current style.
- Use a small custom Node script to convert the OpenAPI JSON into the concise Markdown table. `widdershins` and similar tools produce very verbose output; a custom script keeps the doc aligned with the current concise format.

## Step-by-step implementation

### 1. Install backend dependencies

In the workspace root:

```bash
npm install -w backend hono-openapi @hono/standard-validator
```

### 2. Replace the validator import

In `backend/src/apps/api.ts`:

```diff
- import { zValidator } from '@hono/zod-validator'
+ import { zValidator } from '@hono/standard-validator'
```

Verify the existing `zValidator('query', stockQuery)` and any future `zValidator('json', ...)` calls still work. `@hono/standard-validator` exposes the same API for Zod v4.

### 3. Add OpenAPI metadata and endpoint

In `backend/src/apps/api.ts`:

1. Import `openApi` from `hono-openapi`.
2. Attach the middleware to the app.
3. Register the spec endpoint.

Example shape:

```ts
import { openApi } from 'hono-openapi'

apiApp.use(
  openApi({
    endpoint: '/openapi.json',
    info: {
      title: 'RumaQ API',
      version: '0.1.0',
    },
  })
)
```

Choose a path that does not conflict with real API routes. `/api/openapi.json` is fine because the app is mounted under `/api/*`.

### 4. (Recommended) Add response schemas

`hono-openapi` can infer request schemas from `zValidator`, but response schemas must be described explicitly to appear in the generated OpenAPI document.

For each implemented route, add a response description. The simplest way is to return a typed `c.json(...)` and annotate it with `hono-openapi`'s helpers, or to add a route-level description object.

Example for `/api/health`:

```ts
apiApp.get('/api/health', (c) => {
  c.res.headers.set(
    'Cache-Control',
    'public, max-age=60, stale-while-revalidate=300'
  )
  return c.json({ ok: true })
})
```

Can be wrapped with a description:

```ts
import { describeRoute } from 'hono-openapi'

apiApp.get('/api/health',
  describeRoute({
    description: 'Public health check.',
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } } },
    },
  }),
  (c) => { ... }
)
```

If full response schemas feel too heavy for the MVP, start with only `describeRoute` descriptions; the custom Markdown script can still use them for the Description column.

### 5. Create the Markdown generator script

Create `scripts/generate-api-docs.mjs`:

Responsibilities:

1. Start the backend in a temporary local mode, or import the `apiApp` and `authApp` and call the OpenAPI endpoint handler directly.
2. Fetch `/api/openapi.json`.
3. Convert the OpenAPI document into the concise Markdown format used today.
4. Write the result to `docs/API.md`.

Preferred approach: import the apps directly and invoke the handler, avoiding a live server.

Example skeleton:

```js
import { writeFileSync } from 'node:fs'
import { apiApp } from '../backend/src/apps/api.js'
import { authApp } from '../backend/src/apps/auth.js'

async function fetchOpenApi(app) {
  const req = new Request('http://localhost/api/openapi.json')
  const res = await app.fetch(req, {}, {})
  return res.json()
}

function openApiToMarkdown(spec) { ... }

const apiSpec = await fetchOpenApi(apiApp)
// authApp routes are served through gateway routing; decide whether to include them in the same spec or merge manually.
const markdown = openApiToMarkdown(apiSpec)
writeFileSync('docs/API.md', markdown)
```

Because the apps run under Cloudflare Workers APIs, the script may need `miniflare` or a minimal polyfill for `crypto`, `Request`, `Response`, etc. Node 22 provides these globals natively except for Workers-specific bindings like `D1Database`. Since the generator only calls the OpenAPI endpoint and does not touch the database, a shim for `Env` bindings may be required to load the modules.

Alternative: start `wrangler dev` in the background, curl `/api/openapi.json`, then kill the process. This is slower but avoids import/shim issues.

### 6. Add the npm script

In root `package.json`:

```json
"docs:api": "node scripts/generate-api-docs.mjs"
```

If the script needs `wrangler dev`, wrap it in a shell script instead.

### 7. Update `docs/API.md` header note

Replace the manual note with:

```markdown
> This file is generated by `npm run docs:api`. Do not edit manually.
```

Keep the caching section and the planned-endpoints section. The planned endpoints cannot be auto-generated because they do not exist in code; maintain them as a static block inside the generator script or as a separate include file.

### 8. Generate and verify

Run:

```bash
npm run docs:api
```

Open `docs/API.md` and verify:

- All implemented endpoints appear exactly once.
- Auth column is correct for protected routes.
- Query/body columns match the Zod schemas.
- Planned endpoints are still listed.
- Caching rules are still documented.

Then run:

```bash
./scripts/test-unit.sh
```

### 9. (Optional) Add CI check

Add a step in `.github/workflows/ci.yml` that runs `npm run docs:api` and fails if `git diff --exit-code docs/API.md` is non-zero. This prevents the doc from drifting out of sync with the code.

## Files to modify

- `backend/package.json` — add `hono-openapi` and `@hono/standard-validator` dependencies.
- `backend/src/apps/api.ts` — swap validator import, add `openApi` middleware, add response descriptions.
- `backend/src/apps/auth.ts` — add `openApi` or merge auth routes into the same spec; alternatively keep auth routes separate and merge in the generator.
- `scripts/generate-api-docs.mjs` — new file.
- `package.json` — add `docs:api` script.
- `docs/API.md` — regenerated output + note.
- `.github/workflows/ci.yml` — optional drift check.

## Acceptance criteria

- `npm run docs:api` produces `docs/API.md` from the backend code with no manual edits.
- The generated doc is no longer than the current concise version (table + planned bullets + caching + generation note).
- `./scripts/test-unit.sh` passes.
- `npm run build -w backend` still works after the validator swap.

## Risks and notes

- `@hono/standard-validator` may behave slightly differently from `@hono/zod-validator` for edge cases. Run backend tests after swapping.
- `hono-openapi` is still pre-1.0. Pin to a specific version and review release notes before upgrading.
- If response schemas are omitted, the Description column will rely on `describeRoute` annotations or fall back to generic text.
- Auth status cannot be inferred from Zod schemas. Use `describeRoute` tags (e.g. `security: [{ cookieAuth: [] }]`) or a hardcoded path list in the generator to mark protected routes.
