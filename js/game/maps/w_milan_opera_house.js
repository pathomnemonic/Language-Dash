/**
 * w_milan_opera_house.js — Milan Opera House (skin 'Surgical Theater': the key is kept, the scene is new): the auditorium
 * of a La Scala-style house, seen from the red carpet.
 *
 * Each wall is a horseshoe of gilded balcony boxes over a wainscot of red velvet, with a marquee of chasing bulbs along
 * every balcony front. At floor level, in turn: tied-back velvet curtains under a "Benvenuto" banner, a row of velvet
 * seats, the Golden Quill trophy on a pedestal in a spotlight, and a ticket booth with showbills (Ciao, Grazie, Prego).
 * Chandeliers hang over the carpet, spotlight beams sweep the walls, gold sparkles and music notes drift.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, quad, extrude, combine, xform, mat, bulb, canvasTex, css,
  floorPanel, ceilingPanel, wallPanel, sideCtx
} from '../mapkit.js';
import { swarm, shimmer, features, sway } from '../mapfx.js';
import { sparkleGeo, glowMat } from './cartoon.js';

var H = 6.4;
var VELVET = 0xc4163a;
var DEEP = 0x9a1030;
var GOLD = 0xffc83d;
var CREAM = 0xfff1d6;
var SERIF = '"Georgia","Times New Roman",serif';

// ---------- painted pictures ----------

function wallPicture() {
  // 16 units, 6.4 high, 64px to the unit. Pilasters every 4 units (at the bay edges).
  return canvasTex('milan_wall', 1024, 410, function (ctx, w, h) {
    // wallpaper: cream damask above, red velvet wainscot below
    ctx.fillStyle = '#f7dfae'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(214,160,60,0.35)';
    for (var i = 0; i < 32; i++) for (var j = 0; j < 7; j++) {
      var x = i * 32 + (j % 2) * 16 + 16, y = j * 40 + 22;
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.quadraticCurveTo(x + 9, y, x, y + 12); ctx.quadraticCurveTo(x - 9, y, x, y - 12); ctx.fill();
    }
    // arched boxes (bays are 256px; box opening 170 wide) between y 52 and 200
    for (var b = 0; b < 4; b++) {
      var cx = b * 256 + 128;
      var top = 40, bottom = 215;
      ctx.fillStyle = '#e0a52e';
      ctx.beginPath(); ctx.moveTo(cx - 92, bottom); ctx.lineTo(cx - 92, top + 70); ctx.arc(cx, top + 70, 92, Math.PI, 0); ctx.lineTo(cx + 92, bottom); ctx.fill();
      var g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, '#7a0c26'); g.addColorStop(1, '#c4163a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(cx - 82, bottom); ctx.lineTo(cx - 82, top + 70); ctx.arc(cx, top + 70, 82, Math.PI, 0); ctx.lineTo(cx + 82, bottom); ctx.fill();
      // guests in the box: heads and shoulders
      var cols = ['#ffd23f', '#3fb6a8', '#ff8fb0', '#f4f0e0'];
      for (var p = 0; p < 3; p++) {
        var px = cx - 44 + p * 44;
        ctx.fillStyle = cols[(b + p) % 4]; ctx.beginPath(); ctx.ellipse(px, bottom - 6, 20, 24, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = ['#f2c9a0', '#c98a52', '#8a5a3a', '#f2c9a0'][(b * 2 + p) % 4]; ctx.beginPath(); ctx.arc(px, bottom - 36, 13, 0, Math.PI * 2); ctx.fill();
      }
      // a gold scallop above
      ctx.fillStyle = '#ffc83d'; for (var s = 0; s < 6; s++) { ctx.beginPath(); ctx.arc(cx - 75 + s * 30, 30, 16, 0, Math.PI); ctx.fill(); }
    }
    // gold cornice
    ctx.fillStyle = '#ffc83d'; ctx.fillRect(0, 0, w, 16);
    ctx.fillStyle = '#c98a1a'; ctx.fillRect(0, 16, w, 4);
    // wainscot
    ctx.fillStyle = '#9a1030'; ctx.fillRect(0, 262, w, h - 262);
    ctx.fillStyle = '#ffc83d'; ctx.fillRect(0, 258, w, 8);
    for (var q = 0; q < 8; q++) {
      var qx = q * 128 + 14;
      ctx.fillStyle = '#c4163a'; ctx.fillRect(qx, 282, 100, 110);
      ctx.strokeStyle = '#ffc83d'; ctx.lineWidth = 5; ctx.strokeRect(qx, 282, 100, 110);
    }
    // gold pilasters on the bay edges
    for (var k = 0; k < 4; k++) {
      var gx = k * 256;
      [[gx - 14, 28], [gx, 28]].forEach(function () {});
      ctx.fillStyle = '#ffc83d'; ctx.fillRect(gx - 14, 16, 28, h - 16);
      ctx.fillStyle = '#e3a52a'; ctx.fillRect(gx - 14, 16, 5, h - 16); ctx.fillRect(gx + 9, 16, 5, h - 16);
      ctx.fillStyle = '#fff0a0'; ctx.fillRect(gx - 3, 30, 6, h - 60);
    }
    // the picture wraps: the half-pilaster at x=0 is drawn again at the right edge
    ctx.fillStyle = '#ffc83d'; ctx.fillRect(w - 14, 16, 14, h - 16);
  });
}

function floorPicture() {
  // red carpet with a gold border and a chain of gold diamonds. 12 across, 16 along, 48px/unit
  return canvasTex('milan_floor', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#4a2a1c'; ctx.fillRect(0, 0, w, h); // dark wood edges
    ctx.fillStyle = '#b3122f'; ctx.fillRect(24, 0, w - 48, h);
    ctx.fillStyle = '#e0264d';
    for (var y = 0; y < h; y += 16) for (var x = 24; x < w - 24; x += 16) if (((x + y) / 16) % 2 === 0) ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#ffc83d'; ctx.fillRect(24, 0, 10, h); ctx.fillRect(w - 34, 0, 10, h);
    ctx.fillStyle = '#7a0c26'; ctx.fillRect(40, 0, 4, h); ctx.fillRect(w - 44, 0, 4, h);
    // diamonds along the middle, one every 96px
    for (var d = 0; d < 8; d++) {
      var cy = d * 96 + 48;
      ctx.fillStyle = '#ffc83d';
      ctx.beginPath(); ctx.moveTo(w / 2, cy - 40); ctx.lineTo(w / 2 + 28, cy); ctx.lineTo(w / 2, cy + 40); ctx.lineTo(w / 2 - 28, cy); ctx.fill();
      ctx.fillStyle = '#9a1030';
      ctx.beginPath(); ctx.moveTo(w / 2, cy - 26); ctx.lineTo(w / 2 + 17, cy); ctx.lineTo(w / 2, cy + 26); ctx.lineTo(w / 2 - 17, cy); ctx.fill();
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(w / 2, cy, 5, 0, Math.PI * 2); ctx.fill();
      // little stars either side
      [-1, 1].forEach(function (s) { ctx.fillStyle = '#ffd966'; ctx.beginPath(); ctx.arc(w / 2 + s * 120, cy, 7, 0, Math.PI * 2); ctx.fill(); });
    }
  });
}

function ceilingPicture() {
  // an ivory ceiling with gold coffers and a painted sky in the middle
  return canvasTex('milan_ceiling', 464, 640, function (ctx, w, h) {
    ctx.fillStyle = '#fff1d6'; ctx.fillRect(0, 0, w, h);
    var sky = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, 260);
    sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, '#fff1d6');
    for (var r = 0; r < 4; r++) {
      var y0 = r * 160;
      ctx.fillStyle = '#ffc83d'; ctx.fillRect(0, y0, w, 8);
      ctx.fillStyle = r % 2 ? '#f6dfae' : '#ffe9bd'; ctx.fillRect(14, y0 + 14, w - 28, 132);
      ctx.strokeStyle = '#e3a52a'; ctx.lineWidth = 4; ctx.strokeRect(14, y0 + 14, w - 28, 132);
      ctx.fillStyle = sky; ctx.beginPath(); ctx.ellipse(w / 2, y0 + 80, 150, 54, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w / 2 - 40, y0 + 80, 18, 0, 7); ctx.arc(w / 2 - 14, y0 + 72, 22, 0, 7); ctx.arc(w / 2 + 24, y0 + 82, 16, 0, 7); ctx.fill();
    }
  });
}

/** A strip of bulbs on the balcony fronts; the two strips take turns so the light chases. */
function bulbTex(offset) {
  return canvasTex('milan_bulbs' + offset, 512, 40, function (ctx, w, h) {
    ctx.fillStyle = 'rgba(120,70,10,0.9)'; ctx.fillRect(0, h / 2 - 2, w, 4);
    for (var i = 0; i < 16; i++) {
      if (i % 2 !== offset) continue;
      var x = (i + 0.5) * (w / 16);
      var halo = ctx.createRadialGradient(x, h / 2, 1, x, h / 2, 17);
      halo.addColorStop(0, 'rgba(255,255,255,1)'); halo.addColorStop(0.4, '#ffe27a'); halo.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, h / 2, 17, 0, Math.PI * 2); ctx.fill();
    }
  });
}

