---
name: initiate-inboxmate-knowledge
description: "Load this before any InboxMate work — gives the full architecture: how systems connect, what IDs link what, object states, and the data flow from demo creation through email outreach. Use whenever starting InboxMate pipeline work, debugging cross-system issues, or when a skill references objects/states you don't understand."
---

# InboxMate Architecture & Data Model

This is a context-loading skill. Read it, internalize the model, then proceed with whatever task you were doing.

## The Five Systems

InboxMate spans five independent systems. Each owns its data and exposes its own API. No system directly reads another's database — they're connected through shared IDs.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Twenty CRM  │     │ AgentHub DB  │     │  Notif. Svc  │
│  (GraphQL)   │     │  (Supabase)  │     │   (REST)     │
│              │     │              │     │              │
│ Opportunities│────▶│ demo_pages   │     │ email_drafts │
│ Companies    │  ↑  │ agents       │     │ email_queue  │
│ Campaigns    │  │  │ knowledge_*  │     │              │
│ People/Notes │  │  │              │     │              │
└──────────────┘  │  └──────────────┘     └──────────────┘
                  │         │                    │
                  │    serves demo               │
                  │    page content               │
                  │         ▼                     │
                  │  ┌──────────────┐             │
                  │  │  Demo Pages  │             │
                  │  │  (frontend)  │             │
                  │  │demo.inboxmate│             │
                  │  │.psquared.dev │             │
                  │  └──────────────┘             │
                  │                               │
                  │  ┌──────────────┐             │
                  └──│    Ackee     │◀────────────┘
                     │ (analytics)  │   (tracks views)
                     └──────────────┘
```

## The Key ID: How Objects Link Across Systems

The **CRM Opportunity** is the central record. Everything else hangs off it.

```
CRM Opportunity
  ├── .id              → used as crm_opportunity_id in email_drafts
  ├── .demoId          → points to demo_pages.id in AgentHub DB
  ├── .companyId       → points to CRM Company
  ├── .campaignId      → points to CRM Campaign
  └── .demoStatus      → state machine (see below)

