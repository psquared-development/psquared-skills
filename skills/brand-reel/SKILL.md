---
name: brand-reel
description: >
  Make a short motion-graphics brand reel or video ad (InboxMate, psquared or another psquared brand):
  a deterministic HTML/SVG animation rendered frame by frame with Playwright, cut on the music beat,
  with ElevenLabs music, a QR-code ending, and landscape (1920x1080) plus vertical (1080x1920) versions.
  Use for "reel", "showreel", "motion video", "video ad", "30-second ad", "Instagram/LinkedIn video".
---

# Brand reel

A reel is one HTML file (`template/reel.html`). `render(t)` draws the frame for time `t`. Nothing moves
by itself (no CSS transitions), so every frame is exact. `template/render.cjs` captures the frames with
Playwright and pipes them to ffmpeg together with the music.

## What the user likes (keep these unless told otherwise)

- **Length:** 30 s for an ad (the usual ad length). Do not stretch scenes to fill time. Add a new
  scene instead.
- **Pace:** calm and readable, about 87 BPM (one beat about 0.69 s). One idea per scene. Fast cuts only
  on real music hits.
- **Density:** many elements where it helps (for example about 120 letters in the intro rain, not 40).
- **No showreel HUD:** no corner marks, no corner texts, no timecode. Keep only the thin progress bar.
- **Layout must fit:** labels and pills get the width their text needs (measure with
  `getComputedTextLength`). Lines and arrows never cross illustrations; put them in the gaps.
- **Brand (InboxMate):** emerald `#10b981`, ink `#0b1410`, paper `#f6f7f3` with a dot grid, SF Pro
  Display 900 for headlines, Newsreader italic in emerald for the accent word, hand-drawn spot
  illustrations from `psquared-websites/apps/inboxmate/media/illu/`. Short white flash on each cut.
- **German copy in "Sie"**, short, no dashes in headlines.
- **Ending:** logo lockup, then QR code with the logo inside, "Termin buchen" and the URL.
- **Always two formats:** landscape 1920x1080 and vertical 1080x1920 (`?v=1`), 60 fps.

## Claims: check before you render

Every product or legal claim in the video must match the website, the privacy policy and the code.
Known state (InboxMate, 09/2026):

- OK: "Daten in Frankfurt" (database and storage), "Standard: EU-KI-Modelle" (switch on by default for
  new accounts), "Auftragsverarbeitungsvertrag (AVV)", "Für DSGVO-konformen Einsatz gebaut".
- Not OK: "Verarbeitung in der EU" as an absolute (US route exists when the switch is off; web research
  uses a US service), "AI-Act-konform" or any certificate (not verified), "garantiert DSGVO-konform".
- Prices, customer names, partners (Doppler, neverlost) never appear.
When unsure, drop the claim or ask the user.

## Workflow

1. **Storyboard on a beat grid.** Plan scenes in beats (see the table in `template/reel.html`,
   `scenes` array). The template runs at 128 BPM "music time" and is slowed by `SLOW` to the real
   tempo. For 87 BPM: `SLOW=(60/87)/(60/128)`, `DUR=30/SLOW`.
2. **Copy the template** to a work folder in the scratchpad: `reel.html`, `render.cjs`,
   `Newsreader-Italic.ttf`, the spot images the scenes use.
3. **Music (ElevenLabs, paid plan):**
   `/usr/bin/python3 scripts/elevenlabs_music.py cand 2 87 30` (key `ELEVENLABS_API_KEY` from `psquared-skills/.env`).
   Measure each candidate: `python3 scripts/analyse_music.py cand1.mp3 84 90`.
   Facts learned: the API ignores section timing and length (returns ~31 s), but the tempo is exact.
   Composition-plan sections must be >= 3000 ms and were followed less than a timestamp prompt.
   So pick the track with the best groove and a natural ending, then **cut it to the grid** with
   `scripts/edit_music.py` (plan.json: pieces on bar starts, a reverse-swell break, the natural ending
   at the logo/QR part). Repeat one bar instead of time-stretching. If no API: `compose_fallback.py`
   synthesizes a clean track on the exact grid.
4. **QR code:** `scripts/make_qr.sh https://inboxmate.at <workdir>` writes `qr.json`; paste the matrix
   into the `QR=` line. Error correction H, logo covers the centre 7x7 modules only.
5. **Preview before the full render:** `node render.cjs preview 1.9,6.6,10.7,...` (and
   `VERT=1 node render.cjs preview …`). Build one contact sheet with ffmpeg `tile`, look at it once,
   fix everything in one pass.
6. **Render:** `node render.cjs video 60` and `VERT=1 node render.cjs video 60` (set the music file,
   frame count `N` and output names in `render.cjs`). Playwright comes from
   `agenthub/node_modules/playwright`.
7. **Verify:** ffprobe length and size, a contact sheet of the final file, and decode the QR code from
   a late frame with OpenCV (`cv2.QRCodeDetector`). Copy the results to `~/Desktop/`.

## Report

Say what changed per scene, the music source and how it was cut, which claims you checked, and where
the files are. Mention that timing of music cuts was checked by measurement, not by ear.
