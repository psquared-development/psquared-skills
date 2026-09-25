# TLA+ / PlusCal — setup, skeleton, reading a trace

Use TLA+ whenever the question is "can these two things happen at once". TLC,
the model checker, enumerates every interleaving — which is exactly the work a
human is bad at.

## Install

TLC is a Java tool. Java is the only prerequisite.

```bash
java -version                       # needs 11+
mkdir -p ~/.local/lib/tla
curl -L -o ~/.local/lib/tla/tla2tools.jar \
  https://github.com/tlaplus/tlaplus/releases/latest/download/tla2tools.jar
```

Two commands, worth putting in the model's README:

```bash
# PlusCal -> TLA+ (run after every edit to the PlusCal block)
java -cp ~/.local/lib/tla/tla2tools.jar pcal.trans Spec.tla

# model-check
java -XX:+UseParallelGC -cp ~/.local/lib/tla/tla2tools.jar tlc2.TLC -config Spec.cfg Spec.tla
```

Forgetting `pcal.trans` after editing PlusCal is the single most common mistake:
TLC then checks the *previous* translation and reports success on code you no
longer have.

## Write PlusCal, not raw TLA+

PlusCal reads like pseudocode and compiles into the TLA+ that TLC checks. For
modelling application code it is almost always the right level.

```
---- MODULE Outbox ----
EXTENDS Integers, Sequences, FiniteSets

CONSTANTS Workers, MaxRetries

(*--algorithm outbox

variables
  phase  = "queued",     \* mirrors email_outbox.status
  sent   = 0,            \* how many times we actually hit the provider
  cancelled = FALSE;

define
  \* What this claims, in plain English: a message is never delivered twice,
  \* no matter how workers, retries and cancellation interleave.
  AtMostOnce == sent <= 1
end define;

fair process worker \in Workers
variables attempts = 0;
begin
  Pick:
    if phase = "queued" /\ ~cancelled then
      phase := "sending";                 \* OutboxWorker.ts:63
    else
      goto Finish;
    end if;
  Send:
    sent := sent + 1;                     \* OutboxWorker.ts:78 — the provider call
  Ack:
    either
      phase := "sent";                    \* OutboxWorker.ts:91
    or
      phase := "queued";                  \* OutboxWorker.ts:99 — nack, will retry
      attempts := attempts + 1;
      if attempts < MaxRetries then goto Pick; end if;
    end either;
  Finish:
    skip;
end process;

fair process canceller = "cancel"
begin
  Cancel:
    cancelled := TRUE;                    \* cancelDraft.ts:31
end process;

end algorithm;*)
====
```

`Spec.cfg`:

```
SPECIFICATION Spec
CONSTANTS
  Workers = {w1, w2}
  MaxRetries = 2
INVARIANT AtMostOnce
```

Two workers is enough to find nearly every race. Three costs much more and
rarely finds anything the second worker did not.

## Labels are the concurrency model

Each PlusCal label is one atomic step. Other processes may interleave **between**
labels, never inside one. So label placement *is* your claim about atomicity:

- a read and a later write in the same label = an atomic compare-and-set
- the same two in different labels = a lost-update race is possible

Get this wrong and the model answers a question you did not ask. When the real
code does `SELECT … then UPDATE` without a transaction or a `WHERE status =`
guard, those belong in **different** labels — that is the bug you are hunting.

## Reading a violation trace

TLC prints the shortest path to the failure as numbered states. Read it as a
script. This is a real run of the skeleton above — 89 states, found in under a
second:

```
State 1: phase="queued",  sent=0            \* both workers at Pick
State 2: <Pick, w1>   phase="sending"
State 3: <Send, w1>   sent=1                \* w1 hits the provider
State 4: <Ack,  w1>   phase="queued"        \* nack: back to queued for a retry
State 5: <Pick, w2>   phase="sending"       \* w2 picks up the retry
State 6: <Send, w2>   sent=2                \* AtMostOnce violated
```

Translate it into English before doing anything else: *"a nack put the row back
to `queued` while w1 was still in flight, so w2 picked up the same message and
sent it a second time."*

Note what happened here. The obvious race — two workers both reading `queued`
before either writes `sending` — is real too, but TLC found a **shorter** path
through the retry branch instead. That is the whole value of the technique: it
does not find the race you were thinking of, it finds the shortest one. Do not
edit the model to make it produce the trace you expected.

That English sentence is what you take to step 5 and try to reproduce. A trace
you cannot narrate is a trace you have not understood.

## Useful properties beyond invariants

- `INVARIANT` — must hold in every state (safety: "never two sends")
- `PROPERTY` with `<>` (eventually) — liveness: "a queued message is eventually
  sent or failed". Needs `fair` processes, else TLC correctly reports that
  stuttering forever is allowed.
- Deadlock is checked by default. `-deadlock` disables it; do that only when
  the model legitimately terminates.

## Keeping the state space small

TLC explores everything, so small constants matter:

- 2 workers, 2 retries, 2 messages. Raise only if nothing is found.
- Bound counters: `sent <= 3`, not unbounded `Nat`.
- Use symmetry for interchangeable identifiers:
  `SYMMETRY Perms` with `Perms == Permutations(Workers)` in the spec.
- If TLC runs for more than a couple of minutes, the model is too big — shrink
  it rather than waiting. A bug that needs 10 workers to appear is rarely the
  bug you were sent to find.

## Common errors

**"Cannot use `Done' as a label"** — `Done` is reserved by the PlusCal
translator (it is the implicit final label of every process). So are `Error`
and `Stutter`. Rename yours, e.g. `Finish`.

**"Attempted to check equality of integer 1 with non-integer"** — a variable was
initialised to a string in one branch and a number in another.

**TLC reports success suspiciously fast** — usually the invariant is not in the
`.cfg`, or `pcal.trans` was not re-run. Confirm by deliberately breaking the
model and checking that TLC goes red.

**"Temporal properties were violated" with no useful trace** — a liveness
property without `fair` processes. Mark processes `fair`.

**Spec and translation out of sync** — always `pcal.trans` then `tlc2.TLC`, in
that order, every time.
