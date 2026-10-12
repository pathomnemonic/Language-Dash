/**
 * w_stroopwafel_factory.js — Stroopwafel Factory: a Dutch, candy-coloured factory line.
 *
 * The runner crosses a golden waffle-pattern floor between two conveyor belts that carry stroopwafels the whole way.
 * The walls are Delft-blue tiles under pink stripes, with windows onto tulip fields and windmills. Every 16 units
 * (four bays): a stack of fresh stroopwafels with a "Vers!" sign, overhead syrup vats dripping onto the belt beside
 * slim syrup tanks, wooden crates of tulips with a row of clogs, and a packing station of Delft-blue tins. Overhead
 * hang orange-white-blue bunting, pipes and lamps. Moving: the belt and its wafers, gears and windmills turning on the
 * walls, and rising bubbles and steam.
 */

import * as THREE from 'three';
import { box, cyl, ball, cone, extrude, starShape, combine, xform, canvasTex, floorPanel, ceilingPanel, wallPanel, sideCtx, slab, mat, bunting } from '../mapkit.js';
import { animated, features, spin, swarm, flow } from '../mapfx.js';
import { atlasTex, atlasQuad, fitText, roundRectPath } from './lullaby_clouds_atlas.js';

var H = 6.4;
var ORANGE = 0xff9a2a;
var BLUE = 0x2f6fd0;
var PINK = 0xff80a6;
var CARAMEL = 0x9a5a22;
var TEAL = 0x2ec4c9;
var YELLOW = 0xffd23f;
var RED = 0xe8402c;
var TULIPS = [RED, YELLOW, PINK, ORANGE, 0xffffff];

var SIGNS = ['Stroopwafels', 'Vers!', 'Welkom', 'Dankjewel', 'Alstublieft', 'Tulpen', 'Klompen', 'Molen', 'Gezellig', 'Lekker!', 'Proost', 'Hallo!', 'Siroop', 'Warm', 'Karamel', "Proef 'm!"];

// ---------- painted pictures ----------

function tile(ctx, x, y, kind) {
  ctx.fillStyle = '#fbfdff';
  ctx.fillRect(x, y, 64, 64);
  ctx.strokeStyle = '#7aa6e8'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, 62, 62);
  ctx.strokeStyle = '#2a62b8'; ctx.fillStyle = '#2a62b8'; ctx.lineWidth = 4;
  var cx = x + 32;
  var cy = y + 32;
  if (kind === 0) {
    // a tulip
    ctx.beginPath(); ctx.moveTo(cx, cy + 22); ctx.lineTo(cx, cy - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 12, cy - 18); ctx.quadraticCurveTo(cx - 14, cy + 2, cx, cy + 2); ctx.quadraticCurveTo(cx + 14, cy + 2, cx + 12, cy - 18); ctx.lineTo(cx + 5, cy - 8); ctx.lineTo(cx, cy - 20); ctx.lineTo(cx - 5, cy - 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, cy + 14); ctx.quadraticCurveTo(cx + 14, cy + 8, cx + 16, cy + 18); ctx.stroke();
  } else if (kind === 1) {
    // a windmill
    ctx.beginPath(); ctx.moveTo(cx - 10, cy + 22); ctx.lineTo(cx - 6, cy - 4); ctx.lineTo(cx + 6, cy - 4); ctx.lineTo(cx + 10, cy + 22); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3;
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + 0.4; ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + Math.cos(a) * 24, cy - 6 + Math.sin(a) * 24); ctx.stroke(); }
  } else {
    // a flower
    for (var p = 0; p < 5; p++) { var b = p * 1.2566; ctx.beginPath(); ctx.arc(cx + Math.cos(b) * 10, cy + Math.sin(b) * 10, 8, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = '#fbfdff'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 6.283); ctx.fill();
  }
}

