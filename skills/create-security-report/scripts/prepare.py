#!/usr/bin/env python3
"""prepare.py — turn a security-audit run into the render config for build.mjs.

Usage:
  python3 scripts/prepare.py --run <run-dir> --report <report.json> --out <config.json>

Inputs
  <run-dir>/findings.json   final records of the security-audit skill
                            (verdicts: confirmed, needs_validation; rejected is skipped)
  <report.json>             per-report data: doc, customer, provider,
                            expectedSeverity, fixOverrides, fixOrder, limits
                            (see examples/report-example.json)

Rules
  - confirmed records use their own severity; needs_validation records use
    report.expectedSeverity[fingerprint] and are labelled "(exp.)".
  - Sort order: critical, high, medium, low; confirmed before not verified; then title.
  - IDs are <idPrefix>-01 ... in that order.
  - Text is kept to root cause and fix. No reproduction steps are rendered.
"""
import argparse, json, os, re, sys

ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
LABEL = {"critical": "Critical", "high": "High", "medium": "Medium", "low": "Low"}
WORDS = [(r"\ba victim\b", "an affected"), (r"\battacker's\b", "unauthorized caller's"),
         (r"\battacker\b", "unauthorized caller"), (r"\bAttacker\b", "Unauthorized caller"),
         (r"\bvictim's\b", "affected"), (r"\bvictim\b", "affected"), (r"\bexfiltrat\w*", "disclosure")]
INTERNAL = re.compile(r"sandbox|approved|target code|parent|local stack|local runtime|harness|hunter|"
                      r"no runtime was run|source review only|execution", re.I)
GENERIC_FIX = ("Bind the requested resource to the caller's workspace and required capability "
               "before any privileged read or write.")
NOT_OBSERVED = "The runtime result was not observed. A controlled check on a test environment is needed."


def neutral(s):
    for a, b in WORDS:
        s = re.sub(a, b, s)
    return s


def sentences(s, n=2, limit=480):
    parts = re.split(r"(?<=[.!?])\s+", (s or "").strip())
    out = " ".join(parts[:n])
    return out if len(out) <= limit else out[:limit].rsplit(" ", 1)[0] + " ..."


def fix_text(r):
    if r["verdict"] == "confirmed":
        return sentences(r["remediation"]["strategy"], 3, 600)
    for src in (r.get("description", ""), (r.get("validation_plan") or {}).get("local", "")):
        m = re.search(r"(Smallest fix:|Fix:)\s*(.+?)(?:Regression|$)", src, re.S)
        if m:
            return sentences(m.group(2), 3, 600)
    return None


def area(r):
    files = [s["file"] for s in r["trace"] if s["file"] != "supabase/config.toml"] or [r["trace"][0]["file"]]
    f = files[0]
    m = re.match(r"supabase/functions/([^/]+)/", f)
    if m and m.group(1) != "_shared":
        return m.group(1)
    for prefix, label in (("supabase/migrations", "Database (RLS / SQL)"), ("supabase/functions/_shared", "Shared backend code"),
                          ("src/", "Web app"), ("extensions/typo3", "TYPO3 extension")):
        if f.startswith(prefix):
            return label
    return f.split("/")[-1]


