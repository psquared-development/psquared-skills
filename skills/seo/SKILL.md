---
name: seo
description: "Audit or fix SEO issues for a single website or page. Checks meta tags, structured data, technical SEO, content quality, i18n, and AI readiness using only WebFetch — no external APIs. Pass a URL and mode (audit or fix) as parameters."
---

# SEO Audit & Fix

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> SEO Analysis starting.
> Parsing parameters...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## Parameters

This skill expects: `/seo <url> [mode]`

- **url** — the site to audit (e.g. `https://psquared.dev`, `https://inboxmate.psquared.dev`)
- **mode** — `audit` (default) or `fix`
  - `audit` — analyze and report findings, don't touch any files
  - `fix` — analyze, report, AND apply fixes directly to source files

If no URL is provided, ask the user.

---

## Site Registry

When the URL matches a known psquared site, use the local source files for the fix mode:

| Domain | Source path (relative to psquared-websites) | Framework |
|--------|----------------------------------------------|-----------|
| `psquared.dev` / `www.psquared.dev` | `apps/psquared/` | Nuxt 3 |
| `inboxmate.psquared.dev` | `apps/inboxmate/` | Static HTML |
| `ki-linz.at` / `www.ki-linz.at` | `apps/ki-linz/` | Astro 5 |
| `agenthub.psquared.dev` | `apps/agenthub/` | Static HTML |

The monorepo lives at `/Users/martinpammesberger/Documents/psquared/psquared-websites/`.

For unknown URLs, only `audit` mode is available (no local source to fix).

---

## STEP 0 — Discover Pages

> **Announce:** `Discovering pages for [domain]...`

### 0a — Fetch robots.txt

```
WebFetch: [url]/robots.txt
```

Record:
- Does it exist?
- Are there `Disallow` rules? List them.
- Is there a `Sitemap:` directive?
- Are important paths accidentally blocked?

### 0b — Fetch sitemap

Try in order:
1. URL from robots.txt `Sitemap:` directive
2. `[url]/sitemap.xml`
3. `[url]/sitemap-index.xml`
4. `[url]/sitemap_index.xml`

If a sitemap is found, extract all page URLs. If not, fall back to crawling:
- Fetch the homepage
- Extract all internal links (same domain)
- Follow one level deep to discover subpages

> **Announce:** `Found [N] pages to analyze.`

**Limit:** Analyze a maximum of 30 pages per site. If more are found, prioritize: homepage, main navigation pages, then remaining by URL depth.

---

## STEP 1 — Analyze Each Page

> **Announce:** `[1/N] Analyzing [page URL]...`

For each discovered page, use WebFetch to fetch the HTML, then check all categories below.

### 1a — Meta Tags

| Check | What to look for | Severity |
|-------|-----------------|----------|
| `<title>` | Present, 30-60 chars, unique across site, contains relevant keywords | HIGH |
| `<meta name="description">` | Present, 120-160 chars, unique across site, compelling | HIGH |
| `<link rel="canonical">` | Present, points to correct URL (no trailing slash mismatch, no http/https mismatch) | HIGH |
| `<meta property="og:title">` | Present, matches or supplements `<title>` | MEDIUM |
| `<meta property="og:description">` | Present, matches or supplements meta description | MEDIUM |
| `<meta property="og:image">` | Present, valid URL, image exists | MEDIUM |
| `<meta property="og:url">` | Present, matches canonical | MEDIUM |
| `<meta property="og:type">` | Present (`website`, `article`, etc.) | LOW |
| `<meta name="twitter:card">` | Present (`summary_large_image` preferred) | LOW |
| `<meta name="twitter:title">` | Present | LOW |
| `<meta name="twitter:description">` | Present | LOW |
| `<meta name="viewport">` | Present with `width=device-width` | HIGH |

### 1b — Heading Hierarchy

| Check | What to look for | Severity |
|-------|-----------------|----------|
| Single H1 | Exactly one `<h1>` per page | HIGH |
| H1 content | Contains primary keyword, descriptive, not just a logo | HIGH |
| Heading order | No skipped levels (H1 -> H3 without H2) | MEDIUM |
| Heading keywords | Headings include relevant terms for the page topic | LOW |

### 1c — Images

