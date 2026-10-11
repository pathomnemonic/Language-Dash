/**
 * hospitalhall.js — the four walled-in Great Library rooms (the file name is kept from the original game): the
 * Library Hall (skin_hospital_hallway), the Translators Booth (skin_operating_room), the Codebreakers Lab
 * (skin_research_lab) and the Midnight Platform (skin_ambulance_bay). A proper corridor with doors, bookcases,
 * a ceiling with light panels and rails, in the style of a Subway Surfers level.
 *
 * Walls repeat every HALL_PERIOD units (four 4-unit bays), so the corridor scrolls seamlessly while
 * still looking varied: door, bookcases, double doors, then a bay with a lectern and a lamp.
 */

import * as THREE from 'three';
import { softDotTexture } from './materials.js';
import { buildScenery } from './scenery.js';

export var HALL_BAY = 4;
export var HALL_PERIOD = 16;
export var HALL_HEIGHT = 6.4;

function box(g, w, h, d, color, x, y, z, opts) {
  var o = opts || {};
  var mat = new THREE.MeshBasicMaterial({ color: color });
  if (o.opacity !== undefined) { mat.transparent = true; mat.opacity = o.opacity; }
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// ---------- painted surfaces: tiles with grout, and soft pools of light on the floor ----------
var _tex = {};

/** A tile pattern drawn on a canvas (null where canvases are unavailable, e.g. in unit tests). */
function tileTexture(key, tiles, checker) {
  if (_tex[key] !== undefined) return _tex[key];
  var t = null;
  if (typeof document !== 'undefined') {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (ctx) {
      var n = tiles;
      var size = 128 / n;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
          // each tile a touch lighter or darker, with a soft highlight along its top edge
          var shade = checker ? ((i + j) % 2 ? 0.9 : 1) : 0.94 + ((i * 7 + j * 13) % 5) * 0.012;
          ctx.fillStyle = 'rgba(' + Math.round(255 * shade) + ',' + Math.round(255 * shade) + ',' + Math.round(255 * shade) + ',1)';
          ctx.fillRect(i * size + 1.5, j * size + 1.5, size - 3, size - 3);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(i * size + 2, j * size + 2, size - 4, 2);
        }
      }
      ctx.strokeStyle = 'rgba(40,60,70,0.55)';
      ctx.lineWidth = 3;
      for (var k = 0; k <= n; k++) {
        ctx.beginPath(); ctx.moveTo(k * size, 0); ctx.lineTo(k * size, 128); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, k * size); ctx.lineTo(128, k * size); ctx.stroke();
      }
      t = new THREE.CanvasTexture(canvas);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    }
  }
  _tex[key] = t;
  return t;
}

/** Give a wall slab or floor panel a tiled surface. */
function texture(mesh, tex, rx, ry) {
  if (!tex) return mesh;
  var ck = tex.uuid + '_' + rx + '_' + ry;
  var t = _tex[ck];
  if (!t) {
    t = _tex[ck] = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(rx, ry);
  }
  mesh.material.map = t;
  mesh.material.needsUpdate = true;
  return mesh;
}

/**
 * Put a real 3D model in the room if it has loaded (returns false so the caller can draw the
 * simple built-in version instead). `side` turns it to face the track.
 */
function model(g, key, fit, x, y, z, side, extraYaw) {
  var m = buildScenery(key, fit);
  if (!m) return false;
  m.position.set(x, y, z);
  m.rotation.y = (side < 0 ? Math.PI / 2 : -Math.PI / 2) + (extraYaw || 0);
  g.add(m);
  return true;
}

function cylinder(g, r, h, color, x, y, z, rotZ, rotX) {
  var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), new THREE.MeshBasicMaterial({ color: color }));
  m.position.set(x, y, z);
  if (rotZ) m.rotation.z = rotZ;
  if (rotX) m.rotation.x = rotX;
  g.add(m);
  return m;
}

/** Which of the four bays this z is (0..3), stable as the corridor scrolls. */
export function bayIndex(z) {
  var k = Math.round(z / HALL_BAY);
  return ((k % 4) + 4) % 4;
}

