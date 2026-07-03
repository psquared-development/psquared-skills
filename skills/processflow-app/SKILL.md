---
name: processflow-app
description: Use when reviewing a new company's ProcessFlow processes (psquared red-team of the AI-generated analyses) and you want the local ProcessFlow Review Tool to drive it fast. Covers starting the local app, ingesting a company from a pasted curl (1h token), tracking the review checklist + transcript checks, capturing canvas diffs in-app, and generating copy-ready prompts for the in-app AI. Triggers on "neue Firma reviewen", "ProcessFlow tool", "Prozesse holen", company + curl pasted.
---

# ProcessFlow App — Driver

Local tool that accelerates the review. Lives at
`…/technical-analysis/processflow-tool/` (`app.py` + `ui/index.html`, stdlib only,
read-only, fetches via system `curl`). This skill is the **how-to-drive**; the review
**judgement** comes from the `processflow-review` skill (review-lens, principles) — use both.

## Start it
```bash
cd <repo>/technical-analysis/processflow-tool && python3 app.py   # → http://localhost:8765
```
Run in the background; it auto-opens the browser. State persists in `data/<firma>/*.json`.

## SOP-Einstieg (Dominik, verbindlich — VOR der Analyse, einmal je Projekt)
Erst Setup & Kontext im System prüfen, dann analysieren (sonst baut man auf falschem Fundament):
1. **Kunde prüfen** — Firmenrecherche & Meeting-Briefing (Branche, MA-Zahl, Ansprechpartner).
2. **Tool-Präferenzen** — Kunde → *Bearbeiten* → Tab **„Tools"**: korrekt hinterlegt?
3. **Projekt-IT-Infrastruktur** — Projekt → *Bearbeiten*: vollständig & stimmig? Fehlt etwas →
   **Rückfrage Workshopleiter/Projektleitung**, nicht raten.
4. **Projekt-Tools** — Tab „Projekt-Tools": jeder Tool-**Typ** korrekt (Bestandssystem vs. Neu).
5. **Kontext & Transkripte** sichten.
Dann Sortierung **„Analyse-Reihenfolge"**, max. 10 Prozesse top-down. Pro Prozess: Canvas
verifizieren → Scoring verifizieren → Lösungskonzept verfeinern → **„HI-freigegeben"** setzen.
(= Guard `setup_verified`; Details in `processflow-review/references/guardrails.md`.)

## Per-company flow
1. **+ Firma**: paste company name + any authenticated `curl` from ProcessFlow. The app
   extracts `apikey`, `Bearer`, `organization_id`, and base URL. Token ~1 h.
2. **⤓ Prozesse holen** (`/api/ingest`): pulls processes + scores + reports → local JSON.
   - Default list query `processes?select=*&order=name.asc` relies on RLS scoping to the org.
   - If it returns nothing / cross-org: pass `list_path` to `/api/ingest`, or add processes
     individually via `/api/add_process` with a process URL/ID (fetch-by-id is proven).
3. **📄 Transkript** einfügen (the workshop transcript) — enables per-process search.
4. Work each process (sorted by score): tabs Übersicht / Canvas / Transkript-Check /
   Canvas-Korrektur / Prompts. The Übersicht checklist = the **Guardrails / Definition of Done**
   (`processflow-review/references/guardrails.md`): 👁 = you verify manually (hours realistic,
   tool-Landkarte, color-coding, diagrams), 🤖 = ensured via the rework prompt. The process list
   shows a `done/total` Pflicht-Guard counter; only mark **Freigegeben** once all required guards
   are ticked. Saves to `review.json`.

## Non-negotiable review rules (carry over)
- **Transcript-check EVERY process.** 0 hits for the core term = AI-invention suspect →
  question it (this caught „BSB"→Brandschutz and the invented „Jahrfixe").
- **Smallest solution in the customer's interest.** Strip over-engineering (no expensive
  APIs/RAG/extra stacks when M365 + a little glue suffices). The "Smallest-Solution-Check"
  prompt button helps.
- **BMD = unverified risk.** Never in quick wins; manual/later only; not a data source unless
  proven.
- **ziwa-OS / Custom Web App is NOT a Landkarte tool** — it's listed per process, always as
  **new** (not Bestand). Use ONE canonical name per company (e.g.
  `ziwa-OS – Modul <X> (neverlost Individual-Web-App)`) so the per-process tool entries stay
  consistent. Verify tool naming to avoid Landkarte duplicates (SharePoint vs Microsoft
  SharePoint, Outlook variants, …).
- **InboxMate is psquared's own product** — disclose the conflict when recommending it for
  email triage.
- **Canvas/Lösungskonzept/Diagramm are separate in-app AIs** — the canvas AI needs its own
  self-contained prompt (it has little context). The app's Canvas-Korrektur tab builds it.
