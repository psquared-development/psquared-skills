---
name: blog-inboxmate
description: "Write and publish a new blog article for inboxmate.psquared.dev. Researches latest trends in customer support, chatbots, and AI agents, checks existing articles to avoid overlap, reviews InboxMate capabilities from the repo, then creates a static HTML blog post and pushes it."
---

# Write InboxMate Blog Post

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> InboxMate Blog Writer started.
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

## Parameters

`/blog-inboxmate [optional topic]`

If a topic is provided, write about that topic. If not, research and choose the best topic.

## Autonomy

Run fully autonomously. Do not ask for confirmation between steps. Only stop on critical errors (git push fails, etc.). Report the final result at the end.

---

## STEP 1 — Check Existing Articles

> **Announce:** `Checking existing InboxMate articles...`

Read the index page and all existing article files to understand what's already been published:

```
/Users/martinpammesberger/Documents/psquared/psquared-websites/apps/inboxmate/insights/index.html
```

List every existing article title, slug, category, and date. This is your "do not duplicate" list.

---

## STEP 2 — Understand InboxMate Capabilities

> **Announce:** `Reading InboxMate repo for current capabilities...`

Read key files from the InboxMate landing page and the main psquared app to understand current features:

- `/Users/martinpammesberger/Documents/psquared/psquared-websites/apps/inboxmate/index.html` — landing page with features, pricing, FAQ
- `/Users/martinpammesberger/Documents/psquared/psquared-websites/apps/inboxmate/vs-chatbase.html` — competitive positioning
- `/Users/martinpammesberger/Documents/psquared/psquared-websites/apps/inboxmate/vs-intercom.html` — competitive positioning

Extract: all features, pricing tiers, differentiators, target audience, and competitive angles. You'll use these to make the article authentic and accurate.

---

## STEP 3 — Research Topic

> **Announce:** `Researching latest trends...`

Use WebSearch to research the latest developments in:
- Customer support automation and AI
- Chatbot platforms, new entrants, pricing changes
- AI agent developments (multi-step, tool-using agents)
- Support desk / helpdesk industry news
- Relevant SEO keywords and what's ranking

**Topic selection criteria** (if no topic was provided):
1. Must NOT overlap with existing articles (Step 1)
2. Should target keywords InboxMate can realistically rank for (long-tail, comparison, how-to)
3. Should naturally allow mentioning InboxMate as a solution (not forced)
4. Should be timely and relevant to the current market

**Good topic types:**
- "Best X alternatives in [year]" comparisons
- "How to [solve specific problem]" guides
- "[Trend] explained: what it means for [audience]"
- "X vs Y: which is better for [use case]"

Choose ONE topic. Write down:
- **Title** (60-70 chars, keyword-rich)
- **Slug** (URL-friendly, kebab-case)
- **Category** (e.g., "Comparison", "How-To Guide", "AI & Chatbots", "Customer Support")
- **Target keywords** (3-5 long-tail keywords)
- **Meta description** (120-160 chars)

---

## STEP 4 — Write the Article

> **Announce:** `Writing article: [title]...`

### Content guidelines

- **Length:** 1500-2500 words (substantial but not padded)
- **Tone:** Professional but conversational. Direct, opinionated, no fluff. Like talking to a smart colleague.
- **Structure:** 4-6 sections with H2 headings. Each section should be 2-4 paragraphs.
- **InboxMate mentions:** Naturally weave in 2-3 mentions where InboxMate is a genuine fit. Never feel like an ad. The article should be valuable even to someone who never uses InboxMate.
- **Comparison articles:** Be honest about competitors. Acknowledge their strengths. Position InboxMate accurately.
- **CTA:** End with a subtle CTA section (emerald background box) linking to the InboxMate trial.
- **Author:** Alternate between Martin Pammesberger and Manuel Pils (Co-Founders, psquared). Check the most recent article's author on the index page and pick the other one.
- **No AI slop:** No "in today's rapidly evolving landscape", no "let's dive in", no "in conclusion". Write like a human expert.

### SEO requirements

