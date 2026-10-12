/**
 * w_rosetta_hall.js — Rosetta Hall: a grand sand-gold hall of the Rosetta Stone, lit by torches.
 *
 * Painted sandstone walls with lotus-capital pilasters, a meander-bordered floor and a ceiling of gold stars. Every 16
 * units: a giant stone slab carved with three scripts (hieroglyphs, a flowing hand, Greek), a pyramid of letter blocks
 * in many alphabets, a claw game that grabs words, and two columns wound with twin spiral ribbons of letter tiles.
 * Overhead: arches hung with pennants that say hello in ten languages, or with two ribbons of letters winding round
 * each other. Moving: golden dust, drifting papyrus leaves, flickering torches.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, quad, mat, bulb, sign, combine, xform, floorPanel, ceilingPanel, wallPanel, sideCtx
} from '../mapkit.js';
import { swarm, shimmer } from '../mapfx.js';
import {
  wallPicture, floorPicture, ceilingPicture, pennantBanner, ribbonBanner, slabTex, blockTex, atlasTex
} from './rosetta_art.js';

var H = 6.4;
var SAND = 0xe8c27a;
var STONE = 0xb08a58;
var GOLD = 0xe8b030;
var TURQ = 0x2fb8b0;
var TERRA = 0xe2543a;
var BLOCKS = [0xe2543a, 0x2fb8b0, 0xf2b134, 0x4a8fe0, 0x7cc44a, 0xee7a3a, 0xd9507a, 0x3aa0c8];

var _decal = {};
function decalMat(tex) {
  if (!_decal[tex.uuid]) _decal[tex.uuid] = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide });
  return _decal[tex.uuid];
}

function cutout(g, tex, w, h, x, y, z, ry) {
  if (!tex) return null;
  return quad(g, w, h, 0xffffff, x, y, z, { ry: ry, mat: decalMat(tex) });
}

var _flame = null;
function flameMat() { return _flame || (_flame = bulb(0xffb040, { op: 0.95 })); }

function torch(g, S, x, y, z) {
  var tx = S.in(x);
  cyl(g, 0.05, 0.04, 0.6, 0xb8802a, tx, y, z, { seg: 5 });
  cyl(g, 0.12, 0.07, 0.14, 0xd9a040, tx, y + 0.34, z, { seg: 6, m: 0.2 });
  cone(g, 0.11, 0.34, 0xffb040, tx, y + 0.58, z, { seg: 5, mat: flameMat() });
}

// ---------- the four bays ----------

function slab(g, S, z) {
  box(g, 0.9, 0.3, 2.9, SAND, S.in(0.5), 0.15, z);
  box(g, 0.4, 3.3, 2.5, STONE, S.in(0.4), 0.3 + 1.65, z);
  cutout(g, slabTex(), 2.5, 3.4, S.in(0.4) - S.side * 0.21, 0.3 + 1.7, z, S.turn);
  // chips of stone at its foot
  [-1.4, 1.2].forEach(function (dz, i) { box(g, 0.3, 0.2, 0.34, STONE, S.in(0.8), 0.3 + 0.1, z + dz, { ry: 0.5 + i }); });
  torch(g, S, 0.12, 2.6, z - 1.85);
  torch(g, S, 0.12, 2.6, z + 1.85);
  sign(g, 'ΧΑΙΡΕ · HELLO', 0xe2543a, 0xfff4d0, 3.0, 0.62, S.in(0.12), 4.9, z, { ry: S.turn, border: 0xe8b030 });
}

function blocks(g, S, z) {
  var n = 0;
  function pyramid(z0, rows) {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < rows - r; c++) {
        var tex = blockTex(n);
        var bz = z0 + (c - (rows - r - 1) / 2) * 0.68;
        box(g, 0.64, 0.64, 0.64, tex ? 0xffffff : BLOCKS[n % 8], S.in(0.55), 0.32 + r * 0.64, bz, { map: tex || undefined, ry: ((n % 5) - 2) * 0.08, r: 0.55 });
        n++;
      }
    }
  }
  pyramid(z - 0.8, 3);
  pyramid(z + 1.3, 2);
  // one block tumbled in front
  var t2 = blockTex(n + 3);
  box(g, 0.5, 0.5, 0.5, t2 ? 0xffffff : TURQ, S.in(0.8), 0.25, z + 0.35, { map: t2 || undefined, ry: 0.7 });
  torch(g, S, 0.12, 2.6, z - 1.85);
  torch(g, S, 0.12, 2.6, z + 1.85);
  sign(g, 'A B C · Α Β Γ · あ', 0x2fb8b0, 0xfff4d0, 3.2, 0.62, S.in(0.12), 4.6, z, { ry: S.turn, border: 0xe8b030 });
}

function claw(g, S, z) {
  var x = S.in(0.5);
  var cz = z - 0.2;
  // the cabinet: a red base, glass above with posts at the corners, a gold marquee on top
  box(g, 0.9, 0.95, 1.9, TERRA, x, 0.475, cz);
  box(g, 0.94, 0.08, 1.94, GOLD, x, 0.99, cz);
  [[-0.92, -0.42], [-0.92, 0.42], [0.92, -0.42], [0.92, 0.42]].forEach(function (p) { box(g, 0.08, 1.5, 0.08, GOLD, x + p[1] * 1.0, 1.75, cz + p[0]); });
  box(g, 0.02, 1.5, 1.8, 0xbfe8f0, x + S.side * -0.43, 1.75, cz, { op: 0.28, r: 0.1 });
  box(g, 0.04, 1.5, 1.8, 0xf6dca4, x + S.side * 0.44, 1.75, cz);
  box(g, 0.95, 0.45, 2.0, GOLD, x, 2.78, cz);
  // prizes: balls and letter blocks in a heap
  [[-0.6, 0xe2543a], [-0.25, 0x2fb8b0], [0.1, 0xf2b134], [0.45, 0x4a8fe0], [0.7, 0xee7a3a]].forEach(function (p, i) { ball(g, 0.2, p[1], x + (i % 2) * 0.12, 1.4, cz + p[0], { seg: 6 }); });
  box(g, 0.3, 0.3, 0.3, 0x7cc44a, x - 0.1, 1.2, cz - 0.1, { ry: 0.4 });
  // the claw hangs from a rail
  cyl(g, 0.02, 0.02, 0.9, 0x555566, x, 2.35, cz + 0.2, { seg: 3 });
  cyl(g, 0.08, 0.08, 0.1, 0x555566, x, 1.85, cz + 0.2, { seg: 6 });
  [0, 2.1, 4.2].forEach(function (a) { cone(g, 0.04, 0.3, 0xbbbbc4, x + Math.cos(a) * 0.1, 1.68, cz + 0.2 + Math.sin(a) * 0.1, { seg: 4, rx: Math.PI, rz: Math.cos(a) * 0.3 }); });
  // a stool and a heap of won prizes beside it
  cyl(g, 0.22, 0.2, 0.4, TURQ, S.in(0.7), 0.2, z + 1.55, { seg: 8 });
  [[0.2, 0xe2543a], [-0.15, 0xf2b134]].forEach(function (p, i) { ball(g, 0.2, p[1], S.in(0.7), 0.6 + i * 0.1, z + 1.55 + p[0], { seg: 6 }); });
  torch(g, S, 0.12, 2.6, z - 1.85);
  sign(g, 'CATCH A WORD!', 0xf2b134, 0x7a2a1a, 3.0, 0.66, S.in(0.12), 4.5, z, { ry: S.turn, border: 0xe2543a });
}

var _atlas = {};
function atlasMat() {
  var tex = atlasTex();
  if (!tex) return null;
  return _atlas[tex.uuid] || (_atlas[tex.uuid] = mat(0xffffff, { map: tex, side: THREE.DoubleSide, r: 0.6 }));
}

/** A column with two ribbons of lettered tiles winding up it. */
function helix(g, S, z, phase) {
  var x = S.in(0.55);
  cyl(g, 0.13, 0.13, 4.6, SAND, x, 2.3, z, { seg: 7 });
  cyl(g, 0.3, 0.34, 0.2, GOLD, x, 0.1, z, { seg: 8 });
  cyl(g, 0.3, 0.2, 0.2, GOLD, x, 4.6, z, { seg: 8 });
  var m = atlasMat();
  for (var s = 0; s < 2; s++) {
    for (var i = 0; i < 17; i++) {
      var t = i / 16;
      var a = t * Math.PI * 4 + s * Math.PI + phase;
      var y = 0.5 + t * 3.8;
      var geo = new THREE.PlaneGeometry(0.34, 0.34);
      var cell = (i * 5 + s * 9 + Math.round(phase * 3)) % 32;
      var u0 = (cell % 8) / 8;
      var v0 = 1 - (Math.floor(cell / 8) + 1) / 4;
      var uv = geo.attributes.uv;
      for (var q = 0; q < uv.count; q++) uv.setXY(q, u0 + uv.getX(q) / 8, v0 + uv.getY(q) / 4);
      var mesh = new THREE.Mesh(geo, m || mat([TERRA, TURQ][s]));
      mesh.position.set(x + Math.cos(a) * 0.36, y, z + Math.sin(a) * 0.36);
      mesh.rotation.y = Math.PI / 2 - a;
      g.add(mesh);
    }
  }
}

