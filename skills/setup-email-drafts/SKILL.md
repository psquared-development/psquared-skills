---
name: setup-email-drafts
description: "Create email drafts for approved InboxMate demos. Verifies all demos are ready, pulls contacts from CRM, creates CRM tasks, and creates draft emails via the notification service. Run after /review-demos has processed all pending demos."
---

# Setup Email Drafts for Demo Outreach

---

## Product Context — What You're Selling

InboxMate is a white-label AI chatbot that businesses embed on their website. It answers customer questions 24/7 using the company's own knowledge base (products, pricing, FAQ). Visitors chat with it directly on the site. It handles lead qualification, appointment scheduling, and support — in the company's brand colors and language. Built by psquared, an Austrian AI company.

**The demo we built for them is a live, working chatbot already configured with THEIR products and knowledge.** This is the key differentiator — we're not pitching a generic tool, we're showing them something that already works for their business.

---

## Cold Outreach Principles

**Before writing ANY email, read `references/outreach-principles.md` in this skill's directory.** This is mandatory. The full Hormozi framework lives there — dream outcome framing, specificity rules, the Name Swap Test, highlight box requirements, filler word blacklist. Every email must pass all 9 rules. Generic emails are actively harmful — they signal spray-and-pray and destroy reply rates.

---

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Email Draft Pipeline started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## STEP 0 — Check Environment

**Read `.env` using the Read tool** (do NOT `source` it — values may contain semicolons or special characters that break shell parsing). Extract the token values by reading the file content directly.

The `.env` file should contain:
- **`PSQUARED_CRM_TOKEN`** — for querying opportunities and creating tasks
- **`EMAIL_DRAFT_ONLY_BEARER`** — for creating email drafts via the notification service. This token can **read, create, and update** drafts but **cannot send, schedule, or delete** them.

If the `.env` file is missing either token, **stop immediately** and ask the user to provide them.

> **Once verified, announce:** `Environment OK. Checking demo readiness...`

---

## Shell Quoting for CRM GraphQL Queries

**IMPORTANT:** When sending GraphQL queries to the CRM via curl, **always use double-quoted `-d` strings** with escaped inner quotes. Single-quoted strings cause intermittent parse failures with the Twenty CRM GraphQL endpoint when queries contain nested object fields like `demoUrl { primaryLinkUrl }`.

**Do this:**
```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_TOKEN" \
  -d "{\"query\":\"{ opportunities(first: 5) { edges { node { id name } } } }\"}"
```

**NOT this** (breaks with nested fields):
```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -d '{"query":"{ opportunities(first: 5) { edges { node { id name demoUrl { primaryLinkUrl } } } } }"}'
```

All curl examples below use the safe double-quoted form.

---

## STEP 1 — Verify All Demos Are Ready

Query CRM for ANY opportunities at SCREENING stage with `demoStatus = PENDING_REVIEW`:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ opportunities(filter: { stage: { eq: SCREENING }, demoStatus: { eq: PENDING_REVIEW } }, first: 5) { edges { node { id name } } } }\"}"
```

**If any PENDING_REVIEW found:** Stop and announce:

> ```
> ❌ [N] demos still pending review:
>   - [Company A]
>   - [Company B]
> Run /review-demos first before setting up email drafts.
> ```

**If none found:** Continue.

---

## STEP 1b — Stale-Campaign Guard (BLOCKS DOUBLE-SEND)

**`campaignId` is REQUIRED.** Run `/plan-campaign` first if you don't have one — every draft must be linked to a campaign. The 2026-04-28 batch shipped without `campaign_id` because earlier versions of this skill treated it as optional; that left 70 outreach + 70 follow-ups invisible to every campaign-scoped query and required retroactive backfill via `POST /drafts/backfill-campaign`. If the user invoked this skill with no `campaignId`, **stop and announce: "Need a campaignId. Run /plan-campaign first."**

Then verify that campaign hasn't already sent its batch. A campaign that already sent is a "closed" campaign — new opps must go into a fresh campaign, never into a closed one.

```bash
# 1. Check if any draft on this campaign is in SENT status
curl -s -X GET "https://notifications.psquared.dev/drafts?campaignId=[campaignId]&pageSize=1&status=SENT" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER"

