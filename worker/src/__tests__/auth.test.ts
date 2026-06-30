import { describe, it, expect } from 'vitest'
import { verifyJwt } from '../auth.js'

const SECRET = 'test-secret-12345'

// Testing signJwt indirectly through verifyJwt roundtrip
// signJwt is not exported, so we construct JWTs manually for edge cases

async function signJwtForTest(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const header = { alg: 'HS256', typ: 'JWT' }
  const b64 = (buf: BufferSource) => {
    const b = new Uint8Array(buf as ArrayBuffer)
    let bin = ''
    for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i])
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  const body = `${b64(encoder.encode(JSON.stringify(header)))}.${b64(encoder.encode(JSON.stringify(payload)))}`
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return `${body}.${b64(sig)}`
}

describe('verifyJwt', () => {
  it('returns payload for a valid token', async () => {
    const token = await signJwtForTest({ sub: 'u1', email: 'a@b.com' }, SECRET)
    const payload = await verifyJwt(token, SECRET)
    expect(payload).not.toBeNull()
    expect(payload!.sub).toBe('u1')
    expect(payload!.email).toBe('a@b.com')
  })

  it('returns null for a tampered token', async () => {
    const token = await signJwtForTest({ sub: 'u1' }, SECRET)
    const [h, p] = token.split('.')
    const tampered = `${h}.${p}.invalidsig`
    const payload = await verifyJwt(tampered, SECRET)
    expect(payload).toBeNull()
  })

  it('returns null for a token with wrong secret', async () => {
    const token = await signJwtForTest({ sub: 'u1' }, SECRET)
    const payload = await verifyJwt(token, 'wrong-secret')
    expect(payload).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const token = await signJwtForTest({ sub: 'u1', exp: Date.now() - 1000 }, SECRET)
    const payload = await verifyJwt(token, SECRET)
    expect(payload).toBeNull()
  })

  it('accepts a token that has not expired yet', async () => {
    const token = await signJwtForTest({ sub: 'u1', exp: Date.now() + 60_000 }, SECRET)
    const payload = await verifyJwt(token, SECRET)
    expect(payload).not.toBeNull()
  })

  it('returns null for malformed token strings', async () => {
    expect(await verifyJwt('', SECRET)).toBeNull()
    expect(await verifyJwt('a.b', SECRET)).toBeNull()
    expect(await verifyJwt('a.b.c.d', SECRET)).toBeNull()
    expect(await verifyJwt('not-a-jwt', SECRET)).toBeNull()
  })
})
