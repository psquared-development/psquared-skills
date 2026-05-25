#!/usr/bin/env bash
# Idempotent setup script for the create-offer skill.
# Installs Node deps (Playwright) and the bundled Chromium browser.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "${SCRIPT_DIR}"

echo "==> create-offer setup"

# --- 1. Node check ----------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed. Install Node.js >= 18 first (e.g. via nvm or brew install node)." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "${NODE_MAJOR}" -lt 18 ]; then
  echo "ERROR: Node.js >= 18 is required (found $(node --version))." >&2
  exit 1
fi
echo "    node $(node --version) OK"

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed." >&2
  exit 1
fi
echo "    npm $(npm --version) OK"

# --- 2. Node deps -----------------------------------------------------------
if [ ! -d node_modules ] || [ ! -d node_modules/playwright ]; then
  echo "==> Installing npm dependencies..."
  npm install --no-audit --no-fund
else
  echo "==> npm dependencies already installed (delete node_modules/ to force reinstall)"
fi

# --- 3. Playwright Chromium -------------------------------------------------
# Always run install; Playwright's installer is itself idempotent (skips if cached).
echo "==> Ensuring Playwright Chromium is installed..."
npx --yes playwright install chromium

echo ""
echo "Setup complete."
echo "Try: node build.mjs examples/sanacom-example.json output.pdf"
