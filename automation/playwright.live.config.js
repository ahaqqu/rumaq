import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/live",
  fullyParallel: false,
  retries: 0,
  reporter: "html",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
