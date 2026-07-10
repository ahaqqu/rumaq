import { test, expect } from '@playwright/test'

const API = 'https://api.rumaq.workers.dev'
const APP = 'https://rumaq.pages.dev'
const EMAIL = 'alice@rumaq.dev'
const PASSWORD = 'password123'

test('login and logout with alice@rumaq.dev', async ({ page }) => {
  // 1. Login via email-login API
  const loginRes = await page.request.post(`${API}/api/auth/email-login`, {
    data: { email: EMAIL, password: PASSWORD },
  })
  expect(loginRes.status()).toBe(200)
  const loginBody = await loginRes.json()
  expect(loginBody).toEqual({ ok: true })

  // 2. Verify /api/me returns user data with the session cookie
  const meRes = await page.request.get(`${API}/api/me`)
  expect(meRes.status()).toBe(200)
  const meBody = await meRes.json()
  expect(meBody.user.email).toBe(EMAIL)

  // 3. Navigate to the app — should see Alice's content
  await page.goto(APP, { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toContainText(/Alice|alice/, { timeout: 10_000 })

  // 4. Logout
  await page.goto(`${API}/api/auth/logout`, { waitUntil: 'networkidle' })

  // 5. Should redirect back to the app (URL is now APP)
  await expect(page).toHaveURL(new RegExp(APP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { timeout: 10_000 })

  // 6. Verify /api/me now returns 401 (session cleared)
  const meRes2 = await page.request.get(`${API}/api/me`)
  expect(meRes2.status()).toBe(401)
})
