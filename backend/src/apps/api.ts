import { Hono } from 'hono'
import { logger } from 'hono/logger'

import { sValidator } from '@hono/standard-validator'
import { openAPIRouteHandler, describeRoute } from 'hono-openapi'
import { object, string, optional } from 'valibot'
import type { Env } from '../types.js'
import { createCors } from '../cors.js'
import { propsAuthMiddleware } from '../auth.js'
import { encryptAiKey, decryptAiKey } from '../lib/crypto.js'
import { computeRunOutDays } from '../lib/stock.js'
import {
  validateImage,
  buildKey,
  uploadReceipt,
  getSignedUrl,
  extFromType,
} from '../lib/receipts.js'
import { extractReceiptItems } from '../lib/ai.js'
import {
  settingsPatchSchema,
  locationSchema,
  storeSchema,
  aiKeyTestSchema,
  stockPatchSchema,
  purchaseCreateSchema,
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
apiApp.use('/api/stock/:id', propsAuthMiddleware)
apiApp.use('/api/home', propsAuthMiddleware)
apiApp.use('/api/settings', propsAuthMiddleware)
apiApp.use('/api/ai/usage', propsAuthMiddleware)
apiApp.use('/api/locations', propsAuthMiddleware)
apiApp.use('/api/locations/:id', propsAuthMiddleware)
apiApp.use('/api/stores', propsAuthMiddleware)
apiApp.use('/api/stores/:id', propsAuthMiddleware)
apiApp.use('/api/purchases', propsAuthMiddleware)
apiApp.use('/api/purchases/scan', propsAuthMiddleware)
apiApp.use('/api/purchases/:id/receipt', propsAuthMiddleware)

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

apiApp.patch(
  '/api/stock/:id',
  describeRoute({
    description: 'Updates a stock item.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'OK' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
      404: { description: 'Not found' },
    },
  }),
  sValidator('json', stockPatchSchema),
  async (c) => {
    const stockId = c.req.param('id')
    const householdId = c.get('householdId')
    const body = c.req.valid('json')

    const stockRow = await c.env.DB.prepare(
      'SELECT s.*, i.name AS item_name FROM stock s JOIN items i ON i.id = s.item_id WHERE s.id = ? AND s.household_id = ?'
    )
      .bind(stockId, householdId)
      .first<{
        id: string
        item_id: string
        qty: number
        unit: string | null
        location_id: string | null
        expiry_date: string | null
        item_name: string
      }>()

    if (!stockRow) {
      return c.json({ error: 'Stock item not found' }, 404)
    }

    if (body.location_id !== undefined) {
      const loc = await c.env.DB.prepare(
        'SELECT id FROM locations WHERE id = ? AND household_id = ?'
      )
        .bind(body.location_id, householdId)
        .first()
      if (!loc) {
        return c.json({ error: 'Location not found in this household' }, 400)
      }
    }

    let itemId = stockRow.item_id
    if (body.name !== undefined) {
      const trimmed = body.name.trim()
      if (trimmed.length > 0) {
        const existing = await c.env.DB.prepare(
          'SELECT id FROM items WHERE household_id = ? AND LOWER(name) = LOWER(?)'
        )
          .bind(householdId, trimmed)
          .first<{ id: string }>()

        if (existing) {
          itemId = existing.id
        } else {
          itemId = crypto.randomUUID()
          await c.env.DB.prepare(
            'INSERT INTO items (id, household_id, name) VALUES (?, ?, ?)'
          )
            .bind(itemId, householdId, trimmed)
            .run()
        }
      }
    }

    const updates: string[] = []
    const params: unknown[] = []

    if (body.qty !== undefined) {
      updates.push('qty = ?')
      params.push(body.qty)
    }
    if (body.unit !== undefined) {
      updates.push('unit = ?')
      params.push(body.unit)
    }
    if (body.location_id !== undefined) {
      updates.push('location_id = ?')
      params.push(body.location_id)
    }
    if (body.expiry_date !== undefined) {
      updates.push('expiry_date = ?')
      params.push(body.expiry_date)
    }
    if (body.name !== undefined) {
      updates.push('item_id = ?')
      params.push(itemId)
    }

    const finalQty = body.qty ?? stockRow.qty
    const runOut = await computeRunOutDays(
      householdId,
      itemId,
      finalQty,
      c.env.DB
    )
    updates.push('run_out_days = ?', 'basis = ?')
    params.push(runOut.run_out_days, runOut.basis)

    params.push(stockId)
    await c.env.DB.prepare(
      `UPDATE stock SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(...params)
      .run()

    const updated = await c.env.DB.prepare(
      `SELECT s.id, i.name, s.qty, s.unit, s.expiry_date, s.run_out_days, s.basis, l.label AS location
       FROM stock s
       JOIN items i ON i.id = s.item_id
       LEFT JOIN locations l ON l.id = s.location_id
       WHERE s.id = ?`
    )
      .bind(stockId)
      .first()

    const res = c.json({ stock: updated })
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.get(
  '/api/home',
  describeRoute({
    description: 'Home dashboard stats for the active household.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'OK' },
      401: { description: 'Unauthorized' },
    },
  }),
  async (c) => {
    const householdId = c.get('householdId')

    const totalResult = await c.env.DB.prepare(
      'SELECT COUNT(*) AS cnt FROM stock WHERE household_id = ? AND qty > 0'
    )
      .bind(householdId)
      .first<{ cnt: number }>()
    const totalItems = totalResult?.cnt ?? 0

    const today = new Date().toISOString().slice(0, 10)

    const expiringResult = await c.env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM stock
       WHERE household_id = ? AND qty > 0 AND expiry_date IS NOT NULL
       AND expiry_date >= ? AND expiry_date <= date(?, '+7 days')`
    )
      .bind(householdId, today, today)
      .first<{ cnt: number }>()
    const expiring7d = expiringResult?.cnt ?? 0

    const runningOutResult = await c.env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM stock
       WHERE household_id = ? AND qty > 0
       AND COALESCE(run_out_days, 999) <= 7`
    )
      .bind(householdId)
      .first<{ cnt: number }>()
    const runningOut7d = runningOutResult?.cnt ?? 0

    const lowStock = await c.env.DB.prepare(
      `SELECT s.id, i.name, s.qty, s.unit, s.expiry_date, s.run_out_days, s.basis, l.label AS location
       FROM stock s
       JOIN items i ON i.id = s.item_id
       LEFT JOIN locations l ON l.id = s.location_id
       WHERE s.household_id = ? AND s.qty > 0
       AND (COALESCE(s.run_out_days, 999) <= 7
         OR (s.expiry_date IS NOT NULL AND s.expiry_date <= date(?, '+7 days')))
       ORDER BY COALESCE(s.run_out_days, 999), s.expiry_date
       LIMIT 20`
    )
      .bind(householdId, today)
      .all()

    const res = c.json({
      total_items: totalItems,
      expiring_7d: expiring7d,
      running_out_7d: runningOut7d,
      low_stock: lowStock.results ?? [],
      expiring_soon: [],
      next_trip: null,
    })
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

apiApp.post(
  '/api/purchases/scan',
  describeRoute({
    description:
      'Upload a receipt image, scan with AI OCR, return parsed items.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'Scan complete' },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      402: { description: 'AI key not configured' },
      429: { description: 'AI usage limit exceeded' },
    },
  }),
  async (c) => {
    const userId = c.get('userId')
    const householdId = c.get('householdId')

    const contentType = c.req.header('Content-Type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return c.json({ error: 'Expected multipart/form-data' }, 400)
    }

    let file: { name: string; data: ArrayBuffer; type: string } | undefined
    try {
      const formData = await c.req.parseBody()
      const uploaded = formData['image']
      if (
        uploaded &&
        typeof uploaded !== 'string' &&
        'arrayBuffer' in uploaded
      ) {
        file = {
          name: uploaded.name,
          data: await uploaded.arrayBuffer(),
          type: uploaded.type,
        }
      }
    } catch {
      return c.json({ error: 'Failed to parse upload' }, 400)
    }

    if (!file) {
      return c.json(
        { error: 'No image file provided. Use field name "image".' },
        400
      )
    }

    const fileObj = { type: file.type, size: file.data.byteLength }
    const validationError = validateImage(fileObj)
    if (validationError) {
      return c.json({ error: validationError }, 400)
    }

    const settings = await c.env.DB.prepare(
      `SELECT ai_provider, encrypted_ai_key FROM user_settings WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ ai_provider: string | null; encrypted_ai_key: string | null }>()

    if (!settings?.ai_provider || !settings?.encrypted_ai_key) {
      return c.json(
        {
          error:
            'AI provider not configured. Go to Settings to set up your AI key.',
        },
        402
      )
    }

    const aiKey = await decryptAiKey(
      settings.encrypted_ai_key,
      c.env.WORKER_ENCRYPTION_KEY
    )

    const today = new Date().toISOString().slice(0, 10)
    let usageRow = await c.env.DB.prepare(
      'SELECT id, used, daily_limit FROM ai_usage WHERE user_id = ? AND date = ?'
    )
      .bind(userId, today)
      .first<{ id: string; used: number; daily_limit: number }>()

    if (!usageRow) {
      const id = crypto.randomUUID()
      await c.env.DB.prepare(
        'INSERT INTO ai_usage (id, user_id, date, provider, used, daily_limit) VALUES (?, ?, ?, ?, 0, 20)'
      )
        .bind(id, userId, today, settings.ai_provider)
        .run()
      usageRow = { id, used: 0, daily_limit: 20 }
    }

    if (usageRow.used >= usageRow.daily_limit) {
      return c.json(
        {
          error:
            'AI usage limit reached for today. Upgrade or wait until tomorrow.',
        },
        429
      )
    }

    const ext = extFromType(file.type)
    const key = buildKey(householdId, userId, ext)

    try {
      await uploadReceipt(c.env.RECEIPTS, file.data, key, file.type)
    } catch {
      return c.json({ error: 'Failed to upload receipt image' }, 500)
    }

    let scanResult
    try {
      scanResult = await extractReceiptItems(
        file.data,
        file.type,
        settings.ai_provider,
        aiKey
      )
    } catch (err) {
      return c.json(
        {
          error: `AI scan failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          imageKey: key,
        },
        502
      )
    }

    await c.env.DB.prepare('UPDATE ai_usage SET used = used + 1 WHERE id = ?')
      .bind(usageRow.id)
      .run()

    const imageUrl: string | null = getSignedUrl()

    let storeGuess: { id: string; label: string } | null = null
    if (scanResult.store_name) {
      const match = await c.env.DB.prepare(
        'SELECT id, label FROM stores WHERE household_id = ? AND LOWER(label) = LOWER(?)'
      )
        .bind(householdId, scanResult.store_name)
        .first<{ id: string; label: string }>()
      if (match) {
        storeGuess = match
      }
    }

    const res = c.json({
      items: scanResult.items,
      imageKey: key,
      imageUrl,
      storeGuess,
      dateGuess: scanResult.date || null,
    })
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.post(
  '/api/purchases',
  describeRoute({
    description:
      'Create a purchase with items, updating stock and purchase history.',
    security: [{ cookieAuth: [] }],
    responses: {
      201: { description: 'Purchase created' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
    },
  }),
  sValidator('json', purchaseCreateSchema),
  async (c) => {
    const userId = c.get('userId')
    const householdId = c.get('householdId')
    const body = c.req.valid('json')

    if (body.store_id) {
      const store = await c.env.DB.prepare(
        'SELECT id FROM stores WHERE id = ? AND household_id = ?'
      )
        .bind(body.store_id, householdId)
        .first()
      if (!store) {
        return c.json({ error: 'Store not found in this household' }, 400)
      }
    }

    const defaultLocation = await c.env.DB.prepare(
      'SELECT id FROM locations WHERE household_id = ? ORDER BY sort_order LIMIT 1'
    )
      .bind(householdId)
      .first<{ id: string }>()

    const purchaseId = crypto.randomUUID()
    const now = new Date().toISOString()

    const statements: D1PreparedStatement[] = []

    statements.push(
      c.env.DB.prepare(
        'INSERT INTO purchases (id, household_id, store_id, date, receipt_image_key, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        purchaseId,
        householdId,
        body.store_id || null,
        body.date,
        body.receipt_image_key || null,
        now
      )
    )

    const itemIds: string[] = []

    for (const item of body.items) {
      let itemId = item.item_id || null

      if (!itemId) {
        const trimmed = item.name.trim().toLowerCase()
        const existing = await c.env.DB.prepare(
          'SELECT id FROM items WHERE household_id = ? AND LOWER(name) = LOWER(?)'
        )
          .bind(householdId, trimmed)
          .first<{ id: string }>()

        if (existing) {
          itemId = existing.id
        } else {
          itemId = crypto.randomUUID()
          statements.push(
            c.env.DB.prepare(
              'INSERT INTO items (id, household_id, name, default_unit) VALUES (?, ?, ?, ?)'
            ).bind(itemId, householdId, item.name.trim(), item.unit)
          )
        }
      }

      itemIds.push(itemId)

      const purchaseItemId = crypto.randomUUID()
      statements.push(
        c.env.DB.prepare(
          'INSERT INTO purchase_items (id, purchase_id, item_id, qty, unit, price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          purchaseItemId,
          purchaseId,
          itemId,
          item.qty,
          item.unit,
          item.price,
          now
        )
      )

      const existingStock = await c.env.DB.prepare(
        'SELECT id, qty FROM stock WHERE household_id = ? AND item_id = ?'
      )
        .bind(householdId, itemId)
        .first<{ id: string; qty: number }>()

      if (existingStock) {
        const newQty = existingStock.qty + item.qty
        const runOut = await computeRunOutDays(
          householdId,
          itemId,
          newQty,
          c.env.DB
        )
        statements.push(
          c.env.DB.prepare(
            `UPDATE stock SET qty = ?, run_out_days = ?, basis = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(newQty, runOut.run_out_days, runOut.basis, existingStock.id)
        )
      } else {
        const stockId = crypto.randomUUID()
        const locationId = defaultLocation?.id || null
        statements.push(
          c.env.DB.prepare(
            'INSERT INTO stock (id, household_id, item_id, location_id, qty, unit, run_out_days, basis, updated_at) VALUES (?, ?, ?, ?, ?, ?, 30, ?, ?)'
          ).bind(
            stockId,
            householdId,
            itemId,
            locationId,
            item.qty,
            item.unit,
            'default',
            now
          )
        )
      }
    }

    try {
      await c.env.DB.batch(statements)
    } catch (err) {
      return c.json(
        {
          error: `Failed to create purchase: ${err instanceof Error ? err.message : 'Unknown'}`,
        },
        500
      )
    }

    const purchase = await c.env.DB.prepare(
      `SELECT p.id, p.store_id, s.label AS store_label, p.date, p.total, p.receipt_image_key, p.created_at
       FROM purchases p
       LEFT JOIN stores s ON s.id = p.store_id
       WHERE p.id = ?`
    )
      .bind(purchaseId)
      .first()

    const purchaseItems = await c.env.DB.prepare(
      `SELECT pi.id, pi.item_id, i.name, pi.qty, pi.unit, pi.price
       FROM purchase_items pi
       JOIN items i ON i.id = pi.item_id
       WHERE pi.purchase_id = ?`
    )
      .bind(purchaseId)
      .all()

    const updatedStock = await c.env.DB.prepare(
      `SELECT s.id, i.name, s.qty, s.unit, s.run_out_days, s.basis, l.label AS location
       FROM stock s
       JOIN items i ON i.id = s.item_id
       LEFT JOIN locations l ON l.id = s.location_id
       WHERE s.item_id IN (${itemIds.map(() => '?').join(',')}) AND s.household_id = ?`
    )
      .bind(...itemIds, householdId)
      .all()

    const res = c.json(
      {
        purchase,
        items: purchaseItems.results,
        stock: updatedStock.results,
      },
      201
    )
    res.headers.set('Cache-Control', 'private, no-cache')
    return res
  }
)

apiApp.get(
  '/api/purchases/:id/receipt',
  describeRoute({
    description: 'Stream a receipt image from R2.',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: 'Image stream' },
      401: { description: 'Unauthorized' },
      404: { description: 'Not found' },
    },
  }),
  async (c) => {
    const purchaseId = c.req.param('id')
    const householdId = c.get('householdId')

    const purchase = await c.env.DB.prepare(
      'SELECT receipt_image_key FROM purchases WHERE id = ? AND household_id = ?'
    )
      .bind(purchaseId, householdId)
      .first<{ receipt_image_key: string | null }>()

    if (!purchase || !purchase.receipt_image_key) {
      return c.json({ error: 'Receipt not found' }, 404)
    }

    const object = await c.env.RECEIPTS.get(purchase.receipt_image_key)
    if (!object) {
      return c.json({ error: 'Receipt image not found in storage' }, 404)
    }

    const headers = new Headers()
    headers.set(
      'Content-Type',
      object.httpMetadata?.contentType || 'image/jpeg'
    )
    headers.set('Cache-Control', 'private, no-cache')

    const body = await object.blob()
    return new Response(body, { headers })
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
