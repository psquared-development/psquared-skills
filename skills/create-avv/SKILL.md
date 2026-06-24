---
name: create-avv
description: "Generate a signable psquared Auftragsverarbeitungsvertrag (AVV / GDPR Art. 28 DPA) as a branded multi-page PDF — title page, numbered §-sections, signature block for both parties, and annexes (TOMs + authorized sub-processors). Accepts a JSON config or interviews the user for the customer details. Sibling of create-offer: same two-pass Playwright render + pdf-lib merge."
---

# Create a psquared AVV (Auftragsverarbeitungsvertrag, Art. 28 DSGVO) PDF

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> create-avv started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

This is the AVV counterpart to `create-offer`. You attach the resulting PDF to a
psquared offer when a customer becomes a direct data-processing customer. It
reuses the exact same rendering engine (two Chromium passes — edge-to-edge title
page + body pages with margins and `Seite X / Y` pagination — merged by pdf-lib).

The reference config is `examples/avv-example.json`. The sub-processor annex
there mirrors the live data policy at `app.psquared.dev/legal/dpa` — keep them in
sync. **It is a template: a lawyer should review before first use.**

---

## What this skill produces

A multi-page A4 PDF with psquared branding:

1. **Title page** — lavender gradient, brand mark, AVV reference/date/version,
   and the two parties (Verantwortlicher = customer, Auftragsverarbeiter = psquared).
2. **Body** — preamble + numbered §-sections (Gegenstand/Dauer, Datenarten,
   Pflichten, Unterauftragsverarbeiter, Betroffenenrechte, Breach-Meldung,
   Drittlandtransfer, Löschung, Schlussbestimmungen).
3. **Signature block** — Ort/Datum + Unterschrift for both parties.
4. **Annexes** — Anlage 1 (technische und organisatorische Maßnahmen, Art. 32)
   and Anlage 2 (genehmigte Unterauftragsverarbeiter, as a table with locations).

---

## Parameters

`/create-avv [path-to-config.json] [output.pdf]`

- **path-to-config.json** — optional. JSON describing the AVV (see
  `examples/avv-example.json`). If omitted, interview the user (see STEP 1).
- **output.pdf** — optional. Defaults to `./avv-<client-slug>.pdf` in the cwd.

---

## STEP 0 — Verify Setup

```bash
cd /Users/<you>/Documents/psquared/psquared-skills/skills/create-avv
bash setup.sh
```

Idempotent — verifies Node >= 18, installs Playwright + pdf-lib, downloads
Chromium. (Shares deps with create-offer; if that's already set up this is fast.)

> **Announce:** `Setup OK. Playwright + Chromium + pdf-lib ready.`

---

## STEP 1 — Gather Inputs (only if no config was provided)

If the user passed a JSON path, **skip to STEP 2**. Otherwise the only thing that
actually changes per customer is the **`controller`** block — everything else
(provider, sections, annexes) is psquared-standard and lives in the example.

Copy `examples/avv-example.json`, then fill:

| Field | Example |
|-------|---------|
| `controller.name` | "Doppler Holding GmbH" (legal entity!) |
| `controller.contactPerson` | "Max Mustermann, Geschäftsführer" |
| `controller.address` | "Musterstraße 1<br/>5020 Salzburg<br/>Österreich" |
| `controller.email` | "datenschutz@kunde.at" |
| `doc.referenceNumber` | "YYYY-MMDD-XXX" |
| `doc.date` | German format: "24. Juni 2026" |

Only edit `sections`/`annexes` if this customer needs deviations (e.g. an extra
sub-processor, a customer-specific instruction). Keep Anlage 2 aligned with
`/legal/dpa`.

Write the config to a temp file (e.g. `/tmp/create-avv-<slug>.json`) and proceed.

---

## STEP 2 — Build the PDF

```bash
cd /Users/<you>/Documents/psquared/psquared-skills/skills/create-avv
node build.mjs <path-to-config.json> <output.pdf>
```

---

## STEP 3 — Verify

```bash
open "<output.pdf>"
```

Eyeball: title page edge-to-edge gradient; §-headings not orphaned at a page
bottom; the signature block isn't split across pages; Anlage 2 table renders with
all sub-processors; footer "Seite X / Y" on every body page.

---

## STEP 4 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> AVV PDF created.
> Controller: [controller.name]
> Reference: [doc.referenceNumber]
> PDF: [absolute path]  ·  Pages: [count]
> Reminder: have a lawyer review before sending.
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## File layout

```
skills/create-avv/
├── SKILL.md
├── README.md
├── package.json          # pins playwright + pdf-lib (shared with create-offer)
├── setup.sh              # idempotent installer
├── build.mjs             # two-pass renderer + pdf-lib merge (same engine as create-offer)
├── templates/
│   ├── style.css         # psquared branding + print CSS + annex table styles
│   ├── title.html        # edge-to-edge title page (parties)
│   └── document.html     # preamble + §-sections + signature + annexes
└── examples/
    └── avv-example.json  # canonical reference — copy + edit `controller`
```

## Notes for the LLM

- **Only the `controller` block changes** for a standard deal — don't rewrite the
  legal §-sections unless the customer explicitly negotiated a deviation.
- **`html` fields are raw HTML** (`{{{…}}}`) — they may contain `<ul>`, `<table>`,
  `<strong>`. Plain fields (names, dates) are escaped.
- **Keep Anlage 2 in sync with `app.psquared.dev/legal/dpa`** — same sub-processor
  list + locations.
- **Always add the lawyer-review reminder** in the report — this is a legal document.
