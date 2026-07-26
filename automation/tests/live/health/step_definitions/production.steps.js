import { Given, When, Then, Before } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { ctx } from "./context.js";

Before(function () {
  ctx.base = null;
  ctx.apiBase = null;
  ctx.cookie = null;
  ctx.response = null;
  ctx.body = null;
});

Given(/^the production site is at (\S+)$/, (url) => {
  ctx.base = url;
});

Given(/^the API is at (\S+)$/, (url) => {
  ctx.apiBase = url;
});

Given(/^I have a valid session cookie$/, function () {
  ctx.cookie = process.env.RUMAQ_PROD_SESSION;
});

Before({ tags: "@needs-session" }, function () {
  if (!process.env.RUMAQ_PROD_SESSION) {
    return "skipped";
  }
});

When(/^I GET (\S+)$/, async (path) => {
  const opts = {};
  if (ctx.cookie) {
    opts.headers = { cookie: `rumaq_session=${ctx.cookie}` };
  }
  const origin = path.startsWith("/api/") && ctx.apiBase ? ctx.apiBase : ctx.base;
  ctx.response = await fetch(`${origin}${path}`, opts);
  try {
    ctx.body = await ctx.response.json();
  } catch {
    ctx.body = null;
  }
});

Then(/^the response status should be (\d+)$/, (expected) => {
  assert.equal(ctx.response.status, parseInt(expected));
});

Then(/^the body should contain ok$/, () => {
  assert.equal(ctx.body.ok, true);
});

Then(/^the body should contain a user object$/, () => {
  assert.ok(ctx.body.user, "Missing user in /api/me response");
});

Then(/^the body should contain a stock array$/, () => {
  assert.ok(Array.isArray(ctx.body?.stock), "Missing stock array in /api/stock response");
});
