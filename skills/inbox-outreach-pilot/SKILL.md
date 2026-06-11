---
name: inbox-outreach-pilot
description: "Autonomous pilot for the InboxMate EMAIL outreach (Demo-Postfach/INBOX track). Assesses where the inbox pipeline stands (leads → demos → review → campaign → drafts) and executes the next sensible step end-to-end, always finishing with the inbox sanity check and a summary of what the user should do next (ideally: just schedule the mails). Runs in save mode by default: orchestration + all quality gates on the top model, data collection on haiku subagents, content generation on sonnet subagents (pass 'full' to disable). Use when asked to 'advance the email outreach', 'run the inbox pipeline', or 'what's next for the Demo-Postfach motion'."
---

# Inbox Outreach Pilot (Demo-Postfach)

One command that moves the EMAIL outreach forward, wherever it stands. It NEVER touches the chatbot track (`demoType: CHATBOT`/null) and it NEVER sends emails — sending/scheduling stays human. Inbox demos are meeting-only (no signup CTA): success = prospect books a call, at **notifications.psquared.dev → sidebar switch "Inbox"**.

## Autonomy

Run autonomously through the stages. The INBOX track runs offer-free (no offerText, no deadlines — never ask for them). The only human gate is scheduling the mails. Process → report at the end.

## Save mode — model routing (DEFAULT)

`/inbox-outreach-pilot [full]` — save mode is the default; pass `full` to run everything on the main model.

