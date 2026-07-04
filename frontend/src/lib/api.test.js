import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getMe, getStock, getHealth, login, logout, isAuthenticated,
  emailAuthStatus, emailLogin,
  getSettings, updateSettings,
  getLocations, createLocation, deleteLocation,
  getStores, createStore, deleteStore,
  getAiUsage, testAiKey,
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
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/me', expect.objectContaining({
      credentials: 'include',
    }))
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

  it('logout calls /api/auth/logout with POST', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    const result = await logout()
    expect(result).toEqual({ ok: true })
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/auth/logout')
    expect(opts.method).toBe('POST')
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
      json: () => Promise.resolve({ motion_preference: 'standard', currency: 'idr', language: 'en' }),
    })
    const result = await getSettings()
    expect(result.currency).toBe('idr')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/settings', expect.objectContaining({ credentials: 'include' }))
  })

  it('updateSettings sends PATCH', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    const result = await updateSettings({ language: 'id' })
    expect(result.ok).toBe(true)
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/settings')
    expect(opts.method).toBe('PATCH')
    expect(opts.body).toBe(JSON.stringify({ language: 'id' }))
  })

  it('getLocations calls /api/locations', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ locations: [{ id: 'loc-1', label: 'Kulkas' }] }),
    })
    const result = await getLocations()
    expect(result.locations).toHaveLength(1)
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/locations', expect.anything())
  })

  it('createLocation calls POST /api/locations', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new-loc', label: 'Pantry' }),
    })
    const result = await createLocation('Pantry')
    expect(result.label).toBe('Pantry')
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/locations')
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ label: 'Pantry' }))
  })

  it('deleteLocation calls DELETE /api/locations/:id', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    await deleteLocation('loc-1')
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/locations/loc-1')
    expect(opts.method).toBe('DELETE')
  })

  it('getStores calls /api/stores', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stores: [{ id: 's-1', label: 'Indomaret' }] }),
    })
    const result = await getStores()
    expect(result.stores).toHaveLength(1)
  })

  it('createStore calls POST /api/stores', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new-store', label: 'Alfamart' }),
    })
    const result = await createStore('Alfamart')
    expect(result.label).toBe('Alfamart')
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/stores')
    expect(opts.method).toBe('POST')
  })

  it('deleteStore calls DELETE /api/stores/:id', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    await deleteStore('store-1')
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/stores/store-1')
    expect(opts.method).toBe('DELETE')
  })

  it('getAiUsage calls /api/ai/usage', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ provider: 'gemini', used: 5, limit: 20 }),
    })
    const result = await getAiUsage()
    expect(result.used).toBe(5)
    expect(result.limit).toBe(20)
  })

  it('testAiKey calls POST /api/ai/test', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    const result = await testAiKey()
    expect(result.ok).toBe(true)
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/api/ai/test')
    expect(opts.method).toBe('POST')
  })
})