| Check | What to look for | Severity |
|-------|-----------------|----------|
| Alt text | All `<img>` tags have non-empty `alt` attribute | HIGH |
| Alt quality | Alt text is descriptive, not just "image" or filename | MEDIUM |
| Lazy loading | Images below fold use `loading="lazy"` | LOW |
| Width/height | Images specify dimensions (prevents CLS) | LOW |

### 1d — Structured Data (JSON-LD)

Look for `<script type="application/ld+json">` blocks.

| Check | What to look for | Severity |
|-------|-----------------|----------|
| Presence | At least one JSON-LD block on homepage | HIGH |
| Valid JSON | Block parses without errors | HIGH |
| `@type` appropriate | Organization/LocalBusiness for homepage, Article for blog posts, Product for product pages, FAQPage for FAQ sections | MEDIUM |
| Required fields | Each schema type has its required properties populated | MEDIUM |
| Contact info | Organization schema includes `url`, `name`, `contactPoint` or `email` | LOW |

**Recommended schema types per page:**

| Page type | Schema |
|-----------|--------|
| Homepage | `Organization` or `LocalBusiness` |
| Blog post | `Article` with `author`, `datePublished`, `headline` |
| Product/service page | `Product` or `Service` |
| FAQ section | `FAQPage` with `Question` + `Answer` items |
| Contact page | `LocalBusiness` with `address`, `telephone` |

### 1e — Internal Links & Navigation

| Check | What to look for | Severity |
|-------|-----------------|----------|
| Broken links | Internal links that return 404 (sample up to 10 per page) | HIGH |
| Link text | Descriptive anchor text, not "click here" or "read more" | MEDIUM |
| Orphan pages | Pages not linked from any other page | MEDIUM |
| Navigation consistency | Main nav present on all pages | LOW |

### 1f — i18n & Hreflang

| Check | What to look for | Severity |
|-------|-----------------|----------|
| `<html lang>` | Present and correct | HIGH |
| Hreflang tags | `<link rel="alternate" hreflang="x">` for each language variant | HIGH (if multilingual) |
| Self-referencing hreflang | Each page includes hreflang pointing to itself | MEDIUM |
| x-default | `hreflang="x-default"` present | MEDIUM |
| Consistency | Hreflang tags are reciprocal (page A points to B, B points back to A) | HIGH |

> Skip i18n checks for sites that are clearly single-language only.

### 1g — Technical SEO

| Check | What to look for | Severity |
|-------|-----------------|----------|
| HTTPS | Site uses HTTPS | HIGH |
| Mobile viewport | Viewport meta tag present | HIGH |
| Charset | `<meta charset="utf-8">` present | MEDIUM |
| Favicon | `<link rel="icon">` present | LOW |
| CSS/JS blocking | Critical CSS inline or preloaded | LOW |
| 404 page | `/404` or similar returns custom page (not default server error) | LOW |

### 1h — Content Quality

| Check | What to look for | Severity |
|-------|-----------------|----------|
| Thin content | Page has < 300 words of visible text (excluding nav/footer) | MEDIUM |
| Duplicate titles | Same `<title>` used on multiple pages | HIGH |
| Duplicate descriptions | Same meta description on multiple pages | HIGH |
| Text/HTML ratio | Very low text-to-markup ratio | LOW |

### 1i — AI & GEO Readiness

| Check | What to look for | Severity |
|-------|-----------------|----------|
| `llms.txt` | `[url]/llms.txt` exists with site summary for AI crawlers | LOW |
| Structured answers | Content has clear Q&A patterns, definition lists, or summary paragraphs that AI can extract | LOW |
| Content accessibility | Key information in HTML text (not trapped in images/JS-only renders) | MEDIUM |

### 1j — Security Headers (SEO-adjacent)

| Check | What to look for | Severity |
|-------|-----------------|----------|
| `X-Frame-Options` | Present in response headers | LOW |
| `X-Content-Type-Options` | `nosniff` | LOW |
| `Referrer-Policy` | Present | LOW |
| HTTPS redirect | HTTP redirects to HTTPS | MEDIUM |

> Fetch headers via WebFetch response. If headers aren't accessible, skip this section.

---

## STEP 2 — Score & Compile

> **Announce:** `Analysis complete. Compiling results...`

### 2a — Per-Page Scores

For each page, count findings by severity:

| Grade | Criteria |
|-------|----------|
| **A** | 0 HIGH issues, max 2 MEDIUM |
| **B** | 0 HIGH issues, 3+ MEDIUM |
| **C** | 1-2 HIGH issues |
| **D** | 3-4 HIGH issues |
| **F** | 5+ HIGH issues |