def blockers(bl):
    out, internal = [], False
    for b in bl:
        s = neutral(sentences(b, 1, 260))
        if INTERNAL.search(s):
            internal = True
        else:
            out.append(s)
    if internal or not out:
        out.insert(0, NOT_OBSERVED)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    findings = [r for r in json.load(open(os.path.join(a.run, "findings.json"))) if r["verdict"] in ("confirmed", "needs_validation")]
    rep = json.load(open(a.report))
    exp, fixes = rep.get("expectedSeverity", {}), rep.get("fixOverrides", {})

    missing = [r["fingerprint"] for r in findings if r["verdict"] != "confirmed" and r["fingerprint"] not in exp]
    if missing:
        sys.exit("expectedSeverity is missing for:\n  " + "\n  ".join(missing))

    rows, generic = [], []
    for r in findings:
        conf = r["verdict"] == "confirmed"
        sev = r["severity"]["overall_severity"] if conf else exp[r["fingerprint"]]
        if sev not in ORDER:
            sys.exit(f"unsupported severity '{sev}' for {r['fingerprint']}")
        fix = fixes.get(r["fingerprint"]) or fix_text(r)
        if not fix:
            generic.append(r["fingerprint"])
            fix = GENERIC_FIX
        t = r["trace"][0]
        rows.append({
            "_k": (ORDER[sev], 0 if conf else 1, r["title"]), "fp": r["fingerprint"],
            "severity": sev, "severityLabel": LABEL[sev] + ("" if conf else " (exp.)"),
            "statusKey": "confirmed" if conf else "open", "statusLabel": "Confirmed" if conf else "Not yet verified",
            "title": neutral(r["title"]), "area": area(r), "location": f"{t['file']}:{t['line']}",
            "summary": neutral(sentences(r["root_cause"] if conf else r["claimed_root_cause"], 2, 480)),
            "fix": neutral(fix), "verifyItems": [] if conf else blockers(r.get("blockers", [])),
        })
    rows.sort(key=lambda x: x["_k"])
    prefix = rep.get("idPrefix", "SEC")
    for i, x in enumerate(rows, 1):
        x["id"] = f"{prefix}-{i:02d}"
        x.pop("_k")
    fp_to_id = {x["fp"]: x["id"] for x in rows}

    count = {k: sum(1 for x in rows if x["severity"] == k) for k in ORDER}
    confirmed = sum(1 for x in rows if x["statusKey"] == "confirmed")
    cust = rep["customer"]["name"]
    intro = rep.get("introSections") or [
        {"title": "Introduction", "html":
         f"<p>{cust} asked {rep['provider']['name'].split()[0]} to review the security of {rep['doc'].get('system', 'the platform')}. "
         "This report lists the results. Each finding names the affected code location, the root cause and a recommended fix, "
         "so that the development team can plan the work.</p>"
         f"<p>The review found <strong>{len(rows)} findings</strong>. <strong>{confirmed}</strong> of them are confirmed with a controlled check. "
         "The others have a confirmed source path, but their runtime result is not yet observed.</p>"
         + (f"<p>{rep['summaryNote']}</p>" if rep.get("summaryNote") else "")},
        {"title": "Scope and method", "html": "<ul>" + "".join(f"<li>{s}</li>" for s in rep.get("scope", [])) + "</ul>"},
        {"title": "Severity and status", "html":
         "<ul><li><strong>Critical:</strong> any account, or no account, can read or change data of other customers, or obtain platform credentials.</li>"
         "<li><strong>High:</strong> a control is fully bypassed with real consequences, for example data of other tenants, charges or stored credentials.</li>"
         "<li><strong>Medium:</strong> a real boundary violation with limited reach, for example a lower role inside the same tenant, or a precondition that is hard to meet.</li>"
         "<li><strong>Low:</strong> limited effect, mostly cost or robustness.</li></ul>"
         "<p><strong>Confirmed</strong> means the result was observed in a controlled check. <strong>Not yet verified</strong> means the source path is confirmed, "
         "but the result depends on a runtime or configuration fact. For these, the severity is the expected value if confirmed, and the finding has a list of the points that are still open.</p>"},
    ]

    steps = []
    for s in rep.get("fixOrder", []):
        ids = "all other IDs" if s.get("rest") else ", ".join(fp_to_id[f] for f in s.get("fingerprints", []) if f in fp_to_id)
        steps.append(f"<li><strong>{s['title']}</strong>{f' ({ids})' if ids else ''}.<br/>{s['text']}</li>")
    outro = []
    if steps:
        outro.append({"title": "Recommended fix order", "html": '<ol class="priority-list">' + "".join(steps) + "</ol>"})
    if rep.get("limits"):
        outro.append({"title": "Limits of this review", "html": "<ul>" + "".join(f"<li>{s}</li>" for s in rep["limits"]) + "</ul>"})

    cfg = {
        "language": rep.get("language", "en"),
        "doc": rep["doc"], "customer": rep["customer"], "provider": rep["provider"],
        "stats": [{"key": k, "count": count[k], "label": k.capitalize()} for k in ORDER]
                 + [{"key": "confirmed", "count": confirmed, "label": "Confirmed"}],
        "introSections": intro, "findings": rows, "outroSections": outro,
    }
    json.dump(cfg, open(a.out, "w"), indent=1, ensure_ascii=False)
    print(f"config written: {a.out}")
    print(f"findings: {len(rows)} ({count}) confirmed: {confirmed}")
    if generic:
        print("WARNING: generic fix text used for (add fixOverrides):\n  " + "\n  ".join(generic))


if __name__ == "__main__":
    main()