function windowView(ctx, x, y, w, h, n) {
  // a window onto a tulip field with a windmill
  var sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#6fc0ff'); sky.addColorStop(1, '#d6f0ff');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  [[0.2, 0.2], [0.65, 0.12]].forEach(function (c) { ctx.beginPath(); ctx.arc(x + c[0] * w, y + c[1] * h, 9, 0, 6.283); ctx.arc(x + c[0] * w + 11, y + c[1] * h + 3, 7, 0, 6.283); ctx.fill(); });
  // windmill
  var mx = x + w * (0.3 + (n % 2) * 0.4);
  var my = y + h * 0.66;
  ctx.fillStyle = '#a05a30';
  ctx.beginPath(); ctx.moveTo(mx - 9, my + 8); ctx.lineTo(mx - 5, my - 22); ctx.lineTo(mx + 5, my - 22); ctx.lineTo(mx + 9, my + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8402c'; ctx.beginPath(); ctx.moveTo(mx - 7, my - 22); ctx.lineTo(mx, my - 32); ctx.lineTo(mx + 7, my - 22); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
  for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + 0.5 + n; ctx.beginPath(); ctx.moveTo(mx, my - 22); ctx.lineTo(mx + Math.cos(a) * 28, my - 22 + Math.sin(a) * 28); ctx.stroke(); }
  // tulip rows
  var rows = [['#ff4d5a', '#ffd23f'], ['#ff80a6', '#ffffff'], ['#ff9a2a', '#ff4d5a']][n % 3];
  for (var r = 0; r < 4; r++) {
    ctx.fillStyle = r % 2 ? '#4fc96b' : '#3fb85a';
    ctx.fillRect(x, y + h * 0.72 + r * (h * 0.07), w, h * 0.07 + 1);
    ctx.fillStyle = rows[r % 2];
    for (var t = 0; t < 14; t++) ctx.fillRect(x + 3 + t * (w / 14), y + h * 0.72 + r * (h * 0.07) + 1, 6, 5);
  }
}

function wallPicture() {
  // 16 x 6.4 units at 64 px: pink stripes above, four windows, a band of Delft-blue tiles at the foot
  return canvasTex('stroop_wall', 1024, 410, function (ctx, w, h) {
    ctx.fillStyle = '#ffe4ee';
    ctx.fillRect(0, 0, w, h);
    for (var s = 0; s < 32; s++) { ctx.fillStyle = s % 2 ? '#ffd0e0' : '#fff2f6'; ctx.fillRect(s * 32, 0, 32, h - 128); }
    ctx.fillStyle = '#ff9a2a'; ctx.fillRect(0, 0, w, 16);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 16, w, 8);
    ctx.fillStyle = '#2f6fd0'; ctx.fillRect(0, 24, w, 8);
    for (var i = 0; i < 4; i++) {
      var x = i * 256 + 62;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 8, 70, 148, 152);
      windowView(ctx, x, 78, 132, 136, i);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 63, 78, 6, 136); ctx.fillRect(x, 142, 132, 6);
    }
    ctx.fillStyle = '#ff80a6'; ctx.fillRect(0, h - 140, w, 12);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, h - 128, w, 128);
    for (var r = 0; r < 2; r++) for (var c = 0; c < 16; c++) tile(ctx, c * 64, h - 128 + r * 64, (c * 5 + r * 3) % 3);
  });
}

function floorPicture() {
  // 12 x 16 at 48 px: a golden waffle grid with a pink kerb each side
  return canvasTex('stroop_floor', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#e6a64a';
    ctx.fillRect(0, 0, w, h);
    for (var j = 0; j < 24; j++) {
      for (var i = 0; i < 18; i++) {
        var x = i * 32;
        var y = j * 32;
        ctx.fillStyle = '#f6c878'; ctx.fillRect(x + 4, y + 4, 24, 24);
        ctx.fillStyle = '#ffe2a8'; ctx.fillRect(x + 4, y + 4, 24, 4); ctx.fillRect(x + 4, y + 4, 4, 24);
        ctx.fillStyle = 'rgba(150,80,20,0.28)'; ctx.fillRect(x + 4, y + 24, 24, 4); ctx.fillRect(x + 24, y + 4, 4, 24);
      }
    }
    for (var s = 0; s < 32; s++) { ctx.fillStyle = s % 2 ? '#ffffff' : '#ff80a6'; ctx.fillRect(0, s * 24, 22, 24); ctx.fillRect(w - 22, s * 24, 22, 24); }
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    [-1.5, 1.5].forEach(function (lx) { ctx.fillRect(w / 2 + lx * 48 - 2, 0, 4, h); });
  });
}

