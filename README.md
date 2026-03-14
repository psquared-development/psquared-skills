# psquared-skills

Claude Code skills for the psquared team. Install any skill globally with the [skills CLI](https://skills.sh).

## Skills

| Skill | Description | Install |
|-------|-------------|---------|
| [inboxmate-demo](./skills/inboxmate-demo/SKILL.md) | Set up a personalized InboxMate chatbot demo for a sales prospect — researches the company, scrapes content, calls MCP, delivers a playground URL | `npx skills add psquared-development/psquared-skills@inboxmate-demo -g -y` |

## Installation

### Install all skills at once

```bash
npx skills add psquared-development/psquared-skills@inboxmate-demo -g -y
```

### Install a specific skill

```bash
npx skills add psquared-development/psquared-skills@<skill-name> -g -y
```

The `-g` flag installs globally (available in all projects), `-y` skips confirmation.

### Verify installation

After installing, the skill appears in your Claude Code session. Type `/inboxmate-demo` to invoke it, or just describe what you want and Claude will use it automatically.

## Using Skills

### `inboxmate-demo`

Invoke with `/inboxmate-demo` or naturally:

> "Set up an InboxMate demo for Acme Corp at acme.com — they do B2B SaaS invoicing, brand color is #3b82f6"

Claude will:
1. Scrape the company website (homepage, about, pricing, FAQ)
2. Craft a system prompt, greeting, and quick questions
3. Call the MCP server to create the agent + knowledge
4. Return a playground URL ready to share with the prospect

**Prerequisites:** The MCP server must be configured in your Claude Code settings with the bearer token. See [MCP Setup](#mcp-setup) below.

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

Or configure it via the Claude Code MCP UI (`/mcp` command).

## Contributing

1. Create a new directory: `mkdir <skill-name>`
2. Add a `SKILL.md` with frontmatter (`name`, `description`) and instructions
3. Add a row to the table above
4. PR to main

### SKILL.md format

```markdown
---
name: my-skill
description: One-line description used by Claude to decide when to invoke this skill automatically
---

# Skill Title

Instructions for Claude...
```
