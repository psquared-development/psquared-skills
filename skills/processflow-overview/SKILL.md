---
name: processflow-overview
description: >
  START HERE for a NEW company in the neverlost ProcessFlow engagement. Use when kicking off a
  review from zero context — "neue Firma reviewen", "starte ProcessFlow für <Firma>", "verschaff dir
  einen Überblick", company + curl/URL pasted. Gives the engagement context, reads the workshop
  transcript from the company folder, ingests the processes, triages them by the official
  Analyse-Reihenfolge (rule/filter/priority), and produces the top-10 worklist + a short per-process
  overview — WITHOUT deep-working any process. Its output is the hand-off list for the per-process
  workers (processflow-run). This is the first of the split ProcessFlow skills.
---

# ProcessFlow — Overview / Kickoff (from zero)

You are starting a fresh company. Build the map, not the buildings.

## What this engagement is (context you need at 0)
neverlost (Dominik Rockenschaub) runs paid workshops; an AI fills a **canvas** per process in the
**ProcessFlow** app (`processflow.neverlost.at`, Supabase backend) and proposes a **Lösungskonzept** +
score + diagrams. **psquared (Martin) red-teams AND refines** those analyses — paid deliverable, per
customer. The AI is often wrong (wrong industry, invented tools, rebuilds what the ERP already does,
wrong AI technique, mis-priced). Our job: catch that and produce presentation-ready concepts.
Load the shared knowledge: **`processflow-review`** (guardrails = Definition of Done) and
**`processflow-app`** (how to drive it: helper app + Chrome-MCP). Standard = Dominik's SOP.

## Phase 1 — Setup & context (SOP, once per project)
Do the SOP setup check (`setup_verified` in `processflow-review/references/guardrails.md`): customer
briefing/industry/size, tool preferences, project IT-infra, project-tool types (Bestand vs. Neu),
context & transcripts. Missing → ask the workshop lead, don't guess.

## Phase 2 — Read the transcript (from the folder)
The workshop transcript is stored in the company folder, typically
`technical-analysis/<company>/meeting-notes.txt`. **Read it fully first** — it's ground truth. Note:
industry/products (exact!), real systems/ERP (exact names), the customer's stated priorities and
pains, who said what. This is what every later transcript-check compares against.

## Phase 3 — Ingest the processes
Chrome is logged into ProcessFlow as the user → pull the session token from `localStorage`
(`sb-…-auth-token` → `access_token`) + anon apikey from any request; you do NOT need a pasted curl.
Use the helper app (`processflow-tool/`, skill `processflow-app`) to ingest processes+scores+reports
into `data/<company>/`. **Filter by `project_id`** (multiple customers share one org → RLS won't
separate them). Save the transcript into the app too.

## Phase 4 — Triage by Analyse-Reihenfolge (rule/filter/priority)
Run `processflow-review/scripts/select.py <processes.json> --scores <scores.json>` — it applies the
11-tier order (Kundenfavoriten·QuickWin·Foto → … → Rest). Take the **top 10**. Score/quadrant live in
`process_scores` (NOT on the process row); photo = `source_image_url`. Surface anything near the cut.
**Question the ranking against the transcript**: if the customer's #1 stated priority scores low
(the AI does this), flag it and consider elevating — but that's a human decision; present it.

## Phase 5 — Overview only (no deep work)
For each of the 10, one line: what it is (per transcript), cluster, score/quadrant, obvious concerns
(no foto → AI-synthesized; not in transcript → suspect). Note cross-cutting themes (shared tools,
InboxMate as intake, an OS-consolidation angle, industry-hallucination risk). **Do not** rework
concepts, edit canvases, or touch diagrams here.

## Output (the hand-off)
1. The **top-10 worklist** (exact process names + IDs) — this is what gets split across terminals.
2. A short **context brief**: industry (exact), real systems/ERP, transcript priorities, cross-cutting
   notes, and any elevate/swap flags for the human.
3. Tell the user: next, open one terminal per process and run **`processflow-run <process name>`**
   (works the process to guardrail-completion + self-critique + fix). Overview does not build.

Never set `approved`/HI-freigegeben (human) or name the presentation date (Dominik).
