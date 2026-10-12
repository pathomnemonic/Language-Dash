/**
 * w_calavera_fiesta.js — Calavera Fiesta: a friendly Dia de Muertos street party.
 *
 * Between two rows of painted, colourful houses (a church with twin bell towers, shopfronts with striped awnings, a
 * niche of marigolds) the street is strewn with marigold petals and strung with papel picado. Every 16 units: a DJ
 * calavera at the decks in front of a marigold sun, an ofrenda piled with marigolds, candles and sugar skulls, a
 * mariachi band of cartoon skeletons, and a taco cart with a sugar-skull statue. Overhead: banners of cut paper, swags
 * of marigolds, piñatas and paper lanterns. Moving: drifting petals, bobbing lanterns, fluttering paper butterflies.
 * Joyful, warm and a little cheeky: nothing here is scary.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, quad, extrude, starShape, combine, xform, mat, bulb, sign, floorPanel, ceilingPanel, wallPanel,
  sideCtx
} from '../mapkit.js';
import { swarm, shimmer } from '../mapfx.js';
import {
  wallPicture, floorPicture, ceilingPicture, bannerPicture, djStandee, mariachiStandee, catrinaStandee, standee, sugarSkull
} from './calavera_art.js';

var H = 6.4;
var ORANGE = 0xff9a1f;
var GOLD = 0xffc83d;
var PINK = 0xff5f93;
var TEAL = 0x27c3bd;
var CORAL = 0xff7a5c;
var LEAF = 0x4cb050;
var CREAM = 0xfff4dc;
var CART = [PINK, TEAL, GOLD, CORAL, LEAF];

// ---------- cut-outs: painted pictures standing in the world ----------

var _decal = {};
function decalMat(tex) {
  if (!_decal[tex.uuid]) {
    _decal[tex.uuid] = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide });
    _decal[tex.uuid].depthWrite = true;
  }
  return _decal[tex.uuid];
}

/** A painted cut-out standing at (x, y centre, z), facing the lane. Nothing is added where there is no canvas. */
function cutout(g, tex, w, h, x, y, z, ry, o) {
  if (!tex) return null;
  return quad(g, w, h, 0xffffff, x, y, z, Object.assign({ ry: ry, mat: decalMat(tex) }, o || {}));
}

function skullCard(hue) {
  return standee('card' + hue, 128, 140, function (ctx, w, h) { sugarSkull(ctx, w / 2, h * 0.42, 46, hue); });
}

function candle(g, x, y, z, col) {
  cyl(g, 0.05, 0.05, 0.3, col || CREAM, x, y + 0.15, z, { seg: 5 });
  ball(g, 0.05, 0xffe14a, x, y + 0.34, z, { seg: 4, bulb: true });
}

function flowerHeap(g, x, y, z, n, spread) {
  for (var i = 0; i < n; i++) {
    var a = i * 2.399;
    ball(g, 0.1 + (i % 3) * 0.015, i % 3 ? ORANGE : GOLD, x + Math.cos(a) * spread * 0.4, y + 0.08 + (i % 4) * 0.04, z + Math.sin(a) * spread, { seg: 5 });
  }
}

// ---------- the four bays ----------

function dj(g, S, z) {
  var x = S.in(0.45);
  // the stage: a turquoise riser with a marigold stripe
  box(g, 0.8, 0.45, 3.5, TEAL, x, 0.225, z);
  box(g, 0.04, 0.12, 3.5, ORANGE, x + S.side * -0.41, 0.33, z);
  // the DJ calavera, a painted cut-out, with decks in front of it
  cutout(g, djStandee(), 2.3, 3.0, S.in(0.3), 0.45 + 1.5, z, S.turn);
  box(g, 0.5, 0.45, 1.7, CORAL, S.in(0.74), 0.45 + 0.7, z);
  box(g, 0.54, 0.05, 1.74, GOLD, S.in(0.74), 0.45 + 0.95, z);
  [-0.45, 0.45].forEach(function (dz, i) {
    cyl(g, 0.3, 0.3, 0.05, 0x2a2438, S.in(0.74), 0.45 + 1.0, z + dz, { seg: 10 });
    cyl(g, 0.12, 0.12, 0.06, i ? PINK : ORANGE, S.in(0.74), 0.45 + 1.01, z + dz, { seg: 8 });
  });
  // speaker stacks at both ends of the stage
  [-1.5, 1.5].forEach(function (dz, i) {
    box(g, 0.62, 1.9, 0.7, i ? PINK : GOLD, S.in(0.4), 0.45 + 0.95, z + dz);
    [0.55, 1.4].forEach(function (yy, j) {
      cyl(g, j ? 0.14 : 0.26, j ? 0.14 : 0.26, 0.05, 0x2a2438, S.in(0.4) + S.side * -0.31, 0.45 + yy, z + dz, { rz: Math.PI / 2, seg: 9 });
    });
  });
  // garlands of marigolds on the stage front
  flowerHeap(g, S.in(0.8), 0.45, z - 1.7, 6, 0.2);
  flowerHeap(g, S.in(0.8), 0.45, z + 1.7, 6, 0.2);
  sign(g, 'DJ CALAVERA', 0x27c3bd, 0xfff4dc, 2.8, 0.7, S.in(0.12), 4.75, z, { ry: S.turn, border: 0xff9a1f });
}

