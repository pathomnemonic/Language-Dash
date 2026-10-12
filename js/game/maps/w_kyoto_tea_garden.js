/**
 * w_kyoto_tea_garden.js — Kyoto Tea Garden (skin 'Sunshine Rehab Garden'; the id is kept from the original game):
 * a sunny stroll along a raked-gravel path in a Japanese garden.
 *
 * Every 22 units a vermilion torii gate stands over the path, its plaque greeting you in Japanese. Beside the path
 * (every 16 units): on the left a koi pond with lily pads, a red taiko bridge, a gazebo, a weeping cherry and stone
 * lanterns; on the right a thatched-roof tea house with a noren curtain, a raked dry garden with rocks and a pine, maples,
 * a bamboo fence and a bamboo grove. Beyond: Kyoto's green hills and a five-storey pagoda. Moving: koi, falling cherry
 * petals, butterflies, cranes and clouds.
 */

import * as THREE from 'three';
import { box, cyl, ball, cone, slab, canvasTex, floorPanel, sideCtx, combine, xform } from '../mapkit.js';
import { animated, features, swarm, cloudBank } from '../mapfx.js';
import { butterflyGeo, birdGeo } from '../mapprops.js';
import { makeAtlas, atlasQuad, hipRoof, periodFlat, rowOf, plainText, rrect, prng } from './asia_kit.js';

var VERM = 0xe2452d;
var LACQUER = 0x3b2a2a;
var WOOD = 0xc99a62;
var WOOD_D = 0x8a5a33;
var PLASTER = 0xfff0d6;
var TILE = 0x7a5a45;
var STONE = 0xd8cab0;
var STONE_D = 0xb8a98c;
var LEAF = 0x4fbf62;
var LEAF_D = 0x3a9f55;
var PINK = 0xffb8c8;
var PINK_D = 0xff9eb4;
var MAPLE = [0xe8452e, 0xff7a2f, 0xf2a03a];
var BAMBOO = [0x7fcf52, 0x9ad962];
var GLOW = 0xffd27a;

// the dry garden's islands: [x units from the path edge, world z mod 16, radius units]
var DRY_ISLANDS = [[1.7, 3.2, 1.0], [3.4, 7.9, 1.1], [1.9, 12.6, 0.9]];
var PX = 64; // pixels per unit in the ground pictures
var POND_X0 = 5.75; // where the pond / dry garden begins (outside the lanes)
var POND_X1 = 11.0;

// ---------- painted pictures ----------

