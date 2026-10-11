/**
 * cosmetics.js — the hats, gear and clothing a Wordrunner can wear, drawn as little flat-toon models.
 *
 * Everything is built from a few primitives (lathes, cylinders, spheres, boxes), coloured flat and given the navy ink
 * outline of the rest of the game (paper.js). No file downloads: the shapes are procedural.
 *
 * Coordinates are the runner's own: the runner stands on y = 0, is about 2.05 tall, faces -Z (so the back is +Z), and
 * the top of its head is at y = HEAD_TOP. A hat is built with its origin at the crown (the point it touches the head)
 * and placed by the caller; gear and clothing are built straight in runner space, so they can be added to the runner
 * (the classic blocky character) or handed to a bone (the animated heroes, see attachCosmetics in player.js).
 */

import * as THREE from 'three';
import { paperizeMaterials, outlineGroup } from './paper.js';

export var HEAD_TOP = 2.0;

// ===== tiny toolkit =====

function mat(color, o) {
  o = o || {};
  var m = new THREE.MeshStandardMaterial({ color: color, roughness: 1, metalness: 0, side: o.ds ? THREE.DoubleSide : THREE.FrontSide });
  if (o.op !== undefined) { m.transparent = true; m.opacity = o.op; }
  return m;
}

/** Add a mesh to `g`. o: p [x,y,z], r [rx,ry,rz], s [sx,sy,sz] or a number, basic (unlit), ds (double sided). */
function add(g, geo, color, o) {
  o = o || {};
  var m = new THREE.Mesh(geo, o.basic ? new THREE.MeshBasicMaterial({ color: color, side: o.ds ? THREE.DoubleSide : THREE.FrontSide }) : mat(color, o));
  if (o.p) m.position.set(o.p[0], o.p[1], o.p[2]);
  if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
  if (o.s) { if (typeof o.s === 'number') m.scale.setScalar(o.s); else m.scale.set(o.s[0], o.s[1], o.s[2]); }
  if (o.noOutline) m.userData.noOutline = true;
  g.add(m);
  return m;
}

