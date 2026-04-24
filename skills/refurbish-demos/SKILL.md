---
name: refurbish-demos
description: "Upgrade demo agent knowledge — clears old summaries, scrapes real pages via MCP Tavily (advanced mode), falls back to WebFetch, fixes icons, republishes. Pass campaignId or 'all-sent' as parameter."
---

# Refurbish Demos

Upgrade demo agent knowledge from old AI-written summaries to properly scraped page content with real sourceUrls. Each knowledge item becomes a URL-type entry with the actual page URL, so the chatbot can cite specific pages in its answers.

**Parameter:** `campaignId` (CRM campaign ID) or `all-sent` (all demos where outreach was sent)

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Refurbish Demos — upgrading knowledge
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## Environment

Read from `.env` in the working directory:
- `NUXT_MCP_DEMO_TOKEN` — Bearer token for InboxMate MCP (contains `#` character — use curl, not Python urllib)
- `PSQUARED_CRM_TOKEN` — Bearer token for Twenty CRM
- `EMAIL_DRAFT_ONLY_BEARER` — Bearer token for notification service (used in Option B: all-sent)

**MCP endpoint:** `https://app.psquared.dev/api/mcp`
**CRM endpoint:** `https://crm.psquared.dev/graphql`
**Demo API:** `https://app.psquared.dev/api/demo/{demoId}`
**Supabase project:** `fevtfywriufbqnvbgyrm` (for direct DB queries when needed)
**Demo account ID:** `8942a6e5-91cb-4c5d-8ef5-98cfe7945620`

### MCP Call Template

All MCP calls use this pattern (use curl, NOT Python urllib — the token contains `#`):

```bash
curl -s --max-time 120 -X POST https://app.psquared.dev/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NUXT_MCP_DEMO_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"TOOL_NAME","arguments":{...}}}'
```

### Available MCP Tools

| Tool | Purpose |
|---|---|
| `cleanup_agent` | Wipe all knowledge from agent's buckets + delete orphaned buckets in demo account |
| `clear_bucket` | Remove all items from a specific bucket |
| `scrape_and_build_knowledge` | Scrape URLs via Tavily (advanced mode), create URL-type knowledge items. Max 10 URLs per call. Returns `{ created: [], failed: [] }` |
| `add_to_bucket` | Manually add knowledge item. If `sourceUrl` is provided, creates URL-type entry |
| `get_agent` | Get agent config (check knowledgeBucketIds, buttonIcon) |
| `list_bucket_items` | List items in a bucket (verify results) |
| `update_widget_style` | Fix buttonIcon or other widget config |
| `publish_agent` | Republish agent (required after knowledge changes) |

---

## PHASE 1 — Build Work List

> **Announce:** `[1/4] Building work list...`

### Option A: By campaign ID

