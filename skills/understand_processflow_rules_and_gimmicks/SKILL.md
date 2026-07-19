---
name: understand_processflow_rules_and_gimmicks
description: Konsolidierte Regeln + Plattform-Gimmicks für die ProcessFlow-Prozessarbeit (neverlost) — Prozess-Triage/Duplikate/Kombinationen, Lösungskonzept-Stilregeln (kein Datenschutz!), Save-/Persistenz-Fallen, Phasen-Feld, In-App-KI-Macken. IMMER zusätzlich laden, wenn an ProcessFlow-Prozessen gearbeitet wird (neben processflow-review + processflow-app).
---

# ProcessFlow — Regeln & Gimmicks (konsolidiert)

Wissens-Skill aus den realen Engagements (ZIWA → Stütz → Bettenrid). Ergänzt
`processflow-review` (Guardrails/Fehlermuster) und `processflow-app` (Driver) — ersetzt sie nicht.
Bei Widerspruch gilt: neueste User-Anweisung > dieser Skill > Default.

## 1 · Bevor irgendein Prozess bearbeitet wird: Gesamtbild + Duplikate

1. **ALLE Prozesse der Firma zuerst sichten** (Liste + Scores + Kurzbeschreibung), nie direkt in
   einen einzelnen springen. Die KI-Erstanalyse erzeugt **Duplikate und Überlappungen** (z. B.
   „Kundendubletten – Falschbuchungen" [Buchhaltungs-OP-Abgleich] vs. „CRM-Datenqualität" — klingt
   gleich, sind zwei verschiedene Szenarien; oder mehrere E-Mail-/Termin-Prozesse, die dasselbe
   meinen). Je Prozess das **Szenario am Transkript festmachen**, nicht am Namen.
2. **Kombinationen vorschlagen, nicht stillschweigend mergen:** verwandte Prozesse als
   Konsolidierungs-Kandidaten markieren (OS-Hub-Cluster vs. Standalone) und **dem Menschen zur
   Entscheidung vorlegen**. Elevations/Umstufungen gegen das KI-Ranking immer mit ▲/▼ + Begründung
   ausweisen (Kundenpriorität + Canvas-Foto schlagen den Score).
3. **Artifact-Zwischenschritte einbauen** (bewährt bei Bettenrid): (a) Transkript-Analyse →
   Artifact, Mensch bestätigt Prozessliste; (b) Lösungsplanung mit recherchierten
   Preisen/Tools → Artifact, Mensch gibt Richtung frei; (c) erst DANN in ProcessFlow schreiben;
   (d) am Ende Review-Handoff-Artifact (vorher→nachher, 4-to-present, offene Punkte). Der Mensch
   reviewt zwischen den Stufen — nie alles in einem Rutsch bis in die App durchschreiben.
4. **Reihenfolge im Schreiben je Prozess:** Konzept-Text → Executive Summary (eigenes Feld,
   driftet sonst!) → Umsetzungsschritte → Solutions/Tools → Diagramme → Phasen-Feld → Guards.
   Nach JEDEM Schritt live verifizieren (DB-Grep bzw. Screenshot), nie der Chat-Antwort glauben.

## 2 · Stilregeln Lösungskonzept + Executive Summary (Martin, verbindlich)

- **KEIN Datenschutz/DSGVO im Lösungskonzept oder der Executive Summary.** Keine
  „## Datenschutz"-Abschnitte, keine EU-Hosting-/AVV-/Drittland-Hinweise, keine
  Tool-Ausschlusslisten („ChatGPT ausgeschlossen", „laut Tool-Ausschlussliste"). Echte
  Rechts-Klärpunkte (z. B. Einwilligungslage) als normalen Analyse-Schritt in Phase 0 schreiben.
- **KEINE Canvas-/Foto-Referenzen** („lt. Canvas-Foto", „im Canvas nicht erfasst").
- **KEINE Schätz-/Verifikations-Hedges** („Schätzung — zu bestätigen", „vorab prüfen", „nicht
  bestätigt"). Klärpunkte gehören als Analyse-Schritt in die Phasen (z. B. „Lizenzlage prüfen" =
  Teil von Phase 0), nie als Disclaimer in die Ausgangslage.
