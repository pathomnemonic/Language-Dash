/**
 * w_bavarian_farmyard.js — Bavarian Farmyard (skin 'Vet and Farm Clinic', title "Bavarian Farmyard"): a red-and-white
 * farm in the foothills of the Alps.
 *
 * Every 16 units: a red barn with white X doors and a hay stack, an animal pen (cow, sheep, chickens, a trough), a
 * half-timbered farmhouse with a flower balcony and a maypole, and a pretzel stand with a beer-garden table. Everything is
 * dressed in Bavarian blue-and-white lozenges (awnings, tablecloths, bunting). Far off: snow-capped Alps and an
 * onion-domed church; a windmill turns, a red tractor putters past, swallows and butterflies fly by.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, mat, canvasTex, sign, floorPanel, sideCtx, slab, WALL_X
} from '../mapkit.js';
import { animated, features, mover, spin, swarm, cloudBank } from '../mapfx.js';
import { picket, birdGeo, butterflyGeo } from '../mapprops.js';

var RED = 0xd9382f;
var BLUE = 0x2f78d0;
var WHITE = 0xffffff;
var HAY = 0xf0c24a;
var WOOD = 0xb98a55;
var PINK = 0xffa8c0;
var WORDS = ['Servus', 'Grüß Gott', 'Danke', 'Bitte', 'Willkommen', 'Guten Tag'];

// ---------- painted pictures ----------

function lozengeTex() {
  return canvasTex('bav_lozenge', 128, 128, function (ctx, w, h) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f78d0';
    var n = 4;
    var s = w / n;
    for (var j = -1; j < n; j++) {
      for (var i = -1; i < n; i++) {
        if ((i + j) % 2 !== 0) continue;
        var cx = i * s + s / 2 + (j % 2 ? 0 : 0);
        var cy = j * s + s / 2;
        ctx.beginPath(); ctx.moveTo(cx, cy - s / 2); ctx.lineTo(cx + s / 2, cy); ctx.lineTo(cx, cy + s / 2); ctx.lineTo(cx - s / 2, cy); ctx.closePath(); ctx.fill();
      }
    }
  });
}

function lozengeMat(side) {
  var t = lozengeTex();
  return t ? mat(0xffffff, { map: t, r: 0.85, side: side }) : mat(BLUE, { side: side });
}

function pathPicture() {
  // 12 across, 16 along, 48 px to the unit: pale gravel with pebbles, cobbled edges and grass at the sides
  return canvasTex('bav_path', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#7fd05a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f0dcae'; ctx.fillRect(22, 0, w - 44, h);
    for (var i = 0; i < 260; i++) {
      ctx.fillStyle = ['#e2c78e', '#f8e8c2', '#d9b878', '#ffffff'][i % 4];
      ctx.beginPath(); ctx.ellipse(30 + (i * 97) % (w - 60), (i * 151) % h, 6 + i % 4, 3 + i % 3, i, 0, 6.3); ctx.fill();
    }
    // cobbled kerb
    for (var j = 0; j < 32; j++) { ctx.fillStyle = j % 2 ? '#c8b088' : '#d8c298'; ctx.fillRect(14, j * 24 + 1, 14, 22); ctx.fillRect(w - 28, j * 24 + 1, 14, 22); }
    // grass tufts and daisies
    for (var t = 0; t < 70; t++) {
      var tx = (t * 37) % 14;
      ctx.fillStyle = '#4fb842'; ctx.fillRect(tx, (t * 71) % h, 3, 9); ctx.fillRect(w - 14 + tx, (t * 53) % h, 3, 9);
      if (t % 5 === 0) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tx + 2, (t * 71) % h + 4, 3, 0, 6.3); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(tx + 2, (t * 71) % h + 4, 1.2, 0, 6.3); ctx.fill(); }
    }
  });
}

function barnTex() {
  // 4 x 4.5 units at 64 px
  return canvasTex('bav_barn', 256, 288, function (ctx, w, h) {
    ctx.fillStyle = '#d9382f'; ctx.fillRect(0, 0, w, h);
    for (var x = 0; x < w; x += 16) { ctx.fillStyle = 'rgba(80,10,0,0.18)'; ctx.fillRect(x, 0, 2, h); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x + 3, 0, 2, h); }
    // white trim all round
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, 0, 10, h); ctx.fillRect(w - 10, 0, 10, h); ctx.fillRect(0, h - 14, w, 14);
    // big double door with white X
    ctx.fillStyle = '#b02a22'; ctx.fillRect(48, 112, 160, 176);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9;
    ctx.strokeRect(52, 116, 152, 168);
    ctx.beginPath(); ctx.moveTo(128, 116); ctx.lineTo(128, 284); ctx.stroke();
    ctx.lineWidth = 7;
    [[56, 120, 124, 280], [200, 120, 132, 280]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p[0], p[3]); ctx.lineTo(p[2], p[1]); ctx.stroke(); });
    // hayloft hatch with hay peeking out
    ctx.fillStyle = '#ffffff'; ctx.fillRect(96, 22, 64, 66);
    ctx.fillStyle = '#7a2a20'; ctx.fillRect(102, 28, 52, 54);
    ctx.fillStyle = '#f0c24a'; ctx.fillRect(102, 54, 52, 28);
    ctx.strokeStyle = '#d9a02a'; ctx.lineWidth = 3;
    for (var i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(106 + i * 6, 80); ctx.lineTo(102 + i * 7, 52); ctx.stroke(); }
    // little round windows with blue-white lozenge frames
    [[34, 56], [222, 56]].forEach(function (p) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p[0], p[1], 18, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#9fd8f4'; ctx.beginPath(); ctx.arc(p[0], p[1], 12, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(p[0] - 1.5, p[1] - 12, 3, 24); ctx.fillRect(p[0] - 12, p[1] - 1.5, 24, 3);
    });
    // blue-white lozenge band under the eaves
    ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 10, w - 20, 8);
    for (var d = 0; d < 15; d++) { ctx.fillStyle = '#2f78d0'; ctx.beginPath(); ctx.moveTo(18 + d * 16, 14); ctx.lineTo(26 + d * 16, 10); ctx.lineTo(34 + d * 16, 14); ctx.lineTo(26 + d * 16, 18); ctx.closePath(); ctx.fill(); }
  });
}

function houseTex() {
  // a half-timbered farmhouse front, 4 x 5 units
  return canvasTex('bav_house', 256, 320, function (ctx, w, h) {
    ctx.fillStyle = '#fff6e2'; ctx.fillRect(0, 0, w, h);
    var T = '#6a4228';
    ctx.fillStyle = T;
    // frame: posts, floor beams, braces
    [0, 124, 246].forEach(function (x) { ctx.fillRect(x, 0, 10, h); });
    ctx.fillRect(0, 150, w, 12); ctx.fillRect(0, h - 14, w, 14); ctx.fillRect(0, 0, w, 10);
    ctx.lineWidth = 8; ctx.strokeStyle = T;
    [[10, 150, 70, 100], [246, 150, 186, 100], [10, 314, 60, 262], [246, 314, 196, 262]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.stroke(); });
    // upper windows with shutters
    [[44, 36], [168, 36]].forEach(function (p, i) {
      ctx.fillStyle = i ? '#2f78d0' : '#d9382f'; ctx.fillRect(p[0] - 14, p[1], 14, 70); ctx.fillRect(p[0] + 42, p[1], 14, 70);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(p[0], p[1] - 4, 42, 78);
      ctx.fillStyle = '#9fd8f4'; ctx.fillRect(p[0] + 4, p[1], 34, 70);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(p[0] + 19, p[1], 4, 70); ctx.fillRect(p[0] + 4, p[1] + 30, 34, 4);
    });
    // ground floor: door and window
    ctx.fillStyle = '#8a5a33'; ctx.fillRect(40, 190, 56, 112);
    ctx.fillStyle = '#6a4228'; ctx.fillRect(46, 196, 20, 44); ctx.fillRect(70, 196, 20, 44); ctx.fillRect(46, 246, 20, 50); ctx.fillRect(70, 246, 20, 50);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(88, 250, 3, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(150, 190, 70, 66);
    ctx.fillStyle = '#9fd8f4'; ctx.fillRect(154, 194, 62, 58);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(183, 194, 4, 58); ctx.fillRect(154, 220, 62, 4);
    // painted lozenge frieze above the ground floor, and an inn sign
    for (var d = 0; d < 14; d++) { ctx.fillStyle = d % 2 ? '#2f78d0' : '#ffffff'; ctx.fillRect(10 + d * 17, 166, 17, 14); }
    ctx.fillStyle = '#d9382f'; ctx.fillRect(100, 168, 40, 0);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(150, 262, 70, 28);
    ctx.fillStyle = '#6a4228'; ctx.font = '900 17px "Arial Rounded MT Bold", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GASTHOF', 185, 277);
  });
}

function roofTex() {
  return canvasTex('bav_roof', 128, 128, function (ctx, w, h) {
    ctx.fillStyle = '#c4492e'; ctx.fillRect(0, 0, w, h);
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        ctx.fillStyle = (r + c) % 3 === 0 ? '#d65a38' : (r + c) % 3 === 1 ? '#b83f27' : '#cc5030';
        ctx.beginPath(); ctx.ellipse(c * 16 + (r % 2 ? 8 : 0), r * 16 + 8, 8, 9, 0, 0, Math.PI); ctx.fill();
      }
    }
  });
}

// ---------- animals and little props ----------

function cow(g, x, z, dir) {
  box(g, 0.55, 0.55, 1.0, WHITE, x, 0.78, z);
  box(g, 0.57, 0.3, 0.38, 0x3a2a24, x, 0.9, z - dir * 0.1);
  box(g, 0.2, 0.25, 0.3, 0x3a2a24, x + 0.28, 0.7, z + dir * 0.28);
  box(g, 0.36, 0.38, 0.38, WHITE, x, 1.0, z + dir * 0.68);
  box(g, 0.28, 0.2, 0.1, PINK, x, 0.92, z + dir * 0.9);
  box(g, 0.1, 0.1, 0.08, 0x3a2a24, x - 0.2, 1.12, z + dir * 0.7);
  box(g, 0.1, 0.1, 0.08, 0x3a2a24, x + 0.2, 1.12, z + dir * 0.7);
  cone(g, 0.04, 0.16, 0xf4e8c0, x - 0.2, 1.3, z + dir * 0.62, { seg: 4 });
  cone(g, 0.04, 0.16, 0xf4e8c0, x + 0.2, 1.3, z + dir * 0.62, { seg: 4 });
  ball(g, 0.07, HAY, x, 0.72, z + dir * 0.5, { seg: 5 }); // bell
  [[-0.2, -0.35], [0.2, -0.35], [-0.2, 0.35], [0.2, 0.35]].forEach(function (l) { box(g, 0.12, 0.5, 0.12, WHITE, x + l[0], 0.25, z + l[1]); });
  box(g, 0.04, 0.5, 0.04, 0x3a2a24, x, 0.85, z - dir * 0.58, { rx: 0.2 });
}

function sheep(g, x, z, dir) {
  ball(g, 0.34, 0xfff8ec, x, 0.6, z, { seg: 7, sz: 1.3 });
  ball(g, 0.22, 0xfff8ec, x, 0.82, z - dir * 0.1, { seg: 6 });
  ball(g, 0.16, 0x4a3a34, x, 0.72, z + dir * 0.52, { seg: 6 });
  box(g, 0.05, 0.1, 0.1, 0x4a3a34, x - 0.12, 0.8, z + dir * 0.46);
  box(g, 0.05, 0.1, 0.1, 0x4a3a34, x + 0.12, 0.8, z + dir * 0.46);
  [[-0.14, -0.22], [0.14, -0.22], [-0.14, 0.22], [0.14, 0.22]].forEach(function (l) { box(g, 0.07, 0.3, 0.07, 0x4a3a34, x + l[0], 0.15, z + l[1]); });
}

function chicken(g, x, z, c) {
  ball(g, 0.15, c, x, 0.24, z, { seg: 6, sz: 1.3 });
  ball(g, 0.09, c, x, 0.42, z + 0.13, { seg: 5 });
  cone(g, 0.035, 0.09, 0xffa020, x, 0.4, z + 0.24, { seg: 4, rx: Math.PI / 2 });
  box(g, 0.03, 0.08, 0.07, RED, x, 0.52, z + 0.13);
  box(g, 0.03, 0.14, 0.14, c, x, 0.32, z - 0.18, { rx: -0.6 });
}

function hayBale(g, x, y, z, ry) {
  box(g, 0.7, 0.45, 1.0, HAY, x, y + 0.225, z, { ry: ry || 0 });
  box(g, 0.72, 0.04, 0.06, 0xb88a2a, x, y + 0.3, z - 0.2, { ry: ry || 0 });
  box(g, 0.72, 0.04, 0.06, 0xb88a2a, x, y + 0.3, z + 0.2, { ry: ry || 0 });
}

function geraniumBox(g, x, y, z, len) {
  box(g, 0.2, 0.16, len, 0x8a5a33, x, y, z);
  var n = Math.round(len / 0.26);
  for (var i = 0; i < n; i++) {
    ball(g, 0.1, 0x3fa24f, x, y + 0.14, z - len / 2 + (i + 0.5) * (len / n), { seg: 5, sy: 0.8 });
    ball(g, 0.075, i % 3 === 0 ? 0xff8fb0 : RED, x, y + 0.26, z - len / 2 + (i + 0.5) * (len / n), { seg: 4 });
  }
}

// ---------- buildings ----------

/** A front quad facing the track that sits on the wall line. */
function front(g, tex, side, z, h, tint) {
  var m = new THREE.Mesh(new THREE.PlaneGeometry(4, h), tex ? mat(tint || WHITE, { map: tex, r: 0.85, env: 0.15 }) : mat(RED));
  m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  m.position.set(side * (WALL_X - 0.02), h / 2, z);
  g.add(m);
}

