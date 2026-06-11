---
name: inboxmate-demo-with-outreach
description: "Build InboxMate demos AND write personalised outreach drafts in a single pass per company — eliminating the double-research that happens when /inboxmate-batch-demo and /setup-email-drafts run separately. Use when kicking off a new campaign where the campaign already exists (plan via /plan-campaign first). For each target company, dispatches ONE subagent that researches the site, builds the demo, creates the CRM opportunity, and drafts the outreach email — reusing the same research across all three. After all subagents return, runs a single batch call to auto-generate follow-ups."
---

# InboxMate Demo + Outreach Combo

## What this replaces

Previously a campaign batch required:

```
/inboxmate-batch-demo   → one subagent researches company, builds demo
/setup-email-drafts     → another subagent re-researches the SAME company, writes the email
/setup-followups        → tacked on at the end (often forgotten)
```

Double WebFetches per company, double subagent dispatches, no shared context, and the forgotten-followups failure mode cost us a whole day fixing drafts by hand in Week 17.

This skill collapses that to one subagent per company plus one batch follow-up call.

---

## Prerequisites

- **Campaign already exists** — run `/plan-campaign` first (or have an existing `campaignId`). This skill does NOT create campaigns.
- **`.env` has:** `PSQUARED_CRM_TOKEN`, `NUXT_MCP_DEMO_TOKEN` (or `INBOXMATE_DEMO_MCP_TOKEN`), `OPENBRAND_API_KEY`, `EMAIL_DRAFT_ONLY_BEARER`.
- **Target companies already tagged `outreachFor: [INBOX_MATE]` in CRM.** This skill pulls from `companies(filter: { outreachFor: { containsAny: [INBOX_MATE] } })`. Untagged leads are invisible.

## Inputs

Ask the user upfront — do not guess:

| Param | Required? | Example |
|---|---|---|
| `campaignId` | ✅ | `2e4cf11c-bda5-499c-8c64-3d98054c2621` |
| `offerText` (DE) | ✅ | `Ihre Demo läuft bis 8. Mai — jetzt zum Starterpreis aktivieren` |
| `offerExpiresAt` | ✅ | `2026-05-08T23:59:59.000Z` |
| `targetCount` | ✅ | `50` |
| `parallelism` | default 5 | cap at 5 to stay under MCP 60/min rate limit |

Announce the inputs back:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
InboxMate Demo + Outreach Batch
Campaign: [name] ([id])
Target: [N] new demos + drafts
Offer:   [offerText]  (expires [date])
Parallelism: [5]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 1 — Select candidates

Fetch INBOX_MATE-tagged companies that don't yet have an opportunity:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d '{"query":"{ companies(filter: { outreachFor: { containsAny: [INBOX_MATE] } }, first: 200) { edges { node { id name domainName { primaryLinkUrl } opportunities { totalCount } } } } }"}'
```

Client-side filter: `opportunities.totalCount == 0` AND `domainName.primaryLinkUrl` is set. Take the first `targetCount`.

If fewer candidates than requested exist, proceed with what's available and flag: `Only [M] candidates available (requested [N]).`

---

## STEP 2 — Dispatch subagents (parallel waves)

Split the candidate list into waves of `parallelism` (default 5). Dispatch each wave in parallel, wait for all to return, then the next wave.

**Per-subagent prompt template** (copy these exact sections into each Agent tool call — swap in the per-company values):

```
Build ONE InboxMate demo AND create its outreach email draft for [COMPANY_NAME] — [DOMAIN_URL].

CRM Company ID: [CRM_COMPANY_ID]

## Tokens
- MCP: /tmp/mcp_t.txt → MCP_T
- CRM: /tmp/crm_t.txt → CRM_T
- OpenBrand: `grep '^OPENBRAND_API_KEY' .env | cut -d= -f2- | tr -d '\n'`
- Notif: /tmp/notif_t.txt → NOTIF_T (EMAIL_DRAFT_ONLY_BEARER)

## Constants
- Campaign: [CAMPAIGN_ID]
- offerExpiresAt: [OFFER_EXPIRES_AT]
- offerText: [OFFER_TEXT]
- Version: v3
- Demo template (DE outreach): b98926be-5977-40a6-9be6-ffe38989fc5a
- Demo template (EN outreach): 47381011-a737-4157-a177-f7646bb4aee3

