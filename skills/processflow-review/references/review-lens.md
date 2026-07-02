# Review lens (per process)

Apply these in order. End every review with a verdict: ✅ tragfähig · ⚠️ mit Auflagen · 🔧 vereinfachen ·
❓ erst validieren · ❌ nicht so bauen.

## 1. Provenance — is the canvas even real?
- `source_image_url` present → a whiteboard exists. **Read it and diff** against the digitized canvas.
- `source_image_url` null + `presented_by` null + `estimated_hours_source: "ai"` + empty `canvas_chat_history`
  → the canvas is **AI-synthesized**, not workshop-captured. The theme may still be real, but flag that the
  process needs customer confirmation before any build, and treat its ROI/numbers as guesses.

## 2. Canvas vs whiteboard vs transcript
The AI enriches and sometimes corrupts. Common, recurring failure modes to hunt for:
- **Invented role breakdowns.** Canvas/whiteboard says "alle Mitarbeiter" → AI fabricates 4 departments in
  Zielgruppe/Aufgaben&Rollen. Revert to what was actually written. Note: §7 (who to involve in the project)
  is often a *different, smaller* set than §3 (who's affected) — check the transcript for corrections.
- **OCR misreads becoming "facts".** e.g. "ziwa" → "3wa", then the AI invents "3wa, a subsidiary of…".
  Verify company/entity names against research; strip hallucinated facts.
- **Tool drift.** Word vs Excel, Adobe Sign (US!) vs an EU e-signature, "Microsoft 365 E-Signatur-Funktion"
  (doesn't exist). Data sources added that weren't named (e.g. Netzlaufwerk).
- **Blank fields the AI filled.** If the whiteboard left time/Mal or MA-count blank, the app's numbers are
  estimates → the ROI built on them is unvalidated. Say so.
- **Vision/Nutzen scope-creep.** The AI adds "revisionssicher", "durchgängige Statustransparenz", etc. that
  the customer never asked for and that belong to a bigger initiative. Trim to the stated ask.

## 3. Right-size the solution — the two principles
**Smallest ideal solution (standalone pains):**
- Isolate the ONE real pain. Ask: what's the minimum that removes it? Usually a tool they already own
  (M365: Lists/Planner/To Do/Outlook; or one focused SaaS like an EU e-signature).
- Strip what the pain doesn't require: Power Automate, Forms, BMD integration, KI mail-classification,
  custom builds. Each must earn its place.
- Be honest about hidden cost: "im M365 enthalten / keine Zusatzkosten" is often false (Power Automate
  Premium, AI Builder credits, e-signature subscriptions, BMD API modules/licenses).

**BMD integration is the #1 unverified assumption (treat skeptically everywhere).** The AI keeps assuming BMD
automation is easy / a free "Bestandssystem." It usually isn't: programmatic access (NTCS Webservices/BMD-API)
is **license/module-gated**, the realistic path is often **file export/import + OCR (Finmatics)** not a live
API, and real integration is **partner-mediated (cost + dependency)**. Often BMD is run with/by the customer's
**Steuerberater**, so the customer may not even control it. → In quick wins, **avoid BMD coupling** (keep it as
the existing manual touchpoint). For finance/BMD clusters, flag BMD as the **key open question** and don't
score/price it as easy. Clarify with the customer: which BMD license/modules? API or only export/import? Who
operates BMD — the customer or the tax advisor?

**OS cross-boost (clusters):**
- When several processes share a hub and a relational data model that flat tools fit poorly, a custom
  neverlost OS web app is justified — it's vibe-coded and **hosted/maintained by us**, so no customer
  maintenance burden. Justify by **consolidation**, ROI = sum of folded-in processes.
- Keep **Stage 1 tight** (core only); defer the fragile/expensive bits (KI classification, deep BMD).
- Disclose the ongoing hosting relationship. Adoption (daily use by the whole team) is the real risk, not
  tech — say so.
- Watch the platform's reflexive stack: **n8n Private Cloud + winkk.ai + Mistral LLM + "Kunden-OS"** gets
  proposed almost everywhere. Cut it where a single owned tool suffices; embrace it only at a real hub.

## 4. Score sanity (Impact ×3, Aufwand ×2, Machbarkeit ×2, Change ×1, Compliance ×1 → /45)
- Recompute roughly and flag inflation. Common issues: AI-content score too high (no real KI needed);
  Impact double-counted across overlapping processes; Aufwand/Machbarkeit assuming the heavy stack is free.
- **Quadrant vs report contradiction:** a `quick_win` label on something the report calls a `project` with a
  large custom build is incoherent — pick one (quick win = the small owned-tool version; project = the OS).
- ROI: if `estimated_hours_source: "ai"` or denominators are inconsistent (÷2 MA vs `estimated_employees`
  5 vs "team of 10"), treat as estimate and say it's unvalidated.

## 4b. Deliverable rules (from neverlost/Dominik feedback — apply to every concept)
These are presentation/hand-off requirements; bake them into every rework prompt:
- **Architekturdiagramm** zusätzlich zum Datenfluss-Diagramm (grob genügt; IT könnte mit am Tisch sitzen).
- **Tool-Zuordnungen VOR Diagrammerstellung** vollständig setzen — **inkl. dem OS im Toolstack jedes
  Prozesses** (es ist KEIN org-weiter Landkarte-Tool, aber je Prozess als Individualsoftware zugeordnet,
  immer als *neu*). **Legende: rosa = Individualsoftware** — rosa darf NUR für Custom/OS stehen, sonst ist das
  Color-Coding semantisch falsch. Wurzel fast aller Diagramm-Fehler.
- **Phasen kompakt** beschreiben (nicht ausufern); **jede Phase in sich abgeschlossen** und **startet mit
  einem eigenen Analyseschritt** (Feinkonzept/Anforderungsaufnahme — abrechenbar, nimmt Risiko).
- **Out-of-phase-Themen NICHT ausführen** (z.B. BMD in Phase 2 nicht breit rechtfertigen) — Overhead raus.
- **Stunden validieren** — die KI schätzt oft **zu niedrig** (6h für ein Modul geht nie aus). Realistische
  Dev-Aufwände ansetzen.
- **Keine Personen-Initialen** im Konzept — durch Rollen ersetzen (JS/JK → „Controlling-Leitung" etc.).
- **Zwei Lösungswege → zwei getrennte Diagramme** (nicht eins mit beiden Ansichten).
- **Tool-Landkarte nach jeder Analyse prüfen:** OS zugeordnet? Bestand vs. neu korrekt (M365/Outlook =
  Bestand)? Keine Namens-Dubletten? Kanonische Tool-Namen verwenden.

## 4c. „Smallest solution" ≠ unter-motorisiert
Die kleinste Lösung muss den Kunden trotzdem glücklich machen. Wo der Kunde KI erwartet, ist eine
„einfache erste Lösung" ohne KI die falsche Antwort — Beispiel **Suchen in Verträgen**: reine
SharePoint-Volltextsuche bringt nichts; **KI-Wissensmanagement (winkk.ai oder Langdock)** gehört direkt in
den Kern. Smallest = kleinster *sinnvoller* Lösungsraum, nicht das Weglassen des Kernnutzens.

## 4d. Transkript-Suche: Schreib-/Semantik-Varianten
Bei 0-Treffern NICHT vorschnell „KI-erfunden" schließen — erst Varianten prüfen (z.B. „Jahrfixe" war ein
Übersetzungsfehler für **„JourFixe"**; korrekt suchen: jour fixe / jourfixe / fixe / wiederkehrend /
regelmäßig). Erst wenn auch Varianten 0 ergeben → Verdacht erhärtet.

## 5. Synergie-Effekt annotation (for the solution concept)
One line per process, e.g.:
- *Synergie-Effekt: Teil des zentralen ziwa OS (Cluster „Aufgaben & Fristen", mit Aufgabenmanager, Jahrfixe,
  Versicherungsfälle). Nicht einzeln bauen — ROI dort konsolidiert.*
- *Synergie-Effekt: keiner — eigenständig am besten gelöst (1 Tool, z. B. EU-E-Signatur).*