/** A cone (lamp shades, pendant lights). */
function cone(g, rTop, rBot, h, color, x, y, z) {
  var m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 12), new THREE.MeshBasicMaterial({ color: color }));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

var SPINES = [0xc0392b, 0x2a6f9a, 0x2f9e6f, 0xf2c230, 0x7a4aa0, 0xe07a2a, 0x2a8f9a, 0xa83a5a];

/** A bookcase against the wall: coloured spines on every shelf. */
function bookcase(g, xin, z, span, rows, seed) {
  box(g, 0.5, rows * 0.6 + 0.2, span, 0x6a4529, xin(0.3), (rows * 0.6 + 0.2) / 2, z);
  for (var r = 0; r < rows; r++) {
    box(g, 0.06, 0.05, span - 0.1, 0x4a2f1a, xin(0.58), 0.22 + r * 0.6, z);
    var n = Math.floor(span / 0.2);
    for (var i = 0; i < n; i++) {
      var h = 0.34 + (((i * 7 + r * 3 + seed) % 5) * 0.04);
      box(g, 0.12, h, 0.14, SPINES[(i + r * 3 + seed) % SPINES.length], xin(0.55), 0.25 + r * 0.6 + h / 2, z - span / 2 + 0.15 + i * 0.2);
    }
  }
}

/** A globe on a wooden stand. */
function globe(g, x, z) {
  cylinder(g, 0.18, 0.06, 0x6a4529, x, 0.03, z);
  cylinder(g, 0.025, 0.7, 0x6a4529, x, 0.4, z);
  var ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshBasicMaterial({ color: 0x3a86d9 }));
  ball.position.set(x, 1.05, z);
  g.add(ball);
  var land = new THREE.Mesh(new THREE.SphereGeometry(0.43, 8, 6, 0.4, 1.6, 0.6, 1.1), new THREE.MeshBasicMaterial({ color: 0x4fbf6f }));
  land.position.set(x, 1.05, z);
  g.add(land);
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 20), new THREE.MeshBasicMaterial({ color: 0xd8a860 }));
  ring.position.set(x, 1.05, z);
  ring.rotation.y = Math.PI / 2;
  g.add(ring);
}

/** A wheeled library cart stacked with books. */
function bookCart(g, x, z) {
  box(g, 0.6, 0.06, 1.1, 0x6a4529, x, 0.5, z);
  box(g, 0.6, 0.06, 1.1, 0x6a4529, x, 0.2, z);
  for (var i = 0; i < 4; i++) box(g, 0.05, 0.9, 0.05, 0x4a2f1a, x + (i % 2 ? 0.27 : -0.27), 0.45, z + (i < 2 ? -0.5 : 0.5));
  for (var b = 0; b < 5; b++) box(g, 0.4, 0.1, 0.22, SPINES[b % SPINES.length], x, 0.58 + b * 0.1, z - 0.3 + (b % 2) * 0.1);
  for (var w = 0; w < 4; w++) cylinder(g, 0.07, 0.04, 0x222a2e, x + (w % 2 ? 0.25 : -0.25), 0.07, z + (w < 2 ? -0.45 : 0.45), Math.PI / 2);
}

