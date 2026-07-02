import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('GET /api/health', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await fetch(`${BASE_URL}/api/health`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })
})
