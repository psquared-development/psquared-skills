# create-avv — developer notes

Generates a signable psquared **Auftragsverarbeitungsvertrag (AVV / Art. 28 DSGVO)**
PDF from a JSON config. Sibling of `create-offer` — it deliberately reuses the
same rendering approach so the two stay visually consistent and easy to maintain.

## Quick start

```bash
bash setup.sh
node build.mjs examples/avv-example.json output.pdf
open output.pdf
```

## How it works

Identical to `create-offer` (see that skill's README for the deep dive):

- Tiny mustache-style templating engine inside `build.mjs` (`{{x}}`, `{{{raw}}}`,
  `{{#each}}`, `{{#if}}/{{else}}`).
- **Two Chromium passes** merged by `pdf-lib`: pass 1 prints page 1 edge-to-edge
  (`margin: 0`, no footer) for the title page; pass 2 prints pages 2+ with
  40/25/30/25 mm margins + a brand footer with `Seite X / Y`.
- `@page :first { margin: 0 }` keeps the title page full-bleed in both passes.

The only structural difference from create-offer: there's no pricing/`enrichConfig`
step (an AVV has no line items), and the document is assembled as **title +
document** (preamble → `sections[]` → signature → `annexes[]`) instead of
title/body/angebot/terms.

## Config shape (`examples/avv-example.json`)

| Key | Meaning |
|-----|---------|
| `doc` | `title`, `eyebrow`, `subtitle`, `referenceNumber`, `date`, `version` |
| `controller` | The customer (Verantwortlicher) — the only block that changes per deal |
| `provider` | psquared (Auftragsverarbeiter) — standard defaults |
| `preamble` | Raw-HTML intro block (rendered in the callout box) |
| `sections[]` | `{ num, title, html }` — numbered as `§ {num} {title}`; `html` is raw |
| `annexes[]` | `{ title, html }` — Anlage 1 (TOMs) + Anlage 2 (sub-processor table) |

## Keeping it accurate

- **Anlage 2 must match `app.psquared.dev/legal/dpa`** (Annex 1 — Authorized
  Sub-processors). If a sub-processor changes in the app's DPA page, update the
  example here too.
- Customer-chosen mailbox providers (Outlook/IMAP/GMX/Hetzner) are **not** psquared
  sub-processors — the example notes this under Anlage 2.
- It's a template — always recommend a legal review before first send.

## Gotchas

Same print-CSS gotchas as create-offer (see its README §1–§5): don't set a generic
`@page { margin }`, keep `break-after: avoid` on headings, `break-inside: avoid` on
the signature block + annex rows. The `<base href>` injected by `build.mjs` makes
`assets/…` paths resolve from the skill dir.