- **Max 10 processes/company**; favourites + quick-wins-with-photo first. At the end,
  recommend the **best 4 to present** (clear path, readable from diagram+concept; lead with
  the customer's own stated priorities from the transcript).

## ProcessFlow-Bedienung über Chrome-MCP (gelernt, WICHTIG)
- Die MCP-Chrome ist als der Nutzer **live in der Produktiv-ProcessFlow** eingeloggt → **jeder
  Schreibvorgang trifft echte Kundendaten**. Read-only frei; **jede schreibende Aktion einzeln
  bestätigen lassen**.
- **Canvas-Copilot „Übernehmen" nicht vergessen!** `update_canvas` erzeugt nur einen **Vorschlag**
  (Banner „KI-Vorschläge prüfen — N Felder vorgeschlagen" mit *Verwerfen/Übernehmen*). Erst nach
  Klick auf **Übernehmen** ist es gespeichert. Immer danach verifizieren (Banner weg).
- **Der Copilot/KI ist je Tab unterschiedlich:** Canvas-Daten → „Canvas-Copilot" (Vorschlag→
  Übernehmen); Lösungskonzept → editierbares Rich-Text-Feld + „Speichern" (und „Neu generieren" =
  Voll-Regenerate, meiden!); andere Tabs ggf. eigene Mechanik. Vor dem Schreiben prüfen, welcher
  Mechanismus der jeweilige Tab hat.
- **BESTES Werkzeug für Lösungskonzept-Edits: „Vom Copilot überarbeiten lassen"** (Konzept-Copilot,
  Button-title genau so). Ihm eine präzise Liste der gezielten Änderungen geben → er ändert
  **formatierungserhaltend** UND kann in einem Rutsch zusätzlich das **Diagramm** aktualisieren und
  Solutions/Tools verknüpfen (manage_diagrams / Solutions). Persistiert server-seitig
  (tool calls); falls danach ein „Speichern" sichtbar ist, klicken. Danach immer verifizieren
  (Felder + dass keine ungewollte 2. Stelle übrig blieb, z. B. BMD-Begründung an zwei Orten).
- **Grenzen des Konzept-Copilots (Stütz beobachtet — je Session verifizieren, nicht blind glauben):**
  Er editiert **nicht** die **„Begründung der Empfehlung"**-Textbox und **nicht** den Empfehlungs-Typ
  (C) → diese direkt im Textfeld setzen (Value-Setter + input/change + blur) und **„Speichern"**. Das
  **Entfernen** einer verknüpften Solution lief manuell über das **Papierkorb-/lucide-trash2-Icon** in
  der Solutions-Liste, nicht über den Copilot. Verknüpfen kann er vorschlagen — Ergebnis immer prüfen.
- **NICHT** lange/formatierte Rich-Text-Felder per MCP komplett neu tippen (TipTap/ProseMirror) —
  das plättet Überschriften/Bullets. MCP-Tippen nur für kurze, unformatierte Felder. Für gezielte
  Edits in langen Feldern → Konzept-Copilot.
- **Copilot-Eingabefeld kann vorbefüllt sein** (z. B. Diagramm-Template) → vor dem Tippen mit
  Meta+A leeren, sonst vermischt sich die Anweisung.
- **React-Eingabefelder:** Der Copilot-Input ist controlled; programmatisches Befüllen braucht
  ggf. einen Value-Tracker-Reset + `input`-Event, sonst bleibt der Senden-Button disabled.
- **Surgische Canvas-Edits:** Metadaten (Prozessname/Frequenz/Zeit/MA/„Daten digital") sind echte
  Textfelder → direkt editierbar. Die §-Abschnitte sind gerenderter Text → nur via Canvas-Copilot
  (gezielte Anweisung) änderbar. Immer Vorher-Stand sichern (main.innerText) und nachher diffen.
- **Tool-Landkarte je Projekt:** Button **„Tools"** im Projekt; OS muss je Prozess als
  Individualsoftware (rosa, neu) zugeordnet sein (vor Diagrammerstellung).
- **Diagrammtypen (Abschnitt „G) Diagramme"):** unten **„Diagramm hinzufügen"** mit vier Typ-
  Buttons: **Architektur · End-to-End Ablauf · Sequenz · Module**. Ein Klick auf einen Typ ist
  **kein Filter**, sondern startet sofort den **Konzept-Copilot mit einem vorbefüllten Generier-
  Prompt** für genau diesen Diagrammtyp (er erzeugt das Diagramm formatierungs-/farbkonform und
  persistiert es). **Dominics G1** verlangt **je Prozess mind. ein End-to-End-Ablauf-Diagramm
  (kundenseitig) UND zusätzlich ein Architekturdiagramm (Container-View, für IT)** — außer bei
  trivialen Ein-Tool-Prozessen (z. B. Skribble-E-Signatur), wo ein C4-Diagramm kaum Mehrwert hat.
  Nach dem Generieren immer **Seite neu laden** und verifizieren (Anzahl im „G) Diagramme N"-Badge,
  Color-Coding, keine Initialen).
