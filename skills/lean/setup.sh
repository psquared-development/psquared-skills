#!/usr/bin/env bash
# Installs what the `lean` skill needs: Lean 4 (via elan) and TLC (tla2tools.jar).
# Safe to re-run; it only installs what is missing.
set -uo pipefail

TLA_DIR="$HOME/.local/lib/tla"
TLA_JAR="$TLA_DIR/tla2tools.jar"
ok=0; miss=0

echo "==> lean skill setup"

# --- Lean 4 -----------------------------------------------------------------
if command -v lean >/dev/null 2>&1; then
  echo "    lean $(lean --version | head -1 | awk '{print $NF}') OK"
  ok=$((ok+1))
elif [ -x "$HOME/.elan/bin/lean" ]; then
  echo "    lean is installed but not on PATH."
  echo "    Add to your shell profile:  source \"\$HOME/.elan/env\""
  miss=$((miss+1))
else
  echo "    installing Lean 4 via elan..."
  if curl -sSf https://elan.lean-lang.org/elan-init.sh | sh -s -- -y; then
    # shellcheck disable=SC1091
    [ -f "$HOME/.elan/env" ] && . "$HOME/.elan/env"
    if command -v lean >/dev/null 2>&1; then
      echo "    lean installed: $(lean --version | head -1)"
      echo "    Add to your shell profile:  source \"\$HOME/.elan/env\""
      ok=$((ok+1))
    else
      echo "    elan ran but lean is not on PATH — open a new shell and re-run."
      miss=$((miss+1))
    fi
  else
    echo "    elan install FAILED. Install by hand: https://lean-lang.org/install/"
    miss=$((miss+1))
  fi
fi

# --- Java (TLC prerequisite) -------------------------------------------------
if command -v java >/dev/null 2>&1; then
  echo "    java $(java -version 2>&1 | head -1 | sed 's/.*version //;s/"//g') OK"
else
  echo "    java MISSING — TLC cannot run. Install a JDK 11+ (brew install openjdk)."
  miss=$((miss+1))
fi

# --- TLA+ tools --------------------------------------------------------------
if [ -f "$TLA_JAR" ]; then
  echo "    tla2tools.jar OK ($TLA_JAR)"
  ok=$((ok+1))
else
  echo "    downloading tla2tools.jar..."
  mkdir -p "$TLA_DIR"
  if curl -fsSL -o "$TLA_JAR" \
      https://github.com/tlaplus/tlaplus/releases/latest/download/tla2tools.jar; then
    echo "    tla2tools.jar installed ($TLA_JAR)"
    ok=$((ok+1))
  else
    echo "    download FAILED. Get it from https://github.com/tlaplus/tlaplus/releases"
    miss=$((miss+1))
  fi
fi

echo
echo "==> commands"
echo "    lake build                                  # build a Lean model"
echo "    java -cp $TLA_JAR pcal.trans Spec.tla       # PlusCal -> TLA+"
echo "    java -cp $TLA_JAR tlc2.TLC -config Spec.cfg Spec.tla"
echo
if [ "$miss" -eq 0 ]; then
  echo "Setup complete. Lean models and TLC are both ready."
else
  echo "$miss item(s) need attention above. The skill still works with whichever tool is present:"
  echo "Lean for state machines and pure functions, TLA+ for interleaving and races."
fi
