import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { verifyJwt } from './auth.js'
import type { Env } from './index.js'

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const token = getCookie(c, 'rumaq_session')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const payload = await verifyJwt(token, c.env.WORKER_JWT_SECRET)
  if (!payload || typeof payload.sub !== 'string') {
    return c.json({ error: 'Invalid session' }, 401)
  }

  c.set('userId', payload.sub)

  const settings = await c.env.DB.prepare(
    'SELECT active_household_id FROM user_settings WHERE user_id = ?'
  )
    .bind(payload.sub)
    .first<{ active_household_id: string | null }>()

  const householdId =
    settings?.active_household_id ||
    (await c.env.DB.prepare(
      'SELECT household_id FROM household_members WHERE user_id = ? LIMIT 1'
    )
      .bind(payload.sub)
      .first<{ household_id: string }>())?.household_id

  if (!householdId) {
    return c.json({ error: 'No household found' }, 403)
  }

  c.set('householdId', householdId)
  await next()
})
