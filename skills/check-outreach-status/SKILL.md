---
name: check-outreach-status
description: "Check status of sent demo outreach emails. Creates follow-up drafts for prospects who haven't responded after 5+ days. Run periodically after /setup-email-drafts has been used."
---

# Check Outreach Status & Create Follow-ups

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Outreach Status Check started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## STEP 0 — Check Environment

Read `.env` in the current directory and source it.

Required tokens (variable names should be obvious from context):
- **CRM API** — contains "CRM" + "TOKEN"
- **Notification Service Draft API** — contains "DRAFT" and "TOKEN" or "BEARER"

Stop if missing.

**Note:** Throughout this skill, `$<CRM_TOKEN_VAR>` and `$<DRAFT_TOKEN_VAR>` mean "use the actual variable name from `.env`."

> **Once verified:** `Environment OK. Checking sent outreach...`

---

## STEP 1 — Find SENT Opportunities

Query CRM for opportunities with `demoStatus = SENT`:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d '{"query":"{ opportunities(filter: { stage: { eq: SCREENING }, demoStatus: { eq: SENT } }, first: 50) { edges { node { id name demoUrl { primaryLinkUrl } company { id name domainName { primaryLinkUrl } } pointOfContact { id name { firstName lastName } emails { primaryEmail } } noteTargets(first: 10) { edges { node { note { title createdAt } } } } } } } }"}'
```

For each opportunity:
- Extract the send date from the note title (format: "YYYY-MM-DD Outreach email sent to ...")
- Calculate days since sent

> **Announce:**
> ```
> Found [N] opportunities with SENT status:
> 1. [Company] — sent [N] days ago
> 2. [Company] — sent [N] days ago
> ```

---

## STEP 2 — Determine Follow-up Actions

For each opportunity, decide:

| Days since sent | Action |
|-----------------|--------|
| < 5 days | Skip — too early for follow-up |
| 5-10 days | Create follow-up draft |
| > 10 days | Create follow-up draft + flag as "cold" |

Also check: if the opportunity stage has moved beyond SCREENING (e.g., MEETING, PROPOSAL), skip — they've already responded.

---

## STEP 3 — Look Up Follow-up Template

Query the notification service DB for the `demo-followup` template:

```
Use mcp__plugin_supabase_supabase__execute_sql with:
  project_id: "fyqbhpwqlamjhoohkldu"
  query: SELECT id, locale FROM email_templates WHERE module = 'inboxmate' AND topic = 'demo-followup'
```

Match template locale to company (same logic as setup-email-drafts: .at/.de/.ch → de, else en).

---

## STEP 4 — Create Follow-up Drafts

For each opportunity needing follow-up:

**If no contact email:** Skip with note.

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<DRAFT_TOKEN_VAR>" \
  -d '{
    "templateId": "[followup template UUID]",
    "locale": "[de|en]",
    "recipientEmail": "[contact email]",
    "recipientName": "[contact first name]",
    "variables": {
      "contactName": "[first name]",
      "companyName": "[Company Name]",
      "demoUrl": "[demo playground URL]",
      "senderName": "Martin"
    },
    "crmCompanyId": "[company ID]",
    "crmOpportunityId": "[opportunity ID]",
    "crmCompanyName": "[Company Name]",
    "draftType": "followup"
  }'
```

Then update CRM:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d '{"query":"mutation { updateOpportunity(id: \"[opportunityId]\", data: { demoStatus: FOLLOW_UP_SENT }) { id } }"}'
```

> **Announce after each:** `Follow-up draft created: [Company] → [email] (sent [N] days ago)`

---

## STEP 5 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Outreach Status Check complete.
>
> Follow-up drafts created: [N]
>   - [Company A] → email (sent 6 days ago)
>   - [Company B] → email (sent 8 days ago)
>
> Too early for follow-up: [N]
>   - [Company C] — sent 2 days ago
>
> Already progressed: [N]
>   - [Company D] — stage moved to MEETING
>
> Cold leads (10+ days, no response): [N]
>   - [Company E] — sent 12 days ago ⚠️
>
> Next step: Review and send follow-ups at
> → notifications.psquared.dev/drafts
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
