import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Env } from './index.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const COOKIE_NAME = 'rumaq_session'

const authApp = new Hono<Env>()

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array) {
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

async function signJwt(payload: object, secret: string) {
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
  const [h, p, s] = token.split('.')
  if (!h || !p || !s) return null
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const ok = await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')).split('').map((c) => c.charCodeAt(0))), encoder.encode(`${h}.${p}`))
  if (!ok) return null
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g, '+').replace(/_/g, '/')).split('').map((c) => c.charCodeAt(0)))))
}

function randomState() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)).buffer)
}

authApp.get('/login', async (c) => {
  const state = randomState()
  const verifier = randomState()
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/callback`

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
    code_challenge: verifier,
    code_challenge_method: 'plain',
  })

  return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)
})

authApp.get('/callback', async (c) => {
  const { code, state } = c.req.query()
  const cookie = getCookie(c, 'rumaq_oauth_state') || ''
  deleteCookie(c, 'rumaq_oauth_state')
  const [expectedState, verifier] = cookie.split(':')

  if (!code || !state || state !== expectedState) {
    return c.text('Invalid OAuth state', 400)
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
    return c.text('Failed to exchange OAuth code', 400)
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string }
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!userRes.ok) {
    return c.text('Failed to fetch user info', 400)
  }

  const googleUser = (await userRes.json()) as {
    sub: string
    email: string
    name?: string
    picture?: string
  }

  const userId = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, picture, google_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(google_id) DO UPDATE SET
       name = excluded.name,
       picture = excluded.picture,
       updated_at = datetime('now')`
  )
    .bind(userId, googleUser.email, googleUser.name || null, googleUser.picture || null, googleUser.sub)
    .run()

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE google_id = ?')
    .bind(googleUser.sub)
    .first<{ id: string }>()

  const finalUserId = existing?.id || userId

  // Ensure a default household exists for new users.
  const hasHousehold = await c.env.DB.prepare(
    'SELECT 1 FROM household_members WHERE user_id = ?'
  )
    .bind(finalUserId)
    .first()

  if (!hasHousehold) {
    const householdId = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO households (id, name, created_by) VALUES (?, ?, ?)')
      .bind(householdId, 'Rumahku', finalUserId)
      .run()
    await c.env.DB.prepare(
      'INSERT INTO household_members (household_id, user_id, role) VALUES (?, ?, ?)'
    )
      .bind(householdId, finalUserId, 'owner')
      .run()
    await c.env.DB.prepare(
      'INSERT INTO user_settings (id, user_id, active_household_id) VALUES (?, ?, ?)'
    )
      .bind(crypto.randomUUID(), finalUserId, householdId)
      .run()
  }

  const jwt = await signJwt(
    { sub: finalUserId, email: googleUser.email, iat: Date.now() },
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
