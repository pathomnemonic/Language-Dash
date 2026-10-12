/**
 * w_taipei_bubble_tea.js — Taipei Bubble Tea Plaza: a jelly-bright night-market plaza.
 *
 * Between rows of pastel shopfronts (a Taipei 101 skyline, vertical neon signs in Traditional Chinese, strings of paper
 * lanterns) the plaza is tiled like jelly candy. Every 16 units: three giant bubble-tea cups with straws, a bouncing
 * castle with jelly blobs hopping on top, a tea stall with a heap of tapioca pearls under a striped awning, and a
 * fruit-tea corner with a tower of cups and a neon "你好". Overhead: a straw-coloured arch with lantern banners and neon
 * greetings. Moving: hopping jellies, rising bubbles, bobbing lanterns, sparkles.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, quad, combine, xform, bulb, sign, floorPanel, ceilingPanel, wallPanel, sideCtx, animate, currentWorld, keepSeparate
} from '../mapkit.js';
import { swarm, shimmer } from '../mapfx.js';
import { wallPicture, floorPicture, ceilingPicture, bannerPicture, cupTex, pearlHeap, fruitSlice } from './taipei_art.js';

var H = 6.4;
var PINK = 0xff8fb8;
var TEAL = 0x4ed8c8;
var YELLOW = 0xffd84a;
var ORANGE = 0xffa24a;
var SKY = 0x7ec8ff;
var CREAM = 0xfff6ea;
var PEARL = 0x5a3a2a;
var PASTELS = [PINK, TEAL, YELLOW, SKY, ORANGE, 0xb6ee8a];
var STRAW = [0xff6fa0, 0xffd23f, 0x2fd9c6, 0xff8a5a];

var _decal = {};
function decalMat(tex) {
  if (!_decal[tex.uuid]) _decal[tex.uuid] = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide });
  return _decal[tex.uuid];
}

function cutout(g, tex, w, h, x, y, z, ry) {
  if (!tex) return null;
  return quad(g, w, h, 0xffffff, x, y, z, { ry: ry, mat: decalMat(tex) });
}

/** A giant bubble-tea cup standing on the ground at `off` in from the wall, with a lid, a straw and pearls at its foot. */
function cup(g, S, off, z, h, r, flavor) {
  var x = S.in(off);
  var tex = cupTex(flavor);
  // the picture wraps round the cup; u = 0.5 is turned to face the runner
  cyl(g, r, r * 0.74, h, tex ? 0xffffff : [0xd9a877, 0xa7d77a, 0xff9fbd, 0xffcf4a][flavor % 4], x, h / 2, z, { seg: 14, map: tex || undefined, ry: -S.turn, r: 0.35 });
  cyl(g, r * 1.06, r * 1.06, 0.1, CREAM, x, h - 0.02, z, { seg: 14 });
  ball(g, r * 1.0, CREAM, x, h + 0.02, z, { seg: 12, sy: 0.4 });
  // a straw of three stripes, leaning back toward the wall
  var sx = x + S.side * 0.1;
  var lean = -S.side * 0.14;
  [[0, 0xffffff], [1, STRAW[flavor % 4]], [2, 0xffffff]].forEach(function (p) {
    cyl(g, 0.06, 0.06, 0.5, p[1], sx + S.side * 0.03 * p[0], h + 0.35 + p[0] * 0.48, z, { seg: 5, rz: lean });
  });
  // pearls that rolled out
  for (var i = 0; i < 4; i++) ball(g, 0.09, PEARL, x + S.side * -0.5 + (i % 2) * S.side * 0.12, 0.09, z + (i - 1.5) * 0.22, { seg: 5 });
}

function cups(g, S, z) {
  cup(g, S, 0.5, z - 1.15, 2.7, 0.58, 0);
  cup(g, S, 0.5, z + 0.5, 2.0, 0.5, 2);
  cup(g, S, 0.5, z + 1.5, 1.35, 0.4, 3);
  // a big straw-coloured sign on the wall above
  sign(g, '珍珠奶茶', 0xff8fb8, 0xffffff, 2.8, 0.78, S.in(0.1), 4.9, z - 0.2, { ry: S.turn, border: 0xffffff });
}

