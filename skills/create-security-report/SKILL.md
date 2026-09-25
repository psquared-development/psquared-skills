---
name: create-security-report
description: "Generate a branded psquared Security Audit report PDF for a customer from a security-audit run (findings.json): title page with severity counts, intro, scope, findings overview table (SEC-01…), one card per finding with location, root cause, recommended fix and an 'open verification' block for unverified findings, recommended fix order and review limits. Sibling of create-avv / create-offer: same two-pass Playwright render + pdf-lib merge."
---

# Create a psquared Security Audit report PDF

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> create-security-report started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

Turns the output of the `security-audit` skill into a customer-ready PDF in psquared branding.

## Inputs

1. **Run folder** of the security-audit skill. It must contain a validated `findings.json`.
   Only `confirmed` and `needs_validation` records are used; `rejected` is skipped.
2. **`report.json`** with the per-report data. Copy `examples/report-example.json` and fill:

| Field | Meaning |
|-------|---------|
| `doc` | Title, eyebrow, subtitle, `system` (used in the intro), reference number, date, version |
| `customer` | Name, system, scope line on the title page |
| `provider` | psquared block (normally unchanged) |
| `summaryNote` | Optional sentence about the main pattern |
| `scope` | HTML list items for "Scope and method" |
| `expectedSeverity` | `fingerprint → critical/high/medium/low` for **every** `needs_validation` record |
| `fixOverrides` | `fingerprint → fix text`, for records whose own fix text is missing or too technical |
| `fixOrder` | Ordered steps: `title`, `text`, and `fingerprints` or `"rest": true` |
| `limits` | HTML list items for "Limits of this review" (deferred coverage, held-back candidates) |

Optional: `introSections` replaces the generated intro completely; `idPrefix` (default `SEC`).

## Rules the script applies

- Confirmed records keep their own severity. Unverified records get `expectedSeverity`, the label `(exp.)` and the status **Not yet verified**. They are sorted where they would be if confirmed.
- Order: critical, high, medium, low; within a level confirmed first, then by title. IDs follow this order.
- Each card shows the root cause (not the reproduction), the recommended fix and, for unverified records, the open points from `blockers`. Internal audit wording (sandbox, harness, "not approved") is replaced by one neutral sentence.
- Words like "attacker" and "victim" are replaced by neutral terms.
- The script stops if an unverified record has no expected severity. It warns when a record falls back to the generic fix text; add a `fixOverrides` entry for it.

## STEP 0 — Setup

```bash
cd ~/Documents/psquared/psquared-skills/skills/create-security-report
bash setup.sh
```

## STEP 1 — Prepare report.json

Copy the example next to the run folder (for example `<run-dir>/report.json`). Fill all fields. For `expectedSeverity`, list every `needs_validation` fingerprint:

```bash
python3 -c "import json,sys;[print(r['fingerprint']) for r in json.load(open(sys.argv[1])) if r['verdict']=='needs_validation']" <run-dir>/findings.json
```

Expected severity is a judgement: use the severity the finding would get if the open points were confirmed. Tell the user that these values are estimates.

## STEP 2 — Build

```bash
python3 scripts/prepare.py --run <run-dir> --report <run-dir>/report.json --out /tmp/security-report-config.json
node build.mjs /tmp/security-report-config.json "<run-dir>/psquared-Security-Audit-<Customer>.pdf"
```

Fix every `WARNING` from `prepare.py` before sending the report.

## STEP 3 — Verify

Render a few pages and look at them (title page, overview table, one detail card, fix order):

```bash
pdftoppm -r 60 -png -f 1 -l 3 "<pdf>" /tmp/sr-prev
```

Check: badges do not overlap the finding column; every card has a specific fix; no reproduction steps or payloads appear; the footer shows `Page X / Y`.

## STEP 4 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Security report PDF created.
> Customer: [customer.name] · Reference: [doc.referenceNumber]
> Findings: [n] (critical/high/medium/low) · Confirmed: [n]
> PDF: [absolute path] · Pages: [count]
> Reminder: expected severities are estimates; review before sending.
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

## File layout

```
skills/create-security-report/
├── SKILL.md
├── README.md
├── package.json          # playwright + pdf-lib (same versions as create-avv)
├── setup.sh              # idempotent installer
├── build.mjs             # two-pass renderer + pdf-lib merge (create-avv engine)
├── scripts/prepare.py    # findings.json + report.json → render config
├── templates/
│   ├── style.css         # psquared branding + severity/status badges + finding cards
│   ├── title.html        # title page with severity counts
│   └── document.html     # intro, overview table, finding cards, fix order, limits
└── examples/
    └── report-example.json
```