function ceilingPicture() {
  // 11.6 x 16: orange, white and blue stripes with rows of lamps
  return canvasTex('stroop_ceiling', 464, 640, function (ctx, w, h) {
    for (var s = 0; s < 8; s++) { ctx.fillStyle = ['#ffd9a8', '#ffffff', '#cfe3ff', '#ffffff'][s % 4]; ctx.fillRect(s * (w / 8), 0, w / 8 + 1, h); }
    ctx.fillStyle = '#ffffff';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) { ctx.beginPath(); ctx.arc(w * (0.2 + c * 0.3), r * (h / 4) + 80, 16, 0, 6.283); ctx.fill(); }
  });
}

var _wafer = null;
function waferTex() {
  // the waffle grid on top of a stroopwafel
  return _wafer || (_wafer = canvasTex('stroop_wafer', 128, 128, function (ctx, w, h) {
    ctx.fillStyle = '#e8a850'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f6c070';
    for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) ctx.fillRect(i * 16 + 2, j * 16 + 2, 12, 12);
    ctx.fillStyle = 'rgba(120,60,10,0.35)';
    for (var k = 0; k < 8; k++) { ctx.fillRect(k * 16 + 13, 0, 3, h); ctx.fillRect(0, k * 16 + 13, w, 3); }
  }));
}

var _belt = null;
function beltTex() {
  // a rubber belt with ribs, one bay (4 units) long: it flows
  return _belt || (_belt = canvasTex('stroop_belt', 64, 256, function (ctx, w, h) {
    ctx.fillStyle = '#5a6a9a'; ctx.fillRect(0, 0, w, h);
    for (var r = 0; r < 16; r++) { ctx.fillStyle = r % 2 ? '#6f80b4' : '#4a5a8a'; ctx.fillRect(0, r * 16, w, 8); }
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 0, 5, h); ctx.fillRect(w - 5, 0, 5, h);
  }));
}

function signAtlas() {
  return atlasTex('stroop_signs', 4, 4, 256, 128, function (ctx, i, w, h) {
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, 6, 6, w - 12, h - 12, 20);
    ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#2f6fd0'; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ff9a2a';
    roundRectPath(ctx, 16, 16, w - 32, h - 32, 14);
    ctx.stroke();
    fitText(ctx, SIGNS[i], w / 2, h / 2 + 4, w - 70, 56, i % 2 ? '#e8402c' : '#2a62b8');
  });
}

function sign(g, S, idx, w, h, x, y, z, turn) {
  return atlasQuad(g, signAtlas(), 4, 4, idx % 16, w, h, x, y, z, { ry: S.turn + S.side * (turn === undefined ? 0.25 : turn) });
}

// ---------- pieces ----------

function waferStack(g, x, y, z, n, r) {
  var m = mat(0xffffff, { map: waferTex(), r: 0.7 });
  for (var i = 0; i < n; i++) {
    cyl(g, r, r, 0.07, 0xe8a850, x, y + 0.04 + i * 0.1, z, { seg: 10, mat: m, ry: i * 0.4 });
    cyl(g, r * 0.97, r * 0.97, 0.03, CARAMEL, x, y + 0.095 + i * 0.1, z, { seg: 10 });
  }
}

