import { describe, it, expect, beforeAll } from 'vitest'
import { resetDb, seedDb } from '../support/db.js'
import { signTestCookie } from '../support/auth.js'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_USER_ID =
  process.env.TEST_USER_ID || 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

describe('GET /api/me', () => {
  beforeAll(async () => {
    await resetDb()
    await seedDb()
  })

  it('returns 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/me`)
    expect(res.status).toBe(401)
  })

  it('returns 200 with user shape when authenticated', async () => {
    const cookie = await signTestCookie(TEST_USER_ID, {
      email: 'test@rumaq.dev',
    })

    const res = await fetch(`${BASE_URL}/api/me`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.user).toBeDefined()
    expect(body.user.id).toBe(TEST_USER_ID)
    expect(body.user.email).toBe('test@rumaq.dev')
    expect(body.user.name).toBe('Test User')
  })
})
