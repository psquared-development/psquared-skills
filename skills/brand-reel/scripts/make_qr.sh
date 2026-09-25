#!/usr/bin/env bash
# Usage: make_qr.sh URL out_dir   -> qr.json (matrix for reel.html) + checks it decodes
set -euo pipefail
URL="$1"; OUT="$2"; VENV="${TMPDIR:-/tmp}/qrenv"
[ -x "$VENV/bin/python" ] || { /usr/bin/python3 -m venv "$VENV"; "$VENV/bin/pip" -q install segno; }
"$VENV/bin/python" - "$URL" "$OUT" <<'PY'
import segno, json, sys
q = segno.make(sys.argv[1], error='h', micro=False)
json.dump([[1 if c else 0 for c in r] for r in q.matrix], open(sys.argv[2] + '/qr.json', 'w'))
print('QR version', q.version, 'size', len(q.matrix))
PY
