import type { Env } from './types.js'
import { authApp } from './apps/auth.js'
import { apiApp } from './apps/api.js'

const AUTH_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
  '/api/auth/email-login',
])

export default {
  async fetch(request: Request, env: Env['Bindings'], ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (path.startsWith('/api/')) {
      if (AUTH_ROUTES.has(path)) {
        const adjustedUrl = new URL(request.url)
        adjustedUrl.pathname = path.replace(/^\/api\/auth/, '')
        const adjustedRequest = new Request(adjustedUrl.toString(), request)
        return authApp.fetch(adjustedRequest, env, ctx)
      }

      try {
        if (ctx.exports?.CachedApi) {
          return ctx.exports.CachedApi.fetch(request, env)
        }
      } catch {
        // ctx.exports not available (Miniflare / test mode)
      }
      return apiApp.fetch(request, env, ctx)
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


