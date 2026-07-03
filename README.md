# psquared-skills

Claude Code skills for the psquared team. Install all skills globally:

```bash
npx skills add psquared-development/psquared-skills -g -y
```

## InboxMate Sales Pipeline

### Pipeline Overview

```
Start here:
  /initiate-inboxmate-knowledge  Load architecture, IDs, states, data flow — run before any work

Stage 0: Lead Generation
  /find-leads [N]                Find N qualified German B2B leads, add to CRM

Stage 1: Demo Creation
  /inboxmate-batch-demo          Batch-create demos for all CRM leads without demos
  /inboxmate-demo <company>      Create a single demo (used by batch, or standalone)

Stage 2: Quality Assurance
  /review-demos                  QA all PENDING_REVIEW demos, flag OK_TO_SEND or NEEDS_FIX
  /fix-demos                     Auto-fix NEEDS_FIX demos, resubmit for review
  /sanity-check [status|campaign:<id>]   Validate agent health (knowledge, embeddings, published)

Stage 3: Campaign Planning
  /plan-campaign                 Group OK_TO_SEND demos into a named campaign with deadline

Stage 4: Email Outreach
  /setup-email-drafts [campaignId]   Create outreach + follow-up draft pairs per opportunity
  /refine-email-drafts               Apply change requests to drafts (du/Sie, shorten, etc.)
  👤 Review drafts                   notifications.psquared.dev/drafts
  👤 Schedule & send                 notifications.psquared.dev/queue

Stage 5: Monitoring
  /check-outreach-status         Monitor sent emails, follow-up status, flag cold/hot leads
  /check-demo-analytics          Full funnel report (Ackee views + CRM + email stats)

Maintenance (run anytime):
  /refurbish-demos               Upgrade knowledge for existing demos (clear + re-scrape)
  /sanity-check                  Spot-check agent health at any pipeline stage
```

### When to Use Each Skill

| Skill | When | Input | Output |
|-------|------|-------|--------|
| `/find-leads` | Need new prospects | Number of leads | CRM companies + people |
| `/inboxmate-batch-demo` | CRM has companies without demos | — | Demos + PENDING_REVIEW opportunities |
| `/inboxmate-demo` | Single prospect needs a demo | Company name/URL | One demo + opportunity |
| `/review-demos` | PENDING_REVIEW demos exist | — | Demos marked OK_TO_SEND or NEEDS_FIX |
| `/fix-demos` | NEEDS_FIX demos exist | — | Demos fixed and resubmitted |
| `/sanity-check` | Before sending, or after batch ops | Status / campaign ID / draft IDs | Health report |
| `/plan-campaign` | OK_TO_SEND demos ready, no campaign | — | CRM campaign with linked opportunities |
| `/setup-email-drafts` | Campaign planned, demos approved | Optional campaign ID | Email drafts in notification service |
| `/refine-email-drafts` | Drafts have change requests | — | Updated draft HTML |
| `/check-outreach-status` | Emails sent, monitoring phase | — | Status report per lead |
| `/check-demo-analytics` | Want funnel metrics | — | Ackee + CRM + email analytics report |
| `/refurbish-demos` | Demos have stale/thin knowledge | Campaign ID or list | Re-scraped knowledge buckets |
| `/price-change` | Pricing update needed | New prices | All touchpoints updated |

### Context Skills (load before working)

| Skill | Purpose |
|-------|---------|
| `/initiate-inboxmate-knowledge` | Architecture overview — systems, IDs, states, data flow. Load before any InboxMate work. |
| `/analyse-inboxmate` | Detailed reference — repos, SQL examples, Ackee queries, env vars. For deep debugging. |

## All Skills

### InboxMate Pipeline

| Skill | Description |
|-------|-------------|
| [initiate-inboxmate-knowledge](./skills/initiate-inboxmate-knowledge/SKILL.md) | Architecture overview: systems, ID relationships, state machines, data flow |
| [analyse-inboxmate](./skills/analyse-inboxmate/SKILL.md) | Detailed reference guide with SQL examples, queries, env vars |
| [find-leads](./skills/find-leads/SKILL.md) | Find qualified German B2B leads with legal validation |
| [inboxmate-demo](./skills/inboxmate-demo/SKILL.md) | Create a personalized demo for a single prospect |
| [inboxmate-batch-demo](./skills/inboxmate-batch-demo/SKILL.md) | Batch-create demos for CRM prospects |
| [review-demos](./skills/review-demos/SKILL.md) | QA demos: check colors, knowledge, greeting, auto-fix where possible |
| [fix-demos](./skills/fix-demos/SKILL.md) | Fix NEEDS_FIX demos and resubmit for review |
| [sanity-check](./skills/sanity-check/SKILL.md) | Validate demo agent health (knowledge, embeddings, published state) |
| [plan-campaign](./skills/plan-campaign/SKILL.md) | Create CRM campaign, link approved demos with shared deadline |
| [setup-email-drafts](./skills/setup-email-drafts/SKILL.md) | Create outreach + follow-up email draft pairs |
| [refine-email-drafts](./skills/refine-email-drafts/SKILL.md) | Apply admin change requests to email drafts |
| [check-outreach-status](./skills/check-outreach-status/SKILL.md) | Monitor sent emails and follow-up status |
| [check-demo-analytics](./skills/check-demo-analytics/SKILL.md) | Full funnel analytics (Ackee + CRM + emails) |
| [refurbish-demos](./skills/refurbish-demos/SKILL.md) | Upgrade knowledge for existing demos |

