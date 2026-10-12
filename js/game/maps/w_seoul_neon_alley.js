/**
 * w_seoul_neon_alley.js — Seoul Neon Alley (skin 'Neon ER'; the id is kept from the original game):
 * a pink-and-teal back alley at night.
 *
 * Every 16 units, on each side (offset so the sides never match): a 24-hour convenience store with a striped canopy, a row
 * of glowing vending machines, a jukebox diner, and a pojangmacha street-food cart with a steaming pan and string
 * bulbs. Above them tall painted facades covered in hangul signboards; vertical neon signs lean out over the lane, and
 * cables strung across the alley carry neon plates that say hello. Steam and bokeh drift up; stars show over the roofs.
 */

import * as THREE from 'three';
import { box, cyl, ball, slab, canvasTex, floorPanel, sideCtx, combine } from '../mapkit.js';
import { swarm } from '../mapfx.js';
import { makeAtlas, atlasQuad, atlasPoly, mural, neonText, plainText, rrect, prng, stars, hipRoof } from './asia_kit.js';

var PINK = 0xff5c88;
var TEAL = 0x22e6d8;
var YELLOW = 0xffd23f;
var RED = 0xe8413a;
var DARK = 0x3a2a44;
var CREAM = 0xfff1d6;
var ORANGE = 0xff8a2f;

function facades() {
  // 16 units wide, 10 high, 64 px per unit
  return canvasTex('seoul_mural', 1024, 640, function (ctx, w, h) {
    var rnd = prng(17);
    var widths = [150, 190, 130, 170, 160, 120, 104];
    var heights = [560, 470, 600, 500, 430, 540, 580];
    var cols = ['#3f4a8a', '#8a3a58', '#1f6f74', '#a24e3a', '#2e5a8a', '#6a3f7a', '#27706a'];
    var x = 0;
    widths.forEach(function (bw, i) {
      var bh = heights[i];
      var top = h - bh;
      var g = ctx.createLinearGradient(0, top, 0, h);
      g.addColorStop(0, cols[i]);
      g.addColorStop(1, '#2b2147');
      ctx.fillStyle = g;
      ctx.fillRect(x, top, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x, top, bw, 6);
      ctx.fillRect(x, top, 4, bh);
      if (i % 3 === 1) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (var by = top + 10; by < h; by += 14) ctx.fillRect(x, by, bw, 2); }
      for (var wy = top + 24; wy < h - 260; wy += 56) {
        for (var wx = x + 14; wx < x + bw - 30; wx += 40) {
          var lit = rnd() < 0.7;
          ctx.fillStyle = lit ? (rnd() < 0.4 ? '#9ff5ee' : '#ffe9a0') : '#352a55';
          ctx.fillRect(wx, wy, 26, 34);
          ctx.fillStyle = 'rgba(30,20,60,0.7)'; ctx.fillRect(wx + 12, wy, 2, 34);
          if (rnd() < 0.2) { ctx.fillStyle = '#d8d0e0'; ctx.fillRect(wx + 2, wy + 36, 22, 10); }
        }
      }
      // big hangul signboards stacked on the facade
      var texts = [['치킨', 0xff5c88], ['카페', 0x22e6d8], ['호프', 0xffd23f], ['노래방', 0xff8a5c], ['맛집', 0x22e6d8], ['24시', 0xff5c88], ['PC방', 0xffd23f]];
      var t = texts[i];
      var sy = top + 80 + (i % 2) * 70;
      rrect(ctx, x + 12, sy, bw - 24, 44, 8, '#241a3c', '#' + ('000000' + t[1].toString(16)).slice(-6), 4);
      neonText(ctx, t[0], x + bw / 2, sy + 23, 32, t[1], { core: 0xffffff });
      // AC unit and a drainpipe
      ctx.fillStyle = '#d8d0e0'; ctx.fillRect(x + bw - 44, top + 250, 28, 20);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + bw - 8, top, 5, bh);
      // shopfront band (hidden behind the shops)
      ctx.fillStyle = '#3a2a4a'; ctx.fillRect(x, h - 220, bw, 220);
      x += bw;
    });
    // cables
    ctx.strokeStyle = 'rgba(20,16,40,0.9)';
    ctx.lineWidth = 2;
    [120, 170].forEach(function (y0, i) {
      ctx.beginPath();
      for (var q = 0; q <= w; q += 16) { var yy = y0 + Math.sin((q / w) * Math.PI * (6 + i * 2)) * 9; if (q === 0) ctx.moveTo(q, yy); else ctx.lineTo(q, yy); }
      ctx.stroke();
    });
  });
}

