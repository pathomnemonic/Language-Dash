/**
 * w_festival_of_seasons.js — Festival of Seasons (skin 'Holiday Wards', title "Festival of Seasons"): a town square
 * dressed for all four seasons at once, one after the other along the route.
 *
 * Each 16 units is a lap of the year, a bay per season: WINTER (a lit fir tree, presents, a snowman, candy canes, falling
 * snow), SPRING (cherry blossom, tulip beds, paper lanterns, a bunny, drifting petals), SUMMER (a striped beach umbrella,
 * a lounger, a sandcastle, a palm, surfboards) and AUTUMN (pumpkins, a golden maple, hay bales, a grinning jack-o'-lantern,
 * falling leaves). The square's paving changes with the season, the painted town houses behind change their roofs and
 * decorations, and party lights, balloons and greeting banners run through all of it.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, extrude, starShape, mat, bulb, canvasTex, stripeTex, sign, floorPanel, sideCtx,
  slab, WALL_X, animate, currentWorld, keepSeparate, combine
} from '../mapkit.js';
import { animated, mover, swarm, cloudBank } from '../mapfx.js';
import { picket, hedge, birdGeo } from '../mapprops.js';

var WORDS = ['Joyeux Noël', 'Hanami 花見', 'Buone Vacanze', 'Erntedankfest', 'Feliz Año', 'Fête !'];
var BULBS = [0xff5a4a, 0xffd23f, 0x3fd47a, 0x4aa8f0, 0xff7ab8];

// ---------- painted pictures ----------

function lerpHex(a, b, t) {
  var ar = (a >> 16) & 255; var ag = (a >> 8) & 255; var ab = a & 255;
  var br = (b >> 16) & 255; var bg = (b >> 8) & 255; var bb = b & 255;
  return 'rgb(' + Math.round(ar + (br - ar) * t) + ',' + Math.round(ag + (bg - ag) * t) + ',' + Math.round(ab + (bb - ab) * t) + ')';
}

function squarePicture() {
  // the square, 28 across (32 px to the unit) and 16 along (32 px): four seasons of paving, each blending into the next.
  // Along the track v runs far-ward; bay k is centred on v = k / 4 (wrapping).
  return canvasTex('fest_square', 896, 512, function (ctx, w, h) {
    var base = [0xeaf2ff, 0xffd9e6, 0xffe39a, 0xf6c985];       // snow, petals, sand, leaves
    var stone = [0xc9dcf5, 0xf3b6cc, 0xe8c26a, 0xd9a05a];
    for (var y = 0; y < h; y++) {
      var v = 1 - y / h;
      var pos = v * 4;
      var s0 = Math.floor(pos + 0.5) % 4;
      var s1 = (s0 + (pos + 0.5 - Math.floor(pos + 0.5) > 0.5 ? 1 : 3)) % 4;
      var f = Math.abs((pos + 0.5) - Math.floor(pos + 0.5) - 0.5);       // 0 at the seam between two seasons
      var mix = f < 0.08 ? 0.5 - f / 0.16 : 0;
      ctx.fillStyle = lerpHex(base[s0], base[s1], mix);
      ctx.fillRect(0, y, w, 1);
    }
    // cobbles: rows of rounded stones, tinted by the season
    for (var r = 0; r < 32; r++) {
      for (var c = 0; c < 28; c++) {
        var vv = 1 - (r * 16 + 8) / h;
        var s = Math.floor(vv * 4 + 0.5) % 4;
        ctx.fillStyle = css(stone[s]);
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.ellipse(c * 32 + (r % 2 ? 16 : 0) + 16, r * 16 + 8, 13, 6.5, 0, 0, 6.3);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // season dressing, scattered
    function at(k, n, fn) {
      for (var i = 0; i < n; i++) {
        var vz = (k / 4 + (((i * 0.6180339) % 1) - 0.5) * 0.2 + 1) % 1;
        var px = ((i * 337) % 880) + 8;
        fn(px, (1 - vz) * h, i);
      }
    }
    at(0, 70, function (x, y, i) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, 6.3); ctx.fill(); });
    at(1, 60, function (x, y, i) { ctx.fillStyle = i % 2 ? '#ff8fb8' : '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y, 5, 3, i, 0, 6.3); ctx.fill(); });
    at(2, 40, function (x, y, i) { ctx.strokeStyle = 'rgba(200,150,60,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 4, x + 20, y); ctx.stroke(); if (i % 9 === 0) { ctx.fillStyle = '#ff9aa8'; ctx.beginPath(); ctx.arc(x, y + 6, 4, 0, 6.3); ctx.fill(); } });
    at(3, 60, function (x, y, i) { ctx.fillStyle = ['#e8802a', '#d9382f', '#f0b840'][i % 3]; ctx.beginPath(); ctx.ellipse(x, y, 7, 4, i, 0, 6.3); ctx.fill(); });
  });
}

function css(hex) { return '#' + ('000000' + hex.toString(16)).slice(-6); }

function townTex() {
  // painted town houses with pointed gables, one season per bay, 7 units tall (64 px); the gaps are see-through
  return canvasTex('fest_town', 1024, 448, function (ctx, w, h) {
    var wallsBy = [['#e9625a', '#4a90d8', '#f4c64a', '#7fc88a'], ['#ffc2d6', '#fff0a8', '#c8e8ff', '#d6f0c0'], ['#ffd84a', '#59c8e8', '#ff8a6a', '#fff6e0'], ['#e08a3a', '#c8683a', '#f0b84a', '#b8503a']];
    for (var s = 0; s < 4; s++) {
      for (var hse = 0; hse < 2; hse++) {
        var x0 = s * 256 + hse * 128 + 4;
        var hw = 120;
        var top = 130 + hse * 34;                 // the eaves
        var peak = top - 66;
        var col = wallsBy[s][(hse * 2 + s) % 4];
        ctx.fillStyle = col;
        ctx.fillRect(x0, top, hw, h - top);
        // gable roof
        var roofC = ['#ffffff', '#e8788a', '#2fa8a0', '#a04a28'][s];
        ctx.fillStyle = roofC;
        ctx.beginPath(); ctx.moveTo(x0 - 6, top + 4); ctx.lineTo(x0 + hw / 2, peak); ctx.lineTo(x0 + hw + 6, top + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(x0 + 8, top + 2); ctx.lineTo(x0 + hw / 2, peak + 22); ctx.lineTo(x0 + hw - 8, top + 2); ctx.closePath(); ctx.fill();
        if (s === 0) { // snow on the roof edge and a thick cap
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x0 - 8, top + 8); ctx.lineTo(x0 + hw / 2, peak - 8); ctx.lineTo(x0 + hw + 8, top + 8); ctx.lineTo(x0 + hw + 8, top + 18); ctx.lineTo(x0 - 8, top + 18); ctx.closePath(); ctx.fill();
        }
        // windows: three rows
        for (var r = 0; r < 3; r++) {
          for (var c = 0; c < 2; c++) {
            var wx = x0 + 20 + c * 56;
            var wy = top + 24 + r * 70;
            if (wy > h - 150 && r === 2 && c === 0) continue;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(wx - 3, wy - 3, 38, 52);
            ctx.fillStyle = s === 0 || s === 3 ? '#ffe08a' : '#a9dcf4';
            ctx.fillRect(wx, wy, 32, 46);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(wx + 14, wy, 4, 46); ctx.fillRect(wx, wy + 20, 32, 4);
            if (s === 1) { ctx.fillStyle = '#ff8fb8'; for (var p = 0; p < 4; p++) { ctx.beginPath(); ctx.arc(wx + 4 + p * 8, wy + 52, 5, 0, 6.3); ctx.fill(); } }
            if (s === 3 && r === 0) { ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.arc(wx + 16, wy + 52, 7, 0, 6.3); ctx.fill(); }
          }
        }
        // door
        ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x0 + 20, h - 76, 36, 76);
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x0 + 50, h - 38, 3, 0, 6.3); ctx.fill();
        // season decoration on the front
        if (s === 0) { // a wreath on the door
          ctx.strokeStyle = '#2f9e5a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x0 + 38, h - 92, 12, 0, 6.3); ctx.stroke(); ctx.fillStyle = '#d9382f'; ctx.beginPath(); ctx.arc(x0 + 38, h - 80, 5, 0, 6.3); ctx.fill();
        } else if (s === 1) { // pink blossom clusters spilling over the front
          ctx.fillStyle = '#ffa8c8'; for (var b = 0; b < 8; b++) { ctx.beginPath(); ctx.arc(x0 + 10 + b * 14, top + 20 + (b % 3) * 12, 12, 0, 6.3); ctx.fill(); }
        } else if (s === 2) { // a striped awning over the door and a sun-hat sign
          for (var a = 0; a < 6; a++) { ctx.fillStyle = a % 2 ? '#ffffff' : '#ff5a4a'; ctx.fillRect(x0 + 8 + a * 8, h - 96, 8, 20); }
        } else { // ivy and orange leaves
          ctx.fillStyle = '#d9382f'; for (var l = 0; l < 9; l++) { ctx.beginPath(); ctx.ellipse(x0 + 8 + (l * 37) % 108, top + 30 + (l * 53) % 200, 9, 6, l, 0, 6.3); ctx.fill(); }
          ctx.fillStyle = '#f0b840'; for (var m = 0; m < 7; m++) { ctx.beginPath(); ctx.ellipse(x0 + 14 + (m * 29) % 100, top + 40 + (m * 61) % 190, 8, 5, m, 0, 6.3); ctx.fill(); }
        }
      }
    }
  });
}

var _townMat = null;
function townMaterial() {
  if (_townMat) return _townMat;
  var t = townTex();
  _townMat = new THREE.MeshStandardMaterial(t ? { map: t, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide } : { color: 0xffc2d6 });
  return _townMat;
}

function townFront(g, side, z, xout) {
  var tex = townTex();
  var geo = new THREE.PlaneGeometry(4, 7);
  var uv = geo.attributes.uv;
  for (var i = 0; i < uv.count; i++) {
    var local = (uv.getX(i) - 0.5) * 4;
    uv.setX(i, side < 0 ? (local - z) / 16 : (z + local) / 16);
  }
  var m = new THREE.Mesh(geo, tex ? townMaterial() : mat(0xffc2d6));
  m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  m.position.set(side * (WALL_X + xout), 3.5, z);
  g.add(m);
}

function ballTex() {
  return stripeTex(0xff5a4a, 0xffffff, 4);
}

function pumpkinFace() {
  return canvasTex('fest_pumpkin', 128, 128, function (ctx, w, h) {
    ctx.fillStyle = '#ff8a1f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe56a';
    ctx.beginPath(); ctx.moveTo(30, 48); ctx.lineTo(54, 48); ctx.lineTo(42, 28); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(74, 48); ctx.lineTo(98, 48); ctx.lineTo(86, 28); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(24, 76); ctx.lineTo(104, 76); ctx.lineTo(96, 100); ctx.lineTo(80, 88); ctx.lineTo(64, 104); ctx.lineTo(48, 88); ctx.lineTo(32, 100); ctx.closePath(); ctx.fill();
  });
}

// ---------- shared pieces ----------

function pumpkin(g, x, z, s, c) {
  ball(g, 0.4 * s, c || 0xff8a1f, x, 0.34 * s, z, { seg: 8, sy: 0.82 });
  ball(g, 0.3 * s, 0xf07a14, x, 0.34 * s, z, { seg: 8, sy: 0.8, sx: 1.25 });
  cyl(g, 0.05 * s, 0.07 * s, 0.18 * s, 0x4a8a3a, x, 0.74 * s, z, { seg: 5 });
}

function gift(g, x, z, c, s) {
  box(g, 0.5 * s, 0.4 * s, 0.5 * s, c, x, 0.2 * s, z);
  box(g, 0.52 * s, 0.4 * s, 0.1 * s, 0xffffff, x, 0.2 * s, z);
  box(g, 0.1 * s, 0.42 * s, 0.52 * s, 0xffffff, x, 0.2 * s, z);
  ball(g, 0.1 * s, 0xffffff, x, 0.46 * s, z, { seg: 4 });
}

function palm(g, x, z, s) {
  cyl(g, 0.12 * s, 0.2 * s, 3.4 * s, 0xb98a55, x, 1.7 * s, z, { seg: 5, rz: 0.05 });
  for (var i = 0; i < 7; i++) {
    var a = (i / 7) * Math.PI * 2;
    box(g, 0.28 * s, 0.05, 1.5 * s, 0x2fbf5a, x + Math.cos(a) * 0.7 * s, 3.5 * s, z + Math.sin(a) * 0.7 * s, { ry: -a + Math.PI / 2, rx: 0.55 });
  }
  ball(g, 0.18 * s, 0x8a5a2a, x, 3.35 * s, z, { seg: 4 });
  ball(g, 0.18 * s, 0x8a5a2a, x + 0.2 * s, 3.3 * s, z + 0.1 * s, { seg: 4 });
}

// ---------- the four seasons ----------

function winter(g, S, z) {
  // fence of snowy pickets, drifts, a lit fir, presents, a snowman and candy canes
  picket(g, S.in(0.0) + S.side * 0.08, z, 4, 0.8, 0xffffff);
  [-1.6, -0.3, 1.1, 1.8].forEach(function (dz, i) { ball(g, 0.35, 0xffffff, S.in(0.1), 0.1, z + dz, { seg: 7, sy: 0.45, sx: 1.1 + (i % 2) * 0.3 }); });
  var tx = S.out(2.0);
  cyl(g, 0.2, 0.25, 0.7, 0x7a4a2a, tx, 0.35, z, { seg: 6 });
  cone(g, 1.55, 1.9, 0x2f9e5a, tx, 1.5, z, { seg: 9 });
  cone(g, 1.2, 1.6, 0x38b066, tx, 2.7, z, { seg: 9 });
  cone(g, 0.8, 1.4, 0x40c070, tx, 3.8, z, { seg: 9 });
  cone(g, 0.5, 0.5, 0xffffff, tx, 4.45, z, { seg: 8 });
  extrude(g, starShape(0.38, 0.17, 5), 0.1, 0xffd23f, tx, 4.95, z, { ry: S.turn, bulb: true });
  for (var i = 0; i < 16; i++) {
    var a = i * 2.4; var h = 0.9 + (i / 16) * 3.2; var r = 1.35 - (i / 16) * 1.0;
    ball(g, 0.09, BULBS[i % 5], tx + Math.cos(a) * r - S.side * 0.1, h, z + Math.sin(a) * r, { seg: 4, bulb: true });
  }
  gift(g, S.in(0.55), z + 1.3, 0xd9382f, 1.1);
  gift(g, S.in(0.6), z - 1.5, 0x3d8bff, 0.9);
  gift(g, S.in(0.35), z - 1.2, 0x2fae58, 0.7);
  // snowman
  var sx = S.in(0.62);
  ball(g, 0.38, 0xffffff, sx, 0.36, z + 0.1, { seg: 8 });
  ball(g, 0.28, 0xffffff, sx, 0.88, z + 0.1, { seg: 8 });
  ball(g, 0.2, 0xffffff, sx, 1.3, z + 0.1, { seg: 7 });
  cone(g, 0.04, 0.26, 0xff8a1f, sx - S.side * 0.2, 1.3, z + 0.1, { seg: 4, rz: S.side * Math.PI / 2 });
  cyl(g, 0.15, 0.15, 0.22, 0x2a2d3a, sx, 1.57, z + 0.1, { seg: 8 });
  cyl(g, 0.22, 0.22, 0.03, 0x2a2d3a, sx, 1.47, z + 0.1, { seg: 8 });
  box(g, 0.3, 0.07, 0.3, 0xd9382f, sx, 1.1, z + 0.1);
  [0.0, 0.2].forEach(function (d) { ball(g, 0.035, 0x2a2d3a, sx - S.side * 0.17, 1.33, z + d - 0.0, { seg: 3 }); });
  // candy canes
  [0.0, 0.7].forEach(function (d, n) {
    cyl(g, 0.05, 0.05, 1.1, n ? 0xffffff : 0xe8334a, S.in(0.22), 0.56, z - 0.65 + d, { seg: 6 });
    ring(g, 0.15, 0.05, n ? 0xe8334a : 0xffffff, S.in(0.22), 1.1, z - 0.5 + d, { arc: Math.PI, seg: 8, tube: 4, rx: 0, rz: 0 });
  });
}

function spring(g, S, z) {
  hedge(g, S.in(0.0) + S.side * 0.1, 0, z, 4, 0.7, 0.3, 0x3fb25a);
  for (var f = 0; f < 10; f++) ball(g, 0.08, [0xff8fb8, 0xffffff, 0xffd23f][f % 3], S.in(0.0) + S.side * 0.1, 0.85, z - 1.8 + f * 0.4, { seg: 4 });
  // cherry blossom tree and fallen petals
  var tx = S.out(1.8);
  cyl(g, 0.22, 0.32, 2.2, 0x6a4228, tx, 1.1, z, { seg: 6 });
  cyl(g, 0.1, 0.14, 1.4, 0x6a4228, tx + 0.5, 2.5, z + 0.3, { seg: 5, rz: -S.side * 0.7 });
  cyl(g, 0.1, 0.14, 1.4, 0x6a4228, tx - 0.4, 2.6, z - 0.3, { seg: 5, rz: S.side * 0.6 });
  [[0, 3.6, 0, 1.5], [1.1, 3.2, 0.5, 1.1], [-1.0, 3.3, -0.6, 1.1], [0.4, 4.3, -0.2, 1.0], [-0.5, 2.9, 0.9, 0.9], [1.5, 2.7, -0.7, 0.8]].forEach(function (b, i) {
    ball(g, b[3], i % 2 ? 0xffb8d0 : 0xffd0e0, tx + b[0], b[1], z + b[2], { seg: 7 });
  });
  for (var p = 0; p < 7; p++) cyl(g, 0.1, 0.1, 0.02, 0xffb8d0, S.in(0.3 + (p % 3) * 0.2), 0.03, z - 1.6 + p * 0.5, { seg: 5 });
  // tulip bed
  box(g, 0.5, 0.2, 1.8, 0x6a4228, S.in(0.55), 0.1, z + 1.0);
  for (var t = 0; t < 8; t++) {
    var tz = z + 0.3 + (t % 4) * 0.45;
    var tcx = S.in(0.45 + (t >> 2) * 0.2);
    cyl(g, 0.015, 0.015, 0.35, 0x3fa24f, tcx, 0.35, tz, { seg: 3 });
    cone(g, 0.09, 0.2, [0xe8334a, 0xffd23f, 0xff8fb8, 0xffffff][t % 4], tcx, 0.62, tz, { seg: 5, rz: Math.PI });
  }
  // a bunny and an egg basket
  var bz = z - 1.0;
  var bx = S.in(0.6);
  ball(g, 0.2, 0xffffff, bx, 0.22, bz, { seg: 7, sz: 1.2 });
  ball(g, 0.13, 0xffffff, bx, 0.45, bz + 0.15, { seg: 6 });
  box(g, 0.04, 0.26, 0.07, 0xffffff, bx - 0.05, 0.7, bz + 0.12);
  box(g, 0.04, 0.26, 0.07, 0xffffff, bx + 0.05, 0.7, bz + 0.12);
  ball(g, 0.05, 0xffffff, bx, 0.28, bz - 0.24, { seg: 4 });
  cyl(g, 0.2, 0.15, 0.22, 0xc58b4a, S.in(0.3), 0.11, z - 0.2, { seg: 8 });
  [0xff8fb8, 0x7fd0e8, 0xffd23f].forEach(function (c, i) { ball(g, 0.08, c, S.in(0.3) + (i - 1) * 0.07, 0.26, z - 0.2 + (i % 2) * 0.05, { seg: 5, sy: 1.25 }); });
  // paper lanterns on a string from the tree
  for (var l = 0; l < 4; l++) ball(g, 0.18, l % 2 ? 0xff8fb8 : 0xffffff, S.out(0.0) + S.side * (0.2 + l * 0.2) * 0, 3.4 - Math.sin(l / 3 * Math.PI) * 0.25, z - 1.5 + l * 1.0, { seg: 6, sy: 1.2, bulb: true });
}

function summer(g, S, z) {
  // boardwalk rail with a rope, umbrella, lounger, sandcastle, palm, surfboards
  box(g, 0.12, 0.6, 4.0, 0xd9a25a, S.in(0.0) + S.side * 0.05, 0.3, z);
  box(g, 0.1, 0.08, 4.0, 0xffffff, S.in(0.0) + S.side * 0.05, 0.68, z);
  var ux = S.in(0.7);
  var uz = z - 0.3;
  cyl(g, 0.035, 0.04, 2.5, 0xffffff, ux, 1.25, uz, { seg: 5 });
  var st = ballTex();
  cone(g, 1.45, 0.62, 0xff5a4a, ux, 2.65, uz, { seg: 12, mat: st ? mat(0xffffff, { map: st, r: 0.85, side: THREE.DoubleSide }) : mat(0xff5a4a, { side: THREE.DoubleSide }) });
  ball(g, 0.07, 0xffd23f, ux, 3.0, uz, { seg: 5 });
  // lounger
  box(g, 0.6, 0.1, 1.5, 0xffffff, S.in(0.55), 0.35, z + 1.15);
  box(g, 0.58, 0.08, 0.6, 0x3fd0e8, S.in(0.55), 0.55, z + 1.7, { rx: -0.5 });
  box(g, 0.6, 0.12, 0.9, 0x3fd0e8, S.in(0.55), 0.42, z + 0.95);
  // sandcastle
  var cx = S.in(0.5);
  var cz = z - 1.6;
  cyl(g, 0.35, 0.4, 0.4, 0xf0cf84, cx, 0.2, cz, { seg: 8 });
  cyl(g, 0.12, 0.14, 0.5, 0xf0cf84, cx - 0.2, 0.6, cz, { seg: 6 });
  cyl(g, 0.12, 0.14, 0.5, 0xf0cf84, cx + 0.2, 0.6, cz, { seg: 6 });
  cone(g, 0.15, 0.2, 0xff5a4a, cx - 0.2, 0.95, cz, { seg: 6 });
  cyl(g, 0.01, 0.01, 0.35, 0xffffff, cx - 0.2, 1.2, cz, { seg: 3 });
  // beach ball
  var bt = ballTex();
  ball(g, 0.3, 0xffffff, S.in(0.25), 0.3, z + 0.2, { seg: 10, mat: bt ? mat(0xffffff, { map: bt, r: 0.4 }) : mat(0xff5a4a) });
  // palm and surfboards
  palm(g, S.out(1.5), z + 0.6, 1.2);
  [0xff5a4a, 0xffd23f, 0x3fd0e8].forEach(function (c, i) {
    ball(g, 0.3, c, S.out(0.35), 1.1, z - 1.5 + i * 0.5, { seg: 8, sx: 0.12, sy: 3.3, sz: 0.9 });
  });
}

function autumn(g, S, z) {
  picket(g, S.in(0.0) + S.side * 0.08, z, 4, 0.7, 0xc8803a);
  // pumpkins in every size
  pumpkin(g, S.in(0.55), z - 1.3, 1.2);
  pumpkin(g, S.in(0.35), z - 0.7, 0.8, 0xffa030);
  pumpkin(g, S.in(0.7), z - 0.4, 0.7, 0xf0903a);
  pumpkin(g, S.in(0.5), z + 0.3, 1.0);
  pumpkin(g, S.in(0.25), z + 0.2, 0.6, 0xffc060);
  // a jack-o'-lantern with a glowing face
  var jt = pumpkinFace();
  var jx = S.in(0.5);
  ball(g, 0.5, 0xff8a1f, jx, 0.45, z + 1.4, { seg: 10, sy: 0.85, ry: S.turn - Math.PI / 2 + (S.side > 0 ? Math.PI : 0), mat: jt ? bulb(0xffffff, { map: jt }) : bulb(0xff8a1f) });
  cyl(g, 0.06, 0.08, 0.2, 0x4a8a3a, jx, 0.9, z + 1.4, { seg: 5 });
  // hay bales and a scarecrow
  box(g, 0.7, 0.45, 1.0, 0xf0c24a, S.in(0.6), 0.23, z + 1.95 - 0.0 + 0.0, { ry: 0.1 });
  cyl(g, 0.05, 0.05, 2.0, 0x6a4228, S.in(0.15), 1.0, z - 1.8, { seg: 4 });
  box(g, 0.05, 0.06, 1.0, 0x6a4228, S.in(0.15), 1.5, z - 1.8);
  ball(g, 0.17, 0xf0c24a, S.in(0.15), 2.05, z - 1.8, { seg: 6 });
  cone(g, 0.26, 0.26, 0x6a4228, S.in(0.15), 2.3, z - 1.8, { seg: 6 });
  // golden maple behind
  var tx = S.out(1.9);
  cyl(g, 0.22, 0.3, 2.4, 0x6a4228, tx, 1.2, z + 0.2, { seg: 6 });
  [[0, 3.8, 0, 1.5, 0xe8802a], [1.1, 3.3, 0.6, 1.1, 0xd9382f], [-1.0, 3.4, -0.5, 1.1, 0xf0b840], [0.3, 4.6, -0.2, 1.0, 0xf0903a], [-0.4, 3.0, 1.0, 0.9, 0xd9382f], [1.6, 2.9, -0.6, 0.8, 0xe8802a]].forEach(function (b) {
    ball(g, b[3], b[4], tx + b[0], b[1], z + 0.2 + b[2], { seg: 7 });
  });
  [0.2, 1.1, 1.8].forEach(function (d, i) { ball(g, 0.25 + (i % 2) * 0.1, [0xe8802a, 0xd9382f, 0xf0b840][i], S.in(0.1) + S.side * 0.4, 0.06, z - 1.0 + d * 2 - 1.2, { seg: 5, sy: 0.25, sx: 1.4 }); });
}

// ---------- the bays ----------

function bay(g, side, z, k) {
  var S = sideCtx(side);
  townFront(g, side, z, 7.5);
  if (k === 0) winter(g, S, z);
  else if (k === 1) spring(g, S, z);
  else if (k === 2) summer(g, S, z);
  else autumn(g, S, z);
}

function center(g, z) { floorPanel(g, squarePicture(), z, 28); }

function arch(g, z, i) {
  // party lights across the square, flags, and a greeting banner at each side
  var n = 15;
  for (var f = 0; f < n; f++) {
    var t = f / (n - 1);
    var x = -5.4 + t * 10.8;
    var y = 6.4 - Math.sin(t * Math.PI) * 0.55;
    ball(g, 0.12, BULBS[(f + i) % 5], x, y, z, { seg: 4, bulb: true });
    if (f % 2) cone(g, 0.17, 0.36, BULBS[(f + i + 2) % 5], x, y - 0.28, z + 0.15, { seg: 3, rz: Math.PI, sz: 0.2, bulb: true });
  }
  cyl(g, 0.01, 0.01, 10.8, 0xfff0d0, 0, 6.35, z, { rz: Math.PI / 2, seg: 3 });
  [-1, 1].forEach(function (s, n2) {
    var word = WORDS[(i + n2 * 2) % 6];
    cyl(g, 0.012, 0.012, 0.6, 0x7a6a5a, s * 4.6, 6.0, z, { seg: 3 });
    sign(g, word, 0xfff6e0, [0xd9382f, 0x0e8c8a, 0xe08a1f, 0x7a4a2a][(i + n2) % 4], 2.1, 0.62, s * 4.6, 5.4, z, { border: 0xf2b134, tw: 384, th: 112 });
  });
}

function ground(g) {
  slab(g, 400, 400, 0xeff4e8, 0, -0.03, -190, { r: 1 });
}

// ---------- falling snow, petals and leaves: each only in its own season's bay ----------

function bandFall(o) {
  var world = currentWorld();
  var n = o.count;
  var seed = o.seed;
  var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  var mesh = new THREE.InstancedMesh(o.geo, o.material, n);
  mesh.frustumCulled = false;
  mesh.userData.noMerge = true;
  mesh.userData.swarmCount = n;
  var items = [];
  var tint = new THREE.Color();
  var span = 144;
  for (var i = 0; i < n; i++) {
    var side = i % 2 ? 1 : -1;
    items.push({
      x: side * (4.7 + rnd() * 3.5), y: o.y[0] + rnd() * (o.y[1] - o.y[0]),
      z: -4 * o.band + (rnd() - 0.5) * 4.6 - 16 * Math.floor(rnd() * 9), s: o.scale[0] + rnd() * (o.scale[1] - o.scale[0]), ph: rnd() * 6.283, vy: o.vy[0] + rnd() * (o.vy[1] - o.vy[0])
    });
    tint.set(o.colors[i % o.colors.length]);
    mesh.setColorAt(i, tint);
  }
  var dummy = new THREE.Object3D();
  var write = function (t, dt, move) {
    for (var j = 0; j < n; j++) {
      var it = items[j];
      it.z += move;
      it.y -= it.vy * dt;
      if (it.z > 8) it.z -= span;
      if (it.y < o.y[0]) it.y = o.y[1];
      dummy.position.set(it.x + Math.sin(t * 1.1 + it.ph) * 0.35, it.y, it.z + Math.cos(t * 0.9 + it.ph) * 0.3);
      dummy.rotation.set(it.ph + t * o.turn, it.ph, it.ph * 0.5 + t * o.turn * 0.7);
      dummy.scale.setScalar(it.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(j, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  write(0, 0, 0);
  animate(write);
  if (world && world.movers) world.movers.add(mesh);
  return keepSeparate(mesh);
}

function clockTower() {
  var c = new THREE.Group();
  box(c, 3.2, 12, 3.2, 0xf4c27a, 0, 6, 0);
  box(c, 3.6, 0.5, 3.6, 0xd9382f, 0, 12.2, 0);
  cone(c, 2.6, 4.5, 0xd9382f, 0, 14.7, 0, { seg: 4, ry: Math.PI / 4 });
  var clockMat = bulb(0xffffff);
  cyl(c, 1.1, 1.1, 0.12, 0xfff6e0, 0, 9.5, 1.65, { rx: Math.PI / 2, seg: 14, mat: clockMat });
  box(c, 0.1, 0.8, 0.06, 0x2a2d3a, 0, 9.75, 1.74);
  box(c, 0.6, 0.1, 0.06, 0x2a2d3a, 0.25, 9.5, 1.74);
  ball(c, 0.25, 0xffd23f, 0, 17.2, 0, { seg: 6 });
  c.scale.setScalar(1.6);
  return c;
}

function extras() {
  cloudBank(10, { seed: 12 });
  var tower = clockTower();
  tower.position.set(-20, 0, -110);
  animated(tower);
  mover(tower, { k: 0.1, near: -60, far: -160 });
  var flake = combine([{ geo: new THREE.SphereGeometry(0.08, 5, 4), color: 0xffffff }]);
  var petal = combine([{ geo: new THREE.CircleGeometry(0.09, 5), color: 0xffffff }]);
  var leaf = combine([{ geo: new THREE.CircleGeometry(0.12, 4), color: 0xffffff }]);
  bandFall({ geo: flake, material: new THREE.MeshBasicMaterial({ vertexColors: true }), count: 70, seed: 5, band: 0, y: [0.2, 7], vy: [0.6, 1.2], scale: [0.8, 1.7], colors: [0xffffff], turn: 0.5 });
  bandFall({ geo: petal, material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), count: 60, seed: 9, band: 1, y: [0.2, 6], vy: [0.4, 0.8], scale: [1.2, 2.0], colors: [0xffb8d0, 0xffffff, 0xff8fb8], turn: 2 });
  bandFall({ geo: leaf, material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), count: 60, seed: 13, band: 3, y: [0.2, 6], vy: [0.5, 1.0], scale: [1.6, 2.4], colors: [0xe8802a, 0xd9382f, 0xf0b840], turn: 3 });
  // balloons at the sides, every season
  var balloon = combine([
    { geo: new THREE.SphereGeometry(0.3, 9, 7), color: 0xffffff, matrix: new THREE.Matrix4().makeScale(1, 1.18, 1) },
    { geo: new THREE.CylinderGeometry(0.008, 0.008, 1.1, 3), color: 0xcccccc, matrix: new THREE.Matrix4().makeTranslation(0, -0.95, 0) }
  ]);
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: balloon, count: 7, seed: 5 + i * 11, colors: BULBS, area: { x: [side * 4.6, side * 6], y: [3.6, 6], z: [-140, 8] }, k: 1, wobble: 0.16, scale: [0.9, 1.25] });
  });
  swarm({ geo: birdGeo(), count: 6, seed: 21, colors: [0xffffff], area: { x: [-24, 24], y: [8, 13], z: [-140, 8] }, k: 0.3, vz: [-4, -2.5], face: true, flap: 0.5, scale: [1.2, 1.8] });
}

export var w_festival_of_seasons = { id: 'w_festival_of_seasons', indoor: false, bay: bay, center: center, arch: arch, ground: ground, extras: extras };