/** A pitched tile roof, eaves over the walkway and the ridge behind the wall. */
function roof(g, side, z, y0, rise, run) {
  var len = Math.hypot(run, rise);
  var a = Math.atan2(run, rise);
  var t = roofTex();
  var m = t ? mat(0xffffff, { map: t, r: 0.8, side: THREE.DoubleSide }) : mat(0xc4492e, { side: THREE.DoubleSide });
  var xin = WALL_X - 0.85; // where the eaves hang
  var sl = new THREE.Mesh(new THREE.BoxGeometry(0.16, len, 4.04), m);
  sl.position.set(side * (xin + run / 2), y0 + rise / 2, z);
  sl.rotation.z = -side * a;
  g.add(sl);
  box(g, 0.3, 0.12, 4.06, 0xf4e8d0, side * (xin + run) - side * 0.05, y0 + rise + 0.04, z); // ridge board
  box(g, 0.1, 0.2, 4.1, 0xffffff, side * (xin) + side * 0.02, y0 - 0.06, z); // fascia
}

function barn(g, S, side, z) {
  front(g, barnTex(), side, z, 4.5, WHITE);
  roof(g, side, z, 4.3, 2.0, 2.8);
  // a stack of hay bales and a round bale in front
  var x = S.in(0.5);
  hayBale(g, x, 0, z - 1.1, 0);
  hayBale(g, x, 0, z - 0.1, 0);
  hayBale(g, x, 0.45, z - 0.6, 0);
  cyl(g, 0.45, 0.45, 0.7, 0xe8b838, S.in(0.55), 0.45, z + 1.2, { seg: 12, rz: Math.PI / 2 });
  cyl(g, 0.4, 0.4, 0.72, 0xf8d66a, S.in(0.55), 0.45, z + 1.2, { seg: 12, rz: Math.PI / 2 });
  // a pitchfork against the wall
  box(g, 0.05, 1.6, 0.05, WOOD, S.in(0.12), 0.82, z + 1.9, { rx: 0.1 });
  box(g, 0.05, 0.05, 0.28, 0x8a8a8a, S.in(0.12), 1.64, z + 1.9);
}

