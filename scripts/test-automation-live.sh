#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

# Cucumber API health tests
npx cucumber-js \
  "automation/tests/live/**/*.feature" \
  --import "automation/tests/live/**/*.steps.js" \
  --format summary

# Playwright E2E login/logout
npx playwright test --config automation/playwright.live.config.js
