import { expect } from 'vitest'
import { resetDb, seedDb } from '../../../support/db.js'
import { signTestCookie } from '../../../support/auth.js'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_USER_ID =
  process.env.TEST_USER_ID || 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

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
    const cookie = await signTestCookie(TEST_USER_ID, {
      email: 'test@rumaq.dev',
    })
    this.headers = { Cookie: cookie }
  }

  async authenticateViaEmail(email, password) {
    this.response = await fetch(`${BASE_URL}/api/auth/email-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    try {
      this.responseBody = await this.response.json()
    } catch {
      this.responseBody = null
    }
    const setCookie = this.response.headers.get('set-cookie')
    if (setCookie) {
      this.headers = { Cookie: setCookie.split(';')[0] }
    }
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
    const cc = this.response.headers.get('Cache-Control') || ''
    expect(cc).toMatch(/private, no-cache/)
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
    const runOutDays = this.responseBody.stock
      .map((s) => s.run_out_days)
      .filter(Boolean)
    expect(runOutDays).toEqual([3, 7, 14])
  }

  async sendRequestWithBody(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } }
    if (this.headers) opts.headers = { ...opts.headers, ...this.headers }
    if (body != null) opts.body = JSON.stringify(body)
    this.response = await fetch(`${BASE_URL}${path}`, opts)
    try {
      this.responseBody = await this.response.json()
    } catch {
      this.responseBody = null
    }
  }

  expectSettingsShape() {
    expect(this.responseBody).toHaveProperty('motion_preference')
    expect(this.responseBody).toHaveProperty('currency')
    expect(this.responseBody).toHaveProperty('has_ai_key')
  }

  expectHasAiKey(value) {
    expect(this.responseBody.has_ai_key).toBe(value)
  }

  expectSetting(field, value) {
    expect(this.responseBody[field]).toBe(value)
  }

  expectNoAiKeyInResponse() {
    expect(this.responseBody).not.toHaveProperty('encrypted_ai_key')
    expect(this.responseBody).not.toHaveProperty('ai_key')
  }

  expectLocationsArray() {
    expect(Array.isArray(this.responseBody?.locations)).toBe(true)
  }

  expectLocationsLength(n) {
    expect(this.responseBody.locations).toHaveLength(n)
  }

  expectCreatedLocationLabel(label) {
    expect(this.responseBody.location).toBeDefined()
    expect(this.responseBody.location.label).toBe(label)
  }

  expectStoresArray() {
    expect(Array.isArray(this.responseBody?.stores)).toBe(true)
  }

  expectStoresLength(n) {
    expect(this.responseBody.stores).toHaveLength(n)
  }

  expectCreatedStoreLabel(label) {
    expect(this.responseBody.store).toBeDefined()
    expect(this.responseBody.store.label).toBe(label)
  }

  expectUsageDefaults() {
    expect(this.responseBody).toHaveProperty('used')
    expect(this.responseBody).toHaveProperty('daily_limit')
    expect(this.responseBody.used).toBe(0)
    expect(this.responseBody.daily_limit).toBe(20)
  }

  expectStockUpdatedQty(qty) {
    expect(this.responseBody.stock).toBeDefined()
    expect(this.responseBody.stock.qty).toBe(qty)
  }

  expectStockRunOutComputed() {
    expect(this.responseBody.stock).toBeDefined()
    expect(this.responseBody.stock).toHaveProperty('run_out_days')
    expect(this.responseBody.stock).toHaveProperty('basis')
  }

  expectHomeShape() {
    expect(this.responseBody).toHaveProperty('total_items')
    expect(this.responseBody).toHaveProperty('expiring_7d')
    expect(this.responseBody).toHaveProperty('running_out_7d')
    expect(this.responseBody).toHaveProperty('low_stock')
    expect(this.responseBody).toHaveProperty('next_trip')
  }

  expectHomeTotalItems(n) {
    expect(this.responseBody.total_items).toBe(n)
  }

  expectHomeExpiring7d(n) {
    expect(this.responseBody.expiring_7d).toBe(n)
  }

  expectHomeRunningOutItems() {
    expect(this.responseBody.running_out_7d).toBeGreaterThan(0)
  }

  expectLowStockArray() {
    expect(Array.isArray(this.responseBody.low_stock)).toBe(true)
  }

  expectLowStockLength(n) {
    expect(this.responseBody.low_stock.length).toBeGreaterThanOrEqual(n)
  }

  expectLowStockItemShape() {
    for (const item of this.responseBody.low_stock) {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('qty')
      expect(item).toHaveProperty('unit')
      expect(item).toHaveProperty('location')
    }
  }

  async sendMultipart(
    method,
    path,
    fieldName,
    fileContent,
    fileName,
    fileType
  ) {
    const formData = new FormData()
    const blob = new Blob([fileContent], { type: fileType })
    formData.append(fieldName, blob, fileName)
    const opts = { method, body: formData }
    if (this.headers) opts.headers = { ...this.headers }
    this.response = await fetch(`${BASE_URL}${path}`, opts)
    try {
      this.responseBody = await this.response.json()
    } catch {
      this.responseBody = null
    }
  }

  expectScanItems() {
    expect(this.responseBody).toHaveProperty('items')
    expect(Array.isArray(this.responseBody.items)).toBe(true)
    expect(this.responseBody.items.length).toBeGreaterThan(0)
  }

  expectImageKey() {
    expect(this.responseBody).toHaveProperty('imageKey')
    expect(this.responseBody.imageKey).toBeTruthy()
  }

  expectStoreGuess(label) {
    expect(this.responseBody).toHaveProperty('storeGuess')
    expect(this.responseBody.storeGuess).toBeTruthy()
    expect(this.responseBody.storeGuess.label).toBe(label)
  }

  expectPurchaseShape() {
    expect(this.responseBody).toHaveProperty('purchase')
    expect(this.responseBody.purchase).toHaveProperty('id')
    expect(this.responseBody.purchase).toHaveProperty('date')
  }

  expectItemsArray() {
    expect(this.responseBody).toHaveProperty('items')
    expect(Array.isArray(this.responseBody.items)).toBe(true)
  }

  expectStockForItem(name, qty) {
    const item = this.responseBody.stock.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    )
    expect(item).toBeDefined()
    expect(item.qty).toBe(qty)
  }
}
