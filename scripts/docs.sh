#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"
npx tsx scripts/docs/generate-api-docs.ts
npx prettier --write docs/API.md > /dev/null
