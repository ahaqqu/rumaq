import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Env } from './index.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const COOKIE_NAME = 'rumaq_session'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const authApp = new Hono<Env>()

export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function base64UrlDecode(str: string): ArrayBuffer {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)).buffer as ArrayBuffer
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
}

export async function signJwt(payload: Record<string, unknown>, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const header = { alg: 'HS256', typ: 'JWT' }
  const body = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${base64UrlEncode(
    encoder.encode(JSON.stringify(payload))
  )}`
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return `${body}.${base64UrlEncode(sig)}`
}

export async function verifyJwt(token: string, secret: string) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecode(s),
    encoder.encode(`${h}.${p}`)
  )
  if (!ok) return null

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(p)))

  // Check expiration
  if (payload.exp && typeof payload.exp === 'number' && Date.now() > payload.exp) {
    return null
  }

  return payload
}

export function randomState() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)).buffer)
}

authApp.get('/login', async (c) => {
  const state = randomState()
  const verifier = randomState()
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/callback`
  const challenge = base64UrlEncode(await sha256(verifier))

  setCookie(c, 'rumaq_oauth_state', `${state}:${verifier}`, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 600,
  })

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)
})

authApp.get('/callback', async (c) => {
  const { code, state } = c.req.query()
  const cookie = getCookie(c, 'rumaq_oauth_state') || ''
  deleteCookie(c, 'rumaq_oauth_state')
  const [expectedState, verifier] = cookie.split(':')

  if (!code || !state || state !== expectedState) {
    return c.json({ error: 'Invalid OAuth state' }, 400)
  }

  const redirectUri = `${new URL(c.req.url).origin}/api/auth/callback`
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  })

  if (!tokenRes.ok) {
    return c.json({ error: 'Failed to exchange OAuth code' }, 400)
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string }
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!userRes.ok) {
    return c.json({ error: 'Failed to fetch user info' }, 400)
  }

  const googleUser = (await userRes.json()) as {
    sub: string
    email: string
    name?: string
    picture?: string
  }

  const finalUserId = crypto.randomUUID()
  const householdId = crypto.randomUUID()
  const settingsId = crypto.randomUUID()
  const now = new Date().toISOString()

  // Upsert user first, then set up household + settings in a batch.
  const userStmt = c.env.DB.prepare(
    `INSERT INTO users (id, email, name, picture, google_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(google_id) DO UPDATE SET
       name = excluded.name,
       picture = excluded.picture,
       updated_at = datetime('now')`
  ).bind(finalUserId, googleUser.email, googleUser.name || null, googleUser.picture || null, googleUser.sub)

  // Fetch the actual id for this google_id (handles existing users)
  const lookupStmt = c.env.DB.prepare('SELECT id FROM users WHERE google_id = ?').bind(googleUser.sub)

  const batchResults = await c.env.DB.batch([userStmt, lookupStmt])
  const rows = batchResults[1]?.results as { id?: string }[] | undefined
  const actualUserId = rows?.[0]?.id || finalUserId

  // Check if this user already has a household
  const existingMember = await c.env.DB.prepare(
    'SELECT 1 FROM household_members WHERE user_id = ?'
  ).bind(actualUserId).first()

  if (!existingMember) {
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO households (id, name, created_by) VALUES (?, ?, ?)')
        .bind(householdId, 'Rumahku', actualUserId),
      c.env.DB.prepare(
        'INSERT INTO household_members (household_id, user_id, role) VALUES (?, ?, ?)'
      ).bind(householdId, actualUserId, 'owner'),
      c.env.DB.prepare(
        'INSERT INTO user_settings (id, user_id, active_household_id) VALUES (?, ?, ?)'
      ).bind(settingsId, actualUserId, householdId),
    ])
  }

  const iat = Date.now()
  const jwt = await signJwt(
    { sub: actualUserId, email: googleUser.email, iat, exp: iat + SESSION_DURATION_MS },
    c.env.WORKER_JWT_SECRET
  )

  setCookie(c, COOKIE_NAME, jwt, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30,
  })

  return c.redirect('/')
})

authApp.post('/logout', (c) => {
  deleteCookie(c, COOKIE_NAME)
  return c.json({ ok: true })
})

export { authApp }
