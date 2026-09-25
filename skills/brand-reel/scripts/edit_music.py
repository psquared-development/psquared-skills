#!/usr/bin/env python3
"""Cut a track onto the video beat grid.

Usage: python3 edit_music.py track.mp3 out.wav plan.json
plan.json: {"bpm":87, "phase":0.03, "video_t0":0.0294, "duration":30,
            "pieces":[[0,15,1], [16,28,17], [28,32,25], [32,40,29], [40,null,37]],
            "breaks":[[15,17]]}
pieces: [video_beat_from, video_beat_to (null = end), track_beat_from]. Keep cuts on bar starts.
breaks: [video_beat, track_beat]: that beat becomes a reverse swell of the given track beat.
"""
import json, sys, subprocess, tempfile, os, numpy as np, wave
src, dst, plan = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
tmp = tempfile.mktemp(suffix='.wav'); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ar', '44100', '-ac', '2', tmp], check=True)
w = wave.open(tmp); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(float) / 32768; os.remove(tmp)
B = 60 / plan['bpm']; P = plan['phase']; VT0 = plan['video_t0']; DUR = plan['duration']
tb = lambda j: P + j * B; vb = lambda k: VT0 + k * B; S = lambda t: int(round(t * sr))
out = np.zeros((S(DUR), 2))
for n, (k0, k1, j0) in enumerate(plan['pieces']):
    v0 = 0 if k0 == 0 else vb(k0); v1 = DUR if k1 is None else vb(k1); t0 = tb(j0) - (vb(0) if k0 == 0 else 0)
    seg = a[S(t0):S(t0) + S(v1) - S(v0)].copy(); fi = S(.25 if n == 0 else .008); fo = S(.3 if k1 is None else .008)
    seg[:fi] *= np.linspace(0, 1, fi)[:, None]; seg[-fo:] *= np.linspace(1, 0, fo)[:, None]; out[S(v0):S(v0) + len(seg)] += seg
for k, j in plan.get('breaks', []):
    n = S(vb(k + 1)) - S(vb(k)); rev = a[S(tb(j)):S(tb(j)) + n][::-1].copy(); rev *= (np.linspace(0, 1, len(rev))**2.5)[:, None] * .55
    out[S(vb(k)):S(vb(k)) + len(rev)] += rev
out /= np.max(np.abs(out)) / .89
wo = wave.open(dst, 'wb'); wo.setnchannels(2); wo.setsampwidth(2); wo.setframerate(sr); wo.writeframes((out * 32767).astype(np.int16).tobytes()); wo.close(); print('written', dst)