Query CRM for opportunities in the campaign:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ opportunities(filter: { campaignId: { eq: \\\"CAMPAIGN_ID\\\" } }, first: 150) { edges { node { id name demoStatus demoUrl { primaryLinkUrl } company { id name domainName { primaryLinkUrl } } } } } }\"}"
```

### Option B: All sent demos

Get sent email drafts from notification service, extract demo IDs, then look up agents:

```bash
curl -s "https://notifications.psquared.dev/drafts?status=SENT&draftType=outreach&pageSize=200" \
  -H "Authorization: Bearer $EMAIL_DRAFT_ONLY_BEARER"
```

Extract `demoUrl` from each draft's variables, parse the `?id=` param to get demoId.

### For each demo ID, fetch agent info:

```bash
curl -s https://app.psquared.dev/api/demo/DEMO_ID
# Returns: { agentId, companyName, companyDomain, ... }
```

Then get bucket ID:
```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_agent","arguments":{"agentId":"AGENT_ID"}}}
```
Extract `knowledgeBucketIds[0]`.

**Filter out:** `demoStatus` = `SKIP_*`, `DISQUALIFIED`. Skip demos without `companyDomain`.

**Build:** `[ { companyName, companyDomain, agentId, bucketId, demoId } ]`

Announce: `Found N demos to refurbish.`

---

## PHASE 2 — Discover Real Pages Per Company

> **Announce:** `[2/4] Discovering pages to scrape...`

For each company, discover which pages actually exist before scraping. **Never guess URLs blindly** — generic patterns like `/kontakt/`, `/ueber-uns/`, `/leistungen/` fail on 60%+ of sites (e-commerce, single-page, non-standard CMS). This produces "Seite nicht gefunden" knowledge items that pollute RAG.

### Step 2a: WebFetch the homepage

WebFetch `https://www.{domain}/` (or `https://{domain}/` if www fails). Extract:
- **Navigation links** (main nav, header menu)
- **Footer links** (about, contact, FAQ, legal)
- **Any prominent section links**

### Step 2b: Select 6-8 best URLs

From the discovered links, pick URLs that give the chatbot useful knowledge:

**Priority order:**
1. Homepage (always)
2. About / Über uns / Unternehmen (who they are)
3. Services / Leistungen / Produkte (what they offer)
4. Contact / Kontakt / Standorte / Filialen (how to reach them)
5. FAQ / Service / Hilfe (common questions)
6. Team / Karriere (if relevant)
7. Impressum (legal, low priority but useful for address/contact)
8. Key category/product pages (for e-commerce sites)

**Rules:**
- Only include URLs on the same domain
- Skip: blog posts, privacy policy, AGB, login pages, PDF links, anchor-only links
- **Skip junk URLs:** `/wp-json/`, `/xmlrpc.php`, `/feed/`, `/favicon.ico`, `apple-touch-icon`, `.webp`, `.ico`, `.css`, `.js`
- For e-commerce sites: pick category overview pages, brand pages, store locator — NOT individual product pages
- For JS-rendered pages (store locators, maps): if Tavily returns empty, WebFetch manually
- Max 8 URLs total (keeps scrape time reasonable)

### Step 2c: Split into batches of 2-3 URLs

Tavily advanced mode takes ~5-30s per URL. A single call with 5+ URLs hits server timeouts (120s). **Always split into batches of max 3 URLs per MCP call.**

### Fallback: If WebFetch fails

If the homepage can't be fetched (timeout, blocking), fall back to these common patterns but **expect failures** and don't count on them:

```
https://www.{domain}/
https://www.{domain}/kontakt/
https://www.{domain}/ueber-uns/
https://www.{domain}/impressum/
```

---

## PHASE 3 — Clear & Rebuild Knowledge

> **Announce:** `[3/4] Rebuilding knowledge for N demos...`

Process **one company at a time**:

### Step 3a: Wipe existing knowledge

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"cleanup_agent","arguments":{"agentId":"AGENT_ID"}}}
```

This clears the agent's buckets AND deletes all orphaned buckets in the demo account (from old demo creation flow). First call handles the global orphan cleanup.

### Step 3b: Scrape via MCP in batches of 3

Send discovered URLs to `scrape_and_build_knowledge` in batches of max 3:

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"scrape_and_build_knowledge","arguments":{"bucketId":"BUCKET_ID","urls":["URL1","URL2","URL3"]}}}
```

The MCP tool automatically:
- Rejects 404/"Seite nicht gefunden" pages (returns them in `failed` array with reason `404/not-found page detected`)
- Sets `sourceUrl` on created items (enables chat citations)
- Supports content up to 50K characters

Check the response `created` and `failed` arrays after each batch.

### Step 3c: Handle failures — WebFetch fallback

**For each failed URL**, check the failure reason:

| Reason | Action |
|--------|--------|
| `404/not-found page detected` | Skip — page doesn't exist. Don't retry. |
| `Content too short` | Skip — page has no useful content. |
| `Timeout` or `Failed to scrape` | **Retry via WebFetch** (Tavily couldn't reach the site). |
| `Content must not exceed` | Shouldn't happen with 50K limit. If it does, WebFetch and trim. |

**WebFetch fallback for timeouts/scrape failures:**

1. WebFetch the URL with a prompt to extract all content
2. Clean the content: remove nav, footer, cookie banners, base64 images
3. Keep: headings, lists, structure, ALL details (names, prices, hours, addresses)
4. Call `add_to_bucket` with cleaned content + sourceUrl:

```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"add_to_bucket","arguments":{"bucketId":"BUCKET_ID","title":"Page Title","content":"[full cleaned page text]","sourceUrl":"https://domain.de/page/"}}}
```

### Step 3d: If ALL URLs fail (site blocks Tavily entirely)

Some sites block Tavily's scraper. If every URL times out or fails:

1. **WebFetch ALL discovered URLs yourself** — WebFetch uses a different scraper that often works when Tavily doesn't
2. For each page, extract detailed content (not summaries)
3. Add each via `add_to_bucket` with `sourceUrl`
4. **You MUST NOT leave the bucket empty** — an empty bucket means the chatbot can't answer anything

**Content rules for manual WebFetch entries:**
- Full page text, not an AI summary — keep the original wording
- Preserve headings, lists, and structure
- Remove nav, footer, cookie banners, boilerplate
- Keep ALL specifics: names, services, prices, hours, addresses, team members
- Max 50,000 characters per entry
- `sourceUrl` MUST be the actual page URL

### Step 3e: Verify minimum quality

After all scraping + fallbacks, check:
- **At least 3 items** in the bucket (< 3 = chatbot is too thin)
- **No items with "nicht gefunden" / "not found" / "404" in the title** (shouldn't happen with MCP detection, but verify)
- **No junk items** (wp-json, xmlrpc, feed, favicon — delete if present)

### Step 3f: Fix button icon if broken

Valid icons: `messageCircle`, `messageSquare`, `sparkles`, `support`, `help`, `inboxmate`, `heart`, `zap`, `globe`, `wave`, `brain`, `lightbulb`, `compass`, `star`, `shield`, `robot`, `mascot`

Any other value (e.g. `shoppingBag`, `truck`, `home`, `car`, `music`) renders as a broken circle in the widget. Fix to `messageCircle`:

```json
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"update_widget_style","arguments":{"agentId":"AGENT_ID","buttonIcon":"messageCircle"}}}
```

### Step 3g: Republish agent

```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"publish_agent","arguments":{"agentId":"AGENT_ID"}}}
```

> **Log per company:** `✓ {companyName}: {N} items created, {M} failed → republished`

---

## PHASE 4 — Report

> **Announce:** `[4/4] Refurbish complete.`

Print summary table:

```
| Company | Domain | Items | Failed | Icon Fixed | Status |
|---------|--------|-------|--------|------------|--------|
| Schuh Marke GmbH | schuh-marke.de | 5 | 0 | yes | ✓ |
| Mainfilm | mainfilm.tv | 5 | 0 | no | ✓ |
```

Totals:
- Companies processed: N
- Knowledge items created: N
- Failed URLs: N (fell back to WebFetch: N, completely failed: N)
- Icons fixed: N
- Tavily credits used: ~N (2 credits per 5 URLs at advanced mode)

---

## Batch Script

For large batches (100+ demos), use the Python batch script instead of processing one-by-one from Claude:

```bash
python3 -u scripts/refurbish-all.py < /tmp/worklist.json > /tmp/refurbish.log 2>&1
```

The script at `claude-overlord-folder/scripts/refurbish-all.py`:
- Discovers real URLs from homepage nav (not hardcoded patterns)
- Filters junk URLs (wp-json, xmlrpc, feed, favicon, etc.)
- Handles `www.` prefix correctly (no `www.www.` duplication)
- Splits URLs into batches of 3 to avoid server timeouts
- Uses curl (not urllib) for MCP calls — handles `#` in auth token
- Processes sequentially with 1s pause every 5 agents
- Input: JSON array of `[{company_name, company_domain, agent_id, bucket_id}]`

**Limitation:** The script does NOT do WebFetch fallback — it only uses MCP `scrape_and_build_knowledge` (Tavily). If Tavily fails for a site, the agent will be left with fewer items. After a batch run, check the log for agents with 0-2 items created and fix those manually with WebFetch.

---

## Known Issues & Workarounds

### Tavily advanced mode timeouts
Tavily `extract_depth: 'advanced'` takes up to 30s per URL. Batch 5 URLs in one MCP call = 150s, which exceeds server timeout. **Always split into batches of 2-3 URLs.**

### Fallback API key
If primary Tavily key runs out, set `NUXT_TAVILY_FALLBACK_API_KEY` in agenthub `.env`. Auto-switches on 429/402 errors.

### "Seite nicht gefunden" pages
If 404 pages end up in knowledge (from fallback URL guessing or site changes), they DO hurt RAG — the chatbot may cite non-existent pages or give confused answers. Phase 2 now discovers real URLs first to prevent this. If you see 404 items after a refurbish, the homepage WebFetch likely failed and fell back to guessed URLs — investigate and re-run with manual URL discovery.

### Bucket name mismatches
Old demo creation flow sometimes linked wrong-named buckets to agents (e.g. "Autohaus Freier Wissensbasis" on a Hinzmann Elektrotechnik agent). The content is correct after refurbish — the bucket name is cosmetic. Can be fixed via SQL if needed.

### Orphaned buckets
Old demo creation left ~160 orphaned "Wissensdatenbank" buckets not linked to any agent. `cleanup_agent` deletes these. For large batches, clean up via SQL first (faster):

```sql
DELETE FROM knowledge_bucket_chunks WHERE bucket_item_id IN (
  SELECT kbi.id FROM knowledge_bucket_items kbi
  JOIN knowledge_buckets kb ON kb.id = kbi.bucket_id
  WHERE kb.account_id = '8942a6e5-91cb-4c5d-8ef5-98cfe7945620'
  AND kb.id NOT IN (SELECT unnest(knowledge_bucket_ids) FROM agents WHERE account_id = '8942a6e5-91cb-4c5d-8ef5-98cfe7945620')
);
-- Then delete items, then buckets (same pattern)
```

### Content length limit
Knowledge entries allow up to 50,000 characters (was 20K, bumped 2026-03-28). Tavily advanced mode returns full pages including nav/footer HTML — the extra headroom prevents truncation of actual content. Pages hitting the limit likely have nav pollution but the important content still fits.

### JS-rendered content (store locators, maps, dynamic lists)
Some pages load data via JavaScript (store locators, interactive maps, product configurators). Tavily can't extract this content. If a page returns mostly nav/boilerplate with no real data, WebFetch it manually, extract the data from the page description or other sources, and add via `add_to_bucket` with `sourceUrl`.

### Cross-contamination
Audit showed only 1 true case out of 152 sent demos (Dachdeckermeister Hoffmann had DBM Metallbau content). Refurbish fixes this by clearing and re-scraping based on the correct domain from the demo page.
