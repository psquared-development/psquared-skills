const { chromium } = require('/Users/martinpammesberger/Documents/psquared/agenthub/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const mode = process.argv[2] || 'preview';
  const browser = await chromium.launch();
  const VERT = process.env.VERT === '1';
  const page = await browser.newPage({ viewport: VERT ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'reel.html') + (VERT ? '?v=1' : ''));
  await page.evaluate(() => document.fonts.ready);
  if (mode === 'preview') {
    const times = (process.argv[3] || '0.8,1.7,2.3,3.2,4.6,6.0,7.2,8.2,10.5,12.2,12.9,13.6,14.4').split(',').map(Number);
    for (const t of times) { await page.evaluate(t => window.render(t), t); await page.screenshot({ path: path.join(__dirname, `${VERT?'pvv':'pv'}_${t.toFixed(2)}.png`) }); }
  } else {
    const fps = Number(process.argv[3] || 60), N = Math.round(30 * fps);
    const ff = spawn('ffmpeg', ['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-','-i',path.join(__dirname,'eleven_edit30.m4a'),'-c:v','libx264','-pix_fmt','yuv420p','-preset','slow','-crf','16','-c:a','aac','-b:a','256k','-shortest','-movflags','+faststart',path.join(__dirname, VERT ? 'inboxmate-reel-30s-vertical.mp4' : 'inboxmate-reel-30s.mp4')], { stdio: ['pipe','inherit','inherit'] });
    for (let i = 0; i < N; i++) {
      await page.evaluate(t => window.render(t), i / fps);
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 120 === 0) console.log('frame', i, '/', N);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
