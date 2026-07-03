---
name: processflow-review
description: >
  psquared's second-opinion review of neverlost ProcessFlow AI process analyses for a customer.
  Use this WHENEVER the work involves reviewing/critiquing ProcessFlow processes, canvases, scorings
  (Prozessanalyse), or solution concepts (Lösungskonzept) for a company — e.g. "review ZIWA's processes",
  "look at this process / canvas / Lösungskonzept", "is this solution over-engineered", "what should we
  change in the canvas", "fetch the processes from ProcessFlow", or critiquing AI-proposed automation for
  an Austrian SMB on the neverlost/ProcessFlow platform (Supabase backend at *.supabase.co,
  processflow.neverlost.at). Trigger even if the user just pastes process JSON or a canvas screenshot and
  asks "anything missing / wrong?". Each new company = a fresh run of this skill.
---

# ProcessFlow Review (psquared ↔ neverlost)

> **START HERE (Einstieg für 0-Kontext):** Dies ist eine **paid red-team + (re)authoring**-Aufgabe:
> neverlost/Dominik lässt KI-Prozessanalysen im Tool **ProcessFlow** (`processflow.neverlost.at`)
> erstellen; **psquared (Martin)** prüft sie kritisch UND verfeinert/autort die Lösungskonzepte
> (Dominik zahlt dafür). Pro Firma bis 10 Prozesse.
> - **Primärer Arbeitsweg = die Helper-App** (`processflow-tool/`, Skill **`processflow-app`** — IMMER
>   zusätzlich laden). Diffs/Checklisten leben in `review.json`, **nicht** in separaten HTML-Dateien.
>   Die CLI-Scripts/`canvas-korrektur.html` hier sind **Fallback**.
> - **Schreiben in ProcessFlow** läuft über **Chrome-MCP als der eingeloggte Nutzer → jeder
>   Schreibvorgang trifft ECHTE Kundendaten** (Mechanik + „jede Schreibaktion einzeln bestätigen" in
>   `processflow-app`, Abschnitt „ProcessFlow-Bedienung über Chrome-MCP").
> - **Token:** Chrome ist als Nutzer eingeloggt → Session-Token aus `localStorage`
>   (`sb-…-auth-token` → `access_token`) + anon `apikey` aus einem Request ziehen; kein curl-Paste nötig
>   (~1h gültig, bei Ablauf neu ziehen). **Transkript** liegt im Firmenordner
>   (`technical-analysis/<firma>/meeting-notes.txt`).
> - **Der Agent setzt NIE `approved`/HI-freigegeben** (macht der User) und **nennt NIE den
>   Präsentationstermin** (macht Dominik) — siehe Memory `rule-agent-never-approves`.
> - Standard = Dominiks **SOP** (Memory `dominik-sop-prozessanalyse`); Definition of Done =
>   `references/guardrails.md` (inkl. **Fehlermuster-Register** am Ende).

## Skill-Landkarte (aufgeteilter Workflow — für Multi-Terminal)
Dieser Skill (`processflow-review`) ist die **Wissensbasis** (Guardrails/Prinzipien); `processflow-app`
ist der **Driver** (Chrome-MCP + Helper-App). Der operative Ablauf ist in vier Skills gesplittet:
- **`processflow-overview`** — Start bei 0: Kontext + Transkript lesen + Prozesse ingesten + nach
  Analyse-Reihenfolge triagieren → Top-10-Worklist. Baut nichts.
- **`processflow-process <name>`** — arbeitet EINEN Prozess bis alle Guards erfüllt sind.
- **`processflow-critic <name>`** — red-teamt EINEN Prozess (Fehlermuster-Register + Web-Recherche) → Issue-Liste.
- **`processflow-run <name>`** — Wrapper pro Terminal: process → critic → Feedback einarbeiten (Loop).

**Multi-Terminal-Muster für eine neue Firma:** 1 Agent macht `processflow-overview` → Conversation auf
~10 Terminals splitten → jedes Terminal `processflow-run <sein Prozess>`. Siehe Repo-README.

## What this is
neverlost (Dominik Rockenschaub) runs paid workshops; trainers fill a **canvas** per process (on a
whiteboard, then digitized in the **ProcessFlow** app). An AI then scores each process and proposes a
**Lösungskonzept**. **psquared (Martin) is the red-team / second opinion** — NOT the author. Per process we
find what is *missing, unclear, contradictory, hallucinated, or wrong-sized for a small team*.

**Two standing principles** (both matter — they pull in opposite directions, use judgement):
1. **Smallest ideal solution.** Strip AI over-engineering. For a single standalone pain, recommend the
   smallest fix — often one tool the customer already owns, no automation platform, no KI. (e.g. ZIWA
   "Aufträge" → just an EU e-signature tool.)
2. **OS cross-boost.** neverlost's custom "OS / Individualsoftware" web apps are vibe-coded (cheap to build)
   and **hosted+maintained by neverlost/psquared** — so the usual "customer can't maintain it" objection
   doesn't apply. A custom OS is the **right** call when **several processes consolidate** into one hub
   (shared data model standard tools fit poorly). Then ROI = the SUM of the folded-in processes, and those
   satellites must NOT be separately built/priced. Add a **Synergie-Effekt** note per process saying whether
   it folds into the OS (and which cluster) or stays standalone.

Default lean: standalone trivial pain → smallest tool; cluster of related pains → OS hub. Always the
customer's best interest, never the most billable build.

## Workflow (4 phases)

### Phase 1 — Gather
1. Create a per-company auth file from the user's browser session (the bearer JWT lasts ~1h):
   copy `assets/processflow-auth.env.example` → `<company>/_tooling/processflow-auth.env`, fill
   `PF_BASE`, `PF_PROJECT` (project UUID from the app URL), `PF_APIKEY` (the `apikey` header) and
   `PF_TOKEN` (the `authorization: Bearer …` value). Ask the user to paste a curl/headers from DevTools.
2. `source` it, then run `scripts/fetch_all.sh <out_dir>` → saves `processes.json`, `scores.json`,
   `reports.json` for ALL processes. (Only 3 tables are used: `processes`, `process_scores`,
   `process_analysis_reports`. **Do not enumerate the schema** — the root endpoint is 401 and the user
   asked to stay on known endpoints.)
3. On `401`: token expired → ask the user for a fresh `authorization: Bearer …`, update the env, re-run.

### Phase 2 — Select (max 10 per company)
Use neverlost's **official „Analyse-Reihenfolge"** (built into ProcessFlow; confirmed canonical by
Dominik). Within each tier sort by `total_score` desc; take the top 10 overall:
1. **Kundenfavoriten · QuickWin · mit Canvas-Foto**
2. **Kundenfavoriten · QuickWin · ohne Foto**
3. **QuickWin · mit Canvas-Foto**
4. **QuickWin (übrige)**
5. **Kundenfavoriten · NextBestThing · mit Canvas-Foto**
6. **Kundenfavoriten · NextBestThing · ohne Foto**
7. **NextBestThing · mit Canvas-Foto**
8. **NextBestThing (übrige)**
9. **Waitlist**
10. **NoGoAtTheMoment**
11. **Rest / unbewertet**

