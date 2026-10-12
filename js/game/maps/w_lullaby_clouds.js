/**
 * w_lullaby_clouds.js — Lullaby Clouds: a pastel sky walkway where every cloud hums a lullaby.
 *
 * The runner crosses a deck of soft cloud, with puffy rails along both edges and a sea of clouds below. Every 16 units
 * (four bays): a sleeping crescent moon cradling a baby star, a cluster of soap bubbles each whispering "hush" in a
 * different language, a humming cloud with a sleepy face and a flock of notes, and a star-lantern lamp post with
 * "good night" pennants. Overhead hang paper moons and stars. Moving: music-note bubbles drifting up, twinkling
 * stars, drifting cloud banks and a sleepy comet in a nightcap.
 */

import * as THREE from 'three';
import { box, cyl, ball, cone, ring, extrude, starShape, combine, xform, canvasTex, css, floorPanel, sideCtx, slab, mat, bulb } from '../mapkit.js';
import { animated, mover, swarm, cloudBank } from '../mapfx.js';
import { atlasTex, atlasQuad, fitText, roundRectPath } from './lullaby_clouds_atlas.js';

var PINK = 0xff90b0;
var BLUE = 0x86c4ff;
var MINT = 0x90e8c0;
var BUTTER = 0xffd96a;
var PEACH = 0xffb48a;
var PERI = 0x9fb4ff;
var PASTEL = [PINK, BLUE, MINT, BUTTER, PEACH, PERI];
var CLOUD = 0xfffaf8;
var CLOUD_PINK = 0xffd0e2;
var CLOUD_BLUE = 0xc4e0ff;
var CLOUD_MINT = 0xd0f4e4;
var CLOUD_SUN = 0xffeab4;
var SEA = [0xffffff, 0xffd0e2, 0xc4e0ff, 0xd0f4e4];
var INK = 0x5a4a6a;

var HUSH = ['Hush', 'Silencio', 'Chut', 'Pst', 'Zitto', 'Psiu', 'Stil', 'Tyst', 'Cicho', 'Тише', 'しーっ', '쉿', '嘘', 'صه', 'चुप', 'Shh'];
var NIGHT = ['Good night', 'Buenas noches', 'Bonne nuit', 'Gute Nacht', 'Buonanotte', 'Boa noite', 'Welterusten', 'God natt', 'Dobranoc', 'Спокойной ночи', 'おやすみ', '잘 자요', '晚安', 'تصبح على خير', 'शुभ रात्रि', 'Sweet dreams'];

// ---------- painted pictures ----------

