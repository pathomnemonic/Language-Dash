#!/usr/bin/env node
// tools/clip/capture-clip.mjs — make a smooth gameplay clip (MP4, H.264, yuv420p, 30 fps, 1080x1920) from the real game.
//
//   node tools/clip/capture-clip.mjs "pair=en-hi&concept=214&lane=1&outcome=hit&map=skin_neon_er&hero=avatar_robot&duration=6" --out out/clips/kal
//
// The query is the capture page's URL (see js/capture.js for every parameter). This is NOT screen recording: the game runs on a
// virtual clock that the page advances by exactly 1/30 s per step, and one picture is taken per step, so the result is the same
// on a slow computer and a fast one (the capture only takes longer) and never drops or repeats a frame by timing.
//
// Options: --out <dir> (default out/clips/<timestamp>)  --scale <n> device scale (2 gives 1080x1920, 1 gives 540x960)
//          --warmup <s> seconds stepped (not saved) before frame 1, so the HUD fade-in is over (default 0.5)  --crf <n> (default 14)  --no-frames (delete the numbered PNGs after encoding)  --build (rebuild the capture build)
// Needs: ffmpeg and ffprobe on the PATH, and Chromium with WebGL (PW_CHROMIUM or Playwright's own).

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = resolve(ROOT, 'dist-capture');
const args = process.argv.slice(2);
let query = '';
let out = '';
let scale = 2;
let crf = 14;
let keepFrames = true;
let build = false;
let warmup = 0.5;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') out = resolve(args[++i]);
  else if (args[i] === '--scale') scale = parseFloat(args[++i]);
  else if (args[i] === '--crf') crf = parseInt(args[++i], 10);
  else if (args[i] === '--no-frames') keepFrames = false;
  else if (args[i] === '--build') build = true;
  else if (args[i] === '--warmup') warmup = parseFloat(args[++i]);
  else if (!query) query = args[i].replace(/^[?]/, '');
}
if (!query) { console.error('usage: node tools/clip/capture-clip.mjs "<query>" [--out dir] [--scale 2] [--crf 14] [--no-frames] [--build]'); process.exit(2); }
if (!out) out = resolve(ROOT, 'out/clips', new Date().toISOString().replace(/[:.]/g, '-'));
const params = new URLSearchParams(query);
const duration = parseFloat(params.get('duration') || '6');
const FPS = 30;
const frames = Math.round(duration * FPS);

// 1. the capture build (a separate folder: the normal build never contains the capture code)
if (build || !existsSync(resolve(DIST, 'index.html'))) {
  console.log('building the capture build (VITE_FEATURE_CAPTURE=1) into dist-capture ...');
  execFileSync('npx', ['vite', 'build', '--outDir', 'dist-capture', '--emptyOutDir'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, VITE_FEATURE_CAPTURE: '1' } });
}

// 2. a tiny static server for it
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = join(DIST, path === '/' ? 'index.html' : path);
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

// 3. the browser
mkdirSync(resolve(out, 'frames'), { recursive: true });
const { chromium } = await import('playwright');
const opts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--no-sandbox'] } : {};
const browser = await chromium.launch(opts);
const report = { query, frames, fps: FPS, scale, build: 'VITE_FEATURE_CAPTURE=1', events: [], duplicateFrames: 0, longestRunOfIdenticalFrames: 0 };
try {
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: scale, bypassCSP: true, serviceWorkers: 'block' });
  const pair = (params.get('pair') || 'en-es').split('-');
  await ctx.addInitScript((p) => {
    try { globalThis.localStorage.setItem('langdash.pair.v1', JSON.stringify({ known: p[0], target: p[1] })); globalThis.localStorage.setItem('ld_lessons_off', '1'); globalThis.localStorage.setItem('ld_levels', JSON.stringify({ [p[0] + '-' + p[1]]: { level: 'beginner', frontier: 80, source: 'beginner', at: 0 } })); } catch { /* storage blocked */ }
  }, pair);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('page error: ' + e.message));
  await page.goto(base + '/?clip=1&' + query);
  // wait (in real time) until the capture page says it is ready; the page may reload once to apply the pair
  const t0 = Date.now();
  for (;;) {
    const st = await page.evaluate(() => (globalThis.__clip ? { ready: globalThis.__clip.ready, error: globalThis.__clip.error } : null)).catch(() => null);
    if (st && st.error) throw new Error('capture page: ' + st.error);
    if (st && st.ready) break;
    if (Date.now() - t0 > 120000) throw new Error('the capture page never became ready');
    await new Promise((r) => setTimeout(r, 250));
  }
  report.info = await page.evaluate(() => globalThis.__clip.info);
  // let the 3D models finish loading (real time, before any frame is taken): the game waits on nothing else
  await new Promise((r) => setTimeout(r, 4000));
  // 4. step and shoot, one picture per step (the warm-up steps are not saved: the clip starts once the HUD has faded in)
  for (let w = 0; w < Math.round(warmup * FPS); w++) await page.evaluate(() => globalThis.__clip.step());
  let prev = '';
  let run = 0;
  for (let i = 0; i < frames; i++) {
    const st = await page.evaluate(() => globalThis.__clip.step());
    const png = await page.screenshot({ type: 'png' });
    writeFileSync(resolve(out, 'frames', 'frame_' + String(i + 1).padStart(5, '0') + '.png'), png);
    const h = createHash('md5').update(png).digest('hex');
    if (h === prev) { report.duplicateFrames++; run++; report.longestRunOfIdenticalFrames = Math.max(report.longestRunOfIdenticalFrames, run); } else run = 0;
    prev = h;
    if (i % 30 === 0) console.log('frame ' + (i + 1) + '/' + frames + '  t=' + (st.t || 0).toFixed(2) + 's  state=' + st.state + '  lane=' + st.lane);
  }
  report.events = await page.evaluate(() => globalThis.__clip.events);
} finally { await browser.close(); server.close(); }

// 5. encode: H.264, yuv420p, 30 fps, even dimensions, faststart
const mp4 = resolve(out, 'clip.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', resolve(out, 'frames', 'frame_%05d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-r', String(FPS), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-movflags', '+faststart', mp4]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-vf', 'select=eq(n\\,' + Math.floor(frames / 2) + ')', '-vframes', '1', resolve(out, 'poster.png')]);

// 6. verify what was made
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt,width,height,r_frame_rate,avg_frame_rate,nb_read_frames,duration', '-of', 'json', mp4]).toString()).streams[0];
report.video = probe;
const ok = probe.codec_name === 'h264' && probe.pix_fmt === 'yuv420p' && probe.r_frame_rate === FPS + '/1' && Number(probe.nb_read_frames) === frames;
report.verified = ok;
writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
if (!keepFrames) rmSync(resolve(out, 'frames'), { recursive: true, force: true });
console.log((ok ? 'OK ' : 'CHECK ') + mp4 + '  ' + probe.width + 'x' + probe.height + ' ' + probe.codec_name + ' ' + probe.pix_fmt + ' ' + probe.r_frame_rate + ' ' + probe.nb_read_frames + ' frames, ' + report.duplicateFrames + ' identical neighbours');
if (!ok) process.exit(1);