/** The balcony front: gold scrolls and a velvet rail, painted. 4 x 0.9 */
function balconyTex() {
  return canvasTex('milan_balcony', 512, 112, function (ctx, w, h) {
    ctx.fillStyle = '#e3a52a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c4163a'; ctx.fillRect(0, 0, w, 22);
    ctx.fillStyle = '#ffc83d'; ctx.fillRect(0, 22, w, 8);
    for (var i = 0; i < 16; i++) {
      var x = i * 32 + 16;
      ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x - 8, 62, 12, Math.PI * 1.5, Math.PI * 3.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 8, 78, 12, Math.PI * 0.5, Math.PI * 2.2); ctx.stroke();
    }
    ctx.fillStyle = '#9b6a12'; ctx.fillRect(0, h - 10, w, 10);
  });
}

function curtainTex() {
  // two tied-back velvet curtains with a gold pelmet; alpha elsewhere. 3.6 x 3.4
  return canvasTex('milan_curtain', 288, 272, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    function drape(x0, x1, tieY, flip) {
      var g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#8f0e2c'); g.addColorStop(0.3, '#e0264d'); g.addColorStop(0.55, '#a8122e'); g.addColorStop(0.8, '#e0264d'); g.addColorStop(1, '#8f0e2c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, 34);
      ctx.lineTo(x1, 34);
      var inner = flip ? x0 : x1;
      ctx.lineTo(x1, h - 10); ctx.lineTo(x0, h - 10);
      ctx.fill();
      // pinch at the tie
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.moveTo(x0, tieY); ctx.quadraticCurveTo((x0 + x1) / 2, tieY + 18, x1, tieY); ctx.lineTo(x1, tieY - 10); ctx.lineTo(x0, tieY - 10); ctx.fill();
      ctx.strokeStyle = '#ffc83d'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x0, tieY); ctx.quadraticCurveTo((x0 + x1) / 2, tieY + 14, x1, tieY); ctx.stroke();
      void inner;
    }
    drape(0, 112, 170, false);
    drape(176, 288, 170, true);
    // pelmet with fringe
    ctx.fillStyle = '#e0264d'; ctx.fillRect(0, 0, w, 34);
    ctx.fillStyle = '#ffc83d'; ctx.fillRect(0, 30, w, 8);
    for (var t = 0; t < 24; t++) { ctx.fillStyle = '#ffc83d'; ctx.fillRect(t * 12 + 2, 38, 5, 14); }
    // tassels
    [[56, 188], [232, 188]].forEach(function (p) { ctx.fillStyle = '#ffc83d'; ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(p[0] - 5, p[1], 10, 28); });
  });
}