AgentHub: demo_pages
  ├── .id              → this IS the demoId stored in CRM
  ├── .agent_id        → points to agents table
  └── .crm_opportunity_id  → backlink (often NULL, don't rely on it)

AgentHub: agents
  ├── .knowledge_bucket_ids  → uuid[] pointing to knowledge_buckets
  └── .published_at          → non-null means live

AgentHub: knowledge_buckets → knowledge_bucket_items → knowledge_bucket_chunks
  └── items have: source_type ('url' | 'knowledge_link' | 'text' | 'pdf')
  └── items have: embedding_status ('pending' | 'processing' | 'completed' | 'failed')

Notification Service: email_drafts
  ├── .crm_opportunity_id   → links back to CRM Opportunity
  ├── .crm_company_id       → links to CRM Company
  ├── .draft_type            → 'outreach' | 'followup'
  ├── .parent_draft_id       → followup points to its outreach draft
  └── .status                → 'DRAFT' | 'QUEUED' | 'SENT' | 'FAILED'
```

**Critical rule:** The CRM opportunity's `demoId` field is the *only* reliable cross-system link between CRM and AgentHub. The `demo_pages.crm_opportunity_id` column exists but is often NULL. When resolving CRM → demo page, always query CRM for `demoId`, don't query Supabase by `crm_opportunity_id`.

## Object States

### CRM Opportunity.demoStatus (the pipeline state machine)

```
                    ┌─────────────────┐
                    │ PENDING_REVIEW  │ ← demo built, awaiting QA
                    └────────┬────────┘
                     pass │     │ fail
                          ▼     ▼
               ┌────────────┐ ┌───────────┐
               │ OK_TO_SEND │ │ NEEDS_FIX │ → fix → back to PENDING_REVIEW
               └─────┬──────┘ └───────────┘
                     │ campaign + email sent
                     ▼
               ┌──────────┐
               │   SENT   │ ← outreach email sent, outreachSentAt set
               └─────┬────┘
                     │ follow-up sent
                     ▼
            ┌─────────────────┐
            │ FOLLOW_UP_SENT  │
            └─────────────────┘

Skip states (terminal): SKIP_FAULTY_WEBSITE, SKIP_IRRELEVANT, SKIPPED, DISQUALIFIED
```

### CRM Opportunity.stage

| Stage | Meaning |
|---|---|
| `SCREENING` | Outreach phase (all demo pipeline work happens here) |
| `MEETING` | Prospect responded / call scheduled |
| `PROPOSAL` | Quoted or decision-maker demo |
| `CUSTOMER` | Paying customer |

### Email Draft.status

```
DRAFT → (schedule) → QUEUED → (send job) → SENT
                                         → FAILED
```

Follow-up drafts are created alongside initial outreach (linked via `parent_draft_id`), with `send_after_days` controlling when they queue.

### Campaign Structure

Campaigns group opportunities into sendable batches. A campaign has `offerExpiresAt` and `offerText` which are injected into demo pages dynamically (not stored on `demo_pages` directly — the API merges them at read time with a 5-min cache).

## Data Flow: Demo Creation → Email Outreach

### 1. Lead Found → CRM
- Company + Person created in CRM
- No opportunity yet

### 2. Demo Built → AgentHub + CRM
- Agent created via MCP (`create_agent`)
- Knowledge bucket created, URLs scraped, items embedded
- Demo page created via MCP (`create_demo_page`) → returns `demo_pages.id`
- CRM Opportunity created at stage=SCREENING, demoStatus=PENDING_REVIEW
  - `demoId` = the demo page UUID
  - `demoUrl` = `https://demo.inboxmate.psquared.dev/?id=<demoId>`

### 3. QA Review → CRM status change
- `/review-demos` fetches PENDING_REVIEW opportunities
- Checks agent, colors, knowledge, greeting
- Sets demoStatus to OK_TO_SEND or NEEDS_FIX

### 4. Campaign Planned → CRM
- `/plan-campaign` creates a CRM Campaign
- Links selected opportunities via `campaignId`
- Sets `offerText` and `offerExpiresAt` on the campaign

### 5. Email Drafts Created → Notification Service
- `/setup-email-drafts` queries OK_TO_SEND opportunities
- Creates outreach draft + follow-up draft pair per opportunity
- Drafts stored with `crm_opportunity_id` for back-linking

### 6. Emails Scheduled & Sent → Notification Service + CRM
- Admin schedules drafts → status: QUEUED, enters `email_queue`
- Send job fires → status: SENT, CRM updated to demoStatus=SENT
- Follow-up auto-queues based on `send_after_days`

### 7. Prospect Claims Demo → AgentHub
- Prospect clicks CTA on demo page
- Claim flow: clones agent + knowledge to new account
- Marks `demo_pages.claimed = true`
- Sends Telegram notification + welcome email
- Updates CRM stage/status

## API Quick Reference

| System | Endpoint | Auth Token |
|---|---|---|
| CRM | `POST https://crm.psquared.dev/graphql` | `$PSQUARED_CRM_TOKEN` |
| MCP | `POST https://app.psquared.dev/api/mcp` | `$NUXT_MCP_DEMO_TOKEN` |
| Demo API | `GET https://app.psquared.dev/api/demo/<id>` | None (public) |
| Notif. Svc | `https://notifications.psquared.dev/drafts/*` | `$EMAIL_DRAFT_ONLY_BEARER` |
| Sanity Check | `POST https://notifications.psquared.dev/drafts/sanity-check` | `$EMAIL_DRAFT_ONLY_BEARER` |
| Ackee | `POST https://ackee.psquared.dev/api` | `$ACKEE_TOKEN` |
| Supabase | `mcp__plugin_supabase_supabase__execute_sql` | project: `fevtfywriufbqnvbgyrm` |

## Sanity Check

The notification service exposes a sanity check that validates demo agent health. Accepts three input modes:

```json
// By opportunity IDs
{ "crm_opportunity_ids": ["uuid", ...] }

// By campaign
{ "campaign_id": "uuid" }

// By draft IDs
{ "draft_ids": ["uuid", ...] }
```

Returns per-item: `healthy` boolean + `issues` array. Checks: demo page exists, agent published, knowledge buckets non-empty, all items URL-type, all embeddings completed.

## Common Gotchas

1. **CRM uses inline IDs, not parameterized variables.** Twenty CRM's GraphQL does NOT support `$id: ID!` parameters. Always inline UUIDs directly in the query string.

2. **Don't `source .env`** — values contain semicolons. Use `Read` tool or `grep` to extract specific values.

3. **MCP token is `NUXT_MCP_DEMO_TOKEN`** (not `INBOXMATE_DEMO_MCP_TOKEN`). Some older skills use the wrong name.

4. **`knowledge_link` = URL-sourced.** In `knowledge_bucket_items.source_type`, items scraped from URLs are stored as `knowledge_link`, not `url`. Both are valid URL-sourced content.

5. **Campaigns manage deadlines, not individual demos.** Never set `offerExpiresAt` or `offerText` directly on `demo_pages` — these come from the campaign and are merged dynamically at API read time.

6. **Follow-up emails: never mention "follow-up" in the subject.** Body must be unique, not a generic template. Always include `variables` in PUT body when updating drafts.