- Title tag: keyword near the front, under 70 chars
- Meta description: compelling, includes primary keyword, 120-160 chars
- H1: matches or closely mirrors the title tag
- H2s: include secondary keywords naturally
- Internal links: link to other InboxMate insights articles where relevant
- External links: link to authoritative sources (not competitors' homepages)

---

## STEP 5 — Create the HTML File

> **Announce:** `Building HTML file...`

Use an existing article as the template. The file goes in:
```
/Users/martinpammesberger/Documents/psquared/psquared-websites/apps/inboxmate/insights/[slug].html
```

### HTML structure (copy exactly from existing articles):

```
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- charset, viewport, title, meta description, keywords -->
    <!-- favicon links (same as existing) -->
    <!-- canonical URL: https://inboxmate.psquared.dev/insights/[slug].html -->
    <!-- OG tags: type=article, url, image, title, description -->
    <!-- twitter:card = summary_large_image -->
    <!-- JSON-LD BlogPosting schema -->
    <!-- tailwind CDN + config (same as existing) -->
    <!-- same <style> block as existing -->
</head>
<body>
    <!-- Header (COPY EXACTLY from existing article) -->
    <!-- Article with breadcrumb, category badge, h1, subtitle, author block -->
    <!-- Content sections with reveal class -->
    <!-- CTA callout box (emerald-50 bg) -->
    <!-- Footer (COPY EXACTLY from existing article) -->
    <!-- Same JS block for reveal + mobile menu -->
</body>
</html>
```

**Critical:** Copy the header, footer, and JS blocks EXACTLY from an existing article. Do not modify nav links, footer links, or scripts.

### JSON-LD schema:
```json
{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "[title]",
    "description": "[meta description]",
    "url": "https://inboxmate.psquared.dev/insights/[slug].html",
    "image": "https://inboxmate.psquared.dev/img/dashboard-preview.png",
    "datePublished": "[YYYY-MM-DD]",
    "author": { "@type": "Person", "name": "[Author Name]" },
    "publisher": { "@type": "Organization", "name": "psquared GmbH", "url": "https://psquared.dev" }
}
```

---

## STEP 6 — Update Index Page

> **Announce:** `Updating insights index...`

Edit `/Users/martinpammesberger/Documents/psquared/psquared-websites/apps/inboxmate/insights/index.html`:

Add a new card at the TOP of the grid (newest first). Use the exact same card HTML pattern as existing cards:

```html
<a href="/insights/[slug].html" class="block border border-gray-200 rounded-xl p-8 hover:border-emerald-300 hover:shadow-sm transition group">
    <p class="text-sm text-gray-400 mb-3">[Category]</p>
    <h2 class="text-xl font-semibold text-gray-900 mb-3 group-hover:text-emerald-600 transition">[Title]</h2>
    <p class="text-gray-500 text-sm mb-4">[Short description]</p>
    <div class="flex items-center gap-2 mt-4 mb-3">
        <img src="/img/martin-pammesberger.jpg" alt="[Author Name]" class="w-6 h-6 rounded-full object-cover" style="aspect-ratio:1/1;">
        <p class="text-xs text-gray-400">[Author Name] &middot; [Month Day, Year]</p>
    </div>
    <span class="text-emerald-600 text-sm font-medium">Read more &rarr;</span>
</a>
```

---

## STEP 7 — Update Sitemap

> **Announce:** `Updating sitemap...`

Edit `/Users/martinpammesberger/Documents/psquared/psquared-websites/apps/inboxmate/sitemap.xml`:

Add a new `<url>` entry:
```xml
<url>
    <loc>https://inboxmate.psquared.dev/insights/[slug].html</loc>
    <lastmod>[YYYY-MM-DD]</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
</url>
```

---

## STEP 8 — Commit and Push

> **Announce:** `Pushing to main...`

```bash
cd /Users/martinpammesberger/Documents/psquared/psquared-websites
git add apps/inboxmate/insights/[slug].html apps/inboxmate/insights/index.html apps/inboxmate/sitemap.xml
git commit -m "blog: [short title] (inboxmate)"
git push origin main
```

---

## STEP 9 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> InboxMate Blog Published
>
> Title: [title]
> URL: https://inboxmate.psquared.dev/insights/[slug].html
> Category: [category]
> Keywords: [keywords]
>
> Existing articles: [N]
> New total: [N+1]
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
