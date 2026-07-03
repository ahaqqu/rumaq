import { Given, When, Then, Before } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'

/** @type {{ base: string|null, cookie: string|null, response: Response|null, body: any }} */
const ctx = {}

Before(function () {
  ctx.base = null
  ctx.cookie = null
  ctx.response = null
  ctx.body = null
})

Given(/^the production site is at (\S+)$/, (url) => {
  ctx.base = url
})

Given(/^I have a valid session cookie$/, function () {
  ctx.cookie = process.env.RUMAQ_PROD_SESSION
})

Before({ tags: '@needs-session' }, function () {
  if (!process.env.RUMAQ_PROD_SESSION) {
    return 'skipped'
  }
})

When(/^I GET (\S+)$/, async (path) => {
  const opts = {}
  if (ctx.cookie) {
    opts.headers = { cookie: `rumaq_session=${ctx.cookie}` }
  }
  ctx.response = await fetch(`${ctx.base}${path}`, opts)
  try {
    ctx.body = await ctx.response.json()
  } catch {
    ctx.body = null
  }
})

Then(/^the response status should be (\d+)$/, (expected) => {
  assert.equal(ctx.response.status, parseInt(expected))
})

Then(/^the body should contain ok$/, () => {
  assert.equal(ctx.body.ok, true)
})

Then(/^the body should contain a user object$/, () => {
  assert.ok(ctx.body.user, 'Missing user in /api/me response')
})

Then(/^the body should contain a stock array$/, () => {
  assert.ok(Array.isArray(ctx.body?.stock), 'Missing stock array in /api/stock response')
})
