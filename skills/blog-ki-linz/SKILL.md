---
name: blog-ki-linz
description: "Write and publish a new blog article for ki-linz.at (Wissen section). Focuses on AI community in Linz/Austria, local events, KI for Austrian SMBs. Writes bilingual DE+EN content and publishes via Supabase. Same DB as psquared.dev — post also appears there."
---

# Write ki-linz.at Blog Post

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ki-linz Blog Writer started.
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

## Parameters

`/blog-ki-linz [optional topic]`

If a topic is provided, write about that topic. If not, research and choose the best topic.

## Autonomy

Run fully autonomously. Do not ask for confirmation between steps. Only stop on critical errors. Report the final result at the end.

## Credentials

Read from: `/Users/martinpammesberger/.agents/config/blog-credentials.env`

Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BLOG_ACCOUNT_ID`

If credentials are missing or empty, ask the user to fill in the config file and stop.

## Important Context

- ki-linz.at is a community site for AI enthusiasts in Linz, Austria
- It shares the **same blog database** as psquared.dev
- Posts appear on BOTH sites: as "Wissen" on ki-linz.at (German) and "AI Insights" on psquared.dev (both languages)
- ki-linz.at is an Astro 5 SSG site — new posts require a rebuild to appear there, but show immediately on psquared.dev (SSR)
- The audience is Austrian: SMB owners, tech leads, developers, and AI-curious professionals in Upper Austria
- Tone should be more community-oriented than psquared.dev (which is more corporate/consulting)

### Authors

Alternate between the two co-founders. Check the latest posts to see who wrote last and pick the other one. For ki-linz-specific community posts, "KI Linz" is also a valid author (no avatar).

| Author | author_name | author_avatar |
|--------|------------|---------------|
| Martin Pammesberger | `{"en": "Martin Pammesberger", "de": "Martin Pammesberger"}` | `https://pub-965ae2182ade48e8acb01069fc0de0f4.r2.dev/martin_anime.png` |
| Manuel Pils | `{"en": "Manuel Pils", "de": "Manuel Pils"}` | `https://pub-965ae2182ade48e8acb01069fc0de0f4.r2.dev/mapi_anime.png` |
| KI Linz (community) | `{"de": "KI Linz"}` | `null` |

### Cover Images

Every post should have a `cover_image`. Pick from these existing images (choose one that fits the topic, don't reuse the most recent post's image):

- Futuristic office / multi-agent: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/f017c59e-69b2-4fe3-9ee1-f7963daffe05/segments/3:4:1/Flux_Dev_A_futuristic_office_environment_where_multiple_digita_2.jpg`
- Cityscape / responsible AI: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/e811cf3e-95ba-4909-8420-8ca12d035e41/segments/4:4:1/Flux_Dev_A_sleek_hightech_cityscape_at_dawn_symbolizing_the_fu_3.jpg`
- Robots at table / AI models: `https://cdn.leonardo.ai/users/153286fa-844a-4669-b8e7-9d92e89a66ee/generations/22bc2cc8-470b-47b0-906f-048be9d8a94e/Leonardo_Phoenix_09_Three_advanced_humanoid_robots_sit_around_3.jpg`
- Helpdesk split / chatbots: `https://cdn.leonardo.ai/users/153286fa-844a-4669-b8e7-9d92e89a66ee/generations/d7f8bb5c-19af-4d85-a003-3f82713b121f/Leonardo_Phoenix_09_A_futuristic_digital_helpdesk_scene_split_2.jpg`
- Dark futuristic / AI trends: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/b234dc95-2fd5-4f9d-b887-7dc354209054/segments/2:4:1/Flux_Dev_A_futuristic_highcontrast_3D_artwork_depicting_the_da_1.jpg`
- Network connections / protocols: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/347b4eed-1af9-4c97-aa9c-f902852f89ca/segments/4:4:1/Flux_Dev_Professional_tech_illustration_of_a_central_connectio_3.jpg`
- Dreamy human+AI: `https://cdn.leonardo.ai/users/153286fa-844a-4669-b8e7-9d92e89a66ee/generations/02f51b3c-8448-434f-9e3e-9cd7dfb7e031/Leonardo_Phoenix_09_a_vivid_dreamlike_and_cinematic_photograph_0.jpg`
- AI video revolution: `https://cdn.leonardo.ai/users/bf8efc52-029b-48d3-b1f0-97e4b0269844/generations/153c1edc-8c46-46ea-9069-5540d5cb8983/segments/4:4:1/Flux_Dev_A_futuristic_splitscreen_composition_showing_the_AI_v_3.jpg`
- AI implementation: `https://pub-25945c8861c3489e98f7a0aab28850c9.r2.dev/Generated%20Image%20June%2013%2C%202025%20-%204_37PM.jpeg`
- Prompting guide: `https://pub-863cd8a9e006495d88a7456aafeb34de.r2.dev/Flux_Dev_A_futuristic_digital_landscape_where_a_human_and_an_A_3.jpg`

---

## STEP 1 — Load Credentials and Check Existing Blogs

> **Announce:** `Loading credentials and fetching existing blogs...`

### 1a — Read credentials
```bash
source /Users/martinpammesberger/.agents/config/blog-credentials.env
```