function pen(g, S, side, z) {
  // low timber wall behind, a fence, and the animals in front
  box(g, 0.2, 1.0, 4.0, 0xd8a868, S.side * (WALL_X + 0.1), 0.5, z);
  roof(g, side, z, 3.2, 1.3, 1.7); // an open lean-to for the animals
  [-1.9, 0, 1.9].forEach(function (dz) { box(g, 0.14, 3.2, 0.14, WOOD, side * (WALL_X - 0.8), 1.6, z + dz); });
  box(g, 0.1, 0.8, 4.0, 0xfff0d8, S.side * (WALL_X + 0.0), 3.0, z);
  // fence on the lane side of the pen
  picket(g, S.in(0.0) + side * 0.08, z, 4, 0.9, 0xfff6e4);
  cow(g, S.in(0.62), z - 0.9, 1);
  sheep(g, S.in(0.55), z + 0.55, -1);
  sheep(g, S.in(0.62), z + 1.45, 1);
  chicken(g, S.in(0.35), z - 1.8, WHITE);
  chicken(g, S.in(0.38), z + 0.0, 0xe0a050);
  chicken(g, S.in(0.3), z + 0.3, WHITE);
  // water trough and a hay rack
  box(g, 0.4, 0.35, 1.0, 0x9a6a3a, S.in(0.5), 0.18, z + 1.9 - 0.05);
  box(g, 0.3, 0.05, 0.9, 0x7fc8f0, S.in(0.5), 0.36, z + 1.85);
  sign(g, 'MUH!', 0xffffff, RED, 0.7, 0.3, S.in(0.04), 1.3, z - 0.1, { ry: S.turn, border: RED });
}

