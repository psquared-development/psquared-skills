---
name: inboxmate-demo
description: "Set up a personalized InboxMate demo chatbot for a sales prospect. Use when asked to create a demo, set up an InboxMate playground, or prepare a chatbot demo. Guides the full pipeline: research company, scrape content, call MCP, deliver playground URL."
---

# InboxMate Demo Setup Pipeline

You are setting up a personalized InboxMate chatbot demo for a sales prospect using the MCP server at `https://app.psquared.dev/api/mcp`.

## MCP Connection

**URL:** `https://app.psquared.dev/api/mcp`
**Auth:** Bearer token from `NUXT_MCP_DEMO_TOKEN` env var (ask Martin if needed)
**Transport:** Streamable HTTP (JSON-RPC 2.0 POST requests)

## Your Process

### Step 1: Research the Company

Given a company name and/or domain, gather:
- What they do (core product/service)
- Target customers
- Key features / USPs
- Pricing (if public)
- Team/founders info
- FAQs or common customer questions
- Contact info
- Any recent news or case studies

**Tools available:** WebFetch the company website directly. Fetch multiple pages: homepage, /about, /pricing, /features, /faq, /contact. Be thorough — the more content, the better the demo.

### Step 2: Craft Demo Content

Before calling MCP, prepare:

1. **systemPrompt** — Persona instructions for the agent:
   ```
   You are [Name], the AI assistant for [Company]. You help [target customer] with [main use case].
   Always be helpful, concise, and guide visitors toward [main CTA — demo/signup/contact].
   If asked about something outside [Company]'s scope, acknowledge it and redirect.
   ```

2. **quickQuestions** — 4-5 questions that surface the company's best selling points:
   - Pick questions a real prospect would ask
   - Questions that showcase USPs, pricing, or differentiation
   - Example: "What makes you different from [competitor]?", "How long does onboarding take?"

3. **greetingMessage** — Warm, specific first message (not generic):
   - Bad: "Hi! How can I help you?"
   - Good: "Hi! I'm Aria, the [Company] assistant. Ask me anything about our [main product] — I'm here to help!"

4. **primaryColor** — Match the company's brand color (check their website CSS or logo)

5. **offerText** — Something compelling for the demo page:
   - "Free 30-day trial — no credit card required"
   - "Book a live demo this week and get onboarding support included"

### Step 3: Call MCP — `quick_setup_demo`

Use a single `quick_setup_demo` call with everything prepared:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "quick_setup_demo",
    "arguments": {
      "companyName": "Acme Corp",
      "companyDomain": "acme.com",
      "logoUrl": "https://acme.com/logo.png",
      "websiteContent": "<<full scraped content — ALL pages combined>>",
      "primaryColor": "#3b82f6",
      "systemPrompt": "You are Aria, the AI assistant for Acme Corp...",
      "greetingMessage": "Hi! I'm Aria from Acme Corp. What can I help you with?",
      "quickQuestions": [
        "What does Acme Corp do?",
        "How is pricing structured?",
        "How long does setup take?",
        "Can I see a case study?"
      ],
      "offerText": "Free trial for 30 days — no credit card needed",
      "offerExpiresAt": "<<ISO date 7 days from now>>",
      "customMessage": "We built this demo specifically for you. Try asking the bot anything about our services!"
    }
  }
}
```

**Important:** Send the MCP request as a POST to `https://app.psquared.dev/api/mcp` with header `Authorization: Bearer <token>`.

### Step 4: Verify and Deliver

After `quick_setup_demo` returns:
- `playgroundUrl` — the demo URL to share with the prospect
- `demoId` — save this for tracking
- `agentId` — save for any follow-up adjustments

**Deliver to Martin:**
```
Demo ready for [Company Name]!

Playground URL: https://demo.inboxmate.psquared.dev?id=<demoId>

Agent configured with:
- System prompt: [summary]
- Quick questions: [list]
- Color: [hex]
- Knowledge: [N pages scraped from domain.com]

Share this link with the prospect.
```

## Follow-Up Adjustments

If the demo needs tweaking after the initial setup, use individual tools:

- `update_prompt` — refine the system prompt
- `update_quick_questions` — change predefined questions
- `update_widget_style` — adjust color, greeting, position
- `add_to_bucket` — add more knowledge content

## Quality Checklist

Before delivering the playground URL:
- [ ] System prompt is specific to the company (not generic)
- [ ] Greeting message uses the company name
- [ ] 4-5 quick questions that showcase real value
- [ ] Primary color matches company brand
- [ ] Knowledge includes: homepage + about + pricing/features + FAQ/contact
- [ ] Offer text is compelling and time-limited
- [ ] Widget is restricted to `demo.inboxmate.psquared.dev` (auto-set)

## MCP Initialization

Every session must start with an `initialize` call:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
```

Then:

```json
{"jsonrpc":"2.0","id":2,"method":"notifications/initialized","params":{}}
```

Then proceed with tool calls.

## Tips

- **Scrape deeply**: Thin knowledge = bad demo. Fetch at least 3-5 pages.
- **Be specific**: Generic prompts make generic demos. Research the prospect.
- **Color matters**: A demo that matches their brand impresses more than one that doesn't.
- **Quick questions are the hook**: Prospects click these first — make them irresistible.
- **Offer expiry creates urgency**: Set it 5-7 days out.
