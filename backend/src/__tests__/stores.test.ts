import { describe, it, expect, vi } from 'vitest'
import { signJwt } from '../auth.js'

const SECRET = 'test-jwt-secret'

function createMockEnv() {
  return {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({ success: true }),
      batch: vi.fn().mockResolvedValue([]),
    },
    RECEIPTS: {},
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    WORKER_JWT_SECRET: SECRET,
    WORKER_ENCRYPTION_KEY: 'test-enc-key',
    PAGES_ORIGIN: 'http://localhost:5173',
  }
}

async function setAuthCookie(env: any, userId = 'user-123', householdId = 'house-456') {
  env.DB.prepare = vi.fn().mockReturnThis()
  env.DB.bind = vi.fn().mockReturnThis()
  env.DB.first = vi.fn()
    .mockResolvedValueOnce({ active_household_id: householdId })
  env.DB.all = vi.fn().mockResolvedValue({ results: [] })
  env.DB.run = vi.fn().mockResolvedValue({ success: true })

  const token = await signJwt({ sub: userId, exp: Date.now() + 3600_000 }, SECRET)
  return token
}

import { app } from '../index.js'

describe('GET /api/stores', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/api/stores', {}, createMockEnv())
    expect(res.status).toBe(401)
  })

  it('returns stores array', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)
    const mockStores = [
      { id: 'store-1', label: 'Indomaret' },
      { id: 'store-2', label: 'Alfamart' },
    ]

    env.DB.all = vi.fn().mockResolvedValue({ results: mockStores })

    const res = await app.request('/api/stores', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stores).toHaveLength(2)
    expect(body.stores[0].label).toBe('Indomaret')
  })
})

describe('POST /api/stores', () => {
  it('creates a store', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })

    const res = await app.request('/api/stores', {
      method: 'POST',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Superindo' }),
    }, env)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.label).toBe('Superindo')
    expect(body.id).toBeDefined()
  })

  it('rejects empty label', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/stores', {
      method: 'POST',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: '' }),
    }, env)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/stores/:id', () => {
  it('deletes an existing store', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce({ id: 'store-1' })

    const res = await app.request('/api/stores/store-1', {
      method: 'DELETE',
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
  })

  it('returns 404 for non-existent store', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce(null)

    const res = await app.request('/api/stores/nonexistent', {
      method: 'DELETE',
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(404)
  })
})