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

## Contributing

1. `mkdir skills/<skill-name>`
2. Add `SKILL.md` with frontmatter (`name`, `description`)
3. Add to the table above
4. PR to main
