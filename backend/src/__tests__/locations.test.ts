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

describe('GET /api/locations', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/api/locations', {}, createMockEnv())
    expect(res.status).toBe(401)
  })

  it('returns locations array', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)
    const mockLocations = [
      { id: 'loc-1', label: 'Kulkas', sort_order: 1 },
      { id: 'loc-2', label: 'Freezer', sort_order: 2 },
    ]

    env.DB.all = vi.fn().mockResolvedValue({ results: mockLocations })

    const res = await app.request('/api/locations', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.locations).toHaveLength(2)
    expect(body.locations[0].label).toBe('Kulkas')
  })
})

describe('POST /api/locations', () => {
  it('creates a location', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce({ next_order: 5 })

    const res = await app.request('/api/locations', {
      method: 'POST',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Pantry' }),
    }, env)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.label).toBe('Pantry')
    expect(body.id).toBeDefined()
  })

  it('rejects empty label', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/locations', {
      method: 'POST',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: '' }),
    }, env)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/locations/:id', () => {
  it('deletes an existing location', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce({ id: 'loc-1' })

    const res = await app.request('/api/locations/loc-1', {
      method: 'DELETE',
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
  })

  it('returns 404 for non-existent location', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce(null)

    const res = await app.request('/api/locations/nonexistent', {
      method: 'DELETE',
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(404)
  })
})

describe('Household isolation for locations', () => {
  it('DELETE filters by household', async () => {
    const env = createMockEnv()
    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce({ id: 'loc-1' })

    const token = await signJwt({ sub: 'user-123', exp: Date.now() + 3600_000 }, SECRET)

    await app.request('/api/locations/loc-1', {
      method: 'DELETE',
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    // Verify household was scoped by checking a bind call after auth
    const deleteCall = env.DB.bind.mock.calls.find((args: unknown[]) => args[0] === 'loc-1' && args[1] === 'house-456')
    expect(deleteCall).toBeDefined()
  })
})