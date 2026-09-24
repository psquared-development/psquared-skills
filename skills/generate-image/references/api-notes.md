# Leonardo API notes and probe log

Base URLs: `https://cloud.leonardo.ai/api/rest/v2` (current) and `/api/rest/v1` (legacy, still
documented for some endpoints). Header `authorization: Bearer <key>`, JSON in and out.

| Endpoint | Status (2026-09-06) | Notes |
|----------|---------------------|-------|
| `POST /v2/generations` | documented | `{ model, public, parameters }` → `{ generationId, apiCreditCost|null }`; `apiCreditCost` only for Production API keys |
| `GET /v2/models` | documented | `productionApiAvailableModels[] { id, name, parameters }`, cached 24 h in `.cache/models.json` |
| `POST /v2/generationssync` | documented | only `remove-bg`; `results[]`, `cost { amount, unit }`, `blockedCount`, ~27 s timeout |
| `GET /v2/generations/{id}` | **probe** | not in the public reference; client tries it first |
| `GET /v1/generations/{id}` | legacy, referenced by FAQ | `generations_by_pk { status, generated_images[] { url, id, nsfw } }`, pending = empty array |
| `GET /v1/me` | **probe** (reference page 404) | expected `user_details[0].apiPaidTokens / apiSubscriptionTokens / apiConcurrencySlots`; `--balance --verbose` prints all numeric `api*` fields |
| `POST /v1/pricing-calculator` | **probe** (reference page 404) | legacy body `service: IMAGE_GENERATION`, `serviceParams.IMAGE_GENERATION { imageWidth, imageHeight, numImages, alchemyMode, isPhoenix, ultra, … }` |
| Webhooks | documented | configured per API key in the dashboard, payload `type: image_generation.complete`, not used by the CLI |
| Limits | behind login | concurrency, pending queue and rate limit per plan; client backs off on 429 |

Facts: image URLs do not expire; User API keys are deprecated in favour of Production API keys;
billing is pay-as-you-go (top-up or auto top-up), some responses report cost in `CREDITS`, the sync
endpoint may report `DOLLARS`.

## Probe log

Fill in after the first live run (`node generate.mjs … --verbose`):

- `GET /v2/generations/{id}`: …
- `GET /v1/me` fields: …
- `POST /v1/pricing-calculator`: …
- `apiCreditCost` present: …
- Models available on the account (`--list-models`): …
