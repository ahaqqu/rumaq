import type { Env } from './types.js'
import { verifyJwt } from './auth.js'
import { createCors } from './cors.js'
import { authApp } from './apps/auth.js'
import { apiApp } from './apps/api.js'

const AUTH_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
  '/api/auth/email-login',
])

function getSessionToken(request: Request): string | undefined {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return undefined
  const cookie = cookieHeader.split(';').find(c => c.trim().startsWith('rumaq_session='))
  if (!cookie) return undefined
  return cookie.split('=')[1]
}

export default {
  async fetch(request: Request, env: Env['Bindings'], ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (request.method === 'OPTIONS') {
      return handleOptions(request, env)
    }

    if (path.startsWith('/api/')) {
      if (AUTH_ROUTES.has(path)) {
        const adjustedUrl = new URL(request.url)
        adjustedUrl.pathname = path.replace(/^\/api\/auth/, '')
        const adjustedRequest = new Request(adjustedUrl.toString(), request)
        return authApp.fetch(adjustedRequest, env, ctx)
      }

      let props: { userId: string; householdId: string } | undefined
      const token = getSessionToken(request)
      if (token) {
        const payload = await verifyJwt(token, env.WORKER_JWT_SECRET)
        if (payload && typeof payload.sub === 'string') {
          const user = await env.DB.prepare(
            'SELECT active_household_id FROM user_settings WHERE user_id = ?'
          ).bind(payload.sub).first<{ active_household_id: string | null }>()

          const householdId =
            user?.active_household_id ||
            (await env.DB.prepare(
              'SELECT household_id FROM household_members WHERE user_id = ? LIMIT 1'
            ).bind(payload.sub).first<{ household_id: string }>())?.household_id

          if (householdId) {
            props = { userId: payload.sub, householdId }
          }
        }
      }

      const cachedEnv = props ? { ...env, props } : env
      try {
        if (ctx.exports?.CachedApi) {
          return ctx.exports.CachedApi.fetch(request, cachedEnv)
        }
      } catch {
        // ctx.exports not available (Miniflare / test mode)
      }
      return apiApp.fetch(request, cachedEnv, ctx)
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}

async function handleOptions(request: Request, env: Env['Bindings']): Promise<Response> {
  const corsMiddleware = createCors()
  const stub = new Request(request.url, { method: 'GET', headers: request.headers })
  const response = await corsMiddleware(
    { req: { raw: stub }, env, res: new Response(null, { status: 204 }) } as any,
    async () => {}
  )
  return new Response(null, { status: 204, headers: response.headers })
}