function altar(g, S, z) {
  var tiers = [[0.8, 0.6, 3.0, ORANGE], [0.62, 0.55, 2.3, PINK], [0.46, 0.5, 1.6, TEAL]];
  var y = 0;
  tiers.forEach(function (t, i) {
    box(g, t[0], t[1], t[2], t[3], S.in(0.42 + (0.8 - t[0]) * 0.4), y + t[1] / 2, z);
    box(g, t[0] + 0.03, 0.05, t[2] + 0.03, CREAM, S.in(0.42 + (0.8 - t[0]) * 0.4), y + t[1] + 0.02, z);
    // marigolds along the front edge of every step, candles behind them
    for (var m = 0; m < 6 - i; m++) {
      var mz = z - t[2] / 2 + 0.22 + m * ((t[2] - 0.44) / (5 - i));
      ball(g, 0.13, m % 2 ? GOLD : ORANGE, S.in(0.42 + (0.8 - t[0]) * 0.4) + S.side * -(t[0] / 2 - 0.1), y + t[1] + 0.12, mz, { seg: 6 });
      if (m % 2 === 0) candle(g, S.in(0.42 + (0.8 - t[0]) * 0.4) + S.side * (t[0] / 2 - 0.2), y + t[1] + 0.05, mz, i % 2 ? CREAM : 0xffd0e0);
    }
    // a sugar skull card standing on each step
    cutout(g, skullCard((i * 2 + 1) % 4), 0.62, 0.68, S.in(0.42 + (0.8 - t[0]) * 0.4), y + t[1] + 0.34, z + (i - 1) * 0.5, S.turn);
    y += t[1];
  });
  // sweet bread and a cup, on the lowest step
  [-1.05, 1.05].forEach(function (dz) { ball(g, 0.17, 0xd9923a, S.in(0.8), 0.7, z + dz, { seg: 6, sy: 0.6 }); });
  // a marigold arch overhead
  for (var a = 0; a < 9; a++) {
    var ang = (a / 8) * Math.PI;
    ball(g, 0.14, a % 2 ? GOLD : ORANGE, S.in(0.1), 3.0 + Math.sin(ang) * 1.0, z + Math.cos(ang) * 1.4, { seg: 5 });
  }
  sign(g, 'BIENVENIDOS', 0xff5f93, 0xfff4dc, 3.0, 0.7, S.in(0.12), 5.0, z, { ry: S.turn, border: 0xffe14a });
}

function band(g, S, z) {
  // a little bandstand with the mariachi trio
  box(g, 0.9, 0.22, 4.0, 0xc98a52, S.in(0.5), 0.11, z);
  box(g, 0.04, 0.2, 4.0, GOLD, S.in(0.05), 0.12, z);
  [[0, -1.35], [1, 0], [2, 1.35]].forEach(function (p) {
    cutout(g, mariachiStandee(p[0]), 1.95, 2.72, S.in(0.38), 0.22 + 1.36, z + p[1], S.turn);
  });
  // conga drums and pots of marigolds
  [-1.9, 1.95].forEach(function (dz, i) {
    cyl(g, 0.2, 0.15, 0.7, i ? TEAL : PINK, S.in(0.75), 0.22 + 0.35, z + dz, { seg: 9 });
    cyl(g, 0.2, 0.2, 0.04, CREAM, S.in(0.75), 0.22 + 0.72, z + dz, { seg: 9 });
  });
  [-0.7, 0.7].forEach(function (dz) {
    cyl(g, 0.17, 0.12, 0.26, CORAL, S.in(0.78), 0.35, z + dz, { seg: 7 });
    flowerHeap(g, S.in(0.78), 0.45, z + dz, 5, 0.1);
  });
  sign(g, '¡ARRIBA!', 0xffb52e, 0x7a2a1a, 2.2, 0.66, S.in(0.12), 4.4, z, { ry: S.turn, border: 0xff5f93 });
}