function farmhouse(g, S, side, z) {
  front(g, houseTex(), side, z, 5, WHITE);
  roof(g, side, z, 5.0, 2.4, 2.8);
  // balcony of dark wood with geraniums, and window boxes
  var bx = side * (WALL_X - 0.45);
  box(g, 0.9, 0.1, 3.0, 0x8a5a33, bx, 2.45, z + 0.2);
  box(g, 0.06, 0.06, 3.0, 0x6a4228, side * (WALL_X - 0.88), 3.1, z + 0.2);
  for (var b = 0; b < 12; b++) box(g, 0.05, 0.62, 0.05, 0x6a4228, side * (WALL_X - 0.88), 2.78, z - 1.2 + b * 0.27);
  geraniumBox(g, side * (WALL_X - 0.88), 3.22, z + 0.2, 3.0);
  // the maypole
  var px = S.in(0.62);
  var pz = z + 1.5;
    for (var s = 0; s < 6; s++) cyl(g, 0.095, 0.1, 1.06, s % 2 ? WHITE : BLUE, px, 0.53 + s * 1.05, pz, { seg: 8 });
  ring(g, 0.6, 0.06, 0x3fa24f, px, 6.3, pz, { rx: Math.PI / 2, seg: 10, tube: 3 });
  for (var f = 0; f < 6; f++) {
    var a = f * Math.PI / 3;
    box(g, 0.1, 3.6, 0.025, f % 2 ? WHITE : BLUE, px + Math.cos(a) * 0.5, 4.5, pz + Math.sin(a) * 0.5, { rx: Math.sin(a) * 0.22, rz: -Math.cos(a) * 0.22 });
    ball(g, 0.1, [RED, HAY, BLUE][f % 3], px + Math.cos(a) * 0.6, 6.5, pz + Math.sin(a) * 0.6, { seg: 5 });
  }
  cone(g, 0.2, 0.4, RED, px, 6.85, pz, { seg: 6 });
  // sunflowers
  [-0.9, -0.5].forEach(function (dz, i) {
    cyl(g, 0.025, 0.025, 1.5 + i * 0.2, 0x3fa24f, S.in(0.3), 0.75, z + dz, { seg: 4 });
    cyl(g, 0.2, 0.2, 0.06, HAY, S.in(0.3), 1.55 + i * 0.2, z + dz, { seg: 8, rz: Math.PI / 2 });
    cyl(g, 0.1, 0.1, 0.08, 0x6a3a1a, S.in(0.3) - side * 0.03, 1.55 + i * 0.2, z + dz, { seg: 6, rz: Math.PI / 2 });
  });
}