function libraryDetails(g, side, z, k, xin) {
  if (k === 0 || k === 2) {
    var wide = k === 2;
    var span = wide ? 3.0 : 1.5;
    if (k === 0 && side < 0) bookCart(g, xin(0.8), z + 0.9);
    if (k === 2 && side > 0) globe(g, xin(0.6), z + 1.9);
    // arched doorway with a carved frame and a gold plaque
    box(g, 0.1, 2.75, span + 0.2, 0x6a4529, xin(0.06), 1.375, z);
    box(g, 0.08, 2.6, span, wide ? 0x7a3a2a : 0x8a5a34, xin(0.12), 1.3, z);
    if (wide) {
      box(g, 0.1, 2.6, 0.06, 0xd8a860, xin(0.13), 1.3, z);                       // split between the leaves
      box(g, 0.1, 0.22, span, 0xd8a860, xin(0.14), 0.4, z);                      // brass kick plate
      box(g, 0.09, 0.7, 0.55, 0xffe6a8, xin(0.15), 1.9, z - 0.7);
      box(g, 0.09, 0.7, 0.55, 0xffe6a8, xin(0.15), 1.9, z + 0.7);
      // an open book sign over the doors
      box(g, 0.08, 0.5, 0.55, 0xf5ecd0, xin(0.1), 4.1, z - 0.3);
      box(g, 0.08, 0.5, 0.55, 0xf5ecd0, xin(0.1), 4.1, z + 0.3);
      box(g, 0.1, 0.55, 0.06, 0xb8863a, xin(0.1), 4.1, z);
    } else {
      box(g, 0.09, 0.75, 0.5, 0xffe6a8, xin(0.16), 1.85, z);
      box(g, 0.07, 0.28, 0.7, 0xb8863a, xin(0.1), 3.0, z);                       // brass plaque
      box(g, 0.08, 0.1, 0.22, 0xf5ecd0, xin(0.12), 3.0, z);
    }
  } else if (k === 1) {
    // tall bookcases floor to ceiling, with a round window above
    bookcase(g, xin, z, 3.2, 4, side > 0 ? 1 : 3);
    box(g, 0.1, 0.8, 3.2, 0x6a4529, xin(0.08), 4.3, z);
    box(g, 0.08, 0.6, 2.9, 0xa7dcec, xin(0.12), 4.3, z);
    box(g, 0.1, 0.6, 0.06, 0x6a4529, xin(0.16), 4.3, z);
  } else {
    // a pinboard of postcards, a lectern with an open book and a lamp
    box(g, 0.07, 1.25, 1.5, 0xc9a56a, xin(0.07), 3.0, z - 0.5);
    box(g, 0.08, 0.3, 0.42, 0xf5ecd0, xin(0.1), 3.3, z - 0.8);
    box(g, 0.08, 0.3, 0.42, 0xd9534f, xin(0.1), 2.9, z - 0.2);
    box(g, 0.08, 0.3, 0.42, 0x4fa8d9, xin(0.1), 3.3, z - 0.2);
    box(g, 0.08, 0.3, 0.42, 0xf2c230, xin(0.1), 2.7, z - 0.8);
    cylinder(g, 0.09, 1.0, 0x6a4529, xin(0.5), 0.5, z + 1.3);
    box(g, 0.5, 0.06, 0.7, 0x6a4529, xin(0.5), 1.05, z + 1.3);
    box(g, 0.4, 0.04, 0.3, 0xf5ecd0, xin(0.5), 1.1, z + 1.15);
    box(g, 0.4, 0.04, 0.3, 0xf5ecd0, xin(0.5), 1.1, z + 1.45);
    cylinder(g, 0.025, 0.5, 0xb8863a, xin(0.7), 1.3, z + 1.3);
    cone(g, 0.04, 0.2, 0.2, 0x39a06f, xin(0.7), 1.6, z + 1.3);
    if (side < 0) {
      // a reading table with an open atlas
      box(g, 0.7, 0.08, 1.6, 0x8a5a34, xin(0.65), 0.8, z - 0.9);
      for (var lx = -1; lx <= 1; lx += 2) for (var lz = -1; lz <= 1; lz += 2) cylinder(g, 0.04, 0.76, 0x6a4529, xin(0.65) + lx * 0.27, 0.38, z - 0.9 + lz * 0.7);
      box(g, 0.5, 0.04, 0.4, 0xf5ecd0, xin(0.65), 0.86, z - 1.0);
      box(g, 0.5, 0.04, 0.4, 0xf0d9a0, xin(0.65), 0.86, z - 0.6);
    } else {
      // stack of books and a reading ladder
      for (var b = 0; b < 5; b++) box(g, 0.5 - b * 0.03, 0.12, 0.7 - b * 0.04, SPINES[b % SPINES.length], xin(0.7), 0.06 + b * 0.12, z - 0.7);
      cylinder(g, 0.03, 2.4, 0x8a5a34, xin(0.25), 1.2, z - 1.4);
      cylinder(g, 0.03, 2.4, 0x8a5a34, xin(0.25), 1.2, z - 0.8);
      for (var r = 0; r < 5; r++) box(g, 0.05, 0.05, 0.62, 0x8a5a34, xin(0.25), 0.4 + r * 0.45, z - 1.1);
    }
  }
}