- **Auto-generierte Diagramme sind zu komplex + die Captions enthalten Jargon.** Der Generier-Prompt
  baut volle C4-Modelle mit vielen Nodes und schreibt in die Beschreibung Interna wie „rosa",
  „:::custom", „:::existing", „C4-Ebene 2", „Layer". Beides ist falsch: **(a) Diagramme so einfach
  wie möglich** (nur nötige Nodes/Edges, Architektur möglichst ≤ ~10 Nodes — granulare Schritte
  gehören in den Ablauf, nicht ins Architekturbild); **(b) Caption kundenseitig** ohne Styling-/
  Tool-Begriffe. Daher nach dem Generieren per Konzept-Copilot „vereinfachen + Caption in normaler
  Sprache, keine Farb-/Klassennamen" nachschärfen.
- **„E) Datenschutz-Compliance" / „DSGVO-Empfehlungen" ist ein eigenes KI-Feld** — der
  **Konzept-Copilot beschreibt es NICHT** (update_report betrifft nur das Lösungskonzept). Initialen/
  Begriffe, die dort stehen (z. B. „JK Vollzugriff, JS Lesezugriff"), bleiben nach einem Copilot-
  Lauf bestehen → separat behandeln/flaggen. Der Copilot kann den Wunsch-Text zwar *anzeigen*, aber
  nicht speichern.

## Zuverlässigkeit & Datenaktualität (gelernt, WICHTIG)
- **Der Konzept-Copilot ist langsam und kann stumm scheitern.** Läufe dauern regelmäßig 60–110 s; ein
  Lauf hing ~5 min und hat **nicht** persistiert (nur durchs Neuladen aufgefallen). Regel: **nach JEDEM
  Copilot-Lauf Seite neu laden und die Änderung verifizieren** — nicht darauf vertrauen, dass sie ankam.
  Lieber **kurze, gezielte Prompts** (lange/verkettete Anweisungen hängen häufiger). Hängt ein Lauf
  > ~2 min, von „nicht gespeichert" ausgehen und vor dem Retry den Ist-Stand prüfen.
- **Schritt-Stunden (C) „Umsetzungshinweis" / `next_steps`) gehören dem Copilot.** Die Stunden direkt im
  manuellen Feld zu ändern hat bei Stütz **nicht persistiert**; zuverlässig war die Anweisung an den
  Konzept-Copilot. Stundenänderungen also über den Copilot fahren und per Reload verifizieren.
- **Radix-Switches/Tabs (z. B. Bestand/neu) unmittelbar nach dem Klick unzuverlässig auslesen.** Der
  Zustand kippte bei Stütz hin und her → erst **nach Neuladen** (oder per Screenshot) als gesichert
  werten; schreibende Klicks brauchen die volle Pointer-Event-Sequenz.
- **Cache-Falle: die lokale Helper-App-JSON (`processes/reports/scores.json`) ist ein Snapshot.** Nach
  JEDER Live-Änderung via Chrome-MCP ist sie veraltet — bei Stütz stand im Cache Kalkulation 140 h /
  #2 8,5 h, live waren es 76 h / 24 h. **Nie Stunden/Scores aus dem Cache in ein Deliverable schreiben —
  vorher live nachlesen.**
- **Leeres Ergebnis ≠ „sauber".** Ein abgelaufener Supabase-JWT liefert eine **leere** Antwort, die wie
  „Canvas sauber / keine Findings" aussieht (hat einmal einen falschen Freibrief erzeugt). Vor jedem
  Schluss aus einem Fetch: **Zeilenzahl > 0** prüfen.

## Token refresh
When the timer runs low, **↻ Token** → paste a fresh curl (any authenticated request).
`apikey`/base are kept; only the Bearer is replaced.

## Output
Diffs and checklists live **in the app** (`review.json`), not in separate HTML files.
Prompts are copy-ready in the Prompts / Canvas-Korrektur tabs. For a client/colleague
hand-off, build a shareable summary Artifact (4-to-present + key insights + transcript
excerpts), as done for ZIWA. **Zwei Ausgabeformen anbieten:** eine **claude.ai-Artifact**
(Login/Share nötig) UND eine **eigenständige, self-contained HTML-Datei** (Inline-CSS,
System-Fonts, keine externen Abhängigkeiten → offline & als Anhang teilbar) für manuelles
Teilen. Immer die **ProcessFlow-Deeplinks** je Prozess einbetten
(`…/process/<id>/wizard?tab=feasibility`), damit Dominik direkt ins Konzept springt, und
Ranking-Umstufungen mit **▲/▼ + Begründung** transparent zeigen.