function belt(g, S, z) {
  var x = S.in(0.45);
  box(g, 0.9, 0.82, 4, 0x4a5a8a, x, 0.45, z);
  var top = slab(g, 0.78, 4, 0xffffff, x, 0.88, z, { mat: mat(0xffffff, { map: beltTex(), r: 0.9 }) });
  if (!beltTex()) top.material = mat(0x5a6a9a);
  box(g, 0.06, 0.12, 4, YELLOW, x - 0.42 * S.side * -1, 0.9, z);
  box(g, 0.06, 0.12, 4, YELLOW, x + 0.42 * S.side * -1, 0.9, z);
  for (var i = 0; i < 2; i++) { box(g, 0.7, 0.06, 0.08, 0xffd23f, x, 0.04, z - 1.2 + i * 2.4); }
}

function pipeRun(g, S, z, c) {
  var x = S.in(0.15);
  cyl(g, 0.11, 0.11, 4, c, x, 5.4, z, { rx: Math.PI / 2, seg: 8 });
  cyl(g, 0.15, 0.15, 0.14, 0xffffff, x, 5.4, z - 1.9, { rx: Math.PI / 2, seg: 8 });
  cyl(g, 0.15, 0.15, 0.14, 0xffffff, x, 5.4, z + 1.9, { rx: Math.PI / 2, seg: 8 });
  cyl(g, 0.15, 0.15, 0.14, 0xffffff, x, 5.4, z, { rx: Math.PI / 2, seg: 8 });
}

function waferScene(g, S, z) {
  var x = S.in(0.15) - S.side * 0.0;
  // behind the belt: a tower of fresh wafers and a big sign
  waferStack(g, S.in(0.8), 0, z - 1.0, 10, 0.4);
  waferStack(g, S.in(0.8), 0, z + 0.2, 6, 0.4);
  waferStack(g, S.in(0.8), 0, z + 1.3, 4, 0.4);
  sign(g, S, 0, 2.2, 1.1, S.in(0.35), 3.4, z - 0.2);
  sign(g, S, 1, 1.4, 0.7, S.in(0.35), 2.45, z + 1.4, 0.4);
  // a hanging oven hood over the belt
  box(g, 1.3, 0.12, 2.2, 0xff9a2a, S.in(0.0) - S.side * 0.4, 2.35, z - 1.0);
  cone(g, 0.9, 0.9, 0xff9a2a, x, 5.0, z - 1.0, { seg: 4, ry: Math.PI / 4 });
}

function syrupScene(g, S, z) {
  // slim syrup tanks against the wall, each with a dome, a gauge and a window of amber syrup
  [-1.1, 1.1].forEach(function (dz, i) {
    var x = S.in(0.9);
    var c = i ? 0xff80a6 : 0x5fd0f0;
    cyl(g, 0.4, 0.4, 2.4, c, x, 1.4, z + dz, { seg: 8 });
    ball(g, 0.4, 0xd88a30, x, 2.6, z + dz, { seg: 10, sy: 0.7 });
    cyl(g, 0.08, 0.08, 0.5, 0xffffff, x, 3.0, z + dz, { seg: 6 });
    box(g, 0.05, 1.1, 0.2, 0xe89a28, x - S.side * 0.4, 1.4, z + dz, { bulb: true });
    ball(g, 0.14, 0xffffff, x - S.side * 0.38, 2.15, z + dz + 0.2, { seg: 8, sz: 0.3 });
    for (var b = 0; b < 3; b++) ball(g, 0.07, 0xffc060, x - S.side * 0.1, 3.4 + b * 0.35, z + dz + (b - 1) * 0.1, { seg: 5, bulb: true });
  });
  // an overhead vat dripping syrup onto the belt
  var vx = S.in(0.9) - S.side * 0.3;
  ball(g, 0.9, 0xff9a2a, vx, 4.0, z, { seg: 9, sy: 0.9 });
  cyl(g, 0.95, 0.95, 0.12, 0xffffff, vx, 4.55, z, { seg: 9 });
  cone(g, 0.2, 0.5, 0xd88a30, vx - S.side * 0.3, 3.0, z, { seg: 6, rz: Math.PI });
  [0, 1].forEach(function (d) { ball(g, 0.07, 0xc87a20, vx - S.side * 0.3, 2.6 - d * 0.55, z, { seg: 5, sy: 1.4 }); });
  sign(g, S, 12, 1.6, 0.8, S.in(0.1), 5.0, z, 0.3);
  sign(g, S, 14, 1.2, 0.6, S.in(0.1), 2.4, z + 1.7, 0.4);
}

