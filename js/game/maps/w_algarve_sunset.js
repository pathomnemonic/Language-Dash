/**
 * w_algarve_sunset.js — Algarve Sunset (skin 'Prescription Sunset': the key is kept, the scene is new): golden hour on a
 * Portuguese boardwalk.
 *
 * The runner follows a plank boardwalk edged with calçada waves. On the LEFT is the sea, glowing under a low sun: a
 * striped whitewashed lighthouse, a beach with striped umbrellas and a palm, a surf shack with a rack of boards, and an
 * ice-pop cart, with sailboats crossing the bay and gulls gliding. On the RIGHT is a whitewashed town: blue-shuttered
 * houses, azulejo tile panels, a cafe with an awning, terracotta eaves and bunting. Signs: Bem-vindo, Farol, Gelados,
 * Boa tarde, Obrigado.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, quad, slab, canvasTex, stripeTex, css,
  floorPanel, wallPanel, sideCtx
} from '../mapkit.js';
import { animated, mover, swarm, bob, shimmer, flow, cloudBank } from '../mapfx.js';
import { sparkleGeo, glowMat } from './cartoon.js';
import { birdGeo } from '../mapprops.js';

var SUN = 0xffd23f;
var CORAL = 0xff7a5a;
var TEAL = 0x22c9d6;
var WHITE = 0xfff8ee;
var COBALT = 0x2b62c9;
var TERRA = 0xe0703a;
var WOOD = 0xc98a52;
var POP = [0xff7a5a, 0xffc23a, TEAL, 0x7ad65a, 0xff8fa8, COBALT];
var HEX = ['#ff7a5a', '#ffc23a', '#22c9d6', '#7ad65a', '#ff8fa8', '#2b62c9'];
var ROUND = '"Arial Rounded MT Bold","Trebuchet MS",Arial,sans-serif';

// ---------- painted pictures ----------

/** The boardwalk: honey planks, a calçada wave border. 12 across, 16 along, 48px/unit. */
function deckPicture() {
  return canvasTex('alg_deck', 576, 768, function (ctx, w, h) {
    var tones = ['#e9ae68', '#dca05c', '#f0bb78', '#e3a862'];
    for (var i = 0; i < 12; i++) {
      ctx.fillStyle = tones[(i * 5) % 4]; ctx.fillRect(i * 48, 0, 48, h);
    }
    for (var i2 = 0; i2 < 12; i2++) {
      ctx.fillStyle = 'rgba(90,50,10,0.35)'; ctx.fillRect(i2 * 48, 0, 3, h);
      // butt joints, staggered
      for (var j = 0; j < 4; j++) { var y = ((i2 * 97 + j * 192) % h); ctx.fillRect(i2 * 48, y, 48, 3); }
      ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.fillRect(i2 * 48 + 6, 0, 3, h);
    }
    // calçada portuguesa borders: white stone with ink-blue waves, 1 unit wide at each side
    [0, w - 48].forEach(function (x0) {
      ctx.fillStyle = '#fff8ee'; ctx.fillRect(x0, 0, 48, h);
      ctx.strokeStyle = '#2b62c9'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (var k = 0; k < 3; k++) {
        ctx.beginPath();
        for (var y2 = 0; y2 <= h; y2 += 6) { var xx = x0 + 10 + k * 14 + Math.sin(y2 / 24 * Math.PI) * 6; if (y2 === 0) ctx.moveTo(xx, y2); else ctx.lineTo(xx, y2); }
        ctx.stroke();
      }
    });
    // a few painted shells
    ctx.fillStyle = 'rgba(255,122,90,0.55)'; for (var s = 0; s < 7; s++) { ctx.beginPath(); ctx.arc(70 + (s * 143) % 430, 60 + s * 105, 8, 0, 7); ctx.fill(); }
  });
}