function plateTex(name, text, sub, bg, fg, border) {
  return canvasTex('milan_plate_' + name, 320, 128, function (ctx, w, h) {
    ctx.fillStyle = css(border); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(2, 2, w - 4, h - 4, 18); else ctx.rect(2, 2, w - 4, h - 4); ctx.fill();
    ctx.fillStyle = css(bg); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(10, 10, w - 20, h - 20, 12); else ctx.rect(10, 10, w - 20, h - 20); ctx.fill();
    ctx.fillStyle = css(fg); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 700 ' + (sub ? 50 : 56) + 'px ' + SERIF;
    ctx.fillText(text, w / 2, sub ? h * 0.42 : h / 2 + 2);
    if (sub) { ctx.font = '700 24px "Trebuchet MS",Arial,sans-serif'; ctx.fillText(sub, w / 2, h * 0.78); }
  });
}

function posterTex(name, word, meaning, c1) {
  return canvasTex('milan_poster_' + name, 160, 224, function (ctx, w, h) {
    ctx.fillStyle = '#ffe9bd'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css(c1); ctx.fillRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#fff1d6'; ctx.beginPath(); ctx.arc(w / 2, 82, 44, 0, Math.PI * 2); ctx.fill();
    // a speech bubble with the word
    ctx.fillStyle = css(c1);
    ctx.beginPath(); ctx.moveTo(w / 2 - 14, 112); ctx.lineTo(w / 2 - 28, 134); ctx.lineTo(w / 2 + 4, 116); ctx.fill();
    ctx.fillStyle = '#9a1030'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 700 30px ' + SERIF; ctx.fillText(word, w / 2, 82);
    ctx.fillStyle = '#fff1d6'; ctx.font = '700 17px "Trebuchet MS",Arial,sans-serif'; ctx.fillText('OPERA DELLE PAROLE', w / 2, 168);
    ctx.font = 'italic 600 20px ' + SERIF; ctx.fillText(meaning, w / 2, 196);
  });
}

