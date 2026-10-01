#!/usr/bin/env node
// Animate a Leonardo-GENERATED image into a web-ready looping hero video (Kling 3.0).
//
//   node hero_video.mjs --generation <leonardo generationId from the image sidecar> \
//        --prompt "Static locked-off camera ... Nothing else moves." --out site/img/hero.mp4 [--raw raw.mp4]
//
// Steps: look up the image id of the generation -> POST v2 generations (kling-3.0, start_frame GENERATED,
// 1080p, 5 s, no audio) -> poll v1 generations/<id> -> download -> ffmpeg: 1600 px wide, no audio,
// forward+reverse (seamless loop), crf 27, faststart. Cost: ~560 credits per 5 s clip.
// Key: LEONARDO_API_KEY from env or psquared-skills/.env (never printed).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; };
const generation = arg('generation'), prompt = arg('prompt'), out = arg('out');
if (!generation || !prompt || !out) { console.error('usage: --generation <id> --prompt "<motion>" --out <file.mp4> [--raw <file>]'); process.exit(2); }

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../../../.env');
let key = process.env.LEONARDO_API_KEY;
if (!key && fs.existsSync(envFile)) {
  const m = fs.readFileSync(envFile, 'utf8').match(/^LEONARDO_API_KEY\s*=\s*["']?([^"'\n]+)/m);
  key = m && m[1].trim();
}
if (!key) { console.error('LEONARDO_API_KEY missing (env or ' + envFile + ')'); process.exit(3); }
const H = { accept: 'application/json', 'content-type': 'application/json', authorization: 'Bearer ' + key };
const get = async (u) => (await fetch(u, { headers: H })).json();

const g = await get(`https://cloud.leonardo.ai/api/rest/v1/generations/${generation}`);
const imageId = g.generations_by_pk?.generated_images?.[0]?.id;
if (!imageId) { console.error('no image found for generation', generation); process.exit(4); }

const body = { model: 'kling-3.0', public: false, parameters: {
  prompt, duration: 5, width: 1920, height: 1080, mode: 'RESOLUTION_1080', motion_has_audio: false,
  guidances: { start_frame: [{ image: { id: imageId, type: 'GENERATED' } }] } } };
const r = await fetch('https://cloud.leonardo.ai/api/rest/v2/generations', { method: 'POST', headers: H, body: JSON.stringify(body) });
const j = await r.json();
const id = j.generate?.generationId;
if (!id) { console.error('create failed', r.status, JSON.stringify(j).slice(0, 300)); process.exit(5); }
console.log('kling generation', id, '| cost', j.generate?.apiCreditCost, 'credits');

let url;
for (let i = 0; i < 60 && !url; i++) {
  await new Promise((s) => setTimeout(s, 10000));
  const p = (await get(`https://cloud.leonardo.ai/api/rest/v1/generations/${id}`)).generations_by_pk;
  if (p?.status === 'FAILED') { console.error('FAILED'); process.exit(7); }
  if (p?.status === 'COMPLETE') url = p.generated_images[0].motionMP4URL || p.generated_images[0].url;
}
if (!url) { console.error('timeout; check later: v1/generations/' + id); process.exit(8); }

const raw = arg('raw', out.replace(/\.mp4$/, '') + '-raw.mp4');
fs.writeFileSync(raw, Buffer.from(await (await fetch(url)).arrayBuffer()));
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-an', '-filter_complex',
  '[0:v]scale=1600:-2,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]', '-map', '[v]',
  '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
console.log('raw  ', path.resolve(raw), '(keep OUT of the site folder)');
console.log('video', path.resolve(out), Math.round(fs.statSync(out).size / 1024), 'KB');
