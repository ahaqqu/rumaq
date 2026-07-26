import { defineConfig } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "tests/local/e2e/features/*.feature",
  steps: "tests/local/e2e/steps/*.steps.js",
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  retries: 0,
  reporter: "html",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
