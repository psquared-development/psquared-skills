#!/usr/bin/env python3
"""Generate candidate tracks with the ElevenLabs Music API (paid plan required).

Usage: ELEVENLABS_API_KEY=... /usr/bin/python3 elevenlabs_music.py out_prefix [n] [bpm] [seconds]
Uses a plain prompt with explicit timestamps. In practice the API returns ~31 s
tracks that sit exactly on the requested BPM; the timing of sections is NOT
followed, so the track is cut to the video grid afterwards (edit_music.py).
Composition plans need sections >= 3000 ms and were followed even less.
"""
import json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY') or sys.exit('ELEVENLABS_API_KEY missing')
prefix = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 2
bpm = sys.argv[3] if len(sys.argv) > 3 else '87'; secs = int(sys.argv[4]) if len(sys.argv) > 4 else 30
prompt = (f"Instrumental motion-graphics showreel track, {bpm} BPM, clean punchy modern tech house with crisp hi-hats, "
          "bright plucky synth arpeggios and a tight sub bass. Premium, confident, optimistic brand feel. "
          "0:00 short build-up with a filtered riser; 0:03 hard drop with kick on every beat; "
          "later one short stop with a reverse cymbal swell, then the beat returns bigger; "
          "end with one final big hit and a warm resolving chord that rings out. No vocals.")
for i in range(1, n + 1):
    body = {"prompt": prompt, "music_length_ms": secs * 1000, "model_id": "music_v1", "force_instrumental": True}
    req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=json.dumps(body).encode(),
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    try:
        open(f'{prefix}{i}.mp3', 'wb').write(urllib.request.urlopen(req, timeout=400).read()); print('ok', f'{prefix}{i}.mp3')
    except urllib.error.HTTPError as e:
        print('ERR', e.code, e.read()[:300]); break