function azulejo(ctx, x, y, s, variant) {
  // one blue-and-white tile with a four-petal flower and corner motifs
  ctx.fillStyle = '#fbfaf2'; ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = '#2b62c9'; ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
  ctx.fillStyle = variant % 2 ? '#2b62c9' : '#4a86e8';
  var cx = x + s / 2, cy = y + s / 2;
  for (var i = 0; i < 4; i++) {
    var a = i * Math.PI / 2 + (variant % 2 ? Math.PI / 4 : 0);
    ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * s * 0.2, cy + Math.sin(a) * s * 0.2, s * 0.17, s * 0.09, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffc23a'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b62c9';
  [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0] * s, y + p[1] * s, s * 0.05, 0, Math.PI * 2); ctx.fill(); });
}

/** The town: whitewashed houses with blue shutters, azulejo panels, a cafe, terracotta eaves. 16 x 7.5, 64px/unit. */
function townPicture() {
  return canvasTex('alg_town', 1024, 480, function (ctx, w, h) {
    var wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, '#fff3dc'); wash.addColorStop(1, '#ffe2bc');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, w, h);
    // warm glow from the low sun
    var glow = ctx.createLinearGradient(0, 0, w, 0);
    glow.addColorStop(0, 'rgba(255,170,90,0.18)'); glow.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    // cobalt dado along the foot
    ctx.fillStyle = '#2b62c9'; ctx.fillRect(0, h - 70, w, 70);
    ctx.fillStyle = '#fff8ee'; ctx.fillRect(0, h - 76, w, 6);
    // terracotta eaves at the top
    for (var t = 0; t < 64; t++) { ctx.fillStyle = t % 2 ? '#e0703a' : '#c9582a'; ctx.beginPath(); ctx.arc(t * 16 + 8, 22, 8, 0, Math.PI); ctx.rect(t * 16, 0, 16, 22); ctx.fill(); }
    ctx.fillStyle = '#b84a20'; ctx.fillRect(0, 0, w, 8);
    function window2(x, y, ww, hh, shutter) {
      ctx.fillStyle = '#fff8ee'; ctx.fillRect(x - 6, y - 6, ww + 12, hh + 12);
      ctx.fillStyle = '#3f7fd0'; ctx.fillRect(x, y, ww, hh);
      ctx.fillStyle = 'rgba(255,214,140,0.55)'; ctx.fillRect(x + 4, y + 4, ww * 0.4, hh - 8);
      ctx.fillStyle = '#fff8ee'; ctx.fillRect(x + ww / 2 - 2, y, 4, hh);
      if (shutter) {
        ctx.fillStyle = shutter; ctx.fillRect(x - ww * 0.5, y - 4, ww * 0.45, hh + 8); ctx.fillRect(x + ww * 1.05, y - 4, ww * 0.45, hh + 8);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (var l = 0; l < 6; l++) { ctx.fillRect(x - ww * 0.5, y + l * (hh / 6), ww * 0.45, 3); ctx.fillRect(x + ww * 1.05, y + l * (hh / 6), ww * 0.45, 3); }
      }
      // a flower box
      ctx.fillStyle = '#b8683a'; ctx.fillRect(x - 4, y + hh + 6, ww + 8, 14);
      var fc = ['#ff7a5a', '#ffc23a', '#ff8fa8', '#7ad65a'];
      for (var f = 0; f < 6; f++) { ctx.fillStyle = fc[f % 4]; ctx.beginPath(); ctx.arc(x + 4 + f * ((ww - 4) / 5), y + hh + 4, 7, 0, 7); ctx.fill(); }
    }
    function panel(x, y, cols, rows, s) {
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) azulejo(ctx, x + c * s, y + r * s, s, r + c);
      ctx.strokeStyle = '#2b62c9'; ctx.lineWidth = 5; ctx.strokeRect(x - 2, y - 2, cols * s + 4, rows * s + 4);
    }
    // bay 0 (0..256): two upper windows with shutters, an azulejo panel between ground-floor doors
    window2(40, 90, 50, 80, '#2b62c9'); window2(170, 90, 50, 80, '#2b62c9');
    panel(76, 250, 4, 3, 26);
    // bay 1 (256..512): the cafe: arched door, a menu board
    ctx.fillStyle = '#2b62c9'; ctx.beginPath(); ctx.moveTo(300, h - 76); ctx.lineTo(300, 290); ctx.arc(350, 290, 50, Math.PI, 0); ctx.lineTo(400, h - 76); ctx.fill();
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.moveTo(310, h - 76); ctx.lineTo(310, 292); ctx.arc(350, 292, 40, Math.PI, 0); ctx.lineTo(390, h - 76); ctx.fill();
    window2(430, 110, 50, 80, '#ffc23a');
    ctx.fillStyle = '#2f3a2a'; ctx.fillRect(410, 270, 70, 52); ctx.strokeStyle = '#c98a52'; ctx.lineWidth = 5; ctx.strokeRect(410, 270, 70, 52);
    ctx.fillStyle = '#fff8ee'; ctx.font = '900 16px ' + ROUND; ctx.textAlign = 'center'; ctx.fillText('Gelados', 445, 292); ctx.font = '700 13px ' + ROUND; ctx.fillText('ice cream', 445, 312);
    // bay 2 (512..768): a big azulejo picture, a ship, between two windows
    panel(560, 180, 6, 4, 28);
    ctx.fillStyle = '#fbfaf2'; ctx.fillRect(578, 198, 130, 70);
    ctx.fillStyle = '#2b62c9'; ctx.beginPath(); ctx.moveTo(596, 246); ctx.lineTo(700, 246); ctx.lineTo(684, 262); ctx.lineTo(612, 262); ctx.fill();
    ctx.fillRect(646, 206, 3, 40); ctx.beginPath(); ctx.moveTo(649, 208); ctx.lineTo(690, 240); ctx.lineTo(649, 240); ctx.fill(); ctx.beginPath(); ctx.moveTo(644, 214); ctx.lineTo(612, 240); ctx.lineTo(644, 240); ctx.fill();
    window2(530, 70, 44, 70, '#7ad65a'); window2(730, 70, 44, 70, '#7ad65a');
    // bay 3 (768..1024): a doorway with a lamp, house number and a laundry line
    ctx.fillStyle = '#ff7a5a'; ctx.fillRect(850, 250, 70, h - 76 - 250);
    ctx.fillStyle = '#c9582a'; ctx.fillRect(862, 262, 46, 120);
    ctx.fillStyle = '#ffc23a'; ctx.beginPath(); ctx.arc(885, 322, 5, 0, 7); ctx.fill();
    window2(790, 100, 50, 80, '#2b62c9'); window2(940, 100, 50, 80, '#2b62c9');
    ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(790, 230); ctx.quadraticCurveTo(880, 262, 990, 226); ctx.stroke();
    ['#ff7a5a', '#fff8ee', '#ffc23a', '#22c9d6'].forEach(function (c, i) { ctx.fillStyle = c; ctx.fillRect(812 + i * 44, 242 + Math.sin(i) * 5, 26, 34); });
  });
}

