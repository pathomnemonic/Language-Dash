/**
 * w_aquarium_of_tongues.js — Aquarium of Tongues: a glass tunnel under a sunlit reef where the fish mumble in every
 * language.
 *
 * The runner follows a sandy tunnel floor with water-light rippling across it, under glass ribs and a sunlit surface.
 * The walls are the tank: deep reef scenery painted in front of blue water. Every 16 units (four bays): a coral reef with
 * clownfish, a kelp forest with blue tangs, a big grouper mumbling "hello" in three scripts, and a sunken ship with a
 * treasure chest. Speech bubbles in fifteen languages float beside the fish. Moving: schools of fish, jellyfish,
 * rising bubbles and the dancing caustic light.
 */

import * as THREE from 'three';
import { box, cyl, ball, cone, ring, extrude, starShape, combine, xform, canvasTex, floorPanel, ceilingPanel, wallPanel, sideCtx, bulb } from '../mapkit.js';
import { swarm, flow } from '../mapfx.js';
import { atlasTex, atlasQuad, fitText, roundRectPath } from './lullaby_clouds_atlas.js';

var H = 6.4;
var CORAL = [0xff6a5e, 0xff90b0, 0xffb23f, 0x4fe0c0, 0xffd23f];
var ORANGE = 0xff8a20;
var HELLO = ['Hello', 'Hola', 'Bonjour', 'Hallo', 'Ciao', 'Olá', 'Hoi', 'Hej', 'Cześć', 'Привет', 'こんにちは', '안녕하세요', '你好', 'مرحبا', 'नमस्ते', 'Blub!'];

// ---------- painted pictures ----------

function waterWall() {
  // 16 x 6.4 at 64 px: sunlit water over a painted reef, light shafts, drifting fish and bubbles
  return canvasTex('tongues_wall', 1024, 410, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5ff0ff'); g.addColorStop(0.55, '#26b4ee'); g.addColorStop(1, '#1678c8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (var i = 0; i < 8; i++) { var x0 = i * 128 + 10; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 60, 0); ctx.lineTo(x0 + 10, h); ctx.lineTo(x0 - 70, h); ctx.fill(); }
    // far reef: rounded corals in strong colours
    var cols = ['#ff7a6e', '#ffc040', '#ff90b0', '#46d8b8', '#ffe060', '#7ab0ff'];
    for (var c = 0; c < 22; c++) {
      var cx = (c * 47 + (c % 3) * 11) % w;
      var base = h - 30;
      var ht = 40 + (c * 37) % 90;
      ctx.fillStyle = cols[c % 6];
      ctx.beginPath();
      ctx.ellipse(cx, base - ht * 0.4, 22 + (c % 4) * 6, ht * 0.5, 0, 0, 6.283);
      ctx.fill();
      for (var b = -1; b <= 1; b++) { ctx.beginPath(); ctx.ellipse(cx + b * 26, base - ht * 0.5 - 8, 9, ht * 0.4, b * 0.3, 0, 6.283); ctx.fill(); }
    }
    // sand
    ctx.fillStyle = '#f4dca0'; ctx.fillRect(0, h - 34, w, 34);
    ctx.fillStyle = '#ffe9b8'; ctx.fillRect(0, h - 34, w, 6);
    // drifting fish
    var fc = ['#ffa23f', '#ffd23f', '#ff6a8a', '#ffffff'];
    for (var f = 0; f < 12; f++) {
      var fx = (f * 83 + 20) % (w - 40);
      var fy = 50 + (f * 53) % 180;
      ctx.fillStyle = fc[f % 4];
      ctx.beginPath(); ctx.ellipse(fx, fy, 16, 8, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx + 12, fy); ctx.lineTo(fx + 26, fy - 9); ctx.lineTo(fx + 26, fy + 9); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5;
    for (var bb = 0; bb < 16; bb++) { ctx.beginPath(); ctx.arc((bb * 61 + 30) % w, 40 + (bb * 71) % 250, 4 + bb % 4 * 2, 0, 6.283); ctx.stroke(); }
  });
}