function lathe(points, seg) {
  return new THREE.LatheGeometry(points.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), seg || 24);
}
function cyl(rt, rb, h, seg) { return new THREE.CylinderGeometry(rt, rb, h, seg || 16); }
function sph(r, ws, hs, phi0, phiL, th0, thL) { return new THREE.SphereGeometry(r, ws || 16, hs || 12, phi0, phiL, th0, thL); }
function box(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
function torus(r, t, arc, rs, ts) { return new THREE.TorusGeometry(r, t, rs || 8, ts || 20, arc || Math.PI * 2); }

/** A dome of radius r (a sphere's top part, `cut` of the way down), as a lathe so it can be open at the bottom. */
function dome(r, cutAngle) {
  var pts = [];
  var n = 10;
  for (var i = 0; i <= n; i++) {
    var a = (i / n) * (cutAngle || Math.PI / 2);
    pts.push([Math.sin(a) * r, Math.cos(a) * r]);
  }
  pts.reverse();
  return lathe(pts, 20);
}

// ===== HATS (origin: the crown of the head) =====

var HATS = {
  hat_beret: function (g, c) {
    add(g, sph(0.5, 20, 12), c, { p: [0.06, 0.07, -0.02], s: [1, 0.36, 1], r: [0.12, 0, 0.18] });
    add(g, cyl(0.025, 0.03, 0.09, 6), c, { p: [0.0, 0.2, -0.02], r: [0, 0, 0.18] });
    add(g, torus(0.37, 0.03, Math.PI * 2, 6, 24), 0x1b2a41, { p: [0, -0.02, 0], r: [Math.PI / 2, 0, 0] });
  },
  hat_fez: function (g, c) {
    add(g, cyl(0.22, 0.28, 0.34, 18), c, { p: [0, 0.15, 0] });
    add(g, cyl(0.225, 0.225, 0.02, 18), 0x6e1c22, { p: [0, 0.32, 0] });
    add(g, cyl(0.012, 0.012, 0.32, 5), 0xf2b134, { p: [0.08, 0.2, -0.0], r: [0, 0, 0.18], noOutline: true });
    add(g, cyl(0.012, 0.012, 0.3, 5), 0xf2b134, { p: [0.22, 0.2, 0.06], r: [0, 0, 0.03], noOutline: true });
    add(g, sph(0.05, 8, 6), 0x1b2a41, { p: [0.23, 0.04, 0.06] });
    add(g, cyl(0.04, 0.06, 0.12, 8), 0x1b2a41, { p: [0.23, 0.08, 0.06], noOutline: true });
  },
  hat_ricehat: function (g, c) {
    // a wide conical hat of woven straw, as worn in rice fields across Asia
    add(g, lathe([[0, 0.38], [0.2, 0.28], [0.46, 0.14], [0.72, 0.0], [0.72, -0.02], [0.4, 0.08], [0.0, 0.3]], 28), c, { ds: true, p: [0, -0.02, 0] });
    for (var i = 1; i <= 3; i++) add(g, torus(0.2 + i * 0.14, 0.012, Math.PI * 2, 4, 28), 0x9c7a3c, { p: [0, 0.31 - i * 0.12, 0], r: [Math.PI / 2, 0, 0], noOutline: true });
    add(g, sph(0.05, 8, 6), 0x9c7a3c, { p: [0, 0.37, 0] });
    add(g, torus(0.38, 0.015, Math.PI, 5, 14), 0xd9432c, { p: [0, -0.18, 0.0], r: [0, 0, Math.PI], noOutline: true });
  },
  hat_sombrero: function (g, c) {
    add(g, lathe([[0, 0.5], [0.12, 0.49], [0.22, 0.4], [0.27, 0.2], [0.3, 0.06], [0.82, 0.0], [0.86, 0.08], [0.82, 0.05], [0.3, 0.09]], 28), c, { ds: true, p: [0, -0.02, 0] });
    add(g, torus(0.27, 0.035, Math.PI * 2, 6, 24), 0xd9432c, { p: [0, 0.08, 0], r: [Math.PI / 2, 0, 0] });
    add(g, torus(0.84, 0.03, Math.PI * 2, 6, 36), 0xd9432c, { p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0] });
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2;
      add(g, sph(0.035, 6, 5), i % 2 ? 0xf2b134 : 0x0e8c8a, { p: [Math.cos(a) * 0.27, 0.08, Math.sin(a) * 0.27], noOutline: true });
    }
  },
  hat_ushanka: function (g, c) {
    add(g, dome(0.46, Math.PI * 0.55), c, { p: [0, -0.1, 0], s: [1, 0.9, 1.02] });
    add(g, torus(0.4, 0.07, Math.PI * 2, 8, 24), 0xcdbfa8, { p: [0, -0.07, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.05, 0.7] });
    [-1, 1].forEach(function (sd) {
      add(g, box(0.2, 0.42, 0.18), 0xcdbfa8, { p: [sd * 0.42, -0.28, 0.02], r: [0, 0, sd * -0.12] });
      add(g, cyl(0.012, 0.012, 0.3, 4), 0x1b2a41, { p: [sd * 0.34, -0.44, 0.02], r: [0, 0, 0], noOutline: true });
    });
    add(g, box(0.34, 0.07, 0.04), 0x1b2a41, { p: [0, 0.2, 0.0] });
    add(g, cyl(0.07, 0.07, 0.015, 12), 0xd9432c, { p: [0, 0.01, -0.46], r: [Math.PI / 2, 0, 0] });
    add(g, sph(0.05, 8, 6), 0xf2b134, { p: [0, 0.01, -0.472] });
  },
  hat_pith: function (g, c) {
    add(g, dome(0.46, Math.PI * 0.5), c, { p: [0, -0.02, 0.0] });
    add(g, lathe([[0.4, 0.0], [0.6, -0.08], [0.78, -0.2], [0.78, -0.23], [0.58, -0.12], [0.38, -0.03]], 28), c, { ds: true, p: [0, 0, -0.04] });
    add(g, torus(0.425, 0.03, Math.PI * 2, 6, 24), 0x0e8c8a, { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0] });
    add(g, cyl(0.04, 0.05, 0.05, 8), c, { p: [0, 0.44, 0] });
    add(g, cyl(0.07, 0.07, 0.02, 10), 0xd9a63a, { p: [0, 0.03, -0.42], r: [Math.PI / 2, 0, 0] });
  },
  hat_panama: function (g, c) {
    add(g, lathe([[0, 0.3], [0.2, 0.3], [0.27, 0.27], [0.3, 0.05], [0.64, 0.0], [0.66, 0.05], [0.62, 0.07], [0.3, 0.12]], 28), c, { ds: true, p: [0, -0.05, 0] });
    add(g, cyl(0.2, 0.2, 0.01, 14), 0xc9b274, { p: [0, 0.255, 0], noOutline: true });
    add(g, torus(0.3, 0.03, Math.PI * 2, 6, 24), 0x1b2a41, { p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0] });
    add(g, torus(0.62, 0.012, Math.PI * 2, 4, 40), 0xc9b274, { p: [0, 0.06, 0], r: [Math.PI / 2, 0, 0], noOutline: true });
  },
  hat_bucket: function (g, c) {
    add(g, cyl(0.34, 0.4, 0.3, 20), c, { p: [0, 0.12, 0] });
    add(g, lathe([[0.38, 0.0], [0.55, -0.1], [0.72, -0.2], [0.72, -0.23], [0.54, -0.13], [0.37, -0.04]], 28), c, { ds: true, p: [0, 0, 0] });
    add(g, cyl(0.34, 0.34, 0.01, 20), 0xa2d4a0, { p: [0, 0.272, 0], noOutline: true });
    add(g, torus(0.385, 0.018, Math.PI * 2, 4, 24), 0xf2b134, { p: [0, 0.0, 0], r: [Math.PI / 2, 0, 0] });
    for (var i = 0; i < 4; i++) add(g, cyl(0.015, 0.015, 0.02, 6), 0x1b2a41, { p: [Math.cos(i * 1.57 + 0.4) * 0.35, 0.08, Math.sin(i * 1.57 + 0.4) * 0.35], noOutline: true });
  },
  hat_flatcap: function (g, c) {
    add(g, sph(0.46, 20, 12), c, { p: [0.04, 0.0, -0.03], s: [1, 0.38, 1.0], r: [-0.12, 0, 0] });
    add(g, lathe([[0.0, 0.0], [0.3, 0.0], [0.3, 0.025], [0.0, 0.025]], 18), 0x3b2c20, { ds: true, p: [0.03, -0.06, -0.43], s: [1.1, 1, 0.8], r: [0.26, 0, 0] });
    add(g, cyl(0.03, 0.03, 0.025, 8), 0x3b2c20, { p: [0.04, 0.18, -0.04] });
    add(g, torus(0.4, 0.015, Math.PI * 1.3, 4, 20), 0xe9d8b0, { p: [0.02, -0.01, 0], r: [Math.PI / 2, 0, 0.3], noOutline: true });
  },
  hat_bowler: function (g, c) {
    add(g, dome(0.36, Math.PI * 0.5), c, { p: [0, 0.0, 0], s: [1, 1.05, 1.06] });
    add(g, lathe([[0.3, 0.0], [0.46, 0.0], [0.5, 0.03], [0.46, 0.05], [0.3, 0.04]], 24), c, { ds: true, p: [0, -0.04, 0] });
    add(g, torus(0.34, 0.03, Math.PI * 2, 6, 24), 0xd9432c, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0] });
  },
  hat_laurel: function (g, c) {
    var n = 15;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 1.7 + Math.PI * 0.65; // open at the back
      var side = i % 2 ? 1 : -1;
      var leaf = add(g, sph(0.06, 6, 5), i % 3 === 2 ? 0x2e9e5b : c, { p: [Math.cos(a) * 0.4, 0.0 + Math.sin(i * 1.9) * 0.01, Math.sin(a) * 0.4], s: [0.5, 0.4, 1.9] });
      leaf.rotation.y = -a + Math.PI / 2 + side * 0.5;
      leaf.position.y += side * 0.03;
    }
    for (var j = 0; j < 7; j++) {
      var b = (j / 7) * Math.PI * 1.5 + Math.PI * 0.75;
      add(g, sph(0.025, 6, 5), 0xd9432c, { p: [Math.cos(b) * 0.4, 0.06, Math.sin(b) * 0.4], noOutline: true });
    }
    add(g, torus(0.4, 0.012, Math.PI * 1.7, 4, 24), 0x1f6b3e, { p: [0, 0, 0], r: [Math.PI / 2, 0, Math.PI * 0.65], noOutline: true });
    [-1, 1].forEach(function (sd) { add(g, box(0.05, 0.3, 0.015), 0xd9432c, { p: [sd * 0.07, -0.12, 0.42], r: [0, 0, sd * 0.2], noOutline: true }); });
  },
  hat_paperboat: function (g, c) {
    var sh = new THREE.Shape();
    sh.moveTo(-0.58, 0.3); sh.lineTo(-0.4, 0.0); sh.lineTo(0.4, 0.0); sh.lineTo(0.58, 0.3); sh.lineTo(0.34, 0.14); sh.lineTo(0.0, 0.46); sh.lineTo(-0.34, 0.14); sh.closePath();
    var geo = new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: false });
    geo.translate(0, 0, -0.17);
    add(g, geo, c, { p: [0, -0.04, 0] });
    for (var i = 0; i < 3; i++) add(g, box(0.34 - i * 0.06, 0.02, 0.005), 0x8a93a3, { p: [0, 0.04 + i * 0.07, -0.175], noOutline: true });
    add(g, box(0.5, 0.02, 0.005), 0x8a93a3, { p: [0, 0.05, 0.175], noOutline: true });
    add(g, torus(0.37, 0.04, Math.PI * 2, 6, 24), 0xe4d8bb, { p: [0, -0.02, 0], r: [Math.PI / 2, 0, 0] });
  },
  hat_tam: function (g, c) {
    add(g, sph(0.5, 20, 12), c, { p: [0.04, 0.05, 0.0], s: [1.08, 0.4, 1.08], r: [0.1, 0, 0.12] });
    add(g, torus(0.37, 0.04, Math.PI * 2, 6, 24), 0x1b2a41, { p: [0, -0.02, 0], r: [Math.PI / 2, 0, 0] });
    add(g, torus(0.3, 0.012, Math.PI * 2, 4, 24), 0x0e8c8a, { p: [0.04, 0.16, 0], r: [Math.PI / 2 + 0.1, 0, 0.12], noOutline: true });
    add(g, torus(0.4, 0.012, Math.PI * 2, 4, 24), 0xf2b134, { p: [0.04, 0.07, 0], r: [Math.PI / 2 + 0.1, 0, 0.12], noOutline: true });
    add(g, sph(0.09, 10, 8), 0xd9432c, { p: [0.0, 0.25, 0.0] });
  },
  hat_boater: function (g, c) {
    add(g, cyl(0.31, 0.32, 0.24, 22), c, { p: [0, 0.1, 0] });
    add(g, cyl(0.31, 0.31, 0.01, 22), 0xf3e6b8, { p: [0, 0.222, 0], noOutline: true });
    add(g, cyl(0.52, 0.52, 0.035, 28), c, { p: [0, -0.015, 0] });
    add(g, cyl(0.325, 0.325, 0.06, 22), 0x1b2a41, { p: [0, 0.07, 0], noOutline: true });
    add(g, cyl(0.327, 0.327, 0.022, 22), 0xd9432c, { p: [0, 0.07, 0], noOutline: true });
  },
  hat_aviator: function (g, c) {
    add(g, dome(0.43, Math.PI * 0.62), c, { p: [0, -0.12, 0.0], s: [1, 0.9, 1.04] });
    [-1, 1].forEach(function (sd) {
      add(g, box(0.1, 0.3, 0.34), c, { p: [sd * 0.41, -0.2, 0.02], r: [0, 0, sd * -0.08] });
      add(g, cyl(0.045, 0.045, 0.02, 10), 0xe9d8b0, { p: [sd * 0.44, -0.16, 0.0], r: [0, 0, Math.PI / 2] });
    });
    add(g, torus(0.4, 0.02, Math.PI * 2, 4, 24), 0x3b2c20, { p: [0, -0.1, 0], r: [Math.PI / 2, 0, 0], noOutline: true });
    [-1, 1].forEach(function (sd) {
      add(g, cyl(0.1, 0.1, 0.06, 14), 0x8a5f1c, { p: [sd * 0.14, 0.06, -0.39], r: [Math.PI / 2 - 0.15, 0, 0] });
      add(g, cyl(0.075, 0.075, 0.065, 14), 0x9fd8e6, { p: [sd * 0.14, 0.06, -0.395], r: [Math.PI / 2 - 0.15, 0, 0], noOutline: true });
    });
    add(g, box(0.1, 0.03, 0.04), 0x8a5f1c, { p: [0, 0.06, -0.4] });
  },
  hat_chullo: function (g, c) {
    // an Andean knitted cap: striped, with ear flaps and long tassels
    var bands = [[0, 0.3, c], [0.3, 0.55, 0xf2b134], [0.55, 0.8, 0x0e8c8a], [0.8, 1.05, 0xfffbf2], [1.05, 1.3, 0xd9432c], [1.3, 1.5, 0x1b2a41]];
    bands.forEach(function (b) {
      var pts = [];
      for (var i = 0; i <= 4; i++) { var a = b[0] + (b[1] - b[0]) * i / 4; pts.push([Math.sin(a) * 0.43 + 0.0, Math.cos(a) * 0.46 - 0.06]); }
      pts.reverse();
      add(g, lathe(pts, 20), b[2], { ds: true, p: [0, 0, 0] });
    });
    add(g, cone(0.12, 0.2), 0x1b2a41, { p: [0, 0.41, 0] });
    [-1, 1].forEach(function (sd) {
      add(g, cone(0.16, 0.42), 0xd9432c, { p: [sd * 0.4, -0.36, 0.0], r: [Math.PI, 0, 0] });
      add(g, cyl(0.012, 0.012, 0.28, 4), 0xf2b134, { p: [sd * 0.4, -0.64, 0.0], noOutline: true });
      add(g, sph(0.06, 8, 6), 0xf2b134, { p: [sd * 0.4, -0.8, 0.0] });
    });
  }
};