function seaTex() {
  return canvasTex('alg_sea', 128, 128, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#34c8d8'); g.addColorStop(1, '#2a9fd0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,225,170,0.7)'; ctx.lineWidth = 3;
    for (var i = 0; i < 8; i++) { ctx.beginPath(); for (var x = 0; x <= w; x += 8) ctx.lineTo(x, 8 + i * 16 + Math.sin((x / w) * Math.PI * 2 * 2 + i) * 4); ctx.stroke(); }
  }, { repeat: [28, 56] });
}

function plateTex(name, big, small, bg, fg, border) {
  return canvasTex('alg_plate_' + name, 320, 128, function (ctx, w, h) {
    ctx.fillStyle = css(border); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(2, 2, w - 4, h - 4, 24); else ctx.rect(2, 2, w - 4, h - 4); ctx.fill();
    ctx.fillStyle = css(bg); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(10, 10, w - 20, h - 20, 16); else ctx.rect(10, 10, w - 20, h - 20); ctx.fill();
    ctx.fillStyle = css(fg); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 ' + (small ? (big.length > 8 ? 46 : 54) : 56) + 'px ' + ROUND; ctx.fillText(big, w / 2, small ? h * 0.4 : h / 2 + 2);
    if (small) { ctx.font = '800 26px ' + ROUND; ctx.fillText(small, w / 2, h * 0.78); }
  });
}

