#!/usr/bin/env bash
# Blog cover for a psquared post: 16:9, model chosen by the skill (flux-dev by rule), one image.
node "$HOME/.claude/skills/generate-image/generate.mjs" \
  "Blog cover image: a calm modern office at dawn, a single desk lamp, paper documents turning into glowing digital cards, soft navy and lime palette, no text, photorealistic, wide" \
  --aspect 16:9 --out ./generated-images/