// ---------- Translators Booth: glass interpreter booths, headset racks, sound-wave screens, "ON AIR" doors ----------
function orDetails(g, side, z, k, xin) {
  if (k === 0 && side > 0) globe(g, xin(0.6), z + 1.0);
  if (k === 3 && side < 0) bookCart(g, xin(0.7), z - 1.4);
  if (k === 0) {
    // booth window: a glass front with a desk, microphone and headset inside
    box(g, 0.1, 1.9, 3.3, 0x5a7f9f, xin(0.06), 2.6, z);
    box(g, 0.08, 1.7, 3.1, 0xb9dff0, xin(0.1), 2.6, z);
    box(g, 0.1, 1.7, 0.06, 0x5a7f9f, xin(0.13), 2.6, z);
    box(g, 0.1, 0.2, 3.5, 0x5a7f9f, xin(0.08), 1.65, z);
    cylinder(g, 0.015, 0.3, 0x222a2e, xin(0.2), 1.95, z - 0.6);
    cylinder(g, 0.06, 0.1, 0x222a2e, xin(0.2), 2.15, z - 0.6);
    box(g, 0.05, 0.05, 0.4, 0x222a2e, xin(0.2), 2.4, z + 0.5);
  } else if (k === 1) {
    // pigeonholes for headsets and phrasebooks with a coat-hook rail
    box(g, 0.5, 1.8, 3.0, 0x8a6a4a, xin(0.3), 0.9, z);
    for (var rr = 0; rr < 3; rr++) {
      for (var cc = 0; cc < 4; cc++) {
        box(g, 0.05, 0.4, 0.6, 0x3a2a1a, xin(0.57), 0.35 + rr * 0.55, z - 1.1 + cc * 0.73);
        if ((rr + cc) % 2) box(g, 0.04, 0.3, 0.2, SPINES[(rr * 4 + cc) % SPINES.length], xin(0.6), 0.35 + rr * 0.55, z - 1.1 + cc * 0.73);
      }
    }
    box(g, 0.8, 0.1, 1.2, 0xc9a56a, xin(0.5), 1.85, z);
  } else if (k === 2) {
    // wall screen with a sound wave
    box(g, 0.1, 1.3, 1.9, 0x1d2428, xin(0.08), 3.1, z);
    box(g, 0.09, 1.1, 1.7, 0x0a1f3a, xin(0.12), 3.1, z);
    var pts = [[-0.7, 0], [-0.5, 0.1], [-0.4, -0.2], [-0.3, 0.35], [-0.2, -0.4], [-0.1, 0.45], [0.05, -0.35], [0.2, 0.25], [0.35, -0.1], [0.5, 0.05], [0.7, 0]];
    pts.forEach(function (p, i) { if (i) { var q = pts[i - 1]; box(g, 0.08, Math.max(0.05, Math.abs(p[1] - q[1])), 0.14, 0x5fd0ff, xin(0.17), 3.1 + (p[1] + q[1]) / 2, z + (p[0] + q[0]) / 2); } });
    box(g, 0.5, 0.2, 1.0, 0x8a6a4a, xin(0.4), 0.95, z);
  } else {
    // glass booth door with an ON AIR lamp
    box(g, 0.1, 2.9, 3.4, 0x5a7f9f, xin(0.06), 1.45, z);
    box(g, 0.09, 2.7, 1.5, 0xc4e2ef, xin(0.12), 1.35, z - 0.78);
    box(g, 0.09, 2.7, 1.5, 0xc4e2ef, xin(0.14), 1.35, z + 0.78);
    box(g, 0.1, 0.8, 0.45, 0xe8f6fb, xin(0.18), 1.9, z - 0.78);
    box(g, 0.1, 0.8, 0.45, 0xe8f6fb, xin(0.2), 1.9, z + 0.78);
    box(g, 0.08, 0.3, 0.9, 0x1d2428, xin(0.1), 3.4, z);
    box(g, 0.1, 0.18, 0.18, 0xff3b3b, xin(0.15), 3.4, z - 0.25);
    box(g, 0.1, 0.18, 0.18, 0x4a5558, xin(0.15), 3.4, z + 0.25);
  }
}