function clogs(g, x, y, z, ry, c) {
  // a wooden shoe: a long rounded body, a toe and a dark opening
  ball(g, 0.2, c, x, y + 0.16, z, { seg: 8, sy: 0.7, sz: 1.5, ry: ry });
  ball(g, 0.15, 0x3a2a1a, x, y + 0.26, z - 0.04, { seg: 6, sy: 0.3, sz: 0.9, ry: ry });
}

function tulipCrates(g, S, z) {
  for (var i = 0; i < 3; i++) {
    var zz = z - 1.2 + i * 1.2;
    var x = S.in(0.75);
    box(g, 0.9, 0.5, 1.0, 0xc98a52, x, 0.25, zz);
    box(g, 0.92, 0.07, 1.02, 0xe8b070, x, 0.52, zz);
    for (var t = 0; t < 7; t++) {
      var tx = x + ((t % 3) - 1) * 0.26;
      var tz = zz + (Math.floor(t / 3) - 0.8) * 0.3;
      cyl(g, 0.012, 0.012, 0.5, 0x3fb85a, tx, 0.85, tz, { seg: 3 });
      cone(g, 0.1, 0.24, TULIPS[(t + i) % 5], tx, 1.12, tz, { seg: 5, rz: Math.PI });
    }
  }
  // a stacked second layer, clogs on the floor in front of the crates
  box(g, 0.8, 0.5, 0.9, 0xc98a52, S.in(0.8), 0.78, z - 0.6);
  for (var t2 = 0; t2 < 5; t2++) { cyl(g, 0.012, 0.012, 0.45, 0x3fb85a, S.in(0.8) + (t2 % 2) * 0.2 - 0.1, 1.2, z - 0.8 + t2 * 0.12, { seg: 3 }); cone(g, 0.1, 0.24, TULIPS[t2], S.in(0.8) + (t2 % 2) * 0.2 - 0.1, 1.45, z - 0.8 + t2 * 0.12, { seg: 5, rz: Math.PI }); }
  [[-1.5, YELLOW], [-1.2, BLUE], [-0.9, RED], [1.4, BLUE], [1.7, YELLOW]].forEach(function (c, i) { clogs(g, S.in(0.35) - S.side * 0.0, 0, z + c[0] * 1.0 + 0.3, S.turn - 1.5708 * (i % 2 ? 0.2 : -0.2), c[1]); });
  sign(g, S, 5, 1.7, 0.85, S.in(0.1), 3.4, z - 0.7, 0.3);
  sign(g, S, 6, 1.5, 0.75, S.in(0.1), 2.5, z + 1.3, 0.4);
}

function tinStation(g, S, z) {
  // stacks of Delft-blue stroopwafel tins
  var tinMat = mat(0xffffff, { map: tinTex(), r: 0.5 });
  [[-1.2, 4], [-0.2, 3], [0.8, 5], [1.7, 2]].forEach(function (p, i) {
    for (var h = 0; h < p[1]; h++) cyl(g, 0.38, 0.38, 0.32, 0xffffff, S.in(0.8), 0.17 + h * 0.34, z + p[0], { seg: 10, mat: tinMat });
    cyl(g, 0.4, 0.4, 0.05, i % 2 ? RED : ORANGE, S.in(0.8), 0.19 + p[1] * 0.34, z + p[0], { seg: 10 });
  });
  sign(g, S, 3, 1.7, 0.85, S.in(0.1), 3.5, z - 0.5, 0.3);
  sign(g, S, 9, 1.4, 0.7, S.in(0.1), 2.5, z + 1.4, 0.4);
}

