/**
 * Database reset/seed helpers for integration tests.
 *
 * Calls the test-only admin endpoints on the worker-server:
 *   POST /api/__test/reset
 *   POST /api/__test/seed
 *
 * These endpoints exist only when TEST_MODE=true (Docker test environment).
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

/**
 * Truncate all database tables.
 * @param {string} [baseUrl] - Override the base URL
 */
export async function resetDb(baseUrl) {
  const url = `${baseUrl || BASE_URL}/api/__test/reset`
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    throw new Error(`resetDb failed: ${res.status} ${await res.text()}`)
  }
}

/**
 * Seed the database with deterministic test data.
 * @param {string} [baseUrl] - Override the base URL
 */
export async function seedDb(baseUrl) {
  const url = `${baseUrl || BASE_URL}/api/__test/seed`
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    throw new Error(`seedDb failed: ${res.status} ${await res.text()}`)
  }
}
