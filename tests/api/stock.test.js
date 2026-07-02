import { describe, it, expect, beforeAll } from 'vitest'
import { resetDb, seedDb } from '../support/db.js'
import { signTestCookie } from '../support/auth.js'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_USER_ID =
  process.env.TEST_USER_ID || 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

function authHeaders() {
  return signTestCookie(TEST_USER_ID, { email: 'test@rumaq.dev' }).then(
    (cookie) => ({ Cookie: cookie })
  )
}

describe('GET /api/stock', () => {
  beforeAll(async () => {
    await resetDb()
    await seedDb()
  })

  it('returns 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/stock`)
    expect(res.status).toBe(401)
  })

  it('returns 200 with stock array when authenticated', async () => {
    const headers = await authHeaders()
    const res = await fetch(`${BASE_URL}/api/stock`, { headers })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.stock)).toBe(true)
    // Seed data inserts 3 stock rows
    expect(body.stock).toHaveLength(3)
  })

  it('returns items with expected shape', async () => {
    const headers = await authHeaders()
    const res = await fetch(`${BASE_URL}/api/stock`, { headers })
    const body = await res.json()

    for (const item of body.stock) {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('qty')
      expect(item).toHaveProperty('unit')
      expect(item).toHaveProperty('location')
    }
  })

  it('filters by location query param', async () => {
    const headers = await authHeaders()
    const res = await fetch(
      `${BASE_URL}/api/stock?location=loc-kitchen`,
      { headers }
    )
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.stock).toHaveLength(1)
    expect(body.stock[0].name).toBe('Cooking Oil')
  })

  it('filters by q (name search) query param', async () => {
    const headers = await authHeaders()
    const res = await fetch(
      `${BASE_URL}/api/stock?q=egg`,
      { headers }
    )
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.stock).toHaveLength(1)
    expect(body.stock[0].name).toBe('Eggs')
  })

  it('orders by run_out_days ascending (most urgent first)', async () => {
    const headers = await authHeaders()
    const res = await fetch(`${BASE_URL}/api/stock`, { headers })
    const body = await res.json()

    const runOutDays = body.stock.map((s) => s.run_out_days).filter(Boolean)
    // Seed: oil=3, egg=7, rice=14
    expect(runOutDays).toEqual([3, 7, 14])
  })
})