Note the nuance: favorites lead **only within their quadrant tier** — a favorite NextBestThing (tier 5)
still ranks below a plain QuickWin (tiers 3–4); it does NOT jump all strategic ahead of quick wins.
`quick_win` ↔ "QuickWin", `strategic` ↔ "NextBestThing"; favorite = `customer_relevance != "normal"`.

> **⚠️ Feld-Quellen (sonst selektiert man falsch):** `total_score` und `priority_quadrant` liegen
> **NICHT** im `processes`-Objekt (dort meist `null`), sondern in der Tabelle **`process_scores`**
> (`scores.json`, gejoint über `process_id`). Das Canvas-Foto-Signal ist **`source_image_url`** (nicht
> `has_canvas_image`). `select.py` muss `processes` + `process_scores` joinen; die 11-Tier-Reihenfolge
> oben ist kanonisch (das Script muss sie spiegeln, nicht nur 4 Tiers). In der **Helper-App** ist die
> Sortierung „Analyse-Reihenfolge" eingebaut → dort einfach top-down arbeiten.

`scripts/select.py` should mirror this order. Confirm the
top-10 with the user before deep work; surface anything close to the cut so they can override.

### Phase 3 — Per-process review
For each selected process: `scripts/fetch_process.sh <process_id> <out_dir>` (canvas + score + report).
Then apply `references/review-lens.md`. Key moves:
- **Whiteboard check.** If `source_image_url` exists, read the photo and diff the digitized canvas against
  it. If null + `presented_by` null + `estimated_hours_source: "ai"` → the canvas is **AI-synthesized**;
  flag it needs customer validation before any build.
