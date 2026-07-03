import { describe, it, expect, vi } from 'vitest'
import { signJwt } from '../auth.js'

const SECRET = 'test-secret'

vi.mock('hono/cookie', () => {
  let store: Record<string, string> = {}
  return {
    getCookie: (c: any, name: string) => store[name] || null,
    setCookie: (c: any, name: string, value: string) => { store[name] = value },
    deleteCookie: (c: any, name: string) => { delete store[name] },
    __reset: () => { store = {} },
    __setStore: (s: Record<string, string>) => { store = s },
  }
})

async function createValidToken(): Promise<string> {
  return signJwt({ sub: 'user-123', exp: Date.now() + 3600_000 }, SECRET)
}

describe('requireAuth', () => {
  it('returns 401 when no cookie is present', async () => {
    const { requireAuth } = await import('../middleware.js')
    const c = {
      env: { WORKER_JWT_SECRET: SECRET, DB: {} },
      get: vi.fn(),
      set: vi.fn(),
      json: vi.fn((body, status) => new Response(JSON.stringify(body), { status })),
    } as any
    await requireAuth(c, vi.fn())
    expect(c.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, 401)
  })

  it('returns 401 when JWT is invalid', async () => {
    const mod = await import('hono/cookie')
    ;(mod as any).__setStore({ rumaq_session: 'bad-token' })

    const { requireAuth } = await import('../middleware.js')
    const c = {
      env: { WORKER_JWT_SECRET: SECRET, DB: {} },
      get: vi.fn(),
      set: vi.fn(),
      json: vi.fn((body, status) => new Response(JSON.stringify(body), { status })),
    } as any
    await requireAuth(c, vi.fn())
    expect(c.json).toHaveBeenCalledWith({ error: 'Invalid session' }, 401)
  })

  it('returns 403 when no household is found', async () => {
    const token = await createValidToken()
    const mod = await import('hono/cookie')
    ;(mod as any).__setStore({ rumaq_session: token })

    const { requireAuth } = await import('../middleware.js')
    const db = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    }
    const c = {
      env: { WORKER_JWT_SECRET: SECRET, DB: db },
      get: vi.fn(),
      set: vi.fn(),
      json: vi.fn((body, status) => new Response(JSON.stringify(body), { status })),
    } as any
    await requireAuth(c, vi.fn())
    expect(c.json).toHaveBeenCalledWith({ error: 'No household found' }, 403)
  })
})