function helixBay(g, S, z) {
  helix(g, S, z - 1.0, 0);
  helix(g, S, z + 1.0, 2.1);
  torch(g, S, 0.12, 2.6, z);
  sign(g, 'LOGOS · 言 · كلمة', 0x4a8fe0, 0xfff4d0, 3.0, 0.62, S.in(0.12), 5.2, z, { ry: S.turn, border: 0xe8b030 });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(side), side, z, H, 0.0, { r: 0.9, color: 0xf4dba0 });
  if (k === 0) slab(g, S, z);
  else if (k === 1) blocks(g, S, z);
  else if (k === 2) claw(g, S, z);
  else helixBay(g, S, z);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12, { color: 0xf0d08e });
  ceilingPanel(g, ceilingPicture(), z, 11.6, H, { color: 0x56c3bc });
}

// ---------- overhead ----------

function arch(g, z, i) {
  var tex = i % 2 ? pennantBanner(i % 3) : ribbonBanner();
  if (tex) quad(g, 10.4, i % 2 ? 1.8 : 2.4, 0xffffff, 0, i % 2 ? 5.35 : 5.1, z, { mat: decalMat(tex) });
  // a stone architrave arching over the hall
  for (var n = 0; n < 5; n++) {
    ring(g, 5.3, 0.13, [SAND, TURQ, GOLD, TURQ, SAND][n], 0, 0.5, z - 0.1, { arc: (28 * Math.PI) / 180, seg: 6, tube: 5, rz: ((20 + n * 28) * Math.PI) / 180 });
  }
  // brass lamps on chains at both sides, over the walls, never over the lanes
  [-1, 1].forEach(function (s) {
    cyl(g, 0.012, 0.012, 1.0, 0x8a6a2a, s * 4.5, 4.9, z, { seg: 3 });
    cyl(g, 0.2, 0.1, 0.2, 0xd9a040, s * 4.5, 4.3, z, { seg: 7, m: 0.2 });
    cone(g, 0.15, 0.4, 0xffb040, s * 4.5, 4.65, z, { seg: 5, mat: flameMat() });
  });
}

