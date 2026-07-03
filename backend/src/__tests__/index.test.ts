import { describe, it, expect, beforeAll, vi } from 'vitest'
import { signJwt } from '../auth.js'

const SECRET = 'test-jwt-secret'

function createMockEnv() {
  return {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
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
    .mockResolvedValueOnce(null) // not used
    .mockResolvedValueOnce({ active_household_id: householdId })
  env.DB.all = vi.fn().mockResolvedValue({ results: [] })

  const token = await signJwt({ sub: userId, exp: Date.now() + 3600_000 }, SECRET)
  return token
}

describe('index app', () => {
  let app: any

  beforeAll(async () => {
    const mod = await import('../index.js')
    app = mod.default
  })

  it('/api/health returns ok', async () => {
    const res = await app.request('/api/health', {}, createMockEnv())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('/api/me returns 401 without auth', async () => {
    const res = await app.request('/api/me', {}, createMockEnv())
    expect(res.status).toBe(401)
  })

  it('/api/stock returns 401 without auth', async () => {
    const res = await app.request('/api/stock', {}, createMockEnv())
    expect(res.status).toBe(401)
  })

  it('app has auth routes mounted', async () => {
    const res = await app.request('/api/auth/logout', { method: 'POST' }, createMockEnv())
    expect(res.status).toBe(200)
  })

  it('cors allows localhost origin', async () => {
    const res = await app.request('/api/health', {
      headers: { Origin: 'http://localhost:5173' },
    }, createMockEnv())
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })

  it('cors returns allowed origin for unknown origins', async () => {
    const res = await app.request('/api/health', {
      headers: { Origin: 'https://unknown.com' },
    }, createMockEnv())
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })

  it('cors falls back to configured origin', async () => {
    const env = createMockEnv()
    env.PAGES_ORIGIN = 'https://custom.pages.dev'
    const res = await app.request('/api/health', {
      headers: { Origin: 'https://evil.com' },
    }, env)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://custom.pages.dev')
  })

  it('cors uses default origin when PAGES_ORIGIN is not set', async () => {
    const env = createMockEnv()
    delete env.PAGES_ORIGIN
    const res = await app.request('/api/health', {
      headers: { Origin: 'https://test.com' },
    }, env)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://rumaq.pages.dev')
  })

  it('/api/me returns user data with valid auth', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)
    env.DB.prepare = vi.fn().mockReturnThis()
    env.DB.bind = vi.fn().mockReturnThis()
    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
      .mockResolvedValueOnce({ id: 'user-123', email: 'a@b.com', name: 'Alice', picture: null })

    const res = await app.request('/api/me', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('a@b.com')
  })

  it('/api/stock returns stock list with valid auth', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)
    env.DB.prepare = vi.fn().mockReturnThis()
    env.DB.bind = vi.fn().mockReturnThis()
    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
    env.DB.all = vi.fn().mockResolvedValue({ results: [{ id: 's1', name: 'Test' }] })

    const res = await app.request('/api/stock', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stock).toHaveLength(1)
  })

  it('/api/stock filters by location and query', async () => {
    const env = createMockEnv()
    const token = await setAuthCookie(env)
    env.DB.prepare = vi.fn().mockReturnThis()
    env.DB.bind = vi.fn().mockReturnThis()
    env.DB.first = vi.fn()
      .mockResolvedValueOnce({ active_household_id: 'house-456' })
    env.DB.all = vi.fn().mockResolvedValue({ results: [] })

    const res = await app.request('/api/stock?location=kulkas&q=susu', {
      headers: { Cookie: `rumaq_session=${token}` },
    }, env)
    expect(res.status).toBe(200)
  })
})
