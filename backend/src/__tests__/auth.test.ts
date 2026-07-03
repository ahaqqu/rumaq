import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  verifyJwt, signJwt, base64UrlEncode, base64UrlDecode, randomState,
} from '../auth.js'

const SECRET = 'test-secret-12345'

describe('base64UrlEncode / base64UrlDecode', () => {
  it('round-trips a buffer', () => {
    const input = new TextEncoder().encode('hello world')
    const encoded = base64UrlEncode(input)
    const decoded = base64UrlDecode(encoded)
    expect(new TextDecoder().decode(decoded)).toBe('hello world')
  })

  it('encodes without padding or +/', () => {
    const input = new TextEncoder().encode('test')
    const encoded = base64UrlEncode(input)
    expect(encoded).not.toContain('=')
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
  })

  it('decodes properly padded base64url', () => {
    const decoded = base64UrlDecode('dGVzdA')
    expect(new TextDecoder().decode(decoded)).toBe('test')
  })

  it('encodes empty buffer', () => {
    const input = new Uint8Array(0)
    expect(base64UrlEncode(input)).toBe('')
  })
})

describe('signJwt / verifyJwt', () => {
  it('signJwt produces a 3-part token', async () => {
    const token = await signJwt({ sub: 'u1' }, SECRET)
    expect(token.split('.')).toHaveLength(3)
  })

  it('round-trips with verifyJwt', async () => {
    const token = await signJwt({ sub: 'u1', email: 'a@b.com' }, SECRET)
    const payload = await verifyJwt(token, SECRET)
    expect(payload).not.toBeNull()
    expect((payload as any).sub).toBe('u1')
    expect((payload as any).email).toBe('a@b.com')
  })

  it('returns null for a tampered token', async () => {
    const token = await signJwt({ sub: 'u1' }, SECRET)
    const [h, p] = token.split('.')
    const tampered = `${h}.${p}.invalidsig`
    const payload = await verifyJwt(tampered, SECRET)
    expect(payload).toBeNull()
  })

  it('returns null for a token with wrong secret', async () => {
    const token = await signJwt({ sub: 'u1' }, SECRET)
    const payload = await verifyJwt(token, 'wrong-secret')
    expect(payload).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const token = await signJwt({ sub: 'u1', exp: Date.now() - 1000 }, SECRET)
    const payload = await verifyJwt(token, SECRET)
    expect(payload).toBeNull()
  })

  it('accepts a token that has not expired yet', async () => {
    const token = await signJwt({ sub: 'u1', exp: Date.now() + 60_000 }, SECRET)
    const payload = await verifyJwt(token, SECRET)
    expect(payload).not.toBeNull()
  })

  it('returns null for malformed token strings', async () => {
    expect(await verifyJwt('', SECRET)).toBeNull()
    expect(await verifyJwt('a.b', SECRET)).toBeNull()
    expect(await verifyJwt('a.b.c.d', SECRET)).toBeNull()
    expect(await verifyJwt('not-a-jwt', SECRET)).toBeNull()
  })

  it('preserves extra payload fields', async () => {
    const token = await signJwt({ sub: 'u1', iat: Date.now() }, SECRET)
    const payload = await verifyJwt(token, SECRET)
    expect(payload).toHaveProperty('iat')
  })
})

afterEach(() => {
  delete (globalThis as any).fetch
})

describe('randomState', () => {
  it('returns a base64url string', () => {
    const state = randomState()
    expect(typeof state).toBe('string')
    expect(state.length).toBeGreaterThan(0)
    expect(state).not.toContain('+')
    expect(state).not.toContain('/')
    expect(state).not.toContain('=')
  })

  it('produces different values on each call', () => {
    const s1 = randomState()
    const s2 = randomState()
    expect(s1).not.toBe(s2)
  })
})