### 1b — Fetch existing blogs
```bash
curl -s "${SUPABASE_URL}/rest/v1/blogs?account_id=eq.${BLOG_ACCOUNT_ID}&order=published_at.desc&select=title,slug,tags,published_at,author_name,cover_image" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

Note:
1. All existing titles and slugs (do not duplicate)
2. Who wrote the most recent post (alternate to the other author)
3. Which cover image was used most recently (pick a different one)

---

## STEP 2 — Research Topic

> **Announce:** `Researching AI scene in Austria/Linz...`

Use WebSearch to research:
- AI community events in Linz and Austria (meetups, conferences, hackathons)
- AI adoption in Austrian SMBs and enterprises
- EU AI Act implications for Austrian companies
- Austrian AI startups and initiatives
- Practical AI use cases relevant to local businesses
- KI (Kuenstliche Intelligenz) trends in DACH

**Topic selection criteria** (if no topic was provided):
1. Must NOT overlap with existing articles
2. Should be relevant to the Linz/Austrian AI community
3. Should be accessible to non-technical readers (SMB owners, managers)
4. German-first thinking — this is primarily a German-language audience

**Good topic types for ki-linz:**
- "KI fuer [Branche]: Wie Unternehmen in Oberoesterreich profitieren" (industry-specific, local)
- "Was der EU AI Act fuer oesterreichische KMU bedeutet" (regulatory, practical)
- "[AI tool/technique] einfach erklaert" (educational, accessible)
- "KI-Trends [year]: Was kommt auf uns zu?" (trend overview)
- "Wie [local company type] KI sinnvoll einsetzen kann" (practical guide)
- "Von ChatGPT zu KI-Agenten: Was sich wirklich geaendert hat" (evolution)

Choose ONE topic. Write down:
- **Title DE** (primary — natural Austrian German, keyword-rich)
- **Title EN** (secondary — for psquared.dev English readers)
- **Slug** (URL-friendly, kebab-case, based on concept but in English for URL consistency)
- **Target keywords DE** (3-5, focus on "KI", "Kuenstliche Intelligenz", local terms)
- **Target keywords EN** (3-5)
- **Author** (alternate from most recent post, or use "KI Linz" for community posts)
- **Cover image** (thematically fitting, not same as most recent)

---

## STEP 3 — Write the Article (DE primary, EN secondary)

> **Announce:** `Writing article: [DE title]...`

### Content guidelines

- **Length:** 1500-2500 words per language
- **German is primary:** Write the German version FIRST. It should feel native, natural, Austrian German. Use "KI" not "AI" in German text. Reference Austrian/local examples where possible.
- **English version:** Adapt for international readers. Don't just translate — reframe for a broader audience.
- **Tone:** Friendly, community-oriented, educational. Like explaining AI to a smart business owner over coffee. Less corporate than psquared.dev.
- **Structure:** 4-6 sections with H2 headings
- **psquared/ki-linz mentions:** Brief mention that ki-linz.at is an AI community by psquared, or that psquared offers AI consulting — but keep it subtle. Max 1 mention.
- **No AI slop:** Write like a local expert. Use Austrian expressions where they fit naturally.
- **Markdown format:** Content is rendered with the `marked` library.

---

## STEP 4 — Publish via Supabase

> **Announce:** `Publishing to Supabase...`

Write the payload with python for proper JSON encoding, then POST:

```bash
python3 -c "
import json
payload = {
    'account_id': 'f68026a5-495f-4d73-aad3-31ca191bc499',
    'title': {'de': DE_TITLE, 'en': EN_TITLE},
    'slug': SLUG,
    'excerpt': {'de': DE_EXCERPT, 'en': EN_EXCERPT},
    'content': {'de': DE_CONTENT, 'en': EN_CONTENT},
    'cover_image': COVER_IMAGE_URL,
    'published_at': CURRENT_ISO_DATETIME,
    'author_name': AUTHOR_NAME_OBJECT,
    'author_avatar': AUTHOR_AVATAR_URL_OR_NONE,
    'tags': {'de': DE_TAGS_LIST, 'en': EN_TAGS_LIST},
    'created_at': CURRENT_ISO_DATETIME,
    'updated_at': CURRENT_ISO_DATETIME
}
with open('/tmp/ki-linz-blog-post.json', 'w') as f:
    json.dump(payload, f, ensure_ascii=False)
"

source /Users/martinpammesberger/.agents/config/blog-credentials.env
curl -s -X POST "${SUPABASE_URL}/rest/v1/blogs" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d @/tmp/ki-linz-blog-post.json

rm /tmp/ki-linz-blog-post.json
```

Check response for errors. If slug exists (409), append a suffix and retry.

---

## STEP 5 — Verify

> **Announce:** `Verifying publication...`

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
> ki-linz Blog Published
>
> Title (DE): [title]
> Title (EN): [title]
> Author: [name]
> Slug: [slug]
>
> Live URLs:
>   psquared EN: https://www.psquared.dev/en/ai-insights/[slug]
>   psquared DE: https://www.psquared.dev/de/ai-insights/[slug]
>   ki-linz (after rebuild): https://www.ki-linz.at/wissen/[slug]
>
> Keywords (DE): [keywords]
> Keywords (EN): [keywords]
>
> Note: ki-linz.at requires a rebuild to show the new post.
>       psquared.dev shows it immediately (SSR).
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
