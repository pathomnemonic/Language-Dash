/**
 * w_vienna_prater_fair.js — Vienna Prater Fair: a fairground boardwalk under the giant Riesenrad.
 *
 * The runner follows a plank boardwalk between striped booths. Every 16 units (four bays): a ticket booth, a popcorn
 * cart, a gingerbread-heart stall and a ball-toss game, each with a sign in German ("Willkommen", "Servus!", "Popcorn"),
 * lamp posts strung with bulbs and chestnut trees behind. Rising over the fair: the red-gondola Riesenrad turning
 * slowly, a candy-striped carousel and a drop tower. Overhead hang red-and-white pennants and strings of lights.
 * Moving: the three rides, balloons, confetti and drifting clouds.
 */

import * as THREE from 'three';
import { box, cyl, ball, cone, ring, extrude, heartShape, starShape, combine, canvasTex, stripeTex, floorPanel, sideCtx, slab, mat, bunting, keepSeparate, animate } from '../mapkit.js';
import { animated, features, spin, swarm, cloudBank } from '../mapfx.js';
import { tree } from '../mapprops.js';
import { atlasTex, atlasQuad, fitText, roundRectPath } from './lullaby_clouds_atlas.js';

var RED = 0xe8402c;
var CREAM = 0xfff1d6;
var YELLOW = 0xffd23f;
var BLUE = 0x3d8bff;
var GREEN = 0x3fd47a;
var ORANGE = 0xff9a1f;
var PINK = 0xff90b0;
var TEAL = 0x2ec4c9;
var FAIR = [RED, YELLOW, BLUE, GREEN, ORANGE, PINK, TEAL];

var SIGNS = ['Willkommen', 'Servus!', 'Popcorn', 'Tickets', 'Riesenrad', 'Zuckerwatte', 'Lebkuchen', 'Karussell', 'Prater', 'Würstel', 'Hallo!', 'Bitte', 'Danke', 'Gute Fahrt!', 'Eintritt', 'Grüß Gott'];

// ---------- painted pictures ----------

function boardwalk() {
  // 12 across, 16 along at 48 px: planks across the walkway, a candy-striped kerb each side, confetti
  return canvasTex('prater_floor', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#7fc8ff';
    ctx.fillRect(0, 0, w, h);
    var tones = ['#f2c88a', '#e8b878', '#f6d29a', '#ecc080'];
    for (var r = 0; r < 32; r++) {
      ctx.fillStyle = tones[r % 4];
      ctx.fillRect(30, r * 24 + 1, w - 60, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(30, r * 24 + 1, w - 60, 3);
      ctx.fillStyle = 'rgba(120,70,30,0.3)';
      ctx.fillRect(30 + ((r * 137) % (w - 80)), r * 24 + 1, 2, 22);
    }
    // red and white kerb
    for (var s = 0; s < 32; s++) {
      ctx.fillStyle = s % 2 ? '#ffffff' : '#e8402c';
      ctx.fillRect(0, s * 24, 30, 24);
      ctx.fillRect(w - 30, s * 24, 30, 24);
    }
    // confetti
    for (var c = 0; c < 80; c++) {
      ctx.fillStyle = ['#e8402c', '#ffd23f', '#3d8bff', '#3fd47a', '#ff90b0'][c % 5];
      ctx.save();
      ctx.translate(46 + (c * 83) % (w - 92), (c * 131) % h);
      ctx.rotate(c);
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [-1.5, 1.5].forEach(function (lx) { ctx.fillRect(w / 2 + lx * 48 - 2, 0, 4, h); });
  });
}

function signAtlas() {
  // 4 x 4 wooden fair signs, one word each
  return atlasTex('prater_signs', 4, 4, 256, 128, function (ctx, i, w, h) {
    var bgs = ['#e8402c', '#ffd23f', '#2f8de8', '#fff1d6'];
    var fgs = ['#fff6e0', '#a02818', '#ffffff', '#c8301c'];
    ctx.fillStyle = bgs[i % 4];
    roundRectPath(ctx, 6, 6, w - 12, h - 12, 22);
    ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.fillStyle = fgs[i % 4];
    [18, w - 18].forEach(function (x) { [18, h - 18].forEach(function (y) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.283); ctx.fill(); }); });
    fitText(ctx, SIGNS[i], w / 2, h / 2 + 4, w - 70, 58, fgs[i % 4]);
  });
}