function gravelFloor() {
  // 12 across, 16 along, 48 px per unit: warm raked gravel with a path of flagstones down the middle
  return canvasTex('kyoto_gravel', 576, 768, function (ctx, w, h) {
    var U = 48;
    ctx.fillStyle = '#f3e7cc';
    ctx.fillRect(0, 0, w, h);
    // raked lines along the path, a gentle wobble, strongest at the edges
    var rnd = prng(11);
    for (var i = 0; i < w; i += 7) {
      var edge = Math.abs(i - w / 2) / (w / 2);
      ctx.strokeStyle = edge > 0.65 ? 'rgba(190,165,120,0.55)' : 'rgba(205,182,140,0.28)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (var y = 0; y <= h; y += 16) {
        var x = i + Math.sin((y / h) * Math.PI * 2 * 2 + i * 0.3) * (edge > 0.65 ? 3.2 : 1.2);
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // flagstones: irregular rounded slabs with dark gaps, the middle 9 units
    var x0 = w / 2 - 4.5 * U;
    var x1 = w / 2 + 4.5 * U;
    ctx.fillStyle = '#cdb98f';
    ctx.fillRect(x0, 0, x1 - x0, h);
    var rows = 16;
    var rh = h / rows;
    for (var r = 0; r < rows; r++) {
      var cols = 5 + (r % 2);
      var cw = (x1 - x0) / cols;
      for (var c = 0; c < cols; c++) {
        var jx = (rnd() - 0.5) * 5;
        var jy = (rnd() - 0.5) * 3;
        var sx = x0 + c * cw + 2 + jx * 0.4 + (r % 2 ? 0 : 0);
        var sy = r * rh + 2 + jy * 0.4;
        var tone = ['#eddcb8', '#e6d3ac', '#f1e3c4', '#e2cfa6'][(r * 3 + c * 2 + (r >> 1)) % 4];
        rrect(ctx, sx, sy, cw - 4, rh - 4, 7, tone);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(sx + 5, sy + 3, cw * 0.5, 3);
        if (rnd() < 0.18) { ctx.fillStyle = 'rgba(111,194,74,0.65)'; ctx.beginPath(); ctx.ellipse(sx + cw * 0.7, sy + rh * 0.7, cw * 0.14, rh * 0.1, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // stone curb at both edges, moss beyond
    [[0.4 * U, 0.5 * U], [w - 0.9 * U, 0.5 * U]].forEach(function (b) {
      ctx.fillStyle = '#c7b794'; ctx.fillRect(b[0], 0, b[1], h);
      ctx.fillStyle = 'rgba(111,194,74,0.55)'; ctx.fillRect(b[0] + (b[0] < w / 2 ? 0 : b[1] - 6), 0, 6, h);
    });
    // maple leaves that have settled on the gravel
    for (var l = 0; l < 26; l++) {
      var lx = rnd() < 0.5 ? rnd() * 0.95 * U : w - rnd() * 0.95 * U;
      ctx.fillStyle = ['#e8452e', '#f2a03a', '#ff7a2f'][l % 3];
      ctx.beginPath(); ctx.arc(lx, rnd() * h, 3, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function pondPicture() {
  // x runs from the far bank (u = 0, x = -11) to the path side (u = 1, x = -5.75): 5.25 units, 336 px; 16 units along
  var W = Math.round((POND_X1 - POND_X0) * PX);
  var H = 16 * PX;
  return canvasTex('kyoto_pond', W, H, function (ctx, w, h) {
    var rnd = prng(5);
    ctx.fillStyle = '#74d676';
    ctx.fillRect(0, 0, w, h);
    // sandy shore on the path side
    ctx.fillStyle = '#e9d3ac';
    ctx.fillRect(w - 0.22 * PX, 0, 0.22 * PX, h);
    // the water: a wobbly band
    ctx.fillStyle = '#3dbfd0';
    ctx.beginPath();
    ctx.moveTo(0.5 * PX, 0);
    for (var y = 0; y <= h; y += 32) ctx.lineTo(0.55 * PX + Math.sin(y / h * Math.PI * 6) * 0.3 * PX, y);
    ctx.lineTo(w - 0.28 * PX, h);
    for (var y2 = h; y2 >= 0; y2 -= 32) ctx.lineTo(w - 0.28 * PX - Math.sin(y2 / h * Math.PI * 4 + 1) * 0.08 * PX, y2);
    ctx.closePath();
    ctx.fill();
    // deeper middle and light ripples
    ctx.fillStyle = 'rgba(30,150,185,0.45)';
    ctx.fillRect(1.4 * PX, 0, 2.2 * PX, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    for (var i = 0; i < 40; i++) {
      var rx = (0.9 + rnd() * 3.9) * PX;
      var ry = rnd() * h;
      ctx.beginPath(); ctx.ellipse(rx, ry, 10 + rnd() * 16, 3 + rnd() * 3, 0, 0, Math.PI * 1.5); ctx.stroke();
    }
    // lily pads, some with a pink lotus
    for (var p = 0; p < 34; p++) {
      var px = (0.8 + rnd() * 4.2) * PX;
      var py = rnd() * h;
      var rr = 9 + rnd() * 8;
      ctx.fillStyle = ['#3fa65a', '#52bd68', '#2f9a52'][p % 3];
      ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, rr, 0.4, Math.PI * 2 - 0.4); ctx.closePath(); ctx.fill();
      if (p % 6 === 0) {
        ctx.fillStyle = '#ffb8c8';
        for (var q = 0; q < 6; q++) { ctx.beginPath(); ctx.ellipse(px + Math.cos(q) * 4, py + Math.sin(q) * 4, 5, 3, q, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // reflections of the red bridge and the trees
    ctx.fillStyle = 'rgba(226,69,45,0.25)';
    ctx.fillRect(1.2 * PX, rowOf(0 + 0, h) - 30, 3.6 * PX, 60);
  });
}

function dryGardenPicture() {
  // x runs from the path side (u = 0, x = 5.75) outward: raked gravel with ripples around three rock islands and moss
  var W = Math.round((POND_X1 - POND_X0) * PX);
  var H = 16 * PX;
  return canvasTex('kyoto_dry', W, H, function (ctx, w, h) {
    ctx.fillStyle = '#f6ebd0';
    ctx.fillRect(0, 0, w, h);
    // islands: [x units from the path edge, world z mod 16, radius units]
    var isl = DRY_ISLANDS;
    ctx.lineWidth = 1.8;
    for (var rr = 22; rr < 260; rr += 9) {
      ctx.strokeStyle = 'rgba(190,165,120,' + (0.55 - rr / 700) + ')';
      isl.forEach(function (c) {
        ctx.beginPath(); ctx.ellipse(c[0] * PX, rowOf(c[1], h), rr + c[2] * 0.4 * PX, rr * 0.9 + c[2] * 0.4 * PX, 0, 0, Math.PI * 2); ctx.stroke();
      });
    }
    // straight rake lines between them
    ctx.strokeStyle = 'rgba(200,176,132,0.35)';
    for (var x = 4; x < w; x += 9) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    // moss islands under the rocks
    isl.forEach(function (c) {
      ctx.fillStyle = '#6fc24a';
      ctx.beginPath(); ctx.ellipse(c[0] * PX, rowOf(c[1], h), c[2] * 0.62 * PX, c[2] * 0.5 * PX, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8fd35a';
      ctx.beginPath(); ctx.ellipse(c[0] * PX - 5, rowOf(c[1], h) - 5, c[2] * 0.4 * PX, c[2] * 0.3 * PX, 0, 0, Math.PI * 2); ctx.fill();
    });
    // the path-side curb
    ctx.fillStyle = '#c7b794'; ctx.fillRect(0, 0, 0.16 * PX, h);
  });
}

function teaAtlas() {
  var cells = [
    { id: 'noren', x: 0, y: 0, w: 256, h: 192 },
    { id: 'shoji', x: 256, y: 0, w: 128, h: 192 },
    { id: 'p0', x: 0, y: 200, w: 256, h: 104 },
    { id: 'p1', x: 256, y: 200, w: 256, h: 104 },
    { id: 'p2', x: 0, y: 310, w: 256, h: 104 },
    { id: 'p3', x: 256, y: 310, w: 256, h: 104 },
    { id: 'sign', x: 392, y: 0, w: 120, h: 192 }
  ];
  var plaque = { p0: 'ようこそ', p1: 'こんにちは', p2: 'ありがとう', p3: 'おはよう' };
  return makeAtlas('kyoto_atlas', 512, 420, cells, function (ctx, c) {
    var w = c.w;
    var h = c.h;
    if (c.id === 'noren') {
      ctx.fillStyle = '#2f4f93';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, 0, w, 10);
      ctx.fillStyle = '#fff3d6';
      ctx.fillRect(0, h - 12, w, 12);
      ctx.fillStyle = '#1d3470';
      [w / 3, (2 * w) / 3].forEach(function (x) { ctx.fillRect(x - 2, 14, 4, h - 14); });
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath(); ctx.arc(w / 2, h * 0.5, 54, 0, Math.PI * 2); ctx.fill();
      plainText(ctx, '茶', w / 2, h * 0.52, 78, '#2f4f93', { weight: '900' });
    } else if (c.id === 'shoji') {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#fff8e4'); g.addColorStop(1, '#ffe9b8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#7a4a28';
      for (var i = 0; i <= 3; i++) ctx.fillRect(i * (w - 8) / 3, 0, 8, h);
      for (var j = 0; j <= 5; j++) ctx.fillRect(0, j * (h - 6) / 5, w, 6);
    } else if (c.id === 'sign') {
      ctx.fillStyle = '#c99a62'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#8a5a33'; ctx.fillRect(0, 0, w, 8); ctx.fillRect(0, h - 8, w, 8);
      plainText(ctx, 'お', w / 2, h * 0.27, 66, '#3b2a2a');
      plainText(ctx, '茶', w / 2, h * 0.67, 80, '#3b2a2a');
    } else {
      ctx.fillStyle = '#2a1c18';
      rrect(ctx, 0, 0, w, h, 14, '#2a1c18', '#f2b134', 6);
      var t = plaque[c.id];
      plainText(ctx, t, w / 2, h / 2 + 2, t.length > 4 ? 44 : 56, '#f2b134');
    }
  });
}

// ---------- props ----------

function stoneLantern(g, x, z, s) {
  var k = s || 1;
  cyl(g, 0.2 * k, 0.24 * k, 0.12 * k, STONE_D, x, 0.06 * k, z, { seg: 6 });
  cyl(g, 0.08 * k, 0.1 * k, 0.55 * k, STONE, x, 0.4 * k, z, { seg: 6 });
  cyl(g, 0.27 * k, 0.22 * k, 0.09 * k, STONE_D, x, 0.73 * k, z, { seg: 6 });
  box(g, 0.34 * k, 0.3 * k, 0.34 * k, STONE, x, 0.93 * k, z);
  // the lit window faces the path on every side
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
    box(g, d[0] ? 0.02 : 0.15 * k, 0.15 * k, d[0] ? 0.15 * k : 0.02, GLOW, x + d[0] * 0.175 * k, 0.94 * k, z + d[1] * 0.175 * k, { bulb: true });
  });
  cone(g, 0.5 * k, 0.32 * k, STONE_D, x, 1.26 * k, z, { seg: 6 });
  ball(g, 0.07 * k, STONE, x, 1.46 * k, z, { seg: 5 });
}

function leafBall(g, r, c, x, y, z) { ball(g, r, c, x, y, z, { seg: 6, sy: 0.85 }); }

function cherry(g, x, z, s, lean) {
  var k = s || 1;
  cyl(g, 0.13 * k, 0.2 * k, 1.9 * k, 0x7a4a33, x, 0.95 * k, z, { seg: 5, rz: lean || 0 });
  cyl(g, 0.07 * k, 0.1 * k, 1.0 * k, 0x7a4a33, x + (lean || 0) * -0.6 * k, 2.1 * k, z, { seg: 5, rz: (lean || 0) * 2.5 + 0.5 });
  var c = [PINK, PINK_D, 0xffd0dc];
  leafBall(g, 1.15 * k, c[0], x, 2.6 * k, z);
  leafBall(g, 0.85 * k, c[1], x + 0.9 * k, 2.25 * k, z + 0.35 * k);
  leafBall(g, 0.8 * k, c[2], x - 0.85 * k, 2.35 * k, z - 0.3 * k);
  leafBall(g, 0.7 * k, c[1], x + 0.1 * k, 3.25 * k, z - 0.2 * k);
}

function maple(g, x, z, s, ci) {
  var k = s || 1;
  cyl(g, 0.1 * k, 0.17 * k, 1.5 * k, 0x6e4430, x, 0.75 * k, z, { seg: 5 });
  var a = MAPLE[ci % 3];
  var b = MAPLE[(ci + 1) % 3];
  leafBall(g, 1.0 * k, a, x, 2.1 * k, z);
  leafBall(g, 0.75 * k, b, x + 0.7 * k, 1.8 * k, z + 0.3 * k);
  leafBall(g, 0.7 * k, b, x - 0.7 * k, 1.9 * k, z - 0.3 * k);
  leafBall(g, 0.6 * k, a, x + 0.1 * k, 2.8 * k, z + 0.1 * k);
}

function pine(g, x, z, s) {
  var k = s || 1;
  cyl(g, 0.12 * k, 0.2 * k, 1.1 * k, 0x6e4430, x, 0.55 * k, z, { seg: 5, rz: 0.12 });
  cyl(g, 0.1 * k, 0.14 * k, 1.1 * k, 0x6e4430, x - 0.2 * k, 1.5 * k, z, { seg: 5, rz: -0.35 });
  // cloud-pruned pads
  ball(g, 0.95 * k, LEAF_D, x - 0.5 * k, 2.1 * k, z, { seg: 6, sy: 0.38 });
  ball(g, 0.8 * k, LEAF, x + 0.45 * k, 1.55 * k, z + 0.15 * k, { seg: 6, sy: 0.38 });
  ball(g, 0.65 * k, LEAF_D, x - 0.2 * k, 2.65 * k, z - 0.1 * k, { seg: 6, sy: 0.38 });
}

function rock(g, x, z, s, c) {
  ball(g, 0.55 * s, c || 0xb9a98e, x, 0.22 * s, z, { seg: 5, sy: 0.7, sx: 1.2 });
  ball(g, 0.3 * s, STONE_D, x + 0.45 * s, 0.12 * s, z + 0.2 * s, { seg: 5, sy: 0.7 });
}

function bamboo(g, x, z, n, spread, seed) {
  var rnd = prng(seed);
  for (var i = 0; i < n; i++) {
    var bx = x + (rnd() - 0.5) * spread;
    var bz = z + (rnd() - 0.5) * 3.4;
    var h = 5.5 + rnd() * 3.2;
    var c = BAMBOO[i % 2];
    box(g, 0.14, h, 0.14, c, bx, h / 2, bz);
    // a few dark nodes
    for (var j = 1; j < 4; j++) box(g, 0.19, 0.05, 0.19, 0x4f9a3a, bx, (h * j) / 4, bz);
    if (i % 2 === 0) ball(g, 0.55, LEAF, bx, h + 0.1, bz, { seg: 5, sy: 0.5 });
  }
}

function azalea(g, S, z) {
  // clipped round bushes along the path edge
  [-1.2, 0.9].forEach(function (dz, i) {
    ball(g, 0.36, i ? 0xff7aa8 : LEAF, S.in(0.1), 0.26, z + dz, { seg: 6, sy: 0.7, sx: 0.9 });
  });
}

// ---------- the four bays ----------

function curb(g, S, z) {
  box(g, 0.2, 0.14, 4, STONE, S.in(0.1) + S.side * 0.05, 0.07, z);
}

function teaHouse(g, S, z) {
  var side = S.side;
  var cx = side * (POND_X0 + 1.9);
  var cz = z;
  var A = atlas();
  box(g, 3.5, 0.25, 3.9, STONE_D, cx, 0.12, cz); // plinth
  box(g, 3.0, 1.95, 3.4, PLASTER, cx + side * 0.05, 1.22, cz);
  // dark timber frame on the front
  [-1.7, -0.6, 0.6, 1.7].forEach(function (dz) { box(g, 0.14, 1.95, 0.14, WOOD_D, cx - side * 1.52, 1.22, cz + dz); });
  box(g, 0.14, 0.14, 3.5, WOOD_D, cx - side * 1.52, 2.15, cz);
  box(g, 0.14, 0.14, 3.5, WOOD_D, cx - side * 1.52, 0.35, cz);
  // shoji panels either side of the entrance, the noren in the middle
  var yaw = S.turn;
  atlasQuad(g, A, 'shoji', 0.9, 1.5, cx - side * 1.6, 1.2, cz - 1.15, { ry: yaw, lit: true });
  atlasQuad(g, A, 'shoji', 0.9, 1.5, cx - side * 1.6, 1.2, cz + 1.15, { ry: yaw, lit: true });
  atlasQuad(g, A, 'noren', 1.5, 1.2, cx - side * 1.62, 1.55, cz, { ry: yaw, lit: true });
  box(g, 0.08, 0.1, 1.6, WOOD_D, cx - side * 1.6, 2.16, cz);
  atlasQuad(g, A, 'sign', 0.42, 0.66, cx - side * 1.64, 2.5, cz + 1.7, { ry: yaw, lit: true });
  // veranda (engawa) in front
  box(g, 0.9, 0.16, 3.8, WOOD, cx - side * 2.0, 0.5, cz);
  [-1.7, 1.7].forEach(function (dz) { box(g, 0.1, 0.4, 0.1, WOOD_D, cx - side * 2.4, 0.2, cz + dz); });
  // the roof: two tiers, wide eaves
  hipRoof(g, 4.4, 4.8, 1.3, TILE, cx - side * 0.05, 2.38, cz);
  box(g, 4.3, 0.1, 4.7, WOOD_D, cx - side * 0.05, 2.3, cz);
  box(g, 0.6, 0.18, 0.6, TILE, cx, 3.78, cz);
  // red paper lanterns under the eave
  [-1.45, 1.45].forEach(function (dz) {
    cyl(g, 0.01, 0.01, 0.25, LACQUER, cx - side * 2.15, 2.15, cz + dz, { seg: 3 });
    ball(g, 0.2, VERM, cx - side * 2.15, 1.8, cz + dz, { seg: 6, sy: 1.25 });
    box(g, 0.2, 0.04, 0.2, LACQUER, cx - side * 2.15, 2.03, cz + dz);
  });
  maple(g, side * (POND_X0 + 5.6), z + 0.6, 1.5, 0);
}

function dryGarden(g, S, z, k) {
  var side = S.side;
  periodFlat(g, dryTex(), side * POND_X0, side * POND_X1, z, 0.02);
  // rocks stand on the islands painted into the picture
  DRY_ISLANDS.forEach(function (c) {
    var dz = ((((c[1] - 4 * k + 8) % 16) + 16) % 16) - 8;
    if (Math.abs(dz) < 2) rock(g, side * (POND_X0 + c[0]), z + dz, c[2] * 1.05, 0xb8a78a);
  });
}

var _tex = {};
function dryTex() { return _tex.dry || (_tex.dry = dryGardenPicture()); }
function pondTex() { return _tex.pond || (_tex.pond = pondPicture()); }
var _atlas = null;
function atlas() { return _atlas || (_atlas = teaAtlas()); }

function pondBay(g, S, z) {
  var side = S.side;
  periodFlat(g, pondTex(), -POND_X1, -POND_X0, z, 0.03);
  // edge stones
  for (var i = 0; i < 3; i++) rock(g, side * (POND_X0 + 0.12), z - 1.4 + i * 1.4, 0.55 + (i % 2) * 0.2, i % 2 ? 0xc4b498 : 0xb2a287);
}

function bridge(g, S, z) {
  var side = S.side;
  var x0 = POND_X0 - 0.2;
  var span = 4.6;
  var n = 8;
  var pts = [];
  for (var i = 0; i <= n; i++) {
    var t = i / n;
    pts.push([side * (x0 + t * span), 0.15 + Math.sin(t * Math.PI) * 1.35]);
  }
  for (var j = 0; j < n; j++) {
    var a = pts[j];
    var b = pts[j + 1];
    var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    box(g, len + 0.02, 0.14, 1.3, 0xa86a3a, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z, { rz: ang });
    [-0.62, 0.62].forEach(function (dz) {
      box(g, len + 0.02, 0.1, 0.1, VERM, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.55, z + dz, { rz: ang });
      box(g, 0.08, 0.5, 0.08, VERM, a[0], a[1] + 0.3, z + dz);
    });
  }
  [-0.62, 0.62].forEach(function (dz) { box(g, 0.12, 0.6, 0.12, VERM, pts[n][0], pts[n][1] + 0.3, z + dz); ball(g, 0.1, 0xf2b134, pts[n][0], pts[n][1] + 0.66, z + dz, { seg: 5 }); ball(g, 0.1, 0xf2b134, pts[0][0], pts[0][1] + 0.66, z + dz, { seg: 5 }); });
}

function gazebo(g, S, z) {
  var side = S.side;
  var x = side * (POND_X0 + 1.9);
  box(g, 2.6, 0.2, 2.6, WOOD, x, 0.3, z);
  [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(function (p) { cyl(g, 0.1, 0.1, 2.4, VERM, x + p[0], 1.5, z + p[1], { seg: 5 }); });
  box(g, 2.6, 0.12, 0.12, WOOD_D, x, 2.7, z - 1.1);
  box(g, 2.6, 0.12, 0.12, WOOD_D, x, 2.7, z + 1.1);
  hipRoof(g, 3.5, 3.5, 1.2, TILE, x, 2.72, z);
  ball(g, 0.14, 0xf2b134, x, 4.0, z, { seg: 5 });
  ball(g, 0.2, VERM, x - side * 0.1, 2.35, z, { seg: 6, sy: 1.25 });
  // a bench under the roof
  box(g, 0.5, 0.1, 1.6, WOOD_D, x + side * 0.6, 0.75, z);
}

function bambooFence(g, S, z) {
  var x = S.in(0.12);
  var side = S.side;
  box(g, 0.1, 0.08, 4, WOOD_D, x, 1.25, z);
  box(g, 0.1, 0.08, 4, WOOD_D, x, 0.35, z);
  for (var i = 0; i < 12; i++) box(g, 0.09, 1.45, 0.09, BAMBOO[i % 2], x - side * 0.04, 0.73, z - 1.8 + i * 0.33);
  [-1.9, 0, 1.9].forEach(function (dz) { box(g, 0.14, 1.6, 0.14, 0xd4a860, x + side * 0.05, 0.8, z + dz); });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  var j = (k + (side > 0 ? 2 : 0)) % 4;
  curb(g, S, z);
  azalea(g, S, z);
  if (side < 0) {
    pondBay(g, S, z);
    if (j === 0) { cherry(g, side * (POND_X0 + 4.2), z - 0.4, 1.5, side * -0.08); stoneLantern(g, S.in(0.05), z - 1.2, 1.15); }
    else if (j === 1) { bridge(g, S, z); }
    else if (j === 2) { maple(g, side * (POND_X0 + 4.0), z - 0.6, 1.45, 1); stoneLantern(g, S.in(0.05), z + 0.9, 1.15); }
    else { gazebo(g, S, z); }
    bamboo(g, side * 12.5, z, 8, 4.5, 3 + k);
  } else {
    dryGarden(g, S, z, k);
    if (j === 1) { pine(g, side * (POND_X0 + 4.2), z - 0.6, 1.6); stoneLantern(g, S.in(0.05), z + 1.2, 1.15); }
    else if (j === 2) teaHouse(g, S, z);
    else if (j === 3) { bambooFence(g, S, z); cherry(g, side * (POND_X0 + 4.2), z + 0.2, 1.6, 0.1); }
    else maple(g, side * (POND_X0 + 4.4), z + 0.4, 1.5, 2);
    bamboo(g, side * 12.5, z, 8, 4.5, 21 + k);
  }
}

function center(g, z) {
  floorPanel(g, gravelFloor(), z, 12);
}

// ---------- the torii over the path ----------

function arch(g, z, i) {
  var A = atlas();
  [-1, 1].forEach(function (s) {
    var x = s * 5.05;
    cyl(g, 0.2, 0.25, 5.6, VERM, x, 2.8, z, { seg: 8 });
    cyl(g, 0.27, 0.27, 0.55, LACQUER, x, 0.28, z, { seg: 8 });
  });
  // lower tie beam (nuki), upper lintel (kasagi) with turned-up ends, black cap (shimaki)
  box(g, 11.2, 0.3, 0.34, VERM, 0, 4.7, z);
  box(g, 11.6, 0.34, 0.52, LACQUER, 0, 5.6, z);
  box(g, 10.8, 0.3, 0.46, VERM, 0, 5.34, z);
  [-1, 1].forEach(function (s) {
    box(g, 1.1, 0.34, 0.52, LACQUER, s * 6.0, 5.76, z, { rz: s * 0.22 });
    box(g, 0.34, 0.3, 0.46, VERM, s * 5.55, 5.34, z, { rz: s * 0.1 });
  });
  // the plaque in the middle, greeting in Japanese
  box(g, 0.5, 0.64, 0.1, LACQUER, 0, 5.02, z);
  atlasQuad(g, A, 'p' + (i % 4), 1.9, 0.78, 0, 5.02, z + 0.08, {});
}

// ---------- ground and distance ----------

function ground(g) {
  slab(g, 400, 400, 0x74d676, 0, -0.02, -190, { r: 1 });
  // Kyoto's low green hills in layers
  for (var i = 0; i < 7; i++) {
    ball(g, 18 + (i % 3) * 6, i % 2 ? 0x58c46c : 0x4fb862, (i - 3) * 36, -4, -175, { seg: 8, sy: 0.6 });
  }
  for (var j = 0; j < 5; j++) ball(g, 12 + (j % 2) * 4, j % 2 ? 0x6ad07a : 0x5cc66c, (j - 2) * 44 + 20, -3, -150, { seg: 8, sy: 0.5 });
}

function pagoda() {
  var m = new THREE.Group();
  var cols = [VERM, 0xfff0d6];
  box(m, 4.4, 0.7, 4.4, STONE_D, 0, 0.35, 0);
  for (var f = 0; f < 5; f++) {
    var w = 3.2 - f * 0.4;
    var y = 0.7 + f * 2.0;
    box(m, w * 0.78, 1.0, w * 0.78, cols[f % 2], 0, y + 0.5, 0);
    hipRoof(m, w + 1.7, w + 1.7, 0.85, 0x6b4f3e, 0, y + 1.0, 0);
  }
  cyl(m, 0.08, 0.08, 3.2, 0xf2b134, 0, 12.0, 0, { seg: 5 });
  ball(m, 0.22, 0xf2b134, 0, 12.5, 0, { seg: 5 });
  ball(m, 0.18, 0xf2b134, 0, 13.1, 0, { seg: 5 });
  m.scale.setScalar(1.15);
  return animated(m);
}

function petalGeo() {
  var wing = new THREE.CircleGeometry(0.07, 5);
  return combine([{ geo: wing, color: 0xffffff, matrix: xform(0, 0, 0, -Math.PI / 2.4, 0, 0, 1, 1.5, 1) }]);
}

function koiGeo() {
  return combine([
    { geo: new THREE.SphereGeometry(0.22, 6, 4), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 0.55, 0.3, 1.5) },
    { geo: new THREE.ConeGeometry(0.17, 0.3, 3), color: 0xffffff, matrix: xform(0, 0, -0.42, Math.PI / 2, 0, 0, 1, 1, 0.3) }
  ]);
}

function extras() {
  cloudBank(10, { seed: 3 });
  var butter = butterflyGeo();
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: butter, count: 7, seed: 12 + i * 9, colors: [0xff9a3f, 0xffd23f, 0xffffff, 0x6fd4ff], area: { x: [side * 5.0, side * 9], y: [1.0, 3.0], z: [-140, 8] }, k: 1, vx: [-0.3, 0.3], vz: [-0.5, 0.5], wobble: 0.5, flap: 0.9, scale: [1, 1.4], flat: true });
    swarm({ geo: petalGeo(), count: 34, seed: 40 + i * 7, colors: [0xffb8c8, 0xffd0dc, 0xff9eb4], area: { x: [side * 4.7, side * 9], y: [0.2, 6.0], z: [-140, 8] }, k: 1, vy: [-0.55, -0.3], vx: [side * 0.1, side * 0.5], wobble: 0.35, turn: 2.2, scale: [1, 1.8] });
  });
  // koi in the pond on the left
  swarm({ geo: koiGeo(), count: 16, seed: 91, colors: [0xff7a2f, 0xffffff, 0xffb02f, 0xff5a3a], area: { x: [-10.4, -6.2], y: [0.06, 0.06], z: [-140, 8] }, k: 1, vx: [-0.25, 0.25], vz: [-0.8, 0.8], face: true, scale: [1, 1.5] });
  swarm({ geo: birdGeo(), count: 6, seed: 77, colors: [0xffffff, 0xfff0e0], area: { x: [-26, 26], y: [8, 14], z: [-140, 8] }, k: 0.3, vz: [-4, -2.5], vx: [-0.4, 0.4], face: true, flap: 0.5, scale: [1.2, 2] });
  features(pagoda, { x: -26, spacing: 90, count: 2, z0: -60 });
}

export var w_kyoto_tea_garden = { id: 'w_kyoto_tea_garden', indoor: false, bay: bay, center: center, arch: arch, ground: ground, extras: extras };