## CRITICAL format rules (all four required)
1. useCases = array of OBJECTS `[{"text":"…","icon":"lucide-kebab"}]`. NEVER plain strings. `[icon:foo]` inside text = known failure mode.
2. quickQuestions = CARDS: `[{"text":"…","title":"…","description":"…","icon":"…"}]` — put them in `questionsDe` slot (NOT `questions` or `questionsEn`) for German sites.
3. Custom `greetingMessageDe` naming 2-3 concrete topics. NOT the default "Hallo! Ich bin der X-Assistent…".
4. Primary brand color MANDATORY: OpenBrand → manual fallback (WebFetch CSS) → thematic muted, never default emerald.

## Copy rules — Value Equation (READ FIRST before writing any text)

ALL copy on the demo page (customMessage, useCases text, highlightText) AND in emails (bodyParagraph1–3, highlightText, subject, closing) MUST follow the Value Equation framework in `references/value-equation.md`. Read that file before writing anything.

Core rule distilled: across each surface, hit at least **3 of these 5**:
1. **Dream outcome** — operational outcome (not tool description)
2. **Perceived likelihood** — proof / specific thing we built for them
3. **TTV** — an explicit speed number ("10 Minuten", "sofort", "ab Minute 1")
4. **Removed effort** — "kein Setup / keine Anmeldung / kein Vertrag"
5. **Risk reversal** — "einfach schließen wenn's nicht passt" / "14 Tage gratis, keine Kreditkarte"

If your `customMessage` or `bodyParagraph3` is missing an explicit time signal AND a removed-friction line, rewrite.

Replaces the old "Hormozi Rules 1–9" that focused only on dream outcome + specificity + subject curiosity. Those still apply but are now lever 1 & 2 of the equation — lever 3, 4, 5 are where we actually differentiate.

## Step A — Research (ONE pass, reuse everywhere)
WebFetch the homepage. Extract ALL of this in one reading:
- What they do (1-2 sentences, site language)
- Primary language (de/en)
- Brand color + logo via OpenBrand; manual CSS fallback if OpenBrand misses
- 4 useCases citing concrete services/products (each with a Lucide icon)
- 4 quick-question cards (text + title + description + icon)
- Custom greeting line (2-3 topics)
- Contact person (from /impressum or /kontakt) with email
- Sales-style customMessage (NOT an agent greeting): "Wir haben einen KI-Assistenten speziell für [Company] gebaut — trainiert auf [concrete topic]. Testen Sie ihn rechts unten."
- ONE email "hook" for the outreach — a dream-outcome sentence tied to their specific operation
- ONE personalized insight — something only someone who read their site would know
- ONE highlight-box line: THEIR workflow, automated

Fetch 1-2 extra pages (/leistungen, /kontakt) for knowledge enrichment — skip 404s.

## Step B — Build demo (serial MCP calls)
All via POST https://app.psquared.dev/api/mcp with Authorization: Bearer $MCP_T, parsing `result.content[0].text` as JSON.