function sign(g, S, idx, w, h, x, y, z, turn) {
  return atlasQuad(g, signAtlas(), 4, 4, idx % 16, w, h, x, y, z, { ry: S.turn + S.side * (turn === undefined ? 0.3 : turn) });
}

// ---------- the booths ----------

function stripes(c) { return stripeTex(c, 0xffffff, 6); }

function canopy(g, S, x, y, z, w, c) {
  // a pyramid roof with a ball on top
  cone(g, w * 0.7, 0.9, c, x, y, z, { seg: 4 });
  ball(g, 0.12, YELLOW, x, y + 0.55, z, { seg: 6 });
}

function ticketBooth(g, S, z) {
  var x = S.in(0.5);
  var fx = x - S.side * 0.66;
  box(g, 1.3, 1.5, 2.6, 0xffffff, x, 0.75, z, { map: stripes(RED) });
  box(g, 1.34, 0.1, 2.7, CREAM, x, 1.55, z);
  box(g, 1.2, 0.9, 2.5, CREAM, x, 2.05, z);
  box(g, 0.05, 0.5, 1.2, 0x7fd0ff, fx + S.side * 0.02, 2.1, z, { r: 0.2 });
  canopy(g, S, x, 2.95, z, 2.2, RED);
  sign(g, S, 3, 1.9, 0.95, fx - S.side * 0.02, 3.5, z, 0.3);
  sign(g, S, 0, 1.6, 0.8, fx - S.side * 0.1, 0.6, z + 1.6, 0.5);
}

function popcornCart(g, S, z) {
  var x = S.in(0.55);
  var fx = x - S.side * 0.6;
  box(g, 1.1, 0.9, 1.9, 0xffffff, x, 0.85, z, { map: stripes(YELLOW) });
  box(g, 1.2, 0.08, 2.0, RED, x, 1.34, z);
  // a glass dome of popcorn
  ball(g, 0.78, 0xdff4ff, x, 1.5, z, { seg: 10, sy: 0.85, mat: mat(0xdff4ff, { op: 0.28, r: 0.1 }) });
  for (var i = 0; i < 14; i++) {
    var a = i * 2.4;
    ball(g, 0.16, i % 3 ? 0xfff2b0 : 0xffe48a, x + Math.cos(a) * 0.4, 1.5 + (i % 4) * 0.12, z + Math.sin(a) * 0.6, { seg: 5 });
  }
  [-0.7, 0.7].forEach(function (dz) { cyl(g, 0.4, 0.4, 0.12, 0x3a3a48, x - S.side * 0.1, 0.4, z + dz, { rz: Math.PI / 2, seg: 10 }); });
  cyl(g, 0.04, 0.04, 2.0, 0xffffff, x, 2.35, z - 0.7, { seg: 4 });
  cone(g, 1.35, 0.6, RED, x, 3.35, z - 0.7, { seg: 8 });
  cone(g, 1.0, 0.45, 0xffffff, x, 3.45, z - 0.7, { seg: 8 });
  sign(g, S, 2, 1.5, 0.75, fx - S.side * 0.05, 2.3, z + 0.3, 0.4);
  // the tow bar
  box(g, 0.1, 0.1, 0.9, 0x555a66, x, 0.4, z + 1.4);
}

function heartStall(g, S, z) {
  var x = S.in(0.5);
  var fx = x - S.side * 0.66;
  box(g, 1.3, 1.1, 2.7, 0xffffff, x, 0.55, z, { map: stripes(BLUE) });
  box(g, 1.4, 0.1, 2.8, CREAM, x, 1.15, z);
  [-1.2, 1.2].forEach(function (dz) { cyl(g, 0.06, 0.06, 2.4, 0xffffff, fx, 2.3, z + dz, { seg: 5 }); });
  box(g, 1.5, 0.12, 2.9, RED, x - S.side * 0.1, 3.55, z, { rz: S.side * 0.25 });
  // gingerbread hearts hanging on ribbons
  var cols = [0xc2693a, 0xe8402c, 0xc2693a, 0xff90b0, 0xe8402c];
  for (var i = 0; i < 5; i++) {
    var zz = z - 1.05 + i * 0.52;
    cyl(g, 0.01, 0.01, 0.5, 0xffffff, fx, 3.2, zz, { seg: 3 });
    extrude(g, heartShape(0.7), 0.06, cols[i], fx, 2.75 - (i % 2) * 0.25, zz, { ry: S.turn + S.side * 0.3, curve: 4 });
  }
  sign(g, S, 6, 1.9, 0.95, fx - S.side * 0.02, 3.95, z, 0.3);
  // a pile of cotton candy
  [[-0.7, PINK], [0, 0xbfe0ff], [0.7, PINK]].forEach(function (c) { ball(g, 0.28, c[1], x - S.side * 0.2, 1.5, z + c[0] * 1.2, { seg: 7 }); cyl(g, 0.02, 0.02, 0.5, 0xffffff, x - S.side * 0.2, 1.3, z + c[0] * 1.2, { seg: 3 }); });
}