function cone(r, h) { return new THREE.ConeGeometry(r, h, 10); }

// ===== GEAR (built in runner space) =====
// Each returns nothing and fills g; GEAR_SLOT says which part of the body it rides on (the bone to follow).

var GEAR_SLOT = {
  gear_suitcase: 'chest', gear_camera: 'chest', gear_compass: 'chest', gear_spyglass: 'chest', gear_lantern: 'hip',
  gear_kite: 'chest', gear_umbrella: 'chest', gear_ukulele: 'chest', gear_accordion: 'hip', gear_fan: 'chest', gear_globe: 'chest',
  gear_binoculars: 'chest', gear_tube: 'hip', gear_pillow: 'chest', gear_satchel: 'hip'
};

var GEAR = {
  gear_suitcase: function (g, c) {
    // a hard-shell suitcase strapped to the back, covered in stickers
    add(g, box(0.44, 0.62, 0.2), c, { p: [0, 1.0, 0.38] });
    add(g, box(0.46, 0.03, 0.22), 0x1b2a41, { p: [0, 1.0, 0.38], noOutline: true });
    [-1, 1].forEach(function (sd) { add(g, box(0.03, 0.62, 0.22), 0x1b2a41, { p: [sd * 0.13, 1.0, 0.38], noOutline: true }); });
    add(g, box(0.16, 0.05, 0.04), 0x1b2a41, { p: [0, 1.34, 0.38] });
    var stick = [[-0.12, 1.12, 0xf2b134], [0.1, 0.92, 0xd9432c], [-0.08, 0.78, 0x0e8c8a], [0.12, 1.15, 0xfffbf2]];
    stick.forEach(function (st) { add(g, new THREE.CircleGeometry(0.05, 10), st[2], { p: [st[0], st[1], 0.482], ds: true, noOutline: true }); });
    [-1, 1].forEach(function (sd) {
      add(g, box(0.05, 0.5, 0.025), 0x4b3b2a, { p: [sd * 0.2, 1.05, 0.2], r: [0.35, 0, 0] });
      add(g, box(0.05, 0.05, 0.03), 0x4b3b2a, { p: [sd * 0.2, 0.74, 0.34] });
    });
  },
  gear_camera: function (g, c) {
    add(g, torus(0.2, 0.012, Math.PI * 2, 4, 24), 0x7b3f6e, { p: [0, 1.27, -0.02], r: [Math.PI / 2 - 0.45, 0, 0], noOutline: true });
    add(g, box(0.3, 0.19, 0.12), c, { p: [0, 1.02, -0.3] });
    add(g, box(0.3, 0.07, 0.125), 0xe9d8b0, { p: [0, 1.065, -0.3], noOutline: true });
    add(g, cyl(0.07, 0.08, 0.1, 16), 0x1b2a41, { p: [0.0, 1.0, -0.4], r: [Math.PI / 2, 0, 0] });
    add(g, cyl(0.05, 0.05, 0.02, 14), 0x9fd8e6, { p: [0.0, 1.0, -0.452], r: [Math.PI / 2, 0, 0], noOutline: true });
    add(g, box(0.07, 0.04, 0.05), 0xd9a63a, { p: [0.09, 1.14, -0.3] });
    add(g, cyl(0.02, 0.02, 0.03, 8), 0xd9432c, { p: [-0.1, 1.13, -0.3], noOutline: true });
  },
  gear_compass: function (g, c) {
    add(g, torus(0.2, 0.01, Math.PI * 2, 4, 24), 0x4b3b2a, { p: [0, 1.27, -0.02], r: [Math.PI / 2 - 0.45, 0, 0], noOutline: true });
    add(g, cyl(0.15, 0.15, 0.05, 20), c, { p: [0, 1.04, -0.28], r: [Math.PI / 2 - 0.1, 0, 0] });
    add(g, cyl(0.125, 0.125, 0.012, 20), 0xfffbf2, { p: [0, 1.04, -0.31], r: [Math.PI / 2 - 0.1, 0, 0], noOutline: true });
    add(g, new THREE.ConeGeometry(0.03, 0.2, 4), 0xd9432c, { p: [0, 1.08, -0.322], r: [0, 0, 0] , noOutline: true });
    add(g, new THREE.ConeGeometry(0.03, 0.2, 4), 0x1b2a41, { p: [0, 1.0, -0.322], r: [0, 0, Math.PI], noOutline: true });
    add(g, cyl(0.03, 0.03, 0.05, 10), c, { p: [0, 1.2, -0.25], r: [Math.PI / 2 - 0.1, 0, 0] });
  },
  gear_spyglass: function (g, c) {
    var grp = new THREE.Group();
    grp.position.set(0.04, 1.05, 0.3);
    grp.rotation.set(0, 0, 0.9);
    add(grp, cyl(0.07, 0.07, 0.34, 14), c, { p: [0, -0.2, 0] });
    add(grp, cyl(0.055, 0.055, 0.3, 14), 0xd9a63a, { p: [0, 0.12, 0] });
    add(grp, cyl(0.04, 0.04, 0.26, 14), c, { p: [0, 0.4, 0] });
    add(grp, cyl(0.05, 0.05, 0.05, 14), 0x4b3b2a, { p: [0, 0.55, 0] });
    add(grp, cyl(0.032, 0.032, 0.01, 12), 0x9fd8e6, { p: [0, 0.58, 0], noOutline: true });
    add(grp, cyl(0.075, 0.075, 0.1, 14), 0x4b3b2a, { p: [0, -0.4, 0] });
    g.add(grp);
    add(g, torus(0.2, 0.012, Math.PI * 2, 4, 24), 0x4b3b2a, { p: [0, 1.27, 0.0], r: [Math.PI / 2, 0, 0], noOutline: true });
  },
  gear_lantern: function (g, c) {
    var grp = new THREE.Group();
    grp.position.set(0.46, 0.7, -0.02);
    add(grp, torus(0.06, 0.012, Math.PI, 4, 12), 0x1b2a41, { p: [0, 0.27, 0], noOutline: true });
    add(grp, cyl(0.1, 0.12, 0.05, 6), 0x1b2a41, { p: [0, 0.2, 0] });
    add(grp, cyl(0.1, 0.1, 0.32, 8), 0xf2b134, { p: [0, 0.0, 0], basic: true, noOutline: true });
    for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; add(grp, cyl(0.012, 0.012, 0.34, 4), 0x1b2a41, { p: [Math.cos(a) * 0.105, 0, Math.sin(a) * 0.105], noOutline: true }); }
    add(grp, cyl(0.12, 0.1, 0.05, 8), 0x1b2a41, { p: [0, -0.19, 0] });
    add(grp, sph(0.07, 8, 6), 0xfff3c0, { p: [0, 0, 0], basic: true, noOutline: true });
    g.add(grp);
    add(g, box(0.04, 0.2, 0.025), 0x4b3b2a, { p: [0.4, 0.98, -0.02], r: [0, 0, 0.1], noOutline: true });
  },
  gear_kite: function (g, c) {
    var grp = new THREE.Group();
    grp.position.set(0, 1.3, 0.42);
    grp.rotation.x = -0.2;
    var d = new THREE.Shape();
    d.moveTo(0, 0.62); d.lineTo(0.38, 0.1); d.lineTo(0, -0.34); d.lineTo(-0.38, 0.1); d.closePath();
    add(grp, new THREE.ShapeGeometry(d), c, { ds: true, p: [0, 0, 0] });
    var q = new THREE.Shape();
    q.moveTo(0, 0.62); q.lineTo(0.38, 0.1); q.lineTo(0, 0.1); q.closePath();
    add(grp, new THREE.ShapeGeometry(q), 0xf2b134, { ds: true, p: [0, 0, 0.004], noOutline: true });
    var q2 = new THREE.Shape();
    q2.moveTo(0, 0.1); q2.lineTo(-0.38, 0.1); q2.lineTo(0, -0.34); q2.closePath();
    add(grp, new THREE.ShapeGeometry(q2), 0x0e8c8a, { ds: true, p: [0, 0, 0.004], noOutline: true });
    add(grp, box(0.025, 0.96, 0.02), 0x4b3b2a, { p: [0, 0.14, 0.012], noOutline: true });
    add(grp, box(0.76, 0.025, 0.02), 0x4b3b2a, { p: [0, 0.1, 0.012], noOutline: true });
    for (var i = 0; i < 4; i++) add(grp, box(0.14, 0.09, 0.012), i % 2 ? 0xfffbf2 : 0xd9432c, { p: [Math.sin(i * 1.5) * 0.05, -0.42 - i * 0.14, 0.0], r: [0, 0, Math.sin(i * 1.5) * 0.4], ds: true });
    g.add(grp);
    add(g, box(0.05, 0.4, 0.04), 0x4b3b2a, { p: [0, 1.0, 0.3], r: [0.2, 0, 0], noOutline: true });
  },
  gear_umbrella: function (g, c) {
    var grp = new THREE.Group();
    grp.position.set(0.02, 1.0, 0.34);
    grp.rotation.set(0, 0, -0.55);
    add(grp, cone(0.09, 0.62), c, { p: [0, 0.18, 0], r: [0, 0, 0] });
    add(grp, new THREE.ConeGeometry(0.095, 0.5, 8), c, { p: [0, 0.2, 0] });
    for (var i = 0; i < 3; i++) add(grp, torus(0.075 - i * 0.015, 0.012, Math.PI * 2, 4, 10), 0xf2b134, { p: [0, 0.0 + i * 0.16, 0], r: [Math.PI / 2, 0, 0], noOutline: true });
    add(grp, cyl(0.015, 0.015, 0.3, 6), 0x1b2a41, { p: [0, -0.2, 0], noOutline: true });
    add(grp, torus(0.06, 0.018, Math.PI, 6, 12), 0x8a5f1c, { p: [0.06, -0.36, 0], r: [0, 0, Math.PI] });
    add(grp, sph(0.02, 6, 5), 0x1b2a41, { p: [0, 0.46, 0] });
    g.add(grp);
    add(g, box(0.4, 0.04, 0.025), 0x4b3b2a, { p: [0, 0.98, 0.3], r: [0, 0, -0.55], noOutline: true });
  },
  gear_ukulele: function (g, c) {
    var grp = new THREE.Group();
    grp.position.set(0.0, 0.95, 0.31);
    grp.rotation.set(0, 0, 0.6);
    add(grp, sph(0.13, 14, 10), c, { p: [0, -0.1, 0], s: [1.0, 1.05, 0.38] });
    add(grp, sph(0.1, 14, 10), c, { p: [0, 0.07, 0], s: [1.0, 1.0, 0.38] });
    add(grp, cyl(0.045, 0.045, 0.02, 12), 0x1b2a41, { p: [0, -0.07, 0.055], r: [Math.PI / 2, 0, 0], noOutline: true });
    add(grp, box(0.055, 0.42, 0.04), 0x4b3b2a, { p: [0, 0.38, 0] });
    add(grp, box(0.09, 0.14, 0.04), 0x4b3b2a, { p: [0, 0.66, 0] });
    [-1, 1].forEach(function (sd) { add(grp, sph(0.016, 6, 5), 0xfffbf2, { p: [sd * 0.05, 0.66, 0.03], noOutline: true }); });
    for (var i = 0; i < 4; i++) add(grp, cyl(0.004, 0.004, 0.7, 3), 0xfffbf2, { p: [-0.015 + i * 0.01, 0.24, 0.03], noOutline: true });
    g.add(grp);
    add(g, box(0.4, 0.035, 0.02), 0xd9432c, { p: [0, 1.02, 0.28], r: [0, 0, 0.6], noOutline: true });
  },
  gear_accordion: function (g, c) {
    var grp = new THREE.Group();
    grp.position.set(0, 0.85, -0.3);
    grp.rotation.set(0.15, 0, 0);
    add(grp, box(0.16, 0.34, 0.24), c, { p: [-0.31, 0, 0] });
    add(grp, box(0.16, 0.34, 0.24), c, { p: [0.31, 0, 0] });
    for (var i = 0; i < 7; i++) add(grp, box(0.07, 0.3 - (i % 2) * 0.02, 0.2 + (i % 2) * 0.03), i % 2 ? 0xfffbf2 : 0xe8d9b9, { p: [-0.21 + i * 0.07, 0, 0], noOutline: true });
    for (var k = 0; k < 4; k++) add(grp, box(0.04, 0.045, 0.05), 0xfffbf2, { p: [-0.31, 0.11 - k * 0.07, -0.14] });
    for (var j = 0; j < 2; j++) add(grp, cyl(0.035, 0.035, 0.05, 8), 0xf2b134, { p: [0.31, 0.06 - j * 0.1, -0.14], r: [Math.PI / 2, 0, 0] });
    g.add(grp);
    [-1, 1].forEach(function (sd) { add(g, box(0.04, 0.5, 0.025), 0x1b2a41, { p: [sd * 0.2, 1.1, -0.2], r: [-0.4, 0, 0], noOutline: true }); });
  },
  gear_fan: function (g, c) {
    var grp = new THREE.Group();
    grp.position.set(0.0, 1.1, 0.34);
    var n = 9;
    for (var i = 0; i < n; i++) {
      var a = (i / (n - 1) - 0.5) * 2.4;
      var blade = add(grp, box(0.075, 0.5, 0.012), i % 2 ? c : 0xfffbf2, { p: [0, 0, 0], noOutline: true });
      blade.geometry.translate(0, 0.25, 0);
      blade.rotation.z = a;
      blade.position.z = i * 0.0012;
    }
    add(grp, cyl(0.03, 0.03, 0.2, 8), 0x4b3b2a, { p: [0, -0.08, 0.01] });
    add(grp, new THREE.TorusGeometry(0.4, 0.012, 4, 20, 2.4), 0x4b3b2a, { p: [0, 0.0, 0.012], r: [0, 0, Math.PI / 2 - 1.2], noOutline: true });
    g.add(grp);
    grp.rotation.x = 0.1;
  },
  gear_globe: function (g, c) {
    add(g, sph(0.24, 18, 12), c, { p: [0, 1.0, 0.42] });
    add(g, sph(0.1, 8, 6, 0, 3), 0x2e9e5b, { p: [-0.1, 1.07, 0.6], s: [1, 1, 0.5], noOutline: true });
    add(g, sph(0.07, 8, 6, 0, 3), 0x2e9e5b, { p: [0.1, 0.92, 0.62], s: [1, 1, 0.5], noOutline: true });
    add(g, torus(0.275, 0.018, Math.PI * 2, 6, 24), 0xd9a63a, { p: [0, 1.0, 0.42], r: [0, 0.4, 0.3] });
    add(g, cyl(0.02, 0.02, 0.62, 6), 0xd9a63a, { p: [0, 1.0, 0.42], r: [0, 0, 0.3], noOutline: true });
    add(g, cyl(0.07, 0.1, 0.05, 10), 0x4b3b2a, { p: [-0.07, 0.68, 0.42] });
    [-1, 1].forEach(function (sd) { add(g, box(0.04, 0.5, 0.025), 0x4b3b2a, { p: [sd * 0.2, 1.05, 0.22], r: [0.35, 0, 0], noOutline: true }); });
  },
  gear_binoculars: function (g, c) {
    add(g, torus(0.2, 0.012, Math.PI * 2, 4, 24), 0x1b2a41, { p: [0, 1.27, -0.02], r: [Math.PI / 2 - 0.45, 0, 0], noOutline: true });
    [-1, 1].forEach(function (sd) {
      add(g, cyl(0.065, 0.065, 0.2, 14), c, { p: [sd * 0.07, 1.0, -0.3], r: [Math.PI / 2 - 0.1, 0, 0] });
      add(g, cyl(0.085, 0.085, 0.07, 14), 0x1b2a41, { p: [sd * 0.07, 0.99, -0.42], r: [Math.PI / 2 - 0.1, 0, 0] });
      add(g, cyl(0.06, 0.06, 0.01, 12), 0x9fd8e6, { p: [sd * 0.07, 0.99, -0.46], r: [Math.PI / 2 - 0.1, 0, 0], noOutline: true });
    });
    add(g, box(0.1, 0.06, 0.08), 0xd9432c, { p: [0, 1.0, -0.3] });
  },
  gear_tube: function (g, c) {
    add(g, cyl(0.075, 0.075, 0.74, 12), c, { p: [0, 0.8, 0.33], r: [0, 0, Math.PI / 2 + 0.12] });
    add(g, cyl(0.085, 0.085, 0.05, 12), 0xd9a63a, { p: [-0.38, 0.84, 0.33], r: [0, 0, Math.PI / 2 + 0.12] });
    add(g, cyl(0.085, 0.085, 0.05, 12), 0xd9a63a, { p: [0.38, 0.76, 0.33], r: [0, 0, Math.PI / 2 + 0.12] });
    add(g, cyl(0.06, 0.06, 0.1, 10), 0xfffbf2, { p: [0.42, 0.75, 0.33], r: [0, 0, Math.PI / 2 + 0.12] });
    [-1, 1].forEach(function (sd) { add(g, box(0.04, 0.5, 0.025), 0x4b3b2a, { p: [sd * 0.22, 1.0, 0.2], r: [0.3, 0, 0], noOutline: true }); });
  },
  gear_pillow: function (g, c) {
    add(g, torus(0.2, 0.085, Math.PI * 1.75, 10, 18), c, { p: [0, 1.3, 0.0], r: [Math.PI / 2, 0, Math.PI * 0.6 + 0.0], s: [1.1, 1.0, 1.2] });
    add(g, new THREE.TorusGeometry(0.2, 0.012, 4, 20, Math.PI * 1.75), 0xfffbf2, { p: [0, 1.39, 0.0], r: [Math.PI / 2, 0, Math.PI * 0.6], s: [1.1, 1.0, 1.2], noOutline: true });
    add(g, cyl(0.03, 0.03, 0.03, 8), 0xfffbf2, { p: [0.2, 1.3, -0.18], noOutline: true });
  },
  gear_satchel: function (g, c) {
    add(g, box(0.34, 0.3, 0.12), c, { p: [-0.4, 0.68, 0.0] });
    add(g, box(0.36, 0.14, 0.135), 0x1b2a41, { p: [-0.4, 0.76, 0.0], noOutline: true });
    add(g, box(0.36, 0.04, 0.14), 0xd9432c, { p: [-0.4, 0.69, 0.0], noOutline: true });
    add(g, box(0.05, 0.05, 0.02), 0xd9a63a, { p: [-0.4, 0.68, -0.075], noOutline: true });
    add(g, box(0.05, 0.78, 0.03), c, { p: [-0.07, 1.04, -0.2], r: [0, 0, -0.45], noOutline: true });
  }
};