1. quick_setup_demo: companyName, companyDomain (REQUIRED — strip https://), websiteContent (500-1500 chars from step A), primaryColor, logoUrl, language, offerText, offerExpiresAt, customMessage, useCases (OBJECTS), version: "v3". Save `agentId` + `demoId`.
2. update_quick_questions: agentId, style: "cards", questionsDe: 4 card objects.
3. update_widget_style: agentId, greetingMessageDe: custom line.
4. get_agent → read knowledgeBucketIds[0]; scrape_and_build_knowledge: bucketId, urls: [/leistungen, /ueber-uns, ...]. Skip 404s.
5. publish_agent: agentId.

## Step C — CRM opportunity (inline UUIDs — Twenty doesn't support vars)
```bash
curl -s -X POST https://crm.psquared.dev/graphql -H "Content-Type: application/json" -H "Authorization: Bearer $CRM_T" -d "{\"query\":\"mutation { createOpportunity(data: { name: \\\"[COMPANY] — InboxMate Demo\\\", stage: SCREENING, demoStatus: PENDING_REVIEW, demoType: CHATBOT, demoUrl: { primaryLinkUrl: \\\"https://demo.inboxmate.psquared.dev/?id=<DEMO_ID>\\\" }, demoId: \\\"<DEMO_ID>\\\", companyId: \\\"[CRM_COMPANY_ID]\\\", outreachType: INBOXMATE, demoVersion: V3, campaignId: \\\"[CAMPAIGN_ID]\\\" }) { id } }\"}"
```
Save the `opportunityId`.

## Step D — CRM task for the outreach
Create a task and link to the opp:
```bash
# Create task
TASK_RESP=$(curl -s -X POST https://crm.psquared.dev/graphql ... -d '{"query":"mutation { createTask(data: { title: \"Send initial outreach for Demo [COMPANY]\", status: TODO }) { id } }"}')
# Link
curl -s -X POST ... -d "{\"query\":\"mutation { createTaskTarget(data: { taskId: \\\"<TASK_ID>\\\", opportunityId: \\\"<OPP_ID>\\\" }) { id } }\"}"
```

## Step E — Outreach draft (REUSES step A research)
The template is just a shell — you write all the text. Same Hormozi rules as /setup-email-drafts:
- Rule 1: bodyParagraph1 = dream outcome, not mechanism.
- Rule 2: something specific from their site.
- Rule 3: "fertig, direkt testbar" not "kostenlos".
- Rule 4: Grand Slam — "we built it, here it is".
- Rule 5: highlightText = THEIR workflow automated.
- Rule 6: curiosity-gap subject (no "KI-Chatbot" or "Demo" in it).
- Rule 7: name-swap test — bodyParagraph2 + highlightText + subject unique to this company.
- Rule 8: no filler ("wir freuen uns", "ich hoffe", "in heutiger Zeit" etc.).
- Rule 9: body ≤ 150 words.
- Rule 10: **closingText must be unique per company** — NEVER use the placeholder `"Bei Fragen einfach antworten."` verbatim. Sanity-check flags any campaign where >50% of drafts share a closing line. Tie the closing to ONE concrete thing from their site (a specific service, location, or workflow). Examples: `"Falls Sie sehen wollen, wie der Bot Reservierungs-Anfragen löst — der Link bringt Sie direkt zum Test."` / `"Antworten Sie einfach mit der Stadt, dann zeige ich es Ihnen am Beispiel Ihrer Filiale in [Ort]."` / `"Wenn Wintergärten-Anfragen Sie aktuell Zeit kosten, lohnt sich der 2-Minuten-Blick."` Generic closings ("Bei Fragen…", "Ich freue mich auf Ihre Rückmeldung") fail the name-swap test → rewrite.

Greeting: default to Sie. If prior notes/threads use du, use du.

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NOTIF_T" \
  -d '{
    "templateId": "[de or en template UUID]",
    "locale": "[de|en]",
    "subject": "[curiosity-gap subject]",
    "recipientEmail": "[contact email from Step A]",
    "recipientName": "[contact first name]",
    "variables": {
      "companyName": "[COMPANY]",
      "demoUrl": "https://demo.inboxmate.psquared.dev/?id=<DEMO_ID>",
      "greeting": "Guten Tag Herr/Frau [Last]," (or du-form),
      "bodyParagraph1": "[hook — dream outcome]",
      "bodyParagraph2": "[personalized insight]",
      "bodyParagraph3": "[nudge]",
      "buttonText": "Demo ansehen",
      "highlightTitle": "Was der Bot für [COMPANY] tun kann:",
      "highlightText": "[THEIR workflow automated, one line]",
      "closingText": "[unique to this company — see Rule 10. Never the literal placeholder above.]",
      "signoff": "Beste Grüße",
      "senderName": "Martin"
    },
    "crmCompanyId": "[CRM_COMPANY_ID]",
    "crmOpportunityId": "<OPP_ID>",
    "crmCompanyName": "[COMPANY]",
    "crmTaskId": "<TASK_ID>",
    "campaignId": "[CAMPAIGN_ID]"
  }'
```
> 🚨 `campaignId` is **mandatory**. The 2026-04-28 batch shipped 70 outreach + 70 follow-ups unattached to any campaign because this field was omitted — they had to be backfilled retroactively. Sanity-check now blocks on null `campaign_id`. Pass the campaign UUID from the skill input.

Save the draft's `id` — return it in your report so the parent can batch follow-ups.

## Step F — Report (under 150 words)
Return this exact shape (parent parses it):
```
DONE: [COMPANY]
  agentId: ...
  demoId: ...
  opportunityId: ...
  outreachDraftId: ...
  playgroundUrl: https://demo.inboxmate.psquared.dev/?id=<demoId>
  color: #...  (source: openbrand|manual|thematic)
  notes: <anything odd — 404s skipped, site down, etc.>