### 2b — Site-Wide Score

Average the per-page grades. Also flag site-wide issues:
- Missing robots.txt or sitemap → HIGH
- No structured data on any page → HIGH
- No hreflang on multilingual site → HIGH
- Duplicate titles/descriptions across pages → HIGH

### 2c — Priority Ranking

Rank all findings by impact:
1. **Critical** — blocks indexing or causes major SEO harm (missing title, blocked in robots.txt, broken canonical)
2. **Important** — significant improvement potential (missing OG tags, no structured data, duplicate descriptions)
3. **Nice to have** — polish items (alt text quality, llms.txt, security headers)

---

## STEP 3 — Report (audit mode)

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> SEO Audit Complete: [domain]
>
> Overall Grade: [A-F]
> Pages analyzed: [N]
>
> Critical: [N] issues
> Important: [N] issues
> Nice to have: [N] issues
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

Then output a detailed report with:

### Site Overview

| Item | Status |
|------|--------|
| robots.txt | Present / Missing |
| sitemap.xml | Present ([N] URLs) / Missing |
| Structured data | Present on [N]/[total] pages / Missing |
| Hreflang | Correct / Issues / N/A |
| HTTPS | Yes / No |

### Page-by-Page Results

For each page (sorted worst to best):

**[Page URL] — Grade: [X]**

| Issue | Severity | Details |
|-------|----------|---------|
| Missing meta description | HIGH | No `<meta name="description">` found |
| ... | ... | ... |

### Top Priorities

Numbered list of the top 10 most impactful fixes, ordered by effort-to-impact ratio.

---

## STEP 4 — Fix (fix mode only)

> Skip this step entirely if mode is `audit`.

> **Announce:** `Applying fixes to source files in [source path]...`

If the URL matches a site in the Site Registry, locate the source files and apply fixes.

### Framework-specific fix strategies

#### Nuxt 3 (`apps/psquared/`)

| Fix target | Where to edit |
|------------|--------------|
| Global meta tags | `nuxt.config.js` → `app.head` |
| Per-page meta | `pages/*.vue` → `useHead()` or `useSeoMeta()` composable |
| OG image | `public/` directory + meta tag reference |
| Structured data | `nuxt.config.js` → `app.head.script` with `type: 'application/ld+json'`, or per-page `useHead()` |
| Sitemap config | `nuxt.config.js` → `@nuxtjs/sitemap` module config |
| robots.txt | `public/robots.txt` or `nuxt.config.js` → `@nuxtjs/robots` module |

> Read the existing `nuxt.config.js` and relevant page files **before** making any edits. Follow existing patterns.

#### Astro 5 (`apps/ki-linz/`)

| Fix target | Where to edit |
|------------|--------------|
| Global meta tags | `src/layouts/*.astro` → `<head>` section |
| Per-page meta | Page frontmatter + `<head>` in layout |
| Structured data | Inline `<script type="application/ld+json">` in layout or page |
| Sitemap config | `astro.config.mjs` → `@astrojs/sitemap` integration |
| robots.txt | `public/robots.txt` |

#### Static HTML (`apps/inboxmate/`, `apps/agenthub/`)

| Fix target | Where to edit |
|------------|--------------|
| Meta tags | Directly in `<head>` of each `.html` file |
| Structured data | Add `<script type="application/ld+json">` block in `<head>` |
| robots.txt | Create `robots.txt` in the app root |
| Sitemap | Create `sitemap.xml` in the app root |

### Fix rules

- **Read before writing.** Always read the full file before editing. Follow existing code patterns and style.
- **One fix at a time.** Apply each fix individually using the Edit tool.
- **Don't break things.** If a fix requires understanding complex component logic, flag it in the report instead of guessing.
- **Don't over-optimize.** Fix real issues found in the audit. Don't add things that weren't flagged.
- **Preserve existing good SEO.** If something is already correct, don't touch it.
- **Track what you changed.** Keep a list of every file edited and what was changed.

### After fixing

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> SEO Fixes Applied: [domain]
>
> Overall Grade: [before] → [after]
>
> Fixed:
>   - [file]: [what was changed]
>   - [file]: [what was changed]
>
> Remaining (manual fix needed):
>   - [issue]: [why it couldn't be auto-fixed]
>
> Run `/seo [url] audit` to verify.
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
