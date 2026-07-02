#!/usr/bin/env bash
# Verify a generated canvas-korrektur HTML: extract its inline <script>, syntax-check, and run it against
# a DOM stub so a render error doesn't ship as a blank page.
# Usage: scripts/verify_html.sh <file.html>
set -uo pipefail
F="${1:?usage: verify_html.sh <file.html>}"
DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp /tmp/pf_html_XXXXXX)"; mv "$TMP" "$TMP.js"; TMP="$TMP.js"
# anchor to line-start tags so a <script> mention inside an HTML comment isn't captured
awk '/^<script>/{flag=1;next}/^<\/script>/{flag=0}flag' "$F" > "$TMP"
node --check "$TMP" || { echo "SYNTAX ERROR (likely a stray ASCII \" inside a German-quoted string — use ' or the curly “ closing quote)"; exit 1; }
node -e "require('$DIR/stub.js'); require('$TMP'); const n=document.getElementById('app').children.length; if(!n){console.error('RENDER ERROR: app empty'); process.exit(1);} console.log('OK — sections:', n);"
rm -f "$TMP"
