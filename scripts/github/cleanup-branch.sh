#!/usr/bin/env bash
set -euo pipefail

# Clean up Cloudflare resources created for a feature branch preview.
# Usage: cleanup-branch.sh <branch-name>

BRANCH_NAME="${1:-}"
if [[ -z $BRANCH_NAME ]]; then
  echo "Error: branch name required"
  echo "Usage: $0 <branch-name>"
  exit 1
fi

SANITIZED=$(echo "$BRANCH_NAME" | sed 's/[^a-zA-Z0-9-]/-/g')
WORKER_NAME="rumaq-api-${SANITIZED}"

echo "==> Cleaning up branch: ${BRANCH_NAME}"
echo "    Worker: ${WORKER_NAME}"

# Delete the branch-specific Worker
if npx wrangler delete --name "$WORKER_NAME" 2> /dev/null; then
  echo "  ok  Deleted Worker: ${WORKER_NAME}"
else
  echo "  -   Worker ${WORKER_NAME} not found or already deleted"
fi

echo "==> Cleanup complete"
