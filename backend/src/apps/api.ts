import { Hono } from 'hono'
import { logger } from 'hono/logger'

import { sValidator } from '@hono/standard-validator'
import { openAPIRouteHandler, describeRoute } from 'hono-openapi'
import { object, string, optional } from 'valibot'
import type { Env } from '../types.js'
import { createCors } from '../cors.js'
import { propsAuthMiddleware } from '../auth.js'
import { encryptAiKey, decryptAiKey } from '../lib/crypto.js'
import {
  settingsPatchSchema,
  locationSchema,
  storeSchema,
  aiKeyTestSchema,
} from '../schemas.js'

const stockQuery = object({
  location: optional(string()),
  q: optional(string()),
})

const apiApp = new Hono<Env>()

apiApp.use(logger())
apiApp.use('*', createCors())

apiApp.onError((err, c) => {
  console.error(err)
  c.res.headers.set('Cache-Control', 'private, no-cache')
  return c.json({ error: err.message || 'Internal server error' }, 500)
})

apiApp.get(
  '/api/openapi.json',
  openAPIRouteHandler(apiApp, {
    documentation: {
      info: { title: 'RumaQ API', version: '0.1.0' },
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'rumaq_session',
          },
        },
      },
    },
  })
)

apiApp.get(
  '/api/health',
  describeRoute({
    description: 'Public health check.',
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
          },
        },
      },
    },
  }),
  (c) => {
    c.res.headers.set(
      'Cache-Control',
      'public, max-age=60, stale-while-revalidate=300'
    )
    return c.json({ ok: true })
  }
)

apiApp.get(
  '/api/auth/email-status',
  describeRoute({
    description: 'Reports whether email/password auth is enabled.',
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { enabled: { type: 'boolean' } },
            },
          },
        },
      },
    },
  }),
  (c) => {
    c.res.headers.set(
      'Cache-Control',
      'public, max-age=60, stale-while-revalidate=300'
    )
    return c.json({ enabled: c.env.EMAIL_AUTH_ENABLED === 'true' })
  }
)

apiApp.use('/api/me', propsAuthMiddleware)
apiApp.use('/api/stock', propsAuthMiddleware)
apiApp.use('/api/settings', propsAuthMiddleware)
apiApp.use('/api/ai/usage', propsAuthMiddleware)
apiApp.use('/api/locations', propsAuthMiddleware)
apiApp.use('/api/locations/:id', propsAuthMiddleware)
apiApp.use('/api/stores', propsAuthMiddleware)
apiApp.use('/api/stores/:id', propsAuthMiddleware)