function deck() {
  // 12 across, 16 along, 48 px to the unit: a soft cloud deck, pink at the centre, with puffy edging and sprinkled notes
  return canvasTex('lullaby_deck', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#8cc4ff';
    ctx.fillRect(0, 0, w, h);
    var g = ctx.createLinearGradient(24, 0, w - 24, 0);
    g.addColorStop(0, '#ffc2da'); g.addColorStop(0.5, '#ffdcea'); g.addColorStop(1, '#ffc2da');
    ctx.fillStyle = g;
    ctx.fillRect(22, 0, w - 44, h);
    // puffy edge
    ctx.fillStyle = '#ffffff';
    for (var y = 0; y < h; y += 48) {
      ctx.beginPath(); ctx.arc(22, y + 24, 26, 0, 6.283); ctx.arc(w - 22, y + 24, 26, 0, 6.283); ctx.fill();
    }
    // soft cloud puffs on the deck in three pastels (they tile: positions repeat inside the 768 px period)
    var tints = ['rgba(255,255,255,0.8)', 'rgba(150,205,255,0.55)', 'rgba(255,225,150,0.6)'];
    for (var i = 0; i < 26; i++) {
      var px = 50 + ((i * 97) % (w - 100));
      var py = (i * 151) % h;
      ctx.fillStyle = tints[i % 3];
      [[0, 0, 30], [28, 6, 22], [-28, 8, 20]].forEach(function (b) {
        ctx.beginPath(); ctx.ellipse(px + b[0], py + b[1], b[2], b[2] * 0.7, 0, 0, 6.283); ctx.fill();
      });
    }
    // notes and stars, a lullaby scribbled on the cloud
    for (var n = 0; n < 16; n++) {
      var nx = 60 + ((n * 131 + 40) % (w - 120));
      var ny = (n * 83 + 20) % h;
      ctx.fillStyle = ['#e8507c', '#4f94f0', '#f0a010', '#2fb888'][n % 4];
      ctx.beginPath(); ctx.ellipse(nx, ny, 12, 8.5, -0.4, 0, 6.283); ctx.fill();
      ctx.fillRect(nx + 8, ny - 34, 4, 34);
      if (n % 2) { ctx.beginPath(); ctx.moveTo(nx + 9, ny - 26); ctx.quadraticCurveTo(nx + 22, ny - 20, nx + 18, ny - 8); ctx.lineTo(nx + 15, ny - 10); ctx.quadraticCurveTo(nx + 18, ny - 18, nx + 9, ny - 20); ctx.fill(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    [-1.5, 1.5].forEach(function (lx) { ctx.fillRect(w / 2 + lx * 48 - 2, 0, 4, h); });
  });
}

function hushAtlas() {
  // 4 x 4 speech bubbles, each with "hush" in one of fifteen languages
  return atlasTex('lullaby_hush', 4, 4, 256, 128, function (ctx, i, w, h) {
    var fills = ['#ffffff', '#fff3d6', '#e6f3ff', '#ffe6ef'];
    ctx.fillStyle = fills[i % 4];
    roundRectPath(ctx, 6, 6, w - 12, h - 34, 34);
    ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#7b6a9a'; ctx.stroke();
    ctx.fillStyle = fills[i % 4];
    ctx.beginPath(); ctx.moveTo(46, h - 30); ctx.lineTo(34, h - 4); ctx.lineTo(82, h - 30); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(46, h - 32); ctx.lineTo(34, h - 4); ctx.lineTo(80, h - 32); ctx.stroke();
    ctx.fillStyle = fills[i % 4]; ctx.fillRect(48, h - 36, 30, 8);
    fitText(ctx, HUSH[i], w / 2, (h - 28) / 2 + 8, w - 60, 64, '#5a3f7a');
  });
}

function nightAtlas() {
  // 4 x 4 pennants, each saying "good night" in one language
  return atlasTex('lullaby_night', 4, 4, 256, 128, function (ctx, i, w, h) {
    var fills = ['#ffd6e4', '#d2e8ff', '#ffefb8', '#cdf3e0'];
    ctx.fillStyle = fills[i % 4];
    ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(w - 4, 6); ctx.lineTo(w - 4, h - 44); ctx.lineTo(w / 2, h - 6); ctx.lineTo(4, h - 44); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    fitText(ctx, NIGHT[i], w / 2, 44, w - 36, 46, '#4a3a6a');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(w / 2, h - 40, 7, 0, 6.283); ctx.fill();
  });
}

// ---------- small pieces ----------

var _tint = new THREE.Color();
/** A colour moved toward white (t > 0) or toward a deeper tone (t < 0). */
function shade(hex, t) {
  _tint.set(hex);
  if (t > 0) _tint.lerp(new THREE.Color(0xffffff), t); else _tint.multiplyScalar(1 + t);
  return _tint.getHex();
}

/** One soft puff of a cloud: unlit paper-cut colour, so it never turns grey in shade. */
function puff(g, r, color, x, y, z, o) {
  return ball(g, r, color, x, y, z, Object.assign({ seg: 7, bulb: true }, o || {}));
}

/** A puffy cloud: overlapping flat-coloured puffs in three tones, long in z. */
function cloudBlob(g, x, y, z, s, color, stretch) {
  var c = color || CLOUD;
  var st = stretch || 1;
  puff(g, 1.0 * s, shade(c, -0.07), x, y, z, { sy: 0.75, sz: st });
  puff(g, 0.78 * s, c, x, y - 0.08 * s, z + 1.1 * s * st, { sy: 0.75, seg: 6 });
  puff(g, 0.78 * s, shade(c, -0.04), x, y - 0.08 * s, z - 1.1 * s * st, { sy: 0.75, seg: 6 });
  puff(g, 0.6 * s, shade(c, 0.5), x + 0.1 * s, y + 0.55 * s, z + 0.3 * s, { sy: 0.8, seg: 6 });
}

/** A quarter note made of a ball, a stem and a flag. Faces +z (turn it with ry). */
function note(g, x, y, z, s, color, ry) {
  var o = { ry: ry || 0 };
  var c = Math.cos(ry || 0);
  var sn = Math.sin(ry || 0);
  function at(dx, dy) { return [x + dx * c, y + dy, z - dx * sn]; }
  var h = at(0, 0);
  ball(g, 0.17 * s, color, h[0], h[1], h[2], { seg: 6, sx: 1.25, sy: 0.9, sz: 0.5, rz: 0.4, ry: ry || 0 });
  var st = at(0.18 * s, 0.34 * s);
  box(g, 0.05 * s, 0.7 * s, 0.07 * s, color, st[0], st[1], st[2], o);
  var fl = at(0.31 * s, 0.62 * s);
  box(g, 0.28 * s, 0.1 * s, 0.07 * s, color, fl[0], fl[1], fl[2], { ry: ry || 0, rz: -0.55 });
}

function crescentShape() {
  // a crescent opening toward +x
  var d = 0.5;
  var r = 0.8;
  var x = (1 - r * r + d * d) / (2 * d);
  var y = Math.sqrt(1 - x * x);
  var phi = Math.atan2(y, x);
  var psi = Math.atan2(y, x - d);
  var s = new THREE.Shape();
  s.absarc(0, 0, 1, phi, Math.PI * 2 - phi, false);
  s.absarc(d, 0, r, Math.PI * 2 - psi, psi, true);
  return s;
}

var _crescent = null;
function crescent() { return _crescent || (_crescent = crescentShape()); }

function yaw(S, a) { return S.turn + S.side * (a || 0); }

/** A sleepy face on a round thing (closed eyes, a blush, a round humming mouth), facing the track. */
function sleepyFace(g, S, x, y, z, s) {
  var ry = yaw(S, 0.35);
  var c = Math.cos(ry);
  var sn = Math.sin(ry);
  function at(dx, dy, dz) { return [x + dx * c + dz * sn, y + dy, z - dx * sn + dz * c]; }
  [-0.32, 0.32].forEach(function (dx) {
    var p = at(dx * s, 0.1 * s, 0);
    ring(g, 0.13 * s, 0.028 * s, INK, p[0], p[1], p[2], { arc: Math.PI, rz: Math.PI, ry: ry, seg: 8, tube: 4 });
    var b = at(dx * 1.55 * s, -0.22 * s, 0);
    ball(g, 0.11 * s, PINK, b[0], b[1], b[2], { seg: 6, sz: 0.3, ry: ry });
  });
  var m = at(0, -0.22 * s, 0.02 * s);
  ball(g, 0.075 * s, 0xc4546e, m[0], m[1], m[2], { seg: 6, sz: 0.4, ry: ry });
}

// ---------- the four scenes ----------

function moonScene(g, S, z) {
  cloudBlob(g, S.out(2.2), 0.1, z, 1.5, CLOUD_PINK, 1.2);
  var mx = S.out(3.2);
  var my = 4.2;
  var ry = yaw(S, 0.3);
  // the moon: a crescent lying like a cradle, with a baby star asleep in it
  extrude(g, crescent(), 0.35, 0xffe27a, mx, my, z, { ry: ry, rz: Math.PI / 2 + S.side * 0.3, curve: 14, mat: mat(0xffe27a, { e: 0xffc84a, ei: 0.35, r: 0.5 }) }).scale.setScalar(1.6);
  var sx = mx - S.side * 0.1;
  ball(g, 0.28, 0xfff0a0, sx, my + 0.15, z, { seg: 8, bulb: true });
  extrude(g, starShape(0.34, 0.16, 5), 0.1, 0xffffff, sx, my + 0.55, z, { ry: ry, bulb: true });
  cone(g, 0.2, 0.5, PINK, sx, my + 0.5, z + 0.1, { seg: 6, rz: -S.side * 0.5 });
  // hanging stars on strings from the moon tips
  [[-1.5, 0.3], [-0.5, 1.0], [1.3, 0.1]].forEach(function (p, i) {
    var zz = z + p[0] * 1.15;
    var yy = 5.4 - p[1];
    cyl(g, 0.012, 0.012, 1.6 - p[1] * 0.4, 0xb4a4c8, mx, yy + 0.4, zz, { seg: 3 });
    extrude(g, starShape(0.26, 0.12, 5), 0.07, [BUTTER, PINK, BLUE][i], mx, yy - 0.2, zz, { ry: ry, bulb: true });
  });
}

function hushBubbles(g, S, z) {
  var bubbleMat = mat(0xcfe8ff, { op: 0.3, r: 0.15, env: 0.9 });
  var spec = [
    [0.1, 5.1, 1.0, -1.2, 0], [0.8, 3.3, 0.8, 0.5, 1], [0.1, 2.5, 0.72, -0.1, 2], [1.4, 4.3, 0.85, 1.4, 3], [0.7, 1.5, 0.7, -1.4, 4]
  ];
  var base = S.k * 4;
  spec.forEach(function (b, i) {
    var x = S.out(b[0]) - S.side * 0.2;
    var y = b[1] - 0.3;
    var zz = z + b[3] * 0.9;
    ball(g, b[2], 0xcfe8ff, x, y, zz, { seg: 10, mat: bubbleMat });
    ball(g, b[2] * 0.2, 0xffffff, x - S.side * 0.1, y + b[2] * 0.55, zz - S.side * -0.1, { seg: 5, sx: 1.5, bulb: true });
    atlasQuad(g, hushAtlas(), 4, 4, (base + i * 3) % 16, b[2] * 1.3, b[2] * 0.65, x - S.side * (b[2] * 0.62), y, zz, { ry: yaw(S, 0.4) });
  });
  cloudBlob(g, S.out(2.0), 0.0, z, 1.5, CLOUD_BLUE, 1.3);
}

function singingCloud(g, S, z) {
  var cx = S.out(1.2);
  var cy = 1.5;
  var s = 1.25;
  var tint = CLOUD;
  puff(g, 1.05 * s, tint, cx, cy, z, { seg: 9, sy: 0.9 });
  puff(g, 0.7 * s, shade(tint, -0.05), cx, cy - 0.25 * s, z + 1.2 * s, { sy: 0.85 });
  puff(g, 0.7 * s, shade(tint, -0.05), cx, cy - 0.25 * s, z - 1.2 * s, { sy: 0.85 });
  puff(g, 0.6 * s, shade(tint, -0.1), cx, cy + 0.75 * s, z - 0.3 * s, { sy: 0.9 });
  cloudBlob(g, S.out(3.6), -0.2, z, 2.0, CLOUD_PINK, 1.2);
  // the face, on the side that looks at the track
  sleepyFace(g, S, cx - S.side * 1.34, cy + 0.15, z + 0.1, 1.5);
  // notes floating up out of its mouth
  [[0.0, 2.8, PINK, 0.0], [-0.55, 3.6, BLUE, 0.2], [0.7, 3.9, BUTTER, -0.2], [-0.2, 4.8, MINT, 0.1], [0.9, 2.9, PERI, 0.0]].forEach(function (n, i) {
    note(g, S.out(0.15 + (i % 3) * 0.5) - S.side * 0.1, n[1], z + n[0] * 1.6, 1.3, n[2], yaw(S, 0.4));
  });
}

function lampAndPennants(g, S, z) {
  var x = S.in(0.5);
  var post = 0xffffff;
  [-1.6, 1.6].forEach(function (dz, i) {
    cyl(g, 0.07, 0.1, 3.4, post, x, 1.7, z + dz, { seg: 6 });
    ball(g, 0.14, 0xffd96a, x, 3.45, z + dz, { seg: 6 });
  });
  // a star lantern on the first post
  extrude(g, starShape(0.5, 0.24, 5), 0.18, 0xffe27a, x, 3.95, z - 1.6, { ry: yaw(S, 0.2), bulb: true });
  // a cord, pennants hung from it, one per language
  var base = S.k * 4 + 2;
  for (var f = 0; f < 3; f++) {
    var t = (f + 0.5) / 3;
    var zz = z - 1.6 + t * 3.2;
    var sag = -Math.sin(t * Math.PI) * 0.3;
    atlasQuad(g, nightAtlas(), 4, 4, (base + f * 5) % 16, 1.3, 0.65, x, 2.85 + sag - 0.1, zz, { ry: yaw(S, 0.4) });
  }
  cyl(g, 0.012, 0.012, 3.3, 0x9a8aae, x, 3.15, z, { rx: Math.PI / 2, seg: 3 });
  // a heap of pillows with a sleepy teddy
  var px = S.in(0.8);
  ball(g, 0.5, PINK, px, 0.28, z + 0.0, { seg: 8, sy: 0.5, sx: 1.2, sz: 1.5 });
  ball(g, 0.45, BLUE, px, 0.6, z + 0.15, { seg: 8, sy: 0.45, sx: 1.1, sz: 1.3, ry: 0.4 });
  ball(g, 0.35, BUTTER, px, 0.9, z - 0.1, { seg: 8, sy: 0.5, sx: 1.1, sz: 1.2, ry: -0.3 });
  ball(g, 0.2, 0xd8a070, px, 1.22, z - 0.1, { seg: 7 });
  ball(g, 0.14, 0xd8a070, px, 1.5, z - 0.1, { seg: 6 });
  ball(g, 0.06, 0xd8a070, px, 1.62, z - 0.2, { seg: 4 });
  ball(g, 0.06, 0xd8a070, px, 1.62, z, { seg: 4 });
  cloudBlob(g, S.out(1.5), 0.0, z, 1.4, CLOUD_PINK, 1.2);
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  S.k = k;
  // a soft rail of cloud puffs along the edge of the walkway, and a sea of cloud below it
  for (var i = 0; i < 4; i++) puff(g, 0.42, [CLOUD, CLOUD_PINK, CLOUD_BLUE, CLOUD_SUN][(i + k) % 4], S.in(0.0) + side * 0.1, 0.32, z - 1.5 + i, { seg: 6, sy: 0.85, sz: 1.35 });
  if (k % 2 === 0) cloudBlob(g, S.out(1.2), -0.5, z + (k ? 0.5 : -0.5), 1.3, k ? CLOUD_SUN : CLOUD_MINT, 1.4);
  cloudBlob(g, S.out(5.5 + k), -0.5, z, 2.6, SEA[(k + 1) % 4], 1.2);
  if (k === 0) moonScene(g, S, z);
  else if (k === 1) hushBubbles(g, S, z);
  else if (k === 2) singingCloud(g, S, z);
  else lampAndPennants(g, S, z);
}

function center(g, z) { floorPanel(g, deck(), z, 12); }

function arch(g, z, i) {
  // strings of paper moons and stars hung high across the sky
  var y0 = 6.6;
  for (var f = 0; f < 11; f++) {
    var t = f / 10;
    var x = -5.2 + t * 10.4;
    var y = y0 - Math.sin(t * Math.PI) * 0.5;
    var c = PASTEL[(f + i) % PASTEL.length];
    cyl(g, 0.01, 0.01, 0.5 + (f % 3) * 0.25, 0xb4a4c8, x, y - 0.2, z, { seg: 3 });
    if (f % 3 === 0) extrude(g, crescent(), 0.06, BUTTER, x, y - 0.8, z, { rz: Math.PI / 2 + 0.2, bulb: true }).scale.setScalar(0.3);
    else if (f % 3 === 1) extrude(g, starShape(0.2, 0.09, 5), 0.05, c, x, y - 0.55, z, { bulb: true });
    else ball(g, 0.1, c, x, y - 0.55, z, { seg: 5, bulb: true });
  }
  cyl(g, 0.012, 0.012, 10.6, 0x9a8aae, 0, y0 + 0.05, z, { rz: Math.PI / 2, seg: 3 });
  // a big crescent mobile at each side
  [-1, 1].forEach(function (s) {
    cyl(g, 0.012, 0.012, 1.2, 0xb4a4c8, s * 5.0, y0 - 0.5, z, { seg: 3 });
    extrude(g, crescent(), 0.08, 0xffe27a, s * 5.0, y0 - 1.5, z, { rz: Math.PI / 2 - s * 0.25, bulb: true }).scale.setScalar(0.65);
  });
}

function ground(g) {
  slab(g, 400, 400, 0xffeef4, 0, -0.02, -190, { r: 1 });
}

// ---------- the things that move ----------

function noteBubbleGeo() {
  var parts = [{ geo: new THREE.SphereGeometry(0.34, 9, 7), color: 0xffffff }];
  var ink = 0x7a5a8a;
  parts.push({ geo: new THREE.SphereGeometry(0.1, 6, 5), color: ink, matrix: xform(-0.06, -0.12, 0, 0, 0, 0, 1.3, 0.9, 0.5) });
  parts.push({ geo: new THREE.BoxGeometry(0.03, 0.3, 0.03), color: ink, matrix: xform(0.04, 0.03, 0) });
  parts.push({ geo: new THREE.BoxGeometry(0.12, 0.04, 0.03), color: ink, matrix: xform(0.1, 0.16, 0, 0, 0, -0.5) });
  return combine(parts);
}

function makeComet() {
  var c = new THREE.Group();
  var gold = mat(0xffd96a, { e: 0xffc23a, ei: 0.4 });
  ball(c, 0.55, 0xffd96a, 0, 0, 0, { seg: 10, mat: gold });
  // a tail of fading puffs trailing behind (+z)
  [[0.75, 0.46, 0xffe7a0], [1.4, 0.38, 0xffeab8], [2.0, 0.3, 0xffd6e4], [2.5, 0.22, 0xe2f0ff], [2.9, 0.15, 0xffffff]].forEach(function (p) {
    ball(c, p[1], p[2], 0.0, 0.1 - p[0] * 0.04, p[0] + 0.4, { seg: 7, bulb: true });
  });
  // a nightcap with a pom-pom, and closed eyes on the side that faces the track
  cone(c, 0.38, 0.8, PINK, 0.0, 0.62, 0.15, { seg: 8, rz: -0.35 });
  ball(c, 0.12, 0xffffff, -0.28, 0.98, 0.15, { seg: 6 });
  [-0.2, 0.2].forEach(function (dz) {
    ring(c, 0.1, 0.025, INK, 0.5, 0.05, dz, { arc: Math.PI, rz: Math.PI, ry: Math.PI / 2, seg: 8, tube: 4 });
  });
  ball(c, 0.07, 0xc4546e, 0.54, -0.18, 0.0, { seg: 5, sx: 0.4 });
  c.position.set(-13, 9, -70);
  c.scale.setScalar(1.5);
  return animated(c);
}

function extras() {
  // a soft sea of cloud far below on both sides, and bigger banks high up
  [[-45, -9], [9, 45]].forEach(function (xr, i) {
    cloudBank(14, { seed: 21 + i, area: { x: xr, y: [-1.6, 0.4], z: [-150, 10] }, k: 1, scale: [3.5, 6.5], vx: [0, 0], colors: [0xffffff, 0xffe9f2, 0xe8f2ff] });
  });
  cloudBank(14, { seed: 11, area: { x: [-70, 70], y: [12, 30], z: [-150, 10] }, k: 0.12, scale: [3, 6], colors: [0xffffff, 0xffe9f2, 0xe8f2ff] });
  // twinkling stars
  var star = combine([{ geo: new THREE.OctahedronGeometry(0.22, 0), color: 0xffffff }]);
  swarm({ geo: star, material: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }), count: 40, seed: 17, colors: [0xfff0a0, 0xffd6ec, 0xc8e4ff], area: { x: [-40, 40], y: [8, 24], z: [-140, 8] }, k: 0.2, wobble: 0.4, turn: 1.2, scale: [0.6, 1.4] });
  // music-note bubbles drifting up beside the walkway
  var nb = noteBubbleGeo();
  var nbMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: nb, material: nbMat, count: 14, seed: 80 + i * 9, colors: [0xcfe8ff, 0xffd6e4, 0xfff0b8, 0xd2f5e4], area: { x: [side * 4.7, side * 8], y: [0.8, 6], z: [-135, 8] }, k: 1, vy: [0.3, 0.6], wobble: 0.25, scale: [0.9, 1.7] });
  });
  var comet = makeComet();
  mover(comet, { k: 0.3, vz: -2.5, near: 14, far: -150 });
}

export var w_lullaby_clouds = { id: 'w_lullaby_clouds', indoor: false, bay: bay, center: center, arch: arch, ground: ground, extras: extras };
