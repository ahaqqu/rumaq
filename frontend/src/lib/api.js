/**
 * RumaQ API client — talks to the Cloudflare Worker backend.
 * All protected endpoints use the rumaq_session cookie (HttpOnly).
 */

const BASE = import.meta.env.VITE_API_BASE || ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export function getMe() {
  return request('/api/me')
}

export function getStock({ location, q } = {}) {
  const params = new URLSearchParams()
  if (location) params.set('location', location)
  if (q) params.set('q', q)
  const qs = params.toString()
  return request(`/api/stock${qs ? `?${qs}` : ''}`)
}

export function getHealth() {
  return request('/api/health')
}