function castle(g, S, z) {
  var x = S.in(0.5);
  // the inflated body, in pastel pink with yellow and teal posts
  box(g, 0.9, 1.1, 3.5, 0xff9ec4, x, 0.55, z, { r: 0.3 });
  box(g, 0.95, 0.12, 3.55, 0xffe27a, x, 1.12, z, { r: 0.3 });
  for (var i = 0; i < 5; i++) {
    var pz = z - 1.5 + i * 0.75;
    cyl(g, 0.18, 0.18, 1.6, i % 2 ? TEAL : YELLOW, S.in(0.1) + S.side * -0.05 + (S.side < 0 ? 0.75 : -0.75), 0.8, pz, { seg: 7 });
    ball(g, 0.22, i % 2 ? TEAL : YELLOW, S.in(0.1) + S.side * -0.05 + (S.side < 0 ? 0.75 : -0.75), 1.65, pz, { seg: 6 });
  }
  // two round towers with cone caps and pennants
  [-1.35, 1.35].forEach(function (dz, i) {
    cyl(g, 0.4, 0.42, 2.3, i ? SKY : PINK, x, 1.15, z + dz, { seg: 9 });
    cone(g, 0.5, 0.75, i ? PINK : YELLOW, x, 2.65, z + dz, { seg: 9 });
    cyl(g, 0.015, 0.015, 0.5, 0x888899, x, 3.2, z + dz, { seg: 3 });
    cone(g, 0.12, 0.3, 0xff5a5a, x, 3.3, z + dz + 0.1, { seg: 3, rx: Math.PI / 2 });
  });
  // the door: a dark arch with a star over it
  box(g, 0.04, 0.9, 0.8, 0x6a3f8a, x + S.side * -0.46, 0.5, z, { r: 0.5 });
  cyl(g, 0.4, 0.4, 0.04, 0x6a3f8a, x + S.side * -0.46, 0.95, z, { rz: Math.PI / 2, seg: 8 });
  box(g, 0.05, 0.22, 1.0, 0xfff6ea, x + S.side * -0.48, 1.4, z);
  sign(g, '你好!', 0x4ed8c8, 0xffffff, 1.9, 0.8, S.in(0.12), 4.4, z, { ry: S.turn, border: 0xffffff });
}

function stall(g, S, z) {
  var x = S.in(0.5);
  // a counter under a striped awning, cups lined up for sale
  box(g, 0.9, 1.0, 3.3, TEAL, x, 0.5, z);
  box(g, 0.96, 0.08, 3.36, CREAM, x, 1.04, z);
  box(g, 0.04, 0.3, 3.3, PINK, x + S.side * -0.46, 0.7, z);
  for (var s = 0; s < 8; s++) box(g, 1.3, 0.07, 0.42, s % 2 ? 0xffffff : PINK, S.in(0.18), 2.6 + (s % 2) * 0.0, z - 1.5 + s * 0.43, { rz: S.side * 0.18, ry: 0 });
  [-1.4, 1.4].forEach(function (dz) { cyl(g, 0.04, 0.04, 1.6, 0xd9a86a, S.in(0.7), 1.8, z + dz, { seg: 4 }); });
  for (var c = 0; c < 6; c++) {
    cyl(g, 0.15, 0.1, 0.34, [0xd9a877, 0xa7d77a, 0xff9fbd, 0xffcf4a][c % 4], S.in(0.5), 1.25, z - 1.2 + c * 0.48, { seg: 7 });
    ball(g, 0.15, CREAM, S.in(0.5), 1.44, z - 1.2 + c * 0.48, { seg: 6, sy: 0.4 });
    cyl(g, 0.02, 0.02, 0.36, STRAW[c % 4], S.in(0.5), 1.62, z - 1.2 + c * 0.48, { seg: 3 });
  }
  // a heap of tapioca pearls beside it
  cutout(g, pearlHeap(256, 220), 1.6, 1.4, S.in(0.62), 0.7 + 0.0, z + 1.9, S.turn);
  sign(g, '半糖少冰', 0xff8fb8, 0xffffff, 2.5, 0.7, S.in(0.1), 4.2, z, { ry: S.turn, border: 0xffffff });
}

