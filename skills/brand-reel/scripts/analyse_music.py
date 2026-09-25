#!/usr/bin/env python3
"""Print loudness per 0.5 s and the best beat grid (bpm + first-beat phase) of a track.
Usage: python3 analyse_music.py track.mp3|wav [bpm_min bpm_max]   (needs numpy + ffmpeg)"""
import sys, subprocess, numpy as np, wave, tempfile, os
src = sys.argv[1]; lo = float(sys.argv[2]) if len(sys.argv) > 2 else 80; hi = float(sys.argv[3]) if len(sys.argv) > 3 else 140
tmp = tempfile.mktemp(suffix='.wav'); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '22050', tmp], check=True)
w = wave.open(tmp); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768; os.remove(tmp)
hop = 256; m = len(x) // hop; rms = np.array([np.sqrt(np.mean(x[i*hop:(i+1)*hop]**2)) for i in range(m)]); t = np.arange(m) * hop / sr
print(f'duration {len(x)/sr:.2f}s'); print('loudness/0.5s:', ' '.join(f'{int(max(0,60+20*np.log10(rms[(t>=a)&(t<a+.5)].mean()+1e-9))):2d}' for a in np.arange(0, len(x)/sr, .5)))
e = np.log(rms + 1e-6); o = np.maximum(0, np.diff(e, prepend=e[0])); best = (0, 0, 0)
for bpm in np.arange(lo, hi + .001, .02):
    B = 60 / bpm
    for ph in np.arange(0, B, .005):
        idx = ((ph + np.arange(0, len(x)/sr/B) * B) * sr / hop).astype(int); idx = idx[idx < m]; s = o[idx].sum()
        if s > best[0]: best = (s, bpm, ph)
print(f'grid: {best[1]:.2f} bpm, first beat {best[2]:.3f}s')