YOU (the orchestrator, on the session's top model) keep all judgment. Delegate volume work to subagents via the Agent tool with an explicit `model` override:

| Work | Who/model | Examples |
|------|-----------|----------|
| Orchestration, decisions, ALL quality gates | **Main loop (no delegation)** — never delegate: sanity-result interpretation, hallucination spot-checks of drafts vs website, review verdicts (OK_TO_SEND/NEEDS_FIX), anything that writes demoStatus | STEP 2 routing, STEP 3 entirely |
| Mechanical data collection | **Subagent, `model: "haiku"`** | CRM state queries + client-side joins (STEP 1b), website reachability checks, skip-list lookups, scraping page content for research, collecting draft lists from the notification API |
| Customer-facing content generation | **Subagent, `model: "sonnet"`** | Per-company inbox demo building (research synthesis → Befund → seeded threads → `create_inbox_demo` → CRM opp), outreach draft copy via `/setup-email-drafts` variables. One subagent per company, parallel where independent. |

Rules:
- Content subagents (sonnet) must return the demoId/draftId AND their evidence (which website pages they used) so YOU can verify — their output is never trusted unverified; the STEP 3 sanity gate + your own spot-check always run on the main model.
- If a sonnet subagent's demo fails review twice, rebuild that one yourself on the main model instead of a third delegation.
- Haiku is for fetch-and-format only — never let it make include/exclude decisions about leads or content.
- In `full` mode: same flow, no model overrides.

## STEP 0 — Environment

Read `.env` (agenthub repo root or cwd): `PSQUARED_CRM_TOKEN`, `NUXT_MCP_DEMO_TOKEN`, `OPENBRAND_API_KEY`, `EMAIL_DRAFT_ONLY_BEARER` (and `NOTIFICATIONS_SERVICE_BEARER_TOKEN` if present). Missing token → stop and ask.

## STEP 1 — Assess the INBOX pipeline state

Gather ALL of these counts before deciding anything (announce the table):

```bash
# a) INBOX opportunities per stage
curl -s -X POST https://crm.psquared.dev/graphql -H "Content-Type: application/json" -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" -d '{"query":"{ pending: opportunities(filter: { demoType: { eq: INBOX }, demoStatus: { eq: PENDING_REVIEW } }) { totalCount } needsFix: opportunities(filter: { demoType: { eq: INBOX }, demoStatus: { eq: NEEDS_FIX } }) { totalCount } okUnassigned: opportunities(filter: { demoType: { eq: INBOX }, demoStatus: { eq: OK_TO_SEND }, campaignId: { is: NULL } }) { totalCount } okAssigned: opportunities(filter: { demoType: { eq: INBOX }, demoStatus: { eq: OK_TO_SEND }, campaignId: { is: NOT_NULL } }, first: 100) { edges { node { id campaignId } } totalCount } sent: opportunities(filter: { demoType: { eq: INBOX }, demoStatus: { eq: SENT } }) { totalCount } }"}'
```

```bash
# b) INBOX-track leads without a demo: companies tagged INBOX_MATE whose
# qualification note says "Track: INBOX" and that have NO opportunity yet.
# Fetch companies + their notes + opportunities and join client-side
# (same approach as /inboxmate-batch-demo Step 1).
```

```bash
# c) Inbox drafts awaiting action (DRAFT = unscheduled, QUEUED = scheduled)
curl -s "https://notifications.psquared.dev/drafts?track=inbox&status=DRAFT&pageSize=200" -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER"
curl -s "https://notifications.psquared.dev/drafts?track=inbox&status=QUEUED&pageSize=200" -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER"
```

## STEP 2 — Decide and execute the next step

Work TOP-DOWN through this priority list. Execute the FIRST matching action; after it completes, re-assess (STEP 1) and continue down the list in the same run as long as steps complete autonomously. Stop looping when you hit a human gate (drafts ready to schedule, or a question like the offer deadline).

| # | Condition | Action |
|---|-----------|--------|
| 1 | Unscheduled inbox drafts exist (`DRAFT` > 0) | **Sanity-gate them (STEP 3), then stop** — the user's move is scheduling. Do NOT create more work in parallel; a pending send batch has priority. |
| 2 | `okAssigned` > 0 but those campaigns have no drafts yet | Run `/setup-email-drafts` for that campaign (it routes INBOX opps to the inbox-demo-outreach template UUIDs automatically). |
| 3 | `okUnassigned` > 0 | Run `/plan-campaign inbox` (inbox campaigns are offer-free — name only, no questions). |
| 4 | `needsFix` > 0 | Fix inbox demos: read `demoReviewIssues` from the CRM, repair via `update_inbox_demo` (full inboxThreads replacement), reset to PENDING_REVIEW — then continue to #5. |
| 5 | `pending` > 0 | Run `/review-demos inbox`. |
| 6 | INBOX-track leads without demos exist (b) | Run `/inboxmate-inbox-demo` per company (or `/inboxmate-batch-demo inbox` for >3). No offers/deadlines. |
| 7 | No INBOX leads at all | Run `/find-leads 15 inbox`. |
| 8 | Everything empty AND `sent` > 0 | Run `/check-outreach-status` and report follow-up state. |

## STEP 3 — MANDATORY sanity check before handing over

Whenever drafts are involved (created this run, or found in `DRAFT`/`QUEUED` status), ALWAYS run the inbox-aware sanity check before the final summary — no exceptions:

```bash
curl -s -X POST https://notifications.psquared.dev/drafts/sanity-check \
  -H "Content-Type: application/json" -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER" \
  -d '{"draft_ids": ["<id>", ...]}'   # or {"campaign_id": "<uuid>"}
```

The backend detects `demoType: INBOX` automatically and checks: demo API reachable with `type=inbox`, ≥3 seeded threads, ≥1 AI draft present, action mix (archive thread), no offer set (inbox demos are offer-free), not already claimed, draft HTML (CTA href = demo link, footer, campaign_id set, umlauts, body length), follow-up linkage.

- Any `healthy: false` → fix the cause first (demo via `update_inbox_demo`, draft via `PUT /drafts/:id`), re-run the check, only then hand over.
- ADDITIONALLY spot-check 2-3 drafts yourself: open the demoUrl, read one AI draft against the prospect's website — **no invented prices/policies** (the check can't catch hallucinations; you can).

## STEP 4 — Final summary (always)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INBOX OUTREACH — Status nach diesem Lauf
  Leads (Track INBOX, ohne Demo):  [n]
  Demos PENDING_REVIEW:            [n]
  Demos NEEDS_FIX:                 [n]
  OK_TO_SEND (ohne Kampagne):      [n]
  Kampagne [Name]: [n] Drafts, Sanity: [n]/[n] healthy
  Bereits SENT:                    [n]

Was diesem Lauf passiert ist: [1-3 Zeilen]

➡ DEIN NÄCHSTER SCHRITT: [exactly ONE action, e.g.
  "Drafts prüfen & schedulen: notifications.psquared.dev/drafts → Sidebar 'Inbox' → Kampagne [X] → Schedule"
  or the concrete blocker]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Guardrails

- NEVER send or schedule emails — human-only.
- NEVER touch chatbot-track opportunities, campaigns or drafts.
- NEVER mix demoTypes in one campaign.
- The closed-campaign guard in `/setup-email-drafts`: for offer-free inbox campaigns only the sent-drafts half applies.
- Companies whose `outreachFor` contains `PERSONAL_ONLY`: hands off, always.
