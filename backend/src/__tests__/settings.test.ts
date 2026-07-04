import { describe, it, expect, beforeAll, vi } from 'vitest'
import { signJwt } from '../auth.js'
import { encrypt } from '../crypto.js'

const SECRET = 'test-jwt-secret'
const ENC_KEY = 'test-enc-key-for-settings-tests'

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

function mockSettingsRow(overrides = {}) {
  return {
    motion_preference: 'standard',
    currency: 'idr',
    language: 'en',
    ai_provider: null,
    encrypted_ai_key: null,
    persona_enabled: 0,
    persona_user_role: null,
    persona_ai_role: null,
    theme_hue: null,
    ...overrides,
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

describe('GET /api/settings', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/api/settings', {}, createMockEnv())
    expect(res.status).toBe(401)
  })

  it('returns settings shape with persona', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce(mockSettingsRow({
        language: 'id',
        ai_provider: 'gemini',
        persona_enabled: 1,
        persona_user_role: 'raja',
        persona_ai_role: 'prajurit',
        theme_hue: 270,
      }))

    const res = await app.request('/api/settings', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.motion_preference).toBe('standard')
    expect(body.currency).toBe('idr')
    expect(body.language).toBe('id')
    expect(body.ai_provider).toBe('gemini')
    expect(body.ai_key_set).toBe(false)
    expect(body.persona.enabled).toBe(true)
    expect(body.persona.user_role).toBe('raja')
    expect(body.persona.ai_role).toBe('prajurit')
    expect(body.persona.theme_hue).toBe(270)
    expect(body).not.toHaveProperty('encrypted_ai_key')
  })

  it('returns ai_key_set = true when key exists', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce(mockSettingsRow({
        encrypted_ai_key: 'some-encrypted-value',
      }))

    const res = await app.request('/api/settings', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    const body = await res.json()
    expect(body.ai_key_set).toBe(true)
  })

  it('returns 404 when settings not found', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce(null)

    const res = await app.request('/api/settings', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(404)
  })

  it('never returns encrypted key in response', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce(mockSettingsRow({
        encrypted_ai_key: 'should-not-appear',
      }))

    const res = await app.request('/api/settings', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    const body = await res.json()
    expect(body).not.toHaveProperty('encrypted_ai_key')
  })
})

describe('PATCH /api/settings', () => {
  it('updates motion_preference', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ motion_preference: 'reduced' }),
    }, env)
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('updates currency', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: 'usd' }),
    }, env)
    expect(res.status).toBe(200)
  })

  it('updates language', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'id' }),
    }, env)
    expect(res.status).toBe(200)
  })

  it('rejects invalid language', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'fr' }),
    }, env)
    expect(res.status).toBe(400)
  })

  it('encrypts ai_key when provided', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_key: 'sk-test-key-12345' }),
    }, env)
    expect(res.status).toBe(200)

    const callArgs = env.DB.bind.mock.calls
    const encryptedArg = callArgs.find((args: unknown[]) => typeof args[0] === 'string' && args[0].length > 20)
    expect(encryptedArg).toBeDefined()
  })

  it('updates persona with hue derivation', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona: { enabled: true, user_role: 'raja', ai_role: 'prajurit' },
      }),
    }, env)
    expect(res.status).toBe(200)
  })

  it('accepts partial persona update', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona: { enabled: false, user_role: '', ai_role: '' },
      }),
    }, env)
    expect(res.status).toBe(200)
  })

  it('returns ok with no body fields', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, env)
    expect(res.status).toBe(200)
  })

  it('rejects invalid motion_preference', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)

    const res = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { Cookie: `rumaq_session=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ motion_preference: 'super-fast' }),
    }, env)
    expect(res.status).toBe(400)
  })
})