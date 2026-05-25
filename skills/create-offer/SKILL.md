---
name: create-offer
description: "Generate a polished psquared client offer as a multi-page PDF (title, project description, screenshots, Angebot/pricing, AGB). Walks the user through gathering inputs (or accepts a JSON config), renders branded HTML templates with Playwright in two passes (title page edge-to-edge + body pages with margins and pagination), then merges with pdf-lib."
---

# Create a psquared Client Offer (PDF)

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> create-offer started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## What this skill produces

A multi-page A4 PDF with psquared branding:

1. **Title page** — edge-to-edge lavender gradient, brand mark top-left, offer reference top-right, eyebrow + client + headline + subtitle, contact blocks for both parties.
2. **Body pages** — project description (Worum es geht / Ausgangslage / Unsere Lösung / Was du bekommst / Vorgehen + custom sections), optional embedded screenshots with captions. Pagination + brand footer on every page after the title.
3. **Angebot (pricing) page** — itemized table, optional bundle discount, USt., total, optional recurring fee box, optional `paymentSummary` (e.g. 50/50 schedule), optional `notes`.
4. **AGB / Terms pages** — validity, payment terms, confidentiality, jurisdiction, optional extra paragraphs (`terms.extra` rendered as raw HTML so it supports its own `<p>` tags), signature block with both parties.

Brand color is `#6b46c1` (purple) with `#9f7aea` light tint accents. Inter font fallback chain.

The reference example is `examples/sanacom-example.json` — use it as your starting template when copy-pasting structure for a new offer.

---

## Parameters

`/create-offer [path-to-config.json] [output.pdf]`

- **path-to-config.json** — optional. JSON file describing the offer (see `examples/sanacom-example.json`). If omitted, this skill will interview the user and write the file itself before building.
- **output.pdf** — optional. Defaults to `./offer-<client-slug>.pdf` in the cwd.

---

## STEP 0 — Verify Setup

```bash
cd /Users/<you>/Documents/psquared/psquared-skills/skills/create-offer
bash setup.sh
```

`setup.sh` is idempotent — verifies Node >= 18, runs `npm install` (Playwright + pdf-lib) if missing, ensures Playwright Chromium is downloaded.

> **Announce:** `Setup OK. Playwright + Chromium + pdf-lib ready.`

---

## STEP 1 — Gather Inputs (only if no config file was provided)

If the user passed a JSON path, **skip this step** and jump to STEP 2.

Otherwise interview the user. Ask in batches, not one question at a time. The minimum required fields are:

| Field | Example |
|-------|---------|
| `client.name` | "sanacom Unternehmensberatung e.U." (legal entity!) |
| `client.contactPerson` | "Mag. Daniela Gruber" |
| `client.address` | "Kirchenwagnerweg 6b, 5071 Wals bei Salzburg" |
| `client.email` | "office@sanacom.at" |
| `offer.title` | Short product name, e.g. "Sanacom Categorizer" |
| `offer.subtitle` | One-sentence what-it-does |
| `offer.eyebrow` | "Angebot" (default) |
| `offer.referenceNumber` | "YYYY-MMDD-XXX" pattern |
| `offer.date` | German format: "25. Mai 2026" |
| `offer.validUntil` | Default: 30 days from today |
| `body.intro`, `body.problem`, `body.solution` | One paragraph each. **Use `du` form unless the user is clearly a stranger / large enterprise.** |
| `body.deliverables` | Array of HTML strings — `<strong>` allowed |
| `body.sections[]` | Optional extra sections like "Vorgehen", "Was wir brauchen" with `body` (intro line) + `bullets` |
| `body.screenshots[]` | Optional. `{ src: "assets/x.png", caption: "..." }` — drop image files into `assets/` first |
| `angebot.items` | Array of `{ position, title, description, qty, unitPrice }`. `unit` is optional (omit it to show just the qty number). |
| `angebot.paymentSummary` | Optional short string (HTML) shown directly under the totals — good for "50 % bei Auftragserteilung…" |
| `angebot.recurring` | Optional `{ label, amount, per, description }` |
| `terms.paymentTerms` | One paragraph describing the payment schedule |
| `terms.extra` | Optional raw HTML — use multiple `<p>` tags here for clean page breaks |

For `provider`, the canonical psquared defaults are:

```json
"provider": {
  "name": "psquared GmbH",
  "contactPerson": "Martin Pammesberger",
  "address": "Dametzstraße 2-4, 4020 Linz, Österreich",
  "email": "martin.pammesberger@psquared.dev",
  "website": "psquared.dev",
  "jurisdiction": "Linz"
}
```