// ---------- Codebreakers Lab: stone-cutters' benches, scrolls and tablets, a three-script stone, cipher wheels, inkwells ----------
function labDetails(g, side, z, k, xin) {
  var ink = [0x2a5f8f, 0xc0392b, 0x2f9e6f, 0x7a4aa0];
  if (k === 0 || k === 2) {
    // bench with stone tablets, scrolls, an ink pot and a quill
    box(g, 0.9, 1.0, 3.4, 0x8a6a4a, xin(0.5), 0.5, z);
    box(g, 1.0, 0.08, 3.5, 0x4a3a2a, xin(0.52), 1.04, z);
    for (var i = 0; i < 3; i++) {
      box(g, 0.45, 0.07, 0.5, 0xb8aa90, xin(0.55), 1.12 + i * 0.07, z - 1.0 + i * 0.1);
      cylinder(g, 0.07, 0.5, [0xf5ecd0, 0xe8d3aa][i % 2], xin(0.55), 1.17, z - 0.2 + i * 0.35, 0, Math.PI / 2);
    }
    cylinder(g, 0.08, 0.14, 0x1d2a3a, xin(0.4), 1.15, z + 1.3);
    box(g, 0.03, 0.4, 0.03, 0xf5ecd0, xin(0.4), 1.4, z + 1.3);
    // shelf above with scrolls
    box(g, 0.4, 0.06, 3.0, 0x8a6a4a, xin(0.25), 2.6, z);
    for (var j = 0; j < 5; j++) cylinder(g, 0.1, 0.38, [0xf5ecd0, 0xe8d3aa, 0xf0dfb8][j % 3], xin(0.25), 2.82, z - 1.2 + j * 0.6, 0, Math.PI / 2);
    for (var j2 = 0; j2 < 5; j2++) cylinder(g, 0.025, 0.4, ink[j2 % 4], xin(0.25), 2.82, z - 1.2 + j2 * 0.6, Math.PI / 2);
  } else if (k === 1) {
    // a giant three-script stone: three bands of carved lines (the Rosetta stone)
    box(g, 0.2, 2.1, 3.0, 0x5a5a5e, xin(0.12), 2.1, z);
    var bandCols = [0xb8b8bc, 0xa8a8ac, 0xc4c4c8];
    for (var r = 0; r < 3; r++) {
      box(g, 0.08, 0.55, 2.7, bandCols[r], xin(0.24), 1.5 + r * 0.65, z);
      for (var cI = 0; cI < 8; cI++) box(g, 0.06, 0.06, 0.18 + ((cI + r) % 3) * 0.08, 0x3a3a40, xin(0.29), 1.4 + r * 0.65 + (cI % 2) * 0.16, z - 1.1 + cI * 0.3);
    }
    box(g, 0.9, 0.5, 1.4, 0x8a6a4a, xin(0.55), 0.25, z - 1.2);
    box(g, 0.5, 0.9, 0.5, 0xb8aa90, xin(0.6), 0.45, z + 1.2);
  } else {
    // a pair of giant cipher wheels on the wall: stacked discs with tick marks, and a brass pointer
    box(g, 0.2, 2.9, 3.0, 0x6a5a45, xin(0.12), 1.45, z);
    [[1.25, 0x2a5f8f, 0.9], [0.8, 0xc09a5a, 0.95]].forEach(function (w, wi) {
      cylinder(g, w[0], 0.1, w[1], xin(0.22 + wi * 0.06), 1.8, z, Math.PI / 2);
    });
    for (var tk = 0; tk < 12; tk++) {
      var ta = (tk / 12) * Math.PI * 2;
      box(g, 0.05, 0.08, 0.2, 0xf5ecd0, xin(0.3), 1.8 + Math.cos(ta) * 1.05, z + Math.sin(ta) * 1.05);
    }
    box(g, 0.06, 0.1, 1.3, 0xd8a860, xin(0.38), 1.8, z);
    // a bubbling inkwell on a stool
    cylinder(g, 0.2, 0.5, 0x6a4529, xin(0.8), 0.25, z + 1.3);
    cylinder(g, 0.16, 0.3, 0x1d2a3a, xin(0.8), 0.65, z + 1.3);
    for (var bb = 0; bb < 3; bb++) { var bub = new THREE.Mesh(new THREE.SphereGeometry(0.05 + bb * 0.02, 6, 5), new THREE.MeshBasicMaterial({ color: 0x5fd0ff })); bub.position.set(xin(0.8), 0.95 + bb * 0.18, z + 1.3); g.add(bub); }
  }
}

