---
name: browser-review-report
description: "Independent browser review of a shipped change set, then a shareable proof page. Spawns two (or more) reviewer agents that click through a deployed web app via the chrome-devtools MCP in isolated browser contexts, each with its own test scope, checkpoints and screenshot list; collects their PASS/FAIL reports, defects and cleanup confirmations; then builds a single HTML overview (Vorher / Jetzt / Review + embedded screenshots per change, findings with severity, open operator tasks) and publishes it as an Artifact for the team or the customer. Use after deploying a batch of changes to stage — 'review what you changed with chrome', 'test it in the browser and give me a summary with screenshots', 'Abnahme mit Screenshots', 'proof page for Matthias' — or whenever a change set needs evidence rather than a claim. Parameters: /browser-review-report <base-url> [--changes <file|inline list>] [--reviewers 2] [--lang de|en]"
---

# Browser Review + Proof Page

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> browser-review-report started.
> Target, account and Chrome first — then the reviewers.
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## What this skill produces

1. **Reviewer reports** — one per agent: PASS / FAIL / PARTIAL per checkpoint, observed vs expected, screenshot file names, defects with severity and repro, console errors, cleanup/restore confirmation.
2. **A proof page** (`review.html`, published as an Artifact) — one block per change with *Vorher / Jetzt / Review auf Stage* and the screenshots that prove it, a fact strip (release tag, commit, test counts), a findings list with severity chips, and an operator to-do block. Screenshots are embedded as data URIs (resized to 1200 px JPEG), so the page is self-contained and stays under the 16 MB artifact limit.
3. **A follow-up loop** — defects go into a fix PR; the page is republished to the same URL with the new state; comments on the page are read and answered.

Reference run: NovaKnows „Matthias-Runde 2" (12.09.2026) — six changes, two reviewers, 39 screenshots, six defects found and shipped the same day. The content file of that run is in `examples/novaknows-runde-2.json`.

---

## Parameters

`/browser-review-report <base-url> [--changes <file|inline list>] [--reviewers 2] [--lang de]`

- **base-url** — the deployed instance to test, e.g. `https://stage.example.com`. **Never production** unless the user says so explicitly; reviewers click, type and create data.
- **--changes** — what shipped: a list of changes with, per change, the intended behaviour and the routes/components involved. If omitted, derive it from the merged PR(s) / commit messages of the deploy.
- **--reviewers** — number of parallel reviewer agents (default 2). Split by feature area so that their test data never overlaps.
- **--lang** — language of the proof page (default `de`, the language the team and customers read).

---

## Step 0 — Preconditions (do these yourself, before any agent)

