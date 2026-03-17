# psquared-skills

Claude Code skills for the psquared team. Install all skills globally:

```bash
npx skills add psquared-development/psquared-skills -g -y
```

## Skills

### InboxMate Sales Pipeline

Run in order. Human control points are email review + send only.

```
1. /inboxmate-batch-demo      Create demos for CRM leads
2. /review-demos               QA demos, auto-fix colors + countdown
3. /setup-email-drafts         Create outreach email drafts + CRM tasks
4. 👤 Send emails              notifications.psquared.dev/drafts → Send
5. /check-outreach-status      Follow-up drafts for stale leads (5+ days)
6. 👤 Send follow-ups
7. /check-demo-analytics       Report on demo page visits, conversions, pipeline health
```

See [PIPELINE.md](./PIPELINE.md) for full documentation.

| Skill | Description |
|-------|-------------|
| [inboxmate-demo](./skills/inboxmate-demo/SKILL.md) | Set up a personalized InboxMate demo for a single prospect |
| [inboxmate-batch-demo](./skills/inboxmate-batch-demo/SKILL.md) | Batch-create demos for CRM prospects |
| [review-demos](./skills/review-demos/SKILL.md) | QA demos: auto-fix brand colors (OpenBrand) and countdown deadlines |
| [setup-email-drafts](./skills/setup-email-drafts/SKILL.md) | Create outreach email drafts + CRM tasks for approved demos |
| [check-outreach-status](./skills/check-outreach-status/SKILL.md) | Create follow-up drafts for non-responders after 5+ days |
| [check-demo-analytics](./skills/check-demo-analytics/SKILL.md) | Query Ackee + CRM for demo page visits, conversions, pipeline health |

### Other Skills

_(Add non-pipeline skills here as they're created)_

## Contributing

1. `mkdir skills/<skill-name>`
2. Add `SKILL.md` with frontmatter (`name`, `description`)
3. Add to the table above
4. PR to main
