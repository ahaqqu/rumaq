import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authApp } from './auth.js'
import { requireAuth } from './middleware.js'
import { encrypt, decrypt } from './crypto.js'

export type Env = {
  Bindings: {
    DB: D1Database
    RECEIPTS: R2Bucket
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    WORKER_JWT_SECRET: string
    WORKER_ENCRYPTION_KEY: string
    PAGES_ORIGIN: string
    EMAIL_AUTH_ENABLED: string
    ASSETS: Fetcher
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

const patchSettingsSchema = z.object({
  motion_preference: z.enum(['none', 'reduced', 'standard']).optional(),
  currency: z.enum(['idr', 'usd']).optional(),
  language: z.enum(['en', 'id']).optional(),
  ai_provider: z.enum(['gemini', 'openai', 'anthropic', 'opencode']).optional(),
  ai_key: z.string().optional(),
  persona: z.object({
    enabled: z.boolean(),
    user_role: z.string(),
    ai_role: z.string(),
  }).optional(),
})

const locationBody = z.object({
  label: z.string().min(1).max(100),
})

const storeBody = z.object({
  label: z.string().min(1).max(100),
})

function deriveHue(userRole: string, aiRole: string): number {
  const key = `${userRole.trim().toLowerCase()}|${aiRole.trim().toLowerCase()}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

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

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || 'Internal server error' }, 500)
})

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

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

app.get('/api/settings', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare(
    `SELECT motion_preference, currency, language, ai_provider, encrypted_ai_key,
            persona_enabled, persona_user_role, persona_ai_role, theme_hue
     FROM user_settings WHERE user_id = ?`
  ).bind(userId).first<{
    motion_preference: string
    currency: string
    language: string
    ai_provider: string | null
    encrypted_ai_key: string | null
    persona_enabled: number
    persona_user_role: string | null
    persona_ai_role: string | null
    theme_hue: number | null
  }>()

  if (!row) return c.json({ error: 'Settings not found' }, 404)

  return c.json({
    motion_preference: row.motion_preference,
    currency: row.currency,
    language: row.language,
    ai_provider: row.ai_provider || 'gemini',
    ai_key_set: !!row.encrypted_ai_key,
    persona: {
      enabled: row.persona_enabled === 1,
      user_role: row.persona_user_role || '',
      ai_role: row.persona_ai_role || '',
      theme_hue: row.persona_enabled === 1 ? (row.theme_hue ?? 230) : 0,
    },
  })
})

app.patch('/api/settings', zValidator('json', patchSettingsSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  const key = c.env.WORKER_ENCRYPTION_KEY
  const updates: string[] = []
  const params: unknown[] = []

  if (body.motion_preference !== undefined) {
    updates.push('motion_preference = ?')
    params.push(body.motion_preference)
  }
  if (body.currency !== undefined) {
    updates.push('currency = ?')
    params.push(body.currency)
  }
  if (body.language !== undefined) {
    updates.push('language = ?')
    params.push(body.language)
  }
  if (body.ai_provider !== undefined) {
    updates.push('ai_provider = ?')
    params.push(body.ai_provider)
  }
  if (body.ai_key !== undefined) {
    const encrypted = await encrypt(body.ai_key, key)
    updates.push('encrypted_ai_key = ?')
    params.push(encrypted)
  }
  if (body.persona !== undefined) {
    const p = body.persona
    updates.push('persona_enabled = ?, persona_user_role = ?, persona_ai_role = ?')
    params.push(p.enabled ? 1 : 0, p.user_role, p.ai_role)
    if (p.enabled && p.user_role && p.ai_role) {
      const hue = deriveHue(p.user_role, p.ai_role)
      updates.push('theme_hue = ?')
      params.push(hue)
    }
  }

  if (updates.length === 0) return c.json({ ok: true })

  updates.push('updated_at = datetime(\'now\')')
  params.push(userId)

  await c.env.DB.prepare(
    `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`
  ).bind(...params).run()

  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

app.get('/api/locations', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, label, sort_order FROM locations WHERE household_id = ? ORDER BY sort_order'
  ).bind(c.get('householdId')).all()
  return c.json({ locations: results })
})

app.post('/api/locations', zValidator('json', locationBody), async (c) => {
  const { label } = c.req.valid('json')
  const householdId = c.get('householdId')

  const maxRow = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM locations WHERE household_id = ?'
  ).bind(householdId).first<{ next_order: number }>()
  const sortOrder = maxRow?.next_order ?? 1

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO locations (id, household_id, label, sort_order) VALUES (?, ?, ?, ?)'
  ).bind(id, householdId, label, sortOrder).run()

  return c.json({ id, label }, 201)
})

app.delete('/api/locations/:id', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')

  const row = await c.env.DB.prepare(
    'SELECT 1 FROM locations WHERE id = ? AND household_id = ?'
  ).bind(id, householdId).first()
  if (!row) return c.json({ error: 'Location not found' }, 404)

  try {
    await c.env.DB.prepare('DELETE FROM locations WHERE id = ? AND household_id = ?')
      .bind(id, householdId).run()
    return c.json({ ok: true })
  } catch (err: any) {
    if (err?.message?.includes('FOREIGN KEY') || err?.message?.includes('constraint')) {
      return c.json({ error: 'Location is referenced by stock items. Remove or reassign them first.' }, 409)
    }
    throw err
  }
})

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

app.get('/api/stores', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, label FROM stores WHERE household_id = ? ORDER BY label'
  ).bind(c.get('householdId')).all()
  return c.json({ stores: results })
})

app.post('/api/stores', zValidator('json', storeBody), async (c) => {
  const { label } = c.req.valid('json')
  const householdId = c.get('householdId')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO stores (id, household_id, label) VALUES (?, ?, ?)'
  ).bind(id, householdId, label).run()
  return c.json({ id, label }, 201)
})

app.delete('/api/stores/:id', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')

  const row = await c.env.DB.prepare(
    'SELECT 1 FROM stores WHERE id = ? AND household_id = ?'
  ).bind(id, householdId).first()
  if (!row) return c.json({ error: 'Store not found' }, 404)

  try {
    await c.env.DB.prepare('DELETE FROM stores WHERE id = ? AND household_id = ?')
      .bind(id, householdId).run()
    return c.json({ ok: true })
  } catch (err: any) {
    if (err?.message?.includes('FOREIGN KEY') || err?.message?.includes('constraint')) {
      return c.json({ error: 'Store is referenced by purchases or plan items. Remove or reassign them first.' }, 409)
    }
    throw err
  }
})

// ---------------------------------------------------------------------------
// AI Usage & Test
// ---------------------------------------------------------------------------

app.get('/api/ai/usage', async (c) => {
  const userId = c.get('userId')
  const today = new Date().toISOString().slice(0, 10)

  const existing = await c.env.DB.prepare(
    'SELECT provider, used, daily_limit FROM ai_usage WHERE user_id = ? AND date = ?'
  ).bind(userId, today).first<{ provider: string | null; used: number; daily_limit: number }>()

  if (existing) {
    return c.json({
      provider: existing.provider || 'gemini',
      used: existing.used,
      limit: existing.daily_limit,
    })
  }

  // Upsert today's row with daily_limit = 20
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO ai_usage (id, user_id, date, used, daily_limit) VALUES (?, ?, ?, 0, 20)'
  ).bind(id, userId, today).run()

  return c.json({ provider: 'gemini', used: 0, limit: 20 })
})

app.post('/api/ai/test', async (c) => {
  const userId = c.get('userId')
  const key = c.env.WORKER_ENCRYPTION_KEY

  const row = await c.env.DB.prepare(
    'SELECT encrypted_ai_key, ai_provider FROM user_settings WHERE user_id = ?'
  ).bind(userId).first<{ encrypted_ai_key: string | null; ai_provider: string | null }>()

  if (!row?.encrypted_ai_key) {
    return c.json({ error: 'No AI key saved. Save your API key first.' }, 400)
  }

  let aiKey: string
  try {
    aiKey = await decrypt(row.encrypted_ai_key, key)
  } catch {
    return c.json({ error: 'Failed to decrypt AI key' }, 500)
  }

  const provider = row.ai_provider || 'gemini'
  const today = new Date().toISOString().slice(0, 10)

  try {
    await makeTestProviderCall(aiKey, provider)
  } catch (err: any) {
    return c.json({ error: err.message || 'AI test call failed' }, 502)
  }

  // Upsert + increment usage
  await c.env.DB.prepare(
    `INSERT INTO ai_usage (id, user_id, date, provider, used, daily_limit)
     VALUES (?, ?, ?, ?, 1, 20)
     ON CONFLICT(user_id, date) DO UPDATE SET used = used + 1`
  ).bind(crypto.randomUUID(), userId, today, provider).run()

  return c.json({ ok: true })
})

async function makeTestProviderCall(apiKey: string, provider: string): Promise<void> {
  switch (provider) {
    case 'openai':
    case 'opencode': {
      const baseUrl = provider === 'opencode' ? 'https://api.opencode.ai/v1' : 'https://api.openai.com/v1'
      const model = provider === 'opencode' ? 'opencode-mini' : 'gpt-4o-mini'
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ok' }], max_tokens: 1 }),
      })
      if (!res.ok) {
        const body: any = await res.json().catch(() => null)
        throw new Error(body?.error?.message || `AI provider returned ${res.status}`)
      }
      return
    }
    case 'anthropic': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'ok' }] }),
      })
      if (!res.ok) {
        const body: any = await res.json().catch(() => null)
        throw new Error(body?.error?.message || `AI provider returned ${res.status}`)
      }
      return
    }
    case 'gemini': {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ok' }] }] }),
      })
      if (!res.ok) {
        const body: any = await res.json().catch(() => null)
        throw new Error(body?.error?.message || `AI provider returned ${res.status}`)
      }
      return
    }
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

app.notFound(async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw)
  }
  return c.json({ error: 'Not found' }, 404)
})

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx)
  },
}
export { app }