function market(g, S, z) {
  var x = S.in(0.5);
  // the taco cart: a red box on two wheels with a striped umbrella over it
  box(g, 0.8, 0.9, 2.0, 0xd9432c, x, 0.75, z - 0.8);
  box(g, 0.84, 0.08, 2.1, GOLD, x, 1.24, z - 0.8);
  box(g, 0.84, 0.3, 2.1, CREAM, x, 0.95, z - 0.8, { sy: 0.1 });
  [-1.4, -0.2].forEach(function (dz) { cyl(g, 0.34, 0.34, 0.1, 0x2a2438, x + S.side * -0.41, 0.34, z + dz, { rz: Math.PI / 2, seg: 10 }); });
  cyl(g, 0.03, 0.03, 1.6, 0x7a5a3a, x, 2.0, z - 0.8, { seg: 4 });
  cone(g, 1.35, 0.55, PINK, x, 2.95, z - 0.8, { seg: 8 });
  cone(g, 1.37, 0.12, 0xffffff, x, 2.7, z - 0.8, { seg: 8 });
  // tacos, tortillas and chillies on the counter
  for (var t = 0; t < 4; t++) ball(g, 0.14, t % 2 ? 0xf2c46a : 0x6cc24a, x, 1.35, z - 1.5 + t * 0.4, { seg: 5, sy: 0.7 });
  // a sugar skull statue on a pedestal, and a catrina who has come for the music
  box(g, 0.6, 0.7, 0.9, TEAL, S.in(0.4), 0.35, z + 1.4);
  cutout(g, skullCard(2), 1.2, 1.3, S.in(0.4), 0.7 + 0.62, z + 1.4, S.turn);
  cutout(g, catrinaStandee(), 1.55, 2.2, S.in(0.35), 1.1, z + 0.75, S.turn);
  sign(g, 'TACOS Y MÁS', 0x27c3bd, 0xfff4dc, 2.4, 0.66, S.in(0.12), 4.2, z, { ry: S.turn, border: 0xff9a1f });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(side), side, z, H, 0.0, { r: 0.9, color: 0xffd9a8 });
  if (k === 0) dj(g, S, z);
  else if (k === 1) altar(g, S, z);
  else if (k === 2) band(g, S, z);
  else market(g, S, z);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12, { color: 0xf0cf98 });
  ceilingPanel(g, ceilingPicture(), z, 11.6, H, { color: 0x8fcdf0 });
}

// ---------- overhead ----------

var _lamp = null;
function lampMat() { return _lamp || (_lamp = bulb(0xfff0a0, { op: 0.95 })); }