// ---------- materials ----------

var _decals = {};
function decalMat(tex, fallback) {
  var k = tex ? tex.uuid : 'x' + fallback;
  return _decals[k] || (_decals[k] = new THREE.MeshBasicMaterial({ color: tex ? 0xffffff : fallback, map: tex || null, alphaTest: 0.4, side: THREE.DoubleSide }));
}
function decal(g, tex, fallback, w, h, x, y, z, yaw) {
  return quad(g, w, h, 0xffffff, x, y, z, { mat: decalMat(tex, fallback), ry: yaw || 0 });
}

var _strips = {};
function bulbStripMat(n) {
  if (_strips[n]) return _strips[n];
  var tex = bulbTex(n);
  return (_strips[n] = bulb(tex ? 0xffffff : 0xffe27a, { map: tex || null, op: 0.99, side: THREE.DoubleSide }));
}

var _beam = null;
function beamMat() {
  return _beam || (_beam = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
}

var _quillShape = null;
function quillShape() {
  if (_quillShape) return _quillShape;
  var s = new THREE.Shape();
  s.moveTo(0, -0.55);
  s.lineTo(0.03, -0.3);
  s.bezierCurveTo(0.34, -0.1, 0.34, 0.45, 0.04, 0.62);
  s.bezierCurveTo(0.1, 0.4, -0.02, 0.3, -0.1, 0.1);
  s.bezierCurveTo(-0.2, -0.05, -0.1, -0.2, -0.03, -0.3);
  s.closePath();
  return (_quillShape = s);
}

// ---------- the house, one bay on one side ----------

function balcony(g, S, z) {
  // the gilded front of the boxes, bulging out over the stalls, with its chasing bulbs and a post at the bay edge
  var x = S.in(0.5);
  box(g, 0.7, 0.9, 4, 0xffffff, x, 3.2, z, { r: 0.5, m: 0.15 });
  quad(g, 4, 0.9, 0xffffff, x - S.side * 0.351, 3.2, z, { map: balconyTex(), ry: S.turn, r: 0.5 });
  box(g, 0.8, 0.12, 4, VELVET, x, 3.71, z, { r: 0.8 });
  // marquee bulbs under the rail, two strips taking turns
  [0, 1].forEach(function (n) { quad(g, 4, 0.3, 0xffffff, x - S.side * 0.36, 2.62, z, { mat: bulbStripMat(n), ry: S.turn }); });
  // gilded columns holding the box fronts
  cyl(g, 0.1, 0.1, 1.9, GOLD, S.in(0.6), 1.65, z + 1.95, { seg: 6, m: 0.2 });
  ball(g, 0.16, GOLD, S.in(0.6), 2.65, z + 1.95, { seg: 5 });
}

function curtains(g, S, z) {
  decal(g, curtainTex(), VELVET, 3.6, 3.4, S.in(0.3) - S.side * 0.02, 1.7, z, S.turn);
  decal(g, plateTex('benvenuto', 'Benvenuto', 'Welcome', 0xfff1d6, 0x9a1030, 0xffc83d), CREAM, 1.9, 0.76, S.in(0.5), 4.55, z + 0.1, S.turn + S.side * 0.5);
  // two bell-pulls and a pair of pots with palms by the curtain feet
  [-1, 1].forEach(function (d) {
    cyl(g, 0.22, 0.17, 0.4, GOLD, S.in(0.55), 0.2, z + d * 1.7, { seg: 6 });
    ball(g, 0.3, 0x2fae58, S.in(0.55), 0.75, z + d * 1.7, { seg: 5 });
  });
}

function seats(g, S, z) {
  // a row of velvet seats against the wall with gilded armrests, a programme tucked in each
  for (var i = 0; i < 3; i++) {
    var sz = z - 1.3 + i * 1.3;
    box(g, 0.55, 0.45, 0.9, VELVET, S.in(0.5), 0.35, sz, { r: 0.8 });
    box(g, 0.14, 0.95, 0.9, VELVET, S.in(0.15), 0.8, sz, { r: 0.8 });
    box(g, 0.1, 0.5, 0.12, GOLD, S.in(0.5), 0.55, sz - 0.5);
  }
  box(g, 0.1, 0.5, 0.12, GOLD, S.in(0.5), 0.55, z + 2.0 - 0.1 + 0.0);
  decal(g, plateTex('stalls', 'Platea', 'Stalls', 0x9a1030, 0xfff1d6, 0xffc83d), VELVET, 1.5, 0.6, S.in(0.3), 2.0, z + 0.1, S.turn);
  // a bouquet on the end of the row
  ball(g, 0.22, 0xff6f91, S.in(0.3), 0.95, z + 0.0 - 1.9, { seg: 5 });
}

function trophy(g, S, z) {
  var x = S.in(0.4);
  // a marble pedestal in a pool of light, the Golden Quill standing in its inkwell
  box(g, 0.8, 0.9, 0.8, 0xfff8ee, x, 0.45, z, { r: 0.35 });
  box(g, 0.95, 0.12, 0.95, GOLD, x, 0.96, z, { m: 0.3, r: 0.3 });
  box(g, 0.95, 0.12, 0.95, GOLD, x, 0.06, z, { m: 0.3, r: 0.3 });
  cyl(g, 0.2, 0.26, 0.28, 0x2a3a6a, x, 1.16, z, { seg: 8 });
  extrude(g, quillShape(), 0.07, GOLD, x, 2.0, z, { ry: S.turn, rz: -0.25, m: 0.4, r: 0.25, e: GOLD, ei: 0.5, curve: 4 });
  // rope posts either side
  [-1.4, 1.4].forEach(function (d) {
    cyl(g, 0.05, 0.07, 0.9, GOLD, S.in(0.8), 0.45, z + d, { seg: 5 });
    ball(g, 0.09, GOLD, S.in(0.8), 0.95, z + d, { seg: 4 });
  });
  cyl(g, 0.02, 0.02, 2.8, VELVET, S.in(0.8), 0.8, z, { rx: Math.PI / 2, seg: 3 });
  decal(g, plateTex('quill', 'Penna d’Oro', 'The Golden Quill', 0x9a1030, 0xffe27a, 0xffc83d), VELVET, 2.0, 0.8, S.in(0.5), 4.6, z + 0.1, S.turn + S.side * 0.5);
  // the spotlight cone falling on it from the balcony
  var cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.5, 8, 1, true), beamMat());
  cone1.position.set(x, 1.3, z);
  cone1.userData.noMerge = false;
  g.add(cone1);
}

