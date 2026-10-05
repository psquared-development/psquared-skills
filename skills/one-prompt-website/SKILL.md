---
name: one-prompt-website
description: "Build and ship a complete psquared one-page website from a single prompt: concept, designer-grade static page, AI images and a looping hero video (Leonardo / Kling), a working contact form, imprint and privacy, nginx routing, DNS check, Dokploy domain + HTTPS, push and live verification. Use whenever someone wants a landing page, one-pager, or site for a (new) domain or idea — 'mach eine Seite für <domain>', 'one-pager for X', 'we bought <domain>, build something', 'website for this concept'. If the domain already has a page, asks first whether to update it or tear it down and rebuild. Parameters: /one-prompt-website <domain> <concept prompt> [--lang en|de] [--no-video]"
---

# One-Prompt Website

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> one-prompt-website started. Checking the domain...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

Reference build: **fixmyagent.com** → `psquared-websites/apps/fix-my-agent/` (commit `3b6e635`).
Open it before you design. It shows the target level: one strong idea, real copy, generated
editorial photos, a subtle video loop, a form that works.

## Parameters

`/one-prompt-website <domain> <concept> [--lang en|de] [--no-video]`

- **domain** — e.g. `fixmyagent.com`. Ask if missing. Check the exact spelling with the user when
  it is ambiguous (fix-my-agent.com vs fixmyagent.com cost one round trip in the reference build).
- **concept** — what the site sells or says. Thin is fine; you sharpen it in STEP 2.
- **--lang** — default: `en` for .com/.dev/.io, `de` for .at/.de. Ask only when unclear.

Paths used below:

```
WEB=/Users/martinpammesberger/Documents/psquared/psquared-websites   # monorepo, Dokploy autodeploys main
SKILL=<this skill dir>                                               # scripts/, templates/
SITE=$WEB/apps/<slug>                                                # slug = domain without TLD, kebab-case
```

---

## STEP 1 — Existing page? Ask before you touch anything

Check all three:

```bash
ls $WEB/apps/<slug> 2>/dev/null
grep -n "server_name .*<domain>" $WEB/nginx/nginx.conf
dig +short NS <domain>; dig +short <domain> A; dig +short psquared.dev A
```

and fetch `https://<domain>/` (WebFetch) to see what is live.

If a page exists in the repo **or** something other than a registrar parking page is live, use
**AskUserQuestion** (header `Existing`):

| Option | What happens |
|---|---|
| **Update the current page** | Keep folder, routing, legal pages and assets. Change only what the prompt asks. Skip to STEP 5 with the existing files as the base; read them fully first. |
| **Tear down and rebuild** | Keep: folder name, nginx block, Dockerfile line, Dokploy domains, imprint/privacy. Delete everything else in `$SITE` with `git rm` (history keeps the old version), then run STEP 2–9 from scratch. |
| **Cancel** | Stop. |

If the live page is hosted somewhere else (A record ≠ psquared server and not parking), say so
in the question: rebuilding here moves the domain away from that host.

No existing page → continue without asking.

## STEP 2 — Concept in five lines

Write this down (to the user, short) before designing. Ask **one** question only if the concept
cannot be built without it.

1. **Who** — the exact reader (e.g. "SMB owner whose chatbot invents prices").
2. **Pain** — in their words.
3. **Offer** — what they get, with numbers (price, days, count).
4. **One CTA** — the single action (form, call, email).
5. **Why us** — one honest line. No invented customers, logos, stats or testimonials.

Rules that came from real corrections:
- A new venture is **standalone**. Do not upsell InboxMate; never mention AgentHub (dead).
- Prices, response times and guarantees you make up are **placeholders**. Use plausible values,
  then list every one in the final report so the user confirms or changes them.

## STEP 3 — Design direction

Read `$WEB/CLAUDE.md` (anti-vibe rules) and obey it. Then pick:

- **One physical metaphor** that carries the whole page (reference: a repair workshop at night —
  repair tags, workbench, oscilloscope). Images, labels, form ("ticket") all follow it.
- **2–3 colours** as CSS tokens on `:root` (reference: ink `#14120f`, paper `#ece6da`, signal
  orange `#f26b1d`). No purple→blue gradients, no gradient text, no emoji icons.
- **Two Google fonts** with character: a display face + a mono for labels (reference: Archivo
  at `font-stretch:72%` uppercase + JetBrains Mono). Not Inter alone.
- **Asymmetric layout**: sticky heading left / list right, alternating image-text rows, a
  contrasting "paper" card for the form and the highlighted price.

Section set that works for a service one-pager (cut what does not fit):
hero (headline + one lead sentence + CTA) → symptoms/pain list → services (image + "we check /
you get") → 4 steps → pricing (3 columns, middle one highlighted) → "works with" text list (no
logos) → form → FAQ (`<details>`) → footer with **p² psquared** link, Imprint, Privacy.

Copy: short, concrete, a little dry humour ("It runs. It's still broken."). No subtitles under
every heading. One CTA per section.

## STEP 4 — Assets (images + video)