function arch(g, z, i) {
  // a banner of cut paper right across the street, near the ceiling
  var tex = bannerPicture(i % 3);
  if (tex) quad(g, 10.4, 2.0, 0xffffff, 0, 5.15, z, { mat: decalMat(tex) });
  // a swag of marigolds below it
  var n = 15;
  for (var f = 0; f < n; f++) {
    var t = f / (n - 1);
    var x = -5.1 + t * 10.2;
    var y = 4.15 - Math.sin(t * Math.PI) * 0.55;
    ball(g, 0.17, f % 2 ? GOLD : ORANGE, x, y, z + 0.03, { seg: 5 });
    if (f % 3 === 1) ball(g, 0.09, LEAF, x + 0.17, y - 0.1, z + 0.03, { seg: 4 });
  }
  // two paper lanterns and a star piñata hang at the sides, over the walls' props, never over the lanes
  [-1, 1].forEach(function (s, j) {
    var c = CART[(i + j) % 5];
    cyl(g, 0.012, 0.012, 0.5, 0x6b4a3a, s * 4.55, 3.7, z, { seg: 3 });
    extrude(g, starShape(0.42, 0.2, 7), 0.22, c, s * 4.55, 3.2, z + 0.1, { rz: 0.1 * s, curve: 2 });
    ball(g, 0.1, 0xfff4dc, s * 4.55, 3.2, z + 0.1, { seg: 4 });
    cyl(g, 0.012, 0.012, 0.4, 0x6b4a3a, s * 3.7, 3.7, z, { seg: 3 });
    cyl(g, 0.26, 0.2, 0.46, CART[(i + j + 2) % 5], s * 3.7, 3.3, z, { seg: 8, mat: mat(CART[(i + j + 2) % 5], { e: 0xffb050, ei: 0.35 }) });
    cyl(g, 0.27, 0.27, 0.04, CREAM, s * 3.7, 3.55, z, { seg: 8 });
  });
  // string lights following the banner
  for (var b = 0; b < 12; b++) {
    var u = b / 11;
    ball(g, 0.075, 0xfff0a0, -4.9 + u * 9.8, 6.0 - Math.sin(u * Math.PI) * 0.3, z + 0.05, { seg: 4, mat: lampMat() });
  }
}

// ---------- the things that move ----------

function petalGeo() {
  return combine([
    { geo: new THREE.CircleGeometry(0.1, 5), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 1, 0.55, 1) },
    { geo: new THREE.CircleGeometry(0.1, 5), color: 0xffffff, matrix: xform(0.05, 0.01, 0.03, 0.9, 0.4, 0, 0.8, 0.5, 1) }
  ]);
}

function lanternGeo() {
  return combine([
    { geo: new THREE.SphereGeometry(0.32, 8, 6), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 0.8, 1, 0.8) },
    { geo: new THREE.CylinderGeometry(0.12, 0.12, 0.06, 6), color: 0xffe9b0, matrix: xform(0, 0.33, 0) },
    { geo: new THREE.CylinderGeometry(0.01, 0.01, 1.0, 3), color: 0xaa9070, matrix: xform(0, -0.85, 0) }
  ]);
}

function butterflyGeo() {
  var wing = new THREE.Shape();
  wing.moveTo(0, 0); wing.bezierCurveTo(0.35, 0.4, 0.55, 0.1, 0.3, -0.1); wing.bezierCurveTo(0.4, -0.35, 0.1, -0.3, 0, 0);
  return combine([
    { geo: new THREE.ShapeGeometry(wing), color: 0xffffff },
    { geo: new THREE.ShapeGeometry(wing), color: 0xffffff, matrix: xform(0, 0, 0, 0, Math.PI, 0) },
    { geo: new THREE.SphereGeometry(0.05, 4, 3), color: 0x2a1738 }
  ]);
}

function extras() {
  var petalMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  var butterflyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  [-1, 1].forEach(function (side, i) {
    // marigold petals tumbling down beside the houses
    swarm({ geo: petalGeo(), material: petalMat, count: 22, seed: 14 + i * 9, colors: [ORANGE, GOLD, 0xffb52e, 0xff8212], area: { x: [side * 4.4, side * 5.2], y: [0.3, 5.6], z: [-140, 8] }, k: 1, vy: [-0.5, -0.2], wobble: 0.22, turn: 1.2, scale: [0.8, 1.5] });
    // paper lanterns bobbing
    swarm({ geo: lanternGeo(), count: 8, seed: 40 + i * 7, colors: [PINK, TEAL, GOLD, CORAL, ORANGE], area: { x: [side * 4.5, side * 5.1], y: [3.0, 5.0], z: [-140, 8] }, k: 1, wobble: 0.14, scale: [0.9, 1.3] });
    // papel picado butterflies
    swarm({ geo: butterflyGeo(), material: butterflyMat, count: 9, seed: 70 + i * 3, colors: [PINK, TEAL, GOLD, 0xff9a1f], area: { x: [side * 4.3, side * 5.2], y: [1.2, 5.0], z: [-140, 8] }, k: 1, vz: [-2.5, -1.2], face: true, flap: 0.9, wobble: 0.3, scale: [1.0, 1.7] });
  });
  // the string lights twinkle
  shimmer(lampMat(), 0.75, 0.25, 2.6, 0);
}

export var w_calavera_fiesta = {
  id: 'w_calavera_fiesta',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