function ticketBooth(g, S, z) {
  var x = S.in(0.45);
  box(g, 0.9, 1.1, 1.9, 0x6a2a1c, x, 0.55, z - 1.05);
  box(g, 1.0, 0.1, 2.0, GOLD, x, 1.15, z - 1.05);
  box(g, 0.1, 1.1, 1.6, 0x3a1a10, S.in(0.08), 1.7, z - 1.05);
  decal(g, plateTex('biglietti', 'Biglietti', 'Tickets', 0xfff1d6, 0x9a1030, 0xffc83d), CREAM, 1.7, 0.68, S.in(0.35), 2.35, z - 1.05, S.turn);
  // showbills on a stand: Ciao, Grazie, Prego
  var polls = [['ciao', 'Ciao!', 'hello', 0xe0264d], ['grazie', 'Grazie', 'thank you', 0x2fae98], ['prego', 'Prego', 'you’re welcome', 0xe08a1e]];
  polls.forEach(function (p, i) {
    decal(g, posterTex(p[0], p[1], p[2], p[3]), p[3], 0.62, 0.87, S.in(0.15), 1.55, z + 0.35 + i * 0.7, S.turn);
  });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(), side, z, H, 0.0, { r: 0.9 });
  balcony(g, S, z);
  if (k === 0) curtains(g, S, z);
  else if (k === 1) seats(g, S, z);
  else if (k === 2) trophy(g, S, z);
  else ticketBooth(g, S, z);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12);
  ceilingPanel(g, ceilingPicture(), z, 11.6, H);
}

