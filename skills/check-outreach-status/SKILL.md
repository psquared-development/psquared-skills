---
name: check-outreach-status
description: "Check status of sent demo outreach emails and monitor follow-up draft status. Follow-up drafts are created by /setup-email-drafts — this skill only monitors. Run periodically after /setup-email-drafts has been used."
---

# Check Outreach Status

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Outreach Status Check started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## STEP 0 — Check Environment

Read the `.env` file using the Read tool. Do NOT use `source` — values contain semicolons that break shell parsing.

Required tokens:
- **`PSQUARED_CRM_TOKEN`** — CRM GraphQL API
- **`EMAIL_DRAFT_ONLY_BEARER`** — notification service draft API (can read, create, update drafts — cannot send)

Stop if missing.

> **Once verified:** `Environment OK. Checking sent outreach...`

---

## STEP 1 — Find SENT Opportunities

Query CRM for opportunities with `demoStatus = SENT`:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d '{"query":"{ opportunities(filter: { stage: { eq: SCREENING }, demoStatus: { eq: SENT } }, first: 50) { edges { node { id name outreachSentAt demoUrl { primaryLinkUrl } company { id name domainName { primaryLinkUrl } people(first: 5) { edges { node { id name { firstName lastName } emails { primaryEmail } } } } } } } } }"}'
```

For each opportunity:
- Use `outreachSentAt` timestamp to calculate days since sent

> **Announce:**
> ```
> Found [N] opportunities with SENT status:
> 1. [Company] — sent [N] days ago
> 2. [Company] — sent [N] days ago
> ```

---

## STEP 2 — Classify Opportunities

For each opportunity, classify by days since sent:

| Days since sent | Classification |
|-----------------|----------------|
| < 5 days | Too early — no follow-up needed yet |
| 5-10 days | Awaiting follow-up |
| > 10 days | Cold — no response after 10+ days |

Also check: if the opportunity stage has moved beyond SCREENING (e.g., MEETING, PROPOSAL), mark as "already progressed".

---

## STEP 3 — Check Follow-up Draft Status

For each opportunity that is 5+ days old, check whether a follow-up draft already exists in the notification service:

```bash
curl -s -X GET "https://notifications.psquared.dev/drafts?crmOpportunityId=[opportunity ID]&draftType=followup" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER"
```

For each result, note the draft status (e.g., `DRAFT`, `SENT`, `PENDING`).

> **This skill does NOT create follow-up drafts. Follow-ups are created by /setup-email-drafts.**

---

## STEP 4 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Outreach Status Check complete.
>
> Follow-up drafts pending send: [N]
>   - [Company A] → email (sent 6 days ago) [status: DRAFT]
>   - [Company B] → email (sent 8 days ago) [status: DRAFT]
>
> Follow-ups already sent: [N]
>   - [Company C] — follow-up sent
>
> Too early for follow-up: [N]
>   - [Company D] — sent 2 days ago
>
> Already progressed: [N]
>   - [Company E] — stage moved to MEETING
>
> Cold leads (10+ days, no follow-up draft): [N]
>   - [Company F] — sent 12 days ago ⚠️ (run /setup-email-drafts to create follow-up)
>
> Next step: Review and send follow-ups at
> → notifications.psquared.dev/drafts
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## CRM Fields Reference

**Reads:** `demoStatus` (filter SENT), `outreachSentAt` (days since sent), `demoUrl`, `stage`, contact info

**Does NOT write any fields.** The notification service handles CRM updates on actual send.
