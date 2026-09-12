# browser-review-report

Independent browser review of a shipped change set, then a self-contained proof page with screenshots.

```
/browser-review-report https://stage.example.com --changes changes.md --reviewers 2
```

What happens:

1. **Preconditions** — test account from the Keychain, temporary rights if needed, concrete test records, a dedicated Chrome with remote debugging (`scripts/start-review-chrome.sh start`).
2. **Review matrix** — the change set split into reviewer scopes with disjoint data and precise checkpoints (route, steps, expected UI wording, screenshot).
3. **Reviewer agents** — two Opus agents in parallel, each in its own isolated browser context via the chrome-devtools MCP, each returning PASS/FAIL per checkpoint, defects, console errors and a cleanup confirmation (`templates/reviewer-prompt.md`).
4. **Proof page** — `scripts/build-review-page.py` turns `review-content.json` + the screenshots into one HTML page (Vorher / Jetzt / Review + pictures per change, findings with severity, operator to-do), published as an Artifact. Same file path → same URL on republish.
5. **Loop** — fix findings, republish with the new state, read comments (`Artifact action: comments`), revoke temporary rights, stop the review Chrome.

Files:

- `SKILL.md` — the procedure, guard rails and pitfalls.
- `scripts/build-review-page.py` — page builder (macOS `sips` for resizing; swap for ImageMagick on Linux).
- `scripts/start-review-chrome.sh` — start/stop a Chrome with `--remote-debugging-port` on a temp profile.
- `templates/review-template-head.html` — `<title>` + design tokens/CSS (light and dark).
- `templates/review-content.template.json` — empty content skeleton.
- `templates/reviewer-prompt.md` — the agent prompt to fill in.
- `examples/novaknows-runde-2.json` — the content file of the reference run (NovaKnows, 12.09.2026, six changes, 39 screenshots).
- `examples/implementation-preamble.md` — the shared instruction file that was given to the parallel *implementation* agents before the review; useful when the same session also does the fixes.
