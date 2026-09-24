#!/usr/bin/env bash
# Flat icon, small and cheap: Phoenix QUALITY with the Minimalist style by rule.
node "$HOME/.claude/skills/generate-image/generate.mjs" \
  "minimal flat vector icon of a paper plane, single lime green shape on white, no text" \
  --intent icon --size 512x512 --out ./generated-images/
