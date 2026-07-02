/**
 * Test authentication helpers.
 *
 * Re-exports signJwt from the worker's auth module so test tokens match
 * production format exactly — no duplicated signing logic.
 *
 * Uses Web Crypto API (HMAC-SHA256) which is available in Node 20+.
 */

import { signJwt } from '../../worker/src/auth.ts'

const DEFAULT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret'

const DEFAULT_USER_ID =
  process.env.TEST_USER_ID || 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

/**
 * Sign a JWT and return a Cookie header string for use in fetch().
 *
 * @param {string} [userId] - Override the default test user ID
 * @param {object} [extra]  - Additional JWT payload fields (e.g. { email })
 * @param {string} [secret] - Override the default test JWT secret
 * @returns {string} Cookie header value, e.g. "rumaq_session=eyJ..."
 */
export function signTestCookie(userId, extra, secret) {
  const sub = userId || DEFAULT_USER_ID
  const jwtSecret = secret || DEFAULT_SECRET
  const iat = Date.now()
  const payload = {
    sub,
    iat,
    exp: iat + 30 * 24 * 60 * 60 * 1000, // 30 days
    ...extra,
  }

  // signJwt returns a Promise because it uses crypto.subtle
  return signJwt(payload, jwtSecret).then((token) => `rumaq_session=${token}`)
}

export { signJwt }
