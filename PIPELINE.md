# InboxMate Sales Pipeline

## Lead Sourcing

Lead buying reference: https://www.perplexity.ai/search/as-austrian-ocmpany-i-can-only-2uzpcw6PSvWXjoxX.Cw.5Q#3

Austrian-legal lead sources for B2B cold outreach. GDPR applies, but B2B cold email to publicly available business contacts is generally permissible under legitimate interest (Art. 6(1)(f) GDPR).

---

## InboxMate Demos

### Env vars required

**In `.env` (overlord folder / working directory):**
- `OPENBRAND_API_KEY` — brand color extraction for review
- `MCP_DEMO_ACCOUNT_ID` — demo account for agent creation
- `INBOXMATE_DEMO_MCP_TOKEN` — InboxMate MCP (agent creation)
- `PSQUARED_CRM_TOKEN` — Twenty CRM GraphQL API
- `EMAIL_DRAFT_ONLY_BEARER` — notification service draft creation

**On notification service deployment:**
- `PSQUARED_CRM_TOKEN` — CRM update when emails are sent
- `EMAIL_DRAFT_ONLY_BEARER` — auth for draft creation endpoint

**On agenthub deployment:**
- `NOTIFICATIONS_SERVICE_BEARER_TOKEN` — trial reminder emails via notification service
- `NUXT_TELEGRAM_BOT_TOKEN` + `NUXT_TELEGRAM_CHAT_ID` — Telegram alerts on demo claims

---

### Step 1: `/create-demo-for-crm-lead` (or `/inboxmate-batch-demo` for bulk)

- Deep-researches prospect (website scraping, content analysis)
- Sets up agent with company knowledge, branding, greeting, quick questions
- Publishes demo at `demo.inboxmate.psquared.dev/?id=<demoId>`
- Creates opportunity entry on CRM
- Sets demo link, sets `demoStatus = PENDING_REVIEW`

### Step 2: `/review-demos`

- Looks at all demos with `demoStatus = PENDING_REVIEW`
- Checks for completeness: company match, language, greeting, questions, content accuracy, no hallucinations
- **Auto-fixes brand colors** via OpenBrand API (extracts real primary color, updates widget if wrong)
- **Auto-fixes countdown deadline** (sets to 7 days if missing/expired, corrects offer text)
- Marks as `OK_TO_SEND` or `NEEDS_FIX` with detailed notes
- **Attention:** Do a manual spot-check afterwards. Edge cases may slip through — retrigger for any that need re-review.

### Step 3: `/setup-email-drafts`

- Verifies all demos are reviewed (blocks if any still `PENDING_REVIEW`)
- Finds all `OK_TO_SEND` opportunities with contact emails
- Creates CRM task "Send initial outreach for Demo [Company]" linked to opportunity
- Calls notification service to create draft emails (rendered from `demo-outreach` template, personalized per company)
- Flags opportunities with no contact email (skip + report)
- **Output:** Drafts ready for review at `notifications.psquared.dev/drafts`

### Step 4: Manual send

- Go to `notifications.psquared.dev/drafts`
- Review each draft (editable: subject, recipient, HTML body)
- Select all or pick specific ones
- Click "Send" → confirmation modal → confirm
- **Automatic on send:** CRM opportunity `demoStatus` set to `SENT`, timestamped note added

### Step 5: `/check-outreach-status` (run after 5+ days)

- Finds opportunities with `demoStatus = SENT`
- Creates follow-up drafts (from `demo-followup` template) for prospects with no response after 5+ days
- Flags "cold" leads (10+ days, no response)
- Skips opportunities that already progressed (stage moved beyond SCREENING)
- Updates CRM to `FOLLOW_UP_SENT`
- **Output:** Follow-up drafts at `notifications.psquared.dev/drafts` for review + send

---

## Tracking & KPIs

### Ackee Analytics

- **Dashboard:** https://ackee.psquared.dev
- **Demo domain tracked:** `demo.inboxmate.psquared.dev` (with `detailed: true`)
- **Tracks:** Page views, unique visitors, referrers, browsers, screen sizes, visit duration

### `/check-demo-analytics`

Run this skill periodically to get a full pipeline health report. It queries Ackee + CRM automatically and reports:

- **Hot leads** — have demo page views + email was sent (engage now)
- **Warm leads** — have views but outreach not yet sent (prioritize)
- **Cold leads** — no views after 7+ days (deprioritize or try different approach)
- **Fresh** — sent < 5 days ago (too early to judge)
- **Converted** — signed up from demo
- **Pipeline counts** — how many at each stage
- **Personalized recommendations** — what to do next based on the data

---

## Post-Send Lifecycle

### CRM States

| `demoStatus` | Meaning | Next action |
|-------------|---------|-------------|
| `PENDING_REVIEW` | Demo built, needs QA | `/review-demos` |
| `OK_TO_SEND` | QA passed | `/setup-email-drafts` |
| `NEEDS_FIX` | QA failed | Fix and re-review |
| `SENT` | Initial outreach sent | Wait 5 days → `/check-outreach-status` |
| `FOLLOW_UP_SENT` | Follow-up sent | Monitor Ackee, wait for response |

### What happens automatically on signup

1. Demo agent cloned into prospect's account
2. Exclusive first-year discount applied (up to 50%, varies by plan, via `demo_source_id`)
3. CRM opportunity → `PROPOSAL` stage
4. CRM note: "Prospect signed up — account: [name]"
5. Telegram alert sent to team 🔔

### Trial lifecycle (automatic)

- **3 days before expiry:** Branded reminder email (InboxMate template, mentions exclusive demo discount)
- **1 day before expiry:** "Last chance" reminder email
- **On expiry:** Account downgraded to free tier, Telegram notification

### Email templates available

| Template | Purpose |
|----------|---------|
| `demo-outreach` (de/en) | Initial cold outreach with demo link |
| `demo-followup` (de/en) | Follow-up 5+ days after outreach |
| `demo-welcome` (de/en) | Welcome email on signup from demo |
| `trial-reminder-3d` (de/en) | 3 days before trial expires |
| `trial-reminder-1d` (de/en) | 1 day before trial expires |

All editable at `notifications.psquared.dev/templates`.

---

## Daily Operations

1. `/check-demo-analytics` — see pipeline health, hot/cold leads, recommendations
2. `/inboxmate-batch-demo` for new CRM leads
3. `/review-demos` → spot-check manually
4. `/setup-email-drafts` for approved demos
5. `notifications.psquared.dev/drafts` → review → send
6. `/check-outreach-status` for follow-ups (every few days)
7. Review follow-up drafts → send
8. Check Telegram for claim alerts