Use the **/generate-image** skill (invoke it; it carries cost reporting and model choice).
Credits are cheap relative to quality: ULTRA ≈ 58 credits per image, Kling video ≈ 560.

Images (run in parallel, `&` + `wait`, each with `--json --out <file>`):

| File | Aspect | Purpose |
|---|---|---|
| `hero.jpg` | 16:9 | full-bleed hero, empty dark area on the left third for text |
| 2–3 × section | 4:3 | one per service / form side |

Prompt pattern: `Photorealistic ... editorial still life, warm lamp light, dark charcoal
background, shallow depth of field, film grain. No people, no text, no logos.` — always forbid
text: generated text comes out garbled. Flags: `--intent photo --mode ULTRA --quantity 1`.

Read every image. Reject garbled text in focus, hands, logos.

Then shrink (originals + sidecar JSON go to the **scratchpad**, never into the site):

```bash
sips -Z 2000 -s formatOptions 72 orig/hero.jpg --out $SITE/img/hero.jpg      # ~400 KB
sips -Z 1200 -s formatOptions 72 orig/x.jpg   --out $SITE/img/x.jpg          # ~100-160 KB
sips -z 672 1200 orig/hero.jpg --out og_tmp.jpg && sips -c 630 1200 og_tmp.jpg --out $SITE/img/og.jpg
```

Hero video (skip with `--no-video`). The old `generations-motion-svd` endpoint is **gone (404)**;
use Kling 3.0 through the script:

```bash
node $SKILL/scripts/hero_video.mjs --generation <generationId from hero.json sidecar> \
  --prompt "Static locked-off camera, very slow subtle push-in. <one small motion: smoke, flicker, dust>. Nothing else moves. No people, no hands." \
  --out $SITE/img/hero.mp4 --raw <scratchpad>/hero-raw.mp4
```

Run it in the background (2–4 min) and build the page meanwhile. It outputs a 1600 px,
forward+reverse (seamless) loop around 1 MB. Check one frame with
`ffmpeg -ss 4 -i hero.mp4 -frames:v 1 f.jpg`.

## STEP 5 — Build the page

Plain static files, no build step:

```
$SITE/index.html      all CSS inline in <style>, tiny inline JS for the form only
$SITE/imprint.html    from templates/imprint.html  (fill {{SITE_NAME}} {{SITE_SLUG}}; restyle tokens)
$SITE/privacy.html    from templates/privacy.html  (fill {{DATE_LONG}}; adjust "What we collect")
$SITE/favicon.svg     simple SVG mark in the accent colour
$SITE/robots.txt  $SITE/sitemap.xml  $SITE/img/
```

`<head>` must have: title, meta description, canonical, og:title/description/image (absolute
`https://<domain>/img/og.jpg`), twitter card, theme-color, JSON-LD (`ProfessionalService` with
provider psquared GmbH, Dametzstraße 2-4, 4020 Linz).

Hero video markup:

```html
<video autoplay muted loop playsinline preload="metadata" poster="img/hero.jpg">
  <source src="img/hero.mp4" type="video/mp4"></video>
```
plus `@media (prefers-reduced-motion:reduce){.hero-media video{display:none}}` and a dark
gradient overlay so the text stays readable.

CSS traps hit in the reference build — prevent them up front:
- `<img width height>` + CSS `aspect-ratio` → also set **`height:auto`**, or the image renders at
  its attribute height (tall stretched photos).
- **Every** multi-column grid needs a `@media (max-width:860px){grid-template-columns:1fr}`.
  The form section was missed once and overflowed on phones.
- `fieldset` has `min-width:min-content` → set `min-width:0` on chip/radio fieldsets.
- `body{overflow-x:clip}` as a last guard, not as the fix.
- Visible focus styles (`:focus-visible` outline in the accent colour).

## STEP 6 — Form submission (contact API)

There is no form backend per site. Every site posts to the psquared.dev Nuxt endpoint, which
sends the request by email (AWS SES, EU) to **office@psquared.dev** with `replyTo` = sender.

- Start from `templates/contact-form.html` (form + script).
- `POST https://psquared.dev/api/contact`, JSON body:
  `{ name, email, message, subject: "<domain> — <type>", source: "<domain>" }`.
  `name`, `email`, `message` are required; the message must not contain `<a href`, `[url=` …
- Keep the honeypot field `company` (hidden; script aborts when filled).
- Server checks the **Origin/Referer host against `NUXT_ALLOWED_DOMAINS`** in Dokploy. A new
  domain gets **403** until it is added (STEP 8). Values are comma-separated hosts.
- On any error the script shows a `mailto:office@psquared.dev` fallback — keep that.
- From `localhost` the form always fails (origin). That is expected; say so when you show the
  local preview.

## STEP 7 — Preview and check locally

```bash
bash $SKILL/scripts/screenshot.sh $SITE <scratchpad>/shots 8931
```

- Starts its own server, renders desktop (1440) and a true 390 px phone view (iframe — headless
  Chrome cannot go below ~500 px window width), prints `phone: SW=<scrollWidth>`. **SW must be
  ≤ 390.** Read the slices `desktop-N.png`, `phone-N.png` and fix what looks off.
