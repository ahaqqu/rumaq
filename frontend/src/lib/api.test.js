import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getMe,
  getStock,
  getHealth,
  login,
  logout,
  isAuthenticated,
  emailAuthStatus,
  emailLogin,
  getSettings,
  patchSettings,
  getLocations,
  createLocation,
  deleteLocation,
  getItems,
  getStores,
  createStore,
  deleteStore,
  getAiUsage,
  testAiKey,
  patchStock,
  getHome,
  scanReceipt,
  createPurchase,
  getReceiptUrl,
  getPurchases,
  getPurchasePatterns,
  getPurchase,
  sendChatMessage,
  getPlans,
  generatePlan,
  savePlan,
  updatePlanItem,
} from './api.js'

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

describe('api', () => {
  it('getMe calls /api/me', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: '1', email: 'a@b.com' } }),
    })
    const result = await getMe()
    expect(result).toEqual({ user: { id: '1', email: 'a@b.com' } })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/me',
      expect.objectContaining({
        credentials: 'include',
      })
    )
  })

  it('getStock without params', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stock: [] }),
    })
    const result = await getStock()
    expect(result).toEqual({ stock: [] })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/stock', expect.anything())
  })

  it('getStock with location and q params', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stock: [] }),
    })
    await getStock({ location: 'kulkas', q: 'susu' })
    const url = globalThis.fetch.mock.calls[0][0]
    expect(url).toContain('location=kulkas')
    expect(url).toContain('q=susu')
  })

  it('getHealth calls /api/health', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    const result = await getHealth()
    expect(result).toEqual({ ok: true })
  })

  it('throws on failed request', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'Server error' }),
    })
    await expect(getMe()).rejects.toThrow('Server error')
  })

  it('throws with status text when json fails', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('parse error')),
    })
    await expect(getMe()).rejects.toThrow('Internal Server Error')
  })

  it('throws fallback error when body has no error property', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 504,
      statusText: 'Gateway Timeout',
      json: () => Promise.resolve({}),
    })
    await expect(getMe()).rejects.toThrow('Request failed: 504')
  })

  it('login constructs correct redirect URL', () => {
    const origLocation = window.location
    const setter = vi.fn()
    const mockLocation = {}
    Object.defineProperty(mockLocation, 'href', { set: setter, get: () => '' })
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      configurable: true,
      writable: true,
    })
    login()
    expect(setter).toHaveBeenCalledWith(expect.stringContaining('/api/auth/login'))
    Object.defineProperty(window, 'location', {
      value: origLocation,
      configurable: true,
      writable: true,
    })
  })

  it('logout navigates to /api/auth/logout', () => {
    const origLocation = window.location
    const setter = vi.fn()
    const mockLocation = {}
    Object.defineProperty(mockLocation, 'href', { set: setter, get: () => '' })
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      configurable: true,
      writable: true,
    })
    logout()
    expect(setter).toHaveBeenCalledWith(expect.stringContaining('/api/auth/logout'))
    Object.defineProperty(window, 'location', {
      value: origLocation,
      configurable: true,
      writable: true,
    })
  })

  it('isAuthenticated returns true when getMe succeeds', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: '1' } }),
    })
    expect(await isAuthenticated()).toBe(true)
  })

  it('isAuthenticated returns false when getMe fails', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })
    expect(await isAuthenticated()).toBe(false)
  })

  it('emailAuthStatus calls /api/auth/email-status', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ enabled: true }),
    })
    const result = await emailAuthStatus()
    expect(result).toEqual({ enabled: true })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/email-status'),
      expect.anything()
    )
  })

  it('emailAuthStatus returns disabled on error', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'fail' }),
    })
    const result = await emailAuthStatus()
    expect(result).toEqual({ enabled: false })
  })

  it('emailLogin posts credentials to /api/auth/email-login', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    const result = await emailLogin('test@rumaq.dev', 'password123')
    expect(result).toEqual({ ok: true })
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/auth/email-login')
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ email: 'test@rumaq.dev', password: 'password123' }))
  })

  it('getSettings calls /api/settings', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ motion_preference: 'standard' }),
    })
    const result = await getSettings()
    expect(result).toEqual({ motion_preference: 'standard' })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/settings', expect.anything())
  })

  it('patchSettings sends PATCH payload', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    const result = await patchSettings({ language: 'id' })
    expect(result).toEqual({ ok: true })
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.method).toBe('PATCH')
    expect(opts.body).toBe(JSON.stringify({ language: 'id' }))
  })

  it('getLocations calls /api/locations', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ locations: [] }),
    })
    const result = await getLocations()
    expect(result).toEqual({ locations: [] })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/locations', expect.anything())
  })

  it('createLocation posts label', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ location: { id: 'l1', label: 'Kulkas' } }),
    })
    const result = await createLocation('Kulkas')
    expect(result.location.label).toBe('Kulkas')
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ label: 'Kulkas' }))
  })

  it('deleteLocation calls DELETE endpoint', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, status: 204 })
    await deleteLocation('l1')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/locations/l1', expect.anything())
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.method).toBe('DELETE')
  })

  it('getItems calls /api/items', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    })
    const result = await getItems()
    expect(result).toEqual({ items: [] })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/items', expect.anything())
  })

  it('getStores calls /api/stores', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stores: [] }),
    })
    const result = await getStores()
    expect(result).toEqual({ stores: [] })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/stores', expect.anything())
  })

  it('createStore posts label', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ store: { id: 's1', label: 'Indomaret' } }),
    })
    const result = await createStore('Indomaret')
    expect(result.store.label).toBe('Indomaret')
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.method).toBe('POST')
  })

  it('deleteStore calls DELETE endpoint', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, status: 204 })
    await deleteStore('s1')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/stores/s1', expect.anything())
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.method).toBe('DELETE')
  })

  it('getAiUsage calls /api/ai/usage', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ used: 5, daily_limit: 20 }),
    })
    const result = await getAiUsage()
    expect(result).toEqual({ used: 5, daily_limit: 20 })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/ai/usage', expect.anything())
  })

  it('testAiKey posts provider and key', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    const result = await testAiKey('openai', 'sk-test')
    expect(result).toEqual({ ok: true })
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/ai-key/test')
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ provider: 'openai', key: 'sk-test' }))
  })

  it('patchStock calls PATCH endpoint', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stock: { id: 'x' } }),
    })
    const result = await patchStock('x', { qty: 5 })
    expect(result.stock.id).toBe('x')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/stock/x', expect.anything())
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.method).toBe('PATCH')
  })

  it('getHome calls /api/home', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total_items: 3 }),
    })
    const result = await getHome()
    expect(result.total_items).toBe(3)
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/home', expect.anything())
  })

  it('scanReceipt posts FormData', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    })
    const file = new File(['x'], 'receipt.jpg', { type: 'image/jpeg' })
    const result = await scanReceipt(file)
    expect(result).toEqual({ items: [] })
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/purchases/scan')
    expect(opts.method).toBe('POST')
    expect(opts.credentials).toBe('include')
    expect(opts.body).toBeInstanceOf(FormData)
  })

  it('scanReceipt throws on error', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: 'Invalid image' }),
    })
    const file = new File(['x'], 'receipt.jpg', { type: 'image/jpeg' })
    await expect(scanReceipt(file)).rejects.toThrow('Invalid image')
  })

  it('createPurchase posts payload', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ purchase: { id: 'p1' } }),
    })
    const result = await createPurchase({ items: [{ name: 'A', qty: 1, unit: 'pcs', price: 0 }] })
    expect(result.purchase.id).toBe('p1')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/purchases', expect.anything())
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.method).toBe('POST')
  })

  it('getReceiptUrl returns URL', () => {
    expect(getReceiptUrl('p1')).toContain('/api/purchases/p1/receipt')
  })

  it('getPurchases builds query string', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ purchases: [] }),
    })
    await getPurchases({
      store: 's1',
      from: '2026-01-01',
      to: '2026-12-31',
      q: 'milk',
      cursor: 'c1',
    })
    const url = globalThis.fetch.mock.calls[0][0]
    expect(url).toContain('store=s1')
    expect(url).toContain('from=2026-01-01')
    expect(url).toContain('to=2026-12-31')
    expect(url).toContain('q=milk')
    expect(url).toContain('cursor=c1')
  })

  it('getPurchasePatterns calls /api/purchases/patterns', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ patterns: [] }),
    })
    const result = await getPurchasePatterns()
    expect(result).toEqual({ patterns: [] })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/purchases/patterns', expect.anything())
  })

  it('getPurchase calls /api/purchases/:id', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ purchase: { id: 'p1' } }),
    })
    const result = await getPurchase('p1')
    expect(result.purchase.id).toBe('p1')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/purchases/p1', expect.anything())
  })

  it('sendChatMessage posts message without history', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reply: 'hello' }),
    })
    const result = await sendChatMessage('hi')
    expect(result.reply).toBe('hello')
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.body).toBe(JSON.stringify({ message: 'hi' }))
  })

  it('sendChatMessage includes history when provided', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reply: 'ok' }),
    })
    await sendChatMessage('hi', [{ role: 'user', content: 'previous' }])
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.body).toBe(
      JSON.stringify({ message: 'hi', history: [{ role: 'user', content: 'previous' }] })
    )
  })

  it('getPlans defaults to active', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ plans: [] }),
    })
    await getPlans()
    expect(globalThis.fetch.mock.calls[0][0]).toContain('/api/plans?status=active')
  })

  it('generatePlan posts to /api/plans/generate', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    })
    const result = await generatePlan()
    expect(result).toEqual({ items: [] })
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/plans/generate')
    expect(opts.method).toBe('POST')
  })

  it('savePlan posts items', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ plan: { id: 'pl1' } }),
    })
    const result = await savePlan([{ name: 'A' }])
    expect(result.plan.id).toBe('pl1')
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ items: [{ name: 'A' }] }))
  })

  it('updatePlanItem calls PATCH endpoint', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ item: { id: 'i1' } }),
    })
    const result = await updatePlanItem('pl1', 'i1', 'bought')
    expect(result.item.id).toBe('i1')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/plans/pl1/items/i1', expect.anything())
    const [, opts] = globalThis.fetch.mock.calls[0]
    expect(opts.method).toBe('PATCH')
    expect(opts.body).toBe(JSON.stringify({ status: 'bought' }))
  })
})
