---
name: inboxmate-inbox-demo
description: "Set up a personalized InboxMate INBOX demo (Demo-Postfach) for a sales prospect: a public, read-only seeded inbox showing 5-7 pre-triaged emails in their industry's language, with categories, routing and ready AI drafts. Use for email-automation outreach (the €49-349 product), NOT for chatbot outreach. No agent is created."
---

# InboxMate Inbox Demo Pipeline (Demo-Postfach)

The artifact this skill builds proves the **email product** (triage + auto-drafts, €49–349/mo) — not the free chatbot. The prospect receives a personalized link showing "their" inbox, pre-sorted by InboxMate, with reply drafts ready. The hook in the outreach mail is the **Inbox-Befund**: their top recurring email types, derived from their business.

## 🚨 NON-NEGOTIABLE CHECKLIST

- [ ] **NO agent, NO knowledge bucket, NO widget.** Inbox demos use only `create_inbox_demo`. Never call `create_agent` / `quick_setup_demo` here — that's the chatbot pipeline (`/inboxmate-demo`).
- [ ] **Every seeded email is plausible for THIS business.** Names, requests and amounts must fit their industry and region. **NEVER invent prices, policies, opening hours or product names that are not on their website.** If you don't know their voucher policy, the AI draft must not state one — write around it ("gerne stelle ich Ihnen einen Gutschein über den gewünschten Betrag aus" is fine; "Gutscheine sind 3 Jahre gültig" is NOT unless their site says so).
- [ ] **AI drafts speak AS the prospect's team** (their tone, their signature style) — this is the wow moment AND the top hallucination risk. Drafts must be sendable as-is by their staff.
- [ ] **Logo + real branding** via OpenBrand (same procedure as `/inboxmate-demo` Phase 2f — logo matters most here; there is no widget color).
- [ ] **5–7 threads, mixed types — show ROUTING, not just replies**: at least one revenue thread (Anfrage/Buchung with ready draft), one OPS thread that InboxMate routes instead of answers (eingehende Rechnung → "Erkannt & an Buchhaltung weitergeleitet" via action forward, or Bewerbung → an HR), one auto-archive thread (Newsletter/Werbung), one urgent/edge thread (Storno, Beschwerde → ticket). The ops/routing thread is what separates the email product from a chatbot — never ship a demo that only answers inquiries. Order: most impressive first.
- [ ] **CRM opportunity has `demoType: INBOX`** — this routes it into the inbox campaign/draft pipeline and the "InboxMate Email Outreach" CRM view.
- [ ] **`customMessage` mentions the Befund**, not generic copy: "So sieht Ihr Posteingang mit InboxMate aus — wir haben die [N] häufigsten Mail-Typen von [Company] simuliert."

---

## PHASE 0 — Environment

Same as `/inboxmate-demo`: read `.env` (NUXT_MCP_DEMO_TOKEN, OPENBRAND_API_KEY, PSQUARED_CRM_TOKEN), confirm MCP connectivity via `tools/list` on `https://app.psquared.dev/api/mcp`. The tools used here: `create_inbox_demo`, `update_inbox_demo`, `get_demo`.

## PHASE 1 — Research the Prospect

Identical to `/inboxmate-demo` Phase 1 (validate website first, auto-skip dead sites, scrape homepage + leistungen/preise/faq/kontakt). Additionally extract what feeds the Befund:

- **Which emails does this business receive every day?** Read their site like a customer: can you book/order/request a quote? Do they sell vouchers? Group offers? Events? Each customer-facing offering = a recurring email type.
- Their **tone** (Sie/du, formal/herzlich) — AI drafts must match it.
- A **named team member** if visible (sign drafts "Ihr Team von [Company]" if none).
- The likely **inbox address** (info@/office@ from imprint) — shown as the mailbox label.

## PHASE 2 — The Inbox-Befund + Thread Plan

### 2a — Inbox-Befund (top 5 recurring email types)

Write 5 one-liners naming the email types this business receives daily, e.g. for a Therme:

```
1. Gutschein-Anfragen (Geburtstage, Weihnachten)
2. Gruppen- & Firmenbuchungen mit Preisanfrage
3. Stornierungen & Umbuchungen
4. Fragen zu Öffnungszeiten an Feiertagen
5. Rechnungskopien & Buchhaltungsanfragen
```

This list goes into (a) the outreach email (`befundItems`), (b) drives which threads you seed.

### 2b — Seed 5–7 threads

Thread shape (the `create_inbox_demo` schema validates sender/email/subject/preview/body):

