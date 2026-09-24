---
name: generate-image
description: "Generate images with the Leonardo AI API from a text prompt. The skill picks the model itself (Phoenix, Lucid Origin/Realism, FLUX, Anime XL) from what the image needs, prints the credit cost and the remaining balance before and after every paid call, downloads the files into the cwd and writes a provenance sidecar JSON next to them. Use when the user asks to generate, create or render an image, illustration, blog cover, hero or OG image, product shot, icon or concept art, or says 'Bild generieren', 'erstelle ein Bild', 'Cover für den Blogpost'. Parameters: /generate-image <prompt> [--intent photo|portrait|product|text|illustration|icon|logo|anime|3d|cover|banner|draft] [--model id] [--aspect 16:9|og|…] [--quantity 1] [--mode FAST|QUALITY|ULTRA] [--style name] [--out dir/] [--confirm]"
---

# Generate Image (Leonardo AI)

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> generate-image started. Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

Creates one or more images from a prompt via `POST https://cloud.leonardo.ai/api/rest/v2/generations`,
polls until the generation is complete, downloads the files and writes `<name>.json` with the full
request, the model decision, estimated vs. actual cost and the balance before/after. Every paid call is
preceded by a cost block. Default is **one** image (the API default would be four).

## Parameters

`/generate-image <prompt> [flags]`

| Flag | Meaning |
|------|---------|
| `--intent …` | What the image is for when the prompt does not say it: `photo`, `portrait`, `product`, `text`, `illustration`, `icon`, `logo`, `anime`, `3d`, `cover`, `banner`, `draft` |
| `--model <id>` | Force a model (`phoenix-v1.0`, `lucid-origin`, `lucid-realism`, `flux-dev`, `flux-schnell`, `anime-xl`, …). Only when the user names one. |
| `--aspect` / `--size WxH` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `21:9`, `og` (1200×632) or an exact size on the 8 px grid |
| `--quantity N` | 1 to 8, default 1. Cost scales linearly. |
| `--mode`, `--quality`, `--style`, `--negative`, `--seed`, `--enhance`, `--contrast` | Model options, validated against the catalogue |
| `--out <dir/>` | Target folder (default cwd). A path with an extension is used as the file name. |
| `--confirm` | Ask `Fortfahren? [y/N]` after the cost block (needs a TTY, `--yes` skips) |
| `--json` | Machine-readable result on stdout, human log on stderr |
| `--estimate`, `--explain`, `--balance`, `--list-models`, `--status <id>` | Read-only sub-commands |

Full synopsis: `node "$HOME/.claude/skills/generate-image/generate.mjs" --help`

## STEP 0 — Check Environment

| Variable | Purpose | Needed for |
|----------|---------|-----------|
| `LEONARDO_API_KEY` | Leonardo **Production** API key (User API keys are no longer accepted) | every call |

