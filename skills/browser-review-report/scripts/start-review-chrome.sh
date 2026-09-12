#!/usr/bin/env bash
# Start (or stop) a dedicated Chrome for the chrome-devtools MCP.
#
#   start-review-chrome.sh start [port] [profile-dir]
#   start-review-chrome.sh stop  [port] [profile-dir]
#
# Why a dedicated profile: Chrome 136+ ignores --remote-debugging-port on the
# default profile, and the user's own Chrome must not become the test browser.
# The MCP server is configured with --browserUrl http://127.0.0.1:9222; keep the
# port in sync with ~/.claude.json if you change it.
set -euo pipefail

CMD="${1:-start}"
PORT="${2:-9222}"
PROFILE="${3:-${TMPDIR:-/tmp}/claude-review-chrome-$PORT}"

case "$CMD" in
  start)
    mkdir -p "$PROFILE"
    open -na "Google Chrome" --args \
      --remote-debugging-port="$PORT" \
      --user-data-dir="$PROFILE" \
      --no-first-run --no-default-browser-check \
      --window-size=1440,900 "about:blank"
    for _ in $(seq 1 20); do
      sleep 0.5
      if curl -fsS "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
        echo "Chrome debugging on 127.0.0.1:$PORT (profile: $PROFILE)"
        exit 0
      fi
    done
    echo "Chrome did not answer on port $PORT" >&2
    exit 1
    ;;
  stop)
    pkill -f "remote-debugging-port=$PORT" 2>/dev/null || true
    sleep 1
    rm -rf "$PROFILE"
    echo "review Chrome stopped, profile removed"
    ;;
  *)
    echo "usage: $0 start|stop [port] [profile-dir]" >&2
    exit 2
    ;;
esac