function fruit(g, S, z) {
  var x = S.in(0.5);
  box(g, 0.8, 0.9, 2.2, 0xffb347, x, 0.45, z - 0.9);
  box(g, 0.86, 0.08, 2.26, CREAM, x, 0.94, z - 0.9);
  // a tower of cups, three high
  var n = 0;
  [[3, 0], [2, 1], [1, 2]].forEach(function (row) {
    for (var i = 0; i < row[0]; i++) {
      var cz = z - 0.9 + (i - (row[0] - 1) / 2) * 0.46;
      cyl(g, 0.2, 0.14, 0.42, [0xd9a877, 0xa7d77a, 0xff9fbd, 0xffcf4a][n++ % 4], x, 1.0 + row[1] * 0.42 + 0.21, cz, { seg: 8 });
      ball(g, 0.2, CREAM, x, 1.0 + row[1] * 0.42 + 0.44, cz, { seg: 6, sy: 0.35 });
    }
  });
  // giant fruit: a strawberry, and slices of orange, lemon and kiwi
  var sz = z + 1.1;
  ball(g, 0.5, 0xff5a6a, S.in(0.5), 0.52, sz, { seg: 9, sy: 1.1 });
  cone(g, 0.3, 0.2, 0x4cb85a, S.in(0.5), 1.1, sz, { seg: 5, rx: Math.PI });
  for (var s = 0; s < 6; s++) ball(g, 0.04, 0xfff3a0, S.in(0.5) + S.side * -0.42, 0.35 + (s % 3) * 0.2, sz + (s < 3 ? -0.15 : 0.15), { seg: 4 });
  [0, 1, 2].forEach(function (i) { cutout(g, fruitSlice(i), 0.8, 0.8, S.in(0.12), 2.5 + (i % 2) * 0.35, z - 1.4 + i * 1.3, S.turn); });
  sign(g, '好喝!', 0xffd84a, 0x7a2a5a, 2.0, 0.76, S.in(0.12), 4.6, z, { ry: S.turn, border: 0xff8fb8 });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(side), side, z, H, 0.0, { r: 0.9, color: 0xc8f2e4 });
  if (k === 0) cups(g, S, z);
  else if (k === 1) castle(g, S, z);
  else if (k === 2) stall(g, S, z);
  else fruit(g, S, z);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12, { color: 0xd9f6ea });
  ceilingPanel(g, ceilingPicture(), z, 11.6, H, { color: 0xa8ecde });
}

// ---------- overhead ----------

var _lamp = null;
function lampMat() { return _lamp || (_lamp = bulb(0xfff6c0, { op: 0.95 })); }

var GREET = [['你好', 0xff8fb8], ['謝謝', 0x4ed8c8], ['歡迎光臨', 0xffd84a], ['珍珠奶茶', 0x7ec8ff], ['好喝', 0xff8fb8], ['夜市', 0x4ed8c8]];

function arch(g, z, i) {
  // a row of lanterns right across the plaza
  var tex = bannerPicture(i % 3);
  if (tex) quad(g, 10.4, 2.2, 0xffffff, 0, 5.1, z, { mat: decalMat(tex) });
  // a straw-striped arch behind it
  for (var n = 0; n < 5; n++) {
    ring(g, 5.3, 0.1, [PINK, 0xffffff, TEAL, 0xffffff, YELLOW][(n + i) % 5], 0, 0.5, z - 0.1, { arc: (28 * Math.PI) / 180, seg: 6, tube: 5, rz: ((20 + n * 28) * Math.PI) / 180, r: 0.4 });
  }
  // neon greetings hanging at the sides
  [-1, 1].forEach(function (s, j) {
    var gt = GREET[(i + j * 3) % 6];
    sign(g, gt[0], gt[1], 0xffffff, gt[0].length > 2 ? 2.0 : 1.5, 0.7, s * 3.6, 3.9, z + 0.1, { border: 0xffffff });
    cyl(g, 0.012, 0.012, 1.0, 0x8a7a8a, s * 3.6 - 0.6, 4.6, z + 0.1, { seg: 3 });
    cyl(g, 0.012, 0.012, 1.0, 0x8a7a8a, s * 3.6 + 0.6, 4.6, z + 0.1, { seg: 3 });
  });
  for (var b = 0; b < 12; b++) {
    var u = b / 11;
    ball(g, 0.075, 0xfff6c0, -4.9 + u * 9.8, 6.1 - Math.sin(u * Math.PI) * 0.3, z + 0.05, { seg: 4, mat: lampMat() });
  }
}