function wetAsphalt() {
  return canvasTex('seoul_floor', 576, 768, function (ctx, w, h) {
    var rnd = prng(9);
    ctx.fillStyle = '#2f7f8c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (var i = 0; i < 400; i++) ctx.fillRect(rnd() * w, rnd() * h, 3, 3);
    // neon reflections smeared along the track from both sides
    for (var s = 0; s < 2; s++) {
      for (var k = 0; k < 10; k++) {
        var x = s ? w - rnd() * 130 : rnd() * 130;
        var y = rnd() * h;
        var col = k % 2 ? 'rgba(255,92,136,0.7)' : 'rgba(120,255,240,0.6)';
        var grd = ctx.createLinearGradient(x, y, x, y + 90);
        grd.addColorStop(0, col); grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd; ctx.fillRect(x - 6, y, 12 + rnd() * 18, 60 + rnd() * 90);
      }
    }
    // puddles
    for (var p = 0; p < 7; p++) {
      var px = 60 + rnd() * (w - 120);
      var py = rnd() * h;
      ctx.fillStyle = 'rgba(160,220,255,0.22)';
      ctx.beginPath(); ctx.ellipse(px, py, 30 + rnd() * 30, 10 + rnd() * 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p % 2 ? 'rgba(255,92,136,0.3)' : 'rgba(34,230,216,0.3)';
      ctx.beginPath(); ctx.ellipse(px + 4, py + 2, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    // kerb lines
    ctx.fillStyle = '#f4d98a'; ctx.fillRect(0.45 * 48, 0, 4, h); ctx.fillRect(w - 0.45 * 48 - 4, 0, 4, h);
  });
}

var _atlas = null;
function atlas() {
  if (_atlas) return _atlas;
  var cells = [];
  ['vn0', 'vn1', 'vn2', 'vn3', 'vn4', 'vn5'].forEach(function (id, i) { cells.push({ id: id, x: i * 100, y: 0, w: 96, h: 288 }); });
  ['vm0', 'vm1', 'vm2'].forEach(function (id, i) { cells.push({ id: id, x: 600 + i * 128, y: 0, w: 124, h: 256 }); });
  ['hz0', 'hz1', 'hz2', 'hz3'].forEach(function (id, i) { cells.push({ id: id, x: i * 256, y: 296, w: 252, h: 88 }); });
  cells.push({ id: 'store', x: 0, y: 392, w: 256, h: 192 });
  cells.push({ id: 'diner', x: 260, y: 392, w: 256, h: 192 });
  cells.push({ id: 'awnP', x: 520, y: 392, w: 128, h: 128 });
  cells.push({ id: 'awnT', x: 650, y: 392, w: 128, h: 128 });
  cells.push({ id: 'tarp', x: 780, y: 392, w: 128, h: 128 });
  ['bn0', 'bn1', 'bn2', 'bn3'].forEach(function (id, i) { cells.push({ id: id, x: (i % 2) * 512, y: 590 + Math.floor(i / 2) * 76, w: 508, h: 72 }); });
  var vn = { vn0: ['맛집', PINK], vn1: ['치킨', TEAL], vn2: ['노래방', YELLOW], vn3: ['커피', TEAL], vn4: ['안녕', PINK], vn5: ['사랑해', 0xff8a5c] };
  var hz = { hz0: ['편의점', 0x22b8b0, 0xffffff], hz1: ['다이너', 0xe8413a, 0xfff1d6], hz2: ['포장마차', 0xff8a2f, 0xffffff], hz3: ['안녕하세요!', 0x2a1f4a, 0xffd23f] };
  var bn = { bn0: ['안녕! 반가워요', PINK], bn1: ['감사합니다', TEAL], bn2: ['사랑해요', 0xff8a5c], bn3: ['맛있어요!', YELLOW] };
  _atlas = makeAtlas('seoul_atlas', 1024, 750, cells, function (ctx, c) {
    var w = c.w;
    var h = c.h;
    var hex = function (n) { return '#' + ('000000' + n.toString(16)).slice(-6); };
    if (vn[c.id]) {
      var v = vn[c.id];
      rrect(ctx, 2, 2, w - 4, h - 4, 12, '#241a3c', hex(v[1]), 5);
      var step = (h - 20) / v[0].length;
      for (var q = 0; q < v[0].length; q++) neonText(ctx, v[0][q], w / 2, 10 + step * (q + 0.5), Math.min(60, step * 0.85), v[1], { core: 0xffffff });
    } else if (c.id.indexOf('vm') === 0) {
      var tone = [0xff5c88, 0x22b8b0, 0xffc83a][+c.id[2]];
      ctx.fillStyle = hex(tone); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff6e0'; ctx.fillRect(10, 40, w - 20, 120);
      var cans = ['#ff4a3a', '#2f8aff', '#ffd23f', '#3fd47a', '#ff9ec0', '#ff8a2f'];
      for (var r = 0; r < 3; r++) for (var cc = 0; cc < 4; cc++) { ctx.fillStyle = cans[(r * 4 + cc + +c.id[2]) % 6]; ctx.fillRect(16 + cc * 24, 48 + r * 36, 16, 28); }
      plainText(ctx, '음료', w / 2, 20, 28, '#ffffff');
      ctx.fillStyle = '#2a1f3a'; ctx.fillRect(18, 192, w - 36, 36);
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(w - 44, 170, 22, 10);
    } else if (hz[c.id]) {
      var d = hz[c.id];
      rrect(ctx, 3, 3, w - 6, h - 6, 14, hex(d[1]), '#ffffff', 4);
      neonText(ctx, d[0], w / 2, h / 2 + 2, d[0].length > 4 ? 42 : 54, d[2], { core: 0xffffff, halo: false });
    } else if (c.id === 'store') {
      ctx.fillStyle = '#f4fffc'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#22b8b0'; ctx.fillRect(0, 0, w, 26);
      ctx.fillStyle = '#ff5c88'; ctx.fillRect(0, 26, w, 10);
      var snack = ['#ff7a5a', '#ffd23f', '#3fd47a', '#ff9ec0', '#2f8aff', '#ffb02f'];
      for (var sh = 0; sh < 3; sh++) { ctx.fillStyle = '#c8b8a0'; ctx.fillRect(14, 70 + sh * 38, 120, 5); for (var it = 0; it < 8; it++) { ctx.fillStyle = snack[(it + sh) % 6]; ctx.fillRect(18 + it * 14, 50 + sh * 38, 10, 20); } }
      ctx.fillStyle = '#9fe8ee'; ctx.fillRect(150, 50, 90, 140);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(154, 54, 12, 132);
      ctx.fillStyle = '#c8e8e8'; ctx.fillRect(0, 150, 140, 42);
      plainText(ctx, '24', 195, 100, 40, '#ff5c88');
    } else if (c.id === 'diner') {
      ctx.fillStyle = '#fff3dc'; ctx.fillRect(0, 0, w, h);
      for (var cx = 0; cx < 16; cx++) for (var cy = 0; cy < 3; cy++) { ctx.fillStyle = (cx + cy) % 2 ? '#e8413a' : '#fff6e4'; ctx.fillRect(cx * 16, 132 + cy * 20, 16, 20); }
      ctx.fillStyle = '#ffd98a'; ctx.fillRect(14, 24, 228, 96);
      ctx.fillStyle = '#d8884a'; ctx.fillRect(14, 70, 228, 6);
      ctx.fillStyle = '#ff5c88'; ctx.beginPath(); ctx.arc(60, 60, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#22b8b0'; ctx.beginPath(); ctx.arc(120, 60, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(180, 60, 18, 0, Math.PI * 2); ctx.fill();
    } else if (c.id === 'awnP' || c.id === 'awnT') {
      var cc2 = c.id === 'awnP' ? '#ff5c88' : '#22b8b0';
      for (var i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff6e4' : cc2; ctx.fillRect(i * (w / 8), 0, w / 8 + 1, h); }
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, h - 22, w, 22);
    } else if (c.id === 'tarp') {
      ctx.fillStyle = '#ff8a2f'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (var t = 0; t < 4; t++) ctx.fillRect(t * 32, 0, 8, h);
    } else if (bn[c.id]) {
      var b = bn[c.id];
      rrect(ctx, 3, 3, w - 6, h - 6, 16, '#241a3c', hex(b[1]), 5);
      neonText(ctx, b[0], w / 2, h / 2 + 2, 44, b[1], { core: 0xffffff });
    }
  });
  return _atlas;
}

function X(side, off) { return side * (5.5 - off); }

function bulbRow(g, side, off, y, z, len, n) {
  for (var i = 0; i < n; i++) ball(g, 0.07, i % 2 ? TEAL : PINK, X(side, off), y - Math.sin((i / (n - 1)) * Math.PI) * 0.12, z - len / 2 + (i / (n - 1)) * len, { seg: 4, bulb: true });
}

function convenience(g, S, z) {
  var side = S.side;
  var A = atlas();
  atlasQuad(g, A, 'store', 3.5, 2.6, X(side, 0.04), 1.3, z, { ry: S.turn });
  atlasPoly(g, A, 'awnT', [X(side, 1.5), 2.55, z - 1.8], [X(side, 1.5), 2.55, z + 1.8], [X(side, 0), 3.0, z + 1.8], [X(side, 0), 3.0, z - 1.8], {});
  atlasQuad(g, A, 'hz0', 2.4, 0.84, X(side, 0.06), 3.55, z, { ry: S.turn });
  // two plastic stools and a bin out front
  [-0.8, 0.2].forEach(function (dz) { cyl(g, 0.2, 0.2, 0.05, PINK, X(side, 0.8), 0.5, z + dz, { seg: 6 }); cyl(g, 0.04, 0.04, 0.5, DARK, X(side, 0.8), 0.25, z + dz, { seg: 4 }); });
  box(g, 0.45, 0.8, 0.45, 0x22b8b0, X(side, 0.5), 0.4, z + 1.4);
  box(g, 0.5, 0.05, 0.5, CREAM, X(side, 0.5), 0.82, z + 1.4);
  bulbRow(g, side, 1.5, 2.55, z, 3.6, 9);
}

function vending(g, S, z) {
  var side = S.side;
  var A = atlas();
  var bodies = [PINK, 0x22b8b0, 0xffc83a];
  [-1.2, 0, 1.2].forEach(function (dz, i) {
    box(g, 0.8, 1.9, 1.0, bodies[i], X(side, 0.5), 0.95, z + dz);
    atlasQuad(g, A, 'vm' + i, 0.92, 1.8, X(side, 0.9), 0.98, z + dz, { ry: S.turn });
    box(g, 0.06, 0.1, 0.9, 0xffffff, X(side, 0.92), 1.95, z + dz, { bulb: true });
  });
  atlasQuad(g, A, 'hz3', 2.4, 0.84, X(side, 0.5), 3.1, z, { ry: S.turn });
  cyl(g, 0.2, 0.17, 0.5, TEAL, X(side, 1.2), 0.25, z + 1.8, { seg: 6 });
}

function diner(g, S, z) {
  var side = S.side;
  var A = atlas();
  atlasQuad(g, A, 'diner', 3.5, 2.6, X(side, 0.04), 1.3, z, { ry: S.turn });
  atlasQuad(g, A, 'hz1', 2.4, 0.84, X(side, 0.06), 3.55, z, { ry: S.turn });
  // the jukebox
  var jx = X(side, 0.75);
  box(g, 0.7, 1.3, 0.95, RED, jx, 0.75, z + 0.4);
  cyl(g, 0.475, 0.475, 0.7, RED, jx, 1.4, z + 0.4, { seg: 8, rx: Math.PI / 2, ry: 0, rz: Math.PI / 2 });
  box(g, 0.06, 0.12, 0.7, TEAL, jx - side * 0.36, 0.5, z + 0.4, { bulb: true });
  box(g, 0.06, 0.12, 0.7, PINK, jx - side * 0.36, 0.8, z + 0.4, { bulb: true });
  box(g, 0.06, 0.12, 0.7, YELLOW, jx - side * 0.36, 1.1, z + 0.4, { bulb: true });
  ball(g, 0.22, 0xfff3c0, jx - side * 0.3, 1.45, z + 0.4, { seg: 6, sx: 0.3, bulb: true });
  // booth seats
  box(g, 0.6, 0.45, 1.1, RED, X(side, 0.45), 0.25, z - 1.0);
  box(g, 0.12, 0.6, 1.1, RED, X(side, 0.2), 0.7, z - 1.0);
  atlasPoly(g, A, 'awnP', [X(side, 1.5), 2.55, z - 1.8], [X(side, 1.5), 2.55, z + 1.8], [X(side, 0), 3.0, z + 1.8], [X(side, 0), 3.0, z - 1.8], {});
}

function cart(g, S, z) {
  var side = S.side;
  var A = atlas();
  [[-1.5, 0.3], [1.5, 0.3], [-1.5, 1.4], [1.5, 1.4]].forEach(function (p) { cyl(g, 0.05, 0.05, 2.3, DARK, X(side, p[1]), 1.15, z + p[0], { seg: 5 }); });
  hipRoof(g, 2.2, 3.8, 0.55, ORANGE, X(side, 0.85), 2.3, z);
  // the cart: table, steaming pan, plates
  box(g, 0.9, 0.8, 2.4, 0xfff1d6, X(side, 0.6), 0.4, z);
  box(g, 1.0, 0.07, 2.5, 0xe8413a, X(side, 0.6), 0.84, z);
  cyl(g, 0.45, 0.4, 0.15, 0xff3a2a, X(side, 0.6), 1.0, z - 0.3, { seg: 8 });
  for (var i = 0; i < 5; i++) cyl(g, 0.07, 0.07, 0.2, 0xffe9c0, X(side, 0.6) + Math.cos(i * 1.7) * 0.2, 1.1, z - 0.3 + Math.sin(i * 1.7) * 0.2, { seg: 5, rz: Math.PI / 2 });
  cyl(g, 0.25, 0.25, 0.2, 0xf4f4ee, X(side, 0.6), 1.0, z + 0.7, { seg: 6 });
  // stools
  [-0.9, 0.9].forEach(function (dz) { cyl(g, 0.2, 0.2, 0.05, RED, X(side, 1.6), 0.5, z + dz, { seg: 6 }); cyl(g, 0.04, 0.04, 0.5, DARK, X(side, 1.6), 0.25, z + dz, { seg: 4 }); });
  atlasQuad(g, A, 'hz2', 1.4, 0.49, X(side, 1.0), 2.5, z + 1.6, {});
  bulbRow(g, side, 1.6, 2.35, z, 3.6, 9);
  bulbRow(g, side, 0.1, 2.35, z, 3.6, 9);
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  var j = (k + (side > 0 ? 2 : 0)) % 4;
  mural(g, facades(), side, z, 10, 0.02, { alpha: true });
  if (j === 0) convenience(g, S, z);
  else if (j === 1) vending(g, S, z);
  else if (j === 2) diner(g, S, z);
  else cart(g, S, z);
  // a vertical neon sign leaning out over the lane
  atlasQuad(g, atlas(), 'vn' + ((j * 2 + (side > 0 ? 1 : 0)) % 6), 0.66, 2.0, X(side, 1.35), 4.6, z - 1.5, {});
}

function center(g, z) {
  floorPanel(g, wetAsphalt(), z, 12);
}

function arch(g, z, i) {
  var A = atlas();
  // a cable across the alley with a neon plate and strings of bulbs
  box(g, 11, 0.04, 0.04, DARK, 0, 6.6, z);
  atlasPoly(g, A, 'bn' + (i % 4), [-2.5, 6.0, z + 0.05], [2.5, 6.0, z + 0.05], [2.5, 6.7, z + 0.05], [-2.5, 6.7, z + 0.05], { unlit: true, single: true });
  for (var f = 0; f < 15; f++) {
    var t = f / 14;
    ball(g, 0.07, f % 2 ? TEAL : PINK, -5 + t * 10, 6.55 - Math.sin(t * Math.PI) * 0.3, z, { seg: 4, bulb: true });
  }
}

function ground(g) {
  slab(g, 400, 400, 0x2f7f8c, 0, -0.02, -190, { r: 1 });
}

function puff() { return combine([{ geo: new THREE.SphereGeometry(0.2, 6, 5), color: 0xffffff }]); }

function extras() {
  var steam = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false });
  var bokeh = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: puff(), material: steam, count: 22, seed: 12 + i * 5, colors: [0xffffff, 0xfff3e0], area: { x: [side * 4.7, side * 5.3], y: [1.0, 3.2], z: [-140, 8] }, k: 1, vy: [0.4, 0.8], wobble: 0.12, scale: [0.7, 1.6] });
    swarm({ geo: puff(), material: bokeh, count: 16, seed: 31 + i * 7, colors: [0xff5c88, 0x22e6d8, 0xffd23f], area: { x: [side * 4.6, side * 5.4], y: [0.8, 6.0], z: [-140, 8] }, k: 1, vy: [0.2, 0.5], wobble: 0.2, scale: [0.6, 1.4] });
  });
  stars(70, { colors: [0xffffff, 0xffe0f0, 0xcffff8] });
}

export var w_seoul_neon_alley = { id: 'w_seoul_neon_alley', indoor: false, bay: bay, center: center, arch: arch, ground: ground, extras: extras };
