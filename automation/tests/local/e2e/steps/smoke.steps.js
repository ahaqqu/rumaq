import pkg from 'playwright-bdd'
import { expect } from '@playwright/test'
const { createBdd, test } = pkg

const { Given, Then } = createBdd(test)

Given('I visit the app', async ({ page }) => {
  await page.goto('/')
})

Then('the page should have a title', async ({ page }) => {
  const title = await page.title()
  expect(title).toBeTruthy()
})

Then('the root element should be mounted', async ({ page }) => {
  const root = page.locator('#root')
  await expect(root).toBeAttached()
})

Then('the topbar should be visible', async ({ page }) => {
  await expect(page.locator('header.topbar')).toBeVisible({ timeout: 5_000 })
})

Then('a heading should be visible', async ({ page }) => {
  await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 5_000 })
})