// ===== CLOTHING (built in runner space; the torso is about 0.3 wide and 0.22 deep, y 0.65 to 1.4) =====

/** A shell round the torso. */
function torsoShell(g, color, o) {
  o = o || {};
  var rt = o.rt || 0.33, rb = o.rb || 0.31, h = o.h || 0.78;
  var shell = add(g, cyl(rt, rb, h, 18), color, { p: [0, o.y || 0.95, 0], s: [1.1, 1, 0.86] });
  return shell;
}

var CLOTHES = {
  cloth_poncho: function (g, c) {
    var bands = [[0.18, 1.4, c], [0.28, 1.28, 0xf2b134], [0.38, 1.16, c], [0.46, 1.04, 0x0e8c8a], [0.54, 0.92, c], [0.62, 0.8, 0xfffbf2]];
    bands.forEach(function (b, i) {
      var next = bands[i + 1];
      var r1 = b[0], y1 = b[1], r2 = next ? next[0] : b[0] + 0.09, y2 = next ? next[1] : y1 - 0.12;
      add(g, lathe([[r2, y2], [r1, y1]], 18), b[2], { ds: true, s: [1, 1, 0.9] });
    });
    add(g, torus(0.18, 0.045, Math.PI * 2, 6, 18), 0x1b2a41, { p: [0, 1.4, 0], r: [Math.PI / 2, 0, 0], s: [1.05, 1, 1] });
    for (var i = 0; i < 14; i++) { // the fringe
      var a = i / 14 * Math.PI * 2;
      add(g, box(0.02, 0.1, 0.02), 0xfffbf2, { p: [Math.cos(a) * 0.73, 0.73, Math.sin(a) * 0.73 * 0.9], noOutline: true });
    }
  },
  cloth_happi: function (g, c) {
    torsoShell(g, c, { h: 0.8, y: 0.96 });
    [-1, 1].forEach(function (sd) {
      add(g, box(0.06, 0.8, 0.02), 0xfffbf2, { p: [sd * 0.11, 0.96, -0.3], noOutline: true });
      add(g, box(0.28, 0.2, 0.2), c, { p: [sd * 0.46, 1.17, 0.0], r: [0, 0, sd * -0.6] });
      add(g, box(0.28, 0.035, 0.205), 0xfffbf2, { p: [sd * 0.53, 1.07, 0.0], r: [0, 0, sd * -0.6], noOutline: true });
    });
    add(g, new THREE.CircleGeometry(0.15, 16), 0xfffbf2, { p: [0, 1.05, 0.289], ds: true, noOutline: true });
    add(g, new THREE.CircleGeometry(0.1, 16), c, { p: [0, 1.05, 0.292], ds: true, noOutline: true });
    add(g, torus(0.335, 0.045, Math.PI * 2, 6, 24), 0xd9432c, { p: [0, 0.68, 0], r: [Math.PI / 2, 0, 0], s: [1.1, 0.86, 1] });
    add(g, torus(0.2, 0.05, Math.PI * 2, 6, 18), 0xfffbf2, { p: [0, 1.38, 0.0], r: [Math.PI / 2, 0, 0] });
  },
  cloth_scarf: function (g, c) {
    add(g, torus(0.2, 0.07, Math.PI * 2, 10, 20), c, { p: [0, 1.3, 0.0], r: [Math.PI / 2, 0, 0] });
    add(g, torus(0.2, 0.074, Math.PI * 2, 10, 20, 0.0), 0x1b2a41, { p: [0, 1.3, 0.0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.14], noOutline: true });
    add(g, box(0.14, 0.58, 0.04), c, { p: [0.1, 1.0, -0.26], r: [0.1, 0, 0.08] });
    add(g, box(0.14, 0.45, 0.04), c, { p: [-0.02, 1.02, -0.28], r: [0.1, 0, -0.05] });
    [[0.1, 1.0, -0.283, 0.58, 0.08], [-0.02, 1.02, -0.303, 0.45, -0.05]].forEach(function (t) {
      for (var i = 0; i < 4; i++) add(g, box(0.142, 0.03, 0.005), i % 2 ? 0xf2b134 : 0x1b2a41, { p: [t[0], t[1] + (i - 1.5) * 0.11, t[2]], r: [0.1, 0, t[4]], noOutline: true });
      add(g, box(0.012, t[3], 0.005), 0x0e8c8a, { p: [t[0], t[1], t[2] - 0.005], r: [0.1, 0, t[4]], noOutline: true });
    });
    for (var f = 0; f < 5; f++) add(g, box(0.014, 0.07, 0.02), 0xd9432c, { p: [0.04 + f * 0.025, 0.68, -0.27], noOutline: true });
  },
  cloth_parka: function (g, c) {
    torsoShell(g, c, { rt: 0.36, rb: 0.38, h: 0.82, y: 0.93 });
    add(g, torus(0.25, 0.1, Math.PI * 2, 8, 20), 0xe9dcc2, { p: [0, 1.36, 0.04], r: [Math.PI / 2, 0, 0], s: [1.1, 1.0, 1.0] });
    add(g, box(0.05, 0.8, 0.02), 0x1b2a41, { p: [0, 0.94, -0.33], noOutline: true });
    [-1, 1].forEach(function (sd) {
      add(g, box(0.16, 0.14, 0.04), 0x1b2a41, { p: [sd * 0.2, 0.72, -0.3], noOutline: true });
      add(g, box(0.26, 0.2, 0.24), c, { p: [sd * 0.46, 1.15, 0.0], r: [0, 0, sd * -0.5] });
      add(g, torus(0.07, 0.035, Math.PI * 2, 6, 10), 0xe9dcc2, { p: [sd * 0.58, 1.01, 0.0], r: [0, Math.PI / 2, 0] });
    });
    add(g, torus(0.37, 0.035, Math.PI * 2, 6, 24), 0x1b2a41, { p: [0, 0.55, 0], r: [Math.PI / 2, 0, 0], s: [1.1, 0.86, 1], noOutline: true });
  },
  cloth_linen: function (g, c) {
    torsoShell(g, c, { rt: 0.325, rb: 0.33, h: 0.78 });
    [-1, 1].forEach(function (sd) {
      add(g, box(0.24, 0.22, 0.2), c, { p: [sd * 0.45, 1.15, 0.0], r: [0, 0, sd * -0.55] });
      add(g, box(0.24, 0.035, 0.205), 0x8a9a6a, { p: [sd * 0.52, 1.07, 0.0], r: [0, 0, sd * -0.55], noOutline: true });
      add(g, box(0.06, 0.2, 0.025), 0xe4d4b0, { p: [sd * 0.07, 1.33, -0.27], r: [0.15, 0, sd * 0.4] });
    });
    for (var i = 0; i < 4; i++) add(g, sph(0.018, 6, 5), 0x7a5c3a, { p: [0, 1.2 - i * 0.14, -0.288], noOutline: true });
    add(g, new THREE.CircleGeometry(0.06, 8), 0x8a9a6a, { p: [0.14, 1.05, -0.289], ds: true, noOutline: true });
  },
  cloth_slicker: function (g, c) {
    torsoShell(g, c, { rt: 0.35, rb: 0.42, h: 0.9, y: 0.88 });
    add(g, new THREE.ConeGeometry(0.22, 0.34, 12, 1, true), c, { ds: true, p: [0, 1.22, 0.24], r: [-0.5, 0, 0] });
    add(g, torus(0.22, 0.045, Math.PI * 2, 6, 18), c, { p: [0, 1.38, 0.0], r: [Math.PI / 2, 0, 0] });
    [-1, 1].forEach(function (sd) {
      add(g, box(0.26, 0.22, 0.24), c, { p: [sd * 0.47, 1.14, 0.0], r: [0, 0, sd * -0.5] });
      add(g, box(0.27, 0.05, 0.25), 0xd9a63a, { p: [sd * 0.55, 1.03, 0.0], r: [0, 0, sd * -0.5], noOutline: true });
    });
    for (var i = 0; i < 4; i++) add(g, cyl(0.025, 0.025, 0.02, 8), 0x1b2a41, { p: [0, 1.2 - i * 0.17, -0.31], r: [Math.PI / 2, 0, 0], noOutline: true });
    add(g, box(0.28, 0.1, 0.03), 0xd9a63a, { p: [0, 0.65, -0.34], noOutline: true });
  },
  cloth_denim: function (g, c) {
    torsoShell(g, c, { rt: 0.335, rb: 0.32, h: 0.7, y: 0.99 });
    [-1, 1].forEach(function (sd) {
      add(g, box(0.25, 0.22, 0.22), c, { p: [sd * 0.46, 1.16, 0.0], r: [0, 0, sd * -0.55] });
      add(g, box(0.26, 0.04, 0.225), 0x8fb1d6, { p: [sd * 0.53, 1.07, 0.0], r: [0, 0, sd * -0.55], noOutline: true });
      add(g, box(0.11, 0.1, 0.04), 0x8fb1d6, { p: [sd * 0.17, 1.12, -0.285], noOutline: true });
      add(g, sph(0.015, 6, 5), 0xd9a63a, { p: [sd * 0.17, 1.12, -0.31], noOutline: true });
      add(g, box(0.1, 0.12, 0.05), c, { p: [sd * 0.1, 1.34, -0.25], r: [0.2, 0, sd * 0.5] });
    });
    add(g, box(0.02, 0.7, 0.02), 0x8fb1d6, { p: [0, 0.99, -0.29], noOutline: true });
    for (var i = 0; i < 4; i++) add(g, sph(0.018, 6, 5), 0xd9a63a, { p: [0.0, 1.26 - i * 0.16, -0.3], noOutline: true });
    add(g, box(0.5, 0.035, 0.03), 0x8fb1d6, { p: [0, 0.68, -0.27], noOutline: true });
  },
  cloth_tracksuit: function (g, c) {
    torsoShell(g, c, { h: 0.8, y: 0.96 });
    [-1, 1].forEach(function (sd) {
      add(g, box(0.25, 0.22, 0.22), c, { p: [sd * 0.46, 1.16, 0.0], r: [0, 0, sd * -0.55] });
      add(g, box(0.04, 0.5, 0.012), 0xfffbf2, { p: [sd * 0.36, 0.95, -0.15], r: [0, 0, 0], noOutline: true });
      add(g, box(0.04, 0.5, 0.012), 0xfffbf2, { p: [sd * 0.395, 0.95, -0.085], r: [0, 0, 0], noOutline: true });
      add(g, box(0.1, 0.55, 0.22), c, { p: [sd * 0.14, 0.35, 0.0] });
      add(g, box(0.035, 0.55, 0.222), 0xfffbf2, { p: [sd * 0.2, 0.35, 0.0], noOutline: true });
    });
    add(g, torus(0.2, 0.05, Math.PI * 2, 6, 18), 0xfffbf2, { p: [0, 1.38, 0], r: [Math.PI / 2, 0, 0] });
    add(g, box(0.02, 0.5, 0.02), 0xfffbf2, { p: [0, 1.15, -0.29], noOutline: true });
    add(g, box(0.4, 0.04, 0.2), 0xfffbf2, { p: [0, 0.6, -0.07], noOutline: true });
  },
  cloth_vest: function (g, c) {
    torsoShell(g, c, { rt: 0.34, rb: 0.33, h: 0.66, y: 1.02 });
    add(g, box(0.34, 0.5, 0.02), 0xfffbf2, { p: [0, 1.02, -0.292], noOutline: true });
    for (var i = 0; i < 4; i++) {
      add(g, box(0.34, 0.02, 0.03), 0xd9432c, { p: [0, 1.2 - i * 0.12, -0.3], noOutline: true });
      add(g, box(0.02, 0.15, 0.03), 0xd9432c, { p: [-0.1, 1.14 - i * 0.12, -0.31], r: [0, 0, 0.6], noOutline: true });
      add(g, box(0.02, 0.15, 0.03), 0xd9432c, { p: [0.1, 1.14 - i * 0.12, -0.31], r: [0, 0, -0.6], noOutline: true });
    }
    [-1, 1].forEach(function (sd) {
      add(g, box(0.09, 0.14, 0.11), c, { p: [sd * 0.3, 1.31, 0.0] });
      add(g, box(0.26, 0.22, 0.2), 0xfffbf2, { p: [sd * 0.46, 1.16, 0.0], r: [0, 0, sd * -0.55] });
    });
    add(g, new THREE.CircleGeometry(0.05, 6), 0xfffbf2, { p: [0.17, 0.82, -0.325], ds: true, noOutline: true });
  }
};

