---
name: check-demo-analytics
description: "Report on InboxMate demo page visits, email engagement, and pipeline health. Queries Ackee analytics and CRM to show which demos are getting traffic, which leads are converting, and which need attention."
---

# Check Demo Analytics

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Demo Analytics Report
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## STEP 0 — Check Environment

Read `.env` in the current directory and source it.

Required tokens (variable names should be obvious from context):
- **CRM API** — contains "CRM" + "TOKEN"
- **Ackee API** — contains "ACKEE" + "TOKEN", and an "ACKEE" + "DOMAIN" URL

Stop if missing.

**Ackee config:**
- API: `$<ACKEE_DOMAIN_VAR>/api` (GraphQL)
- Demo domain ID: `976e767e-cd96-48b4-be97-75b4978cc777`
- Auth: `Authorization: Bearer $<ACKEE_TOKEN_VAR>`

> **Once verified:** `Environment OK. Pulling analytics...`

---

## STEP 1 — Get Demo Page Views from Ackee

Query Ackee for page-level statistics on the demo domain:

```bash
curl -s -X POST "$<ACKEE_DOMAIN_VAR>/api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<ACKEE_TOKEN_VAR>" \
  -d '{"query":"{ domain(id: \"976e767e-cd96-48b4-be97-75b4978cc777\") { statistics { pages(sorting: TOP, range: LAST_30_DAYS) { id value count } views(interval: DAILY, type: UNIQUE, limit: 30) { id count } } } }"}'
```

From the `pages` results, extract views per demo page. The `value` field contains the URL path (e.g., `/?id=abc123`). Map each `id` parameter to a demo.

Also get total unique views over the last 30 days from the `views` array.

---

## STEP 2 — Get Pipeline State from CRM

Query CRM for all active opportunities at SCREENING stage:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d '{"query":"{ opportunities(filter: { stage: { eq: SCREENING } }, first: 100) { edges { node { id name demoStatus demoUrl { primaryLinkUrl } company { name } createdAt } } } }"}'
```

Also get recently converted (PROPOSAL stage):

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $<CRM_TOKEN_VAR>" \
  -d '{"query":"{ opportunities(filter: { stage: { eq: PROPOSAL } }, first: 20) { edges { node { id name company { name } createdAt } } } }"}'
```

---

## STEP 3 — Cross-Reference & Analyze

For each SCREENING opportunity with a demoUrl:
1. Extract the demoId from the URL (`?id=xxx`)
2. Find matching Ackee page views (match on `/?id=xxx` path)
3. Calculate days since outreach was sent (from demoStatus timestamps)

Categorize each opportunity:

| Category | Criteria | Action needed |
|----------|----------|--------------|
| **Hot** | Views > 0 + demoStatus = SENT/FOLLOW_UP_SENT | Prospect is engaging — consider direct outreach |
| **Warm** | Views > 0 + not yet sent | Demo is getting organic traffic — prioritize sending |
| **Cold** | Views = 0 + SENT > 7 days ago | No engagement — follow-up or deprioritize |
| **Fresh** | SENT < 5 days ago | Too early to judge |
| **Pending** | PENDING_REVIEW or OK_TO_SEND | Still in pipeline — not yet sent |
| **Converted** | Stage = PROPOSAL | Already signed up |

---

## STEP 4 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Demo Analytics Report — [date]
>
> 📊 Overall (last 30 days):
>   Total demo page views: [N]
>   Unique visitors: [N]
>
> 🔥 Hot leads (views + email sent):
>   - [Company A] — [N] views, sent [N] days ago
>   - [Company B] — [N] views, sent [N] days ago
>
> 🟡 Warm (views, not yet sent):
>   - [Company C] — [N] views, outreach pending
>
> 🧊 Cold (no views, sent 7+ days ago):
>   - [Company D] — 0 views, sent [N] days ago
>   - [Company E] — 0 views, follow-up sent [N] days ago
>
> ⏳ Fresh (sent < 5 days):
>   - [Company F] — sent [N] days ago
>
> 📋 Pipeline:
>   - Pending review: [N]
>   - Ready to send: [N]
>   - Sent: [N]
>   - Follow-up sent: [N]
>
> ✅ Converted: [N]
>   - [Company G] — signed up [date]
>
> 💡 Recommendations:
>   [Personalized suggestions based on data, e.g.:]
>   - "Company A has 5 views but hasn't signed up — consider a personal follow-up"
>   - "3 demos have 0 views after 10 days — these leads may be dead"
>   - "2 demos are still pending review — run /review-demos"
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