- **KEINE Frequenz-/Zeitaufwand-Angaben in der Ausgangslage** (stehen im Canvas).
- **KEINE Meta-Disclaimer** („kein KI-Einsatz", „klassische Threshold-Logik").
- **Keine A/B-Varianten, wenn der Kunde entschieden hat** (Bettenrid P7: GF wollte Prognose →
  nur die OS-Lösung, Power BI komplett raus — nicht als „Einstieg" behalten).
- **Kein Tool-Hardcoding bei Single-Source-Recherche:** Findet die Recherche nur EINEN Anbieter
  und Preis/Integration sind offen → **Evaluation-first**: Phase 0 bewertet den Markt-Kandidaten
  („z. B. adelo") + weitere Anbieter + IMMER eine `<firma>-OS`-Eigenbau-Variante (besonders wenn
  der Kunde „wenige Systeme" wünscht). Entscheidungskriterien ins Konzept; Diagramm-Knoten
  neutral („Terminierungslösung, Auswahl in Phase 0"); Schritte „Gewählte Lösung konfigurieren".
- **Eine gemeinsame OS-Solution `<firma>-OS`** für ALLE OS-Prozesse verknüpfen — nicht pro Modul
  eine eigene („die Software wird das OS"). Tool-Empfehlung heißt dann auch nur so.
- **Entweder-Oder nie doppelt verknüpfen:** nur die Erstempfehlung als Solution; Alternativen und
  Fallbacks bleiben im Text (sonst summieren sich Kosten: Omnifact+Langdock = 45 €/M-Fehler).
- **Echte Systemnamen** überall (Navision, nicht „Warenwirtschaftssystem (ERP)") — sobald der
  Name belegt ist (Canvas-Foto schlägt Transkript-Wortlaut; ASR verhört Namen: Vision→Navision,
  Petra Tagessa→Pedram Taghizadeh, Samuel Thomas→Thomas Sengl).
- Kundenseitiger, selbstbewusster Ton; Struktur/Hausstil von guten Prozessen spiegeln
  (`## Ausgangslage` → Phasen → `### Empfehlung`); Rollen statt Personen-Initialen.

## 3 · Das Phasen-Feld (UMSETZUNGSSCHRITTE / „~Xh Umsetzung")

- Die Kopfzeile „~Xh Umsetzung" und der sichtbare „UMSETZUNGSSCHRITTE (Σ Xh)"-Block lesen aus
  **`report.phases`** — NICHT aus `report.next_steps` (das schreibt der Konzept-Copilot). Beide
  driften auseinander → **immer synchron halten: phases-Summe = estimated_hours = next_steps**.
- **Der Copilot KANN `phases` nicht schreiben** (sagt er selbst). **Zuverlässiger nativer Weg:**
  Zeilen im UMSETZUNGSSCHRITTE-Editor per MCP befüllen (textarea/input value-setter reicht für
  den State) → dann den **„Speichern"-Button oben im Lösungskonzept-Editor klicken** — der
  committet auch die Phasen. Auto-Save allein feuert NICHT auf automatisierte Eingaben.
- Editor-Bedienung: „Schritt hinzufügen" für neue Zeilen; Löschen = **`lucide-x`-Icon** je Zeile
  (kein Trash-Icon); Phasen-Überschriften = Zeilen mit 0h. Vorher zählen, wie viele Alt-Zeilen
  existieren — sonst stapeln sich neue auf alte (22 Zeilen/98h-Falle).
- **„Schritte vorschlagen" zieht aus `implementation_custom`** — nicht aus `next_steps` oder der
  Tool-Variante. Bei „kein Entwicklungsprojekt empfohlen" (Tool-Fälle) kommt genau eine 0h-Zeile
  → Button ist dort nutzlos; Schritte manuell aus den next_steps übertragen (Bettenrid P4).

## 4 · Save-/Persistenz-Gimmicks (die teuersten Fallen)

- **„Neu generieren" NIEMALS klicken** — überschreibt sämtliche Audit-Fixes im Konzept.
- **Nach jedem Copilot-Lauf: Seite neu laden + DB gegenprüfen** (Vorher/Nachher-Grep). Der
  Copilot behauptet manchmal Erledigung ohne Tool-Call; Läufe hängen (>2 min = vermutlich nicht
  gespeichert); React-State zeigt Werte, die nie persistiert wurden.
- **`update_report` verlinkt manchmal automatisch externe Komponenten als Solutions**
  („+N externe Bausteine verlinkt") → nach jedem Report-Update die Solution-Links gegenprüfen
  und Fremdes entfernen (so kam Easy Contract an den Kundenservice-Prozess). Verursachung über
  `process_solutions.created_at` klären.
- **Solution-Klassen-Dialog („Individuelle Software"/„Workflow") schreibt `type` unzuverlässig** —
  beim Speichern landete schon „tool". Die DB kennt im `solutions.type`-Enum **nur
  `tool` | `custom_workflow`**; OS/Individual-Web-Apps = `custom_workflow` (UI-Badge zeigt dafür
  je nach Ansicht „Individuelle Software" — das Badge zählt, nicht die Roh-Spalte). Der Copilot
  **halluziniert Felder** (`kind`, `is_individual_software`) — nie glauben, per REST
  `?select=type` prüfen.
- **Bestand/Neu-Toggles** (Radix-Switches): nach Klick unzuverlässig auslesen → erst nach Reload
  als gesichert werten; Klicks brauchen die volle Pointer-Event-Sequenz.
- **Nicht-Copilot-Felder:** `gdpr_compliance` (E), `process_scores.rationales` und `phases` kann
  der Copilot nicht schreiben — Stale-Referenzen (winkk/n8n/Mistral/alte Varianten) überleben
  dort. Vor Präsentation PDF-Export ziehen und prüfen, ob diese Felder ausgegeben werden.
- **Token ~1 h:** leere REST-Antworten/`PGRST303`/`KeyError: 0` = Token abgelaufen → frisches
  Token aus Chrome-`localStorage` ziehen, NICHT die Daten anzweifeln. Lokale Helper-App-JSON ist
  ein Snapshot — Zahlen fürs Deliverable immer live nachlesen.
- **Direkte REST-Writes nur mit ausdrücklichem User-OK je Fall** (Leitplanke: In-App-KI + native
  Controls). Ausnahme-Präzedenz: `phases` bevor der Speichern-Button-Weg bekannt war.

## 5 · In-App-KI (Konzept-Copilot) richtig bedienen

- **Work-Modus** (nicht Ask). Canvas-Änderungen erzeugen Vorschläge → „Übernehmen" nötig.
  **Achtung: Der Modus resettet nach Browser-/Chrome-Neustart auf Ask** — vor jedem Prompt auf
  der Seite prüfen, sonst antwortet er nur beschreibend („Sobald Sie auf Work umschalten…").
- **Mikro-Prompts statt Sammel-Prompts:** große verkettete Aufträge enden in
  Endlos-Denkschleifen (>2 min „Reasoning…") — eine gezielte Änderung pro Nachricht; bei Hänger
  Seite neu laden und erneut senden. Für gezielte Textkorrekturen **exakte Ersetzungen** angeben
  („Ersetze X durch Y"), nicht beschreiben.
- **Formatierungserhaltend arbeiten** („kein Voll-Neuschrieb") — außer ein Feld soll bewusst neu.
- Die **Executive Summary ist ein eigenes Feld** und wird bei Konzept-Updates NICHT mitgezogen —
  immer separat prüfen/nachziehen. **Ein Voll-Rework via Copilot lässt sie sogar LEER zurück**
  (Bettenrid P1/P2: `concrete_approach` neu, `executive_summary` = leer, fiel erst im Review auf)
  → nach jedem Rework auf Nicht-Leere prüfen.
- **`update_report`-Schreibfelder** (vom Copilot selbst offengelegt — was fehlt, geht nur nativ
  oder gar nicht): `ai_content_score`, `ai_percentage`, `ai_solution_categories`,
  `ai_technologies`, `concrete_approach`, `estimated_hours`, `executive_summary`,
  `external_components(_structured)`, `implementation_custom/_recommendation/_tool_based`,
  `known_solutions`, `next_steps`, `pain_point_categories`, `quick_win_or_project`,
  `score_reasoning`, `solution_level(_reasoning)`, `tool_recommendations`.
- **Die Copilot-Solution-Suche findet Bestandseinträge oft nicht** („Solutions gesucht ·
  0 gefunden" trotz existierendem Katalogeintrag) → er legt dann Duplikate an oder behauptet
  fälschlich, ein Eintrag „war diesem Prozess nicht zugeordnet". Für BESTEHENDE Einträge immer
  den nativen „Manuell zuordnen"-Picker nutzen; den Copilot nur zum Entfernen von Zuordnungen
  und zum Anlegen projekteigener Solutions (OS-Module) einsetzen.

## 6 · Solutions-Landkarte & Katalog

- **Bestand/Neu hängt am LINK, nicht am Eintrag:** `process_solutions.is_existing_system` ist
  pro Prozess-Zuordnung — derselbe Katalogeintrag kann auf Prozess A Bestand und auf B Neu sein.
- **„Solution bearbeiten" am Prozess editiert den KATALOGEINTRAG** — ein Rename propagiert auf
  ALLE Links. Als Massen-Fix nutzbar („ERP-System (nicht näher spezifiziert)"→„Navision" fixte
  25 Links auf einmal), aber gefährlich bei geteilten Einträgen: vorher zählen, ob Links
  außerhalb des Projekts existieren.
- **Katalogeinträge sind org-scope** und tauchen in den Pickern ALLER Kundenprojekte auf →
  kundenspezifische Systeme eindeutig benennen; im Prozess-Picker nie „…als Tool anlegen"
  klicken, wenn der Eintrag existieren könnte (so entstehen die Landkarten-Duplikate).
- **Massen-Hygiene nativ:** Projekt-Einstellungen → Tools: „**Tausch**" ersetzt ein Tool in
  allen N Prozessen des Projekts (Bestand-Marks + Notizen bleiben erhalten; der Ziel-Eintrag
  muss existieren — der Dialog kann keinen anlegen) · „**Duplikate zusammenführen (KI)**" für
  Namens-Dubletten (z. B. „Microsoft Outlook" vs. „… / Exchange Online").
- **Die Erstanalyse sprüht Default-Tools über zig Prozesse** (Bettenrid: winkk.ai×40,
  Mistral×50, Easy Contract×28 von 68) → Landkarten-Hygiene fest einplanen; die „N Prozesse"-
  Spalte der Tools-Seite ist der Indikator. Konzept-Fixes ziehen die Links NICHT nach — nach
  jeder Konzeptänderung „Zugeordnete Solutions" gegenprüfen (Konzept↔Links driften).

## 7 · Reihenfolge, Rollen & Freigaben

- **`processes.manual_priority` ist DIE Analyse-/Top-10-Reihenfolge** — gepflegt über die
  Spinner im **Präsentationsdesigner**; Zugriff nur Projektleiter:in/Projektmitarbeiter:in
  (Berater-Login sieht „Kein Zugriff"). Innerhalb der Leitplanken gibt es KEINEN anderen
  Schreibweg (weder Copilot noch Projektliste) → Änderungen mit exakten Ziel-Nummern an die
  Rolle mit Zugriff delegieren.
- **Nie eigene Nummernkreise erfinden:** Artifacts/Handovers referenzieren `manual_priority`;
  Alt-Nummern höchstens als Alias daneben (Bettenrid-Lektion: Artifact-P# vs. Prio-Feld =
  zwei Wahrheiten, Verwirrung im Team).
- **„Berater-freigegeben"-Schalter = `processes.solution_concept_reviewed_at/_by`** — REST-lesbar
  für Status-Boards; das „Berater-OK"-Badge in Listen liest daraus.
- **Mehrere Akteure am selben Projekt:** vor jedem Arbeits-/Re-Audit-Lauf Live-Delta ziehen
  (`solutions?updated_at=gte.<datum>`, `process_solutions`-Links, Report-Marker-Grep) statt dem
  lokalen Helper-Snapshot zu trauen. Fremde Edits dokumentieren und abstimmen — nie still
  zurückdrehen (vielleicht weiß die andere Person etwas Neues).

## 8 · Diagramme

- Je Prozess **End-to-End-Ablauf + Architektur** (Dominiks G1); Ausnahme triviale Ein-Tool-Fälle.
- **Kurze Labels mit explizitem `<br/>`-Umbruch** (2–3 Zeilen à ~25 Zeichen) — der Renderer
  schneidet lange einzeilige Labels an der Boxbreite ab. Dem Copilot den **Mermaid-Code EXAKT
  vorgeben** („unverändert übernehmen"), sonst baut er lange Labels/Subgraphen/Personennamen.
- `flowchart TD`, ≤ ~10 Nodes Architektur, keine Subgraphen im Ablauf, echte Systemnamen,
  Captions kundenseitig (nie „rosa/:::custom/C4/Layer/Mermaid").
- **Nach jedem Diagramm-Update visuell per Screenshot verifizieren** (Diagramme-Subtab) —
  Quelltext sauber ≠ Rendering sauber. Farb-Logik: magenta=Individualsoftware, grün=neues Tool,
  schwarz=Bestand, grau=Akteur.

## 9 · Nie (hart)

- **HI-/Berater-Freigabe setzen** → immer der Mensch. **Präsentationstermin nennen** → Dominik.
- Kundendaten (`data/`) committen. „Neu generieren" klicken. Der Chat-Antwort des Copilots ohne
  DB-Check glauben. Bei Ein-Anbieter-Recherche das Tool hart verdrahten.

## Verweise

Guardrails/Fehlermuster-Register: `processflow-review` · Driver/Chrome-MCP: `processflow-app` ·
Workflow: `processflow-overview` → `processflow-run <prozess>`. Kanonischer Standard: Dominiks SOP.