function ballToss(g, S, z) {
  var x = S.in(0.5);
  var fx = x - S.side * 0.66;
  box(g, 1.3, 1.1, 2.7, 0xffffff, x, 0.55, z, { map: stripes(GREEN) });
  box(g, 0.2, 2.1, 2.7, YELLOW, x + S.side * 0.55, 2.15, z);
  // prize shelf: teddies and balloons
  for (var i = 0; i < 4; i++) {
    var zz = z - 1.0 + i * 0.66;
    var c = [0xc98a52, 0xf2c9a0, 0x8a5a3a, 0xffd0a0][i];
    ball(g, 0.2, c, fx + S.side * 0.3, 1.45, zz, { seg: 7 });
    ball(g, 0.14, c, fx + S.side * 0.3, 1.78, zz, { seg: 6 });
    ball(g, 0.3, FAIR[(i + 2) % 7], fx + S.side * 0.3, 2.5 + (i % 2) * 0.3, zz, { seg: 8, sy: 1.15 });
    cyl(g, 0.008, 0.008, 0.6, 0xffffff, fx + S.side * 0.3, 2.1, zz, { seg: 3 });
  }
  box(g, 1.5, 0.1, 2.9, RED, x - S.side * 0.1, 3.25, z, { rz: S.side * 0.2 });
  sign(g, S, 10, 1.7, 0.85, fx - S.side * 0.05, 3.8, z, 0.3);
  // a pyramid of tin cans
  for (var r = 0; r < 3; r++) for (var c2 = 0; c2 < 3 - r; c2++) cyl(g, 0.12, 0.12, 0.2, FAIR[(r + c2) % 7], fx, 1.2 + r * 0.2, z - 0.3 * (2 - r) + c2 * 0.3 * 2 - 0.2 + r * 0.3, { seg: 6 });
}

function lampPost(g, S, z, c) {
  var x = S.in(0.9);
  cyl(g, 0.06, 0.08, 3.6, 0xffffff, x, 1.8, z, { seg: 6 });
  ball(g, 0.2, 0xfff2b0, x, 3.7, z, { seg: 7, bulb: true });
  // a string of bulbs running forward to the next post
  for (var i = 1; i < 6; i++) {
    var t = i / 6;
    var y = 3.55 - Math.sin(t * Math.PI) * 0.35;
    ball(g, 0.07, FAIR[(i + c) % 7], x, y, z - t * 4, { seg: 4, bulb: true });
  }
  cyl(g, 0.01, 0.01, 4.0, 0x6a6a7a, x, 3.4, z - 2, { rx: Math.PI / 2, seg: 3 });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  // a low red-and-white rail along the boardwalk
  box(g, 0.1, 0.1, 4, 0xffffff, S.in(0.0), 0.6, z);
  for (var p = 0; p < 2; p++) box(g, 0.12, 0.7, 0.12, p ? RED : 0xffffff, S.in(0.0), 0.35, z - 1 + p * 2);
  if (k === 0) ticketBooth(g, S, z - 0.4);
  else if (k === 1) popcornCart(g, S, z - 0.4);
  else if (k === 2) heartStall(g, S, z - 0.4);
  else ballToss(g, S, z - 0.4);
  lampPost(g, S, z + 1.8, k);
  // chestnut trees behind the stalls
  tree(g, S.out(3.2 + (k % 2) * 1.5), z + (k % 2 ? 0.8 : -0.8), 1.5 + (k % 3) * 0.2, k % 2 ? 0x5fcf4a : 0x3fb85a, 0x8a5a33);
}

