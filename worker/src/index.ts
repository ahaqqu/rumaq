import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authApp } from './auth.js'
import { requireAuth } from './middleware.js'

export type Env = {
  Bindings: {
    DB: D1Database
    RECEIPTS: R2Bucket
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    WORKER_JWT_SECRET: string
    WORKER_ENCRYPTION_KEY: string
    PAGES_ORIGIN: string
  }
  Variables: {
    userId: string
    householdId: string
  }
}

const stockQuery = z.object({
  location: z.string().optional(),
  q: z.string().optional(),
})

const app = new Hono<Env>()

app.use(logger())
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.PAGES_ORIGIN || 'https://rumaq.pages.dev'
      return origin === allowed || origin === 'http://localhost:5173' ? origin : allowed
    },
    credentials: true,
  })
)

app.route('/api/auth', authApp)

app.get('/api/health', (c) => c.json({ ok: true }))

app.use('/api/*', requireAuth)

app.get('/api/me', async (c) => {
  const user = await c.env.DB.prepare('SELECT id, email, name, picture FROM users WHERE id = ?')
    .bind(c.get('userId'))
    .first()
  return c.json({ user })
})

app.get('/api/stock', zValidator('query', stockQuery), async (c) => {
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
  return c.json({ stock: results })
})

export default app