// ---------- Midnight Platform: carriage doors, a departures board, pillars, trolleys and benches ----------
function bayDetails(g, side, z, k, xin) {
  if (k === 0 || k === 2) {
    // train carriage side with a door and windows
    box(g, 0.1, 3.4, 3.4, 0x2a5f8f, xin(0.06), 1.7, z);
    box(g, 0.1, 0.3, 3.5, 0xe0e6ee, xin(0.1), 1.0, z);
    for (var s = 0; s < 3; s++) box(g, 0.08, 0.9, 0.8, 0xbfe6f4, xin(0.12), 2.2, z - 1.0 + s * 1.0);
    box(g, 0.09, 2.5, 0.9, 0x1f4a70, xin(0.14), 1.35, z);
    box(g, 0.1, 0.25, 3.5, 0xf2c230, xin(0.1), 3.5, z);
    box(g, 0.1, 0.12, 0.5, 0x222a2e, xin(0.14), 3.5, z - 1.0);
    box(g, 0.1, 0.12, 0.5, 0x222a2e, xin(0.14), 3.5, z + 1.0);
  } else if (k === 1) {
    // DEPARTURES board: dark panel with rows of amber text blocks
    box(g, 0.1, 1.3, 3.2, 0x1d2428, xin(0.08), 3.4, z);
    for (var rw = 0; rw < 3; rw++) {
      for (var l = 0; l < 6; l++) box(g, 0.08, 0.14, 0.2 + ((l + rw) % 3) * 0.12, 0xffb02a, xin(0.15), 3.85 - rw * 0.4, z - 1.3 + l * 0.45);
    }
    box(g, 0.08, 0.1, 3.0, 0xffffff, xin(0.14), 2.85, z);
  } else {
    // platform furniture: a bench, a pile of suitcases and a station clock
    box(g, 0.6, 0.08, 2.2, 0x8a5a34, xin(0.7), 0.5, z);
    box(g, 0.08, 0.5, 2.2, 0x8a5a34, xin(0.45), 0.8, z);
    for (var lg = 0; lg < 2; lg++) box(g, 0.5, 0.5, 0.08, 0x3a3a40, xin(0.7), 0.25, z - 0.9 + lg * 1.8);
    // the rubber duck on night duty, on the bench
    var duck = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    duck.position.set(xin(0.7), 0.7, z + 0.2); g.add(duck);
    var duckHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    duckHead.position.set(xin(0.7), 0.88, z + 0.28); g.add(duckHead);
    box(g, 0.1, 0.04, 0.1, 0xff8a1f, xin(0.7), 0.86, z + 0.38);
    box(g, 0.6, 0.5, 0.7, 0xd9534f, xin(0.75), 0.25, z - 1.6);
    box(g, 0.5, 0.4, 0.6, 0x2fa48f, xin(0.75), 0.7, z - 1.6);
    box(g, 0.4, 0.3, 0.5, 0xf2c230, xin(0.75), 1.05, z - 1.6);
    cylinder(g, 0.55, 0.08, 0xf5ecd0, xin(0.1), 4.4, z, Math.PI / 2);
    cylinder(g, 0.6, 0.06, 0x222a2e, xin(0.08), 4.4, z, Math.PI / 2);
    box(g, 0.06, 0.4, 0.05, 0x222a2e, xin(0.16), 4.5, z);
    box(g, 0.06, 0.05, 0.3, 0x222a2e, xin(0.16), 4.4, z + 0.12);
  }
  if (k === 0 || k === 2) { model(g, 'cone', { height: 0.7, width: 0.5, depth: 0.5 }, xin(0.6), 0, z - 1.9, side); }
  // yellow safety post by every door
  cylinder(g, 0.1, 0.8, 0xf2c230, xin(0.5), 0.4, z + 1.8);
}