var _tin = null;
function tinTex() {
  // a tin with a Delft-blue band and a white tulip
  return _tin || (_tin = canvasTex('stroop_tin', 128, 64, function (ctx, w, h) {
    ctx.fillStyle = '#2f6fd0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < 4; i++) { var cx = i * 32 + 16; ctx.beginPath(); ctx.arc(cx, 32, 12, 0, 6.283); ctx.fill(); ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); ctx.arc(cx, 32, 6, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffffff'; }
    ctx.fillStyle = '#ff9a2a'; ctx.fillRect(0, 0, w, 6); ctx.fillRect(0, h - 6, w, 6);
  }));
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(), side, z, H, 0.0, { r: 0.9 });
  belt(g, S, z);
  pipeRun(g, S, z, [YELLOW, TEAL, PINK, ORANGE][k]);
  if (k === 0) waferScene(g, S, z);
  else if (k === 1) syrupScene(g, S, z);
  else if (k === 2) tulipCrates(g, S, z);
  else tinStation(g, S, z);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12);
  ceilingPanel(g, ceilingPicture(), z, 11.6, H);
}

function arch(g, z, i) {
  // orange, white and blue bunting across the factory, with a pendant lamp at each side
  g.add(bunting(10.4, [ORANGE, 0xffffff, BLUE], 0.5, H - 0.7, z, 0.55));
  [-1, 1].forEach(function (s) {
    cyl(g, 0.02, 0.02, 0.9, 0xffffff, s * 3.4, H - 0.5, z, { seg: 4 });
    ball(g, 0.3, 0xfff2b8, s * 3.4, H - 1.15, z, { seg: 8, bulb: true });
    cone(g, 0.45, 0.3, ORANGE, s * 3.4, H - 0.85, z, { seg: 8 });
  });
  cyl(g, 0.05, 0.05, 10.8, 0xffffff, 0, H - 0.1, z, { rz: Math.PI / 2, seg: 5 });
  extrude(g, starShape(0.3, 0.14, 5), 0.05, YELLOW, 0, H - 1.3, z, { bulb: true });
}

// ---------- the things that move ----------

function makeGear(r, c1, c2, teeth) {
  var rig = new THREE.Group();
  cyl(rig, r, r, 0.3, c1, 0, 0, 0, { rx: Math.PI / 2, seg: 14 });
  cyl(rig, r * 0.5, r * 0.5, 0.36, c2, 0, 0, 0, { rx: Math.PI / 2, seg: 10 });
  cyl(rig, r * 0.15, r * 0.15, 0.5, 0xffffff, 0, 0, 0, { rx: Math.PI / 2, seg: 6 });
  for (var i = 0; i < teeth; i++) {
    var a = (i / teeth) * Math.PI * 2;
    box(rig, r * 0.3, r * 0.26, 0.3, c1, Math.cos(a) * r * 1.07, Math.sin(a) * r * 1.07, 0, { rz: a });
  }
  return animated(rig);
}

function wallGear(side) {
  return function (i) {
    var outer = new THREE.Group();
    var cols = [[PINK, YELLOW], [TEAL, ORANGE], [YELLOW, BLUE]][i % 3];
    var r = 1.1 + (i % 2) * 0.35;
    var rig = makeGear(r, cols[0], cols[1], 8);
    rig.position.set(0, 3.6 + (i % 2) * 0.4, 0.2);
    outer.add(rig);
    spin(rig, 'z', (i % 2 ? -1 : 1) * side * 0.5);
    // a smaller gear meshing with it
    var small = makeGear(r * 0.55, cols[1], cols[0], 6);
    small.position.set(r * 1.6, rig.position.y + r * 0.5, 0.2);
    outer.add(small);
    spin(small, 'z', (i % 2 ? 1 : -1) * side * 0.9);
    outer.rotation.y = 0;
    return outer;
  };
}