The script reads the key from the environment or from `/Users/mapiprivate/dev/psquared-skills/.env`
(two levels above the skill's real path). Run the idempotent check:

```bash
bash "$HOME/.claude/skills/generate-image/setup.sh"
```

It verifies Node ≥ 18, the script syntax, prints the key masked (`****abcd`) with its source and the
current balance. If the key is missing, **stop immediately** and tell the user to add
`LEONARDO_API_KEY=…` to the `.env` (key from https://app.leonardo.ai/api-access, pay-as-you-go
balance required). Never `source .env`, never print or paste the key.

## STEP 1 — Shape the prompt

Turn the request into **one English prompt** (max 2000 characters): subject, setting, style,
lighting, composition, what must not appear. Keep proper nouns. No real persons, no third-party logos,
no invented certificates or numbers. For brand work take colours and bans from the project
(e.g. the NOVA site: navy and lime, no glow, no globe). Do not pick the model by hand; pass
`--intent` when the need is implicit and `--model` only when the user named one. Show the decision
without spending anything:

```bash
node "$HOME/.claude/skills/generate-image/generate.mjs" --explain "<prompt>" [flags]
```

## STEP 2 — Show the cost

```bash
node "$HOME/.claude/skills/generate-image/generate.mjs" --estimate "<prompt>" [flags]
```

Relay the block verbatim (model and rule, size, quantity, estimated cost with its source, balance).
Ask the user with AskUserQuestion only if they asked for approval, the estimate exceeds 100 credits,
the balance is unknown, or `--quantity` is above 1. Otherwise continue.

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Kosten: ~24 Credits (Quelle …) · Guthaben: 1.240 Credits
> Generating 1 image with phoenix-v1.0 …
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

## STEP 3 — Generate

```bash
node "$HOME/.claude/skills/generate-image/generate.mjs" "<prompt>" [flags] --json --out "<dir>/"
```

Parse the JSON line on stdout. Exit codes and what to do:

| Exit | Meaning | Action |
|------|---------|--------|
| 0 | done, `images[].path` written | continue with STEP 4 |
| 2 | usage or API 400 | fix the flag or size (message lists valid values) |
| 3 | key missing | STEP 0 |
| 4 | 401/403 | wrong or non-Production key, tell the user |
| 5 | balance | report balance, stop, no retry |
| 6 | rate or concurrency limit | wait 30 s, retry once |
| 7 | generation FAILED | simplify the prompt or try `--model lucid-origin` once, cost block first |
| 8 | poll timeout | `--status <generationId> --out <dir>/` fetches it later |
| 9 | no file (moderated) | rephrase, tell the user why |
| 10 | aborted at `--confirm` | stop |

## STEP 4 — Verify

Read the image. When text, logos, UI or small details matter, zoom before judging:

```bash
python3 "$HOME/.claude/skills/zoom-image/scripts/zoom.py" "<file>" --info
python3 "$HOME/.claude/skills/zoom-image/scripts/zoom.py" "<file>" --frac 0.25 0.25 0.75 0.75 --out "<scratchpad>/crop.jpg"
```

Check spelling of rendered text, hands and faces, watermarks, aspect ratio, `nsfw` flags. A re-roll
(new `--seed`, `--mode QUALITY`) costs credits: show the cost block again first, at most two retries.

## STEP 5 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ✅ Image generated
> Modell:     phoenix-v1.0 · QUALITY · Cinematic (Regel "blog-cover")
> Größe:      1360×768 · Seed 4711
> Kosten:     geschätzt ~24 · tatsächlich 24 Credits
> Guthaben:   1.240 → 1.216 Credits
> Datei:      /abs/path/titelbild-phoenix-v1.0-4711.jpg
> Sidecar:    /abs/path/titelbild-phoenix-v1.0-4711.json
> CDN:        https://cdn.leonardo.ai/…
> generationId: …
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

## Rules

- One image unless the user asks for variants. `quantity` is always sent explicitly.
- English prompts. The cost line precedes every paid call, including retries.
- Absolute paths in the report. Crops for verification go to the session scratchpad, never into the project.
- The sidecar's CDN `url` does not expire; `blog-psquared` and `blog-ki-linz` can use it as `cover_image` (the R2 upload path does not exist yet).
- Do not edit `.cache/` by hand; `--list-models --refresh` and the observed-cost log maintain it.

## Failure triage

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `LEONARDO_API_KEY fehlt` | not in `.env`, or `.env` lives elsewhere | add it, or `--env-file <path>` |
| `HTTP 401` | User API key or revoked key | create a Production API key |
| `Guthaben: nicht abrufbar (/v1/me → 404)` | balance endpoint changed | generation still works; actual cost comes from `apiCreditCost`; note the status in `references/api-notes.md` |
| `Kosten: unbekannt bis zum ersten Lauf` | pricing calculator unavailable and no observed costs yet | run once; later estimates use the observed values |
| `HTTP 400 … width/height` | size outside the model's range | `--size` on the 8 px grid within the limits printed by `--list-models --verbose` |
| Status stays `PENDING` past the timeout | queue or slow ULTRA job | `--status <id>` later, or `--timeout 300` |

## File layout

```
skills/generate-image/
  SKILL.md, README.md, package.json, setup.sh, .gitignore
  generate.mjs                CLI
  lib/{env,log,models,select,api,cost,poll,download}.mjs
  references/models.md        decision table, model limits, style UUIDs, cost table
  references/api-notes.md     endpoint facts and probe results
  examples/                   sample invocations and a sidecar example
  test/                       node:test unit tests (node --test test/*.test.mjs)
  .cache/                     models.json, api-probe.json, observed-costs.json (gitignored)
```
