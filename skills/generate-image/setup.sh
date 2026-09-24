#!/usr/bin/env bash
# Idempotent setup/check for the generate-image skill.
# No npm dependencies: only verifies Node >= 18, the script syntax and the API key,
# then prints the current Leonardo balance. Safe to run repeatedly.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd -P )"
cd "${SCRIPT_DIR}"

echo "==> generate-image setup"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed. Install Node.js >= 18 first (e.g. brew install node)." >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "${NODE_MAJOR}" -lt 18 ]; then
  echo "ERROR: Node.js >= 18 is required (found $(node --version))." >&2
  exit 1
fi
echo "    node $(node --version) OK"

echo "==> Syntax check"
for f in generate.mjs lib/*.mjs; do node --check "$f"; done
echo "    OK"

echo "==> API key"
node generate.mjs --check-env

echo "==> Balance"
node generate.mjs --balance || echo "    (balance unavailable, see message above; generation still works)"

echo ""
echo "Setup complete. Try: node generate.mjs --explain \"a minimal flat icon of a paper plane\""
