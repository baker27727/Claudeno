#!/usr/bin/env bash
# Manual deploy: build the site and rsync it to the Ubuntu server.
# Requires SSH key access already configured (see DEPLOY.md / ~/.ssh/config
# host alias). Does not embed any credentials.
#
# Usage: npm run deploy
set -euo pipefail

HOST="${DEPLOY_HOST:-claude-mutaz}"
REMOTE_PATH="${DEPLOY_PATH:-/var/www/claude.mutaz.no/}"

cd "$(dirname "$0")/.."

echo "==> Building site"
npm run build

echo "==> Syncing dist/ to ${HOST}:${REMOTE_PATH}"
rsync -az --delete dist/ "${HOST}:${REMOTE_PATH}"

echo "==> Done. Live at https://claude.mutaz.no"
