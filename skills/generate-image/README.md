# generate-image — developer notes

Leonardo AI image generation for the psquared skill set. Zero npm dependencies (Node ≥ 18: global
`fetch`, `node:util` `parseArgs`, `node:test`). Human output on stderr, `--json` on stdout.

## Quick start

```bash
bash setup.sh                                   # Node check, syntax check, key check, balance
node generate.mjs --explain "minimal flat icon of a paper plane"
node generate.mjs --estimate "minimal flat icon of a paper plane" --size 512x512
node generate.mjs "minimal flat icon of a paper plane" --size 512x512 --out ./generated-images/
node --test test/*.test.mjs
```

The key comes from `LEONARDO_API_KEY` in the environment or from `../../.env` relative to the real
skill directory (`/Users/mapiprivate/dev/psquared-skills/.env`). `lib/env.mjs` resolves the symlink
in `~/.claude/skills`, so the skill works from any cwd.

## Module map

| Module | Responsibility |
|--------|----------------|
| `generate.mjs` | CLI parsing, sub-commands, orchestration, exit codes, JSON output |
| `lib/env.mjs` | key discovery, dotenv parser (keeps `;`, strips quotes, `export`, CRLF), masking |
| `lib/log.mjs` | stderr logging, `━━━` rule, secret redaction |
| `lib/models.mjs` | model catalogue (limits, modes, styles, defaults), aspect presets, size maths, static cost table |
| `lib/select.mjs` | `selectModel()` rule table, aspect detection, alternatives for `--explain` |
| `lib/api.mjs` | REST client with retries/backoff, v2→v1 probe for the result endpoint, balance, pricing calculator |
| `lib/cost.mjs` | estimate chain (calculator → static → observed → unknown), observed-cost log, formatting |
| `lib/poll.mjs` | polling schedule (6 s, then 3 s growing to 10 s, timeout) |
| `lib/download.mjs` | slug, filename, streamed download with sha256, sidecar |

Why `lib/` instead of the single-file `create-offer` template: the decision function must be pure and
unit-tested, and the API adapters will change as Leonardo finishes the v1→v2 migration.

## Adding a selection rule

1. Add an entry to `RULES` in `lib/select.mjs` (id, intents, keywords in EN and DE, model chain, mode, per-family style, aspect).
2. Mirror it in `references/models.md`.
3. Add a test in `test/select.test.mjs`.

## API notes and probes

See `references/api-notes.md`. Things the first live run must confirm and record there:

- whether `GET /api/rest/v2/generations/{id}` exists (the client probes it, then falls back to v1 and caches the winner in `.cache/api-probe.json` for 7 days);
- which fields `GET /api/rest/v1/me` returns (`--balance --verbose` prints all numeric `api*` fields);
- whether `POST /api/rest/v1/pricing-calculator` still answers (else the estimate uses observed costs);
- whether the key returns `apiCreditCost` (Production API only).

## Cost table

`STATIC_COST` in `lib/models.mjs` is empty until values are read from the logged-in pricing
calculator (https://app.leonardo.ai/api-access/pricing-calculator) at 1024² × 1 image per model and
mode. Each real run with a known `apiCreditCost` is appended to `.cache/observed-costs.json`; the
estimate averages those per model/mode and scales by megapixels and quantity. Promote stable observed
values into `STATIC_COST` with a `verifiedAt` date.

## Failure triage

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `LEONARDO_API_KEY fehlt` | key not in `.env` | add `LEONARDO_API_KEY=…`, or `--env-file` |
| `HTTP 401/403` | User API key, revoked key | create a Production API key in the Leonardo dashboard |
| `HTTP 400` naming width/height/style | outside the model's constraints | `--list-models --verbose` shows the schema; adjust `--size`/`--style` |
| `HTTP 429` after 5 retries (exit 6) | concurrency or rate limit of the plan | wait, run one job at a time |
| `Generation FAILED` (exit 7) | moderation or model error | rephrase, other model |
| `TIMEOUT` (exit 8) | slow queue or ULTRA | `--status <id> --out DIR/` |
| Balance `nicht abrufbar` | `/v1/me` gone or key without user scope | not blocking; record in api-notes |

## Limitations

- No webhooks (Leonardo configures them per key in the dashboard), polling only.
- No image guidances (image-to-image, style reference) yet; `remove-bg` (sync endpoint) not wired.
- No upload to R2 or any CDN of our own; the Leonardo CDN URL in the sidecar is permanent.

## Roadmap

- `blog-psquared` / `blog-ki-linz`: generate the cover with this skill and use the sidecar `url` as `cover_image`.
- `--image <file>` for `remove-bg` and content/style guidances once needed.
