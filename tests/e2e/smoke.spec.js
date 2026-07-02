import { test, expect } from '@playwright/test'

test.describe('App shell smoke test', () => {
  test('loads the main page and renders the dashboard', async ({ page }) => {
    await page.goto('/')

    // Page should have loaded with a title
    const title = await page.title()
    expect(title).toBeTruthy()

    // The root element should be mounted
    const root = page.locator('#root')
    await expect(root).toBeAttached()

    // App shell should be visible — check for navigation elements
    // The app renders a grid layout with a topbar and content area
    await expect(page.locator('header, nav, [role="banner"]')).toBeVisible({
      timeout: 5_000,
    })

    // Home/dashboard content should show at least one heading
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({
      timeout: 5_000,
    })
  })
})
