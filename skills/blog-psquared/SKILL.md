---
name: blog-psquared
description: "Write and publish a new blog article for psquared.dev (AI Insights). Researches latest AI trends, checks existing articles via Supabase, writes bilingual EN+DE content, and publishes directly to Supabase. The same post also appears on ki-linz.at in German."
---

# Write psquared.dev Blog Post

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> psquared Blog Writer started.
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

## Parameters

`/blog-psquared [optional topic]`

If a topic is provided, write about that topic. If not, research and choose the best topic.

## Autonomy

Run fully autonomously. Do not ask for confirmation between steps. Only stop on critical errors. Report the final result at the end.

## Credentials

Read credentials from: `/Users/martinpammesberger/.agents/config/blog-credentials.env`

Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BLOG_ACCOUNT_ID`

If credentials are missing or empty, ask the user to fill in the config file and stop.

## Important Context

- psquared.dev and ki-linz.at **share the same blog database**
- Every post you publish here also appears on ki-linz.at (German version)
- Posts are stored with JSONB fields: `{"en": "...", "de": "..."}` for title, excerpt, content, author_name, tags
- The blog is called "AI Insights" on psquared.dev and "Wissen" on ki-linz.at

### Authors

Alternate between the two co-founders. Check the latest posts to see who wrote last and pick the other one.

| Author | author_name | author_avatar |
|--------|------------|---------------|
| Martin Pammesberger | `{"en": "Martin Pammesberger", "de": "Martin Pammesberger"}` | `https://pub-965ae2182ade48e8acb01069fc0de0f4.r2.dev/martin_anime.png` |
| Manuel Pils | `{"en": "Manuel Pils", "de": "Manuel Pils"}` | `https://pub-965ae2182ade48e8acb01069fc0de0f4.r2.dev/mapi_anime.png` |

### Cover Images

Every post should have a `cover_image`. Use one of these existing cover images from previous posts (pick one that thematically fits the new article):

- Futuristic office / multi-agent: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/f017c59e-69b2-4fe3-9ee1-f7963daffe05/segments/3:4:1/Flux_Dev_A_futuristic_office_environment_where_multiple_digita_2.jpg`
- Cityscape / responsible AI: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/e811cf3e-95ba-4909-8420-8ca12d035e41/segments/4:4:1/Flux_Dev_A_sleek_hightech_cityscape_at_dawn_symbolizing_the_fu_3.jpg`
- Robots at table / AI models: `https://cdn.leonardo.ai/users/153286fa-844a-4669-b8e7-9d92e89a66ee/generations/22bc2cc8-470b-47b0-906f-048be9d8a94e/Leonardo_Phoenix_09_Three_advanced_humanoid_robots_sit_around_3.jpg`
- Helpdesk split / chatbots: `https://cdn.leonardo.ai/users/153286fa-844a-4669-b8e7-9d92e89a66ee/generations/d7f8bb5c-19af-4d85-a003-3f82713b121f/Leonardo_Phoenix_09_A_futuristic_digital_helpdesk_scene_split_2.jpg`
- Dark futuristic / AI trends: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/b234dc95-2fd5-4f9d-b887-7dc354209054/segments/2:4:1/Flux_Dev_A_futuristic_highcontrast_3D_artwork_depicting_the_da_1.jpg`
- Network connections / MCP/protocols: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/347b4eed-1af9-4c97-aa9c-f902852f89ca/segments/4:4:1/Flux_Dev_Professional_tech_illustration_of_a_central_connectio_3.jpg`
- Dreamy human+AI / intro: `https://cdn.leonardo.ai/users/153286fa-844a-4669-b8e7-9d92e89a66ee/generations/02f51b3c-8448-434f-9e3e-9cd7dfb7e031/Leonardo_Phoenix_09_a_vivid_dreamlike_and_cinematic_photograph_0.jpg`
- AI video revolution: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/153c1edc-8c46-46ea-9069-5540d5cb8983/segments/4:4:1/Flux_Dev_A_futuristic_splitscreen_composition_showing_the_AI_v_3.jpg`
- AI implementation / business: `https://pub-25945c8861c3489e98f7a0aab28850c9.r2.dev/Generated%20Image%20June%2013%2C%202025%20-%204_37PM.jpeg`
- Prompting guide: `https://pub-863cd8a9e006495d88a7456aafeb34de.r2.dev/Flux_Dev_A_futuristic_digital_landscape_where_a_human_and_an_A_3.jpg`
- psquared brand: `https://pub-863cd8a9e006495d88a7456aafeb34de.r2.dev/7ab80f18-1947-4691-987a-9e272517ec6b.png`

Pick the image that best matches the article's theme. Do NOT reuse the same image as the most recent post.

---

## STEP 1 — Load Credentials and Check Existing Blogs

> **Announce:** `Loading credentials and fetching existing blogs...`

### 1a — Read credentials
```bash
source /Users/martinpammesberger/.agents/config/blog-credentials.env
```

### 1b — Fetch existing blogs from Supabase