```
Or on fatal failure:
```
FAILED: [COMPANY] — <one-line reason>
```

## Rules
- v3 (demo) and V3 (CRM demoVersion). Never v1/v2.
- Brand color MANDATORY — never default InboxMate emerald.
- customMessage = SALES copy, never agent-greeting copy.
- useCases OBJECTS not strings; `[icon:foo]` inside text is forbidden.
- Quick questions CARDS in `questionsDe` slot.
- Republish after config changes.
- Inline UUIDs in all GraphQL.
- Reuse step A research for step E — don't WebFetch again.
- Don't echo tokens.
```

**Parallelism + rate limits:** cap at 5 concurrent subagents. MCP allows 60 req/min per token and each subagent uses ~10 calls, so 5 parallel = ~50 calls/min, safe margin.

**On subagent failure:** log the `FAILED: [Company] — reason`, continue with the rest. Do NOT stop the whole batch for one failure.

---

## STEP 3 — Collect outreach draft IDs

After all subagents return, collect the `outreachDraftId` values from every `DONE` report into an array.

> **Announce:** `[N] demos + drafts created, [M] failed. Generating follow-ups…`

---

## STEP 4 — Batch create follow-ups (idempotent)

ONE call — no per-company loop:

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/setup-followups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" \
  -d '{"draftIds": ["<outreach_id_1>", "<outreach_id_2>", ...]}'
```

Expected response: `{ success: true, data: { created: N, skipped: 0 } }`.

`created + skipped` must equal the number of outreach draft IDs you sent. If it doesn't, re-run — the endpoint is idempotent.

---

## STEP 5 — Verify coverage (gate before reporting)

Follow-up coverage gate from `/setup-email-drafts` Step 5a:

```bash
OUT=$(curl -s "https://notifications.psquared.dev/drafts?campaignId=[CAMPAIGN_ID]&pageSize=500&draftType=outreach" -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['total'])")
FUP=$(curl -s "https://notifications.psquared.dev/drafts?campaignId=[CAMPAIGN_ID]&pageSize=500&draftType=followup" -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['total'])")
echo "outreach=$OUT followups=$FUP"
```

`OUT` must equal `FUP`. If not — re-run Step 4.

---

## STEP 6 — Sanity check the campaign

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/sanity-check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" \
  -d '{"campaign_id": "[CAMPAIGN_ID]"}'
```

All newly-built demos should come back healthy. Any warnings → investigate before reporting.

---

## STEP 7 — Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPAIGN BATCH COMPLETE

Demos + drafts: [N] ✅ / [M] ❌
  - [Company A] → [playgroundUrl]
  - ...

Failed (continue by hand):
  - [Company X] — [reason]

Follow-ups: [X] created, [Y] skipped (already existed)
Sanity: [healthy]/[warnings]/[unhealthy]

Next step:
  1. Review drafts: https://notifications.psquared.dev/drafts?campaignId=[CAMPAIGN_ID]
  2. Fix any demo warnings via /review-demos
  3. Approve + schedule via the admin UI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Gotchas worth re-stating

1. **CompanyDomain is REQUIRED** — `quick_setup_demo` now throws if it's missing. It's used as the `sourceUrl` on the initial website knowledge item; without it the demo fails sanity-check.
2. **Reuse research for email** — the whole point of this skill. If a subagent WebFetches the site twice, you've lost the efficiency win.
3. **Follow-ups via batch endpoint** — not per-opportunity. `/drafts/setup-followups` with a list of draft IDs is one call. The manual per-opp path is still valid but easy to skip under pressure.
4. **Parallelism cap: 5.** MCP rate limits bite at 6-7 concurrent subagents each doing 8-10 calls.
5. **Don't create the campaign.** This skill assumes it already exists. If the user says "for Campaign 18" but there's no Week-18 campaign in CRM, stop and say `Campaign Week 18 not found — run /plan-campaign first.`
