/**
 * pharmacy.js — Stroopwafel Factory (skin 'Pharmacy Pop Factory'; the id and file name are kept from the original
 * game): a candy-coloured factory where giant stroopwafels roll off the line.
 *
 * Every 16 units: a conveyor line with a hopper, a glass tank of bubbling syrup, shelves of tall syrup jars, and a
 * giant STROOP sign over spinning gears. Moving: the conveyor belt, stroopwafels riding it, bubbles in the tanks and
 * gears turning on the far wall.
 */

import * as THREE from 'three';
import { box, cyl, ball, cone, quad, combine, xform, canvasTex, sign, floorPanel, ceilingPanel, wallPanel, sideCtx } from '../mapkit.js';
import { animated, flow, features, spin, swarm } from '../mapfx.js';

var H = 6.4;
var PINK = 0xff6fae;
var MINT = 0x3fe0b0;
var SKY = 0x4fb8ff;
var YEL = 0xffd23f;
var ORG = 0xff8a2a;
var VIO = 0x9a62f0;
var POP = [PINK, MINT, SKY, YEL, ORG, VIO];

function wallPicture() {
  return canvasTex('pharm_wall', 1024, 410, function (ctx, w, h) {
    ctx.fillStyle = '#bfeaff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff9ccb'; ctx.fillRect(0, h - 120, w, 120);
    // stroopwafels scattered on the wall: golden discs with a waffle grid
    for (var i = 0; i < 22; i++) {
      var x = (i * 173) % w, y = 30 + (i * 67) % (h - 190), a = (i * 0.7) % 3.14;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = ['#e8b060', '#f0c070', '#d99a45', '#f4cf86'][i % 4]; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(150,90,30,0.55)'; ctx.lineWidth = 2;
      for (var gl = -16; gl <= 16; gl += 8) { ctx.beginPath(); ctx.moveTo(gl, -18); ctx.lineTo(gl, 18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-18, gl); ctx.lineTo(18, gl); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = '#4fb8ff'; ctx.fillRect(0, h - 128, w, 8);
  });
}

function floorPicture() {
  return canvasTex('pharm_floor', 576, 768, function (ctx, w, h) {
    for (var j = 0; j < 8; j++) for (var i = 0; i < 6; i++) { ctx.fillStyle = (i + j) % 2 ? '#8fe8cc' : '#ffb0d4'; ctx.fillRect(i * 96, j * 96, 96, 96); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(i * 96, j * 96, 96, 5); }
    // hazard stripes along both edges
    [0, w - 28].forEach(function (x0) { for (var y = -40; y < h + 40; y += 48) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 28, y - 28); ctx.lineTo(x0 + 28, y + 6); ctx.lineTo(x0, y + 34); ctx.fill(); } });
    ctx.fillStyle = 'rgba(255,111,174,0.6)';
    [-1.5, 1.5].forEach(function (lx) { ctx.fillRect(w / 2 + lx * 48 - 3, 0, 6, h); });
  });
}

function ceilingPicture() {
  return canvasTex('pharm_ceil', 464, 640, function (ctx, w, h) {
    ctx.fillStyle = '#a8dcff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff'; for (var i = 0; i < 4; i++) ctx.fillRect(40, i * 160 + 30, w - 80, 70);
  });
}

var _belt = null;
function beltMat() {
  if (_belt) return _belt;
  var t = canvasTex('pharm_belt', 56, 320, function (ctx, w, h) {
    ctx.fillStyle = '#5a6272'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#434a58'; for (var y = 0; y < h; y += 14) ctx.fillRect(0, y, w, 3);
    ctx.fillStyle = '#ffd23f'; for (var y2 = 0; y2 < h; y2 += 64) ctx.fillRect(w / 2 - 3, y2, 6, 22);
  });
  _belt = new THREE.MeshStandardMaterial(t ? { map: t, roughness: 0.7 } : { color: 0x5a6272, roughness: 0.7 });
  return _belt;
}

function line(g, S, z) {
  var x = S.in(0.5);
  box(g, 0.8, 0.9, 4, 0xc9d3e0, x, 0.45, z);
  quad(g, 0.7, 4, 0xffffff, x, 0.93, z, { rx: -Math.PI / 2, mat: beltMat() });
  [-1.6, 1.6].forEach(function (dz) { cyl(g, 0.08, 0.08, 0.6, 0x9aa4b4, x, 1.2, z + dz, { seg: 5 }); });
  // a hopper and a stamping press over the belt
  cone(g, 0.6, 0.9, PINK, S.in(0.5), 3.0, z - 1.2, { seg: 6, rz: Math.PI });
  box(g, 0.5, 1.2, 0.5, 0x8a94a8, S.in(0.5), 4.0, z - 1.2);
  box(g, 0.9, 0.5, 0.9, MINT, S.in(0.5), 2.6, z + 1.0);
  box(g, 0.2, 0.6, 0.2, 0x8a94a8, S.in(0.5), 3.1, z + 1.0);
}

function tank(g, S, z) {
  var x = S.in(0.9);
  cyl(g, 0.8, 0.8, 0.3, 0x8a94a8, x, 0.15, z, { seg: 12 });
  cyl(g, 0.7, 0.7, 2.6, 0x7fe0ff, x, 1.6, z, { seg: 12, op: 0.45, e: 0x2aa8d8, ei: 0.5 });
  cyl(g, 0.55, 0.55, 1.6, [PINK, MINT, YEL][Math.abs(Math.round(z / 4)) % 3], x, 1.0, z, { seg: 10, op: 0.9, e: 0xffffff, ei: 0.15 });
  cyl(g, 0.8, 0.8, 0.2, 0x8a94a8, x, 3.0, z, { seg: 12 });
  cyl(g, 0.12, 0.12, 1.2, 0xc9d3e0, x, 3.7, z, { seg: 6 });
  box(g, 0.3, 0.3, 0.3, 0xff4d4d, x, 4.4, z);
  // pipes along the wall
  cyl(g, 0.1, 0.1, 4, 0xff8a2a, S.in(0.12), 3.7, z, { rx: Math.PI / 2, seg: 6 });
  cyl(g, 0.1, 0.1, 4, SKY, S.in(0.12), 3.45, z, { rx: Math.PI / 2, seg: 6 });
}

