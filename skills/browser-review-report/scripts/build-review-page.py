#!/usr/bin/env python3
"""Build the proof page for a browser review.

    build-review-page.py <review-content.json> <shots-dir> <out.html> [template-head.html]

- review-content.json: sections, texts and screenshot mapping (see SKILL.md for the schema).
- shots-dir: directory that holds the reviewers' PNGs; `shots[].file` is relative to it.
- out.html: the page to publish with the Artifact tool. No <html>/<head>/<body> wrapper —
  the Artifact tool adds it; the template head carries <title> and <style>.
- template-head.html: defaults to ../templates/review-template-head.html next to this script.

Every screenshot is resized to max. 1200 px width as JPEG (quality 82) and embedded as a data
URI, so the page is self-contained. macOS `sips` does the resizing; on Linux replace the
`sips` call with ImageMagick (`convert <src> -resize 1200x -quality 82 <dst>`).
"""
import base64
import json
import os
import subprocess
import sys
import tempfile


def die(msg: str) -> None:
    print(f"build-review-page: {msg}", file=sys.stderr)
    sys.exit(1)


if len(sys.argv) < 4:
    die("usage: build-review-page.py <review-content.json> <shots-dir> <out.html> [template-head.html]")

CONTENT_PATH, SHOTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = sys.argv[4] if len(sys.argv) > 4 else os.path.join(HERE, "..", "templates", "review-template-head.html")

for p in (CONTENT_PATH, SHOTS, TEMPLATE):
    if not os.path.exists(p):
        die(f"not found: {p}")

CONTENT = json.load(open(CONTENT_PATH))


def data_uri(rel: str) -> str:
    src = os.path.join(SHOTS, rel)
    if not os.path.exists(src):
        print(f"  ! screenshot missing, skipped: {rel}", file=sys.stderr)
        return ""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        dst = tmp.name
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", "--resampleWidth", "1200", src, "--out", dst],
        check=True, capture_output=True,
    )
    b = open(dst, "rb").read()
    os.unlink(dst)
    return "data:image/jpeg;base64," + base64.b64encode(b).decode()


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


parts = [open(TEMPLATE).read()]
parts.append(
    f'<header class="hero"><p class="eyebrow">{esc(CONTENT["eyebrow"])}</p>'
    f'<h1>{esc(CONTENT["title"])}</h1><p class="lede">{esc(CONTENT["lede"])}</p>'
)
parts.append(
    '<ul class="facts">'
    + "".join(f'<li><span>{esc(f["k"])}</span><strong>{esc(f["v"])}</strong></li>' for f in CONTENT.get("facts", []))
    + "</ul></header>"
)
parts.append(
    '<nav class="toc"><ol>'
    + "".join(f'<li><a href="#s{i + 1}">{esc(s["title"])}</a></li>' for i, s in enumerate(CONTENT["sections"]))
    + "</ol></nav>"
)

for i, s in enumerate(CONTENT["sections"]):
    kind = s.get("status_kind", "ok")
    if kind not in ("ok", "warn", "fail"):
        die(f"section {i + 1}: status_kind must be ok|warn|fail, got {kind!r}")
    parts.append(
        f'<section id="s{i + 1}" class="block"><div class="block-head"><span class="num">{i + 1}</span>'
        f'<div><h2>{esc(s["title"])}</h2><p class="status {kind}">{esc(s["status"])}</p></div></div>'
    )
    parts.append(
        '<div class="cols"><div class="col"><h3>Vorher</h3><p>' + esc(s["before"]) + "</p></div>"
        '<div class="col"><h3>Jetzt</h3><p>' + esc(s["after"]) + "</p></div></div>"
    )
    if s.get("review"):
        parts.append('<p class="review"><strong>Review:</strong> ' + esc(s["review"]) + "</p>")
    figs = []
    for sh in s.get("shots", []):
        uri = data_uri(sh["file"])
        if not uri:
            continue
        figs.append(
            f'<figure><img src="{uri}" alt="{esc(sh["caption"])}" loading="lazy">'
            f'<figcaption>{esc(sh["caption"])}</figcaption></figure>'
        )
    if figs:
        parts.append('<div class="shots">' + "".join(figs) + "</div>")
    parts.append("</section>")

if CONTENT.get("findings"):
    parts.append(
        '<section class="block findings"><div class="block-head"><span class="num">!</span>'
        "<div><h2>Befunde aus dem Review</h2></div></div><ul>"
    )
    for f in CONTENT["findings"]:
        sev = f.get("sev", "info")
        if sev not in ("hoch", "mittel", "niedrig", "info"):
            die(f"finding sev must be hoch|mittel|niedrig|info, got {sev!r}")
        parts.append(f'<li><span class="sev {sev}">{esc(f["sev_label"])}</span> {esc(f["text"])}</li>')
    parts.append("</ul></section>")

if CONTENT.get("todo"):
    parts.append(
        '<section class="block todo"><div class="block-head"><span class="num">→</span><div><h2>'
        + esc(CONTENT["todo"]["title"])
        + "</h2></div></div><p>"
        + esc(CONTENT["todo"]["text"])
        + "</p></section>"
    )

parts.append('<footer class="foot">' + esc(CONTENT.get("footer", "")) + "</footer>")
html = "\n".join(parts)
open(OUT, "w").write(html)
size_mb = len(html.encode()) / 1e6
print(f"{OUT}  {size_mb:.1f} MB  ({sum(len(s.get('shots', [])) for s in CONTENT['sections'])} screenshots)")
if size_mb > 15:
    print("  ! close to the 16 MB artifact limit — drop screenshots or lower the JPEG quality", file=sys.stderr)
