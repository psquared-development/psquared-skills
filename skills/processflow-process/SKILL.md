---
name: processflow-process
description: >
  Work ONE ProcessFlow process end-to-end until all guardrails are met. Use when told to
  "bearbeite Prozess <Name>", "work process <name>", "rework <process> in ProcessFlow", or when a
  per-terminal worker is handed a single process name in the neverlost/Stütz/ZIWA engagement. Takes
  the PROCESS NAME as parameter. Pulls the process, cross-checks against the transcript, reworks the
  Lösungskonzept + canvas + diagrams via Chrome-MCP, keeps the helper app in sync, and re-scores —
  until every required guardrail passes or is justified n.a. Usually invoked by the wrapper
  processflow-run (which adds the critic loop).
---

# ProcessFlow — Work one process (param: process name)

Input: **one process name** (the arg). Goal: bring it to guardrail-completion. Load
`processflow-review/references/guardrails.md` (Definition of Done + Fehlermuster-Register) and
`processflow-app` (Chrome-MCP + copilot mechanics). If a TodoWrite helps, create one todo per
required guard.

## 0. Locate + load
Find the process by name in `data/<company>/processes.json` (get its UUID). Pull the **current**
canvas + report + score fresh from Supabase via the Chrome session token (localStorage
`sb-…-auth-token` → `access_token`; anon apikey) — a colleague may have edited it. Read the relevant
transcript passages for THIS process.

## 1. Transcript-check first (ground truth)
Before reworking, verify the process against the transcript (`canvas_wb`, `transcript`,
`scenario_correct`, `industry_correct`, `no_invent`): Is it real? Is the SCENARIO right (what actually
happens)? Correct industry/products? Any invented tools/brands/devices/ERP names (grep them)? This
sets what needs fixing.

## 2. Rework via Chrome-MCP (writes hit REAL customer data)
Use the **Konzept-Copilot** (floating button, "Vom Copilot überarbeiten lassen") for the
Lösungskonzept: it edits report text + diagrams + solutions formatting-preserving in one run. Use the
**Canvas-Copilot** (Canvas tab) for canvas fields — remember to click **Übernehmen**. Give precise,
scoped instructions. After each run: reload + verify (don't trust "done" before completion). Apply the
substance guardrails, not just surface: `use_existing_capabilities` (does the ERP/a product already do
it? build only the delta — Build-vs-Buy in Schritt 0), `right_ai_technique` (research the correct
approach — embeddings vs VLM, rules vs ML), `smallest_fit`/`ki_solution_sense`, `discovery_first` for
unclear/large/sensitive, `os_module_option` for frontends, `pricing_verified` (web-check any
price/"included" claim), `hours_real` (AI under-estimates), `analysis_per_phase`, `roles_not_initials`,
diagram guards (`diag_simple`, `diag_caption_clean`, `diag_storyline` — E2E starts at the user action,
top-down, ≤~10 nodes in architecture, no jargon in captions).

## 3. Re-score the Prozessanalyse
If the rework changed effort/approach/hours, re-run **"Durch KI bewerten"** (Prozessanalyse tab) so
the score matches the concept (else quadrant/effort stay stale). Sanity-check the result; if the AI
still low-balls effort, flag it (score is a human call).

## 4. Keep the helper app synced (always)
After each meaningful change, `POST /api/review` (helper app, localhost:8765) to set the guard flags +
notes for this process. Keep skill and app in lockstep. If the app server is down, restart it
(`python3 app.py`).

## 5. Done criteria
Every **required** guard is true, or set to **n.a. with a documented reason** (e.g. arch_diag n.a. for
a single-tool process; compliance_synced n.a. = read-only field → flag). Fresh token when the ~1h JWT
expires (pull again from Chrome localStorage).

## Parallel-Betrieb (du bist evtl. einer von mehreren)
Andere Agenten bearbeiten parallel andere Prozesse derselben Firma. **Vor dem Rework den Team-Update-Feed
lesen** (`GET /api/updates?company=<slug>`) und **eigene Querschnitts-Findings teilen**
(`POST /api/update {company,agent,process,tags,text}`): erfundene/echte Tools, Branche, geteilte
Module/Eingänge (InboxMate, Artikel-Matching), OS-Konsolidierung, Preis-/Lizenz-Fakten, System-of-Record.
Prozess-Details → `review.json`; nur Übergreifendes → Feed. Nur DEINEN Prozess anfassen.

## Hard rules
- **NEVER** set `approved`/HI-freigegeben (human) or name the presentation date (Dominik).
- Every write is **live customer data** — outside an explicitly-authorized batch run, confirm each
  write. In a user-authorized multi-terminal batch, proceed but stay precise and verify.
- Output: per-guard status + notes for this one process (hand back to the wrapper / user).