function sandFloor() {
  // 12 x 16 at 48 px: a rippled sandy floor with a pale blue glass kerb each side
  return canvasTex('tongues_floor', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#f8e6b8'; ctx.fillRect(0, 0, w, h);
    for (var j = 0; j < 16; j++) {
      ctx.fillStyle = j % 2 ? 'rgba(255,255,255,0.28)' : 'rgba(210,160,80,0.18)';
      ctx.beginPath();
      for (var x = 0; x <= w; x += 12) { var y = j * 48 + 24 + Math.sin(x / 40 + j) * 5; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.lineTo(w, j * 48 + 38); ctx.lineTo(0, j * 48 + 38); ctx.closePath(); ctx.fill();
    }
    // shells
    var sc = ['#ff90b0', '#ffffff', '#ffb23f'];
    for (var s = 0; s < 40; s++) { ctx.fillStyle = sc[s % 3]; ctx.beginPath(); ctx.arc(40 + (s * 109) % (w - 80), (s * 157) % h, 4 + s % 3, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = '#4fd8e8'; ctx.fillRect(0, 0, 20, h); ctx.fillRect(w - 20, 0, 20, h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(20, 0, 4, h); ctx.fillRect(w - 24, 0, 4, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [-1.5, 1.5].forEach(function (lx) { ctx.fillRect(w / 2 + lx * 48 - 2, 0, 4, h); });
  });
}

function surfaceCeiling() {
  // 11.6 x 16: the sunlit surface seen from below, bright wavy bands
  return canvasTex('tongues_surface', 464, 640, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#8af4ff'); g.addColorStop(0.5, '#c8fbff'); g.addColorStop(1, '#8af4ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6;
    for (var j = 0; j < 8; j++) {
      ctx.beginPath();
      for (var x = 0; x <= w; x += 8) { var y = j * 80 + 40 + Math.sin(x / 30 + j * 1.7) * 12; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (var k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc((k * 97) % w, (k * 131) % h, 10, 0, 6.283); ctx.fill(); }
  });
}

var _caustic = null;
function causticMat() {
  if (_caustic) return _caustic;
  var t = canvasTex('tongues_caustic', 256, 256, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3;
    for (var i = 0; i < 26; i++) {
      var cx = (i * 97) % w;
      var cy = (i * 61) % h;
      var r = 22 + (i % 5) * 7;
      for (var s = -1; s <= 1; s++) for (var u = -1; u <= 1; u++) { ctx.beginPath(); ctx.arc(cx + s * w, cy + u * h, r, 0.3, 2.2); ctx.stroke(); }
    }
  });
  if (t) t.repeat.set(3, 4);
  _caustic = bulb(0xffffff, { map: t, op: 0.3 });
  return _caustic;
}

function bubbleAtlas() {
  // 4 x 4 speech bubbles: "hello" in fifteen languages and a blub
  return atlasTex('tongues_hello', 4, 4, 256, 128, function (ctx, i, w, h) {
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, 6, 6, w - 12, h - 36, 40);
    ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#1d8ec8'; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(w - 80, h - 34); ctx.lineTo(w - 44, h - 4); ctx.lineTo(w - 48, h - 34); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w - 80, h - 32); ctx.lineTo(w - 44, h - 4); ctx.lineTo(w - 48, h - 32); ctx.stroke();
    ctx.fillRect(w - 78, h - 38, 28, 8);
    fitText(ctx, HELLO[i], w / 2, (h - 30) / 2 + 6, w - 60, 62, ['#d8382a', '#0f6ab8', '#e07a00', '#1a9a5a'][i % 4]);
  });
}

function speech(g, S, idx, x, y, z, w) {
  atlasQuad(g, bubbleAtlas(), 4, 4, idx % 16, w, w * 0.5, x, y, z, { ry: S.turn + S.side * 0.4 });
}

// ---------- reef pieces ----------

function coral(g, x, z, s, c) {
  cyl(g, 0.08 * s, 0.14 * s, 0.7 * s, c, x, 0.35 * s, z, { seg: 6 });
  [[-0.25, 0.4], [0.25, 0.5], [0, 0.65]].forEach(function (b, i) {
    var bz = z + b[0] * s * 0.9;
    cyl(g, 0.05 * s, 0.09 * s, 0.6 * s, c, x, 0.8 * s + i * 0.08, bz, { seg: 5, rx: b[0] * 0.8 });
    ball(g, 0.11 * s, c, x, 1.12 * s + i * 0.12, bz + b[0] * 0.2 * s, { seg: 5 });
  });
}

function brain(g, x, z, r, c) {
  ball(g, r, c, x, r * 0.55, z, { seg: 9, sy: 0.7 });
  for (var i = 0; i < 4; i++) ring(g, r * (0.35 + i * 0.16), 0.02 * r / 0.5 + 0.015, 0xffffff, x, r * 0.55 + r * 0.55 * (1 - i * 0.2), z, { rx: Math.PI / 2, seg: 10, tube: 3, arc: 5 });
}

function anemone(g, x, z, s, c) {
  cyl(g, 0.22 * s, 0.28 * s, 0.35 * s, 0xc4546e, x, 0.18 * s, z, { seg: 8 });
  for (var i = 0; i < 10; i++) {
    var a = (i / 10) * Math.PI * 2;
    cone(g, 0.045 * s, 0.5 * s, c, x + Math.cos(a) * 0.15 * s, 0.55 * s, z + Math.sin(a) * 0.15 * s, { seg: 4, rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5 });
  }
}

function fish(g, x, y, z, s, body, fin, ry, stripe) {
  var o = { ry: ry };
  ball(g, 0.3 * s, body, x, y, z, { seg: 8, sy: 0.75, sz: 1.5, ry: ry });
  var c = Math.cos(ry);
  var sn = Math.sin(ry);
  // the tail is behind: along local +z
  cone(g, 0.22 * s, 0.4 * s, fin, x + sn * 0.5 * s, y, z + c * 0.5 * s, { seg: 4, rx: Math.PI / 2, ry: ry, sx: 0.3, sy: 1 });
  box(g, 0.03 * s, 0.22 * s, 0.4 * s, fin, x, y + 0.24 * s, z, o);
  [-0.2, 0.2].forEach(function (lx) {
    ball(g, 0.05 * s, 0xffffff, x + (lx * c - 0.25 * sn) * s, y + 0.07 * s, z + (-lx * sn - 0.25 * c) * s, { seg: 5 });
  });
  if (stripe) box(g, 0.32 * s, 0.5 * s, 0.07 * s, 0xffffff, x, y, z - c * 0.1 * s + sn * 0.0, o);
}

function kelp(g, x, z, h, c) {
  var n = Math.round(h / 0.5);
  for (var i = 0; i < n; i++) ball(g, 0.18 - i * 0.006, c, x + Math.sin(i * 0.9 + z) * 0.1, 0.25 + i * 0.5, z, { seg: 5, sy: 1.5, sz: 0.6 });
}

function starfish(g, x, z, s, c) {
  extrude(g, starShape(0.3 * s, 0.13 * s, 5), 0.06 * s, c, x, 0.05, z, { rx: -Math.PI / 2 });
}

function sandMound(g, S, z) {
  // a low mound of sand and a pale-blue rail at the foot of the glass
  box(g, 0.14, 0.26, 4, 0x4fd8e8, S.in(0.0), 0.13, z);
  ball(g, 0.9, 0xf4dca0, S.in(0.7), 0.0, z, { seg: 8, sy: 0.35, sz: 2.2 });
}

// ---------- the four scenes ----------

function reefScene(g, S, z) {
  var x = S.in(0.7);
  coral(g, x, z - 1.4, 1.4, CORAL[0]);
  coral(g, x, z + 0.2, 1.8, CORAL[2]);
  coral(g, x, z + 1.5, 1.2, CORAL[3]);
  coral(g, S.in(0.5), z - 0.5, 0.9, CORAL[1]);
  brain(g, S.in(0.5), z + 0.9, 0.5, CORAL[4]);
  anemone(g, S.in(0.45), z - 1.6, 1.4, 0xff90b0);
  // clownfish pair guarding the anemone
  fish(g, S.in(0.6) - S.side * 0.25, 1.1, z - 1.45, 1.1, ORANGE, ORANGE, 0, true);
  fish(g, S.in(0.6) - S.side * 0.1, 1.5, z - 1.0, 0.8, ORANGE, ORANGE, 0, true);
  speech(g, S, 1, S.in(0.5), 2.7, z - 1.2, 1.2);
  speech(g, S, 2, S.in(0.6), 3.9, z + 0.9, 1.3);
  fish(g, S.in(0.6) - S.side * 0.1, 3.2, z + 1.4, 0.9, 0x46b8ff, 0xffd23f, 0 + 0.3, false);
}

function kelpScene(g, S, z) {
  [[-1.5, 4.2], [-0.8, 3.0], [0.0, 5.0], [0.8, 3.6], [1.5, 4.4]].forEach(function (k, i) {
    kelp(g, S.in(0.5 + (i % 2) * 0.3), z + k[0] * 1.1, k[1], [0x2fbf6a, 0x3fd47a, 0x58e08a][i % 3]);
  });
  // blue tangs between the fronds
  [[-0.6, 1.4], [0.5, 2.2], [1.0, 3.4]].forEach(function (f, i) {
    fish(g, S.in(0.55) - S.side * 0.4, f[1], z + f[0] * 1.2, 0.9, 0x2f9cff, 0xffd23f, 0 + (i - 1) * 0.3, false);
  });
  speech(g, S, 3, S.in(0.6), 2.4, z - 0.5, 1.2);
  speech(g, S, 4, S.in(0.6), 4.6, z + 1.3, 1.2);
  starfish(g, S.in(0.5), z + 1.8, 1.2, ORANGE);
  starfish(g, S.in(0.6), z - 1.8, 1.0, 0xff90b0);
}

function grouperScene(g, S, z) {
  var x = S.in(0.65);
  // a big grouper mumbling: a fat body, big lips, a fan tail, three speech bubbles above it
  ball(g, 0.75, 0x3fb0ff, x, 1.5, z, { seg: 10, sy: 0.85, sz: 1.35, ry: 0 });
  ball(g, 0.5, 0x8ad8ff, x - S.side * 0.1, 1.2, z - 0.1, { seg: 8, sy: 0.55, sz: 1.0 });
  cone(g, 0.5, 0.9, 0xffd23f, x, 1.5, z + 1.3, { seg: 4, rx: Math.PI / 2, sx: 0.3 });
  ball(g, 0.13, 0xffffff, x - S.side * 0.55, 1.85, z - 0.55, { seg: 6 });
  ball(g, 0.06, 0x2a2a3a, x - S.side * 0.62, 1.85, z - 0.56, { seg: 5 });
  ball(g, 0.18, 0xff6a8a, x - S.side * 0.7, 1.35, z - 1.0, { seg: 8, sx: 0.5, sz: 1.2 });
  box(g, 0.04, 0.4, 0.8, 0x2f9cff, x, 2.3, z + 0.1, { rx: 0.2 });
  speech(g, S, 12, S.in(0.5), 3.4, z - 0.6, 1.6);
  speech(g, S, 13, S.in(0.6), 4.5, z + 0.7, 1.6);
  speech(g, S, 9, S.in(0.5), 5.4, z - 1.0, 1.5);
  coral(g, S.in(0.4), z - 1.7, 1.0, CORAL[1]);
  coral(g, S.in(0.4), z + 1.7, 1.2, CORAL[0]);
}

function wreckScene(g, S, z) {
  var x = S.in(0.7);
  // a sunken ship's bow tilted in the sand: planks, a mast and a tattered flag
  box(g, 0.9, 0.5, 3.0, 0x9a5a2a, x, 0.5, z, { rz: S.side * 0.25 });
  box(g, 0.9, 0.2, 3.0, 0xc98a52, x - S.side * 0.1, 0.9, z, { rz: S.side * 0.25 });
  for (var i = 0; i < 4; i++) box(g, 0.08, 0.5, 0.1, 0xe8b070, x - S.side * 0.45, 1.0, z - 1.2 + i * 0.8, { rz: S.side * 0.25 });
  cyl(g, 0.06, 0.08, 3.2, 0x7a4a22, x, 2.3, z - 0.4, { seg: 6, rz: S.side * 0.1 });
  box(g, 0.04, 0.7, 1.0, 0xff6a5e, x - S.side * 0.1, 3.4, z + 0.1);
  ring(g, 0.5, 0.06, 0xffd23f, x, 1.7, z + 0.8, { ry: S.turn, seg: 12, tube: 4 });
  // a treasure chest of gold with a rolled passport, starfish and shells
  var cz = z + 1.5;
  var cx = S.in(0.4);
  box(g, 0.6, 0.35, 0.8, 0x9a5a2a, cx, 0.2, cz);
  box(g, 0.62, 0.1, 0.82, 0xffd23f, cx, 0.4, cz);
  ball(g, 0.3, 0x9a5a2a, cx, 0.4, cz, { seg: 8, sy: 0.6, sx: 0.9, sz: 1.2 });
  for (var c = 0; c < 6; c++) ball(g, 0.06, 0xffd23f, cx - S.side * 0.1 + (c % 3) * 0.1, 0.5 + (c % 2) * 0.05, cz - 0.15 + c * 0.06, { seg: 5, bulb: true });
  cyl(g, 0.05, 0.05, 0.3, 0x3f6ec8, cx - S.side * 0.2, 0.55, cz + 0.28, { rx: Math.PI / 2, seg: 6 });
  starfish(g, S.in(0.5), z - 1.9, 1.2, 0xff6a5e);
  cone(g, 0.18, 0.22, 0xffb8c8, S.in(0.35), 0.1, z - 1.2, { seg: 6 });
  speech(g, S, 5, S.in(0.5), 3.3, z + 1.3, 1.3);
  speech(g, S, 7, S.in(0.6), 4.8, z - 1.0, 1.3);
  fish(g, S.in(0.6) - S.side * 0.1, 2.4, z - 1.4, 1.0, 0xffd23f, 0xff8a20, 0 - 0.3, false);
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, waterWall(), side, z, H, 0.0, { r: 0.6, env: 0.1 });
  sandMound(g, S, z);
  if (k === 0) reefScene(g, S, z);
  else if (k === 1) kelpScene(g, S, z);
  else if (k === 2) grouperScene(g, S, z);
  else wreckScene(g, S, z);
}

function center(g, z) {
  floorPanel(g, sandFloor(), z, 12);
  floorPanel(g, canvasTex('tongues_none', 4, 4, function () {}), z, 11.4, { y: 0.03, color: 0xffffff }).material = causticMat();
  ceilingPanel(g, surfaceCeiling(), z, 11.6, H);
}

function arch(g, z, i) {
  // glass ribs of the tunnel, with glowing buoys
  ring(g, 5.45, 0.07, 0xdff6ff, 0, 0.95, z, { arc: Math.PI, seg: 26, tube: 4 });
  ring(g, 5.45, 0.025, 0xffffff, 0, 0.95, z + 0.1, { arc: Math.PI, seg: 26, tube: 3, bulb: true });
  for (var f = 0; f < 5; f++) {
    var a = Math.PI * (0.2 + f * 0.15);
    ball(g, 0.15, [0xffb23f, 0xff6a5e, 0xffe27a][(f + i) % 3], Math.cos(a) * 5.4, 0.95 + Math.sin(a) * 5.4 - 0.2, z, { seg: 5, bulb: true });
  }
  // a jellyfish lamp hanging at the centre of the roof
  ball(g, 0.3, 0xffc8e0, 0, H - 0.9, z, { seg: 8, sy: 0.7, bulb: true });
  for (var t = -1; t <= 1; t++) cyl(g, 0.012, 0.012, 0.5, 0xffc8e0, t * 0.12, H - 1.3, z, { seg: 3 });
}

// ---------- the things that move ----------

function extras() {
  flow(causticMat().map, 0.05, 0.08);
  var fishGeo = combine([
    { geo: new THREE.SphereGeometry(0.2, 7, 5), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 0.6, 0.8, 1.4) },
    { geo: new THREE.ConeGeometry(0.16, 0.3, 4), color: 0xffffff, matrix: xform(0, 0, 0.36, Math.PI / 2, 0, 0, 1, 0.3, 1) },
    { geo: new THREE.BoxGeometry(0.02, 0.18, 0.2), color: 0xfff0b0, matrix: xform(0, 0.17, 0) }
  ]);
  var jelly = combine([
    { geo: new THREE.SphereGeometry(0.35, 8, 5, 0, 6.283, 0, 1.6), color: 0xffffff },
    { geo: new THREE.CylinderGeometry(0.04, 0.02, 0.7, 4), color: 0xffffff, matrix: xform(-0.1, -0.35, 0) },
    { geo: new THREE.CylinderGeometry(0.04, 0.02, 0.7, 4), color: 0xffffff, matrix: xform(0.1, -0.35, 0.05) }
  ]);
  var bub = combine([{ geo: new THREE.SphereGeometry(0.1, 6, 4), color: 0xffffff }]);
  var jellyMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.65, depthWrite: false });
  var bubMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: fishGeo, count: 26, seed: 7 + i * 13, colors: [0xffa23f, 0xffd23f, 0x4fe0ff, 0xff6a8a, 0xffffff], area: { x: [side * 4.7, side * 5.3], y: [0.8, 5.6], z: [-140, 8] }, k: 0.6, vz: [-3.5, -1.5], face: true, wobble: 0.15, scale: [1.2, 2.2] });
    swarm({ geo: jelly, material: jellyMat, count: 8, seed: 33 + i, colors: [0xff90b0, 0xa8c0ff, 0x9af0ff], area: { x: [side * 4.7, side * 5.2], y: [1.5, 5.6], z: [-140, 8] }, k: 1, vy: [0.1, 0.35], wobble: 0.2, scale: [1.5, 2.6] });
    swarm({ geo: bub, material: bubMat, count: 26, seed: 60 + i, colors: [0xffffff], area: { x: [side * 4.6, side * 5.3], y: [0.3, 6], z: [-140, 8] }, k: 1, vy: [0.6, 1.2], wobble: 0.1, scale: [0.6, 1.6] });
  });
}

export var w_aquarium_of_tongues = { id: 'w_aquarium_of_tongues', indoor: true, bay: bay, center: center, arch: arch, extras: extras };
