---
name: review-demos
description: "Review InboxMate demos waiting for QA. Finds CRM opportunities at SCREENING with demoStatus=PENDING_REVIEW, opens each demo link, checks quality, and flags as OK_TO_SEND or NEEDS_FIX with a note explaining why."
---

# Review InboxMate Demos

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Demo Review Pipeline started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## STEP 0 — Check Environment

Before doing anything, check if a `.env` file exists in the current working directory. Read it using the Read tool:

> **Do NOT use `source .env`** — values may contain semicolons that break shell parsing. Read the file directly and extract the values manually.

The `.env` file must contain all three of the following tokens:
- **`PSQUARED_CRM_TOKEN`** — for querying and updating CRM opportunities
- **`NUXT_MCP_DEMO_TOKEN`** — for calling the InboxMate MCP API (auto-fixing widget styles)
- **`OPENBRAND_API_KEY`** — for extracting brand colors via the OpenBrand API (used in Step 2b2)

If the `.env` file is **missing** or doesn't contain all three tokens, **stop immediately** and ask the user to provide them.

> **Once verified, announce:** `Environment OK. Finding demos pending review...`

---

## STEP 1 — Find Demos Pending Review

Query CRM for opportunities at SCREENING stage with demoStatus = PENDING_REVIEW:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d '{"query":"{ opportunities(filter: { stage: { eq: SCREENING }, demoStatus: { eq: PENDING_REVIEW } }, first: 50) { edges { node { id name stage demoStatus demoUrl { primaryLinkUrl } company { id name domainName { primaryLinkUrl } } } } } }"}'
```

> **Announce:**
> ```
> Found [N] demos pending review:
> 1. [Company Name] — [demoUrl]
> 2. [Company Name] — [demoUrl]
> ...
> ```

If none found, announce "No demos pending review" and stop.

---

## STEP 2 — Review Each Demo

For each opportunity, perform a quality check:

### 2a — Fetch the Demo Page

Use WebFetch to open the demo playground URL. The demo page is at `demo.inboxmate.psquared.dev/?id=<demoId>`.

Look at the page content for:
- Company name and branding
- Bot greeting message
- Quick questions displayed
- Color theme

### 2b — Fetch the Company Website

Use WebFetch on the company's domain (from `company.domainName.primaryLinkUrl`). Compare against the demo.

### 2b2 — Get Brand Colors via OpenBrand

Call the OpenBrand API to extract the company's actual brand colors:

```
WebFetch: https://openbrand.sh/api/extract?url=https://[companyDomain]
```

From the response, find the **primary color** — look for the color tagged as `"primary"` in the `colors` array. Record this hex value as `expectedPrimaryColor`.

If OpenBrand fails or returns no colors, fall back to manually inspecting the company website HTML for dominant button/CTA colors.

### 2b3 — Get Demo Data via API

Fetch the demo's stored data to check the countdown configuration:

```
WebFetch: https://app.psquared.dev/api/demo/[demoId]
```

Extract the `demoId` from the opportunity's `demoUrl` (the `?id=` parameter or last path segment).

From the response, record:
- `offerText` — the offer headline text
- `offerExpiresAt` — the countdown deadline (ISO date, or null if missing)
- `agentId` — needed for auto-fixes

### 2c — Quality Checklist

Score each item as PASS or FAIL:

| Check | What to verify |
|-------|---------------|
| **Company match** | Demo mentions the correct company name |
| **Language match** | Demo language matches the company website language (DE/EN/both) |
| **Greeting quality** | Greeting is specific to the company, not generic ("Hi! How can I help?") |
| **Quick questions** | Questions are relevant to this company's products/services |
| **Color match** | Widget primary color matches OpenBrand `expectedPrimaryColor`. Compare hex values — minor shade differences (e.g. `#1a365d` vs `#1e3a5f`) are OK, but completely different hues are a FAIL. |
| **Countdown set** | `offerExpiresAt` is present AND is a future date (not null, not expired) — this is set by the campaign, not during review. The `offerText` should describe a time-limited offer — NOT "Kostenlose Erstberatung" or generic text. |
| **Content accuracy** | Any visible knowledge snippets reference real products/services from the website |
| **No hallucinations** | Demo doesn't mention products, pricing, or features not on the company website |

### 2d — Auto-Fix: Colors

