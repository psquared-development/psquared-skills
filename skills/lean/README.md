# lean — developer notes

Targeted formal-methods bug hunting. Lean 4 for state machines and pure
functions, TLA+/PlusCal for interleaving and races.

## Layout

| File | Purpose |
|---|---|
| `SKILL.md` | the 7-step loop, house rules, when NOT to use it |
| `references/lean.md` | Lean install, project layout, state-machine idiom, `sorry` discipline |
| `references/tlaplus.md` | TLC install, PlusCal skeleton, reading a violation trace |
| `setup.sh` | installs elan + tla2tools.jar; re-runnable |

Read only the reference you need — SKILL.md points at them.

## Design notes

**Survey-first with a stop.** The skill makes the model present a shortlist and
wait. Modelling the wrong subsystem is how this technique wastes a day, and the
model cannot judge business value on its own.

**Reproduce before fix is the load-bearing rule.** A counterexample is evidence
about the *model*, not the code. Most unreproduced counterexamples mean the
model is wrong. Fixing them produces changes nobody can justify and tests that
prove nothing.

**`sorry`, never `axiom`.** An axiom silences the compiler and launders an
assumption into a guarantee. A `sorry` shows up in the build output and in the
report. SKILL.md requires every one to be listed.

**Model-check before proving.** TLC state exploration and Lean `#eval` on finite
instances find most bugs at a fraction of the cost of real proof terms.

**A clean result is a result.** "Modelled X, invariants held under these
assumptions" is reportable. Without saying so, the model is pushed toward
manufacturing a finding.

## Prior art

The loop follows Boris Cherny's approach to using Lean on the Claude Agent SDK:
model the hairy part, hunt counterexamples, reproduce on real code, then fix.
