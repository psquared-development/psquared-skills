---
name: refurbish-demos
description: "Upgrade demo agent knowledge for a campaign — clears old summaries, scrapes real pages via MCP+Tavily, falls back to WebFetch for failures, republishes agents. Pass campaignId as parameter."
---

# Refurbish Demos

Upgrade demo agent knowledge from old AI-written summaries to properly scraped page content with real sourceUrls.

**Parameter:** campaignId (required) — the CRM campaign ID to process.

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Refurbish Demos — upgrading knowledge for campaign
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## Environment

Read from `.env` in the working directory:
- `INBOXMATE_DEMO_MCP_TOKEN` — Bearer token for InboxMate MCP
- `PSQUARED_CRM_TOKEN` — Bearer token for Twenty CRM

**MCP endpoint:** `https://app.psquared.dev/api/mcp`
**CRM endpoint:** `https://crm.psquared.dev/graphql`

---

## PHASE 1 — Fetch Campaign Opportunities

> **Announce:** `[1/5] Fetching opportunities for campaign...`

Query CRM for all opportunities linked to the campaign:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ opportunities(filter: { campaignId: { eq: \\\"CAMPAIGN_ID\\\" } }, first: 150) { edges { node { id name demoStatus demoUrl { primaryLinkUrl } company { id name domainName { primaryLinkUrl } } } } } }\"}"
```

From each opportunity extract:
- `demoUrl.primaryLinkUrl` → parse out the `?id=` param to get `demoId`
- `company.domainName.primaryLinkUrl` → the company domain
- `company.name` → for logging
- `demoStatus` → skip anything that's `SKIP_*` or `DISQUALIFIED`

**Filter:** Only process opportunities where `demoStatus` is one of: `OK_TO_SEND`, `SENT`, `FOLLOW_UP_SENT`, `PENDING_REVIEW`, `NEEDS_FIX`. Skip all `SKIP_*` and `DISQUALIFIED`.

---

## PHASE 2 — Get Agent & Bucket Info

> **Announce:** `[2/5] Looking up agents and knowledge buckets...`

For each opportunity's demoId, fetch the demo data:

```bash
curl -s https://app.psquared.dev/api/demo/DEMO_ID
```

This returns `{ agentId, companyName, companyDomain, ... }`.

Then get the agent's knowledge bucket via MCP:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_agent","arguments":{"agentId":"AGENT_ID"}}}
```

Extract `knowledgeBucketIds[0]` — this is the bucket to clear and rebuild.

**Build a work list:** `[ { companyName, companyDomain, agentId, bucketId, demoId } ]`

Announce: `Found N demos to refurbish.`

---

## PHASE 3 — Determine Pages to Scrape

> **Announce:** `[3/5] Planning scrape targets for each company...`

For each company, determine 4-6 URLs to scrape. Use the company domain to build the list:

1. **Homepage:** `https://DOMAIN/`
2. **Common subpages** — try these patterns based on what German business sites typically have:
   - `/kontakt/` or `/contact/`
   - `/leistungen/` or `/services/` or `/angebot/`
   - `/ueber-uns/` or `/about/` or `/unternehmen/`
   - `/faq/` or `/haeufige-fragen/`
   - `/team/`
   - `/preise/` or `/pricing/`
   - `/produkte/` or `/products/`
   - `/standorte/` or `/filialen/`

**Do NOT scrape blindly.** First, WebFetch the homepage and look at the navigation links to find the actual subpage URLs. Extract 3-5 real links from the nav/footer. This is more reliable than guessing paths.

**Budget:** ~4-6 pages per company. Stay under 10 URLs per `scrape_and_build_knowledge` call.

---

## PHASE 4 — Clear & Rebuild Knowledge

> **Announce:** `[4/5] Rebuilding knowledge for N demos...`

For each company in the work list, process **one at a time**:

### Step 4a: Cleanup orphaned data for this agent

Delete orphaned buckets and knowledge entries left over from old demo creation for this specific agent. Only removes buckets matching the agent's company name that aren't linked to any agent.

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"cleanup_agent","arguments":{"agentId":"AGENT_ID"}}}
```

Log the result: `Cleanup: {deletedBuckets} orphaned buckets, {deletedItems} items removed.`

### Step 4b: Clear active bucket

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"clear_bucket","arguments":{"bucketId":"BUCKET_ID"}}}
```

### Step 4c: Scrape and build via MCP

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"scrape_and_build_knowledge","arguments":{"bucketId":"BUCKET_ID","urls":["https://domain.de/","https://domain.de/kontakt/","https://domain.de/leistungen/","https://domain.de/ueber-uns/"]}}}
```

### Step 4d: Handle failures with WebFetch fallback

For each URL in the `failed` array from scrape_and_build_knowledge:

1. WebFetch the URL yourself
2. If you get content, call `add_to_bucket` via MCP:

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"add_to_bucket","arguments":{"bucketId":"BUCKET_ID","title":"Page Title","content":"[scraped content]","sourceUrl":"https://domain.de/kontakt/"}}}
```

**Content rules for manual add_to_bucket:**
- Content should be the full page text, not a summary
- Keep headings, lists, structure
- Remove navigation, footer, cookie banners
- Max 20,000 characters (will be truncated if longer)
- `sourceUrl` MUST be the actual page URL, not the domain root

### Step 4e: Verify minimum knowledge

After scraping, call `list_bucket_items` to verify:
- At least 3 items created
- Items have different `sourceUrl` values (not all the same)
- At least one item has `embeddingStatus: "completed"` or `"pending"` (not all failed)

If less than 3 items, log a warning but continue — the agent will still work, just with less knowledge.

### Step 4f: Fix button icon if broken

Check the agent's config for `buttonIcon`. If it's NOT one of these valid values, update it to `messageCircle`:

Valid icons: `messageCircle`, `messageSquare`, `sparkles`, `support`, `help`, `inboxmate`, `heart`, `zap`, `globe`, `wave`, `brain`, `lightbulb`, `compass`, `star`, `shield`, `robot`, `mascot`

If invalid, fix via MCP:
```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"update_widget_style","arguments":{"agentId":"AGENT_ID","buttonIcon":"messageCircle"}}}
```

### Step 4g: Republish agent

```json
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"publish_agent","arguments":{"agentId":"AGENT_ID"}}}
```

> **Announce per company:** `✓ {companyName}: {N} items created, {M} failed → republished`

---

## PHASE 5 — Report

> **Announce:** `[5/5] Refurbish complete.`

Print a summary table:

```
| Company | Items | Failed URLs | Icon Fixed | Status |
|---------|-------|-------------|------------|--------|
| Schuh Marke GmbH | 4 | 1 | yes | ✓ |
| Mainfilm | 5 | 0 | no | ✓ |
| ... | ... | ... | ... | ... |
```

Totals:
- Companies processed: N
- Knowledge items created: N
- Failed scrapes (fell back to WebFetch): N
- Completely failed URLs: N
- Icons fixed: N
- Tavily credits used: ~N (only count scrape_and_build_knowledge URLs, not WebFetch fallbacks)

---

## Important Notes

- **Process one company at a time.** Don't parallelize MCP calls — they share a rate limit.
- **Don't re-scrape if already refurbished.** Check `list_bucket_items` first — if items already have diverse `sourceUrl` values (not all pointing to the domain root), skip that company.
- **Tavily budget:** ~4 URLs per company. A campaign of 100 demos ≈ 400 Tavily credits. Stay aware of the total.
- **WebFetch fallback is slower but free.** Use it generously for failed URLs.
- **Always republish** after changing knowledge or fixing icons. The widget script is static — it must be regenerated.