function pretzel(g, x, y, z, ry, s) {
  var o = { ry: ry, seg: 10, tube: 4 };
  ring(g, 0.34 * s, 0.075 * s, 0xc8803a, x, y, z, o);
  ring(g, 0.16 * s, 0.065 * s, 0xc8803a, x, y + 0.36 * s, z, o);
  box(g, 0.07 * s, 0.7 * s, 0.08 * s, 0xc8803a, x, y + 0.1 * s, z, { ry: ry, rz: 0.6 });
  box(g, 0.07 * s, 0.7 * s, 0.08 * s, 0xc8803a, x, y + 0.1 * s, z, { ry: ry, rz: -0.6 });
  [-0.2, 0.2].forEach(function (d) { ball(g, 0.03 * s, WHITE, x, y - 0.1 * s + d * s, z, { seg: 3 }); });
}

function stall(g, S, side, z) {
  var x = S.in(0.5);
  // counter dressed in lozenges, a striped roof, posts and the pretzel sign
  box(g, 0.8, 1.0, 2.3, WHITE, x, 0.5, z - 0.2, { mat: lozengeMat(THREE.FrontSide) });
  box(g, 0.9, 0.07, 2.4, 0xf0d8a8, x, 1.04, z - 0.2);
  [-1.35, 0.95].forEach(function (dz) { cyl(g, 0.05, 0.05, 2.7, WOOD, S.in(0.15), 1.35, z + dz, { seg: 5 }); cyl(g, 0.05, 0.05, 2.7, WOOD, S.in(0.85), 1.35, z + dz, { seg: 5 }); });
  for (var s = 0; s < 5; s++) box(g, 1.4, 0.06, 0.46, s % 2 ? WHITE : BLUE, x, 2.68 - 0.0, z - 1.2 + s * 0.46 + 0.0, { rz: side * 0.12 });
  sign(g, 'BREZN', 0xfff0d0, 0x6a4228, 1.3, 0.42, S.in(0.02) + side * 0.0, 2.25, z - 0.2, { ry: S.turn, border: 0x8a4a22 });
  pretzel(g, x, 3.15, z - 0.2, S.turn, 1.2);
  // pretzels on the counter and a basket
  for (var p = 0; p < 4; p++) ring(g, 0.1, 0.035, 0xc8803a, x + (p % 2) * 0.14 - 0.07, 1.1 + 0.04 * (p > 1 ? 1 : 0), z - 0.9 + p * 0.28, { rx: Math.PI / 2, seg: 6, tube: 3 });
  cyl(g, 0.26, 0.2, 0.3, 0xc58b4a, x, 1.2, z + 0.5, { seg: 8 });
  for (var q = 0; q < 3; q++) ring(g, 0.1, 0.035, 0xc8803a, x + (q - 1) * 0.1, 1.38, z + 0.5, { ry: S.turn, seg: 6, tube: 3 });
  // beer-garden table with a lozenge cloth and two mugs, a milk churn
  var tz = z + 1.9;
  box(g, 0.7, 0.05, 0.9, WHITE, S.in(0.5), 0.74, tz, { mat: lozengeMat(THREE.FrontSide) });
  cyl(g, 0.05, 0.07, 0.72, WOOD, S.in(0.5), 0.37, tz, { seg: 5 });
  [-0.2, 0.2].forEach(function (d) { cyl(g, 0.06, 0.055, 0.14, 0xf4c030, S.in(0.5), 0.84, tz + d, { seg: 6 }); ball(g, 0.065, WHITE, S.in(0.5), 0.93, tz + d, { seg: 5, sy: 0.6 }); });
  cyl(g, 0.18, 0.2, 0.55, 0xdadada, S.in(0.15), 0.28, tz - 0.9, { seg: 8, m: 0.4 });
  cyl(g, 0.1, 0.18, 0.12, 0xdadada, S.in(0.15), 0.6, tz - 0.9, { seg: 8, m: 0.4 });
}