```json
{
  "sender": "Anna Huber",
  "email": "anna.huber@gmx.at",
  "subject": "Gutschein für 2 Personen — Geburtstagsgeschenk",
  "preview": "Liebes Team, ich möchte meiner Mutter zum 60er …",
  "time": "09:14",
  "unread": true,
  "body": "Liebes Team,\n\nich möchte meiner Mutter …\n\nLiebe Grüße\nAnna Huber",
  "category": { "label": "Gutschein-Anfrage" },
  "suggestedAction": { "action": "reply", "summary": "Antwortentwurf erstellt — Gutschein-Anfrage", "priority": "normal" },
  "aiDraft": "Liebe Frau Huber,\n\nvielen Dank für Ihre Anfrage! …\n\nHerzliche Grüße\nIhr Team von [Company]"
}
```

Rules:
- `action` ∈ `reply` | `archive` | `ticket` | `forward`. Newsletter/Werbung → `archive`, **no aiDraft**. Beschwerde/komplexe Fälle → `ticket` or `forward` with `priority: "high"`/`"urgent"`, draft optional.
- 3–4 threads WITH aiDraft (the product proof), 1–2 without (shows triage isn't reply-spam).
- Categories in the prospect's language, 2–4 distinct labels across threads.
- Senders: plausible German/Austrian names, free-mail or company domains. Times: same morning ("08:32", "09:14", "10:05") + one "Gestern".
- Bodies 50–150 words; drafts 60–150 words, in the prospect's tone, signed by their team.

### 2c — No offers

INBOX demos run WITHOUT offers (Martin, 2026-06-11): do NOT set `offerText` or `offerExpiresAt`, do not ask the user for a deadline. The pitch is the Demo-Postfach itself + the Inbox-Test — no discount, no countdown.

> Show the plan summary (company, Befund, thread list with categories/actions) and proceed after 5 seconds unless stopped.

## PHASE 3 — Build via MCP

One call does everything (no agent, no publish):

```json
{
  "method": "tools/call",
  "params": {
    "name": "create_inbox_demo",
    "arguments": {
      "companyName": "[Company Name]",
      "companyDomain": "[domain.com]",
      "logoUrl": "[from OpenBrand]",
      "customMessage": "So sieht Ihr Posteingang mit InboxMate aus — wir haben die häufigsten Mail-Typen von [Company] simuliert: vorsortiert, mit fertigen Antwortentwürfen.",
      "language": "de",
      "inboxThreads": [ /* threads from 2b */ ]
    }
  }
}
```

> Save `demoId` and `playgroundUrl`. Fixes after review go through `update_inbox_demo` (full `inboxThreads` replacement).

## PHASE 4 — Verify

WebFetch the `playgroundUrl` (`demo.inboxmate.psquared.dev/?id=<demoId>`): company name + logo render, thread list shows categories and action chips, CTA reads "Kostenloses Beratungsgespräch buchen" (meeting-only — no signup button on inbox demos). The API response is at `https://app.psquared.dev/api/demo/<demoId>` (`type: "inbox"`, `inboxThreads` populated).

## PHASE 5 — CRM Opportunity

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { createOpportunity(data: { name: \\\"[Company Name] — InboxMate Inbox-Demo\\\", stage: SCREENING, demoStatus: PENDING_REVIEW, demoType: INBOX, demoUrl: { primaryLinkUrl: \\\"[playgroundUrl]\\\" }, companyId: \\\"[companyId]\\\", outreachType: INBOXMATE }) { id name stage demoStatus demoType } }\"}"
```

`demoType: INBOX` is what separates this from chatbot demos in `/plan-campaign`, `/setup-email-drafts` and the "InboxMate Email Outreach" CRM view. Look up / create the company first if running standalone (same as `/inboxmate-demo` Phase 5).

## PHASE 6 — Deliver

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INBOX DEMO READY — [Company Name]
Playground URL: [playgroundUrl]
Befund: [5 one-liners]
Threads: [N] ([categories] · [M] with AI draft)
Demo ID: [demoId] · Opportunity: demoType INBOX, PENDING_REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Quality Gate

- [ ] No invented prices/policies/hours anywhere (threads AND drafts) — only facts from their website
- [ ] Drafts match the prospect's tone and are sendable as-is
- [ ] Mixed actions: ≥1 reply-with-draft, ≥1 archive, ≥1 ticket/forward or urgent
- [ ] Categories in prospect's language, consistent labels
- [ ] Logo set (OpenBrand, with manual fallback per `/inboxmate-demo` 2f)
- [ ] NO offerText/offerExpiresAt set (inbox demos run offer-free)
- [ ] CRM opportunity: `demoType: INBOX`, `outreachType: INBOXMATE`, stage SCREENING, PENDING_REVIEW