var ROOM_DETAILS = { room_or: orDetails, room_lab: labDetails, room_bay: bayDetails };

/** One 4-unit bay of one side wall (plus, on the left side, the ceiling above both). */
export function buildHallWallBay(skin, side, z) {
  var g = new THREE.Group();
  var c = skin.colors;
  var d = -side;                       // toward the track
  var xin = function (off) { return side * 5.5 + d * off; };
  var k = bayIndex(z);

  // wall, lower panel, rail and crown
  var slab = box(g, 0.3, HALL_HEIGHT, HALL_BAY, c.wallA, side * 5.65, HALL_HEIGHT / 2, z);
  var wallTiles = { room_or: 4, room_lab: 3, hospital_hall: 2, room_bay: 2 }[skin.wallType];
  texture(slab, tileTexture('wall' + skin.wallType, wallTiles || 2, false), skin.wallType === 'room_bay' ? 2 : 3, 4);
  box(g, 0.08, 1.15, HALL_BAY, c.wallB, xin(0.04), 0.575, z);
  box(g, 0.1, 0.08, HALL_BAY, 0xc4ced2, xin(0.13), 1.2, z);
  box(g, 0.1, 0.22, HALL_BAY, c.wallB, xin(0.05), HALL_HEIGHT - 0.2, z);

  var detail = ROOM_DETAILS[skin.wallType] || libraryDetails;
  detail(g, side, z, k, xin, c);

  if (side < 0) {
    // ceiling with two light panels per bay, built once (from the left side)
    box(g, 11.6, 0.3, HALL_BAY, c.archMain, 0, HALL_HEIGHT + 0.1, z);
    // tiled floor panel for this bay (it scrolls with the walls, so the floor seems to rush past)
    var floorTiles = new THREE.Mesh(new THREE.PlaneGeometry(12, HALL_BAY), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: skin.wallType === 'room_bay' ? 0.1 : 0.34, depthWrite: false }));
    floorTiles.rotation.x = -Math.PI / 2;
    floorTiles.position.set(0, 0.008, z);
    texture(floorTiles, tileTexture('floor' + skin.groundType, 2, true), 6, 2);
    g.add(floorTiles);
    // soft pools of light under each ceiling panel
    var dot = softDotTexture();
    [-2.4, 2.4].forEach(function (px) {
      var pool = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), new THREE.MeshBasicMaterial({ color: skin.wallType === 'room_bay' ? 0xfff0c0 : 0xffffff, map: dot, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(px, 0.02, z);
      g.add(pool);
    });
    box(g, 1.3, 0.06, 2.6, 0xffffff, -2.4, HALL_HEIGHT - 0.08, z);
    box(g, 1.3, 0.06, 2.6, 0xffffff, 2.4, HALL_HEIGHT - 0.08, z);
  }
  return g;
}