function trees(g, S, z, k) {
  // an apple tree or a fir behind the buildings, tall enough to be seen over the roofs
  var x = S.out(4.6 + (k % 2) * 1.6);
  cyl(g, 0.2, 0.28, 2.2, 0x7a4a2a, x, 1.1, z + 0.4, { seg: 6 });
  ball(g, 1.5, 0x3fb25a, x, 3.4, z + 0.4, { seg: 6 });
  ball(g, 1.1, 0x4fc86a, x + 0.9, 3.0, z + 0.9, { seg: 5 });
  if (k % 2 === 0) for (var i = 0; i < 6; i++) box(g, 0.2, 0.2, 0.2, RED, x + Math.cos(i * 1.05) * 1.3, 3.1 + (i % 3) * 0.4, z + 0.4 + Math.sin(i * 1.05) * 1.3 * 0.9, { ry: i });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  trees(g, S, z, k);
  if (k === 0) barn(g, S, side, z);
  else if (k === 1) pen(g, S, side, z);
  else if (k === 2) farmhouse(g, S, side, z);
  else stall(g, S, side, z);
  // blue-and-white lozenge pennants along the front of the eaves are on the arch; here, a flower strip
  if (k !== 1) for (var f = 0; f < 5; f++) box(g, 0.16, 0.14, 0.16, [RED, 0xffffff, 0xffd23f, 0xff8fb0][f % 4], S.in(0.05), 0.12 + (f % 2) * 0.04, z - 1.6 + f * 0.8, { ry: f });
}

