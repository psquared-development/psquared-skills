#!/usr/bin/env bash
# Fetch ONE process (canvas + scoring + Lösungskonzept) into <out_dir>/raw/ as pretty JSON.
# Requires env: PF_BASE, PF_APIKEY, PF_TOKEN  (source your per-company processflow-auth.env first)
# Usage: source processflow-auth.env && scripts/fetch_process.sh <process_id> <out_dir>
set -uo pipefail
PID="${1:?usage: fetch_process.sh <process_id> <out_dir>}"
OUTDIR="${2:?usage: fetch_process.sh <process_id> <out_dir>}"
: "${PF_BASE:?}" "${PF_APIKEY:?}" "${PF_TOKEN:?}"
OUT="$OUTDIR/raw"; mkdir -p "$OUT"
hdr=(-H "apikey: $PF_APIKEY" -H "authorization: Bearer $PF_TOKEN" -H "accept-profile: public" -H "accept: application/json")

fetch () {
  local tbl="$1" filt="$2" file="$3" code
  code=$(curl -s -o "$OUT/.tmp" -w "%{http_code}" "${hdr[@]}" "$PF_BASE/$tbl?select=*&$filt")
  if [ "$code" = "401" ]; then echo "[401] $tbl — token expired; refresh PF_TOKEN."; rm -f "$OUT/.tmp"; return 1; fi
  python3 -c "import json,sys; d=json.load(open('$OUT/.tmp')); json.dump(d,open('$OUT/$file','w'),ensure_ascii=False,indent=2); print(f'[$code] $tbl -> $file (rows: {len(d) if isinstance(d,list) else \"obj\"})')"
  rm -f "$OUT/.tmp"
}
fetch processes                "id=eq.$PID"         process.json
fetch process_scores           "process_id=eq.$PID" scores.json
fetch process_analysis_reports "process_id=eq.$PID" report.json
echo "saved to $OUT"
