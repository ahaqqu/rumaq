import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../types.js'
import { createCors } from '../cors.js'
import { propsAuthMiddleware } from '../auth.js'

const stockQuery = z.object({
  location: z.string().optional(),
  q: z.string().optional(),
})

const apiApp = new Hono<Env>()

apiApp.use(logger())
apiApp.use('*', createCors())

apiApp.onError((err, c) => {
  console.error(err)
  c.res.headers.set('Cache-Control', 'private, no-cache')
  return c.json({ error: err.message || 'Internal server error' }, 500)
})

apiApp.get('/api/health', (c) => {
  c.res.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return c.json({ ok: true })
})

apiApp.get('/api/auth/email-status', (c) => {
  c.res.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return c.json({ enabled: c.env.EMAIL_AUTH_ENABLED === 'true' })
})

apiApp.use('/api/me', propsAuthMiddleware)
apiApp.use('/api/stock', propsAuthMiddleware)

apiApp.get('/api/me', async (c) => {
  const user = await c.env.DB.prepare('SELECT id, email, name, picture FROM users WHERE id = ?')
    .bind(c.get('userId'))
    .first()
  const res = c.json({ user })
  res.headers.set('Cloudflare-CDN-Cache-Control', 'public, max-age=30, stale-while-revalidate=300')
  res.headers.set('Cache-Control', 'private, max-age=0')
  return res
})

apiApp.get('/api/stock', zValidator('query', stockQuery), async (c) => {
  const { location, q } = c.req.valid('query')

  let sql = `SELECT s.id, i.name, s.qty, s.unit, s.expiry_date, s.run_out_days, s.basis, l.label AS location
     FROM stock s
     JOIN items i ON i.id = s.item_id
     LEFT JOIN locations l ON l.id = s.location_id
     WHERE s.household_id = ?`
  const params: unknown[] = [c.get('householdId')]

  if (location) {
    sql += ' AND l.id = ?'
    params.push(location)
  }
  if (q) {
    sql += ' AND i.name LIKE ?'
    params.push(`%${q}%`)
  }

  sql += ' ORDER BY COALESCE(s.run_out_days, 999), s.expiry_date'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const res = c.json({ stock: results })
  res.headers.set('Cloudflare-CDN-Cache-Control', 'public, max-age=30, stale-while-revalidate=300')
  res.headers.set('Cache-Control', 'private, max-age=0')
  return res
})

apiApp.notFound(async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw)
  }
  return c.json({ error: 'Not found' }, 404)
})

export { apiApp }