```bash
curl -s "${SUPABASE_URL}/rest/v1/blogs?account_id=eq.${BLOG_ACCOUNT_ID}&order=published_at.desc&select=title,slug,tags,published_at,author_name,cover_image" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

From the results, note:
1. All existing titles and slugs (do not duplicate)
2. Who wrote the most recent post (alternate to the other author)
3. Which cover image was used most recently (pick a different one)

---

## STEP 2 — Research Topic

> **Announce:** `Researching latest AI trends...`

Use WebSearch to research the latest developments in:
- AI agents and multi-agent systems
- RAG (Retrieval-Augmented Generation) solutions
- AI consulting and strategy for enterprises
- EU AI Act and compliance
- AI automation for SMBs in DACH region
- LLM developments, new models, practical applications

**Topic selection criteria** (if no topic was provided):
1. Must NOT overlap with existing articles
2. Should target keywords psquared can rank for in DACH (German-speaking) market
3. Should demonstrate psquared's expertise (AI agents, RAG, consulting, EU data privacy)
4. Should be relevant to decision-makers at SMBs/enterprises considering AI adoption

**Good topic types for psquared:**
- "How [specific AI technique] works and when to use it" (thought leadership)
- "AI in [industry]: practical use cases for [year]" (industry-specific)
- "[AI trend] explained: what it means for Austrian/DACH businesses"
- "How we built [specific solution] with [technology]" (case study style)
- "The real cost of [AI implementation/not adopting AI]"
- "AI agents vs [traditional approach]: a practical comparison"

Choose ONE topic. Write down:
- **Title EN** (60-70 chars, keyword-rich)
- **Title DE** (German translation, natural-sounding)
- **Slug** (URL-friendly, kebab-case, English)
- **Target keywords EN** (3-5)
- **Target keywords DE** (3-5)
- **Author** (whichever co-founder didn't write the most recent post)
- **Cover image** (pick a thematically fitting one, not the same as most recent post)

---

## STEP 3 — Write the Article (EN + DE)

> **Announce:** `Writing article: [EN title]...`

### Content guidelines

- **Length:** 1500-2500 words per language (write BOTH English and German versions)
- **German quality:** The German version must be natural, native-sounding Austrian German. NOT a literal translation. Rewrite for the German-speaking audience, adapt examples and references.
- **Tone:** Expert, authoritative, but approachable. Like a senior AI consultant explaining things to a smart client.
- **Structure:** 4-6 sections with H2 headings
- **psquared mentions:** 1-2 natural mentions where relevant. The article must stand on its own as valuable content.
- **No AI slop:** No "in today's rapidly evolving landscape", no "let's dive in", no filler. Write like a human expert who has opinions.
- **Markdown format:** Write content in Markdown. The blog renderer uses the `marked` library.

### Content structure (Markdown):
```markdown
## [Section 1 Title]

[2-4 paragraphs]

## [Section 2 Title]

[2-4 paragraphs]

...

## [Final section / Takeaway]

[Summary paragraph with practical advice]
```

---

## STEP 4 — Publish via Supabase

> **Announce:** `Publishing to Supabase...`

Write the JSON payload to a temp file first to avoid shell escaping issues, then POST it:

```bash
# Write payload to temp file (use python for proper JSON encoding)
python3 -c "
import json, sys
payload = {
    'account_id': 'f68026a5-495f-4d73-aad3-31ca191bc499',
    'title': {'en': EN_TITLE, 'de': DE_TITLE},
    'slug': SLUG,
    'excerpt': {'en': EN_EXCERPT, 'de': DE_EXCERPT},
    'content': {'en': EN_CONTENT, 'de': DE_CONTENT},
    'cover_image': COVER_IMAGE_URL,
    'published_at': CURRENT_ISO_DATETIME,
    'author_name': {'en': AUTHOR_NAME, 'de': AUTHOR_NAME},
    'author_avatar': AUTHOR_AVATAR_URL,
    'tags': {'en': EN_TAGS_LIST, 'de': DE_TAGS_LIST},
    'created_at': CURRENT_ISO_DATETIME,
    'updated_at': CURRENT_ISO_DATETIME
}
with open('/tmp/psquared-blog-post.json', 'w') as f:
    json.dump(payload, f, ensure_ascii=False)
"

curl -s -X POST "${SUPABASE_URL}/rest/v1/blogs" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d @/tmp/psquared-blog-post.json

rm /tmp/psquared-blog-post.json
```

Check the response for errors. If the slug already exists (409), append a suffix and retry.

---

## STEP 5 — Verify

> **Announce:** `Verifying publication...`

Fetch the published post to confirm it's live:
```bash
curl -s "${SUPABASE_URL}/rest/v1/blogs?slug=eq.[slug]&account_id=eq.f68026a5-495f-4d73-aad3-31ca191bc499&select=id,title,slug,published_at" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

---

## STEP 6 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> psquared Blog Published
>
> Title (EN): [title]
> Title (DE): [title]
> Author: [name]
> Slug: [slug]
>
> Live URLs:
>   EN: https://www.psquared.dev/en/ai-insights/[slug]
>   DE: https://www.psquared.dev/de/ai-insights/[slug]
>   KI-Linz: https://www.ki-linz.at/wissen/[slug]
>
> Keywords (EN): [keywords]
> Keywords (DE): [keywords]
>
> Total articles in DB: [N]
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

**Note:** The URLs on psquared.dev are available immediately (SSR). The ki-linz.at URLs require a rebuild of the Astro site since it's statically generated at build time.
