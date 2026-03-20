# psquared-skills

Claude Code skills for the psquared team. Install all skills globally:

```bash
npx skills add psquared-development/psquared-skills -g -y
```

## Skills

### InboxMate Sales Pipeline

Run in order. Human control points are email review + send only.

```
0. /find-leads [N]             Find N new qualified leads (DE/AT, legal checks, adds to CRM)
1. /inboxmate-batch-demo      Create demos for CRM leads
2. /review-demos               QA demos, auto-fix colors + countdown
2b. /fix-demos                  Fix demos flagged as NEEDS_FIX, resubmit for review
3. /setup-email-drafts         Create outreach email drafts + CRM tasks
4. 👤 Review drafts            notifications.psquared.dev/drafts → add change requests if needed
5. /refine-email-drafts        Apply change requests to drafts (du/Sie, shorten, etc.)
6. 👤 Send emails              notifications.psquared.dev/drafts → Send
7. /check-outreach-status      Follow-up drafts for stale leads (5+ days)
8. 👤 Send follow-ups
9. /check-demo-analytics       Report on demo page visits, conversions, pipeline health
```

See [PIPELINE.md](./PIPELINE.md) for full documentation.

| Skill | Description |
|-------|-------------|
| [inboxmate-demo](./skills/inboxmate-demo/SKILL.md) | Set up a personalized InboxMate demo for a single prospect |
| [inboxmate-batch-demo](./skills/inboxmate-batch-demo/SKILL.md) | Batch-create demos for CRM prospects |
| [review-demos](./skills/review-demos/SKILL.md) | QA demos: auto-fix brand colors (OpenBrand) and countdown deadlines |
| [fix-demos](./skills/fix-demos/SKILL.md) | Fix demos flagged as NEEDS_FIX — re-scrape, fix colors/content/questions, resubmit for review |
| [setup-email-drafts](./skills/setup-email-drafts/SKILL.md) | Create outreach email drafts + CRM tasks for approved demos |
| [check-outreach-status](./skills/check-outreach-status/SKILL.md) | Create follow-up drafts for non-responders after 5+ days |
| [refine-email-drafts](./skills/refine-email-drafts/SKILL.md) | Apply change requests to drafts (du/Sie, shorten, rewrite, etc.) |
| [find-leads](./skills/find-leads/SKILL.md) | Find N new qualified DE/AT leads — legal checks, public email validation, CRM entry with justification |
| [check-demo-analytics](./skills/check-demo-analytics/SKILL.md) | Query Ackee + CRM for demo page visits, conversions, pipeline health |

### Operations

| Skill | Description |
|-------|-------------|
| [price-change](./skills/price-change/SKILL.md) | Change InboxMate pricing, features, or campaign coupons across all touchpoints (website, app, docs, terms, Stripe, demo page) |

## Contributing

1. `mkdir skills/<skill-name>`
2. Add `SKILL.md` with frontmatter (`name`, `description`)
3. Add to the table above
4. PR to main