function popTex(ci) {
  // an ice pop on a stick, with a bite out of the corner; alpha elsewhere
  return canvasTex('alg_pop' + ci, 96, 192, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#e8c48a'; ctx.fillRect(w / 2 - 7, 120, 14, 66);
    ctx.strokeStyle = '#6a3a1a'; ctx.lineWidth = 4; ctx.strokeRect(w / 2 - 7, 120, 14, 66);
    ctx.fillStyle = HEX[ci % 6];
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(10, 8, w - 20, 118, 36); else ctx.rect(10, 8, w - 20, 118); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(22, 24, 10, 70);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 70, w - 20, 16);
    ctx.strokeStyle = '#6a3a1a'; ctx.strokeRect(10, 70, w - 20, 16);
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

var _beamMat = null;
function beamMaterial() {
  return _beamMat || (_beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
}

// ---------- the boardwalk, one bay on one side ----------

function seaRail(g, S, z) {
  // a whitewashed rail with a rope, posts topped with little brass caps
  box(g, 0.1, 0.1, 4, WHITE, S.in(0.0), 1.05, z);
  box(g, 0.08, 0.08, 4, WHITE, S.in(0.0), 0.55, z);
  [-1.9, 0, 1.9].forEach(function (dz) {
    cyl(g, 0.07, 0.07, 1.1, WHITE, S.in(0.0), 0.55, z + dz, { seg: 5 });
    ball(g, 0.08, 0xffc23a, S.in(0.0), 1.15, z + dz, { seg: 4 });
  });
}

function lighthouse(g, S, z) {
  var x = S.out(1.7);
  var cyls = [[1.0, 0.92, 1.4, WHITE], [0.92, 0.84, 1.4, CORAL], [0.84, 0.76, 1.4, WHITE], [0.76, 0.68, 1.4, CORAL], [0.68, 0.6, 1.4, WHITE]];
  var y = 0;
  cyls.forEach(function (c) { cyl(g, c[1], c[0], c[2], c[3], x, y + c[2] / 2, z, { seg: 12, r: 0.5 }); y += c[2]; });
  cyl(g, 0.82, 0.82, 0.14, 0x3a4a6a, x, y + 0.07, z, { seg: 12 });
  cyl(g, 0.5, 0.5, 0.9, 0xfff0a0, x, y + 0.59, z, { seg: 10, e: 0xfff0a0, ei: 0.9 });
  cone(g, 0.72, 0.8, CORAL, x, y + 1.45, z, { seg: 10 });
  ball(g, 0.1, SUN, x, y + 1.95, z, { seg: 5 });
  // the lamp's beam fanning out over the sea
  var bm = new THREE.Mesh(new THREE.ConeGeometry(0.9, 8, 8, 1, true), beamMaterial());
  bm.rotation.z = S.side * Math.PI / 2;
  bm.position.set(x + S.side * 4.0, y + 0.6, z);
  g.add(bm);
  box(g, 0.05, 0.7, 0.4, COBALT, x - S.side * 0.6, 0.45, z, { r: 0.5 });
  decal(g, plateTex('farol', 'Farol', 'lighthouse', 0xfff8ee, 0xc9421a, CORAL), CORAL, 1.6, 0.64, S.in(0.4), 4.2, z + 1.6, S.turn + S.side * 0.4);
}

function beach(g, S, z) {
  // two striped umbrellas over sun loungers, a palm, a beach ball
  var tex = stripeTex(0xff7a5a, 0xfff8ee, 6);
  var tex2 = stripeTex(0x22c9d6, 0xffc23a, 6);
  [[-1.0, tex], [1.1, tex2]].forEach(function (u) {
    var x = S.out(1.1);
    cyl(g, 0.035, 0.035, 2.4, WHITE, x, 1.2, z + u[0], { seg: 4 });
    cone(g, 1.25, 0.55, 0xffffff, x, 2.55, z + u[0], { seg: 10, map: u[1], r: 0.5 });
    box(g, 0.6, 0.1, 1.5, WOOD, S.out(0.1), 0.35, z + u[0] + 0.1, { rz: S.side * 0.08 });
    box(g, 0.5, 0.06, 1.2, u[1] === tex ? 0xfff8ee : 0xffc23a, S.out(0.1), 0.43, z + u[0] + 0.1);
  });
  var px = S.out(0.9);
  cyl(g, 0.12, 0.2, 3.0, 0xa5703a, px, 1.5, z + 0.1, { seg: 5, rz: S.side * 0.06 });
  for (var f = 0; f < 6; f++) {
    var a = (f / 6) * Math.PI * 2;
    cone(g, 0.18, 1.8, 0x2fb85a, px + Math.cos(a) * 0.6, 3.1, z + 0.1 + Math.sin(a) * 0.7, { seg: 3, rz: Math.cos(a) * 1.1, rx: -Math.sin(a) * 1.1 });
  }
  decal(g, plateTex('boatarde', 'Boa tarde', 'good afternoon', 0xfff8ee, 0x1a7a9a, TEAL), TEAL, 1.9, 0.76, S.in(0.4), 4.7, z, S.turn + S.side * 0.4);
}

function surfShack(g, S, z) {
  var x = S.out(1.2);
  box(g, 1.6, 2.4, 3.2, WOOD, x, 1.2, z, { r: 0.8 });
  box(g, 2.0, 0.16, 3.6, TERRA, x - S.side * 0.1, 2.55, z, { rz: S.side * 0.14 });
  box(g, 0.4, 1.1, 3.0, 0x7a4a22, S.out(0.3), 0.55, z);
  // a rack of surfboards leaning on the shack
  [[-1.4, 0], [-0.75, 1], [-0.1, 2], [0.55, 3], [1.2, 4]].forEach(function (b) {
    ball(g, 0.3, POP[b[1]], S.in(0.4), 1.2, z + b[0], { seg: 8, sx: 0.18, sy: 2.7, sz: 0.85, rz: S.side * 0.1 });
    box(g, 0.02, 1.2, 0.07, 0xffffff, S.in(0.4) - S.side * 0.06, 1.2, z + b[0], { rz: S.side * 0.1 });
  });
  [-1.8, 1.8].forEach(function (dz) {
    cyl(g, 0.05, 0.07, 1.6, 0x7a4a22, S.in(0.6), 0.8, z + dz, { seg: 5 });
    cone(g, 0.15, 0.4, 0xffb030, S.in(0.6), 1.8, z + dz, { seg: 5, e: 0xff8a20, ei: 0.8 });
  });
  decal(g, plateTex('surf', 'SURF', 'Boa onda!', 0x16a8b8, 0xffffff, SUN), TEAL, 2.0, 0.8, S.in(0.35), 3.7, z, S.turn + S.side * 0.4);
}

function iceCart(g, S, z) {
  var x = S.in(0.5);
  box(g, 0.8, 0.8, 1.9, 0xffffff, x, 0.7, z);
  box(g, 0.84, 0.18, 1.95, TEAL, x, 1.18, z);
  [-0.7, 0.7].forEach(function (dz) { cyl(g, 0.3, 0.3, 0.1, 0x2a2d3a, x, 0.3, z + dz, { rz: Math.PI / 2, seg: 8 }); });
  cyl(g, 0.03, 0.03, 2.2, 0xffffff, x, 2.0, z, { seg: 4 });
  for (var s = 0; s < 6; s++) cone(g, 1.05, 0.5, s % 2 ? 0xffffff : CORAL, x, 3.05, z, { seg: 6, ry: (s * Math.PI) / 3 });
  // giant ice pops standing on the cart and beside it
  [0, 1, 2, 3].forEach(function (i) {
    decal(g, popTex(i), HEX[i], 0.55, 1.1, x - S.side * 0.42, 1.8, z - 0.75 + i * 0.5, S.turn);
  });
  decal(g, plateTex('gelados', 'Gelados', 'ice creams', 0xfff8ee, 0xc9421a, CORAL), CORAL, 2.1, 0.84, S.in(0.3), 4.5, z, S.turn + S.side * 0.4);
}

function seaSide(g, S, z, k) {
  seaRail(g, S, z);
  if (k === 0) lighthouse(g, S, z);
  else if (k === 1) beach(g, S, z);
  else if (k === 2) surfShack(g, S, z);
  else iceCart(g, S, z);
}

function townSide(g, S, z, k) {
  wallPanel(g, townPicture(), S.side, z, 7.5, 0.02, { r: 0.9 });
  // a terracotta eave leaning out over the street
  box(g, 0.9, 0.12, 4, TERRA, S.in(0.5), 6.7, z, { rz: S.side * 0.28 });
  // bunting along the eave, and potted plants and a bistro table at the foot
  for (var f = 0; f < 8; f++) {
    var t = f / 7;
    cone(g, 0.14, 0.34, POP[f % 6], S.in(0.55), 6.0 - Math.sin(t * Math.PI) * 0.3, z - 1.75 + t * 3.5, { seg: 3, rz: Math.PI, sz: 0.2, bulb: true });
  }
  [[-1.8, 0], [1.8, 1]].forEach(function (p) {
    cyl(g, 0.22, 0.17, 0.42, TERRA, S.in(0.5), 0.21, z + p[0], { seg: 6 });
    ball(g, 0.32, p[1] ? 0x2fae58 : 0x3fbf5a, S.in(0.5), 0.72, z + p[0], { seg: 5 });
    ball(g, 0.09, CORAL, S.in(0.5) - S.side * 0.16, 0.95, z + p[0], { seg: 4 });
  });
  if (k === 0 || k === 2) {
    cyl(g, 0.4, 0.4, 0.06, 0xffffff, S.in(0.65), 0.78, z, { seg: 8 });
    cyl(g, 0.04, 0.04, 0.78, 0x555a66, S.in(0.65), 0.39, z, { seg: 4 });
    cyl(g, 0.025, 0.025, 2.0, WHITE, S.in(0.65), 1.0, z, { seg: 4 });
    for (var s = 0; s < 6; s++) cone(g, 1.0, 0.45, s % 2 ? 0xffffff : COBALT, S.in(0.65), 2.1, z, { seg: 6, ry: (s * Math.PI) / 3 });
  }
  if (k === 1) {
    // the cafe awning
    box(g, 1.1, 0.07, 3.2, 0xffffff, S.in(0.5), 3.3, z, { rz: S.side * 0.3, map: stripeTex(0xff7a5a, 0xfff8ee, 7), r: 0.7 });
  }
  var texts = [['Bem-vindo', 'welcome', 0xfff8ee, 0x1a4aa8, COBALT], ['Gelados', 'ice creams', 0xfff8ee, 0xc9421a, CORAL], ['Obrigado', 'thank you', 0xfff8ee, 0x1a4aa8, COBALT], ['Boa tarde', 'good afternoon', 0xfff8ee, 0x1a7a9a, TEAL]];
  var tx = texts[k];
  decal(g, plateTex('town' + k, tx[0], tx[1], tx[2], tx[3], tx[4]), COBALT, 1.9, 0.76, S.in(0.45), 4.75, z + 0.6, S.turn + S.side * 0.4);
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  if (side < 0) seaSide(g, S, z, k);
  else townSide(g, S, z, k);
}

function center(g, z) { floorPanel(g, deckPicture(), z, 12); }

function arch(g, z, i) {
  // festoon lights and paper lanterns across the boardwalk, glowing warm at golden hour
  for (var f = 0; f < 11; f++) {
    var t = f / 10;
    ball(g, 0.1, [0xffe27a, 0xfff6c0, 0xffb347][(f + i) % 3], -5.2 + t * 10.4, 6.0 - Math.sin(t * Math.PI) * 0.6, z, { seg: 4, bulb: true });
  }
  cyl(g, 0.012, 0.012, 10.4, 0x666677, 0, 5.7, z, { rz: Math.PI / 2, seg: 3 });
  [-1, 1].forEach(function (s, n) { ball(g, 0.3, POP[(i + n * 2) % 6], s * 4.6, 5.3, z, { seg: 6, sy: 1.2, e: POP[(i + n * 2) % 6], ei: 0.5 }); });
  ball(g, 0.3, POP[(i + 1) % 6], 0, 5.4, z, { seg: 6, sy: 1.2, e: POP[(i + 1) % 6], ei: 0.5 });
}

function groundBuild(g) {
  // sand to the horizon, and the glittering sea beyond the beach on the left
  slab(g, 400, 400, 0xf3d49c, 0, -0.04, -190, { r: 1 });
  var sea = seaTex();
  slab(g, 190, 440, sea ? 0xffffff : 0x2fc4d8, -107, -0.02, -200, { map: sea || undefined, r: 0.35, env: 0.6 });
  if (sea) flow(sea, 0.015, 0.03);
}

function sailboat(c) {
  var b = new THREE.Group();
  box(b, 0.8, 0.4, 3.0, 0xffffff, 0, 0.2, 0);
  box(b, 0.84, 0.12, 3.04, c, 0, 0.45, 0);
  cyl(b, 0.05, 0.05, 3.6, 0xdddddd, 0, 2.2, 0.0, { seg: 4 });
  var sail = cone(b, 1.0, 3.0, 0xffffff, 0, 2.2, 0.5, { seg: 3, sz: 0.04 });
  sail.rotation.y = Math.PI / 2;
  animated(b);
  bob(b, 0.15, 1.4, 0);
  return b;
}

function extras() {
  cloudBank(10, { seed: 6, colors: [0xffd0a0, 0xffb8a0, 0xffe0c0], area: { x: [-70, 70], y: [14, 30], z: [-150, 10] } });
  swarm({ geo: birdGeo(), count: 10, seed: 21, colors: [0xffffff, 0xfff0e0], area: { x: [-26, 2], y: [5, 12], z: [-140, 8] }, k: 0.3, vz: [-4, -2.5], vx: [-0.4, 0.4], face: true, flap: 0.5, scale: [1.2, 2] });
  swarm({ geo: sparkleGeo(0.2), material: glowMat(0.85), count: 26, seed: 44, colors: [0xfff0a0, 0xffd6a0, 0xffffff], area: { x: [-60, -9], y: [0.05, 0.4], z: [-140, 8] }, k: 1, turn: 1.4, wobble: 0.05, scale: [0.6, 1.3] });
  [[-24, -80], [-38, -150], [-20, -30]].forEach(function (p, i) { var s = sailboat(POP[(i * 2) % 6]); s.position.set(p[0], 0, p[1]); mover(s, { k: 0.9, vz: -1.4 }); });
  shimmer(beamMaterial(), 0.22, 0.06, 1.6, 0);
}

export var w_algarve_sunset = {
  id: 'w_algarve_sunset',
  indoor: false,
  bay: bay,
  center: center,
  arch: arch,
  ground: groundBuild,
  extras: extras
};
