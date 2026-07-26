import { cors } from 'hono/cors'
import type { Env } from './types.js'

export function createCors() {
  return cors({
    origin: (origin, c) => {
      if (!origin) return 'null'
      const env = c.env as Env['Bindings']
      const allowed = env.PAGES_ORIGIN || 'https://rumaq.pages.dev'

      if (origin === allowed || origin === 'http://localhost:5173') {
        return origin
      }

      if (origin.endsWith('.pages.dev')) {
        const allowedHost = new URL(allowed).hostname
        if (origin.endsWith('.' + allowedHost)) {
          return origin
        }
      }

      return allowed
    },
    credentials: true,
  })
}
