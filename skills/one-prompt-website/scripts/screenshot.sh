#!/usr/bin/env bash
# Screenshot a local site at desktop width and at a true 390 px phone width, and print the
# phone layout's scrollWidth (anything > 390 means horizontal overflow).
#
#   screenshot.sh <site-dir> <out-dir> [port]
#
# Why the iframe: headless Chrome has a minimum window width (~500 px), so --window-size=390
# does not give a phone layout. The page is loaded in a 390 px iframe instead.
# Why the manual wait: a <video autoplay> keeps --virtual-time-budget from ever finishing.
set -euo pipefail
SITE=$(cd "$1" && pwd); OUT=$2; PORT=${3:-8931}
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT"
if lsof -i :"$PORT" >/dev/null 2>&1; then echo "port $PORT busy — pass another port" >&2; exit 1; fi
FRAME="$SITE/.tmp-frame"; mkdir -p "$FRAME"
cat > "$FRAME/f.html" <<'HTML'
<!doctype html><body style="margin:0"><iframe id=f src="/" style="width:390px;height:9000px;border:0"></iframe>
<script>f.onload=()=>{const d=f.contentDocument.documentElement;document.title='SW='+d.scrollWidth+' H='+d.scrollHeight}</script>
HTML
( cd "$SITE" && exec /usr/bin/python3 -m http.server "$PORT" >/dev/null 2>&1 ) & SRV=$!
trap 'kill $SRV 2>/dev/null; rm -rf "$FRAME"' EXIT
sleep 1
shot() { # name url size
  rm -f "$OUT/$1.png"
  "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$OUT/.chrome-$1" --timeout=6000 \
       --window-size="$3" --screenshot="$OUT/$1.png" "$2" >/dev/null 2>&1 &
  for _ in $(seq 1 30); do [ -f "$OUT/$1.png" ] && break; sleep 1; done
  pkill -f "user-data-dir=$OUT/.chrome-$1" || true
}
shot desktop "http://localhost:$PORT/" 1440,6000
shot phone "http://localhost:$PORT/.tmp-frame/f.html" 390,9000
"$C" --headless=new --disable-gpu --user-data-dir="$OUT/.chrome-dom" --timeout=5000 --window-size=390,800 \
     --dump-dom "http://localhost:$PORT/.tmp-frame/f.html" 2>/dev/null | grep -o '<title>[^<]*' | sed 's/<title>/phone: /' &
sleep 9; pkill -f "user-data-dir=$OUT/.chrome-dom" || true
rm -rf "$OUT"/.chrome-*
# Split tall shots into readable slices (sips --cropOffset is unreliable; use ffmpeg).
for n in desktop phone; do
  h=$(sips -g pixelHeight "$OUT/$n.png" | awk '/pixelHeight/{print $2}'); w=$(sips -g pixelWidth "$OUT/$n.png" | awk '/pixelWidth/{print $2}')
  step=$([ "$n" = desktop ] && echo 2000 || echo 2600); i=0
  for ((y=0; y<h; y+=step)); do ffmpeg -loglevel error -y -i "$OUT/$n.png" -vf "crop=$w:$(( h-y<step ? h-y : step )):0:$y" "$OUT/$n-$i.png"; i=$((i+1)); done
done
ls "$OUT"/*.png
