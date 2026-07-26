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
  if (res.status === 204) return null
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

export function login() {
  window.location.href = `${BASE}/api/auth/login`
}

export function logout() {
  window.location.href = `${BASE}/api/auth/logout`
}

export async function emailAuthStatus() {
  try {
    return await request('/api/auth/email-status')
  } catch {
    return { enabled: false }
  }
}

export async function emailLogin(email, password) {
  return request('/api/auth/email-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function isAuthenticated() {
  try {
    await request('/api/me')
    return true
  } catch {
    return false
  }
}

export function getSettings() {
  return request('/api/settings')
}

export function patchSettings(payload) {
  return request('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getLocations() {
  return request('/api/locations')
}

export function createLocation(label) {
  return request('/api/locations', {
    method: 'POST',
    body: JSON.stringify({ label }),
  })
}

export function deleteLocation(id) {
  return request(`/api/locations/${id}`, {
    method: 'DELETE',
  })
}

export function getItems() {
  return request('/api/items')
}

export function getStores() {
  return request('/api/stores')
}

export function createStore(label) {
  return request('/api/stores', {
    method: 'POST',
    body: JSON.stringify({ label }),
  })
}

export function deleteStore(id) {
  return request(`/api/stores/${id}`, {
    method: 'DELETE',
  })
}

export function getAiUsage() {
  return request('/api/ai/usage')
}

export function testAiKey(provider, key) {
  return request('/api/ai-key/test', {
    method: 'POST',
    body: JSON.stringify({ provider, key }),
  })
}

export function patchStock(id, payload) {
  return request(`/api/stock/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getHome() {
  return request('/api/home')
}

export function scanReceipt(file) {
  const formData = new FormData()
  formData.append('image', file)
  return fetch(`${BASE}/api/purchases/scan`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(body.error || `Scan failed: ${res.status}`)
    }
    return res.json()
  })
}

export function createPurchase(payload) {
  return request('/api/purchases', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getReceiptUrl(purchaseId) {
  return `${BASE}/api/purchases/${purchaseId}/receipt`
}

export function getPurchases({ store, from, to, q, groupBy, limit, cursor } = {}) {
  const params = new URLSearchParams()
  if (store) params.set('store', store)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (q) params.set('q', q)
  if (groupBy) params.set('group_by', groupBy)
  if (limit) params.set('limit', String(limit))
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return request(`/api/purchases${qs ? `?${qs}` : ''}`)
}

export function getPurchasePatterns() {
  return request('/api/purchases/patterns')
}

export function getPurchase(id) {
  return request(`/api/purchases/${id}`)
}

export function sendChatMessage(message, history = []) {
  const payload = { message }
  if (Array.isArray(history) && history.length > 0) {
    payload.history = history
  }
  return request('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getPlans(status = 'active') {
  return request(`/api/plans?status=${status}`)
}

export function generatePlan() {
  return request('/api/plans/generate', {
    method: 'POST',
  })
}

export function savePlan(items) {
  return request('/api/plans', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}

export function updatePlanItem(planId, itemId, status) {
  return request(`/api/plans/${planId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
