import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import { ctx } from './context.js'

function extractCookie(res) {
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) return null
  const match = setCookie.match(/rumaq_session=([^;]+)/)
  return match ? match[1] : null
}

Given(/^the API is at (\S+)$/, (url) => {
  ctx.apiBase = url
})

When(/^I login via email as "([^"]+)" with password "([^"]+)"$/, async (email, password) => {
  ctx.response = await fetch(`${ctx.apiBase || ctx.base}/api/auth/email-login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  try {
    ctx.body = await ctx.response.json()
  } catch {
    ctx.body = null
  }
})

Then(/^my session cookie should be stored$/, () => {
  ctx.cookie = extractCookie(ctx.response)
  assert.ok(ctx.cookie, 'No session cookie in response')
})

When(/^I logout$/, async () => {
  const opts = {}
  if (ctx.cookie) {
    opts.headers = { cookie: `rumaq_session=${ctx.cookie}` }
  }
  ctx.response = await fetch(`${ctx.apiBase || ctx.base}/api/auth/logout`, opts)
  ctx.cookie = extractCookie(ctx.response)
  try {
    ctx.body = await ctx.response.json()
  } catch {
    ctx.body = null
  }
})

Then(/^the user email should be "([^"]+)"$/, (expected) => {
  assert.equal(ctx.body?.user?.email, expected)
})

Then(/^the (ok|enabled) should be (true|false)$/, (key, expected) => {
  assert.equal(ctx.body?.[key], expected === 'true')
})
