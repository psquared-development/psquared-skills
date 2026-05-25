# create-offer — developer notes

Generates a multi-page psquared client offer PDF from a JSON config.

The canonical reference offer is `examples/sanacom-example.json` — start there when copy-pasting structure for a new client. The Sanacom version was iterated until every page break, margin, and orphaned heading was fixed — keep that shape.

## Quick start

```bash
bash setup.sh
node build.mjs examples/sanacom-example.json output.pdf
open output.pdf
```

## How it works (two-pass rendering + pdf-lib merge)

The PDF is built in two Chromium passes that are then merged by `pdf-lib`:

| Pass | `pageRanges` | `margin` | `displayHeaderFooter` | Purpose |
|------|--------------|----------|------------------------|---------|
| 1 | `"1"` | `0 / 0 / 0 / 0` | `false` | Title page edge-to-edge, no footer |
| 2 | `"2-"` | `40 / 25 / 30 / 25 mm` | `true` | Body pages with brand footer + `Seite X / Y` |

This is necessary because Playwright's `page.pdf()` applies one set of margin + headerFooter options to ALL pages of a single call. Without two passes either the title loses its full-bleed gradient or the body pages lose pagination.

`pdf-lib` then copies page 1 from pass A, pages 2..N from pass B, into a fresh document.

## Templating

A tiny home-grown mustache-like engine inside `build.mjs`:

| Syntax | Meaning |
|--------|---------|
| `{{path.to.value}}` | HTML-escaped substitution |
| `{{{path.to.value}}}` | Raw substitution (preserves `<strong>`, `<p>`, etc.) |
| `{{#if path}}…{{else}}…{{/if}}` | Conditional, with optional `{{else}}` at same nesting depth |
| `{{#each list}}…{{/each}}` | Iteration. `{{this}}` is the current item; object items unpack their properties into scope. |

Use raw `{{{…}}}` for any field where you want to allow HTML in the JSON (deliverables, intro/problem/solution, terms.extra, captions). Use escaped `{{…}}` for plain-text fields (names, addresses, titles).

## Gotchas — lessons learned from polishing the Sanacom offer

These design choices look weird in isolation but each exists to fix a real bug we hit. Don't undo them without understanding why.

### 1. `@page :first { margin: 0 }` is REQUIRED

```css
@page { size: A4; /* no margin */ }
@page :first { margin: 0; }
```

Why: Pass 2 renders the FULL HTML (including the title page) even though `pageRanges: "2-"` filters it out of the output. If the title page inherits pass 2's 40mm margins, it overflows onto a second page — and that orphan becomes "page 2" of pass 2's output, shifting pagination off by one.

`@page :first { margin: 0 }` keeps the title page edge-to-edge in BOTH passes.

### 2. Don't set generic `@page { margin: X }`

Setting `@page { margin: 0 }` (or any value) at the top level overrides Playwright's `margin` option on body pages. Result: body content goes edge-to-edge with no padding. We use Playwright margins exclusively for body pages — the CSS `@page` block must NOT set margin (except `:first`).

### 3. Chromium reserves ~18mm of `margin.top` for the header area

When `displayHeaderFooter: true`, even with `headerTemplate: "<div></div>"`, Chromium reserves space at the top of the page for the header. To get a visible top padding of ~22mm, set `margin.top` to ~40mm. Same trick for `margin.bottom` (footer takes ~10mm).

### 4. `break-inside: avoid` on every visual card

These CSS classes use BOTH `break-inside: avoid` and `page-break-inside: avoid` so they NEVER split across pages:

- `.screenshot` — image + caption belong together
- `.callout` — Ausgangslage box
- `.totals` — Zwischensumme/USt/Gesamt block
- `.recurring` — Hosting box
- `.payment-summary` — 50/50 schedule block

Chromium pushes the whole element to the next page if it doesn't fit. Without this, you get half a card on each page — common ugly print bug.

### 5. `break-after: avoid` on headings

```css
.terms-section h3 { break-after: avoid-page; page-break-after: avoid; }
.section h2 { break-after: avoid-page; page-break-after: avoid; }
```

Without this you get widow headings like "9. Gerichtsstand" floating alone at the bottom of a page, body content on the next.

### 6. `terms.extra` is RAW HTML, not plain text

The template renders `{{{terms.extra}}}` unwrapped. The JSON value should contain its own `<p>` tags:

```json
"extra": "<p><strong>Recht auf Eigenbetrieb…</strong> …</p><p><strong>Preisanpassung…</strong> …</p>"
```

Why: `<br/><br/>` doesn't allow Chrome to break between visual paragraphs. With real `<p>` blocks, Chrome treats each as a separate flowable block.

### 7. `<base href>` for asset paths

`build.mjs` writes the HTML to a tempdir before Playwright loads it. The `<base href="file:///.../skills/create-offer/">` injected by `build.mjs` is what makes `assets/foo.png` paths resolve correctly. Don't remove it.

### 8. Keep item-table descriptions ≤ 2 lines

Long descriptions push the totals + recurring onto a second page. Look at the Sanacom example for max workable length. If you need more detail, move it into `body.deliverables` (a separate page).

### 9. Footer template padding must match the body margin

```js
margin: { ..., left: "25mm", right: "25mm" },
footerTemplate: `<div style="padding: 0 25mm; …">…</div>`
```

The footer is rendered in its own iframe by Chromium with the SAME horizontal extent as the body content area. If the padding values don't match, the brand text and "Seite X / Y" won't line up with the body edges.

## Adding a new client

1. `cp examples/sanacom-example.json /tmp/offer-<client>.json`
2. Update `client.*`, `offer.*`, `body.*` for the new project
3. Drop any screenshots into `assets/<client>/foo.png`, reference in `body.screenshots[]`
4. `node build.mjs /tmp/offer-<client>.json /tmp/offer-<client>.pdf`
5. Open the PDF — eyeball for orphans/overflow, iterate
6. Send

## Quick triage table

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `{{foo}}` shows literally in PDF | Field missing from JSON | Add it, or wrap the template line in `{{#if foo}}` |
| Body pages have no padding | CSS `@page` has a top-level `margin` rule | Remove it; only `@page :first` should set margin |
| Title page has white border | Pass 1's Playwright `margin` is non-zero | Set all four sides to `"0"` in `titlePdfBuffer` call |
| Pagination starts at 2 | Title page overflowed in pass 2 | Confirm `@page :first { margin: 0 }` is in CSS |
| Screenshot caption splits across pages | Missing `break-inside: avoid` on `.screenshot` | Already in `style.css`; check it hasn't been removed |
| Heading floats alone at page bottom | Missing `break-after: avoid` on `h2`/`h3` | Already in `style.css` |
| Costs more pages than expected | Margins too aggressive OR text too long | Shorten descriptions in JSON, or reduce font sizes in `.page--angebot` |
| Footer brand-text and "Seite X" not edge-aligned | Footer padding doesn't match body margin | Update both to the same value in `build.mjs` |

## TODO

- Drop a real `assets/logo.svg` and swap the `.brand` divs in all templates for `<img>`.
- Optional: en-locale variant (currently hardcoded to German labels "Auftraggeber", "USt.", etc.).
- Optional: `--watch` flag in `build.mjs` so editing the JSON re-renders without re-launching Chromium each time.