describe('authApp Hono routes', () => {
  it('exports authApp', async () => {
    const mod = await import('../auth.js')
    expect(mod.authApp).toBeDefined()
    expect(typeof mod.authApp.fetch).toBe('function')
  })

  it('/logout returns ok', async () => {
    const mod = await import('../auth.js')
    const res = await mod.authApp.request('/logout', { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('/login redirects to Google', async () => {
    const mod = await import('../auth.js')
    const env = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-secret',
      WORKER_JWT_SECRET: SECRET,
      WORKER_ENCRYPTION_KEY: 'test-enc-key',
      DB: {},
      PAGES_ORIGIN: 'http://localhost:5173',
    }
    const res = await mod.authApp.request('/login', {}, env as any)
    expect(res.status).toBe(302)
    const location = res.headers.get('Location') || ''
    expect(location).toContain('accounts.google.com')
    expect(location).toContain('client_id=test-client-id')
  })

  it('/callback returns 400 for missing state', async () => {
    const mod = await import('../auth.js')
    const res = await mod.authApp.request('/callback?code=abc')
    expect(res.status).toBe(400)
  })

  it('/callback returns 400 when state does not match', async () => {
    const mod = await import('../auth.js')
    const env = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-secret',
      WORKER_JWT_SECRET: SECRET,
      WORKER_ENCRYPTION_KEY: 'test-enc-key',
      DB: {},
      PAGES_ORIGIN: 'http://localhost:5173',
    }
    const res = await mod.authApp.request('/callback?code=abc&state=wrong', {
      headers: { Cookie: 'rumaq_oauth_state=expected:verifier' },
    }, env as any)
    expect(res.status).toBe(400)
  })

  it('/callback returns 400 when token exchange fails', async () => {
    globalThis.fetch = async () => new Response('{}', { status: 400 }) as any
    const mod = await import('../auth.js')
    const env = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-secret',
      WORKER_JWT_SECRET: SECRET,
      WORKER_ENCRYPTION_KEY: 'test-enc-key',
      DB: {},
      PAGES_ORIGIN: 'http://localhost:5173',
    }
    const res = await mod.authApp.request('/callback?code=abc&state=test-state', {
      headers: { Cookie: 'rumaq_oauth_state=test-state:verifier' },
    }, env as any)
    expect(res.status).toBe(400)
  })

  it('/callback returns 400 when user info fetch fails', async () => {
    let callCount = 0
    globalThis.fetch = async () => {
      callCount++
      if (callCount === 1) return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 }) as any
      return new Response('{}', { status: 400 }) as any
    }
    const mod = await import('../auth.js')
    const env = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-secret',
      WORKER_JWT_SECRET: SECRET,
      WORKER_ENCRYPTION_KEY: 'test-enc-key',
      DB: {},
      PAGES_ORIGIN: 'http://localhost:5173',
    }
    const res = await mod.authApp.request('/callback?code=abc&state=test-state', {
      headers: { Cookie: 'rumaq_oauth_state=test-state:verifier' },
    }, env as any)
    expect(res.status).toBe(400)
  })

  it('/callback succeeds with new user', async () => {
    let callCount = 0
    globalThis.fetch = async () => {
      callCount++
      if (callCount === 1) return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 }) as any
      return new Response(JSON.stringify({ sub: 'g123', email: 'a@b.com', name: 'Alice' }), { status: 200 }) as any
    }
    const mockDb = {
      prepare: () => mockDb,
      bind: () => mockDb,
      first: async () => null,
      all: async () => ({ results: [] }),
      batch: async () => [{}, { results: [{ id: 'new-id' }] }],
    }
    const mod = await import('../auth.js')
    const env = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-secret',
      WORKER_JWT_SECRET: SECRET,
      WORKER_ENCRYPTION_KEY: 'test-enc-key',
      DB: mockDb,
      PAGES_ORIGIN: 'http://localhost:5173',
    }
    const res = await mod.authApp.request('/callback?code=abc&state=test-state', {
      headers: { Cookie: 'rumaq_oauth_state=test-state:verifier' },
    }, env as any)
    expect(res.status).toBe(302)
  })

  it('/callback skips household creation for existing member', async () => {
    let callCount = 0
    globalThis.fetch = async () => {
      callCount++
      if (callCount === 1) return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 }) as any
      return new Response(JSON.stringify({ sub: 'g456', email: 'b@b.com' }), { status: 200 }) as any
    }
    const mockDb = {
      prepare: () => mockDb,
      bind: () => mockDb,
      first: async () => ({ household_id: 'existing-house' }),
      all: async () => ({ results: [] }),
      batch: async () => [{}, { results: [] }],
    }
    const mod = await import('../auth.js')
    const env = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-secret',
      WORKER_JWT_SECRET: SECRET,
      WORKER_ENCRYPTION_KEY: 'test-enc-key',
      DB: mockDb,
      PAGES_ORIGIN: 'http://localhost:5173',
    }
    const res = await mod.authApp.request('/callback?code=abc&state=test-state', {
      headers: { Cookie: 'rumaq_oauth_state=test-state:verifier' },
    }, env as any)
    expect(res.status).toBe(302)
  })
})