// ---------- the things that move ----------

function leafGeo() {
  var s = new THREE.Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(0.25, 0.1, 0.4, 0.5); s.quadraticCurveTo(0.1, 0.4, 0, 0);
  return combine([
    { geo: new THREE.ShapeGeometry(s), color: 0xffffff },
    { geo: new THREE.ShapeGeometry(s), color: 0xffffff, matrix: xform(0, 0, 0, 0, Math.PI, 0) }
  ]);
}

function moteGeo() {
  return combine([{ geo: new THREE.OctahedronGeometry(0.07, 0), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 1, 1.6, 1) }]);
}

function extras() {
  var leafMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  var moteMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: moteGeo(), material: moteMat, count: 18, seed: 61 + i * 4, colors: [0xffe58a, 0xffd04a, 0xfff2c0], area: { x: [side * 4.4, side * 5.2], y: [0.8, 5.8], z: [-140, 8] }, k: 1, vy: [0.1, 0.35], turn: 1.5, wobble: 0.12, scale: [0.8, 1.6] });
    swarm({ geo: leafGeo(), material: leafMat, count: 10, seed: 17 + i * 6, colors: [0xfff0c0, 0x7fd8c8, 0xf0a070, 0xf8d878], area: { x: [side * 4.3, side * 5.2], y: [1.5, 5.2], z: [-140, 8] }, k: 1, vz: [-2.2, -1.0], face: true, flap: 0.8, wobble: 0.3, scale: [1.0, 1.6] });
  });
  shimmer(flameMat(), 0.8, 0.2, 2.8, 0);
}

export var w_rosetta_hall = {
  id: 'w_rosetta_hall',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