function chandelier(g, x, y, z, s) {
  cyl(g, 0.03, 0.03, 6.4 - y, 0x7a5a20, x, (6.4 + y) / 2, z, { seg: 4 });
  cyl(g, 0.1, 0.16, 0.5, GOLD, x, y, z, { seg: 6, m: 0.3 });
  [[0.9, 0.0, 8], [0.55, -0.4, 7]].forEach(function (t) {
    var R = t[0] * s;
    var yy = y + t[1];
    var tier = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 3, 10), mat(GOLD, { m: 0.3, r: 0.3 }));
    tier.rotation.x = Math.PI / 2; tier.position.set(x, yy, z); g.add(tier);
    for (var i = 0; i < t[2]; i++) {
      var a = (i / t[2]) * Math.PI * 2;
      cyl(g, 0.035, 0.035, 0.26, 0xfff8ee, x + Math.cos(a) * R, yy + 0.16, z + Math.sin(a) * R, { seg: 4 });
      cone(g, 0.06, 0.12, 0xffe27a, x + Math.cos(a) * R, yy + 0.35, z + Math.sin(a) * R, { seg: 4, bulb: true });
    }
    for (var j = 0; j < 5; j++) {
      var b = (j / 5) * Math.PI * 2;
      cone(g, 0.05, 0.22, 0xdff4ff, x + Math.cos(b) * R, yy - 0.14, z + Math.sin(b) * R, { seg: 4, rx: Math.PI, bulb: true, op: 0.9 });
    }
  });
  ball(g, 0.14, 0xdff4ff, x, y - 0.55, z, { seg: 5, bulb: true });
}