1. **Test account and rights.** Find the dedicated test account (never a colleague's). Read its password from the Keychain in Bash and pass only the *command* into agent prompts, never the value:
   `security find-generic-password -s <service> -a <account> -w`
   Check what the account can do on the target (org membership, global roles). If a checkpoint needs elevated rights (admin console), grant them **temporarily** through the service role and write down the revoke command. Revoke at the end and say so in the report.
2. **Test data.** Look up concrete records for each checkpoint (open requests, stale items, a throwaway organisation for destructive tests) and put their IDs/URLs into the agent prompts. Reviewers must never search for test data themselves — that is where they wander off and touch the wrong thing.
3. **Chrome for the MCP.** The `chrome-devtools` MCP (`--browserUrl http://127.0.0.1:9222 --experimentalPageIdRouting`) needs a Chrome with remote debugging. Chrome 136+ refuses the debug port on the default profile, so start a dedicated one:
   `scripts/start-review-chrome.sh start` (temp profile, port 9222) · `scripts/start-review-chrome.sh stop` (quit + delete profile).
   Verify with `mcp__chrome-devtools__list_pages` before spawning agents.
4. **Screenshot directory.** One directory per reviewer: `<scratchpad>/review-shots/a/`, `/b/`. Reviewers name files `NN-kurzname.png` (two-digit sequence).
5. **Guard rails to put into every prompt** (see `templates/reviewer-prompt.md`): stage only; own page via `new_page` with `isolatedContext: "reviewer-a"` and always pass `pageId`; never close pages you did not create; prefix created data with `E2E-Test`; delete what you created; restore every setting you change and confirm it; never submit forms that email real people; never write secrets into the report; `list_console_messages` after each page.

---

## Step 1 — Review matrix

Split the change set into reviewer scopes with **disjoint data**. Two rules from the reference run:

- Anything that changes a shared state the other reviewer depends on (e.g. locking an organisation, switching plans, flipping a feature flag) goes to a **throwaway organisation** and is restored at the end.
- AI-backed flows (generation, refresh) take 10–90 s; give them `wait_for` budgets and put them early in that reviewer's list.

For each checkpoint write: route, exact steps, **expected outcome in the words of the UI** (button labels, badge texts), and the screenshot to take. This precision is what makes PASS/FAIL unambiguous later.

## Step 2 — Spawn the reviewers

Use the Agent tool with `model: opus`, `subagent_type: general-purpose`, one call per reviewer in the **same** message so they run in parallel. Prompt = `templates/reviewer-prompt.md` filled in (environment, rules, account command, checkpoints, report format). Ask for ≤ 1000 words, results per checkpoint, defects with severity, console errors, cleanup confirmation.

Expect Chrome to die once in a long run: tell reviewers they may relaunch it with a debug profile and re-login; all server-side state survives.

## Step 3 — Read the reports critically

- A FAIL is a finding; a PARTIAL usually hides a design gap (e.g. „the list is empty on a first run because there is no previous state"). Read the code before deciding whether it is a bug.
- Classify: **hoch** (blocks the feature), **mittel** (wrong but usable), **niedrig** (annoyance), **kosmetisch**, **info** (screenshot artefacts, environment notes). A full-page screenshot cuts fixed sidebars at viewport height — that is an artefact, not a bug.
- Verify security-relevant claims yourself with a plain token (e.g. RLS via PostgREST with the test user's JWT), not only through the UI.

## Step 4 — Build the proof page

1. Write `review-content.json` (schema below; start from `examples/novaknows-runde-2.json`). Per change: `title`, `status` + `status_kind` (`ok` | `warn` | `fail`), `before`, `after`, `review` (what the reviewers saw, including what they found), `shots` (file + caption in one sentence that states what the picture proves).
2. Build: `python3 scripts/build-review-page.py review-content.json <shots-dir> review.html [templates/review-template-head.html]`
   The script resizes every PNG to 1200 px JPEG q82 via `sips`, embeds data URIs, escapes all text, prints the final size.
3. Publish with the Artifact tool (load the `artifact-design` skill first, as its rules demand). Title = a name („Matthias-Runde 2"), `description` = one sentence, favicon once (`🧪`). Republish the **same file path** to update; the URL stays.
4. The template head carries the design: NOVA green accent, ink navy, chalk ground, Bricolage Grotesque / Source Sans 3 / IBM Plex Mono, light + dark tokens. Swap the palette tokens for another brand; keep the structure.

### review-content.json

```json
{
  "eyebrow": "Produkt · Stage-Review vom TT.MM.JJJJ",
  "title": "Name der Runde",
  "lede": "Zwei Sätze: was geliefert wurde, wie es geprüft wurde.",
  "facts": [{ "k": "Prod-Freigabe", "v": "prod-…" }, { "k": "E2E gegen Stage", "v": "91 grün" }],
  "sections": [{
    "title": "…", "status": "Funktioniert", "status_kind": "ok",
    "before": "…", "after": "…", "review": "…",
    "shots": [{ "file": "a/01-….png", "caption": "Was das Bild belegt." }]
  }],
  "findings": [{ "sev": "mittel", "sev_label": "Mittel", "text": "…" }],
  "todo": { "title": "Betreiberaufgabe", "text": "…" },
  "footer": "Stand … · Konto … · Prod läuft …"
}
```
`sev` is one of `hoch | mittel | niedrig | info`; `sev_label` is the visible text („Behoben", „Aus Kommentar", „Antwort" are good labels for later versions).

## Step 5 — Close the loop

1. Fix the findings (own PR, CI, stage, e2e, promote — the project's normal path). Update the page: statuses to `ok`, findings relabelled „Behoben (Tag)", facts updated, republish.
2. Read comments on the page with `Artifact action: comments`. You can only **reply or resolve threads the user sent to Claude**; plain comments stay open. Tell the user that, and answer the questions on the page itself (a „Antwort" finding) so the page stays self-explanatory.
3. Tear down: revoke temporary rights, `scripts/start-review-chrome.sh stop`, delete test data the UI could not, list what remains (e.g. expert answers that cannot be deleted).
4. Final message to the user: link, what passed, what was found and fixed, what stays open, what was cleaned up.

---

## Pitfalls collected so far

- **Two agents, one Chrome:** isolated contexts keep logins apart; a shared `localStorage` would make one agent's org switch hit the other. Always `isolatedContext`.
- **Chrome quits mid-run** (observed once in ~40 min): agents must be told they may relaunch it; state is server-side.
- **Full-page screenshots** capture fixed sidebars only at viewport height → looks „cut off". Use viewport screenshots for layout checks.
- **`fill` on `<input type="date">`** may not fire blur/change like a human; a save that only happens on blur looks broken. Treat as a finding, verify by clicking away.
- **Elevated rights on the test account** change what the role-simulation CI sees; do it briefly and revoke.
- **Timezones:** end-of-day dates stored in UTC show the next day in Vienna — check date fields in both places.
- **`sips` is macOS-only.** On Linux swap the resize call in the build script for ImageMagick (`convert -resize 1200x -quality 82`).