/** Hanging fixtures over the middle of the room: a hanging sign, pendant lamps, scroll banners or station signals. */
export function buildHallSign(skin, z) {
  var g = new THREE.Group();
  var top = HALL_HEIGHT;
  if (skin.archType === 'or_lamps') {
    // pendant booth lamps with a warm glass shade
    for (var lx = -1; lx <= 1; lx += 2) {
      cylinder(g, 0.03, 1.2, 0x3a4350, lx * 1.9, top - 0.6, z);
      cone(g, 0.15, 0.7, 0.45, 0x2a5f8f, lx * 1.9, top - 1.35, z);
      cylinder(g, 0.4, 0.05, 0xfff2c0, lx * 1.9, top - 1.62, z);
      cylinder(g, 0.08, 0.1, 0xffffff, lx * 1.9, top - 1.55, z);
    }
  } else if (skin.archType === 'lab_pipes') {
    // a beam with hanging scroll banners in three scripts' colours
    cylinder(g, 0.1, 10.8, 0x6a4529, 0, top - 0.5, z, Math.PI / 2);
    var cols = [0xc0392b, 0x2a6f9a, 0xf2c230];
    for (var p = -4; p <= 4; p += 4) {
      box(g, 0.1, 0.5, 0.1, 0x4a2f1a, p, top - 0.3, z);
      box(g, 1.1, 1.4, 0.06, cols[(p + 4) / 4], p, top - 1.3, z);
      cylinder(g, 0.07, 1.2, 0x4a2f1a, p, top - 0.55, z, Math.PI / 2);
      for (var ln = 0; ln < 3; ln++) box(g, 0.7 - ln * 0.1, 0.06, 0.08, 0xf5ecd0, p, top - 1.0 - ln * 0.25, z);
    }
  } else if (skin.archType === 'bay_lights') {
    // station lamps and a green signal
    for (var bx = -2.4; bx <= 2.4; bx += 4.8) {
      box(g, 0.05, 0.8, 0.05, 0x59636b, bx, top - 0.4, z);
      box(g, 1.4, 0.22, 0.5, 0xfff6c8, bx, top - 0.9, z);
      box(g, 1.5, 0.05, 0.6, 0x59636b, bx, top - 1.05, z);
    }
    box(g, 0.3, 0.3, 0.3, 0x39ff88, 0, top - 0.5, z);
  } else {
    // a hanging brass-and-green library sign with a book silhouette
    box(g, 0.05, 0.9, 0.05, 0xb8863a, -1.2, top - 0.5, z);
    box(g, 0.05, 0.9, 0.05, 0xb8863a, 1.2, top - 0.5, z);
    box(g, 3.0, 0.7, 0.12, 0x1f6f4f, 0, top - 1.1, z);
    box(g, 2.7, 0.08, 0.14, 0xe8c978, 0, top - 0.9, z);
    box(g, 0.5, 0.3, 0.14, 0xf5ecd0, -0.3, top - 1.2, z);
    box(g, 0.5, 0.3, 0.14, 0xf0dfb8, 0.3, top - 1.2, z);
    box(g, 0.08, 0.34, 0.15, 0xb8863a, 0, top - 1.2, z);
  }
  return g;
}



var FLOOR_LINES = {
  hall_floor: [[-4.7, 0xf2c230], [-4.45, 0x3a86d9], [4.45, 0x2f9e6f], [4.7, 0xe03a3a]],
  or_floor: [[-4.6, 0xf2c230], [4.6, 0xf2c230]],
  lab_floor: [[-4.6, 0xf2c230], [-4.3, 0x222a2e], [4.3, 0x222a2e], [4.6, 0xf2c230]],
  bay_floor: [[-4.7, 0xf2c230], [4.7, 0xf2c230]]
};

/** Polished floor with the coloured guide lines each kind of room paints on the ground. */
export function buildHallFloor(skin) {
  var g = new THREE.Group();
  var lines = FLOOR_LINES[skin && skin.groundType] || FLOOR_LINES.hall_floor;
  lines.forEach(function (l) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 400), new THREE.MeshBasicMaterial({ color: l[1], transparent: true, opacity: 0.8 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(l[0], 0.012, -190);
    g.add(m);
  });
  if (skin && skin.groundType === 'bay_floor') {
    // dashed platform markings
    for (var dz = -160; dz < 20; dz += 4) {
      [-1, 1].forEach(function (dx) {
        var dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(dx, 0.012, dz);
        g.add(dash);
      });
    }
    return g;
  }
  for (var tz = -160; tz < 20; tz += 2) {
    var seam = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 0.03), new THREE.MeshBasicMaterial({ color: 0x6f5a46, transparent: true, opacity: 0.25 }));
    seam.rotation.x = -Math.PI / 2;
    seam.position.set(0, 0.012, tz);
    g.add(seam);
  }
  return g;
}

/** Every walled-in map (library hall, translators' booth, Codebreakers Lab, departures platform). */
export function isHospitalHall(skin) { return !!skin && (skin.wallType === 'hospital_hall' || /^room_/.test(skin.wallType)); }
