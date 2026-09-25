---
name: lean
description: "Targeted formal-methods bug hunting with Lean 4 and TLA+. Model the hairy part of a codebase — state machines, concurrency, races, retries, cancellation, queues, sessions, protocol and control flow, data-flow invariants — hunt for counterexamples, reproduce them on the real code, then fix with tests. Use when asked to formally check, verify, model or prove something, to find race conditions or concurrency bugs, when a bug is suspected but not reproducible, when a state machine or retry/cancel path looks wrong, or when someone says Lean, TLA+, PlusCal, formal methods, model checking, invariant or counterexample. Not for ordinary debugging with a known repro."
---

# Lean — targeted formal bug hunting

You are doing targeted formal-methods bug finding, not whole-program
verification. Model only the risky slices. Never claim the repo is verified.

The point is to find bugs that testing misses: the interleaving nobody thought
to write a test for. A model is a cheap way to enumerate states a human will
not. It is not proof that the code is correct, because the model is not the
code — which is why step 5 exists and is not optional.

## The loop

Survey → extract real behaviour → model → hunt counterexamples → **reproduce on
real code** → fix → report. Do them in order. The order is the method.

### 1. Survey (always first, always cheap)

Explore the repo. Identify 3–6 candidate subsystems that look race-prone or
stateful. For each note: files, the informal state machine, the concurrency
points, and why it is risky.

What "risky" looks like in practice:

- two writers to one row, field or file with no lock or compare-and-set
- a retry wrapped around something non-idempotent
- cancellation or timeout racing a success path
- a queue or outbox with at-least-once delivery and no dedupe key
- a token refresh, lease or lock with an expiry
- a webhook or callback that can arrive before the thing it refers to exists
- any `status`/`phase`/`state` column with more than three values
- reconnect, resume, replay, backfill, sync — anything that can run twice

Then **pick the single highest-value target and stop**. Present the shortlist
with your pick and reasoning, and wait for a decision before writing much Lean
or TLA+. Modelling the wrong subsystem is the main way this technique wastes
a day.

### 2. Extract the real behaviour

Read the implementation, its tests, its comments and its call sites. Then write
a short English spec: intended behaviour, observed behaviour, and the explicit
assumptions you are making.

Where the code is ambiguous, **that is a finding**. Record it. Do not guess and
model your guess — a model built on a guess produces counterexamples about your
guess.

### 3. Build a model

Pick the tool by the shape of the problem:

| Problem | Tool |
|---|---|
| state machine, transitions, an invariant over one actor | Lean 4 |
| interleaving, races, retries, cancellation, concurrent writers | TLA+ / PlusCal |
| a pure function with a tricky algebraic property | Lean 4 |
| "can these two things happen at once and if so what breaks" | TLA+ every time |

Rules:

- Keep the model small and faithful. Cite `file:line` for every transition you
  model. A transition with no citation is something you imagined.
- Prefer several small models over one big one. A model that takes an hour to
  understand will not be reviewed, and an unreviewed model is a liability.
- **Do not hide gaps with axioms.** If you cannot prove something, write
  `sorry` and a sentence saying what you assumed and why. A fake proof is worse
  than no proof: it launders an assumption into a guarantee.
- Put models under `formal/` or `spec/`, one directory per target, with a
  README naming the subsystem and the source files it mirrors.

Setup, syntax and idioms are in the reference files — read the one you need
rather than guessing at syntax:

- `references/lean.md` — install, project layout, modelling a state machine,
  invariants, `sorry` discipline, common errors
- `references/tlaplus.md` — install, PlusCal skeleton, TLC config, reading a
  violation trace, common errors

### 4. Hunt counterexamples

Look for traces that violate an invariant: double-send, lost cancel, stuck
retry, stale read, illegal phase transition, dropped error, re-entrancy,
timeout-versus-success, lost update, resurrection of deleted state.

Every counterexample is a **suspected** bug. Nothing more, until step 5.

### 5. Reproduce on the real code

This is the step that separates this technique from astrology.

Turn each suspected bug into a failing test, a script or a deterministic repro
against the actual implementation. Then classify: severity, and who can hit it
— every user, one tenant, only under load, only on a cold start.

If you cannot reproduce it, **say so and leave the code alone**. An
unreproduced counterexample usually means the model is wrong, not the code.
Fixing it "just in case" adds a change nobody can justify and a test that
proves nothing. List it as an unreproduced suspect in the report; it is still
worth writing down, because it may reproduce later under different assumptions.

### 6. Fix

Smallest correct change. Add the test that failed before and passes after.

If the model showed a simpler design — fewer states, one write path, one cancel
path — propose that as a **separate** follow-up, not smuggled into the bugfix.
A bugfix that also restructures the module cannot be reviewed or reverted.

If your "fix" actually changes intended behaviour, say so explicitly. That is a
spec decision for a human, not a bug.

### 7. Report

Per finding: title; model used; property violated; repro; root cause with
`file:line`; patch; tests added; residual risk and still-unproven assumptions.

Then: bugs found, unreproduced suspects, and the next best target.

## House rules

- **The reader may not know Lean or TLA+.** You write the specs and explain
  them in plain English. Every model gets a comment block saying, in ordinary
  prose, what it claims. Keep the artifacts buildable — a spec that does not
  compile is a document, not a check.
- Never mass-rewrite the codebase. This skill finds bugs; it does not refactor.
- Never silently change intended behaviour.
- Do not claim whole-repo verification. Say exactly what was modelled and what
  was not.
- A model that finds nothing is a real result. Report it as "modelled X,
  invariants held under these assumptions" — that is more useful than a
  manufactured finding, and much more useful than silence.

## When not to use this

Formal modelling is expensive. Skip it when:

- the bug has a reliable repro already — just debug it
- the logic is straight-line with no concurrency and no state machine
- the answer is a type change or a null check
- nobody will maintain the spec afterwards

The technique earns its cost on bugs that are rare, intermittent, or "we've
never been able to reproduce it".

## Cost control

Writing a model is cheap; proving things about it is not. Start by
*model-checking* (TLC explores states automatically, Lean `#eval`/`decide` on
small finite instances) before attempting real proofs. Most bugs fall out of
state exploration long before anything needs a proof term. Reach for proofs
only when the property must hold for all inputs, not just the small ones.
