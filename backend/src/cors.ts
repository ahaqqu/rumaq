import { cors } from 'hono/cors'
import type { Env } from './types.js'

export function createCors() {
  return cors({
    origin: (origin, c) => {
      const env = c.env as Env['Bindings']
      const allowed = env.PAGES_ORIGIN || 'https://rumaq.pages.dev'
      return origin === allowed || origin === 'http://localhost:5173'
        ? origin
        : allowed
    },
    credentials: true,
  })
}
