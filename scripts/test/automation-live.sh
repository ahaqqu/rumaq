#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$ROOT_DIR"

bunx playwright install chromium 2> /dev/null

bunx cucumber-js \
  "automation/tests/live/**/*.feature" \
  --import "automation/tests/live/**/*.steps.js" \
  --format summary

bunx playwright test --config automation/playwright.live.config.js