function syrupJars(g, S, z) {
  box(g, 0.6, 0.08, 3.6, 0xffffff, S.in(0.35), 0.9, z);
  box(g, 0.6, 0.08, 3.6, 0xffffff, S.in(0.35), 2.0, z);
  box(g, 0.6, 0.08, 3.6, 0xffffff, S.in(0.35), 3.1, z);
  box(g, 0.12, 3.2, 3.6, 0xe8f0fa, S.in(0.08), 1.6, z);
  for (var r = 0; r < 3; r++) for (var i = 0; i < 6; i++) {
    var c = POP[(i + r * 2) % 6];
    cyl(g, 0.17, 0.17, 0.62, c, S.in(0.38), 1.25 + r * 1.1, z - 1.5 + i * 0.6, { seg: 6 });
    cyl(g, 0.11, 0.11, 0.14, 0xffffff, S.in(0.38), 1.62 + r * 1.1, z - 1.5 + i * 0.6, { seg: 6 });
  }
}

function stroopSign(g, S, z) {
  box(g, 0.2, 1.8, 3.0, 0xffffff, S.in(0.15), 3.4, z);
  sign(g, 'STROOP', 0x4fb8ff, 0xffffff, 2.6, 1.4, S.in(0.27), 3.4, z, { ry: S.turn, border: 0xff6fae });
  box(g, 1.0, 1.0, 1.4, MINT, S.in(0.6), 0.5, z + 0.0);
  ball(g, 0.4, PINK, S.in(0.6), 1.3, z, { seg: 8 });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(), side, z, H, 0.0, { r: 0.8 });
  if (k === 0) line(g, S, z);
  else if (k === 1) tank(g, S, z);
  else if (k === 2) syrupJars(g, S, z);
  else stroopSign(g, S, z);
}

function center(g, z) { floorPanel(g, floorPicture(), z, 12); ceilingPanel(g, ceilingPicture(), z, 11.6, H); }

function arch(g, z, i) {
  // a string of little stroopwafel flags across: a golden disc with a syrup rim
  for (var f = 0; f < 9; f++) {
    var x = -4.6 + f * 1.15;
    cyl(g, 0.26, 0.26, 0.05, 0xe8b060, x, H - 0.6, z, { rx: Math.PI / 2, seg: 10 });
    cyl(g, 0.3, 0.3, 0.03, POP[(f + i) % 6], x, H - 0.6, z - 0.03, { rx: Math.PI / 2, seg: 10 });
  }
  cyl(g, 0.02, 0.02, 10.4, 0x9aa4b4, 0, H - 0.3, z, { rz: Math.PI / 2, seg: 3 });
}

function gear() {
  var g = new THREE.Group();
  var wheel = new THREE.Group();
  cyl(wheel, 2, 2, 0.4, PINK, 0, 0, 0, { rx: Math.PI / 2, seg: 14 });
  for (var i = 0; i < 12; i++) { var a = (i / 12) * Math.PI * 2; box(wheel, 0.6, 0.6, 0.5, PINK, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0, { rz: a }); }
  cyl(wheel, 0.6, 0.6, 0.6, YEL, 0, 0, 0, { rx: Math.PI / 2, seg: 8 });
  wheel.position.y = 4;
  g.add(wheel);
  animated(wheel);
  spin(wheel, 'z', 0.5, 0);
  g.rotation.y = Math.PI / 2;
  return g;
}

function extras() {
  flow(beltMat().map, 0, 0.18);
  var cap = combine([
    { geo: new THREE.CylinderGeometry(0.3, 0.3, 0.07, 12), color: 0xffffff },
    { geo: new THREE.CylinderGeometry(0.32, 0.32, 0.02, 12), color: 0xc9783a, matrix: xform(0, 0.03, 0) }
  ]);
  [-1, 1].forEach(function (side, i) {
    // stroopwafels riding the belts (the belt is in every fourth bay; they travel the whole length for simplicity)
    swarm({ geo: cap, count: 10, seed: 50 + i, colors: [0xe8b060, 0xf0c070, 0xd99a45], area: { x: [side * 4.9, side * 4.9], y: [1.12, 1.12], z: [-140, 8] }, k: 0.6, scale: [1.2, 1.2], turn: 0 });
    var bub = combine([{ geo: new THREE.SphereGeometry(0.12, 6, 4), color: 0xffffff }]);
    swarm({ geo: bub, material: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false }), count: 22, seed: 90 + i, colors: [0xbff0ff, 0xffd0e8, 0xcfffe8], area: { x: [side * 4.5, side * 5.2], y: [0.6, 4.2], z: [-140, 8] }, k: 1, vy: [0.5, 1.0], wobble: 0.1, scale: [0.6, 1.6] });
  });
  features(gear, { x: -5.0, spacing: 64, count: 3, z0: -30 });
  features(gear, { x: 5.0, spacing: 64, count: 3, z0: -62 });
}

export var pharmacy = { id: 'pharmacy', indoor: true, bay: bay, center: center, arch: arch, extras: extras };
