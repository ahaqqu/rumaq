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

async function setAuthCookie(env: any, userId = 'user-123') {
  env.DB.prepare = vi.fn().mockReturnThis()
  env.DB.bind = vi.fn().mockReturnThis()
  env.DB.first = vi.fn()
    .mockResolvedValueOnce({ active_household_id: 'house-456' })
  env.DB.all = vi.fn().mockResolvedValue({ results: [] })
  env.DB.run = vi.fn().mockResolvedValue({ success: true })

  const token = await signJwt({ sub: userId, exp: Date.now() + 3600_000 }, SECRET)
  return token
}

import { app } from '../index.js'

describe('GET /api/ai/usage', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/api/ai/usage', {}, createMockEnv())
    expect(res.status).toBe(401)
  })

  it('creates a new usage row with daily_limit 20 when none exists', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/ai/usage', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.used).toBe(0)
    expect(body.limit).toBe(20)
    expect(body.provider).toBe('gemini')
  })

  it('returns existing usage data', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce({ provider: 'gemini', used: 5, daily_limit: 20 })

    const res = await app.request('/api/ai/usage', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.used).toBe(5)
    expect(body.limit).toBe(20)
  })
})