function center(g, z) { floorPanel(g, boardwalk(), z, 12); }

function arch(g, z, i) {
  // red-and-white pennants across the fair, and a string of bulbs under them
  var b = bunting(10.4, [RED, 0xffffff, YELLOW], 0.5, 6.4, z, 0.6);
  g.add(b);
  for (var f = 0; f < 15; f++) {
    var t = f / 14;
    var x = -5.0 + t * 10;
    var y = 5.55 - Math.sin(t * Math.PI) * 0.4;
    ball(g, 0.09, FAIR[(f + i) % 7], x, y, z, { seg: 4, bulb: true });
  }
  [-1, 1].forEach(function (s) {
    extrude(g, starShape(0.34, 0.16, 5), 0.06, YELLOW, s * 4.6, 5.0, z, { bulb: true });
  });
}

function ground(g) {
  slab(g, 400, 400, 0x9ad884, 0, -0.02, -190, { r: 1 });
}

// ---------- the rides ----------

function makeWheel() {
  var R = 9;
  var hubY = R + 1.6;
  var rig = new THREE.Group();
  var white = 0xfff3e0;
  [-0.45, 0.45].forEach(function (zz) {
    ring(rig, R, 0.14, white, 0, 0, zz, { seg: 28, tube: 4 });
    ring(rig, R * 0.62, 0.08, white, 0, 0, zz, { seg: 22, tube: 4 });
  });
  for (var a = 0; a < 8; a++) {
    var ang = (a / 8) * Math.PI;
    [-0.45, 0.45].forEach(function (zz) {
      box(rig, 2 * R, 0.1, 0.1, white, 0, 0, zz, { rz: ang });
    });
  }
  ball(rig, 0.7, RED, 0, 0, 0, { seg: 8 });
  cyl(rig, 0.18, 0.18, 1.2, 0xffffff, 0, 0, 0, { rx: Math.PI / 2, seg: 6 });
  // the red gondolas on the rim
  for (var c = 0; c < 15; c++) {
    var ca = (c / 15) * Math.PI * 2;
    var cx = Math.cos(ca) * R;
    var cy = Math.sin(ca) * R;
    box(rig, 0.9, 1.1, 0.9, c % 3 === 0 ? 0xffd23f : RED, cx, cy - 0.55, 0, {});
    box(rig, 1.0, 0.12, 1.0, 0xfff3e0, cx, cy - 0.0, 0);
  }
  animated(rig);
  var outer = new THREE.Group();
  rig.position.y = hubY;
  outer.add(rig);
  var legs = new THREE.Group();
  [-0.8, 0.8].forEach(function (zz) {
    cyl(legs, 0.2, 0.28, hubY + 0.4, 0xfff3e0, -3.2, hubY / 2, zz, { rz: -0.32, seg: 6 });
    cyl(legs, 0.2, 0.28, hubY + 0.4, 0xfff3e0, 3.2, hubY / 2, zz, { rz: 0.32, seg: 6 });
  });
  box(legs, 8, 0.3, 2.2, RED, 0, 0.15, 0);
  animated(legs);
  outer.add(legs);
  spin(rig, 'z', 0.1);
  return outer;
}

function makeCarousel() {
  var g = new THREE.Group();
  var rig = new THREE.Group();
  cyl(rig, 3.4, 3.4, 0.3, 0xfff1d6, 0, 0.5, 0, { seg: 20 });
  cyl(rig, 3.5, 3.5, 0.12, RED, 0, 0.3, 0, { seg: 20 });
  cyl(rig, 0.35, 0.35, 4.2, 0xffd23f, 0, 2.5, 0, { seg: 8 });
  var roofMat = mat(0xffffff, { map: stripeTex(RED, 0xffffff, 8) });
  cone(rig, 4.0, 1.9, RED, 0, 5.4, 0, { seg: 16, mat: roofMat });
  ball(rig, 0.3, YELLOW, 0, 6.5, 0, { seg: 6 });
  var horse = [0xffffff, 0xf2c9a0, 0xc98a52, 0xff90b0];
  for (var i = 0; i < 8; i++) {
    var a = (i / 8) * Math.PI * 2;
    var x = Math.cos(a) * 2.5;
    var z = Math.sin(a) * 2.5;
    cyl(rig, 0.04, 0.04, 3.6, 0xffd23f, x, 2.4, z, { seg: 4 });
    ball(rig, 0.42, horse[i % 4], x, 1.8 + (i % 2) * 0.6, z, { seg: 7, sx: 0.6, sz: 1.2, ry: -a });
    ball(rig, 0.2, horse[i % 4], x + Math.cos(a + Math.PI / 2) * 0.35, 2.2 + (i % 2) * 0.6, z - Math.sin(a + Math.PI / 2) * -0.35, { seg: 6 });
    ball(rig, 0.1, YELLOW, Math.cos(a) * 3.95, 4.55, Math.sin(a) * 3.95, { seg: 4, bulb: true });
  }
  animated(rig);
  g.add(rig);
  spin(rig, 'y', 0.5);
  return g;
}

