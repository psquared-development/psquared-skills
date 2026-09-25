# Lean 4 — setup, layout, idioms

## Install

Lean is installed through `elan`, its toolchain manager. Nothing else is needed.

```bash
curl -sSf https://elan.lean-lang.org/elan-init.sh | sh -s -- -y
source "$HOME/.elan/env"        # or restart the shell
lean --version
```

`elan` puts `lean` and `lake` on the PATH and downloads the toolchain a project
pins in its `lean-toolchain` file. If `lean` is missing after install, the shell
has not picked up `~/.elan/bin`.

## A model project

Keep models out of the application build. One directory per target:

```
formal/
  <subsystem>/
    README.md            # what this mirrors, which source files, what it claims
    lakefile.toml
    lean-toolchain
    Model.lean
```

`lakefile.toml`:

```toml
name = "model"
defaultTargets = ["Model"]

[[lean_lib]]
name = "Model"
```

`lean-toolchain` — one line, e.g. `leanprover/lean4:v4.15.0`. Pin it; an
unpinned model breaks silently when the toolchain moves.

Build with `lake build` from that directory. Keep it buildable; a spec that
does not compile has stopped being a check.

Mathlib is usually **not** needed for state-machine models and costs a long
first build. Add it only when you need real mathematics.

## Modelling a state machine

The shape that works: an inductive state, an inductive event, a step relation,
and an invariant you can decide.

```lean
/-- What this claims, in plain English:
    A draft can be sent at most once. `sent` is terminal — no event moves out
    of it. Mirrors server/services/outbox/DraftSender.ts:40-118. -/

inductive Phase where
  | draft | queued | sending | sent | failed
  deriving DecidableEq, Repr

inductive Event where
  | enqueue | pick | ack | nack | retry | cancel
  deriving DecidableEq, Repr

/-- One transition. Cite the source line for each arm. -/
def step : Phase → Event → Option Phase
  | .draft,   .enqueue => some .queued      -- DraftSender.ts:52
  | .queued,  .pick    => some .sending     -- DraftSender.ts:71
  | .sending, .ack     => some .sent        -- DraftSender.ts:96
  | .sending, .nack    => some .failed      -- DraftSender.ts:104
  | .failed,  .retry   => some .queued      -- DraftSender.ts:131
  | .queued,  .cancel  => some .draft       -- DraftSender.ts:88
  | _, _ => none                            -- everything else is rejected
```

Then state the property and check it on all finite cases before proving
anything:

```lean
/-- `sent` is terminal: no event leaves it. -/
def sentIsTerminal : Bool :=
  Event.all.all fun e => (step .sent e).isNone

#eval sentIsTerminal   -- expect true; false means you have a counterexample
```

`#eval` over a finite state space is model checking, and it finds most bugs.
Only reach for `theorem` + `decide` when the property must hold over something
infinite or parameterised.

```lean
theorem sent_terminal (e : Event) : step .sent e = none := by
  cases e <;> rfl
```

## Enumerating a finite type

To iterate every constructor you need the list. Either write it by hand:

```lean
def Event.all : List Event := [.enqueue, .pick, .ack, .nack, .retry, .cancel]
```

…or derive `Fintype`/`DecidableEq` and use `decide`. The hand-written list is
usually clearer in a small model, but it is a place to make a mistake: if you
forget a constructor, the check passes vacuously. Cross-check its length
against the number of constructors.

## The `sorry` discipline

`sorry` admits a goal without proving it. Lean warns; the build still succeeds.
That is the right tool for an assumption you cannot discharge — as long as it
is labelled:

```lean
/-- ASSUMPTION (not proven): the DB unique index on (account_id, message_id)
    makes a duplicate insert impossible. Enforced in migration
    20260114_outbox_unique.sql, not in the model. -/
theorem no_duplicate_insert : ∀ s, atMostOne s := by
  sorry
```

Never replace a `sorry` with an `axiom` to silence the warning. An axiom is a
lie the compiler believes; a `sorry` is an honest gap that shows up in the
build output and in the report.

Before finishing, grep the model for `sorry` and list every one in the report
under "still-unproven assumptions".

## Common errors

**`unknown identifier` on a constructor** — inside a `match` or after a type is
known, use the dot form (`.queued`). At the top level write the full name
(`Phase.queued`).

**`failed to synthesize DecidableEq`** — add `deriving DecidableEq` to the
inductive, or the `decide` tactic and `#eval` on `Bool` will not work.

**A `#eval` that prints `true` but proves nothing** — check that the list you
folded over is non-empty and complete. `[].all f` is `true`.

**`linter.unusedVariables` noise** — prefix with `_`. Do not disable linters in
a model; the warnings are often pointing at a case you forgot to handle.

**Long first build** — you added Mathlib. For a state machine you almost
certainly do not need it.
