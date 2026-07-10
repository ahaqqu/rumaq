import { expect } from 'vitest'
import { resetDb, seedDb } from '../../../support/db.js'
import { signTestCookie } from '../../../support/auth.js'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_USER_ID = process.env.TEST_USER_ID || 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

export class ApiContext {
  constructor() {
    this.response = null
    this.responseBody = null
    this.headers = null
  }

  get baseUrl() {
    return BASE_URL
  }

  get testUserId() {
    return TEST_USER_ID
  }

  async resetAndSeed() {
    await resetDb()
    await seedDb()
  }

  async authenticate() {
    const cookie = await signTestCookie(TEST_USER_ID, { email: 'test@rumaq.dev' })
    this.headers = { Cookie: cookie }
  }

  async sendRequest(method, path) {
    const opts = { method }
    if (this.headers) opts.headers = this.headers
    this.response = await fetch(`${BASE_URL}${path}`, opts)
    try {
      this.responseBody = await this.response.json()
    } catch {
      this.responseBody = null
    }
  }

  expectStatus(code) {
    expect(this.response.status).toBe(code)
  }

  expectBodyToMatch(expected) {
    expect(this.responseBody).toMatchObject(expected)
  }

  expectPublicCacheHeaders() {
    const cc = this.response.headers.get('Cache-Control') || ''
    expect(cc).toMatch(/public/)
    expect(cc).toMatch(/max-age=60/)
  }

  expectAuthenticatedCacheHeaders() {
    const cdnCC = this.response.headers.get('Cloudflare-CDN-Cache-Control') || ''
    expect(cdnCC).toMatch(/public/)
    expect(cdnCC).toMatch(/max-age=30/)
    const cc = this.response.headers.get('Cache-Control') || ''
    expect(cc).toMatch(/private/)
    expect(cc).toMatch(/max-age=0/)
  }

  expectStockArray() {
    expect(Array.isArray(this.responseBody?.stock)).toBe(true)
  }

  expectStockLength(n) {
    expect(this.responseBody.stock).toHaveLength(n)
  }

  expectItemShape() {
    for (const item of this.responseBody.stock) {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('qty')
      expect(item).toHaveProperty('unit')
      expect(item).toHaveProperty('location')
    }
  }

  expectUserShape() {
    expect(this.responseBody.user).toBeDefined()
    expect(this.responseBody.user.id).toBe(TEST_USER_ID)
    expect(this.responseBody.user.email).toBe('test@rumaq.dev')
    expect(this.responseBody.user.name).toBe('Test User')
  }

  expectNamedFirstItem(name) {
    expect(this.responseBody.stock[0].name).toBe(name)
  }

  expectOrderedByRunOutDays() {
    const runOutDays = this.responseBody.stock.map(s => s.run_out_days).filter(Boolean)
    expect(runOutDays).toEqual([3, 7, 14])
  }
}
