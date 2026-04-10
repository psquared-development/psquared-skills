---
name: blog-all
description: "Write and publish new blog articles for all three psquared websites: inboxmate.psquared.dev, psquared.dev, and ki-linz.at. Runs each blog skill sequentially, coordinating topics to avoid overlap."
---

# Write Blogs for All Websites

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Blog Writer — All Sites
> Writing for: InboxMate, psquared.dev, ki-linz.at
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

## Parameters

`/blog-all [optional: topics per site]`

Examples:
- `/blog-all` — auto-pick topics for all three
- `/blog-all inboxmate:"topic" psquared:"topic" ki-linz:"topic"` — specify per site
- `/blog-all psquared:"topic"` — specify one, auto-pick the rest

## Autonomy

Run fully autonomously. Execute each blog skill in sequence. Do not ask for confirmation between sites.

---

## Execution Order

Run the three blog skills in this order:

### 1. InboxMate Blog

Invoke the `blog-inboxmate` skill.

**Why first:** InboxMate is a standalone static site with its own blog. No shared database to coordinate.

### 2. psquared.dev Blog

Invoke the `blog-psquared` skill.

**Why second:** psquared and ki-linz share the same database. Write the psquared post first (broader AI consulting topic), so the ki-linz skill can see it and pick a complementary topic.

### 3. ki-linz.at Blog

Invoke the `blog-ki-linz` skill.

**Why last:** Can now see the psquared post that was just published and pick a non-overlapping, locally-focused topic.

---

## Topic Coordination

If topics are NOT specified by the user, ensure variety:

| Site | Focus area | Typical angle |
|------|-----------|---------------|
| InboxMate | Customer support, chatbots, help desk tools | Product-adjacent, SEO-driven comparisons/guides |
| psquared.dev | AI strategy, agents, RAG, enterprise AI | Thought leadership, consulting perspective |
| ki-linz.at | Local AI community, practical KI for Austrian SMBs | Community, educational, Austrian-focused |

**No overlap rule:** Before writing each post, check what the previous skills just published and ensure no thematic overlap.

---

## Final Report

After all three skills complete:

> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> All Blogs Published
>
> InboxMate:
>   Title: [title]
>   URL: https://inboxmate.psquared.dev/insights/[slug].html
>
> psquared.dev:
>   Title (EN): [title]
>   Title (DE): [title]
>   URL: https://www.psquared.dev/en/ai-insights/[slug]
>
> ki-linz.at:
>   Title (DE): [title]
>   Title (EN): [title]
>   URL (after rebuild): https://www.ki-linz.at/wissen/[slug]
>
> Note: ki-linz.at requires a site rebuild to show new posts.
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