(Both Martin and Manuel are Geschäftsführer and can sign — pick one as `contactPerson` for the title page and signature line.)

Write the gathered config to a temp file (e.g. `/tmp/create-offer-<slug>.json`) and proceed.

---

## STEP 2 — Build the PDF

```bash
cd /Users/<you>/Documents/psquared/psquared-skills/skills/create-offer
node build.mjs <path-to-config.json> <output.pdf>
```

The build does:

1. Load + enrich the JSON (computes line totals, USt., discount, formats EUR).
2. Render the full HTML (all pages) once in Chromium via Playwright.
3. **Pass 1**: print page 1 only, `margin: 0` → edge-to-edge title PDF.
4. **Pass 2**: print pages 2+, `margin: 40/25/30/25 mm`, `displayHeaderFooter: true` → body PDF with brand footer + `Seite X / Y`.
5. Merge the two PDFs with `pdf-lib` and write the output.

If `build.mjs` errors out:
- "Input file not found" → check the path.
- Playwright complains about a missing browser → re-run `bash setup.sh`.
- Token like `{{foo.bar}}` shows up in the PDF → the field is missing from the JSON. Fill it in or remove the template reference.

---

## STEP 3 — Verify

After `build.mjs` finishes, **always** sanity-check the PDF visually. Common things to look for:

- Title page edge-to-edge gradient (no white border around it)
- Body pages have proper top/side padding (~22mm visible content offset)
- Footer "Seite X / Y" present on every page after the title
- No orphan headings (a heading on one page, content on the next) — covered by `break-after: avoid` CSS
- No split cards — `.screenshot`, `.callout`, `.totals`, `.recurring`, `.payment-summary` use `break-inside: avoid`
- Item table descriptions are short enough that totals + recurring fit on the same page as the table

```bash
open "<output.pdf>"          # macOS visual check
mdls -name kMDItemNumberOfPages "<output.pdf>"
```

---

## STEP 4 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Offer PDF created.
>
> Client: [client.name]
> Title: [offer.title]
> Reference: [offer.referenceNumber or n/a]
> Total (brutto): [angebot.totalDisplay]
> Recurring: [angebot.recurring.amountDisplay / per] (if any)
>
> PDF: [absolute path]
> Pages: [count]
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## File layout

```
skills/create-offer/
├── SKILL.md              # this file
├── README.md             # gotchas + extension notes
├── package.json          # pins playwright + pdf-lib
├── setup.sh              # idempotent installer
├── build.mjs             # two-pass renderer + pdf-lib merge
├── .gitignore            # node_modules, output.pdf, *.log
├── templates/
│   ├── style.css         # shared psquared branding + print CSS
│   ├── title.html        # edge-to-edge title page
│   ├── body.html         # project description + screenshots
│   ├── angebot.html      # pricing table + recurring + payment summary
│   └── terms.html        # AGB sections + signature block
├── examples/
│   └── sanacom-example.json   # canonical reference — copy this as a starting template
└── assets/               # drop screenshots / logo.svg here
```

---

## Important reminders for the LLM filling in the template

- **Don't ask 12 micro-questions** during STEP 1. Batch them into 2–3 messages max.
- **Default to `du`-form** in body copy (intro, problem, solution, deliverables). Only switch to `Sie` if the client is clearly formal (large enterprise, unknown contact).
- **AGB stays formal** ("der Auftraggeber", "der Auftragnehmer") regardless — that's the legal convention.
- **Currency is Euro net** in line items. The build computes USt. automatically. Don't hardcode brutto values.
- **`hasDiscount`, `subtotalDisplay`, `totalDisplay`, `vatAmountDisplay`** are computed by `build.mjs`. Don't put them in the input JSON.
- **Screenshots** must be PNG/JPG dropped into `assets/`. Reference as `"src": "assets/foo.png"`. The `<base>` tag in `build.mjs` ensures the relative path resolves.
- **Keep item descriptions short** (≤ 2 lines) — long descriptions push the recurring/totals onto a second page. The Sanacom example shows the maximum length that still fits on one page.
- **Use `<p>` tags inside `terms.extra`** if you have multiple paragraphs — Chrome can then break cleanly between them. Don't use `<br/><br/>`.
- **TODO marker**: `templates/style.css` has a comment next to the `.brand` placeholder. If a real psquared logo SVG is dropped at `assets/logo.svg`, swap the `.brand` element in each template to `<img src="assets/logo.svg" alt="psquared" class="brand-img" />`.