If the **Color match** check FAILED (widget color doesn't match OpenBrand primary color):

1. Call `update_widget_style` via the InboxMate MCP to fix the color:

```bash
curl -s -X POST https://app.psquared.dev/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NUXT_MCP_DEMO_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"update_widget_style","arguments":{"agentId":"[agentId]","primaryColor":"[expectedPrimaryColor]"}}}'
```

2. Republish the agent:

```bash
curl -s -X POST https://app.psquared.dev/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NUXT_MCP_DEMO_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"publish_agent","arguments":{"agentId":"[agentId]"}}}'
```

> **Announce:** `Auto-fixed: Updated [Company] widget color from [oldColor] to [expectedPrimaryColor]`
>
> After auto-fixing, mark the **Color match** check as PASS (fixed).

### 2e — Auto-Fix: Countdown / Deadline

If the **Countdown set** check FAILED (missing `offerExpiresAt`, expired date, or wrong `offerText`):

> **Important:** Do NOT invent or default a deadline (e.g. "7 days from today"). Deadlines are set by campaigns — not during review. If no deadline is present in the CRM opportunity notes, flag the check as FAIL in the review note and set `NEEDS_FIX` rather than guessing a date.

**Only proceed with auto-fix if** the CRM opportunity notes explicitly mention a specific deadline to use.

**Determine the correct offer text:**
- The text should describe a time-limited offer that fits the countdown premise
- Good examples (DE): "Jetzt starten und bis zu 50% Rabatt im ersten Jahr sichern", "Ihren KI-Assistenten jetzt aktivieren — Sonderkonditionen sichern"
- Good examples (EN): "Start now and save up to 50% in your first year", "Activate your AI assistant now — special terms available"
- **Never** use "Kostenlose Erstberatung" — the countdown is for an offer deadline, not a consultation

**Apply the fix** — update the `demo_pages` table directly via Supabase SQL:

```
Use mcp__plugin_supabase_supabase__execute_sql with:
  project_id: "fevtfywriufbqnvbgyrm"
  query: UPDATE demo_pages SET offer_text = '[corrected offerText]', offer_expires_at = '[corrected ISO date]' WHERE id = '[demoId]'
```

> **Why raw SQL?** The InboxMate MCP does not expose an `update_demo_page` tool for campaign-managed fields like `offer_expires_at`. Direct Supabase SQL is the only way to update these fields programmatically.

> **Announce:** `Auto-fixed: Updated [Company] countdown — expires [date], text: "[offerText]"`
>
> After auto-fixing, mark the **Countdown set** check as PASS (fixed).

### 2f — Make a Decision

- **6+ PASS (including auto-fixed), 0 critical FAILs** → `OK_TO_SEND`
- **Any critical FAIL** (wrong company, wrong language, hallucinated content) → `NEEDS_FIX`
- **Minor issues only** (greeting could be better) → `OK_TO_SEND` with note about improvements
- Auto-fixed items count as PASS but should be mentioned in the review note

---

## STEP 3 — Update CRM

### If OK_TO_SEND:

```bash
# Update demoStatus
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d '{"query":"mutation { updateOpportunity(id: \"[opportunityId]\", data: { demoStatus: OK_TO_SEND, demoReviewIssues: null }) { id } }"}'
```

### If NEEDS_FIX:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d '{"query":"mutation { updateOpportunity(id: \"[opportunityId]\", data: { demoStatus: NEEDS_FIX, demoReviewIssues: \"[Issue 1: description. Issue 2: description. Suggested fixes: ...]\" }) { id } }"}'
```

---

## STEP 4 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Demo Review complete.
>
> ✅ OK to send:
>   - [Company A] — [brief reason]
>   - [Company B] — [brief reason]
>
> ❌ Needs fix:
>   - [Company C] — [issue summary]
>
> Next step: Send approved demos to prospects
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## CRM Fields Updated by This Skill

| Step | Field | Value | When |
|------|-------|-------|------|
| 3 (OK) | `demoStatus` | `OK_TO_SEND` | Demo passed QA |
| 3 (OK) | `demoReviewIssues` | `null` | Clear any previous issues |
| 3 (FIX) | `demoStatus` | `NEEDS_FIX` | Demo failed QA |
| 3 (FIX) | `demoReviewIssues` | `"Issue 1: ... Issue 2: ..."` | What's wrong and how to fix |

**Reads:** `demoStatus` (filter PENDING_REVIEW), `demoUrl` (demo page link), company domain

**Does NOT touch:** `outreachSentAt`, `followupSentAt`, `agenthubAccountId`, `stage`

**Important:** `demoStatus` is a GraphQL enum — use bare values (no quotes): `demoStatus: OK_TO_SEND`