### SEO

| Skill | Description |
|-------|-------------|
| [seo](./skills/seo/SKILL.md) | Audit or fix SEO issues for a single website — meta tags, structured data, i18n, content quality |
| [seo-all](./skills/seo-all/SKILL.md) | Run SEO audit/fix across all psquared sites in parallel, combined report |

### Operations

| Skill | Description |
|-------|-------------|
| [price-change](./skills/price-change/SKILL.md) | Change pricing across all touchpoints (website, app, docs, Stripe) |
| [create-offer](./skills/create-offer/SKILL.md) | Generate a branded multi-page client offer PDF (title + project description + screenshots + Angebot + AGB) from a JSON config. Two-pass Playwright render with pagination + pdf-lib merge. |

### ProcessFlow Review (neverlost)

psquared red-teams **and** refines the AI-generated process analyses in neverlost's **ProcessFlow**
app (paid engagement per customer). The AI concepts are routinely wrong — invented tools/brands, wrong
industry, rebuilding what the ERP already does, wrong AI technique, mis-priced. These skills catch that
and produce presentation-ready concepts.

**Two knowledge skills** (always available, referenced by the rest):

| Skill | Role |
|-------|------|
| [processflow-review](./skills/processflow-review/SKILL.md) | Knowledge base: guardrails (Definition of Done in `references/guardrails.md`, incl. the **Fehlermuster-Register**), principles, selection tiers. |
| [processflow-app](./skills/processflow-app/SKILL.md) | Driver: local helper tool + Chrome-MCP editing (Konzept-Copilot, Canvas-Copilot). Tool repo: [processflow-tool](https://github.com/psquared-development/processflow-tool). |

**Four workflow skills** (the operational split):

| Skill | Param | Does |
|-------|-------|------|
| [processflow-overview](./skills/processflow-overview/SKILL.md) | — | Start at zero for a new company: context → read transcript (from the company folder) → ingest processes → triage by Analyse-Reihenfolge → **top-10 worklist**. Builds nothing. |
| [processflow-process](./skills/processflow-process/SKILL.md) | process name | Work ONE process until all guardrails pass (transcript-check, rework concept+canvas+diagrams, re-score, sync helper app). |
| [processflow-critic](./skills/processflow-critic/SKILL.md) | process name | Red-team ONE process from the critical lens (walks the Fehlermuster-Register + web-researches tools/prices/technique) → issue list. Fixes nothing. |
| [processflow-run](./skills/processflow-run/SKILL.md) | process name | **Per-terminal wrapper:** process → critic → incorporate feedback, looped until clean. |

#### Multi-terminal workflow for a new company
1. **One agent** runs `processflow-overview` → produces the top-10 worklist + context brief.
2. **Split the conversation into ~10 terminals** (one per process).
3. **Each terminal** runs `processflow-run <its process name>` — it works the process, self-critiques
   from the customer lens, and incorporates the feedback until every guardrail is met.
4. **The human** (Martin) then flips **HI-freigegeben** per process; **Dominik** names the presentation
   date. Agents never do either.

**Crew coordination:** the parallel agents share a company-wide **Team-Update feed** in the helper app
(`GET/POST /api/update(s)`). Each `processflow-run` reads it at start + periodically and posts any
cross-cutting finding (invented/real tools, industry, shared modules like InboxMate intake or
article-matching, OS-consolidation, pricing facts, system-of-record) so the others don't re-derive or
contradict it. Process-specific detail stays in `review.json`; only cross-cutting goes to the feed. Each
agent stays on its own process.

Key guardrails distilled from real ZIWA + Stütz reviews: transcript-check every process ·
**scenario-correct** (concept ≠ real process) · **industry-correct** (wrong branch hallucinated) ·
**no-invent** (tools/brands/ERP names — e.g. SAP, XEROX were invented) · **use existing ERP/tool
capabilities** instead of rebuilding (IPTOR native replenishment, IDP tools, InboxMate) ·
**right AI technique** (embeddings vs. describing-VLM; rules vs. ML) · **pricing_verified**
(web-check "included/free" claims) · smallest-but-not-undermotorized · architecture diagram +
storyline test per process · BMD = unverified integration risk. Full list + examples in
`processflow-review/references/guardrails.md`.

## Contributing

1. `mkdir skills/<skill-name>`
2. Add `SKILL.md` with frontmatter (`name`, `description`)
3. Add to the table above
4. PR to main
