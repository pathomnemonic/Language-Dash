/**
 * w_verona_balcony.js — Verona Balcony Carnival (skin id 'skin_cardiac_pulse', kept from the original game).
 *
 * A valentine carnival in a Verona lane at golden hour. Terracotta houses line both sides, and every 16 units the
 * street runs through four scenes: a stone BALCONY with roses and ivy, a SHOPFRONT with striped awning and swinging
 * saloon doors, a garden where JULIET'S STATUE stands by a rose arbour, and the LOVE-LETTER corner with a red postbox
 * and a heart-balloon cart. Painted walls carry the shutters, ivy and pinned love letters ("Ti amo", "Je t'aime",
 * "Te quiero"). Overhead: string lights and banners in several languages. Behind the walls: rooftops, chimneys and a
 * bell tower. Moving: heart balloons, fluttering letters, rose petals and two heart-shaped hot-air balloons.
 *
 * Everything is low-poly, merged by colour, and sits against the walls so the three lanes stay clear.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, quad, sign, extrude, heartShape, combine, xform, canvasTex, bulb,
  floorPanel, wallPanel, sideCtx
} from '../mapkit.js';
import { animated, features, swarm, cloudBank, shimmer, bob } from '../mapfx.js';

var H = 6.4;
var CREAM = 0xfff0d0;
var STONE = 0xf6e2b8;
var ROSE = 0xe0305a;
var RED = 0xf0434f;
var PINK = 0xff8fb0;
var LEAF = 0x3fae5a;
var LEAF2 = 0x62d070;
var GOLD = 0xffc83a;
var WOOD = 0xd98a3d;
var GREEN = 0x3f9a6a;
var HEARTS = [RED, PINK, ROSE, 0xffffff, GOLD];
var BULBS = [GOLD, PINK, RED, 0xffffff];

var PPU = 96; // texture pixels per world unit
var WALL_W = 1536;
var WALL_H = 614;

// ---------- the painted walls ----------

function py(y) { return WALL_H - y * PPU; }

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.8, y - s * 1.2, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.8, y - s * 1.2, x + s * 1.6, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}

function archShape(ctx, x, yTop, w, h) {
  // a window or door: straight sides, round head; (x, yTop) is the top-centre of the round head
  var r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x - r, yTop + h);
  ctx.lineTo(x - r, yTop + r);
  ctx.arc(x, yTop + r, r, Math.PI, 0);
  ctx.lineTo(x + r, yTop + h);
  ctx.closePath();
}

function archWindow(ctx, x, yTop, w, h, shutterColor, lit) {
  // stone surround, warm glass, open shutters either side
  var pad = 7;
  archShape(ctx, x, yTop - pad, w + pad * 2, h + pad);
  ctx.fillStyle = '#fff3d6'; ctx.fill();
  archShape(ctx, x, yTop, w, h);
  var g = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  g.addColorStop(0, lit ? '#fff0a0' : '#ffe27a'); g.addColorStop(1, lit ? '#ffb454' : '#f2a24a');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#a2582c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yTop + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - w / 2, yTop + h * 0.55); ctx.lineTo(x + w / 2, yTop + h * 0.55); ctx.stroke();
  // shutters (louvred)
  [-1, 1].forEach(function (s) {
    var sx = x + s * (w / 2 + pad + 2);
    var sw = w * 0.5;
    var left = s < 0 ? sx - sw : sx;
    ctx.fillStyle = shutterColor; ctx.fillRect(left, yTop + w * 0.35, sw, h - w * 0.35 + 4);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (var yy = yTop + w * 0.35 + 8; yy < yTop + h; yy += 9) ctx.fillRect(left + 3, yy, sw - 6, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(left, yTop + w * 0.35, 3, h - w * 0.35 + 4);
  });
  // sill
  ctx.fillStyle = '#fff3d6'; ctx.fillRect(x - w / 2 - pad - 5, yTop + h, w + pad * 2 + 10, 9);
}

function leafBlob(ctx, x, y, r, rnd) {
  var cols = ['#3fae5a', '#2e9a4e', '#62d070', '#4cbf62'];
  ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.25, r * 0.8, rnd() * 3, 0, Math.PI * 2);
  ctx.fill();
}

function rngOf(seed) {
  var s = seed;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function paintBay(ctx, k, cx) {
  var w = 384;
  var left = cx - w / 2;
  var PLASTER = [['#f4a27c', '#ec8a62'], ['#f8c872', '#f0b45a'], ['#f7a9b8', '#ee90a4'], ['#fde6a8', '#f5d283']][k];
  var g = ctx.createLinearGradient(0, 0, 0, WALL_H);
  g.addColorStop(0, PLASTER[0]); g.addColorStop(1, PLASTER[1]);
  ctx.fillStyle = g; ctx.fillRect(left, 0, w + 1, WALL_H);
  // washed plaster patches and exposed brick
  var rnd = rngOf(17 + k * 31);
  for (var i = 0; i < 9; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.ellipse(left + rnd() * w, py(1.6 + rnd() * 4), 20 + rnd() * 30, 10 + rnd() * 14, 0, 0, Math.PI * 2); ctx.fill();
  }
  // stone plinth
  ctx.fillStyle = '#f6e2b8'; ctx.fillRect(left, py(1.0), w + 1, PPU);
  ctx.strokeStyle = 'rgba(160,110,60,0.45)'; ctx.lineWidth = 2;
  for (var r = 0; r < 3; r++) {
    var yy = py(1.0) + r * 32;
    ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(left + w, yy); ctx.stroke();
    for (var c = 0; c < 6; c++) { var xx = left + ((c * 70 + (r % 2) * 35) % w); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 32); ctx.stroke(); }
  }
  ctx.fillStyle = '#e9c78f'; ctx.fillRect(left, py(1.0) - 6, w + 1, 8);
  // cornice with teeth under the roof
  ctx.fillStyle = '#fff3d6'; ctx.fillRect(left, 0, w + 1, 30);
  ctx.fillStyle = '#e9c78f';
  for (var t = 0; t < 24; t++) ctx.fillRect(left + t * 16 + 3, 30, 9, 14);
  ctx.fillRect(left, 28, w + 1, 4);

  if (k === 0) {
    // the tall balcony door, lit from inside, with open shutters
    archWindow(ctx, cx, py(5.4), 120, 2.8 * PPU, '#3f9a6a', true);
    // curtains
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(cx - 52, py(4.6), 28, 150); ctx.fillRect(cx + 24, py(4.6), 28, 150);
    archWindow(ctx, cx - 150, py(5.5), 56, 100, '#e0305a');
    archWindow(ctx, cx + 150, py(5.5), 56, 100, '#e0305a');
  } else if (k === 1) {
    // shopfront: a dark doorway for the swinging doors, two windows of goods, a painted sign board
    ctx.fillStyle = '#7a3a24'; ctx.fillRect(cx - 86, py(2.25), 172, 2.25 * PPU - PPU * 0 - 0);
    var dg = ctx.createLinearGradient(0, py(2.25), 0, py(0));
    dg.addColorStop(0, '#5a2a1c'); dg.addColorStop(1, '#a8603a');
    ctx.fillStyle = dg; ctx.fillRect(cx - 78, py(2.2), 156, 2.2 * PPU);
    [-1, 1].forEach(function (s) {
      var wx = cx + s * 146;
      ctx.fillStyle = '#fff3d6'; ctx.fillRect(wx - 44, py(2.35), 88, 1.45 * PPU);
      var wg = ctx.createLinearGradient(0, py(2.3), 0, py(1.0));
      wg.addColorStop(0, '#fff7c0'); wg.addColorStop(1, '#ffd070');
      ctx.fillStyle = wg; ctx.fillRect(wx - 38, py(2.28), 76, 1.3 * PPU);
      // shelves of gifts: little hearts and boxes
      ctx.fillStyle = '#8a4a2a'; ctx.fillRect(wx - 38, py(1.7), 76, 4); ctx.fillRect(wx - 38, py(1.38), 76, 4);
      [['#ff3d5e', -22], ['#ff8fb0', 4], ['#ffd23f', 26]].forEach(function (it, n) { heartPath(ctx, wx + it[1], py(1.9), 7); ctx.fillStyle = it[0]; ctx.fill(); ctx.fillStyle = ['#4f8cff', '#3fd47a', '#ff9a1f'][n]; ctx.fillRect(wx + it[1] - 8, py(1.58), 16, 14); });
    });
    ctx.fillStyle = '#fff6dc'; ctx.fillRect(cx - 150, py(3.5), 300, 0.9 * PPU);
    ctx.strokeStyle = '#b8402c'; ctx.lineWidth = 5; ctx.strokeRect(cx - 146, py(3.5) + 4, 292, 0.9 * PPU - 8);
    ctx.fillStyle = '#c4243c'; ctx.font = '900 38px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('CASA DEI BACI', cx, py(3.5) + 0.45 * PPU);
    archWindow(ctx, cx - 100, py(5.5), 56, 110, '#3f9a6a');
    archWindow(ctx, cx + 100, py(5.5), 56, 110, '#3f9a6a');
  } else if (k === 2) {
    // ivy climbing the wall, with rose blooms
    var iv = rngOf(5);
    archWindow(ctx, cx + 20, py(5.6), 62, 120, '#f06a90');
    for (var n = 0; n < 130; n++) {
      var ly = 1.0 + iv() * 4.8;
      var spread = 120 + Math.sin(ly * 1.7) * 55 + (6 - ly) * 10;
      var lx = cx + (iv() - 0.5) * 2 * spread;
      leafBlob(ctx, lx, py(ly), 12 + iv() * 12, iv);
    }
    for (var q = 0; q < 12; q++) {
      var rx = cx + (iv() - 0.5) * 300;
      var ry = py(1.4 + iv() * 3.4);
      ctx.fillStyle = ['#e0305a', '#ff8fb0', '#ffffff', '#f0434f'][q % 4];
      ctx.beginPath(); ctx.arc(rx, ry, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(rx - 2, ry - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // a stone plaque
    ctx.fillStyle = '#fff3d6'; ctx.fillRect(cx - 78, py(3.1), 156, 66);
    ctx.strokeStyle = '#b88a4a'; ctx.lineWidth = 4; ctx.strokeRect(cx - 74, py(3.1) + 4, 148, 58);
    ctx.fillStyle = '#b8402c'; ctx.font = 'italic 700 26px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Giulietta', cx, py(3.1) + 25);
    ctx.font = 'italic 600 15px Georgia, serif'; ctx.fillText('Verona', cx, py(3.1) + 48);
  } else {
    // the wall of love letters
    ctx.fillStyle = '#c8783c'; ctx.fillRect(cx - 176, py(4.9), 352, 3.5 * PPU);
    ctx.fillStyle = '#e8a060'; ctx.fillRect(cx - 168, py(4.82), 336, 3.35 * PPU);
    var notes = ['Ti amo', "Je t'aime", 'Te quiero', 'Ich liebe dich', 'Eu te amo', 'Ik hou van je', 'Amore mio', 'Mi amor', 'Ti voglio bene', 'Mon coeur'];
    var nr = rngOf(91);
    var pcol = ['#fff6dc', '#ffd6e4', '#fff0a0', '#d6f2ff', '#e6ffd6'];
    for (var j = 0; j < 14; j++) {
      var col = j % 4, row = Math.floor(j / 4);
      var nx = cx - 150 + col * 82 + (nr() - 0.5) * 14;
      var ny = py(4.55) + row * 90 + (nr() - 0.5) * 14;
      ctx.save(); ctx.translate(nx + 36, ny + 30); ctx.rotate((nr() - 0.5) * 0.25);
      ctx.fillStyle = 'rgba(80,40,20,0.25)'; ctx.fillRect(-35, -27, 74, 58);
      ctx.fillStyle = pcol[j % pcol.length]; ctx.fillRect(-36, -30, 72, 58);
      ctx.fillStyle = '#e0305a'; heartPath(ctx, 0, -17, 5); ctx.fill();
      ctx.fillStyle = '#7a2a3a'; ctx.font = 'italic 700 14px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(notes[j % notes.length], 0, 6, 66);
      ctx.fillStyle = '#ff3d5e'; ctx.beginPath(); ctx.arc(0, -28, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#fff6dc'; ctx.fillRect(cx - 150, py(5.75), 300, 0.62 * PPU);
    ctx.strokeStyle = '#b8402c'; ctx.lineWidth = 4; ctx.strokeRect(cx - 146, py(5.75) + 4, 292, 0.62 * PPU - 8);
    ctx.fillStyle = '#c4243c'; ctx.font = 'italic 800 29px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Lettere a Giulietta', cx, py(5.75) + 0.31 * PPU);
  }
}

function wallPicture(side) {
  return canvasTex('vb_wall' + side, WALL_W, WALL_H, function (ctx, w, h) {
    ctx.fillStyle = '#f4a27c'; ctx.fillRect(0, 0, w, h);
    for (var k = 0; k < 4; k++) {
      // bay k sits at quarter k on the right wall and at the mirrored quarter on the left (see wallPanel)
      var cx = (side > 0 ? k / 4 : ((4 - k) % 4) / 4) * w;
      [-w, 0, w].forEach(function (off) { paintBay(ctx, k, cx + off); });
    }
  });
}

function floorPicture() {
  // 12 across, 16 along, 48 px/unit: warm cobbles laid in a fan, with scattered petals
  return canvasTex('vb_floor', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#d98a58'; ctx.fillRect(0, 0, w, h);
    var tones = ['#f7d2a4', '#f2bf8a', '#fbdcb4', '#eeb27c', '#f9c8c0'];
    var rnd = rngOf(3);
    var row = 0;
    for (var y = 0; y < h; y += 24) {
      var off = (row % 2) * 16;
      for (var x = -16; x < w; x += 32) {
        ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
        var rr = 5;
        ctx.beginPath();
        ctx.moveTo(x + off + rr + 1, y + 1);
        ctx.arcTo(x + off + 31, y + 1, x + off + 31, y + 23, rr);
        ctx.arcTo(x + off + 31, y + 23, x + off + 1, y + 23, rr);
        ctx.arcTo(x + off + 1, y + 23, x + off + 1, y + 1, rr);
        ctx.arcTo(x + off + 1, y + 1, x + off + 31, y + 1, rr);
        ctx.fill();
      }
      row++;
    }
    // a red carpet of rose petals down each lane edge
    ctx.fillStyle = '#ffffff';
    for (var p = 0; p < 40; p++) {
      var px = (p * 97) % w, pyy = (p * 181) % h;
      ctx.fillStyle = ['rgba(224,48,90,0.75)', 'rgba(255,143,176,0.8)', 'rgba(255,255,255,0.8)'][p % 3];
      ctx.beginPath(); ctx.ellipse(px, pyy, 6, 3.5, (p % 5) * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#e0305a';
    [-1.5, 1.5].forEach(function (lx) { ctx.fillRect(w / 2 + lx * 48 - 3, 0, 6, h); });
  });
}

// ---------- small shared pieces ----------

function heartAt(g, S, x, y, z, k, c, o) {
  return extrude(g, heartShape(k), 0.28 * k, c, x, y, z, Object.assign({ ry: S.turn * 0.45, bevel: true, curve: 5 }, o || {}));
}

function roseBlobs(g, x, y, z, n, spread, colors, r) {
  for (var i = 0; i < n; i++) {
    var a = i * 2.4;
    ball(g, r || 0.08, colors[i % colors.length], x + Math.cos(a) * spread * 0.8, y + Math.sin(a * 1.3) * spread * 0.45 + 0.12, z + Math.sin(a) * spread * 1.2, { seg: 5 });
  }
}

function lamp(g, S, z) {
  var x = S.in(0.55);
  cyl(g, 0.05, 0.07, 3.3, 0x3a5a46, x, 1.65, z, { seg: 6 });
  box(g, 0.34, 0.06, 0.34, 0x3a5a46, x, 3.35, z);
  box(g, 0.24, 0.34, 0.24, 0xfff2b0, x, 3.55, z, { bulb: true });
  cone(g, 0.26, 0.22, 0x3a5a46, x, 3.82, z, { seg: 4, ry: Math.PI / 4 });
  ball(g, 0.06, GOLD, x, 4.0, z, { seg: 5 });
}

function flagLine(g, S, z, y, i) {
  // a string of little pennants along the wall
  var n = 9;
  for (var f = 0; f < n; f++) {
    var t = (f + 0.5) / n;
    var dip = Math.sin(t * Math.PI) * 0.28;
    cone(g, 0.16, 0.34, [RED, GOLD, PINK, 0xffffff, 0x4fc4a0][(f + i) % 5], S.in(0.06), y - dip - 0.17, z - 2 + t * 4, { seg: 3, rx: Math.PI, sz: 0.2, bulb: true });
  }
  cyl(g, 0.012, 0.012, 4, 0x6a5040, S.in(0.06), y - 0.04, z, { rx: Math.PI / 2, seg: 3 });
}

// ---------- the four scenes ----------

function balconyScene(g, S, z) {
  var x = S.in(0.45);
  var outer = S.in(0.85);
  // the stone slab, corbels beneath
  box(g, 0.92, 0.14, 3.1, STONE, x, 2.6, z);
  box(g, 0.98, 0.07, 3.16, 0xffffff, x, 2.69, z);
  [-1.2, 0, 1.2].forEach(function (dz) { box(g, 0.5, 0.36, 0.28, STONE, S.in(0.28), 2.3, z + dz, { rz: S.side * 0.0 }); cone(g, 0.2, 0.36, STONE, S.in(0.44), 2.24, z + dz, { seg: 4, rx: Math.PI }); });
  // balustrade: posts, rails
  for (var i = 0; i < 11; i++) cyl(g, 0.05, 0.05, 0.72, CREAM, outer, 3.08, z - 1.5 + i * 0.3, { seg: 6 });
  box(g, 0.14, 0.1, 3.1, 0xffffff, outer, 3.5, z);
  box(g, 0.12, 0.08, 3.1, 0xffffff, outer, 2.78, z);
  [-1.52, 1.52].forEach(function (dz) {
    box(g, 0.92, 0.1, 0.1, 0xffffff, x, 3.5, z + dz);
    for (var j = 0; j < 3; j++) cyl(g, 0.04, 0.04, 0.72, CREAM, S.in(0.2 + j * 0.3), 3.08, z + dz, { seg: 5 });
  });
  // pots of roses along the rail
  [-1.0, 0, 1.0].forEach(function (dz, n) {
    box(g, 0.3, 0.26, 0.55, 0xe06a3a, outer, 3.68, z + dz * 1.0);
    ball(g, 0.3, LEAF, outer, 3.98, z + dz, { seg: 6, sy: 0.7 });
    roseBlobs(g, outer, 4.0, z + dz, 7, 0.22, [ROSE, PINK, RED, 0xffffff], 0.085);
  });
  // ivy and roses spilling over the front
  for (var v = 0; v < 8; v++) {
    ball(g, 0.16 + (v % 3) * 0.04, v % 2 ? LEAF : LEAF2, outer, 2.2 - (v % 4) * 0.22, z - 1.35 + v * 0.38, { seg: 5, sy: 1.3 });
  }
  roseBlobs(g, outer, 2.25, z, 6, 0.6, [ROSE, PINK], 0.09);
  // heart balloons tied to the rail, bobbing in a bunch
  [[0.0, 4.5, 0.9, RED], [-0.6, 5.1, 0.7, PINK], [0.55, 5.0, 0.8, 0xffffff], [1.2, 4.4, 0.6, ROSE]].forEach(function (b, n) {
    heartAt(g, S, S.in(0.6), b[1], z + b[0], b[2], b[3]);
    cyl(g, 0.008, 0.008, 1.1, 0xd8c8b0, S.in(0.6), b[1] - 0.8, z + b[0], { seg: 3 });
  });
  // rose bushes in stone troughs on the ground
  [-1.7, 1.7].forEach(function (dz) {
    box(g, 0.5, 0.34, 0.9, STONE, S.in(0.5), 0.17, z + dz);
    ball(g, 0.46, LEAF, S.in(0.5), 0.62, z + dz, { seg: 7, sy: 0.75, sz: 1.3 });
    roseBlobs(g, S.in(0.5), 0.7, z + dz, 10, 0.3, [ROSE, PINK, RED, 0xffffff], 0.09);
  });
  // blade sign: a heart plate facing the runner
  cyl(g, 0.02, 0.02, 0.9, 0x3a3a46, S.in(0.5), 4.55, z + 1.9, { rz: Math.PI / 2, seg: 3 });
  sign(g, 'AMORE', ROSE, 0xffffff, 1.2, 0.5, S.in(0.5), 4.3, z + 1.9, { border: 0xffe0a0 });
}

function awning(g, S, z) {
  var x = S.in(0.45);
  for (var i = 0; i < 8; i++) {
    box(g, 0.95, 0.06, 0.42, i % 2 ? CREAM : RED, x, 3.0, z - 1.47 + i * 0.42, { rz: S.side * 0.3 });
    box(g, 0.05, 0.2, 0.42, i % 2 ? CREAM : RED, S.in(0.9) + S.side * 0.0, 2.72, z - 1.47 + i * 0.42, { rz: S.side * 0.3 });
  }
  box(g, 0.08, 0.08, 3.4, 0x6a4a30, S.in(0.9), 2.98, z);
}

function saloonDoor(g, S, hingeZ, dir, angle) {
  // a half-height swinging door hinged at hingeZ, open by `angle` toward the street
  var grp = new THREE.Group();
  var w = 0.82;
  // everything is built with the hinge at z = 0 and the free edge at z = dir * w
  box(grp, 0.07, 0.95, 0.07, 0xb8662a, 0, 0, 0, { sy: 1 });
  var cz = dir * w / 2;
  box(grp, 0.07, 0.07, w, 0xb8662a, 0, 0.48, cz);
  box(grp, 0.07, 0.07, w, 0xb8662a, 0, -0.48, cz);
  box(grp, 0.07, 0.95, 0.07, 0xb8662a, 0, 0, dir * w);
  for (var s = 0; s < 6; s++) box(grp, 0.05, 0.1, w - 0.06, WOOD, 0, -0.38 + s * 0.15, cz, { rz: 0.0, rx: 0.35 });
  extrude(grp, heartShape(0.3), 0.04, ROSE, S.side * -0.045, 0.02, cz, { ry: S.turn });
  grp.position.set(S.in(0.34), 1.25, hingeZ);
  grp.rotation.y = dir * angle * (S.side < 0 ? -1 : 1);
  g.add(grp);
}

function shopScene(g, S, z) {
  awning(g, S, z);
  var x = S.in(0.2);
  // door frame
  box(g, 0.2, 2.35, 0.14, 0x8a4a22, x, 1.18, z - 0.98);
  box(g, 0.2, 2.35, 0.14, 0x8a4a22, x, 1.18, z + 0.98);
  box(g, 0.2, 0.14, 2.1, 0x8a4a22, x, 2.35, z);
  // two saloon doors, one swung wide, one barely moving
  saloonDoor(g, S, z - 0.9, 1, 0.75);
  saloonDoor(g, S, z + 0.9, -1, 0.3);
  // flower barrels
  [-1.75, 1.75].forEach(function (dz, n) {
    cyl(g, 0.3, 0.26, 0.55, 0xb8662a, S.in(0.5), 0.28, z + dz, { seg: 8 });
    cyl(g, 0.31, 0.31, 0.05, 0x3a3a46, S.in(0.5), 0.4, z + dz, { seg: 8 });
    ball(g, 0.32, LEAF, S.in(0.5), 0.72, z + dz, { seg: 6, sy: 0.7 });
    roseBlobs(g, S.in(0.5), 0.8, z + dz, 9, 0.25, n ? [GOLD, RED, 0xffffff] : [PINK, ROSE, 0xffffff], 0.09);
  });
  // hanging heart plate sign, facing the runner, on an iron arm
  cyl(g, 0.02, 0.02, 1.0, 0x3a3a46, S.in(0.5), 4.1, z - 1.7, { rz: Math.PI / 2, seg: 3 });
  sign(g, 'CIAO!', GOLD, ROSE, 1.2, 0.5, S.in(0.55), 3.85, z - 1.7, { border: ROSE });
  // a bunch of heart balloons tied to the awning bar
  [[0.9, 4.6, 0.8, RED], [1.4, 5.2, 0.7, PINK], [0.2, 5.1, 0.9, GOLD]].forEach(function (b) {
    heartAt(g, S, S.in(0.5), b[1], z + b[0], b[2], b[3]);
    cyl(g, 0.008, 0.008, 1.0, 0xd8c8b0, S.in(0.5), b[1] - 0.75, z + b[0], { seg: 3 });
  });
  lamp(g, S, z + 1.95);
}

function julietScene(g, S, z) {
  var x = S.in(0.55);
  // Juliet on a plinth: gown, bodice, head, hair, raised hand
  var sz = z + 0.9;
  box(g, 0.8, 0.7, 0.8, STONE, x, 0.35, sz);
  box(g, 0.9, 0.1, 0.9, 0xffffff, x, 0.73, sz);
  cone(g, 0.36, 1.0, 0xe8a63a, x, 1.3, sz, { seg: 10 });
  cyl(g, 0.12, 0.18, 0.45, 0xe8a63a, x, 1.95, sz, { seg: 8 });
  ball(g, 0.14, 0xf0b550, x, 2.3, sz, { seg: 8 });
  ball(g, 0.16, 0xc98a2a, x + S.side * 0.05, 2.34, sz, { seg: 6, sy: 0.9 });
  cyl(g, 0.035, 0.035, 0.45, 0xe8a63a, x + S.side * -0.22, 2.05, sz + 0.1, { rz: S.side * 0.8, seg: 5 });
  // a rose arbour beside her
  var az = z - 1.1;
  [-0.75, 0.75].forEach(function (d) { cyl(g, 0.06, 0.06, 2.2, 0xffffff, x, 1.1, az + d, { seg: 6 }); });
  ring(g, 0.75, 0.07, 0xffffff, x, 2.2, az, { arc: Math.PI, ry: Math.PI / 2, seg: 12, tube: 4 });
  for (var i = 0; i < 9; i++) {
    var a = Math.PI * (i / 8);
    var ay = 2.2 + Math.sin(a) * 0.78;
    var azz = az - Math.cos(a) * 0.78;
    ball(g, 0.14, i % 2 ? LEAF : LEAF2, x, ay, azz, { seg: 5, sy: 0.8 });
    ball(g, 0.1, [ROSE, PINK, RED, 0xffffff][i % 4], x + S.side * -0.1, ay + 0.06, azz, { seg: 5 });
  }
  for (var j = 0; j < 7; j++) { ball(g, 0.13, LEAF, x, 0.4 + j * 0.28, az + (j % 2 ? 0.75 : -0.75), { seg: 5, sy: 1.2 }); ball(g, 0.08, [ROSE, PINK][j % 2], x + S.side * -0.1, 0.45 + j * 0.28, az + (j % 2 ? 0.75 : -0.75), { seg: 5 }); }
  sign(g, 'TE QUIERO', ROSE, 0xffffff, 1.1, 0.42, x, 2.7, az, { border: GOLD });
  // rose hedges front and back
  [z + 2.0, z - 2.05].forEach(function (hz, n) {
    box(g, 0.55, 0.55, 0.7, LEAF, S.in(0.5), 0.28, hz);
    roseBlobs(g, S.in(0.5), 0.62, hz, 8, 0.25, [ROSE, PINK, RED, 0xffffff], 0.09);
  });
  lamp(g, S, z + 0.1 - 0.0);
}

function letterScene(g, S, z) {
  var x = S.in(0.5);
  // a big red postbox with a gold heart slot and a stack of letters on top
  var pz = z - 0.6;
  box(g, 0.7, 1.35, 0.7, 0xe83a44, x, 0.68, pz);
  cyl(g, 0.36, 0.36, 0.7, 0xe83a44, x, 1.38, pz, { rx: Math.PI / 2, seg: 10 });
  box(g, 0.05, 0.32, 0.5, 0x2a2430, S.in(0.14) + S.side * 0.0, 1.0, pz);
  extrude(g, heartShape(0.3), 0.04, GOLD, S.in(0.12) + S.side * 0.0, 0.55, pz, { ry: S.turn });
  box(g, 0.7, 0.1, 0.74, GOLD, x, 0.06, pz);
  [0, 1, 2].forEach(function (n) { box(g, 0.34, 0.03, 0.24, [0xffffff, 0xffd6e4, 0xfff0a0][n], x, 1.78 + n * 0.035, pz + (n - 1) * 0.04, { ry: n * 0.7 }); });
  sign(g, 'POSTA', 0xffffff, 0xe83a44, 0.8, 0.3, S.in(0.2), 1.65, pz + 0.0, { ry: S.turn });
  // the heart-balloon cart: striped umbrella, cart box, a bunch of hearts
  var cz = z + 1.15;
  box(g, 0.75, 0.55, 1.4, PINK, x, 0.65, cz);
  box(g, 0.8, 0.07, 1.46, 0xffffff, x, 0.96, cz);
  cyl(g, 0.17, 0.17, 0.07, 0x3a3a46, x - 0.3 * -S.side * 0, 0.2, cz - 0.55, { rz: Math.PI / 2, seg: 8 });
  cyl(g, 0.17, 0.17, 0.07, 0x3a3a46, x, 0.2, cz + 0.55, { rz: Math.PI / 2, seg: 8 });
  cyl(g, 0.03, 0.03, 1.9, 0xffffff, x, 1.9, cz, { seg: 5 });
  cone(g, 0.7, 0.45, RED, x, 3.05, cz, { seg: 8 });
  cone(g, 0.4, 0.3, CREAM, x, 3.12, cz, { seg: 8, sx: 1.02, sz: 1.02 });
  ball(g, 0.06, GOLD, x, 3.32, cz, { seg: 5 });
  var cols = [RED, PINK, GOLD, ROSE, 0xffffff, 0x5ac8fa, 0x6fdc8c];
  for (var h = 0; h < 7; h++) {
    var a = h * 0.9;
    var hx = x + Math.cos(a) * 0.18;
    var hy = 3.7 + (h % 3) * 0.55 + Math.sin(a) * 0.1;
    var hz = cz + Math.sin(a) * 0.55 * ((h % 2) ? 1 : -1);
    heartAt(g, S, hx, hy, hz, 0.7 + (h % 3) * 0.1, cols[h]);
    cyl(g, 0.007, 0.007, hy - 1.0, 0xd8c8b0, hx, (hy + 1.0) / 2 - 0.2, hz, { seg: 3, sz: 1 });
  }
  roseBlobs(g, x, 1.05, cz, 7, 0.28, [ROSE, PINK, RED], 0.1);
  flagLine(g, S, z, 5.55, 3);
  sign(g, 'TI AMO', RED, 0xffffff, 1.2, 0.5, S.in(0.5), 4.2, z - 1.85, { border: GOLD });
}

function roofAndHouses(g, S, z, k) {
  // terracotta eaves along the top of the wall
  box(g, 1.7, 0.09, 4.0, 0xe0663a, S.in(0.0) + S.side * 0.0 - S.side * 0.78 + S.side * 0.0 + S.side * 0.0, 6.7, z, { rz: S.side * 0.4 });
  // tile ribs
  for (var r = 0; r < 8; r++) box(g, 1.7, 0.06, 0.07, 0xc04a28, S.in(0.0) - S.side * 0.78 + S.side * 0.0, 6.76, z - 1.75 + r * 0.5, { rz: S.side * 0.4 });
  box(g, 0.12, 0.28, 4.0, CREAM, S.in(0.8) + 0.0, 6.2, z);
  // the houses behind: tall boxes with roofs, windows and chimneys, seen above the wall
  var rnd = rngOf(40 + k * 13 + (S.side > 0 ? 5 : 0));
  var tones = [0xf7b08a, 0xf8d080, 0xf8b0c0, 0xffe6b0, 0xf0986a];
  for (var h = 0; h < 2; h++) {
    var hz = z - 1.0 + h * 2.0;
    var ht = 8.6 + rnd() * 3.2;
    var col = tones[Math.floor(rnd() * tones.length)];
    box(g, 3.0, ht, 1.9, col, S.out(2.6), ht / 2, hz);
    cone(g, 1.6, 1.3, 0xd8583a, S.out(2.6), ht + 0.6, hz, { seg: 4, ry: Math.PI / 4, sx: 1.0, sz: 0.85 });
    box(g, 0.3, 0.9, 0.3, 0xc9502e, S.out(2.1), ht + 1.1, hz + 0.4);
    quad(g, 0.5, 0.8, GREEN, S.out(1.64), ht - 1.3, hz - 0.5, { ry: S.turn });
    quad(g, 0.5, 0.8, GREEN, S.out(1.64), ht - 1.3, hz + 0.5, { ry: S.turn });
    quad(g, 0.5, 0.8, 0xffe08a, S.out(1.64), ht - 3.0, hz - 0.5, { ry: S.turn, bulb: true });
  }
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(side), side, z, H, 0.0, { r: 0.9 });
  roofAndHouses(g, S, z, k);
  if (k === 0) balconyScene(g, S, z);
  else if (k === 1) shopScene(g, S, z);
  else if (k === 2) julietScene(g, S, z);
  else letterScene(g, S, z);
  if (k !== 3) flagLine(g, S, z, 5.65, k);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12);
}

// ---------- overhead ----------

var BANNERS = ['TI AMO', "JE T'AIME", 'TE QUIERO', 'ICH LIEBE DICH', 'EU TE AMO', 'IK HOU VAN JE'];

function arch(g, z, i) {
  var y = H - 0.45;
  var n = 15;
  var half = 5.2;
  for (var f = 0; f < n; f++) {
    var t = f / (n - 1);
    var x = -half + t * half * 2;
    var dip = Math.sin(t * Math.PI) * 0.6;
    ball(g, 0.1, BULBS[(f + i) % BULBS.length], x, y - dip - 0.1, z, { seg: 5, bulb: true });
  }
  // the cord, as segments following the sag
  for (var s = 0; s < 10; s++) {
    var t0 = s / 10, t1 = (s + 1) / 10;
    var x0 = -half + t0 * half * 2, x1 = -half + t1 * half * 2;
    var y0 = y - Math.sin(t0 * Math.PI) * 0.6, y1 = y - Math.sin(t1 * Math.PI) * 0.6;
    cyl(g, 0.012, 0.012, Math.hypot(x1 - x0, y1 - y0), 0x6a5040, (x0 + x1) / 2, (y0 + y1) / 2, z, { rz: Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2, seg: 3 });
  }
  // a banner of love in a different language each time
  sign(g, BANNERS[i % BANNERS.length], [ROSE, GOLD, RED][i % 3], [0xffffff, ROSE, 0xffe9a0][i % 3], 3.4, 0.66, 0, H - 1.25, z + 0.05, { border: 0xffffff });
  [-1, 1].forEach(function (s) { cyl(g, 0.012, 0.012, 0.6, 0x6a5040, s * 2.1, H - 0.95, z, { seg: 3 }); });
  // paper heart lanterns at the sides
  [-1, 1].forEach(function (s, n) {
    cyl(g, 0.012, 0.012, 0.5, 0x6a5040, s * 4.5, y - 0.35, z, { seg: 3 });
    extrude(g, heartShape(0.85), 0.14, HEARTS[(i + n) % 5], s * 4.5, y - 0.95, z, { bulb: true, curve: 4 });
  });
}

// ---------- the things that move ----------

function heartBalloonGeo() {
  var geo = new THREE.ExtrudeGeometry(heartShape(0.7), { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 4 });
  geo.translate(0, 0, -0.1);
  return combine([{ geo: geo, color: 0xffffff }, { geo: new THREE.CylinderGeometry(0.008, 0.008, 1.0, 3), color: 0xdddddd, matrix: xform(0, -0.85, 0) }]);
}

function hotAirHeart(n) {
  var m = new THREE.Group();
  extrude(m, heartShape(5.0), 2.6, n % 2 ? RED : PINK, 0, 11, 0, { bevel: true, curve: 8 });
  extrude(m, heartShape(3.0), 2.7, n % 2 ? PINK : 0xffffff, 0, 11, 0, { curve: 6 });
  box(m, 0.9, 0.6, 0.9, WOOD, 0, 7.0, 0);
  [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(function (p) { cyl(m, 0.015, 0.015, 3.0, 0x6a4a30, p[0] * 0.9, 8.7, p[1] * 0.9, { seg: 3 }); });
  animated(m);
  bob(m, 0.35, 0.8, n);
  return m;
}

function extras() {
  cloudBank(8, { seed: 11, opacity: 0.9 });
  features(hotAirHeart, { x: -17, spacing: 85, count: 3, z0: -35, yaw: Math.PI / 2 });
  features(function (n) { return hotAirHeart(n + 1); }, { x: 19, spacing: 95, count: 3, z0: -70, yaw: -Math.PI / 2 });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: heartBalloonGeo(), count: 9, seed: 5 + i * 9, colors: HEARTS, area: { x: [side * 4.3, side * 5.1], y: [3.6, 6.0], z: [-140, 8] }, k: 1, wobble: 0.18, scale: [0.9, 1.3] });
    // love letters fluttering down
    var env = combine([
      { geo: new THREE.BoxGeometry(0.3, 0.02, 0.2), color: 0xffffff },
      { geo: new THREE.CylinderGeometry(0.035, 0.035, 0.024, 6), color: 0xe0305a, matrix: xform(0, 0.015, 0) }
    ]);
    swarm({ geo: env, count: 9, seed: 40 + i, colors: [0xffffff, 0xffd6e4, 0xfff0a0], area: { x: [side * 4.4, side * 5.3], y: [0.6, 5.8], z: [-140, 8] }, k: 1, vy: [-0.5, -0.25], wobble: 0.3, turn: 1.4, flap: 0.5, scale: [1.2, 1.8] });
    var petal = combine([{ geo: new THREE.CircleGeometry(0.1, 5), color: 0xffffff }]);
    swarm({ geo: petal, material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), count: 24, seed: 80 + i, colors: [ROSE, PINK, RED, 0xffffff], area: { x: [side * 4.4, side * 5.3], y: [0.4, 6.0], z: [-140, 8] }, k: 1, vy: [-0.9, -0.5], wobble: 0.25, turn: 2.0, scale: [0.8, 1.5] });
  });
  // the string lights twinkle
  var lamp = bulb(0xfff2b0, { op: 0.95 });
  shimmer(lamp, 0.8, 0.15, 2.4, 0);
}

export var w_verona_balcony = {
  id: 'w_verona_balcony',
  indoor: false,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