function makeDropTower() {
  var g = new THREE.Group();
  var col = new THREE.Group();
  box(col, 1.0, 13, 1.0, 0xffffff, 0, 6.5, 0, { map: stripeTex(RED, 0xfff1d6, 5) });
  box(col, 2.4, 0.7, 2.4, YELLOW, 0, 13.2, 0);
  cone(col, 1.6, 1.4, RED, 0, 14.2, 0, { seg: 4, ry: Math.PI / 4 });
  extrude(col, starShape(0.8, 0.36, 5), 0.2, YELLOW, 0, 15.6, 0, { bulb: true });
  box(col, 3.4, 0.3, 3.4, RED, 0, 0.15, 0);
  animated(col);
  g.add(col);
  var seat = new THREE.Group();
  ring(seat, 1.5, 0.22, 0xffd23f, 0, 0, 0, { rx: Math.PI / 2, seg: 14, tube: 5 });
  for (var i = 0; i < 6; i++) {
    var a = (i / 6) * Math.PI * 2;
    box(seat, 0.5, 0.35, 0.5, FAIR[i % 7], Math.cos(a) * 1.5, -0.4, Math.sin(a) * 1.5, { ry: -a });
  }
  animated(seat);
  seat.position.y = 3;
  g.add(seat);
  animate(function (t) {
    var u = (Math.sin(t * 0.45) + 1) / 2;
    seat.position.y = 2 + Math.pow(u, 1.6) * 10;
  });
  return keepSeparate(g);
}

function extras() {
  features(makeWheel, { x: -15, z0: -40, spacing: 70, count: 3, yaw: 0.3 });
  features(makeCarousel, { x: 11, z0: -22, spacing: 56, count: 3 });
  features(makeDropTower, { x: -10.5, z0: -62, spacing: 56, count: 3 });
  cloudBank(12, { seed: 31, area: { x: [-70, 70], y: [16, 32], z: [-150, 10] }, k: 0.12, scale: [3, 6] });
  // balloons drifting up beside the walkway
  var balloon = combine([
    { geo: new THREE.SphereGeometry(0.3, 9, 7), color: 0xffffff, matrix: new THREE.Matrix4().makeScale(1, 1.18, 1) },
    { geo: new THREE.CylinderGeometry(0.008, 0.008, 1.1, 3), color: 0xcccccc, matrix: new THREE.Matrix4().makeTranslation(0, -0.95, 0) }
  ]);
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: balloon, count: 8, seed: 5 + i * 11, colors: FAIR, area: { x: [side * 5.0, side * 9], y: [4.3, 9], z: [-140, 8] }, k: 1, vy: [0.1, 0.25], wobble: 0.2, scale: [1.0, 1.5] });
  });
  // confetti
  var conf = combine([{ geo: new THREE.PlaneGeometry(0.14, 0.08), color: 0xffffff }]);
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: conf, material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), count: 30, seed: 70 + i, colors: FAIR, area: { x: [side * 4.7, side * 8], y: [1, 7], z: [-130, 8] }, k: 1, vy: [-0.6, -0.3], wobble: 0.5, turn: 3, scale: [0.8, 1.6] });
  });
}

export var w_vienna_prater_fair = { id: 'w_vienna_prater_fair', indoor: false, bay: bay, center: center, arch: arch, ground: ground, extras: extras };
