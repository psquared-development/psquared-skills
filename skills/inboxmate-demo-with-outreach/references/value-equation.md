# Value Equation — Writing Rules for InboxMate Copy

Every piece of text we put in front of a prospect (demo page customMessage, highlightText, useCases, quick-question cards, outreach email, follow-up) must move at least 2 of the 4 value-equation levers.

```
           Dream Outcome  ×  Perceived Likelihood of Achievement
Value  =  ────────────────────────────────────────────────────
                Time Delay  ×  Effort & Sacrifice
```

**Young operators only push the top (bigger promises, more testimonials).
We're going to push the bottom (faster time-to-value, less effort) and add risk reversal to compound likelihood.**

---

## The 4 levers — with concrete InboxMate phrasing

### 1. Dream outcome (top of fraction)
What the prospect actually wants — framed as an operational outcome, not our tool.

- ❌ "Ein KI-Chatbot auf Ihrer Website"  (describes the tool)
- ✅ "Die 40 häufigsten Fragen Ihrer Kunden beantwortet — während Sie im Laden stehen"  (describes the outcome)

Ask: *if a competitor had a totally different mechanism but gave them the same end result, would they still care?* The answer must be "yes" — because we're describing the result, not the mechanism.

### 2. Perceived likelihood of achievement (top of fraction)
How much they believe we'll actually deliver. Increase via **proof + specificity + live demo**.

- ✅ Reference something we actually built for them: "Wir haben Ihre Öffnungszeiten und den Angebots-Flow von der /preise-Seite eingebaut."
- ✅ Direct evidence: "Der Bot läuft bereits auf unserem Server — rechts unten klicken."
- ✅ Name their specific operation: "Anfragen nach Weißtannen-Sauna mit Infrarot werden korrekt weitergeleitet."
- ❌ Generic claims without proof: "Unser System ist sehr effektiv."

### 3. Time delay — TTV (bottom of fraction)
The gap between "I said yes" and "I see the result." Shrink it to as close to zero as possible. ALWAYS state it explicitly in numbers.

German phrases that move this lever:
- "**In 10 Minuten live.**"
- "**Bereits jetzt testbar — kein Setup nötig.**"
- "**Ab Minute 1 nach Einbindung beantwortet der Bot Fragen.**"
- "**Ein Klick genügt — kein Wartenmüssen auf Freischaltung.**"
- "**Fertig gebaut — Sie müssen nichts mehr trainieren.**"

If the copy doesn't contain an explicit speed signal (a number, "sofort", "jetzt", "läuft bereits"), rewrite it.

### 4. Effort & sacrifice (bottom of fraction)
Everything the prospect has to DO. Cut it to near-zero. Frame the friction explicitly as removed.

German phrases that move this lever:
- "**Kein Code, keine Anmeldung, keine Kreditkarte.**"
- "**Wir integrieren es für Sie — 30-Minuten-Call reicht.**"
- "**Sie müssen keine FAQ schreiben — wir haben sie schon gebaut.**"
- "**Ein einziger Script-Tag auf Ihrer Seite, fertig.**"
- "**Kein Vertrag — schließen Sie es einfach, wenn es nicht passt.**"

If your copy has the word "einrichten", "aufsetzen", "erstellen", or "konfigurieren" as something the PROSPECT has to do, rewrite it to say what WE have already done or what takes zero effort.

---

## Risk reversal (compounds likelihood)

Always add at least one risk-reversal signal. Pick the strongest that's true for us:

| Level | Phrasing (DE) | When to use |
|---|---|---|
| **Implied** (no commitment to make) | "Die Demo läuft bereits — einfach anschauen." / "Kein Formular, kein Setup." | Default for the demo page customMessage + email CTA line. |
| **Unconditional** | "Der 14-Tage-Test endet von selbst — nichts zu kündigen, keine Rückfrage." | For the self-serve signup path (v3 secondary CTA). |
| **Anti-guarantee** | "Wenn's nicht passt, haben wir beide Zeit verloren — aber keinen Cent." | Contrarian hook. Rare but powerful. |
| **Performance-stacked** | "14-Tage-Test + 30 Tage: wenn die Antwortrate nicht steigt, volle Rückerstattung." | Use in outreach to larger prospects / decision-makers. |

Rule: never write "kostenlose Beratung" or "unverbindliches Angebot" — those are filler. Every risk-reversal line must name a SPECIFIC removed risk.

---

## Applying to InboxMate copy surfaces

### Demo page `customMessage` (renders as sub-headline under "Hallo, [Company]!")
Must hit dream-outcome + perceived-likelihood + TTV + effort removal, in 1–2 sentences.

- ✅ "Ihr KI-Assistent für [Company] ist fertig — trainiert auf Ihre Leistungen, **in 10 Minuten auf Ihrer Seite live**. Einfach rechts unten testen, **kein Setup, keine Anmeldung**."
- ❌ "Wir haben einen KI-Assistenten speziell für [Company] gebaut — trainiert auf Ihre Leistungen. Testen Sie ihn rechts unten."  (missing TTV + risk reversal)

### Demo page `useCases[].text` (rich cards)
Each card frames ONE operational outcome + one removed effort.

- ✅ `{ text: "Terminanfragen auch außerhalb der Öffnungszeiten annehmen — ohne Anrufbeantworter, ohne Verpasste.", icon: "clock" }`
- ❌ `{ text: "Terminanfragen bearbeiten", icon: "clock" }`  (describes function, not outcome)

### Demo page `highlightText` (green box on email template)
Their exact operation, automated, with a speed signal and risk-reversal tail.

- ✅ "Reservierungsfragen, Menü-Infos, Öffnungszeiten — **24/7 beantwortet**, ohne dass jemand am Telefon hängt. **14-Tage-Test, endet von selbst.**"

### Outreach email `bodyParagraph1` (hook)
Dream outcome + perceived likelihood, in one sentence. No "wir haben" passive voice — active operational outcome.

- ✅ "Wir haben die 40 häufigsten Fragen zu Ihrer Weißtannen-Sauna automatisch beantwortbar gemacht — **läuft schon, nur noch anschauen**."
- ❌ "Wir würden Ihnen gerne unseren KI-Chatbot vorstellen."

### Outreach email `bodyParagraph3` (nudge)
TTV + effort signal + risk reversal. This is where the bottom-of-fraction levers live.

- ✅ "**Ein Klick, keine Anmeldung** — die Demo ist in Ihrem Browser. **Wenn's Unsinn ist, habe ich Zeit verloren, Sie nicht.**"

### Follow-up email body
Shorter than outreach. Reinforce ONE lever — usually the speed/effort one since the prospect didn't click the first time.

- ✅ "Der Bot für [Company] läuft noch. **2 Minuten reichen, um zu sehen, ob's passt.** Wenn nicht — einfach ignorieren."

---

## Self-check before saving copy

For every variable you write, ask:

1. Does this sentence name an **operational outcome** (what happens differently in their business)?
2. Is there **proof** of the outcome — something specific we built or did for them?
3. Is there a **time number** (10 Minuten, sofort, ab Minute 1)?
4. Is there a **removed friction** (kein Setup, keine Anmeldung, kein Vertrag)?
5. Is there a **risk-reversal** line — implied, unconditional, or performance?

If fewer than 3 of those 5 are present across the whole email or demo page, rewrite. The bottom-of-fraction levers (3, 4, 5) are what separate us — competitors also do 1 and 2.
