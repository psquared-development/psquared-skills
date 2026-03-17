# psquared-skills

Claude Code skills for the psquared team. Install any skill globally with the [skills CLI](https://skills.sh).

## InboxMate Sales Pipeline

These skills form a complete automated sales pipeline. Run them in order:

```
1. /inboxmate-batch-demo    Create demos for CRM leads (or /inboxmate-demo for single)
2. /review-demos             QA demos, auto-fix colors + countdown
3. /setup-email-drafts       Create outreach email drafts + CRM tasks
4. 👤 Manual: Send emails    Review at notifications.psquared.dev/drafts → Send
5. /check-outreach-status    Create follow-up drafts for stale leads (5+ days)
6. 👤 Manual: Send follow-ups
```

See [PIPELINE.md](./PIPELINE.md) for the full pipeline documentation, env vars, KPIs, and daily operations.

## Skills

| Skill | Description | Install |
|-------|-------------|---------|
| [inboxmate-demo](./skills/inboxmate-demo/SKILL.md) | Set up a personalized InboxMate chatbot demo for a single prospect | `npx skills add psquared-development/psquared-skills@inboxmate-demo -g -y` |
| [inboxmate-batch-demo](./skills/inboxmate-batch-demo/SKILL.md) | Batch-create demos for CRM prospects — validates websites, skips bad ones | `npx skills add psquared-development/psquared-skills@inboxmate-batch-demo -g -y` |
| [review-demos](./skills/review-demos/SKILL.md) | QA demos: checks quality, auto-fixes brand colors (OpenBrand) and countdown deadlines | `npx skills add psquared-development/psquared-skills@review-demos -g -y` |
| [setup-email-drafts](./skills/setup-email-drafts/SKILL.md) | Create outreach email drafts + CRM tasks for approved demos | `npx skills add psquared-development/psquared-skills@setup-email-drafts -g -y` |
| [check-outreach-status](./skills/check-outreach-status/SKILL.md) | Check sent outreach, create follow-up drafts for non-responders after 5+ days | `npx skills add psquared-development/psquared-skills@check-outreach-status -g -y` |

## Installation

### Install all pipeline skills at once

```bash
npx skills add psquared-development/psquared-skills@inboxmate-demo -g -y
npx skills add psquared-development/psquared-skills@inboxmate-batch-demo -g -y
npx skills add psquared-development/psquared-skills@review-demos -g -y
npx skills add psquared-development/psquared-skills@setup-email-drafts -g -y
npx skills add psquared-development/psquared-skills@check-outreach-status -g -y
```

The `-g` flag installs globally (available in all projects), `-y` skips confirmation.

### Verify installation

After installing, skills appear in your Claude Code session. Type the skill name (e.g. `/review-demos`) to invoke it, or describe what you want and Claude will use it automatically.

## MCP Setup

Add the InboxMate MCP server to your `~/.claude/settings.json` or project settings:

```json
{
  "mcpServers": {
    "inboxmate-demo": {
      "type": "http",
      "url": "https://app.psquared.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer <ask Martin for the token>"
      }
    }
  }
}
```

## Contributing

1. Create a new directory under `skills/`: `mkdir skills/<skill-name>`
2. Add a `SKILL.md` with frontmatter (`name`, `description`) and instructions
3. Add a row to the Skills table above
4. PR to main

### SKILL.md format

```markdown
---
name: my-skill
description: One-line description used by Claude to decide when to invoke this skill
---

# Skill Title

Instructions for Claude...
```
