---
name: processflow-run
description: >
  Per-terminal entry point: take ONE ProcessFlow process from raw to done in a work→critique→fix loop.
  Use when handed a single process to fully handle — "run <process>", "handle <process> end-to-end",
  "übernimm Prozess <Name> komplett", or when the multi-terminal batch assigns one process per
  terminal in the neverlost engagement. Takes the PROCESS NAME as parameter. Wraps: (1) processflow-
  process to work it to guardrail-completion, (2) processflow-critic to red-team it, (3) immediately
  incorporates the critic's feedback, looping until the critic is clean and all guardrails pass.
  Keeps the helper app synced. This is what each of the ~10 parallel terminals runs.
---

# ProcessFlow — Run one process end-to-end (wrapper)

Input: **one process name**. This is the loop each terminal runs so a process comes out finished and
self-verified. Uses the two doer skills; load `processflow-review/references/guardrails.md` for the
done-criteria.

## The loop
1. **Work it** — run **`processflow-process <name>`**: transcript-check, rework concept + canvas +
   diagrams via Chrome-MCP, re-score, sync the helper app — aim for all required guardrails.
2. **Critique it** — run **`processflow-critic <name>`**: red-team from the critical lens, walk the
   Fehlermuster-Register, web-research tools/prices/technique → issue list.
3. **Incorporate immediately** — fix every real issue the critic surfaced (back through the Konzept-/
   Canvas-Copilot). Re-sync the helper app.
4. **Repeat 2–3** until the critic returns no blocking issues (or the remaining ones are justified
   n.a. with a documented reason — e.g. read-only compliance field, arch_diag n.a. for single-tool).
   Cap at ~3 loops; if still not clean, stop and report what's blocking (don't spin).

## Finish
- Re-score the Prozessanalyse if the approach/effort changed (so score matches concept).
- Final helper-app sync: guard flags + notes reflect the true state (verified vs. n.a.-with-reason).
- Report a tight summary: what changed, final guard status, any residual/n.a. items and why.

## Hard rules (every terminal)
- **NEVER** set `approved`/HI-freigegeben (that's the human/Martin) or name the presentation date
  (that's Dominik). Prepare everything up to freigabe-ready; leave the switch to the human.
- Writes hit **live customer data**. In a user-authorized multi-terminal batch, proceed autonomously
  but stay precise and verify after each write; otherwise confirm each write.
- Fresh Chrome session token when the ~1h JWT expires. If the helper app is down, restart it.
- Stay on your ONE assigned process — don't touch others (parallel terminals own theirs).
