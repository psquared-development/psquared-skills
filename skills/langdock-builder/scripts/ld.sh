#!/usr/bin/env bash
# Langdock API helper. Key comes from the macOS keychain, never from args/env files.
#   ld.sh GET  /workflows/v1/list
#   ld.sh GET  "/workflows/v1/get?workflowId=<id>"
#   ld.sh POST /agent/v1/update @body.json        (or inline JSON)
#   LANGDOCK_KEYCHAIN=langdock-<client> LANGDOCK_BASE=https://<domain>/api/public ld.sh GET /agent/v1/models
set -euo pipefail
method=${1:?method}; path=${2:?path}; body=${3:-}
svc=${LANGDOCK_KEYCHAIN:-langdock-api-key}
base=${LANGDOCK_BASE:-https://api.langdock.com}
key=$(security find-generic-password -s "$svc" -w) || { echo "no keychain entry '$svc'" >&2; exit 1; }
args=(-sS -X "$method" -H "Authorization: Bearer $key" -w '\n[HTTP %{http_code}]\n')
[ -n "$body" ] && args+=(-H 'Content-Type: application/json' --data-binary "$body")
curl "${args[@]}" "$base$path"
