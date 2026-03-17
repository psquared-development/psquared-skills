---
name: setup-email-drafts
description: "Create email drafts for approved InboxMate demos. Verifies all demos are ready, pulls contacts from CRM, creates CRM tasks, and creates draft emails via the notification service. Run after /review-demos has processed all pending demos."
---

# Setup Email Drafts for Demo Outreach

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

The `.env` file should contain tokens for:
- **CRM API** — for querying opportunities and creating tasks (variable name should contain "CRM" + "TOKEN")
- **Notification Service Draft API** — for creating email drafts (variable name should contain "DRAFT" and "TOKEN" or "BEARER")

If the `.env` file is missing or doesn't contain recognizable tokens for both services, **stop immediately** and ask the user to provide them.

**Note on env var placeholders:** Throughout this skill, `$<CRM_TOKEN_VAR>` and `$<DRAFT_TOKEN_VAR>` mean "use the actual variable name you found in `.env`." Substitute with the real variable names when running commands. Set them inline in each bash command (e.g., `CRM_TOKEN="value" && curl ...`).

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
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
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

## STEP 2 — Collect OK_TO_SEND Opportunities

Query CRM for opportunities with `demoStatus = OK_TO_SEND`:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d "{\"query\":\"{ opportunities(filter: { stage: { eq: SCREENING }, demoStatus: { eq: OK_TO_SEND } }, first: 50) { edges { node { id name demoUrl { primaryLinkUrl } company { id name domainName { primaryLinkUrl } people(first: 5) { edges { node { id name { firstName lastName } emails { primaryEmail } } } } } } } } }\"}"
```

For each opportunity, extract:
- `opportunityId`, `opportunityName`
- `companyId`, `companyName`, `companyDomain`
- `demoUrl` (from `demoUrl.primaryLinkUrl`)
- Contact: from `company.people` — pick the first person with an email. For multi-contact companies, prefer a named person (not "Office") if available.

**If company has no people or no email:** Add to skip list with reason "No contact email found". Continue to next.

**If no OK_TO_SEND opportunities:** Announce "No demos ready to send" and stop.

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

**Template UUIDs (hardcoded — do NOT query the notification service API or Supabase MCP for these):**

| Template | Locale | UUID |
|----------|--------|------|
| demo-outreach | de | `b98926be-5977-40a6-9be6-ffe38989fc5a` |
| demo-outreach | en | `47381011-a737-4157-a177-f7646bb4aee3` |

For each opportunity, determine the locale:
- If company domain is .at, .de, .ch → locale `de`
- If company website was in German during demo review → locale `de`
- Otherwise → locale `en`

Use the matching UUID above.

---

## STEP 4 — For Each Opportunity

### 4a — Create CRM Task

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d "{\"query\":\"mutation { createTask(data: { title: \\\"Send initial outreach for Demo [Company Name]\\\", status: TODO }) { id } }\"}"
```

**Save the `taskId` from the response** — it will be passed to the draft creation so we can reliably delete this exact task if the draft is deleted.

Then link to opportunity:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d "{\"query\":\"mutation { createTaskTarget(data: { taskId: \\\"[taskId]\\\", opportunityId: \\\"[opportunityId]\\\" }) { id } }\"}"
```

### 4b — Create Email Draft

The email template is a pure layout shell — **you write ALL the text**. The template only provides the InboxMate header, green CTA button, highlight box, signoff area, and p² footer. Everything else comes from your variables.

**Writing style:**
- Write like a real person, not a marketing bot. Short sentences. Direct.
- The email should feel like Martin personally wrote it for this specific company
- No corporate filler ("wir freuen uns...", "hiermit möchten wir..."). Get to the point.
- Make the reader curious about the demo — don't explain everything, tease it
- The highlight box should make them think "oh that's exactly what I need"

**Determine tone (du vs Sie) for German emails:**
1. Check CRM for any prior emails/notes with this contact — if they used "du", use "du"
2. Check the company website tone — if it uses "du" throughout (casual startup vibe), mirror it
3. **Default: Sie-Form** for cold outreach with no prior relationship
4. When in doubt → Sie

**Template variables:**

- **`greeting`** — Personal. "Hallo Dominik," or "Guten Tag Herr Rockenschaub,"
- **`bodyParagraph1`** — The hook. What you did and why it matters to THEM. One strong sentence.
- **`bodyParagraph2`** — (optional) The personalized insight. Something specific about their website/business that shows you actually looked. This is what makes them keep reading.
- **`bodyParagraph3`** — (optional) The nudge toward the demo. Keep it short.
- **`buttonText`** — CTA button label. "Demo ansehen" / "View Demo" / or something more specific
- **`highlightBox`** — (optional) One punchy line about what InboxMate does for THIS company specifically. Not generic features.
- **`closingText`** — (optional) Brief closing. "Bei Fragen einfach antworten." / "Just reply if you have questions."
- **`signoff`** — "Beste Grüße" / "Liebe Grüße" / "Best regards" — match the tone
- **`senderName`** — "Martin"
- **`demoUrl`** — the demo playground URL
- **`companyName`** — used in email title
- **`emailSubject`** — the rendered subject line (same as what you set on the draft)

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<DRAFT_TOKEN_VAR>" \
  -d '{
    "templateId": "[template UUID from step 3]",
    "locale": "[de|en]",
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
      "highlightBox": "[what InboxMate does for THIS company — one punchy line]",
      "closingText": "[brief closing]",
      "signoff": "[matching tone signoff]",
      "senderName": "Martin"
    },
    "crmCompanyId": "[company ID]",
    "crmOpportunityId": "[opportunity ID]",
    "crmCompanyName": "[Company Name]",
    "crmTaskId": "[taskId from step 4a]"
  }'
```

> **Announce after each:** `Draft created: [Company Name] → [email]`

**Note:** This skill does NOT update CRM fields. The notification service updates them automatically when emails are sent from the admin UI:

| On send | Field | Value |
|---------|-------|-------|
| Outreach email sent | `demoStatus` | `SENT` |
| Outreach email sent | `outreachSentAt` | current timestamp |
| Follow-up email sent | `demoStatus` | `FOLLOW_UP_SENT` |
| Follow-up email sent | `followupSentAt` | current timestamp |

---

## STEP 5 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Email Draft Setup complete.
>
> Drafts created: [N]
>   - [Company A] → kontakt@firma.at
>   - [Company B] → info@company.com
>
> Skipped (no contact email): [N]
>   - [Company C] — no contact with email found
>
> CRM tasks created: [N]
>
> Next step: Review and send drafts at
> → notifications.psquared.dev/drafts
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