apiApp.get(
  '/api/me',
  describeRoute({
    description: 'Returns the current authenticated user.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: 'string', nullable: true },
                    picture: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
    },
  }),
  async (c) => {
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, picture FROM users WHERE id = ?'
    )
      .bind(c.get('userId'))
      .first()
    const res = c.json({ user })
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.get(
  '/api/stock',
  describeRoute({
    description: 'Current inventory for the active household.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                stock: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
    },
  }),
  sValidator('query', stockQuery),
  async (c) => {
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

    const { results } = await c.env.DB.prepare(sql)
      .bind(...params)
      .all()
    const res = c.json({ stock: results })
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.get(
  '/api/settings',
  describeRoute({
    description: 'Returns the current authenticated user settings.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'OK' },
      401: { description: 'Unauthorized' },
    },
  }),
  async (c) => {
    const settings = await c.env.DB.prepare(
      `SELECT motion_preference, language, ai_provider, persona_user_role,
               persona_ai_role, persona_enabled, theme_hue, active_household_id,
               encrypted_ai_key
       FROM user_settings WHERE user_id = ?`
    )
      .bind(c.get('userId'))
      .first<{
        motion_preference: string
        currency: string
        ai_provider: string | null
        persona_user_role: string | null
        persona_ai_role: string | null
        persona_enabled: number
        theme_hue: number | null
        active_household_id: string | null
        encrypted_ai_key: string | null
      }>()

    const household = settings?.active_household_id
      ? await c.env.DB.prepare('SELECT name FROM households WHERE id = ?')
          .bind(settings.active_household_id)
          .first<{ name: string }>()
      : null

    const res = c.json({
      motion_preference: settings?.motion_preference ?? 'standard',
      language: settings?.language ?? null,
      ai_provider: settings?.ai_provider ?? null,
      persona_user_role: settings?.persona_user_role ?? null,
      persona_ai_role: settings?.persona_ai_role ?? null,
      persona_enabled: settings?.persona_enabled === 1,
      theme_hue: settings?.theme_hue ?? null,
      active_household_id: settings?.active_household_id ?? null,
      active_household_name: household?.name ?? null,
      has_ai_key:
        settings?.encrypted_ai_key != null && settings.encrypted_ai_key !== '',
    })
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.patch(
  '/api/settings',
  describeRoute({
    description: 'Updates the current user settings.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'OK' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
    },
  }),
  sValidator('json', settingsPatchSchema),
  async (c) => {
    const { ai_key, ...fields } = c.req.valid('json')
    const updates: string[] = []
    const params: unknown[] = []

    if (ai_key !== undefined) {
      const encrypted = await encryptAiKey(ai_key, c.env.WORKER_ENCRYPTION_KEY)
      updates.push('encrypted_ai_key = ?')
      params.push(encrypted)
    }
    if (fields.ai_provider !== undefined) {
      updates.push('ai_provider = ?')
      params.push(fields.ai_provider)
    }
    if (fields.persona_user_role !== undefined) {
      updates.push('persona_user_role = ?')
      params.push(fields.persona_user_role)
    }
    if (fields.persona_ai_role !== undefined) {
      updates.push('persona_ai_role = ?')
      params.push(fields.persona_ai_role)
    }
    if (fields.persona_enabled !== undefined) {
      updates.push('persona_enabled = ?')
      params.push(fields.persona_enabled ? 1 : 0)
    }
    if (fields.motion_preference !== undefined) {
      updates.push('motion_preference = ?')
      params.push(fields.motion_preference)
    }
    if (fields.language !== undefined) {
      updates.push('language = ?')
      params.push(fields.language)
    }
    if (fields.theme_hue !== undefined) {
      updates.push('theme_hue = ?')
      params.push(fields.theme_hue)
    }

    if (updates.length > 0) {
      params.push(c.get('userId'))
      await c.env.DB.prepare(
        `UPDATE user_settings SET ${updates.join(', ')}, updated_at = datetime('now') WHERE user_id = ?`
      )
        .bind(...params)
        .run()
    }

    const settings = await c.env.DB.prepare(
      `SELECT motion_preference, language, ai_provider, persona_user_role,
              persona_ai_role, persona_enabled, theme_hue, encrypted_ai_key
       FROM user_settings WHERE user_id = ?`
    )
      .bind(c.get('userId'))
      .first<{
        motion_preference: string
        language: string | null
        ai_provider: string | null
        persona_user_role: string | null
        persona_ai_role: string | null
        persona_enabled: number
        theme_hue: number | null
        encrypted_ai_key: string | null
      }>()

    const res = c.json({
      motion_preference: settings?.motion_preference ?? 'standard',
      language: settings?.language ?? null,
      ai_provider: settings?.ai_provider ?? null,
      persona_user_role: settings?.persona_user_role ?? null,
      persona_ai_role: settings?.persona_ai_role ?? null,
      persona_enabled: settings?.persona_enabled === 1,
      theme_hue: settings?.theme_hue ?? null,
      has_ai_key:
        settings?.encrypted_ai_key != null && settings.encrypted_ai_key !== '',
    })
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.post(
  '/api/ai-key/test',
  describeRoute({
    description: 'Validates an AI provider API key.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'OK - key is valid' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
    },
  }),
  sValidator('json', aiKeyTestSchema),
  async (c) => {
    const { provider, key } = c.req.valid('json')
    let apiKey = key

    if (!apiKey) {
      const settings = await c.env.DB.prepare(
        'SELECT encrypted_ai_key FROM user_settings WHERE user_id = ?'
      )
        .bind(c.get('userId'))
        .first<{ encrypted_ai_key: string | null }>()

      if (!settings?.encrypted_ai_key) {
        return c.json({ error: 'No API key saved' }, 400)
      }

      apiKey = await decryptAiKey(
        settings.encrypted_ai_key,
        c.env.WORKER_ENCRYPTION_KEY
      )
    }

    try {
      switch (provider) {
        case 'gemini': {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
          )
          if (!res.ok) throw new Error()
          break
        }
        case 'anthropic': {
          const res = await fetch('https://api.anthropic.com/v1/models', {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
          })
          if (!res.ok) throw new Error()
          break
        }
        case 'openai': {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
          if (!res.ok) throw new Error()
          break
        }
        case 'opencode':
        default: {
          const res = await fetch('https://api.opencode.ai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
          if (!res.ok) throw new Error()
          break
        }
      }

      return c.json({ ok: true })
    } catch {
      return c.json({ error: 'Invalid API key' }, 400)
    }
  }
)

apiApp.get(
  '/api/ai/usage',
  describeRoute({
    description: 'Returns today AI usage for the current user.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'OK' },
      401: { description: 'Unauthorized' },
    },
  }),
  async (c) => {
    const userId = c.get('userId')
    const today = new Date().toISOString().slice(0, 10)

    const existing = await c.env.DB.prepare(
      'SELECT id, used, daily_limit, provider FROM ai_usage WHERE user_id = ? AND date = ?'
    )
      .bind(userId, today)
      .first<{
        id: string
        used: number
        daily_limit: number
        provider: string | null
      }>()

    if (!existing) {
      const settings = await c.env.DB.prepare(
        'SELECT ai_provider FROM user_settings WHERE user_id = ?'
      )
        .bind(userId)
        .first<{ ai_provider: string | null }>()

      const id = crypto.randomUUID()
      await c.env.DB.prepare(
        'INSERT INTO ai_usage (id, user_id, date, provider, used, daily_limit) VALUES (?, ?, ?, ?, 0, 20)'
      )
        .bind(id, userId, today, settings?.ai_provider || null)
        .run()

      const res = c.json({
        used: 0,
        daily_limit: 20,
        provider: settings?.ai_provider || null,
      })
      res.headers.set('Cache-Control', 'private, no-cache')
      return res
    }

    const res = c.json({
      used: existing.used,
      daily_limit: existing.daily_limit,
      provider: existing.provider,
    })
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.get(
  '/api/locations',
  describeRoute({
    description: 'Lists locations for the active household.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'OK' },
      401: { description: 'Unauthorized' },
    },
  }),
  async (c) => {
    const { results } = await c.env.DB.prepare(
      'SELECT id, label, sort_order FROM locations WHERE household_id = ? ORDER BY sort_order, label'
    )
      .bind(c.get('householdId'))
      .all()
    const res = c.json({ locations: results })
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.post(
  '/api/locations',
  describeRoute({
    description: 'Creates a new location for the active household.',
    security: [{ cookieAuth: [] }],
    responses: {
      201: { description: 'Created' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
    },
  }),
  sValidator('json', locationSchema),
  async (c) => {
    const { label } = c.req.valid('json')

    const id = crypto.randomUUID()
    const sortOrder = await c.env.DB.prepare(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM locations WHERE household_id = ?'
    )
      .bind(c.get('householdId'))
      .first<{ next: number }>()

    await c.env.DB.prepare(
      'INSERT INTO locations (id, household_id, label, sort_order) VALUES (?, ?, ?, ?)'
    )
      .bind(id, c.get('householdId'), label, sortOrder?.next ?? 1)
      .run()

    const created = await c.env.DB.prepare(
      'SELECT id, label, sort_order FROM locations WHERE id = ?'
    )
      .bind(id)
      .first()

    const res = c.json({ location: created }, 201)
    return res
  }
)

apiApp.delete(
  '/api/locations/:id',
  describeRoute({
    description: 'Deletes a location if not referenced by stock.',
    security: [{ cookieAuth: [] }],
    responses: {
      204: { description: 'Deleted' },
      404: { description: 'Not found' },
      409: { description: 'Conflict - location in use' },
    },
  }),
  async (c) => {
    const locationId = c.req.param('id')

    const location = await c.env.DB.prepare(
      'SELECT id FROM locations WHERE id = ? AND household_id = ?'
    )
      .bind(locationId, c.get('householdId'))
      .first()

    if (!location) {
      return c.json({ error: 'Location not found' }, 404)
    }

    const stockRef = await c.env.DB.prepare(
      'SELECT COUNT(*) AS cnt FROM stock WHERE location_id = ?'
    )
      .bind(locationId)
      .first<{ cnt: number }>()

    if (stockRef && stockRef.cnt > 0) {
      return c.json(
        { error: 'Cannot delete location because it is used by stock items' },
        409
      )
    }

    await c.env.DB.prepare('DELETE FROM locations WHERE id = ?')
      .bind(locationId)
      .run()

    return c.newResponse(null, 204)
  }
)

apiApp.get(
  '/api/stores',
  describeRoute({
    description: 'Lists stores for the active household.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'OK' },
      401: { description: 'Unauthorized' },
    },
  }),
  async (c) => {
    const { results } = await c.env.DB.prepare(
      'SELECT id, label FROM stores WHERE household_id = ? ORDER BY label'
    )
      .bind(c.get('householdId'))
      .all()
    const res = c.json({ stores: results })
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.post(
  '/api/stores',
  describeRoute({
    description: 'Creates a new store for the active household.',
    security: [{ cookieAuth: [] }],
    responses: {
      201: { description: 'Created' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
    },
  }),
  sValidator('json', storeSchema),
  async (c) => {
    const { label } = c.req.valid('json')

    const id = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO stores (id, household_id, label) VALUES (?, ?, ?)'
    )
      .bind(id, c.get('householdId'), label)
      .run()

    const created = await c.env.DB.prepare(
      'SELECT id, label FROM stores WHERE id = ?'
    )
      .bind(id)
      .first()

    const res = c.json({ store: created }, 201)
    return res
  }
)

apiApp.delete(
  '/api/stores/:id',
  describeRoute({
    description: 'Deletes a store if not referenced by purchases or plans.',
    security: [{ cookieAuth: [] }],
    responses: {
      204: { description: 'Deleted' },
      404: { description: 'Not found' },
      409: { description: 'Conflict - store in use' },
    },
  }),
  async (c) => {
    const storeId = c.req.param('id')

    const store = await c.env.DB.prepare(
      'SELECT id FROM stores WHERE id = ? AND household_id = ?'
    )
      .bind(storeId, c.get('householdId'))
      .first()

    if (!store) {
      return c.json({ error: 'Store not found' }, 404)
    }

    const purchaseRef = await c.env.DB.prepare(
      'SELECT COUNT(*) AS cnt FROM purchases WHERE store_id = ?'
    )
      .bind(storeId)
      .first<{ cnt: number }>()

    if (purchaseRef && purchaseRef.cnt > 0) {
      return c.json(
        { error: 'Cannot delete store because it is used by purchases' },
        409
      )
    }

    const planRef = await c.env.DB.prepare(
      'SELECT COUNT(*) AS cnt FROM plan_items WHERE store_id = ?'
    )
      .bind(storeId)
      .first<{ cnt: number }>()

    if (planRef && planRef.cnt > 0) {
      return c.json(
        { error: 'Cannot delete store because it is used by plan items' },
        409
      )
    }

    await c.env.DB.prepare('DELETE FROM stores WHERE id = ?')
      .bind(storeId)
      .run()

    return c.newResponse(null, 204)
  }
)

apiApp.notFound(async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw)
  }
  return c.json({ error: 'Not found' }, 404)
})

export { apiApp }
