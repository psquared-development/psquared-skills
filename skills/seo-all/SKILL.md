---
name: seo-all
description: "Run SEO audit or fix across all psquared websites autonomously. Dispatches parallel agents for psquared.dev, inboxmate.psquared.dev, ki-linz.at, and agenthub.psquared.dev, then presents a combined report. Pass mode (audit or fix) as parameter."
---

# SEO Audit — All psquared Sites

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Full SEO scan starting across all psquared sites.
> Mode: [audit/fix]
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## Parameters

This skill expects: `/seo-all [mode]`

- **mode** — `audit` (default) or `fix`

---

## STEP 0 — Dispatch Parallel Agents

> **Announce:** `Dispatching 4 parallel agents...`

Use the Agent tool to launch 4 agents in parallel. Each agent runs the `/seo` skill for one site.

**All 4 agents in a single message:**

### Agent 1 — psquared.dev
```
Invoke skill: /seo https://psquared.dev [mode]

Run the full SEO skill. Return the complete report including:
- Overall grade
- All findings with severity
- Per-page results
- Top priorities
If fix mode: list all files changed and what was fixed.
```

### Agent 2 — inboxmate.psquared.dev
```
Invoke skill: /seo https://inboxmate.psquared.dev [mode]

Run the full SEO skill. Return the complete report including:
- Overall grade
- All findings with severity
- Per-page results
- Top priorities
If fix mode: list all files changed and what was fixed.
```

### Agent 3 — ki-linz.at
```
Invoke skill: /seo https://ki-linz.at [mode]

Run the full SEO skill. Return the complete report including:
- Overall grade
- All findings with severity
- Per-page results
- Top priorities
If fix mode: list all files changed and what was fixed.
```

### Agent 4 — agenthub.psquared.dev
```
Invoke skill: /seo https://agenthub.psquared.dev [mode]

Run the full SEO skill. Return the complete report including:
- Overall grade
- All findings with severity
- Per-page results
- Top priorities
If fix mode: list all files changed and what was fixed.
```

> **Important:** Launch all 4 agents in a single message using the Agent tool so they run concurrently. Do not wait for one to finish before starting the next.

---

## STEP 1 — Collect Results

Wait for all 4 agents to complete. Gather their reports.

If any agent fails, note the failure but continue with the results from the others.

---

## STEP 2 — Combined Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Full SEO Scan Complete
>
> psquared.dev            Grade: [X]  |  [N] issues
> inboxmate.psquared.dev  Grade: [X]  |  [N] issues
> ki-linz.at              Grade: [X]  |  [N] issues
> agenthub.psquared.dev   Grade: [X]  |  [N] issues
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

### Site Comparison

| Check | psquared.dev | inboxmate | ki-linz | agenthub |
|-------|-------------|-----------|---------|----------|
| robots.txt | | | | |
| sitemap.xml | | | | |
| Structured data | | | | |
| Meta tags complete | | | | |
| Hreflang / i18n | | | | |
| OG tags | | | | |
| Image alt texts | | | | |
| Heading hierarchy | | | | |
| llms.txt | | | | |

Use checkmarks, crosses, or brief status notes in each cell.

### Cross-Site Issues

Flag any patterns that appear across multiple sites:
- Common missing elements
- Inconsistent branding or meta patterns across subdomains
- Missing cross-linking between psquared properties

### Top 10 Priorities (All Sites)

Ranked list of the highest-impact fixes across all 4 sites. Include which site each fix applies to.

| # | Site | Issue | Severity | Effort |
|---|------|-------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| ... | | | | |

Effort: `quick` (< 5 min), `moderate` (15-30 min), `involved` (1+ hour)

### Fix Mode Summary (if mode = fix)

| Site | Files changed | Issues fixed | Issues remaining |
|------|--------------|-------------|-----------------|
| psquared.dev | | | |
| inboxmate.psquared.dev | | | |
| ki-linz.at | | | |
| agenthub.psquared.dev | | | |

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Next steps:
>   - Review the top priorities above
>   - Run /seo <url> fix to fix a specific site
>   - Run /seo <url> audit to re-check after fixes
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
