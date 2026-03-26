---
name: sanity-check
description: "Verify all InboxMate demo agents are properly configured — checks greetings, quick questions, knowledge, colors, and CRM linkage. Run after batch demo creation or before sending outreach."
---

# Sanity Check — InboxMate Demo Agents

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Sanity Check started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## STEP 0 — Check Environment

Read the `.env` file in the current working directory:

Required tokens:
- `EMAIL_DRAFT_ONLY_BEARER` — for calling the notification service sanity check endpoint
- `PSQUARED_CRM_TOKEN` — for querying CRM opportunities

If either is missing, **stop** and ask the user.

---

## STEP 1 — Select Targets

Ask the user what to check. Options:

**A) By CRM stage/status** — query CRM for opportunities matching a filter:
- `demoStatus = PENDING_REVIEW` (pre-send QA)
- `demoStatus = OK_TO_SEND` (about to send)
- `demoStatus = SENT` (already sent, verify nothing broke)
- A specific campaign ID

**B) All visible drafts** — check everything currently in the notification service draft queue

**C) Specific opportunity IDs** — user provides a list

### Querying CRM

For options A/B, query the CRM to collect opportunity IDs:

```
POST https://crm.psquared.dev/graphql
Authorization: Bearer $PSQUARED_CRM_TOKEN
Content-Type: application/json

{
  "query": "{ opportunities(first: 500, filter: { stage: { eq: SCREENING }, demoStatus: { eq: <STATUS> } }) { edges { node { id demoId companyId company { name } } } totalCount } }"
}
```

Collect all `id` values from the response.

---

## STEP 2 — Run Sanity Check via Notification Service

Call the sanity check endpoint with the collected opportunity IDs:

```
POST https://notifications.psquared.dev/drafts/sanity-check
Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER
Content-Type: application/json

{
  "crm_opportunity_ids": ["uuid1", "uuid2", ...]
}
```

**Max 200 IDs per request.** If more than 200, batch into multiple calls.

The endpoint:
1. Resolves each CRM opportunity → demo page ID (via CRM `demoId` field)
2. Calls the agenthub Supabase RPC to validate each demo agent
3. Returns results mapped back to CRM opportunity IDs

### Response format

```json
{
  "success": true,
  "data": [
    {
      "crm_opportunity_id": "uuid",
      "demo_found": true,
      "agent_found": true,
      "agent_published": true,
      "claimed": false,
      "bucket_count": 1,
      "total_bucket_items": 7,
      "bucket_has_items": true,
      "all_items_url_type": true,
      "non_url_items": 0,
      "all_items_embedded": true,
      "failed_items": 0,
      "processing_items": 0,
      "issues": [],
      "healthy": true
    }
  ]
}
```

---

## STEP 3 — Report Results

Group results into three categories:

### Healthy
All checks pass. Show count and list company names.

### Warnings (healthy but with notes)
- `claimed = true` — demo was already claimed by a prospect (still healthy, but worth noting)

### Unhealthy
Show each unhealthy item with:
- Company name (from CRM query in Step 1)
- List of issues from the `issues` array
- Suggested action:
  - `"No demo linked in CRM"` → demo was never created, run `/inboxmate-demo`
  - `"Demo page not found"` → demo page deleted or demoId mismatch in CRM
  - `"Agent not found"` → agent was deleted, needs rebuild
  - `"Agent not published"` → run `publish_agent` via MCP
  - `"No knowledge buckets assigned"` → run `/fix-demos` or rebuild
  - `"Knowledge bucket is empty"` → knowledge items failed to scrape, re-scrape
  - `"N knowledge items are not URL type"` → unexpected item types in bucket
  - `"N knowledge items have failed embeddings"` → re-index needed
  - `"N knowledge items still processing"` → wait and re-check

### Summary line

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sanity Check Complete
✓ Healthy: N    ⚠ Warnings: N    ✗ Unhealthy: N
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 4 — Offer Next Steps

Based on results, suggest:

- If unhealthy items exist: "Run `/fix-demos` to attempt auto-fixes, or `/inboxmate-demo <company>` to rebuild specific demos"
- If all healthy and status is OK_TO_SEND: "Ready for `/setup-email-drafts`"
- If all healthy and status is SENT: "Pipeline looks good. Run `/check-outreach-status` to monitor responses"
