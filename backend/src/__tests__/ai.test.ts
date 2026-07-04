import { describe, it, expect, vi } from 'vitest'
import { signJwt } from '../auth.js'

const SECRET = 'test-jwt-secret'
const ENC_KEY = 'test-enc-key-for-ai-tests'

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
    WORKER_ENCRYPTION_KEY: ENC_KEY,
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

import { encrypt } from '../crypto.js'
import { app } from '../index.js'

describe('POST /api/ai/test', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/api/ai/test', { method: 'POST' }, createMockEnv())
    expect(res.status).toBe(401)
  })

  it('returns 400 if no AI key saved', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce({ encrypted_ai_key: null, ai_provider: null })

    const res = await app.request('/api/ai/test', {
      method: 'POST',
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(400)
  })

  it('returns error when provider API is unreachable', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)
    const encryptedKey = await encrypt('sk-test-key', ENC_KEY)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce({ encrypted_ai_key: encryptedKey, ai_provider: 'gemini' })

    // Mock fetch to reject
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const res = await app.request('/api/ai/test', {
      method: 'POST',
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(502)
  })

  it('does not increment usage counter on failed test call', async () => {
    const env = createMockEnv()
    const encryptedKey = await encrypt('sk-test-key', ENC_KEY)
    const token = await signJwt({ sub: 'user-123', exp: Date.now() + 3600_000 }, SECRET)

    let firstCallCount = 0
    env.DB.prepare = vi.fn().mockReturnThis()
    env.DB.bind = vi.fn().mockReturnThis()
    env.DB.first = vi.fn().mockImplementation(() => {
      firstCallCount++
      if (firstCallCount === 1) return Promise.resolve({ active_household_id: 'house-456' })
      if (firstCallCount === 2) return Promise.resolve({ encrypted_ai_key: encryptedKey, ai_provider: 'gemini' })
      return Promise.resolve(null)
    })
    env.DB.run = vi.fn().mockResolvedValue({ success: true })

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await app.request('/api/ai/test', {
      method: 'POST',
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)

    const aiUsageRuns = env.DB.run.mock.calls.filter((c: unknown[]) =>
      Array.isArray(c) && c[0] && typeof c[0] === 'string' && c[0].includes('INSERT INTO ai_usage')
    )
    expect(aiUsageRuns.length).toBe(0)
  })
})