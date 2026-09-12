# Shared instructions for every implementation work package (NovaKnows app)

## Where to work
- Work ONLY inside your assigned git worktree (path and branch are in your task). It is based on `feat/matthias-runde-2` = `origin/main` @ `ee8c7b9` (12.09.2026).
- NEVER edit files under `/Users/mapiprivate/dev/novaknows-self/novaknowsapp` (the main checkout, owned by another process). NEVER use the tokensave edit tools (`tokensave_str_replace`, `tokensave_replace_symbol`, `tokensave_insert_at*`, `tokensave_multi_str_replace`) — they write to the main checkout. Use Read/Edit/Write/Bash on your worktree paths.
- For code exploration you may use `tokensave_context` / `tokensave_search` / `tokensave_callers` / `tokensave_callees` (read-only; they serve the main checkout, whose code is identical to your branch point) — or grep/Read in your worktree. In this zsh shell quote glob patterns (`grep --include='*.tsx'`).
- `node_modules` in the worktree is a symlink to the main checkout. Do NOT run `npm install` / `npm ci`.
- Other agents work in parallel on other packages in other worktrees. Stay within your package's files; if you must touch a shared file (router.tsx, navigation.tsx, types.ts, AppLayout.tsx, marke.ts), keep the edit minimal and additive so it merges cleanly.

## Plan
- Read your plan file first (path in your task). It is the research report: root cause, decisions, ordered steps, file:line citations (valid at the branch point). Follow it. Where reality differs, adapt and record the deviation in your report. Implement COMPLETELY: no TODOs, no stubs, no "follow-up later" for anything in the plan.

## Conventions (match the repo)
- UI strings strictly German, formal „Sie". Typographic quotes „…" in UI text as the codebase does.
- Code comments in German and explain the WHY (see recent commits by Martin for the tone). No English comments in new code.
- TypeScript strict. No `any` (eslint `no-explicit-any` is a warning; the CI cap is 750 warnings and 734 are used — you must NOT add warnings). No unused vars/imports.
- Supabase types: `src/integrations/supabase/types.ts` is hand-edited; add new tables/columns there (Row/Insert/Update/Relationships) when you add a migration.
- shadcn/ui components live in `src/components/ui`. Icons: lucide-react. Dates: date-fns with `de` locale.
- Toasts: use whatever the surrounding file uses (`sonner` `toast` or `useToast`).
- Migrations: `supabase/migrations/<YYYYMMDDHHMMSS>_<german_snake_name>.sql` (timestamp assigned in your task), German header comment explaining why, idempotent where possible (`if not exists`, `create or replace`, `drop policy if exists`). Migrations are applied automatically on merge to main (stage) and via promote (prod).
- Edge functions: Deno 2, shared code in `supabase/functions/_shared`. Deno tests are `*_test.ts` (run with `deno test --allow-env --no-lock <files>`), vitest tests are `*.test.ts` (vitest also picks up `supabase/functions/**/*.test.ts` — pure TS without Deno globals only). vitest runs with `environment: node` and NO jsdom — no component tests; keep testable logic in pure modules.
- Never write secrets into the repo.

## Verification (from the worktree root; ALL must pass before you commit)
```
npx tsc -b --pretty false
npx vitest run
npx eslint . --max-warnings 734          # baseline is 734 warnings, 0 errors — do not exceed
npm run build
# for each edge function file you changed or added:
deno check --no-lock supabase/functions/<fn>/index.ts supabase/functions/_shared/<changed>.ts
# if you added *_test.ts under supabase/functions:
deno test --allow-env --no-lock $(find supabase/functions -name '*_test.ts')
```
Report the actual numbers/outcomes.

## Commit
- One or a few commits on your branch. Message in Martin's style: first line a short German lowercase phrase (e.g. `abgelaufene testversion sperrt die app`), blank line, then 2–8 lines German explanation of WHY (what was wrong, what changes), then the trailer line:
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- Do NOT push. Do NOT touch other branches. Do NOT modify `.env*`.

## Final report (English, ≤ 700 words)
1. What you changed — file list grouped by area.
2. Deviations from the plan and why.
3. Verification results (tsc / vitest counts / eslint warning count / build / deno check / deno test).
4. Manual test checklist for stage (https://stage.nova-ai.at).
5. Integration notes: migration file name(s), new edge function names (need deploying), new secrets/env (should be none), shared files touched, follow-ups you deliberately left out (only if truly out of scope).