function center(g, z) { floorPanel(g, pathPicture(), z, 12); }

function arch(g, z, i) {
  // blue-and-white bunting across the yard, and two greeting boards at the sides
  var n = 13;
  for (var f = 0; f < n; f++) {
    var t = f / (n - 1);
    cone(g, 0.2, 0.42, f % 2 ? WHITE : BLUE, -5.2 + t * 10.4, 6.3 - Math.sin(t * Math.PI) * 0.5 - 0.2, z, { seg: 3, rz: Math.PI, sz: 0.2, bulb: true });
  }
  cyl(g, 0.01, 0.01, 10.4, 0xf4e8d0, 0, 6.32, z, { rz: Math.PI / 2, seg: 3 });
  [-1, 1].forEach(function (s, n2) {
    var word = WORDS[(i + n2 * 3) % 6];
    cyl(g, 0.012, 0.012, 0.6, 0x7a6a5a, s * 4.5, 6.0, z, { seg: 3 });
    sign(g, word, 0xffffff, BLUE, 2.1, 0.62, s * 4.5, 5.4, z, { border: BLUE, tw: 384, th: 112 });
  });
}

function ground() { /* the meadow is the big slab below */ }

function groundSlab(g) { slab(g, 400, 400, 0x7fd05a, 0, -0.03, -190, { r: 1 }); }

// ---------- far away and moving ----------

function windmill() {
  var m = new THREE.Group();
  cone(m, 2.0, 6.5, 0xfff0d8, 0, 3.25, 0, { seg: 8 });
  cone(m, 2.3, 1.6, RED, 0, 7.2, 0, { seg: 8 });
  var rotor = new THREE.Group();
  for (var b = 0; b < 4; b++) {
    var bl = new THREE.Group();
    box(bl, 0.14, 4.4, 0.08, WOOD, 0, 2.4, 0);
    box(bl, 0.9, 3.2, 0.05, WHITE, 0.45, 2.6, 0);
    bl.rotation.z = b * Math.PI / 2;
    rotor.add(bl);
  }
  rotor.position.set(0, 6.4, 2.2);
  m.add(rotor);
  animated(rotor);
  spin(rotor, 'z', 0.7, 0);
  return m;
}

function tractor() {
  var t = new THREE.Group();
  box(t, 1.1, 0.9, 1.7, RED, 0, 1.0, 0.2);
  box(t, 1.0, 0.7, 0.7, 0xf4efe4, 0, 0.75, 1.1);
  box(t, 1.0, 1.1, 0.9, 0x9fd8f4, 0, 1.9, -0.3, { op: 0.6 });
  box(t, 1.1, 0.08, 1.0, RED, 0, 2.5, -0.3);
  [[-0.78, -0.4, 0.8], [0.78, -0.4, 0.8]].forEach(function (p) { cyl(t, p[2], p[2], 0.4, 0x2a2d3a, p[0], p[2], p[1], { rz: Math.PI / 2, seg: 12 }); cyl(t, 0.35, 0.35, 0.42, HAY, p[0], p[2], p[1], { rz: Math.PI / 2, seg: 8 }); });
  [[-0.7, 1.2], [0.7, 1.2]].forEach(function (p) { cyl(t, 0.42, 0.42, 0.3, 0x2a2d3a, p[0], 0.42, p[1], { rz: Math.PI / 2, seg: 10 }); cyl(t, 0.2, 0.2, 0.32, HAY, p[0], 0.42, p[1], { rz: Math.PI / 2, seg: 8 }); });
  cyl(t, 0.05, 0.05, 0.7, 0x333333, 0.3, 1.8, 0.8, { seg: 4 });
  // a farmer in a green hat
  ball(t, 0.2, 0xf2c9a0, 0, 2.0, -0.3, { seg: 6 });
  cone(t, 0.24, 0.25, 0x3a8a4a, 0, 2.28, -0.3, { seg: 6 });
  t.scale.setScalar(1.2);
  return t;
}

