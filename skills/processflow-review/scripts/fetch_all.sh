#!/usr/bin/env bash
# Bulk-fetch ALL processes of a project (canvas + scores + reports) via the 3 known tables.
# Requires env: PF_BASE, PF_PROJECT, PF_APIKEY, PF_TOKEN  (source your per-company processflow-auth.env first)
# Usage: source <company>/_tooling/processflow-auth.env && scripts/fetch_all.sh <out_dir>
set -uo pipefail
OUT="${1:?usage: fetch_all.sh <out_dir>}"; mkdir -p "$OUT"
: "${PF_BASE:?}" "${PF_PROJECT:?}" "${PF_APIKEY:?}" "${PF_TOKEN:?}"
hdr=(-H "apikey: $PF_APIKEY" -H "authorization: Bearer $PF_TOKEN" -H "accept-profile: public" -H "accept: application/json")

code=$(curl -s -o "$OUT/processes.json" -w "%{http_code}" "${hdr[@]}" "$PF_BASE/processes?select=*&project_id=eq.$PF_PROJECT")
if [ "$code" = "401" ]; then echo "[401] token expired — refresh PF_TOKEN in processflow-auth.env"; exit 1; fi
ids=$(python3 -c "import json;print(','.join(p['id'] for p in json.load(open('$OUT/processes.json'))))" 2>/dev/null)
if [ -z "$ids" ]; then echo "no ids — response:"; head -c 200 "$OUT/processes.json"; exit 1; fi
echo "[$code] processes: $(python3 -c "import json;print(len(json.load(open('$OUT/processes.json'))))")"
curl -s -o "$OUT/scores.json"  "${hdr[@]}" "$PF_BASE/process_scores?select=*&process_id=in.($ids)"
curl -s -o "$OUT/reports.json" "${hdr[@]}" "$PF_BASE/process_analysis_reports?select=*&process_id=in.($ids)"
echo "scores:  $(python3 -c "import json;print(len(json.load(open('$OUT/scores.json'))))" 2>/dev/null)"
echo "reports: $(python3 -c "import json;print(len(json.load(open('$OUT/reports.json'))))" 2>/dev/null)"
echo "saved to $OUT"
