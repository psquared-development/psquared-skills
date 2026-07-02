#!/usr/bin/env python3
"""Apply the psquared 11-tier selection order to ProcessFlow processes and print the top-N worklist.

Usage:
  python3 select.py <processes.json> [--scores scores.json] [--max 10]

Field sources (IMPORTANT — these are NOT on the process object):
  - total_score, priority_quadrant  → live in the `process_scores` table (scores.json), joined by
    process id. On the `processes` row they are usually null.
  - photo signal                    → `source_image_url` on the process (NOT `has_canvas_image`).
  - favorite                        → process.customer_relevance != "normal".
scores.json may be a dict keyed by process_id (helper-app format) or a list of score rows.
If you pass a single already-merged file (score fields present on each process), --scores is optional.

11-tier order (Dominik's "Analyse-Reihenfolge"; within each tier sort by total_score desc):
  1 Favorit·QuickWin·Foto   2 Favorit·QuickWin·oFoto   3 QuickWin·Foto   4 QuickWin·übrige
  5 Favorit·Next·Foto       6 Favorit·Next·oFoto       7 Next·Foto       8 Next·übrige
  9 Waitlist                10 NoGo                     11 Rest/unbewertet
('Next' = NextBestThing = strategic.)
"""
import json, sys, argparse

ap = argparse.ArgumentParser()
ap.add_argument("file")
ap.add_argument("--scores", help="scores.json (process_scores), dict-by-id or list")
ap.add_argument("--max", type=int, default=10)
a = ap.parse_args()

procs = json.load(open(a.file))
if isinstance(procs, dict):
    procs = procs.get("data", list(procs.values()) if all(isinstance(v, dict) for v in procs.values()) else [procs])

# Build score lookup by process id
scores = {}
if a.scores:
    raw = json.load(open(a.scores))
    rows = raw.values() if isinstance(raw, dict) else raw
    for r in rows:
        pid = r.get("process_id") or r.get("id")
        if pid: scores[pid] = r

def smeta(p):
    """Merged score view: prefer joined scores.json, fall back to fields on the process."""
    s = scores.get(p.get("id"), {})
    return {
        "total_score": s.get("total_score", p.get("total_score")) or 0,
        "quadrant": s.get("priority_quadrant", p.get("priority_quadrant")) or "",
    }

def is_qw(q):   return q == "quick_win"
def is_next(q): return q in ("strategic", "next_best_thing", "nextbestthing")
def is_wait(q): return q in ("waitlist", "wait_list")
def is_nogo(q): return q in ("nogo", "no_go", "nogoatthemoment", "no_go_at_the_moment")
def fav(p):     return (p.get("customer_relevance") or "normal") != "normal"
def img(p):     return bool(p.get("source_image_url") or p.get("has_canvas_image"))

def tier(p):
    m = smeta(p); q = m["quadrant"]; f = fav(p); ph = img(p)
    if is_qw(q):   return (1 if (f and ph) else 2 if f else 3 if ph else 4)
    if is_next(q): return (5 if (f and ph) else 6 if f else 7 if ph else 8)
    if is_wait(q): return 9
    if is_nogo(q): return 10
    return 11

ranked = sorted(procs, key=lambda p: (tier(p), -smeta(p)["total_score"]))
picked = ranked[:a.max]

print(f"{len(procs)} processes total · selected {len(picked)} (cap {a.max})\n")
print(f"{'#':>2}  {'Sc':>3}  {'Tier':>2}  {'Foto':<4} {'Quadrant':<10} Name")
for i, p in enumerate(picked, 1):
    m = smeta(p)
    print(f"{i:>2}  {m['total_score']:>3}  {tier(p):>2}  {'Y' if img(p) else '-':<4} "
          f"{(m['quadrant'] or '?'):<10} {p.get('name','?')}")

# Show the items just below the cut so the user can override
if len(ranked) > a.max:
    print("\nJust below the cut (override candidates):")
    for p in ranked[a.max:a.max+5]:
        m = smeta(p)
        print(f"     {m['total_score']:>3}  t{tier(p)}  {(m['quadrant'] or '?'):<10} {p.get('name','?')}")