// ===== public =====

/** The item ids that have a drawing. */
export var HAT_IDS = Object.keys(HATS);
export var GEAR_IDS = Object.keys(GEAR);
export var CLOTHING_IDS = Object.keys(CLOTHES);

/** Where a gear item rides on the body ('chest' or 'hip'). */
export function gearSlot(id) { return GEAR_SLOT[id] || 'chest'; }

function finish(g, outline) {
  paperizeMaterials(g, { keepColors: true });
  if (outline !== false) outlineGroup(g, 0.014);
  return g;
}

/**
 * A hat, with its origin at the crown (where it touches the head); null for none. `s` scales it to the head.
 * @param {string} id
 * @param {number} color the item's main colour
 * @param {number} [s]
 */
export function buildHat(id, color, s) {
  var f = HATS[id];
  if (!f) return null;
  var g = new THREE.Group();
  g.name = id;
  f(g, color);
  g.scale.setScalar(s || 1);
  return finish(g);
}

/** A piece of gear in runner space (null for none). */
export function buildGear(id, color, s) {
  var f = GEAR[id];
  if (!f) return null;
  var g = new THREE.Group();
  g.name = id;
  f(g, color);
  if (s && s !== 1) g.scale.setScalar(s);
  return finish(g);
}

/** An outfit in runner space (null for none). */
export function buildClothing(id, color, s) {
  var f = CLOTHES[id];
  if (!f) return null;
  var g = new THREE.Group();
  g.name = id;
  f(g, color);
  if (s && s !== 1) g.scale.setScalar(s);
  return finish(g);
}