function wallWindmill(i) {
  var outer = new THREE.Group();
  var body = new THREE.Group();
  cyl(body, 0.5, 0.85, 2.6, 0xfff1d6, 0, 1.3, 0.2, { seg: 8 });
  cyl(body, 0.52, 0.52, 0.3, BLUE, 0, 1.4, 0.2, { seg: 8 });
  cone(body, 0.62, 0.9, RED, 0, 3.05, 0.2, { seg: 8 });
  box(body, 0.4, 0.6, 0.1, BLUE, 0, 0.5, 0.65);
  animated(body);
  outer.add(body);
  var sails = new THREE.Group();
  for (var s = 0; s < 4; s++) {
    var a = (s / 4) * Math.PI * 2;
    var ca = Math.cos(a);
    var sa = Math.sin(a);
    box(sails, 0.1, 2.5, 0.1, 0xc98a52, ca * 1.25, sa * 1.25, 0, { rz: a - Math.PI / 2 });
    box(sails, 0.55, 1.7, 0.04, i % 2 ? 0xffffff : 0xfff1d6, ca * 1.5 - sa * 0.3, sa * 1.5 + ca * 0.3, 0.02, { rz: a - Math.PI / 2 });
  }
  ball(sails, 0.17, RED, 0, 0, 0.1, { seg: 6 });
  animated(sails);
  sails.position.set(0, 2.9, 0.75);
  outer.add(sails);
  spin(sails, 'z', 0.55);
  return outer;
}

function extras() {
  // the belts flow, and the wafers on them ride along
  flow(beltTex(), 0, 0.3);
  var wafer = combine([
    { geo: new THREE.CylinderGeometry(0.26, 0.26, 0.05, 8), color: 0xf2b860 },
    { geo: new THREE.CylinderGeometry(0.25, 0.25, 0.03, 8), color: 0x8a4a1a, matrix: xform(0, 0.04, 0) },
    { geo: new THREE.CylinderGeometry(0.26, 0.26, 0.05, 8), color: 0xe8a850, matrix: xform(0, 0.08, 0) },
    { geo: new THREE.BoxGeometry(0.4, 0.02, 0.03), color: 0xb8742a, matrix: xform(0, 0.12, 0.07) },
    { geo: new THREE.BoxGeometry(0.4, 0.02, 0.03), color: 0xb8742a, matrix: xform(0, 0.12, -0.07) },
    { geo: new THREE.BoxGeometry(0.03, 0.02, 0.4), color: 0xb8742a, matrix: xform(0.07, 0.12, 0) },
    { geo: new THREE.BoxGeometry(0.03, 0.02, 0.4), color: 0xb8742a, matrix: xform(-0.07, 0.12, 0) }
  ]);
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: wafer, count: 28, seed: 5 + i * 3, colors: [0xffffff], area: { x: [side * 4.85, side * 4.85], y: [0.93, 0.93], z: [-145, 8] }, k: 1, vz: [-1.2, -1.2], scale: [1.0, 1.0] });
  });
  features(wallGear(-1), { x: -5.25, z0: -26, spacing: 38, count: 4, yaw: Math.PI / 2 });
  features(wallGear(1), { x: 5.25, z0: -45, spacing: 38, count: 4, yaw: -Math.PI / 2 });
  features(wallWindmill, { x: -5.2, z0: -16, spacing: 48, count: 3, yaw: Math.PI / 2 });
  features(wallWindmill, { x: 5.2, z0: -40, spacing: 48, count: 3, yaw: -Math.PI / 2 });
  // steam and sweet bubbles rising beside the line
  var puff = combine([{ geo: new THREE.SphereGeometry(0.22, 6, 4), color: 0xffffff }]);
  var puffMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: puff, material: puffMat, count: 14, seed: 40 + i, colors: [0xffffff, 0xffe6c0, 0xffd0e0], area: { x: [side * 4.6, side * 5.3], y: [1.2, 5.8], z: [-135, 8] }, k: 1, vy: [0.4, 0.9], wobble: 0.12, scale: [0.5, 1.3] });
  });
}

export var w_stroopwafel_factory = { id: 'w_stroopwafel_factory', indoor: true, bay: bay, center: center, arch: arch, extras: extras };
