import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../../..')
const BACKEND_DIR = resolve(ROOT, 'backend')
const BUNDLE_PATH = resolve(BACKEND_DIR, 'dist/index.mjs')

// --- Read SQL files ---
const migrationSql = readFileSync(
  resolve(BACKEND_DIR, 'migrations/0001_schema.sql'),
  'utf-8'
)
const seedSql = readFileSync(
  resolve(ROOT, 'automation/tests/fixtures/seed.sql'),
  'utf-8'
)
const resetSql = readFileSync(
  resolve(ROOT, 'automation/tests/fixtures/reset.sql'),
  'utf-8'
)

// --- Load the bundled worker module ---
const { Miniflare } = await import('miniflare')

const mf = new Miniflare({
  modules: true,
  scriptPath: BUNDLE_PATH,
  d1Databases: { DB: 'rumaq-test' },
  r2Buckets: { RECEIPTS: 'rumaq-receipts-test' },
  compatibilityDate: '2024-06-30',
  compatibilityFlags: ['nodejs_compat'],
  bindings: {
    PAGES_ORIGIN: 'http://localhost:3000',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    WORKER_JWT_SECRET: 'test-jwt-secret',
    WORKER_ENCRYPTION_KEY: 'a'.repeat(32),
    TEST_MODE: 'true',
  },
})

// --- Apply migrations & seed ---
const db = await mf.getD1Database('DB')

// Miniflare's db.exec() processes SQL line-by-line, so we need to
// flatten multi-line statements: strip comments, then remove newlines
// within each statement.
function flattenSql(sql) {
  return sql
    .replace(/--.*$/gm, '')           // strip single-line comments
    .replace(/\n\s*/g, ' ')            // collapse multi-line into single line
    .replace(/\s*;\s*/g, ';\n')        // put each statement on its own line
    .replace(/\n{2,}/g, '\n')          // collapse blank lines
    .trim()
}

await db.exec(flattenSql(migrationSql))
await db.exec(flattenSql(seedSql))

console.log('✓ D1 migrations applied and database seeded')

// --- Start HTTP server wrapping Miniflare's fetch ---
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:8787')

    // Test-only admin endpoints
    if (process.env.TEST_MODE === 'true') {
      if (url.pathname === '/api/__test/reset' && req.method === 'POST') {
        await db.exec(flattenSql(resetSql))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }
      if (url.pathname === '/api/__test/seed' && req.method === 'POST') {
        await db.exec(flattenSql(seedSql))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }
    }

    // Forward to Miniflare worker
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value != null) headers.set(key, value)
    }

    let body = null
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      body = Buffer.concat(chunks)
    }

    const workerResponse = await mf.dispatchFetch(
      url.toString(),
      {
        method: req.method,
        headers,
        body,
      },
    )
    const responseBody = await workerResponse.text()

    res.writeHead(workerResponse.status, Object.fromEntries(workerResponse.headers))
    res.end(responseBody)
  } catch (err) {
    console.error('Worker server error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(8787, '0.0.0.0', () => {
  console.log('✓ Worker server listening on http://0.0.0.0:8787')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  server.close()
  await mf.dispose()
  process.exit(0)
})