function church() {
  var c = new THREE.Group();
  box(c, 3.0, 3.0, 5.0, 0xfff6e4, 0, 1.5, 0);
  box(c, 3.3, 0.2, 5.3, 0xe8b87a, 0, 3.1, 0);
  cone(c, 2.2, 1.6, RED, 0, 3.9, 0, { seg: 4, ry: Math.PI / 4, sz: 1.5 });
  box(c, 1.5, 6.5, 1.5, 0xfff6e4, 0, 3.25, 3.0);
  ball(c, 1.1, 0x2fae8a, 0, 7.4, 3.0, { seg: 10, sy: 1.2 });
  ball(c, 0.55, 0x2fae8a, 0, 8.9, 3.0, { seg: 8, sy: 1.3 });
  cone(c, 0.18, 1.2, 0x2fae8a, 0, 9.9, 3.0, { seg: 6 });
  ball(c, 0.12, HAY, 0, 10.6, 3.0, { seg: 5 });
  c.scale.setScalar(1.8);
  return c;
}

function alps() {
  var a = new THREE.Group();
  var peaks = [[-70, 38, 17], [-50, 28, 14], [-28, 22, 11], [-4, 30, 13], [24, 24, 12], [48, 36, 16], [72, 26, 13], [92, 32, 15], [-92, 30, 14]];
  peaks.forEach(function (p) {
    cone(a, p[2], p[1], 0x8ab4e0, p[0], p[1] / 2, 0, { seg: 6 });
    cone(a, p[2] * 0.42, p[1] * 0.38, WHITE, p[0], p[1] * 0.81, 0, { seg: 6 });
  });
  return a;
}

function extras() {
  cloudBank(10, { seed: 6 });
  var mt = alps();
  mt.position.set(0, 0, -125);
  animated(mt);
  mover(mt, { k: 0.04, near: -90, far: -170 });
  var ch = church();
  ch.position.set(-22, 0, -90);
  animated(ch);
  mover(ch, { k: 0.12, near: -55, far: -140 });
  features(windmill, { x: -22, spacing: 64, count: 3, z0: -40 });
  var tr = tractor();
  tr.position.set(9.5, 0, -50);
  tr.rotation.y = Math.PI;
  animated(tr);
  mover(tr, { k: 0.6 });
  var tr2 = tractor();
  tr2.position.set(-9.5, 0, -100);
  tr2.rotation.y = Math.PI;
  animated(tr2);
  mover(tr2, { k: 0.6 });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: butterflyGeo(), count: 7, seed: 2 + i, colors: [0xffd23f, 0xff9a3f, 0xffffff], area: { x: [side * 4.8, side * 9], y: [1, 2.8], z: [-140, 8] }, k: 1, vx: [-0.3, 0.3], vz: [-0.5, 0.5], wobble: 0.5, flap: 0.9, scale: [1, 1.5], flat: true });
  });
  swarm({ geo: birdGeo(), count: 8, seed: 41, colors: [0x4a3a4a, 0x6a4a3a], area: { x: [-24, 24], y: [8, 14], z: [-140, 8] }, k: 0.3, vz: [-4, -2.5], face: true, flap: 0.5, scale: [1.2, 2] });
}

export var w_bavarian_farmyard = { id: 'w_bavarian_farmyard', indoor: false, bay: bay, center: center, arch: arch, ground: function (g) { ground(g); groundSlab(g); }, extras: extras };
