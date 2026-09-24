# Models, rules and costs

Source: docs.leonardo.ai (September 2026) plus probes recorded in `api-notes.md`. The catalogue in
`lib/models.mjs` is the executable version of this file.

## Decision table (`lib/select.mjs`, first match wins, `--model` always wins)

| Rule | Trigger (prompt keywords or `--intent`) | Model → fallback | Mode | Style | Default size |
|------|-----------------------------------------|------------------|------|-------|--------------|
| `text-in-image` | quoted phrase, with the text, typography, lettering, slogan, headline, says, Schriftzug, Aufschrift, `--intent text` (negations like "no text", "ohne Schriftzug" are stripped first) | `phoenix-v1.0` → `phoenix-v0.9` | QUALITY | Dynamic | 1024² |
| `logo-icon` | logo, icon, pictogram, flat design, vector, minimal, app icon, `--intent logo|icon` | `phoenix-v1.0` → `lucid-origin` | QUALITY | Minimalist / None | 1024² |
| `anime` | anime, manga, chibi | `anime-xl` → `lucid-origin` | – | – | 1024² |
| `3d-render` | 3d render, blender, octane, isometric, low poly, clay | `phoenix-v1.0` | QUALITY | 3D Render | 1024² |
| `blog-cover` | blog cover, cover image, hero, header, banner, og image, Titelbild, Beitragsbild | `flux-dev` → `lucid-origin` (`lucid-origin` first when the prompt is photorealistic) | – | Dynamic / Cinematic | 16:9 (≈1368×768), `og` 1200×632 |
| `portrait` | portrait, Porträt, headshot, Profilbild | `lucid-realism` → `portrait-perfect` → `lucid-origin` | – | Portrait | 2:3 |
| `product-shot` | product shot, packshot, Produktfoto, on white background, studio lighting | `lucid-realism` → `stock-photography` → `lucid-origin` | – | Stock Photo | 1024² |
| `photoreal` | photo, photograph, realistic, dslr, 35mm, Foto, fotorealistisch, Werkhalle | `lucid-realism` → `lucid-origin` | – | Stock Photo / Pro color photography | 16:9 for scene words, else 1:1 |
| `illustration` | illustration, cartoon, comic, drawing, sketch, watercolor, Zeichnung, Aquarell | `lucid-origin` → `phoenix-v1.0` | FAST | Creative / Illustration | 1200² |
| `draft` | draft, quick, thumbnail, Entwurf, Vorschau | `flux-schnell` → `lucid-origin` | FAST | Dynamic | 768² |
| `default` | nothing matched | `lucid-origin` → `phoenix-v1.0` | FAST | Dynamic | 1200² |

Aspect words: wide/landscape/Querformat → 16:9, vertical/tall/Hochformat/story → 9:16,
square/quadratisch → 1:1, `21:9`, `4:3`, `3:2`. `--aspect` beats words. Sizes use a pixel budget
(≈1.05 MP Phoenix and FLUX, 1.44 MP Lucid), the 8 px grid and the model limits.

## Model limits (v2 `parameters`)

| Model | Size | Modes | Styles | Extras |
|-------|------|-------|--------|--------|
| `phoenix-v1.0`, `phoenix-v0.9` | 32–2048 px, multiples of 8, default 1024 | FAST, QUALITY, ULTRA | one `style_ids` UUID, full preset list | `negative_prompt`, `contrast` LOW/MEDIUM/HIGH, `prompt_enhance`, `seed`, `tiling`, `guidances` |
| `lucid-origin` | 16–3840 × 16–3616, default 1200 | FAST, ULTRA | Dynamic, Cinematic, Creative, Fashion, Portrait, Stock Photo, Vibrant, None | `prompt_enhance`, `seed`, `guidances.content/style` |
| `lucid-realism` | assumed as Lucid Origin (unverified) | FAST, ULTRA | as Lucid Origin | |
| `flux-dev`, `flux-schnell`, `flux-pro-2.0` | 480–2048 px (min 480!) | – | Dynamic, None | `prompt_enhance`, `seed` |
| `anime-xl`, `kino-xl`, `portrait-perfect`, `stock-photography` | 512–1536 (unverified) | – | – | `negative_prompt`, `seed` |
| `remove-bg` | sync only (`/v2/generationssync`), not wired | | | |

`quantity` 1–8 for all image models; the API default is 4, the skill always sends its own value
(default 1). `prompt` ≤ 2000 characters.

## Style UUIDs

Dynamic `111dc692-d470-4eec-b791-3475abac4c46` and None `556c1ee5-ec38-42e8-955a-1e82dad0ffa1` are
documented. The remaining Phoenix preset UUIDs in `lib/models.mjs` come from the Phoenix style list and
must be confirmed once against the schema printed by `--list-models --verbose` or a test run; a wrong
UUID produces an HTTP 400 that names the field.

## Cost table

Empty until read from https://app.leonardo.ai/api-access/pricing-calculator (login required). Fill
`STATIC_COST.perImageAt1Mp` in `lib/models.mjs` per model and mode with a `verifiedAt` date. Observed
costs from real runs accumulate in `.cache/observed-costs.json` and feed the estimate automatically.
