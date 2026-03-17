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

Read `.env` in the current directory and source it:

```bash
source .env
```

The `.env` file should contain tokens for:
- **CRM API** — for querying opportunities and creating tasks (variable name should contain "CRM" + "TOKEN")
- **Notification Service Draft API** — for creating email drafts (variable name should contain "DRAFT" and "TOKEN" or "BEARER")

If the `.env` file is missing or doesn't contain recognizable tokens for both services, **stop immediately** and ask the user to provide them.

**Note on env var placeholders:** Throughout this skill, `$<CRM_TOKEN_VAR>` and `$<DRAFT_TOKEN_VAR>` mean "use the actual variable name you found in `.env`." Substitute with the real variable names when running commands.

> **Once verified, announce:** `Environment OK. Checking demo readiness...`

---

## STEP 1 — Verify All Demos Are Ready

Query CRM for ANY opportunities at SCREENING stage with `demoStatus = PENDING_REVIEW`:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d '{"query":"{ opportunities(filter: { stage: { eq: SCREENING }, demoStatus: { eq: PENDING_REVIEW } }, first: 5) { edges { node { id name } } } }"}'
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
  -d '{"query":"{ opportunities(filter: { stage: { eq: SCREENING }, demoStatus: { eq: OK_TO_SEND } }, first: 50) { edges { node { id name demoUrl { primaryLinkUrl } company { id name domainName { primaryLinkUrl } people(first: 5) { edges { node { id name { firstName lastName } emails { primaryEmail } } } } } } } } }"}'
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

Look up the `demo-outreach` template ID from the notification service DB. Use the Supabase MCP to query:

```
Use mcp__plugin_supabase_supabase__execute_sql with:
  project_id: "fyqbhpwqlamjhoohkldu"
  query: SELECT id, locale FROM email_templates WHERE module = 'inboxmate' AND topic = 'demo-outreach'
```

For each opportunity, determine the locale:
- If company domain is .at, .de, .ch → locale `de`
- If company website was in German during demo review → locale `de`
- Otherwise → locale `en`

Match the template ID for the correct locale.

---

## STEP 4 — For Each Opportunity

### 4a — Create CRM Task

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d '{"query":"mutation { createTask(data: { title: \"Send initial outreach for Demo [Company Name]\", status: TODO }) { id } }"}'
```

Then link to opportunity:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d '{"query":"mutation { createTaskTarget(data: { taskId: \"[taskId]\", opportunityId: \"[opportunityId]\" }) { id } }"}'
```

### 4b — Create Email Draft

For each company, generate these personalized texts:

**`customHook`** — 1-2 sentences specific to this company. Reference something concrete from their website (a product, a pain point, their current setup). Shows the email isn't generic.

**`benefitsText`** — 1 concise sentence describing what InboxMate would do specifically for THIS company. NOT the generic "24/7 Kundenanfragen beantworten, Leads qualifizieren" — instead something like "Immobilienanfragen automatisch beantworten, Besichtigungstermine vereinbaren und Exposés teilen" for a real estate company, or "Kunden zu den richtigen IT-Services leiten, Angebote vorbereiten und Support-Tickets erstellen" for an IT company.

**Tone rules for German (DE) emails:**
- Always use **du-Form** (informal). "Hallo" = du, never Sie.
- Write: "dein", "dir", "du", "euer", "eure" — NOT "Ihr", "Ihre", "Sie", "Ihnen"
- The customHook and benefitsText must also use du-Form
- Keep it conversational and direct, not corporate

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<DRAFT_TOKEN_VAR>" \
  -d '{
    "templateId": "[template UUID]",
    "locale": "[de|en]",
    "recipientEmail": "[contact email]",
    "recipientName": "[contact first name]",
    "variables": {
      "contactName": "[first name]",
      "companyName": "[Company Name]",
      "demoUrl": "[demo playground URL]",
      "customHook": "[personalized 1-2 sentences, du-Form for DE]",
      "benefitsText": "[company-specific benefits, 1 concise sentence, du-Form for DE]",
      "senderName": "Martin"
    },
    "crmCompanyId": "[company ID]",
    "crmOpportunityId": "[opportunity ID]",
    "crmCompanyName": "[Company Name]"
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