- Ports: check `lsof -i :<port>` first — 8765 is often taken by another local app, and a
  screenshot of the wrong app looks like a broken page.
- To show the user: `cd $SITE && nohup /usr/bin/python3 -m http.server 8931 >/dev/null 2>&1 &`
  then `open http://localhost:8931/`.

## STEP 8 — Routing, DNS, Dokploy

**nginx** — add before the allergy-tracker block in `$WEB/nginx/nginx.conf`:

```nginx
    # --- <domain> (Static) ---
    server {
        listen 80;
        server_name <domain>;
        root /usr/share/nginx/html/<slug>;
        index index.html;
        include /etc/nginx/security-headers.conf;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|mp4|webp|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public";
        }
        location / { try_files $uri $uri/ /index.html; }
    }
    server {
        listen 80;
        server_name www.<domain>;
        return 301 https://<domain>$request_uri;
    }
```

Redirects inside a server block must use an absolute `https://<domain>/...` target. TLS ends
at Traefik, so a relative `return 301 /;` sends visitors to `http://` first (seen on ki-linz.at).
When a rebuild replaces an older site, map its old URLs with 301s (ki-linz.at sends
`/wissen/<slug>` to `https://psquared.dev/de/ai-insights/<slug>`, same slugs) and verify one
real old URL end to end.

**Dockerfile** — next to the other static sites:
`COPY apps/<slug>/ /usr/share/nginx/html/<slug>/`

**DNS** (the user does this at the registrar; you give exact values):
- Target IP = `dig +short psquared.dev A` (was `157.90.27.32`).
- Records: `@` (empty name) **A** → IP, `www` **A** → IP.
- psquared domains are mostly at **World4You**: new domains point to a parking IP
  (`81.19.154.98`). Tell the user to **edit or delete those existing A records**, not add new
  ones next to them — two A records make half the requests hit the parking page.
- No NS records at all → domain is not registered/delegated; stop and tell the user.
- Verify: `dig +short <domain> A @ns1.world4you.at` and `@1.1.1.1`.

**Dokploy** (API key in the keychain; the script never prints secrets):

```bash
/usr/bin/python3 $SKILL/scripts/dokploy.py show
/usr/bin/python3 $SKILL/scripts/dokploy.py allow <domain> www.<domain>      # form origin
/usr/bin/python3 $SKILL/scripts/dokploy.py add-domain <domain> www.<domain> # Traefik + Let's Encrypt
```

Add the domains **after** DNS points to the server, so Let's Encrypt can issue at once. The env
change becomes active with the next deploy (the push below). These change production config:
do them when the user asked you to ship, otherwise ask first.

## STEP 9 — Ship and verify

```bash
cd $WEB && git status --short          # stage ONLY your files
git add Dockerfile nginx/nginx.conf apps/<slug>
git commit -m "<domain>: one-pager for <concept>"   # + Co-Authored-By line from the session
git push origin main                   # Dokploy autodeploys, ~1 min
```

Ask before pushing if the user has not said to ship. Then verify live (Python with
`/usr/bin/python3`; `curl` is blocked):

- poll `https://<domain>/` until the new headline appears;
- `www.<domain>` → 301 to the root;
- `img/hero.mp4`, `img/og.jpg`, `imprint.html`, `privacy.html`, `favicon.svg` → 200;
- form origin probe **without email** (sends nothing): POST `{"name":"probe"}` to
  `https://psquared.dev/api/contact` with `Origin: https://<domain>` → expect **400**
  (passed origin, failed validation). **403** = domain not in `NUXT_ALLOWED_DOMAINS` or not yet
  deployed. Never send a full test submission yourself; ask the user to send one.

## STEP 10 — Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ https://<domain> is live
Commit:   <sha> (psquared-websites, main)
Assets:   N images + video · <credits> credits
Checks:   www 301 · assets 200 · form origin 400 (ok)
Confirm:  <every placeholder price / promise / number you invented>
Open:     real form test by the user · <anything skipped>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Failure triage

| Symptom | Cause | Fix |
|---|---|---|
| Screenshot shows a different app | port already used | other port, check `lsof` |
| Phone view cut off on the right | a grid without mobile breakpoint, fieldset min-width | STEP 5 traps; re-run screenshot |
| Photos stretched tall | `height` attribute without `height:auto` | add `height:auto` |
| Form → 403 live | domain not in `NUXT_ALLOWED_DOMAINS` or not redeployed | `dokploy.py allow`, push or `dokploy.py deploy` |
| HTTPS error after go-live | domain added in Dokploy before DNS pointed here | wait a few minutes; Traefik retries; re-check DNS |
| Live page still old | deploy still running | poll ~2 min; `dokploy.py show` for status |
| Redirect goes to `http://` first | relative `return 301 /...` | absolute `https://<domain>/...` |
| `generations-motion-svd` 404 | endpoint retired | `scripts/hero_video.mjs` (Kling 3.0) |
| Python SSL errors | Homebrew python | use `/usr/bin/python3` |