- **Transcript check.** Compare against the workshop transcript (if available) for wrong/missing detail.
  Catch AI hallucinations (invented role breakdowns where the canvas says "alle Mitarbeiter", OCR misreads
  like "3wa"↔"ziwa", invented company facts, blank fields the AI guessed → unvalidated ROI).
- **Right-size the solution.** Apply the two principles above. Watch for the platform's reflexive heavy
  stack (n8n Private Cloud + winkk.ai + Mistral + custom OS) applied where a single owned tool would do.
- **Score sanity.** Recompute roughly; flag contradictions (e.g. quadrant `quick_win` while the report says
  `project` + 90h custom build — can't be both).

**Definition of Done (Guardrails).** Before a process counts as done/approved, it must satisfy
`references/guardrails.md` — the canonical checklist from neverlost/Dominik feedback (architecture diagram
added, tool assignments incl. OS-in-toolstack done BEFORE diagrams with correct color-coding [rosa = only
Individualsoftware], hours validated as realistic [the AI under-estimates], phases compact + each starting
with its own analysis step, roles not initials, smallest-but-not-undermotorized, tool-Landkarte checked, …).
These same items are the per-process checkboxes in the helper app — keep skill and app in sync.

**Deliverables per process** (in `<company>/processes/<slug>/`):
- `canvas-korrektur.html` — diff view (Geändert/Neu/Entfernt/Unverändert) of corrected canvas fields with
  per-item copy buttons + a changelog note, for pasting back into ProcessFlow. **ALWAYS produce this HTML
  whenever there are any canvas↔whiteboard differences — never just an inline list/prompt.** Build from
  `references/canvas-korrektur-template.html`; see that file's header for the quote-safety rule, then
  ALWAYS verify with `scripts/verify_html.sh <file>` before handing it over (a stray ASCII `"` inside a
  German-quoted string silently blanks the page).
- `review.md` — the critique (verdict, findings, score correction, Synergie-Effekt, open questions).
- A copy-ready corrected Lösungskonzept / changelog note when the solution needs reworking.

**In-app AI prompts must be self-contained.** ProcessFlow's regenerate-AI only sees the *current* process —
it has no memory of other processes or your OS/portfolio strategy. So when a process should fold into a
shared OS/hub, the prompt must *carry* that context (a short reusable "OS context block": data model, hosting,
which processes are modules, what's deferred). A bare "fold into the OS" produces junk. Keep one OS-context
snippet per company and prepend it to every fold-in prompt.

### Phase 4 — Portfolio synthesis
Cluster all selected processes (e.g. central task/deadline hub, document filing, contract intelligence,
finance/BMD, Mieter-CRM, one-off tool fixes). Decide which feed ONE OS vs stay standalone. Produce the
Synergie-Effekt map so nothing is double-built/double-counted. This is also where you advise neverlost on
the "build the OS" decision at portfolio level.

## Output language & artifacts
Customer-facing deliverables in **German** (Austrian context). Keep a `prozess-tracker.md` per company
(process · score · quadrant · review status · verdict). Save durable engagement facts to memory; don't
duplicate what the repo already records.

## Files
- `references/guardrails.md` — **Definition-of-Done checklist** per process (mirrors the helper-app
  checkboxes; from Dominik feedback). Gate every approval on it.
- `references/review-lens.md` — detailed criteria, the two principles in depth, common AI failure modes
  (incl. §4b–4d: deliverable rules, smallest≠under-motorized, transcript variant-search).
- `references/canvas-korrektur-template.html` — the diff/copy HTML (proven; read its header before editing).
- `scripts/fetch_all.sh`, `scripts/fetch_process.sh` — Supabase REST pulls (need PF_* env vars).
- `scripts/select.py` — applies the selection tiers, prints the top-10 worklist.
- `scripts/verify_html.sh` (+ `scripts/stub.js`) — syntax+render check for the generated HTML.
- `assets/processflow-auth.env.example` — auth template (per company; token refresh instructions inside).