# 2. Check if the campaign's offerExpiresAt has passed
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ campaigns(filter: { id: { eq: \\\"[campaignId]\\\" } }) { edges { node { id name offerExpiresAt } } } }\"}"
```

**Stop and refuse to continue if EITHER:**
- The SENT-draft query returns `total > 0` (campaign already fired)
- `offerExpiresAt` is set and is in the past

Announce:
```
❌ Campaign [name] is closed.
  - Sent drafts: [N]
  - offerExpiresAt: [date]
Run /plan-campaign to create a fresh campaign for unassigned OK_TO_SEND opps, then re-run this skill with the new campaign ID.
```

**This guard exists to prevent the Week-15 bug:** opportunities that got `campaignId` assigned to an already-sent campaign (because /review-demos flipped them NEEDS_FIX → OK_TO_SEND after the send batch went out, without clearing `campaignId`). /review-demos now clears `campaignId` on regression, but this guard is the belt-and-suspenders defense.

---

## STEP 2 — Collect OK_TO_SEND Opportunities

Query CRM for opportunities with `demoStatus = OK_TO_SEND`, including `taskTargets` in the response so we can filter out already-processed ones client-side:

**IMPORTANT:** The Twenty CRM does NOT support relation filters like `taskTargets: { is: NULL }` on `OpportunityFilterInput`. The `taskTargets` field is only available as a response field on the `Opportunity` type, not as a filter. You MUST fetch `taskTargets` in the response and filter client-side.

**IMPORTANT:** Always exclude `noOutreach: true` opportunities. These are flagged as do-not-contact (e.g. Austrian companies where cold outreach is legally restricted).

**IMPORTANT:** This skill only drafts **InboxMate** outreach. Always filter `outreachType: { eq: INBOXMATE }` — services opportunities (`outreachType: SERVICES`) are handled by `/find-services-leads` and use a different template. Museum opportunities (`outreachType: INBOX_MATE_MUSEUM`) are excluded automatically and have their own future flow.

**IMPORTANT:** Fetch the company's `outreachFor` in the response and exclude any opportunity whose company contains `PERSONAL_ONLY`. These are Martin's private contacts — they must never receive automated drafts, even if someone accidentally created an opportunity on them.

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ opportunities(filter: { stage: { eq: SCREENING }, demoStatus: { eq: OK_TO_SEND }, noOutreach: { eq: false }, outreachType: { eq: INBOXMATE } }, first: 150) { edges { node { id name outreachType demoType taskTargets { edges { node { id } } } demoUrl { primaryLinkUrl } company { id name outreachFor domainName { primaryLinkUrl } people(first: 5) { edges { node { id name { firstName lastName } emails { primaryEmail } } } } } } } } }\"}"
```

**Client-side filtering:**
1. **Skip any opportunity where `taskTargets.edges` is non-empty** (length > 0). These have already been processed by a previous run. Add them to a "Skipped (already processed)" list in the report.
2. **Skip any opportunity where `company.outreachFor` contains `PERSONAL_ONLY`.** Add them to a "Skipped (personal-only company)" list. This is a defensive double-check — the DB filter should catch most, but the company-level `outreachFor` is not expressible in the opportunity filter.

For each remaining opportunity, extract:
- `opportunityId`, `opportunityName`
- `companyId`, `companyName`, `companyDomain`
- `demoUrl` (from `demoUrl.primaryLinkUrl`)
- Contact: from `company.people` — pick the first person with an email. For multi-contact companies, prefer a named person (not "Office") if available.

**If company has no people or no email:** Add to skip list with reason "No contact email found". Continue to next.

**If no OK_TO_SEND opportunities (after filtering):** Announce "No demos ready to send" and stop.

> **Announce:**
> ```
> Found [N] demos ready for outreach:
> 1. [Company Name] → [contact email]
> 2. [Company Name] → [contact email]
> ...
> Skipped (no contact): [list if any]
> ```

---

## STEP 3 — Determine Template ID

**Route by the opportunity's `demoType`** (fetch it in the STEP 2 query; `null` = legacy CHATBOT):

**Template UUIDs (hardcoded — do NOT query the notification service API or Supabase MCP for these):**

| demoType | Template | Locale | UUID |
|----------|----------|--------|------|
| CHATBOT / null | demo-outreach | de | `b98926be-5977-40a6-9be6-ffe38989fc5a` |
| CHATBOT / null | demo-outreach | en | `47381011-a737-4157-a177-f7646bb4aee3` |
| INBOX | inbox-demo-outreach | de | `0d928690-2be4-4f50-a3c7-988fc04424e9` |
| INBOX | inbox-demo-outreach | en | `d064091f-145d-4f10-bcd3-a750c62a3eed` |

For each opportunity, determine the locale:
- If company domain is .at, .de, .ch → locale `de`
- If company website was in German during demo review → locale `de`
- Otherwise → locale `en`

Use the matching UUID above.

**INBOX template extras:** `inbox-demo-outreach` accepts the same variables as `demo-outreach` PLUS the Inbox-Befund block: `befundTitle` and `befundItems` (4-5 short strings — the recurring email types; include ops mails like Rechnungseingang/Bewerbungen where the research supports it, not only customer inquiries). 

**INBOX email skeleton (Rule 20: ≤110 words total):**
- bodyParagraph1 (≤25 words): their inbox pain in one sentence, then a colon into the Befund list. Never opens with "Ich/Wir".
- befundItems: the proof. Keep bullets ≤6 words each.
- bodyParagraph2 (≤25 words): "Dafür gibt es ein Demo-Postfach für [Company]: vorsortiert, mit fertigen Antwortentwürfen — und Rechnungen/Bewerbungen automatisch an die richtige Stelle."
- bodyParagraph3 (≤20 words): "Zwei Minuten Blick genügt. Den Rest zeigen wir an Ihren echten Mails — Termin direkt auf der Seite."
- highlightText (≤15 words), closingText (≤15 words, unique per company), buttonText "Ihr Demo-Postfach ansehen".
Inbox demos have NO signup — the goal is a booked meeting.

**MANDATORY follow-up pair (combo of 2):** every INBOX outreach gets a hand-written follow-up in the SAME create-loop — do NOT rely on `/drafts/setup-followups` auto-copy (it splices truncated text). Create it via `POST /drafts/create` with: same `templateId` (inbox UUID), `draftType: "followup"`, `parentDraftId: <outreach draftId>`, `sendAfterDays: 4`, same recipient/crm ids/campaignId. Follow-up copy (≤50 words): subject = short curiosity nudge WITHOUT first name and WITHOUT "Follow-up/Nachfrage" (e.g. "[Company] — die Demo läuft noch"); body = one sentence reminding what waits in the demo + the link. Omit befundItems/highlight in the follow-up. A batch is only DONE when outreach count == follow-up count.

---

## STEP 4 — Create Drafts (outreach + follow-up)

### Flow (read carefully before starting)

```
COLLECT outreach_draft_ids = []
for each opportunity:
    4a: check dedupe (skip if draft already exists)
    4b: create CRM task
    4c: create OUTREACH draft → save draft_id to outreach_draft_ids
    4c2: tag opportunity with outreachType
after loop:
    4d (Path A): POST /drafts/setup-followups with outreach_draft_ids
                 — this creates ALL follow-ups in one idempotent batch call
```

**Never finish the skill without step 4d.** A campaign without follow-ups halves the reach. If you're running out of context/tool-calls, prioritise 4d over refining email copy — you can always PUT-update the text later, but missing follow-ups mean half your campaign is a single-touch blast.

### 4a — MANDATORY: Check if draft already exists in notification service

**THIS CHECK IS NOT OPTIONAL. Do NOT skip it. Do NOT proceed to 4b without running this check.**

Note: CRM task deduplication is already handled in Step 2 by fetching `taskTargets` and filtering client-side. This step only checks the notification service.

**Query notification service for existing drafts by campaign ID**, then filter client-side by opportunity ID:

```bash
curl -s -X GET "https://notifications.psquared.dev/drafts?campaignId=[campaignId]&pageSize=500" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER"
```

**Do this ONCE before the loop** and build a Set of `crm_opportunity_id` values that already have drafts. Then for each company, check the Set — if the opportunity ID is already present → **SKIP**. Announce: `SKIP: [Company Name] — draft already exists`

> **Important:** `crmOpportunityId` is NOT a supported filter on `GET /drafts`. Only `campaignId` is. Using `crmOpportunityId` silently returns all drafts and the check becomes meaningless.

**Only proceed to 4b if the opportunity ID is NOT in the existing-draft Set.**

### 4b — Create CRM Task

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { createTask(data: { title: \\\"Send initial outreach for Demo [Company Name]\\\", status: TODO }) { id } }\"}"
```

**Save the `taskId` from the response** — it will be passed to the draft creation so we can reliably delete this exact task if the draft is deleted.

Then link to opportunity:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { createTaskTarget(data: { taskId: \\\"[taskId]\\\", opportunityId: \\\"[opportunityId]\\\" }) { id } }\"}"
```

### 4c — Create Email Draft

The email template is a pure layout shell — **you write ALL the text**. The template only provides the InboxMate header, green CTA button, highlight box, signoff area, and p² footer. Everything else comes from your variables.

**Before writing: fetch the company website** and read it properly. You need real details. Don't write from memory.

---

**HORMOZI VALUE EQUATION — NON-NEGOTIABLE:**

The full framework (dream outcome × perceived likelihood ÷ time delay ÷ effort & sacrifice, + risk reversal) lives in the companion skill: `~/.claude/skills/inboxmate-demo-with-outreach/references/value-equation.md`. Read it before writing.

Distilled: every email must hit at least **3 of these 5** across its copy:
1. **Dream outcome** — operational result, not tool description.
2. **Perceived likelihood** — proof / specific thing we built for them.
3. **TTV** — explicit speed number ("10 Minuten live", "sofort einsatzbereit").
4. **Removed effort** — "kein Setup", "keine Anmeldung", "kein Vertrag".
5. **Risk reversal** — "einfach schließen wenn's nicht passt" / "der Test endet von selbst — nichts zu kündigen". (NOT "gratis"/"keine Kreditkarte" — spam triggers AND violate Rule 3.)

Levers 1 & 2 are where most people stop. Levers 3, 4, 5 are where InboxMate actually wins — competitors also promise outcomes, but nobody else says "läuft schon, in 10 Minuten auf Ihrer Seite, keine Anmeldung."

The nine legacy "Hormozi Rules" below are still valid — they elaborate on levers 1 and 2 and on craft (no filler, name-swap test, word count). But if you get levers 1+2 right and skip 3+4+5, the email still won't convert. Push the bottom of the fraction.

**Rule 1 — Dream outcome first, not mechanism.**
Open with the outcome they get, not the tool you built. Wrong: "Wir haben einen KI-Chatbot für Sie erstellt." Right: "Wir haben Ihren Kundenservice auf Autopilot gestellt — er beantwortet Anfragen rund um die Uhr, ohne dass jemand ans Telefon muss."

**Rule 2 — Specificity is credibility.**
Mention something concrete from their actual website. A product name. A service they offer. Their pricing structure. A line from their team page. If you can't point to where you found it on their site, it's too vague. Generic claims ("wir haben Ihre Produkte eingebaut") get ignored. Specific claims ("wir haben Ihren [specific product/service name] und die FAQ von Ihrer Kontaktseite eingebaut") build trust.

**Rule 3 — Lower friction to zero. Never say "kostenlos" or "kein Vertrag nötig".**
They don't need to register, commit, or set anything up. The demo is already live and one click away. Frame it as zero effort — NOT zero cost. "Kostenlos" implies the product is free, which it isn't; when they find out it's paid, the first reaction is betrayal. "Kein Vertrag nötig" sounds like you're pre-empting resistance.

Good: "fertig, direkt testbar", "ein Klick, keine Anmeldung", "läuft bereits — einfach reinschauen", "keine Registrierung, direkt ansehen"
Bad: "kostenlos", "kein Vertrag nötig", "unverbindlich"

**Rule 4 — Grand Slam Offer framing.**
The value must feel so obvious that ignoring it feels stupid. Frame it as: you did the hard work, it's ready, they just need to look. Not "we'd like to offer..." — "we built it. Here it is."

**Rule 5 — Highlight box = their exact workflow, automated.**
Do NOT describe InboxMate features. Describe their daily operational pain, eliminated. Examples by business type:
- Storage facility: "Verfügbarkeit prüfen, Einheiten reservieren, Preise erklären — ohne Telefon."
- Jewelry store: "Kollektion präsentieren, Ringe zur Anprobe vormerken, Öffnungszeiten beantworten — automatisch."
- Funeral home: "Infos über Bestattungsarten geben, Kosten erklären, erste Schritte begleiten — diskret, rund um die Uhr."
Each highlight must be about their specific operation. Zero generic.

**Rule 6 — Curiosity gap subject line.**
The subject must create a "what did they build for us?" reaction. Never reveal what it is in the subject. "[Company] — haben wir was für euch" ✓ | "[Company] — KI-Chatbot Demo" ✗. The punchline is in the email, not the subject.

**Rule 7 — Name Swap Test (mandatory).**
After writing, ask: could I send this exact email to a different company by only swapping the name? If yes → rewrite. At minimum, `bodyParagraph2`, `highlightText`, and the subject must be unique to this company.

**Rule 8 — No filler, ever.**
Delete on sight: "wir freuen uns", "hiermit möchten wir", "in heutiger Zeit", "als führendes Unternehmen", "unser innovatives Produkt", "ich hoffe diese E-Mail findet Sie gut". Every sentence either increases their urge to click or gets cut.

**Rule 9 — Max ~150 words body.**
Count. Every sentence must earn its place.

---

**Determine tone (du vs Sie) for German emails — THIS IS CRITICAL, DO NOT SKIP:**

For EACH company, before writing any text, check for prior communication:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ people(filter: { companyId: { eq: \\\"[companyId]\\\" } }, first: 5) { edges { node { emails { primaryEmail } } } } }\"}"
```

Then check if we have email threads with any of those email addresses in the agenthub DB:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ noteTargets(filter: { companyId: { eq: \\\"[companyId]\\\" } }, first: 20) { edges { node { note { title body } } } } }\"}"
```

Look at the note/email content for "du/dir/dein" vs "Sie/Ihnen/Ihr" patterns.

**Rules:**
1. If prior emails/notes use "du" → use "du" (Hallo [Vorname],)
2. If the company website prominently uses "du" throughout → mirror it
3. If no prior contact exists → **default to Sie** (Guten Tag Herr/Frau [Nachname],)
4. When in doubt → Sie

**Verify your choice:** After writing all text for a company, re-read every sentence and check that du/Sie is consistent. A single "Ihre" in an otherwise du-Form email is a dealbreaker.

**Template variables:**

- **`greeting`** — Personal. e.g. "Hallo [Vorname]," (du) or "Guten Tag Herr/Frau [Nachname]," (Sie)
- **`bodyParagraph1`** — The hook. What you did and why it matters to THEM. One strong sentence.
- **`bodyParagraph2`** — (optional) The personalized insight. Something specific about their website/business that shows you actually looked. This is what makes them keep reading.
- **`bodyParagraph3`** — (optional) The nudge toward the demo. Keep it short.
- **`buttonText`** — CTA button label. "Demo ansehen" / "View Demo" / or something more specific
- **`highlightTitle`** — (optional) Bold title for the green box. e.g. "Was der Bot für [Company] tun kann:" or "What this means for [Company]:"
- **`highlightText`** — (optional) One punchy line about what InboxMate does for THIS company specifically. Not generic features.
- **`closingText`** — (optional) Brief closing. "Bei Fragen einfach antworten." / "Just reply if you have questions."
- **`signoff`** — "Beste Grüße" / "Liebe Grüße" / "Best regards" — match the tone
- **`senderName`** — "Martin"
- **`demoUrl`** — the demo playground URL
- **`companyName`** — used in email title
- **`emailSubject`** — the rendered subject line (same as what you set on the draft)

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" \
  -d '{
    "templateId": "[template UUID from step 3]",
    "locale": "[de|en]",
    "subject": "[curiosity-driven subject line — see principle #8]",
    "recipientEmail": "[contact email]",
    "recipientName": "[contact first name]",
    "variables": {
      "companyName": "[Company Name]",
      "demoUrl": "[demo playground URL]",
      "greeting": "[personal greeting]",
      "bodyParagraph1": "[the hook — what you did, why it matters]",
      "bodyParagraph2": "[personalized insight about their business]",
      "bodyParagraph3": "[nudge toward the demo]",
      "buttonText": "[CTA button text]",
      "highlightTitle": "[bold title for green box]",
      "highlightText": "[what InboxMate does for THIS company — one punchy line]",
      "closingText": "[brief closing]",
      "signoff": "[matching tone signoff]",
      "senderName": "Martin"
    },
    "crmCompanyId": "[company ID]",
    "crmOpportunityId": "[opportunity ID]",
    "crmCompanyName": "[Company Name]",
    "crmTaskId": "[taskId from step 4b]",
    "campaignId": "[campaignId from skill input]"
  }'
```

> 🚨 **`campaignId` is mandatory.** Without it the draft has `null campaign_id` in the notification service DB and becomes invisible to every campaign-scoped query (sanity-check by campaign, /check-outreach-status, queue grouping, analytics). The 2026-04-28 batch shipped 70 outreach + 70 follow-ups unattached because this field was omitted — they had to be backfilled retroactively. Sanity-check now blocks on it.

> **Announce after each:** `Draft created: [Company Name] → [email]`

### 4c2 — Set outreachType on Opportunity

**If the opportunity doesn't already have `outreachType` set** (check the value from Step 2 response), update it:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { updateOpportunity(id: \\\"[opportunityId]\\\", data: { outreachType: INBOXMATE }) { id } }\"}"
```

This tags the lead so the CRM tracks what product we outreached for. All InboxMate demo leads get `INBOXMATE`; consulting/services leads get `SERVICES`.

### 4d — Create Follow-up Draft (MANDATORY — never skip)

> 🚨 **The single most common failure mode of this skill is leaving the loop after 4c.** Every campaign without follow-ups is ~½ the expected reach. Skipping 4d broke the Week-17 batch — operator had to create follow-ups by hand the day after.

**Two paths. Use A for bulk runs (20+ opportunities), B for one-off single-opp flows.**

#### Path A — Batch call at the END of the loop (RECOMMENDED for batches)

After the per-opportunity loop completes (all outreach drafts for all opps created), make ONE call to auto-generate follow-ups for the entire batch:

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/setup-followups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" \
  -d '{
    "draftIds": ["[outreachDraftId1]", "[outreachDraftId2]", ...]
  }'
```

The endpoint:
- Filters to outreach drafts only (ignores any follow-ups you accidentally include)
- Skips drafts that already have a follow-up (idempotent — safe to re-run)
- Auto-generates a non-sales-y subject + 1-paragraph body referencing the parent's first paragraph
- Returns `{ created: N, skipped: M }` — verify `created + skipped == number of outreach draftIds`

Use Path A whenever you have 5+ opportunities. It eliminates the "forgot to loop back" failure mode entirely.

#### Path B — Manual per-opportunity (one-off only)

**Immediately after** getting the `draftId` from step 4c, create the follow-up draft. Outreach and follow-up are always created as a pair.

**Writing the follow-up:**
- Same template UUID as the outreach (de/en based on locale)
- `draftType: "followup"`, `parentDraftId: [draftId from 4c]`, `sendAfterDays: 7`
- Same `recipientEmail`, `recipientName`, `crmCompanyId`, `crmOpportunityId`, `crmCompanyName`
- **NO `crmTaskId`** — follow-up shares the task of the outreach
- Subject: short curiosity hook, NEVER "Follow-up", "Nachfrage", "Rückfrage", "Erinnerung" — e.g. "[Company] — Demo läuft noch", "Hatten Sie kurz Zeit reinzuschauen?", "[Vorname], 2 Minuten reichen"
- Body: reference the specific initial topic from the outreach (use `bodyParagraph1`/`highlightText` context), then a short nudge back to the demo
- Keep it shorter than the outreach — 1-2 paragraphs is enough
- Consistent du/Sie form with the outreach

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" \
  -d '{
    "templateId": "[same template UUID as outreach]",
    "locale": "[de|en]",
    "subject": "[curiosity subject — NOT a follow-up reveal]",
    "recipientEmail": "[same as outreach]",
    "recipientName": "[same as outreach]",
    "draftType": "followup",
    "parentDraftId": "[draftId from step 4c]",
    "sendAfterDays": 7,
    "variables": {
      "companyName": "[Company Name]",
      "demoUrl": "[same demo URL]",
      "greeting": "[same greeting]",
      "bodyParagraph1": "[brief reference to initial topic + is the demo still available]",
      "bodyParagraph2": "[optional: one specific detail from their business]",
      "bodyParagraph3": "",
      "buttonText": "Demo ansehen",
      "highlightTitle": "",
      "highlightText": "",
      "closingText": "[brief closing]",
      "signoff": "[same signoff]",
      "senderName": "Martin"
    },
    "crmCompanyId": "[company ID]",
    "crmOpportunityId": "[opportunity ID]",
    "crmCompanyName": "[Company Name]",
    "campaignId": "[same campaignId as outreach]"
  }'
```

> **CRITICAL:** `crmCompanyId`, `crmOpportunityId`, `crmCompanyName`, and `campaignId` are **all mandatory** on follow-up drafts. Without `crm_opportunity_id` the follow-up has `null` crm_opportunity_id and becomes invisible to opportunity queries. Without `campaignId` it has `null` campaign_id and is invisible to campaign-scoped queries (sanity-check, queue, analytics). Path A (`/drafts/setup-followups`) inherits both from the parent automatically — Path B is manual, you must pass them explicitly. Sanity check blocks on either being null.

> **Announce after each:** `Follow-up created: [Company Name] (sends 7 days after outreach)`

**Note:** This skill does NOT update CRM fields. The notification service updates them automatically when emails are sent from the admin UI:

| On send | Field | Value |
|---------|-------|-------|
| Outreach email sent | `demoStatus` | `SENT` |
| Outreach email sent | `outreachSentAt` | current timestamp |
| Follow-up email sent | `demoStatus` | `FOLLOW_UP_SENT` |
| Follow-up email sent | `followupSentAt` | current timestamp |

---

## STEP 5 — After-Write Quality Check

**Run this after ALL drafts have been created.** This is a mandatory editorial review — the commanding agent checks every email for quality before moving on.

### 5a — 🚨 FOLLOW-UP COVERAGE GATE (do this FIRST)

Before any quality check, verify that every outreach draft has a paired follow-up. If any opp is missing a follow-up, the batch is not done.

```bash
# Count outreach drafts
OUT=$(curl -s "https://notifications.psquared.dev/drafts?campaignId=[campaignId]&pageSize=500&draftType=outreach" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['total'])")

# Count follow-up drafts
FUP=$(curl -s "https://notifications.psquared.dev/drafts?campaignId=[campaignId]&pageSize=500&draftType=followup" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['total'])")

echo "outreach=$OUT followups=$FUP"
```

**`OUT` must equal `FUP`.** If they differ, either:
- Re-run Path A (`POST /drafts/setup-followups` with the outreach draft IDs) — it's idempotent, safe to call again.
- Or identify the orphans by fetching outreach drafts, then querying children for each via parent_draft_id, and create the missing follow-ups manually (Path B in Step 4d).

Do not proceed to 5b until `OUT == FUP`.

### 5b — Fetch all just-created drafts

**IMPORTANT:** The `GET /drafts` endpoint defaults to `draftType=outreach` only. You MUST explicitly request follow-ups or they will be silently excluded.

Fetch outreach and follow-up drafts separately:
```bash
# Outreach drafts
curl -s -X GET "https://notifications.psquared.dev/drafts?campaignId=[campaignId]&pageSize=500&draftType=outreach" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER"

# Follow-up drafts
curl -s -X GET "https://notifications.psquared.dev/drafts?campaignId=[campaignId]&pageSize=500&draftType=followup" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER"
```

For each outreach draft, review the full `variables` object against the 7-point checklist.
For each follow-up draft, check: (a) subject has no "Follow-up/Nachfrage/Erinnerung/Reminder", (b) body references the specific product/service from the outreach (not generic), (c) consistent du/Sie with the paired outreach.

### Quality checklist — evaluate each draft

Score each email against these 7 criteria. Be **strict** — when in doubt, it fails.

| # | Check | Pass criteria |
|---|-------|---------------|
| 1 | **Dream outcome** | `bodyParagraph1` describes a business outcome (not a tool/feature) |
| 2 | **Specificity** | Contains a concrete detail from their website (product name, service, pricing, team) — something a generic template couldn't have |
| 3 | **Risk zero** | Explicitly lowers friction — makes clear it's free/live/no commitment |
| 4 | **Highlight box** | `highlightText` describes THEIR workflow automated, not InboxMate features |
| 5 | **Subject curiosity gap** | Subject hides the punchline — does NOT say "KI-Chatbot" or "Demo" or "Angebot" |
| 6 | **Name swap test** | At least `bodyParagraph2` + `highlightText` + subject are unique to this company — couldn't be copy-pasted to a competitor |
| 7 | **No filler** | No "wir freuen uns", "unser innovatives", "hiermit möchten wir", "ich hoffe", "in heutiger Zeit" |

### For each draft that fails any check:

1. Note which checks failed
2. Fetch the company website again if needed
3. Rewrite the failing variables
4. Update the draft via PUT:

```bash
curl -s -X PUT https://notifications.psquared.dev/drafts/[draftId] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" \
  -d '{
    "subject": "[corrected subject]",
    "variables": {
      "companyName": "...",
      "demoUrl": "...",
      "greeting": "...",
      "bodyParagraph1": "...",
      "bodyParagraph2": "...",
      "bodyParagraph3": "...",
      "buttonText": "...",
      "highlightTitle": "...",
      "highlightText": "...",
      "closingText": "...",
      "signoff": "...",
      "senderName": "Martin"
    }
  }'
```

> **Important:** Always include ALL `variables` in the PUT body — partial updates will blank out omitted fields.

> **Announce after each fix:** `Revised: [Company Name] — failed checks: [list]`

### Quality check pass criteria for the batch

If ≥90% of drafts pass all 7 checks without needing revision → the batch is solid. If more than 10% needed revision → note it in the report as a signal to revisit the draft writing approach.

---

## STEP 6 — Sanity Check

Run the sanity check for the campaign before reporting. This validates demo health, email link correctness, and follow-up draft body quality.

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/sanity-check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" \
  -d '{"campaign_id": "[campaignId]"}'
```

Parse the response and categorise results:
- **Healthy:** `healthy: true` — no action needed
- **Issues (unhealthy):** `healthy: false` + non-empty `issues` array — list per company
- **Warnings:** non-empty `warnings` array — list per company (non-blocking)

---

## STEP 7 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Email Draft Setup complete.
>
> Outreach drafts created: [N]
> Follow-up drafts created: [N] (sends 7 days after outreach)
>   - [Company A] → kontakt@firma.at
>   - [Company B] → info@company.com
>
> Skipped (draft already exists): [N]
>   - [Company C] — task already linked
>
> Skipped (no contact email): [N]
>   - [Company D] — no contact with email found
>
> CRM tasks created: [N]
>
> Quality check: [N/N passed] — [N revised]
>   ✏️  [Company X]: revised — [which checks failed]
>   (all others passed on first write)
>
> Sanity check: [N healthy] / [total] — [N issues] need attention
>   ❌ [Company X]: [issue]
>   ⚠️  [Company Y]: [warning]
>
> Next step: Review and send drafts at
> → notifications.psquared.dev/drafts
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
