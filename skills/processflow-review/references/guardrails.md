# Guardrails — Definition of Done je Prozess

Kanonische Checkliste (deckungsgleich mit den Checkboxen der Helper-App). Vor „Freigegeben"
müssen die Pflicht-Guards erfüllt sein. `👁` = mensch/manuell prüfen · `🤖` = via Rework-Prompt
sicherstellen · *(falls zutreffend)* = bedingter Guard.

## Setup (verbindlicher Einstieg — je Projekt/Kunde EINMAL, vor der Analyse)
> Dominiks SOP, Abschnitt 3: erst Setup & Kontext sauber prüfen, dann analysieren.
- 👁 **setup_verified** — Vor der Analyse geprüft (einmal je Projekt):
  1. **Kunde**: Firmenrecherche & Meeting-Briefing gesichtet (Branche, MA-Zahl, Ansprechpartner).
  2. **Tool-Präferenzen** beim Kunden (Kunde → *Bearbeiten* → Tab **„Tools"**) korrekt hinterlegt.
  3. **Projekt-IT-Infrastruktur** vollständig & stimmig (Projekt → *Bearbeiten*); fehlt etwas →
     Rückfrage bei Workshopleiter/Projektleitung (nicht raten).
  4. **Projekt-Tools** (Tab „Projekt-Tools"): jeder Tool-**Typ** korrekt = **Bestandssystem vs. Neu**.
  5. **Kontext & Transkripte** gesichtet (zusätzlicher Workshop-Kontext + Aufzeichnungen).
  Danach: Sortierung **„Analyse-Reihenfolge"**, max. 10 Prozesse/Durchgang top-down.

## Quellen & Inhalt
- 👁 **canvas_wb** — **Canvas-Inhalt geprüft** — IMMER, auch ohne Foto:
  - **Mit Whiteboard-Foto:** digitalisierten Canvas gegen das Foto diffen.
  - **Ohne Foto (KI-synthetisiert):** Canvas (Problembeschreibung, Ablauf, Rollen, Frequenz, Tools,
    Datenquellen) **gegen das Transkript** prüfen — Feld für Feld, ob es wirklich so gesagt wurde.
    **Kein Foto ist KEIN Grund für n.a.** — im Gegenteil, dann ist der Transkript-Abgleich umso
    wichtiger (die ganze Canvas ist eine KI-Annahme und muss vor jedem Build kundenvalidiert werden).
- 👁 **transcript** — Gegen Transkript geprüft, inkl. Schreib-/Semantik-Varianten (nicht nur den
  KI-Begriff; 0-Treffer erst nach Variantencheck = Verdacht).
- 👁 **no_invent** — Keine KI-Erfindungen / OCR-Fehler (falsche Domäne, erfundene Rollen/Zahlen).
- 👁 **industry_correct** — **Branche/Produktwelt des Kunden stimmt im GESAMTEN Text.** Die KI
  halluziniert gern eine plausible, aber falsche Branche und zieht sie durch alle Felder (Ausgangs-
  situation, Beispiele, Prompt-Vorlagen, Benchmark-„industry"-Tags, Diagramm-Knoten). Prüfen: passen
  ALLE Produkt-/Branchenbegriffe zum realen Geschäft? Pro Firma eine kurze **Verbotsliste falscher
  Begriffe** grep-en (Report + Canvas + Diagramme). Beispiel Stütz (Schmuck/Goldschmiede): „Maschinen,
  Anlagen, Systemkomponenten, Sondermaschinenbau, Kabelverarbeitung, Baustelle, Bauteil, Baugruppe"
  waren durchgängig falsch (8/10 Prozesse) → alle auf Schmuck-Kontext korrigiert. War zuerst kein
  Guard → durchgerutscht. Auch Benchmark-/Referenz-Branchen-Tags in „Bekannte Lösungen" prüfen.

## Konzept-Qualität
- 👁 **steps_present** — **Umsetzungsschritte überhaupt vorhanden.** Prozesse mit eigenem
  Build/eigener Lösung müssen im „C) Umsetzungshinweis" tatsächlich Schritte/Phasen haben — **nicht**
  „Noch keine Umsetzungsschritte hinterlegt". **Ausnahme:** bewusst in den OS-Hub gefaltete Satelliten
  (z. B. CRM, Kundenmanager), deren Build+Bepreisung im Hub liegt — die dürfen leer sein. Aber der
  **OS-Hub selbst** (z. B. Aufgabenmanager) und jeder eigenständige Prozess **müssen** Schritte haben.
  (Dieser Guard fehlte zuerst → leere Umsetzung beim OS-Hub rutschte durch.)
- 👁 **hours_real** — Stundenschätzung realistisch. Die KI schätzt **zu niedrig** (6h für ein
  Modul geht nie aus) → gegen echten Dev-Aufwand validieren.
- 🤖 **phases_compact** — Phasen kompakt beschrieben; jede Phase in sich abgeschlossen.
- 👁 **analysis_per_phase** *(falls Phasen vorhanden)* — **JEDE Phase beginnt mit einem eigenen
  Analyse-/Feinkonzept-Schritt** (Auftragsabgleich vor Umsetzung, abrechenbar). Nimmt Risiko von
  Kunde und uns: zu Phasenbeginn wird (bezahlt) nochmal sauber gegen den Kundenauftrag geprüft, ob
  alles richtig definiert ist. **Achtung — der häufige Fehler:** nur **Phase 1** hat den Schritt
  (Kickoff/Workshop), die Folgephasen (Aufbau/Entwicklung/Test) starten direkt mit Umsetzung →
  **pro Phase einzeln den ersten Schritt prüfen**, nicht nur Phase 1. Hat ein Prozess gar keine
  Umsetzungsphasen (z. B. ins OS-Projekt gefaltet), ist der Guard n.a.
- 🤖 **no_overhead** — Kein Out-of-phase-Overhead (z.B. BMD in Phase 2 nicht breit
  rechtfertigen). Keine Rechtfertigung, wo keine nötig ist.
- 🤖 **roles_not_initials** — Rollen statt Personen-Initialen (kein „JS"/„JK" → „Controlling-
  Leitung" etc.).
- 👁 **smallest_fit** — Kleinste **sinnvolle** Lösung. Wo der Kunde KI erwartet (z.B. Suche →
  winkk.ai/Langdock), ist eine KI-lose „einfache erste Lösung" falsch. Smallest ≠ unter-motorisiert.
- 👁 **ki_anteil** — **KI-Anteil voll ausgeschöpft (Grundprinzip KI-First).** Nicht zu konservativ:
  **ab Stage 2 ist im System grundsätzlich alles KI.** Aktiv KI-Mehrwert suchen (z.B. Transkription
  bei Vor-Ort-Protokollen, semantische Suche, Klassifikation). `ai_percentage`/Stage-Split plausibel?
  Eine bloße Standardlösung (reine Volltextsuche o.ä.) ist **kein abgabefähiges Ergebnis**.
- 👁 **ki_solution_sense** — **KI-Lösung kritisch hinterfragen: macht sie für DIESEN Kunden wirklich
  Sinn?** KI-First heißt **nicht** KI um jeden Preis. Nutzen gegen Umstellungsaufwand, Praktikabilität
  und Compliance abwägen (SOP: „die Umstellung muss in Relation zum Erfolg stehen"). Keine KI, wo eine
  einfache Lösung dem Kunden mehr dient — und umgekehrt keine Standardlösung, wo der Kunde echten
  KI-Mehrwert erwartet. (Gegengewicht zu `ki_anteil`; zusammen mit `smallest_fit`.)
- 👁 **neverlost_defaults** *(falls zutreffend)* — **neverlost-Produkte als Default mitgedacht**
  (z.B. **InboxMate** für Inbox-/ToDo-Management statt bespoke n8n+LLM). Bei Empfehlung eines
  eigenen Produkts **Interessenkonflikt offenlegen**.
- 👁 **synergie_effekt** *(falls zutreffend)* — **Standalone-vs-OS-Fold-Entscheidung dokumentiert.**
  Pro Prozess festhalten, ob er in den OS-Hub einfließt (welcher Cluster) oder standalone bleibt —
  damit kein Satellit **doppelt gebaut/bepreist** wird (ROI auf OS-Ebene konsolidiert).
- 🤖 **bmd_safe** *(falls zutreffend)* — BMD nicht gekoppelt / als ungeklärtes Risiko markiert
  (manuell/später; nie als „freies Bestandssystem" angenommen).
- 👁 **pricing_verified** *(falls Preise/Tiers/„enthalten" genannt)* — **JEDE Preis-, Tier- oder
  „ist-schon-enthalten"-Aussage im Internet gegenchecken**, nicht der generierenden KI glauben.
  Typische Fallen: „Adobe Firefly ohne Zusatzkosten" (Firefly hat **limitierte generative Credits**
  je CC-Plan → Batch/Volumen kann kosten!), „Tool X €Y/Monat" (veraltet/falscher Tier), „im M365-Paket
  enthalten" (Power Automate Premium/AI-Builder sind es NICHT), Feature nur in höherem Tier. Vorgehen:
  Anbieter-Preisseite per WebSearch/WebFetch prüfen, Stand + Quelle notieren; wenn unklar → als
  „zu verifizieren / Stand prüfen" kennzeichnen statt eine Zahl fest behaupten. Gerade bei
  Volumen-Cases (z. B. ~200 Bilder/Halbjahr) Credit-/Nutzungslimits explizit bedenken.

## Tools & Diagramme
- 👁 **tools_assigned** — Tool-Zuordnungen **vollständig VOR der Diagrammerstellung**. Inkl. dem
  **OS im Toolstack jedes Prozesses** (Individualsoftware, **rosa**, als *neu* — kein org-weiter
  Landkarte-Tool, aber je Prozess zugeordnet). Bestand vs. neu korrekt (M365/Outlook = Bestand).
- 👁 **dataflow_diag** — Datenfluss-Diagramm vorhanden, **Color-Coding korrekt**: **rosa NUR für
  Individualsoftware/OS**. Falsche rosa-Elemente = irreführend → fixen.
- 👁 **arch_diag** — **Architekturdiagramm** zusätzlich ergänzt (= der **„Container View"**;
  grob genügt; IT könnte mit am Tisch sitzen).
- 👁 **diag_simple** — **Diagramme so einfach wie möglich**: nur die wirklich nötigen Nodes/Edges,
  keine granularen Einzelschritte im Architekturbild (die gehören in den Ablauf), keine
  überflüssigen Kanten-Labels. Lieber wenige klare Boxen als ein vollständiges C4-Modell. Faustregel
  Architektur: möglichst ≤ ~10 Nodes.
- 👁 **diag_caption_clean** — **Diagramm-Beschreibungen sind kundenseitig**: KEINE internen
  Styling-/Tool-Begriffe (`rosa`, `:::custom`, `:::existing`, `:::system`, „C4-Ebene 2", „Layer",
  „Subgraph", „Mermaid"). Die Lösung in normaler Sprache beschreiben; Farben/Klassen nie benennen.
- 👁 **diag_storyline** — **Präsentations-Test, JEDES Diagramm JEDES Prozesses einzeln — keine
  Stichprobe.** Kann man anhand des Diagramms in der Präsentation klar erklären, worum es geht —
  **von oben nach unten als Storyline** (Eingang → Verarbeitung → Ergebnis/Nutzen)? Pflicht: Richtung
  TD/TB (nicht LR), nicht zu viele Kreuz-Kanten (sonst „Hairball" → vereinfachen). **Alle Diagramme
  durchgehen** (Ablauf UND Architektur, jeder Prozess) — der häufige Fehler ist, nur 1–2 anzuschauen
  und den Rest anzunehmen. Strukturcheck (Mermaid: `flowchart TD`, moderate Kantenzahl) zählt als
  Test, visuell stichprobenartig zusätzlich. Präsentationsreife ist SOP-Grundprinzip.
- 👁 **two_diagrams** *(falls zutreffend)* — Bei zwei Lösungswegen **zwei getrennte Diagramme**
  (je eine Ansicht), nicht eins mit beiden.
- 👁 **landkarte_ok** — **Tool-Landkarte nach der Analyse geprüft**: OS zugeordnet? **OCR-/Fachtools**
  im Stack? **Branchentools** evaluiert/hinterfragt (z.B. Hausverwaltung: Hausmanager, IGEL — warum
  (nicht) im Einsatz?). Bestand vs. neu korrekt? Keine Namens-Dubletten (SharePoint vs Microsoft
  SharePoint, Outlook-Varianten …)? Kanonische Tool-Namen verwenden.

> **Color-Legende (eine Quelle — gilt für Diagramme UND Landkarte):**
> magenta `#ec4899` = **Individuelle Software / OS** · grün `#2ea579` = **Neues Tool** (inkl. KI wie
> winkk.ai) · schwarz = **Bestandssystem** · lachs `#fda4af` = **Workflow** (reine Automatisierung,
> NICHT das OS) · gelb = **Datenquelle** · grau = **Akteur/Rolle**. „rosa" in Diagrammen = magenta
> = Individualsoftware. **Verwechslungsgefahr lachs↔magenta** für OS — siehe `os_class_software`.
- 👁 **os_class_software** — **ziwa-OS / jede neverlost-Individual-Web-App MUSS Solution-Klasse
  „Individuelle Software" haben** — **nie** „Workflow" (und nicht „Tool"). Die App-Definition:
  Individuelle Software = eigenständige, individuell entwickelte Software; Workflow = Arbeitsabfolge/
  Automatisierung **ohne** eigenständige Software (das ist z. B. ein reiner n8n-Flow, NICHT das OS).
  Achtung: Default beim Anlegen einer Solution kann „Workflow" sein → nach jeder Verknüpfung im
  Edit-Dialog die Klasse prüfen. Landkarte-Farbe `#ec4899` (magenta) = Individuelle Software,
  `#fda4af` (lachs) = Workflow — die zwei dürfen für OS nicht verwechselt werden.

## Konsistenz (über alle Abschnitte)
- 👁 **consistency_check** — **Der Umsetzungshinweis (C: Empfehlung + Phasen/Arbeitsschritte) muss
  mit ALLEM übereinstimmen:** Lösungsansatz (B), Diagramm(en) (G), den verknüpften Tools/Solutions
  und der Datenschutz-Compliance (E). Typische Drift: ein KI-first-Ansatz im Lösungsansatz/Diagramm,
  aber der Umsetzungshinweis empfiehlt noch eine überholte „Stufe A (z.B. SharePoint-Volltextsuche)
  zuerst, KI nur als optionale Stufe B". Die **empfohlene Kernlösung** muss in **allen** Feldern
  dieselbe sein. Nach jeder Konzept-/Diagramm-Änderung den C-Abschnitt gegen B/G/Tools gegenlesen.
- 👁 **compliance_synced** *(falls zutreffend)* — **„E) Datenschutz-Compliance" gegen die finale
  Empfehlung geprüft.** Dieses Feld ist ein **blinder Fleck**: rein generiert, **read-only**, **nicht
  per Konzept-Copilot editierbar**, aktualisiert sich **nicht automatisch**. Dort gezielt prüfen, ob
  noch alte Logik/Initialen/„Stufe A-B" steht. Fix nur über ein zeitlich richtig gesetztes
  „Neu generieren" (vor dem finalen Diagramm-/Solution-Feinschliff) oder Backend. **Bedingter Guard:**
  ist das Feld nicht synchronisierbar (kein Backend/Feature), als **n.a.** markieren und als bekannte
  Restabweichung flaggen (NICHT als harte Freigabe-Blockade behandeln).

## Abschluss / Finishing (nach jeder Analyse)
- 👁 **presentation_date** — **Präsentationstermin genannt**: ab wann das Konzept beim Kunden
  präsentiert werden könnte. **⚠️ Den Termin nennt IMMER Dominik — NIE der Agent.** Für den Agenten
  ist dieser Guard extern (als n.a. behandeln, „durch Dominik").
- *(landkarte_ok deckt den zweiten Finishing-Task ab: Tool-Landkarte nochmal auf Plausibilität
  durchsehen.)*

## Freigabe
- ✅ **approved** — = **„HI-freigegeben"** im System. **⚠️ Setzt IMMER der Berater (Mensch) — NIE der
  Agent.** Der Agent erfüllt/zeigt alle Pflicht-Guards, aber das finale Freigeben ist eine
  menschliche/kundengerichtete Entscheidung (Canvas verifiziert, Scoring verifiziert, Konzept/Phasen/
  Stunden/KI-Anteil/Diagramm nach diesen Standards). Siehe Memory `rule-agent-never-approves`.

> **Kanonische Quelle:** neverlost/Dominik **SOP „ProcessFlow Prozessanalyse"** (verbindlicher
> Qualitätsstandard/Onboarding) + ZIWA-Projektreviews (2026-06) + psquared-Prinzipien. Grundprinzipien:
> **KI-First** (echter KI-Mehrwert, keine bloße Standardlösung), **Kunden-/Risikoperspektive**
> (Analyseschritt je Phase), **Kompaktheit**, **Präsentationsreife** (Architekturdiagramm gehört dazu).
> Begründungen & Hintergrund in `review-lens.md` (Abschnitte 4b–4d).