// ---------- the things that move ----------

var HOP_N = 10;
var HOP_SPAN = HOP_N * 16;

/** Jelly blobs hopping on the bouncing castles (one at each castle, both walls), scrolling with the world. */
function hoppers() {
  var world = currentWorld();
  var geo = combine([
    { geo: new THREE.SphereGeometry(0.3, 9, 7), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 1, 0.9, 1) },
    { geo: new THREE.SphereGeometry(0.05, 4, 3), color: 0x3a2540, matrix: xform(-0.11, 0.07, 0.27) },
    { geo: new THREE.SphereGeometry(0.05, 4, 3), color: 0x3a2540, matrix: xform(0.11, 0.07, 0.27) }
  ]);
  var material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, envMapIntensity: 0.6 });
  var count = HOP_N * 2;
  var mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;
  mesh.userData.noMerge = true;
  mesh.userData.swarmCount = count;
  var items = [];
  var tint = new THREE.Color();
  for (var i = 0; i < count; i++) {
    var side = i % 2 ? 1 : -1;
    var n = Math.floor(i / 2);
    items.push({ side: side, z: 4 - n * 16, ph: i * 1.7 });
    tint.set(PASTELS[i % PASTELS.length]);
    mesh.setColorAt(i, tint);
  }
  var dummy = new THREE.Object3D();
  var write = function (t, dt, move) {
    for (var j = 0; j < count; j++) {
      var it = items[j];
      it.z += move;
      if (it.z > 20) it.z -= HOP_SPAN;
      var hop = Math.abs(Math.sin(t * 3.2 + it.ph));
      dummy.position.set(it.side * 4.95, 1.68 + hop * 0.85, it.z + Math.sin(t * 1.1 + it.ph) * 0.9);
      dummy.rotation.set(0, it.side < 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      dummy.scale.set(1 + (0.18 * (1 - hop)), 1 - 0.2 * (1 - hop) + 0.2 * hop, 1 + (0.18 * (1 - hop)));
      dummy.updateMatrix();
      mesh.setMatrixAt(j, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  write(0, 0, 0);
  animate(write);
  keepSeparate(mesh);
  if (world && world.movers) world.movers.add(mesh);
}

function lanternGeo() {
  return combine([
    { geo: new THREE.SphereGeometry(0.3, 8, 6), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 0.9, 1, 0.9) },
    { geo: new THREE.CylinderGeometry(0.13, 0.13, 0.06, 6), color: 0xffd84a, matrix: xform(0, 0.31, 0) },
    { geo: new THREE.CylinderGeometry(0.13, 0.13, 0.06, 6), color: 0xffd84a, matrix: xform(0, -0.31, 0) },
    { geo: new THREE.CylinderGeometry(0.01, 0.01, 0.9, 3), color: 0xffd84a, matrix: xform(0, -0.8, 0) }
  ]);
}

function extras() {
  hoppers();
  var bubbleMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false });
  var pearlGeo = combine([{ geo: new THREE.SphereGeometry(0.2, 8, 6), color: 0xffffff }]);
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: pearlGeo, material: bubbleMat, count: 14, seed: 90 + i * 5, colors: [0xffd0e6, 0xbff5e6, 0xfff2b0, 0xc4e4ff], area: { x: [side * 4.5, side * 5.2], y: [0.6, 5.8], z: [-140, 8] }, k: 1, vy: [0.35, 0.8], wobble: 0.15, scale: [0.5, 1.4] });
    swarm({ geo: lanternGeo(), count: 8, seed: 20 + i * 11, colors: [0xff5a5a, 0xff9ec4, 0xffd84a, 0x7fe3cf], area: { x: [side * 4.5, side * 5.1], y: [3.2, 5.2], z: [-140, 8] }, k: 1, wobble: 0.15, scale: [0.9, 1.3] });
  });
  shimmer(lampMat(), 0.75, 0.25, 2.6, 0);
}

export var w_taipei_bubble_tea = {
  id: 'w_taipei_bubble_tea',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