function arch(g, z, i) {
  // a chandelier over the carpet, and a swag of velvet with gold tassels across each side
  chandelier(g, 0, 4.9, z, 1.0);
  [-1, 1].forEach(function (s, n) {
    // gold rope swag low over the boxes
    for (var f = 0; f < 5; f++) {
      var t = f / 4;
      ball(g, 0.13, GOLD, s * (5.2 - t * 1.8), 5.4 - Math.sin(t * Math.PI) * 0.35, z, { seg: 4 });
    }
    cone(g, 0.2, 0.55, GOLD, s * 3.4, 4.9, z, { seg: 5, rx: Math.PI });
    void n;
  });
  // a banner of the house across the top, the colours of Italy at the corners
  var tex = plateTex('arch' + (i % 3), ['Ciao!', 'Grazie', 'Prego'][i % 3], ['Hello', 'Thank you', 'You’re welcome'][i % 3], 0xfff1d6, 0x9a1030, 0xffc83d);
  decal(g, tex, CREAM, 1.9, 0.76, 0, 5.75, z, 0);
}

// ---------- the things that move ----------

function beam(side) {
  var outer = new THREE.Group();
  var m = new THREE.Group();
  var c = new THREE.Mesh(new THREE.ConeGeometry(1.0, 6, 10, 1, true), beamMat());
  c.rotation.z = side < 0 ? -Math.PI / 2.4 : Math.PI / 2.4;
  c.position.set(-side * 2.6, -1.2, 0);
  m.add(c);
  m.position.set(side * 4.8, 5.8, 0);
  outer.add(m);
  outer.traverse(function (o) { o.userData.noMerge = true; });
  sway(m, 'y', 0.5, 0.7, side);
  return outer;
}

function noteGeo() {
  // an eighth note: head, stem and flag
  var flag = new THREE.Shape();
  flag.moveTo(0.1, 0.3); flag.quadraticCurveTo(0.34, 0.2, 0.26, -0.02); flag.quadraticCurveTo(0.26, 0.14, 0.1, 0.16); flag.closePath();
  return combine([
    { geo: new THREE.SphereGeometry(0.1, 6, 4), color: 0xffffff, matrix: xform(0, -0.28, 0, 0, 0, 0, 1.3, 0.9, 0.5) },
    { geo: new THREE.BoxGeometry(0.035, 0.6, 0.035), color: 0xffffff, matrix: xform(0.12, 0.02, 0) },
    { geo: new THREE.ShapeGeometry(flag), color: 0xffffff, matrix: xform(0.02, 0.1, 0) }
  ]);
}

function extras() {
  [-1, 1].forEach(function (side, i) {
    features(function () { return beam(side); }, { x: 0, spacing: 64, count: 3, z0: -28 - i * 30 });
    swarm({ geo: sparkleGeo(0.2), material: glowMat(0.9), count: 12, seed: 55 + i, colors: [0xfff0a0, 0xffffff, 0xffd27a], area: { x: [side * 4.4, side * 5.2], y: [1.0, 5.8], z: [-140, 8] }, k: 1, turn: 1.4, wobble: 0.1, scale: [0.7, 1.3] });
    swarm({ geo: noteGeo(), material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), count: 8, seed: 90 + i, colors: [GOLD, 0xffffff, 0xff8fb0], area: { x: [side * 4.5, side * 5.1], y: [0.6, 4.6], z: [-140, 8] }, k: 1, vy: [0.25, 0.5], wobble: 0.2, scale: [1.2, 1.8] });
  });
  // the marquee chases: the two strips of bulbs take turns, slower than twice a second
  shimmer(bulbStripMat(0), 0.55, 0.45, 3.0, 0);
  shimmer(bulbStripMat(1), 0.55, 0.45, 3.0, Math.PI);
}

export var w_milan_opera_house = {
  id: 'w_milan_opera_house',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
