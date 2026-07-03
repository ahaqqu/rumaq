import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getMe, getStock, getHealth, login, logout, isAuthenticated } from './api.js'

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
})
