---
name: gigradar
description: "Set up and operate GigRadar — the pipeline that finds high-value freelancermap.de projects deliverable with agentic engineering, scores them, deep-analyses the winners, and submits human-approved applications. Use whenever the user wants to set up GigRadar, apply the gig schema, import/check the n8n discovery flow, create or run the deep-dive routine, check the gig pipeline status (how many HOT/WATCH gigs, pending application drafts), or troubleshoot freelancermap discovery/outreach. Triggers on 'gigradar', 'freelancermap pipeline', 'gig discovery', 'check the gigs', 'any new gigs', 'set up gig radar'. Parameters: an action — setup | status | run | doctor (default: status)."
---

# GigRadar

GigRadar continuously finds freelancermap.de projects that psquared (GmbH or as freelancer) can deliver with agentic engineering, and turns the best ones into one-tap applications.

**Read these first for full context** (they are the source of truth; this skill is the operator's console):
- Design: `agenthub/docs/superpowers/specs/2026-06-11-freelancermap-gig-pipeline-design.md`
- Plan: `agenthub/docs/superpowers/plans/2026-06-11-gigradar.md`
- n8n flow: `agenthub/docs/superpowers/plans/gigradar-n8n-discovery.json`

## The two-brain model (so the steps make sense)

- **Brain 1 (n8n, every 20 min):** polls freelancermap's anonymous JSON, cheaply triages each new listing with Claude Haiku, writes scored rows to the self-hosted Supabase. Flags HOT = estimated value ≥ €5,000 AND feasibility ≥ 7 AND no body-leasing/onsite red flag.
- **Brain 2 (this Claude routine, hourly):** pulls HOT rows that haven't been analysed, deep-reads each (fetches the real project/agency URL), drafts a tailored German application, and pushes a Telegram card with `[Senden]/[Verwerfen]`.
- **You:** tap **Senden** on the good ones. The agenthub Telegram handler calls the apis apply endpoint, which submits via freelancermap's authenticated API.

Storage is on **`supabase.psquared.dev`** (self-hosted). All writes go through the raw-SQL admin endpoint `/pg/query` — PostgREST returns `42501` there because the dokploy JWT lacks a role claim. Never use `/rest/v1`.

## Parameters

The user names an action; default to `status` if unstated.
- `setup` — stand up the whole pipeline from scratch (schema → apis deploy → n8n → routine).
- `status` — report pipeline health: HOT/WATCH/IGNORE counts, pending drafts, last poll.
- `run` — manually trigger one Brain-2 deep-dive pass now.
- `doctor` — diagnose a broken pipeline (no new gigs, drafts not appearing, sends failing).

## Prerequisites (confirm before any action)

- `SELFHOSTED_SUPABASE_KEY` — the self-hosted Supabase service key (the **same key the `/blog-psquared` skill uses** to write to `supabase.psquared.dev`). If you don't have it, ask the user; do not guess.
- freelancermap login is in the macOS Keychain: `security find-generic-password -s freelancermap.de -a office@psquared.dev -w`. Profile id is `342609`.
- For `setup`/`run`: `ANTHROPIC_API_KEY`, and the agenthub Telegram env (`NUXT_TELEGRAM_BOT_TOKEN`, `NUXT_TELEGRAM_CHAT_ID`).

A tiny helper for all SQL in this skill (define once per session):

```bash
fmsql() { curl -sS -X POST "https://supabase.psquared.dev/pg/query" \
  -H "apikey: $SELFHOSTED_SUPABASE_KEY" -H "Content-Type: application/json" \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1]}))' "$1")"; }
```

---

## Action: `status`

Report, in plain prose, what the pipeline is doing. Run these and summarize.

```bash
# Verdict breakdown
fmsql "select verdict, count(*) from gig_scores group by 1 order by 2 desc"
# HOT gigs still waiting for the deep-dive routine
fmsql "select count(*) as hot_unanalysed from gig_scores where verdict='HOT' and deep_analysis is null"
# Application drafts awaiting your tap
fmsql "select status, count(*) from gig_applications group by 1"
# The 5 strongest HOT gigs right now
fmsql "select l.title, s.est_value_eur, s.feasibility, s.value_density, l.url from gig_scores s join gig_listings l on l.id=s.listing_id where s.verdict='HOT' order by s.value_density desc nulls last limit 5"
# Freshness: newest listing seen
fmsql "select max(first_seen_at) as last_seen, count(*) as total from gig_listings"
```

Lead the summary with the number the user cares about: **how many DRAFT applications are waiting for them to approve**, then HOT-in-queue, then totals and freshness. If `last_seen` is more than ~1h old, flag that Brain 1 may be stalled and suggest `doctor`.

---

## Action: `setup`

Do these in order. Each is independently verifiable — stop and report if one fails.

### 1. Apply the schema

The DDL is committed at `psquared-infra/apis/sql/gigradar-schema.sql`. Apply it:

```bash
SQL=$(python3 -c "import json; print(json.dumps({'query': open('/Users/martinpammesberger/Documents/psquared/psquared-infra/apis/sql/gigradar-schema.sql').read()}))")
curl -sS -X POST "https://supabase.psquared.dev/pg/query" \
  -H "apikey: $SELFHOSTED_SUPABASE_KEY" -H "Content-Type: application/json" -d "$SQL"
```

Verify all five tables exist:

```bash
fmsql "select table_name from information_schema.tables where table_name like 'gig\_%' order by 1"
```

Expect: `gig_applications, gig_classifier_config, gig_listings, gig_scores, gig_sources`.

### 2. Deploy the apis apply endpoint

The endpoint (`POST /api/freelancermap/apply`) ships in the `apis` repo on branch `feat/gigradar-apply-endpoint` (PR open). Once merged + deployed on Dokploy, set these env vars in the apis app config (values not committed):
- `FREELANCERMAP_LOGIN=office@psquared.dev`
- `FREELANCERMAP_PASSWORD=` (from the Keychain command above)
- `FREELANCERMAP_PROFILE_ID=342609`

Verify after deploy: `curl -sS -H "Authorization: Bearer $APIS_BEARER_TOKEN" https://<apis-host>/api/freelancermap/session-health` → `{ ok: true }`.

### 3. Import the n8n discovery flow (Brain 1)

In n8n: Workflows → Import from File → `agenthub/docs/superpowers/plans/gigradar-n8n-discovery.json`. Then in n8n's env set `SELFHOSTED_SUPABASE_KEY` and `ANTHROPIC_API_KEY` and restart n8n. Execute the workflow once manually, confirm rows land (`status` action), then toggle it **Active** (polls every 20 min). Keep the JSON in the repo as the source of truth — re-export and overwrite it whenever you edit the flow in the UI.

### 4. Create the deep-dive routine (Brain 2)

Create an **hourly** scheduled Claude routine named `GigRadar-DeepDive` (use the `/schedule` skill) whose prompt is `agenthub/docs/superpowers/plans/gigradar-deepdive-routine.md` (full prompt also reproduced in the plan, Phase 4). It needs `SELFHOSTED_SUPABASE_KEY`, `NUXT_TELEGRAM_BOT_TOKEN`, `NUXT_TELEGRAM_CHAT_ID` in its environment, and runs in the agenthub working directory. Trigger one run and verify DRAFT rows + a Telegram card appear (see `run` action).

### 5. Wire the Telegram approve flow

The `[Senden]/[Verwerfen]` handlers live in agenthub (`server/services/gigs/gigTelegram.ts`, registered on the Telegraf bot) — see the plan, Phase 5. Confirm a tap on **Senden** flips a draft to `SENT` and the application appears in freelancermap → Nachrichten.

### 6. Turn on the safety rails before going live

Non-negotiable for ToS compliance (freelancermap AGB §4.7/4.8: personalized, human-approved, throttled): max 5 sends/day, ≥30 min apart, kill switch via `gig_sources.enabled`. See the plan's "Cross-cutting: safety rails" section.

---

## Action: `run`

Manually trigger one Brain-2 pass (e.g. the user says "check for new gigs now"). Prefer triggering the existing `GigRadar-DeepDive` routine immediately. If it isn't set up yet, you can run the pass inline by following `agenthub/docs/superpowers/plans/gigradar-deepdive-routine.md`: fetch HOT-unanalysed gigs, deep-read each, draft, write back, push Telegram cards. After it runs, verify:

```bash
fmsql "select a.id, a.status, left(a.cover_letter,60) as preview, l.title from gig_applications a join gig_listings l on l.id=a.listing_id order by a.created_at desc limit 5"
```

Report how many were analysed and how many drafts/cards were produced.

---

## Action: `doctor`

Diagnose by symptom:

- **No new listings (`last_seen` stale):** the n8n flow is inactive or erroring. Check n8n execution history; common causes are an expired `SELFHOSTED_SUPABASE_KEY`/`ANTHROPIC_API_KEY` in n8n env, or freelancermap changing the JSON shape. Manually `curl 'https://www.freelancermap.de/project/search/ajax?query=KI&sort=1&pagenr=1'` — if that returns projects, the endpoint is fine and the problem is in n8n.
- **HOT gigs pile up unanalysed:** Brain-2 routine isn't running. Check the routine's schedule/logs; run the `run` action manually.
- **Drafts exist but no Telegram card:** Telegram env missing in the routine, or the bot token/chat id is wrong. Test: `curl -sS "https://api.telegram.org/bot$NUXT_TELEGRAM_BOT_TOKEN/getMe"`.
- **Senden fails:** hit `GET /api/freelancermap/session-health` on the apis service. If `ok:false`, the login/cookie broke (password changed, or freelancermap changed the login form selectors — see `freelancermap-api.ts`). If `ok:true` but apply 4xx, the application body or the `user` IRI may be the issue (known risk — see the apis PR description).
- **Hitting the application limit:** the Basis tier is 10/month. Check freelancermap → Nachrichten. Upgrade to Premium (€13.99/mo) if volume justifies.

## Notes

- Everything is keyed by `platform` so other boards (freelance.de, GULP) can be added later without schema changes.
- Tuning lives in data, not code: edit query profiles in the n8n "Build Query Profiles" node; edit thresholds in `gig_classifier_config.thresholds` (defaults `{"min_value_eur":5000,"min_feasibility":7}`).
