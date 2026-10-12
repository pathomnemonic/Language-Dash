/**
 * w_paris_rooftop.js — Paris Rooftop (skin 'Rooftop Helipad Resort', title "Paris Rooftop"): a sun terrace above a
 * pastel Haussmann skyline.
 *
 * Every 16 units: a bistro corner under a red-and-cream umbrella, a baguette kiosk, a little square with an advertising
 * column and a street lamp, and an artist's corner with a tricolour flag. A stone balustrade with flower boxes lines the
 * terrace; cream apartment blocks with shutters, balconies and zinc mansard roofs (dormers, chimney pots) stand beyond
 * it, with a second, hazier row behind. Far off, an Eiffel Tower stands against the sky; hot-air balloons drift up the
 * street, pigeons and clouds go by. Everything low stays outside the lanes.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, quad, extrude, mat, bulb, canvasTex, stripeTex, sign,
  floorPanel, sideCtx, slab, WALL_X
} from '../mapkit.js';
import { animated, bob, mover, swarm, cloudBank } from '../mapfx.js';
import { birdGeo } from '../mapprops.js';

var CREAM = 0xf8e8c8;
var STONE = 0xf3e2c2;
var TERRA = 0xd9744a;
var RED = 0xd9382f;
var BLUE = 0x2f5fc0;
var WHITE = 0xffffff;
var TEAL = 0x8cc8c0;
var SAGE = 0x9cc8a8;
var IRON = 0x2f6a4c; // Parisian bottle green
var GOLD = 0xf2b134;
var WORDS = ['Bonjour', 'Merci', 'Salut', 'Bienvenue', 'Au revoir', "S'il vous plaît"];

// ---------- painted pictures ----------

function floorPicture() {
  // 12 across, 16 along, 48 px to the unit: cream and peach stone slabs with a teal border at each edge
  return canvasTex('paris_floor', 576, 768, function (ctx, w, h) {
    for (var j = 0; j < 16; j++) {
      for (var i = 0; i < 12; i++) {
        ctx.fillStyle = (i + j) % 2 ? '#f6e0c0' : '#f0cfa6';
        ctx.fillRect(i * 48, j * 48, 48, 48);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(i * 48, j * 48, 48, 3);
      }
    }
    ctx.strokeStyle = 'rgba(150,100,60,0.22)';
    ctx.lineWidth = 2;
    for (var k = 0; k <= 12; k++) { ctx.beginPath(); ctx.moveTo(k * 48, 0); ctx.lineTo(k * 48, h); ctx.stroke(); }
    for (var m = 0; m <= 16; m++) { ctx.beginPath(); ctx.moveTo(0, m * 48); ctx.lineTo(w, m * 48); ctx.stroke(); }
    ctx.fillStyle = '#5fc4b8';
    ctx.fillRect(0, 0, 14, h);
    ctx.fillRect(w - 14, 0, 14, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 0, 4, h);
    ctx.fillRect(w - 18, 0, 4, h);
  });
}

function facadeTex() {
  // four Haussmann buildings side by side, 4 units each, 10 units high, 64 px to the unit; wraps every 16 units
  return canvasTex('paris_facade', 1024, 640, function (ctx, w, h) {
    var stones = ['#f8e8c8', '#fbd9c2', '#fbeeb0', '#f7d2cc'];
    var shuttersC = ['#6fa8e0', '#7fc08a', '#f09aa8', '#6fa8e0'];
    var signs = [['BOULANGERIE', 'FLEURS'], ['CAFÉ', 'LIBRAIRIE'], ['FROMAGERIE', 'CHOCOLAT'], ['PARFUMERIE', 'CRÊPERIE']];
    var shopA = [['#d9382f', '#2e9e5b'], ['#2f6fc8', '#f2a62a'], ['#e0732a', '#c0407a'], ['#0e8c8a', '#d9382f']];
    for (var b = 0; b < 4; b++) {
      var x0 = b * 256;
      ctx.fillStyle = stones[b];
      ctx.fillRect(x0, 0, 256, h);
      // stone courses
      ctx.fillStyle = 'rgba(150,105,60,0.10)';
      for (var y = 0; y < h; y += 16) ctx.fillRect(x0, y, 256, 2);
      // corner quoins
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x0, 0, 7, h);
      ctx.fillRect(x0 + 249, 0, 7, h);
      // cornice with dentils
      ctx.fillStyle = 'rgba(190,140,80,0.35)';
      ctx.fillRect(x0, 10, 256, 40);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(x0, 8, 256, 6);
      ctx.fillStyle = 'rgba(150,100,50,0.5)';
      for (var d = 0; d < 32; d++) ctx.fillRect(x0 + d * 8 + 1, 50, 5, 9);
      // three floors of windows
      for (var f = 0; f < 3; f++) {
        var top = 64 + (2 - f) * 128;
        for (var i = 0; i < 3; i++) {
          var cx = x0 + 43 + i * 85;
          var wy = top + 14;
          if (f > 0) { // shutters
            ctx.fillStyle = shuttersC[b];
            ctx.fillRect(cx - 38, wy + 2, 16, 88);
            ctx.fillRect(cx + 22, wy + 2, 16, 88);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            for (var s = 0; s < 8; s++) { ctx.fillRect(cx - 38, wy + 8 + s * 10, 16, 2); ctx.fillRect(cx + 22, wy + 8 + s * 10, 16, 2); }
          }
          ctx.fillStyle = '#fffaf0';
          ctx.fillRect(cx - 24, wy - 4, 48, 100);
          var gl = ctx.createLinearGradient(0, wy, 0, wy + 92);
          gl.addColorStop(0, '#d6efff');
          gl.addColorStop(1, '#8fc6ec');
          ctx.fillStyle = gl;
          ctx.fillRect(cx - 20, wy, 40, 92);
          ctx.fillStyle = '#fffaf0';
          ctx.fillRect(cx - 1.5, wy, 3, 92);
          ctx.fillRect(cx - 20, wy + 34, 40, 3);
          // lace curtain on some windows
          if ((i + b + f) % 3 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(cx - 20, wy, 40, 22); }
          // pediment above the first floor windows
          if (f === 0) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(cx - 28, wy - 4); ctx.lineTo(cx, wy - 18); ctx.lineTo(cx + 28, wy - 4); ctx.closePath(); ctx.fill(); }
          // flower box
          if (f === 1) {
            ctx.fillStyle = '#c8663c';
            ctx.fillRect(cx - 24, wy + 88, 48, 11);
            var fc = ['#e8334a', '#ffffff', '#ff8fb0', '#f2b134'];
            for (var q = 0; q < 7; q++) { ctx.fillStyle = fc[(q + b + i) % 4]; ctx.beginPath(); ctx.arc(cx - 21 + q * 7, wy + 85, 4.5, 0, 6.3); ctx.fill(); }
            ctx.fillStyle = '#3fa24f'; ctx.fillRect(cx - 24, wy + 86, 48, 3);
          }
        }
        // the long iron balconies of the first and fourth floors
        if (f === 0 || f === 2) {
          var by = top + 78;
          ctx.fillStyle = '#e9d0a8';
          ctx.fillRect(x0 + 4, by + 38, 248, 9);
          ctx.fillStyle = '#2f6a4c';
          ctx.fillRect(x0 + 4, by + 2, 248, 4);
          for (var r = 0; r < 31; r++) ctx.fillRect(x0 + 6 + r * 8, by + 4, 2.5, 34);
          ctx.fillRect(x0 + 4, by + 35, 248, 3);
        }
      }
      // shopfronts (drawn for a 768 high picture, lifted onto this one)
      ctx.save();
      ctx.translate(0, -128);
      for (var sh = 0; sh < 2; sh++) {
        var sx = x0 + sh * 128;
        var col = shopA[b][sh];
        ctx.fillStyle = col;
        ctx.fillRect(sx + 6, 590, 116, 34);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 ' + (signs[b][sh].length > 8 ? 15 : 20) + 'px "Arial Rounded MT Bold", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(signs[b][sh], sx + 64, 608);
        // striped awning
        for (var st = 0; st < 8; st++) { ctx.fillStyle = st % 2 ? '#ffffff' : col; ctx.fillRect(sx + 6 + st * 14.5, 626, 14.5, 24); ctx.beginPath(); ctx.arc(sx + 13.25 + st * 14.5, 650, 7.25, 0, Math.PI); ctx.fill(); }
        // glass
        var sg = ctx.createLinearGradient(0, 660, 0, 740);
        sg.addColorStop(0, '#fff4d8');
        sg.addColorStop(1, '#ffd9a0');
        ctx.fillStyle = sg;
        ctx.fillRect(sx + 12, 660, 104, 82);
        ctx.fillStyle = col;
        ctx.fillRect(sx + 12, 700, 104, 5);
        // goods in the window
        for (var gdx = 0; gdx < 5; gdx++) { ctx.fillStyle = ['#e0a050', '#ff9aa8', '#f2d060', '#9ed08a', '#d9382f'][(gdx + b) % 5]; ctx.beginPath(); ctx.arc(sx + 26 + gdx * 19, 692, 7, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = col;
        ctx.fillRect(sx + 6, 742, 116, 26);
      }
      ctx.restore();
    }
  });
}

function postersTex() {
  // the advertising column: posters in bright inks, with greetings
  return canvasTex('paris_posters', 512, 160, function (ctx, w, h) {
    var bgs = ['#ffd23f', '#ff7a6a', '#7fd0e8', '#9ee09a', '#ffb3c6', '#fff0b8', '#f6a64a', '#a8d8ff'];
    var txt = ['Hello!', 'Bonjour!', 'Hola!', 'Ciao!', 'こんにちは', 'Hallo!', '你好', 'Salut!'];
    var pw = w / 8;
    for (var i = 0; i < 8; i++) {
      ctx.fillStyle = bgs[i];
      ctx.fillRect(i * pw + 3, 6, pw - 6, h - 12);
      ctx.fillStyle = '#1b2a41';
      ctx.font = '900 15px "Arial Rounded MT Bold", Arial, "Noto Sans JP", "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.translate(i * pw + pw / 2, h / 2);
      ctx.fillText(txt[i], 0, 0);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(i * pw + pw / 2, 34, 10, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#d9382f'; ctx.fillRect(i * pw + 12, h - 34, pw - 24, 8);
    }
  });
}

function flagTex() {
  return canvasTex('paris_flag', 96, 64, function (ctx) {
    ctx.fillStyle = '#2f5fc0'; ctx.fillRect(0, 0, 32, 64);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(32, 0, 32, 64);
    ctx.fillStyle = '#d9382f'; ctx.fillRect(64, 0, 32, 64);
  });
}

function paintingTex() {
  // the painter's canvas: the tower at sunset over blue roofs
  return canvasTex('paris_painting', 160, 128, function (ctx, w, h) {
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#ffb86a');
    sky.addColorStop(0.6, '#ffe2a0');
    sky.addColorStop(1, '#ffd0a8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffefb0'; ctx.beginPath(); ctx.arc(34, 38, 16, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#8a5a48';
    ctx.beginPath(); ctx.moveTo(100, 20); ctx.lineTo(108, 88); ctx.lineTo(92, 88); ctx.closePath(); ctx.fill();
    ctx.fillRect(94, 52, 12, 4);
    ctx.fillStyle = '#7fb8c8';
    for (var i = 0; i < 7; i++) ctx.fillRect(i * 24 - 4, 88 + (i % 3) * 6, 26, 40);
    ctx.fillStyle = '#e8786a';
    for (var j = 0; j < 7; j++) ctx.fillRect(j * 24 + 4, 82 + (j % 2) * 8, 10, 12);
  });
}

// ---------- materials ----------

function stripedMat(c1, c2, n) {
  var t = stripeTex(c1, c2, n);
  return t ? mat(0xffffff, { map: t, r: 0.85, side: THREE.DoubleSide, env: 0.2 }) : mat(c1, { side: THREE.DoubleSide });
}

var _flagMat = null;
function flagMat() {
  if (_flagMat) return _flagMat;
  var t = flagTex();
  _flagMat = t ? bulb(0xffffff, { map: t, side: THREE.DoubleSide }) : bulb(RED, { side: THREE.DoubleSide });
  return _flagMat;
}

// ---------- the buildings across the terrace ----------

/** A facade quad facing the track; the picture runs the same way round from both sides (see wallPanel). */
function facade(g, side, z, zoff, xout, h, tint) {
  var tex = facadeTex();
  var geo = new THREE.PlaneGeometry(4, h);
  var uv = geo.attributes.uv;
  for (var i = 0; i < uv.count; i++) {
    var local = (uv.getX(i) - 0.5) * 4;
    uv.setX(i, side < 0 ? (local - (z + zoff)) / 16 : ((z + zoff) + local) / 16);
  }
  var m = new THREE.Mesh(geo, tex ? mat(tint, { map: tex, r: 0.9, env: 0.15 }) : mat(CREAM));
  m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  m.position.set(side * (WALL_X + xout), h / 2, z);
  g.add(m);
  return side * (WALL_X + xout);
}

function mansard(g, side, xf, z, h, k, zinc, withDormers) {
  // the sloping zinc roof: leans back from the cornice, a flat cap on top, dormer windows and a chimney stack
  var rise = 2.6;
  var back = 1.5;
  var len = Math.hypot(rise, back);
  var a = Math.atan2(back, rise);
  box(g, 0.16, len, 4.04, zinc, xf + side * back / 2, h + rise / 2, z, { rz: -side * a, r: 0.7 });
  box(g, 1.8, 0.16, 4.04, zinc, xf + side * (back + 0.7), h + rise + 0.05, z, { r: 0.7 });
  box(g, 0.14, 0.2, 4.1, 0xd9d0c0, xf + side * 0.04, h + 0.05, z); // the lip under the roof
  if (withDormers) {
    [-1.0, 1.0].forEach(function (dz) {
      var dx = xf + side * 0.55;
      box(g, 0.6, 0.95, 0.8, STONE, dx, h + 0.95, z + dz);
      box(g, 0.05, 0.62, 0.5, 0xa9d6f0, dx - side * 0.31, h + 0.95, z + dz);
      box(g, 0.07, 0.7, 0.58, WHITE, dx - side * 0.3, h + 0.95, z + dz, { r: 0.5 });
      cone(g, 0.62, 0.55, zinc, dx, h + 1.7, z + dz, { seg: 4, ry: Math.PI / 4, sz: 0.75 });
    });
  }
  // chimney stack with three pots
  var cz = z + (k % 2 ? -1.3 : 1.2);
  var cx = xf + side * 1.7;
  box(g, 0.7, 1.9, 0.7, 0xe9c9a4, cx, h + rise + 1.0, cz);
  box(g, 0.82, 0.14, 0.82, 0xf4e8d0, cx, h + rise + 1.98, cz);
  [-0.2, 0.2].forEach(function (d, n) { cyl(g, 0.12, 0.14, 0.55 + n * 0.12, TERRA, cx, h + rise + 2.3, cz + d, { seg: 5 }); });
}

function skyline(g, side, z, k) {
  var zincs = [TEAL, SAGE, TEAL, 0xe3b0a0];
  var xf = facade(g, side, z, 0, 6.5, 10, WHITE);
  mansard(g, side, xf, z, 10, k, zincs[k], true);
  // a taller, hazier row behind, shifted so the buildings do not line up
  var xf2 = facade(g, side, z, 8, 15, 13, 0xfff0e4);
  mansard(g, side, xf2, z, 13, (k + 2) % 4, zincs[(k + 2) % 4], false);
}

// ---------- the terrace edge ----------

function balustrade(g, S, z) {
  var x = S.side * (WALL_X + 0.05);
  box(g, 0.34, 0.22, 4.0, STONE, x, 0.11, z);
  box(g, 0.28, 0.12, 4.0, 0xfffaf0, x, 1.0, z);
  for (var i = 0; i < 7; i++) box(g, 0.1, 0.72, 0.1, 0xfffaf0, x, 0.58, z - 1.65 + i * 0.55);
  [-2, 2].forEach(function (dz) {
    box(g, 0.34, 1.05, 0.34, STONE, x, 0.55, z + dz);
    ball(g, 0.17, 0xfffaf0, x, 1.18, z + dz, { seg: 6 });
  });
  // a long window box of geraniums along the top
  box(g, 0.3, 0.2, 3.5, TERRA, x, 1.17, z);
  var cols = [0xe8334a, 0xffffff, 0xff8fb0, 0xe8334a];
  box(g, 0.26, 0.18, 3.4, 0x3fa24f, x, 1.36, z);
  for (var f = 0; f < 9; f++) box(g, 0.14, 0.12, 0.14, cols[f % 4], x + (f % 2 ? 0.05 : -0.05), 1.5, z - 1.5 + f * 0.375, { ry: f });
}

// ---------- props ----------

function chair(g, x, z, ry) {
  var o = { ry: ry };
  var c = Math.cos(ry);
  var s = Math.sin(ry);
  box(g, 0.36, 0.05, 0.36, 0xf2b134, x, 0.46, z, o);
  box(g, 0.36, 0.4, 0.05, 0xf2b134, x + s * -0.17, 0.68, z + c * -0.17, o);
  box(g, 0.32, 0.44, 0.04, IRON, x + s * 0.14, 0.22, z + c * 0.14, o);
  box(g, 0.32, 0.44, 0.04, IRON, x - s * 0.14, 0.22, z - c * 0.14, o);
}

function bistroTable(g, x, z, S, tray) {
  cyl(g, 0.34, 0.34, 0.05, 0xffffff, x, 0.78, z, { seg: 10 });
  cyl(g, 0.04, 0.06, 0.74, IRON, x, 0.39, z, { seg: 5 });
  cyl(g, 0.2, 0.22, 0.04, IRON, x, 0.02, z, { seg: 8 });
  if (tray) { cyl(g, 0.1, 0.07, 0.12, 0xfff6e0, x - 0.1, 0.87, z + 0.06, { seg: 6 }); ball(g, 0.07, 0xd9a05a, x + 0.12, 0.85, z - 0.05, { seg: 5, sy: 0.6 }); }
  chair(g, x, z - 0.52, 0);
  chair(g, x, z + 0.52, Math.PI);
}

function umbrella(g, x, z, c1, c2, r) {
  cyl(g, 0.04, 0.05, 2.6, 0xf4efe4, x, 1.3, z, { seg: 5 });
  cone(g, r, 0.6, WHITE, x, 2.8, z, { seg: 10, mat: stripedMat(c1, c2, 6) });
  ball(g, 0.07, GOLD, x, 3.14, z, { seg: 5 });
  // scalloped valance
  ring(g, r * 0.93, 0.045, c1, x, 2.5, z, { rx: Math.PI / 2, seg: 10, tube: 3 });
}

function cafe(g, S, z) {
  var x = S.in(0.6);
  umbrella(g, x, z, RED, CREAM, 1.5);
  bistroTable(g, x, z - 1.0, S, true);
  bistroTable(g, x, z + 1.05, S, false);
  // a little menu board
  box(g, 0.05, 0.9, 0.6, 0x2f5a4a, S.in(0.2), 0.55, z - 0.02, { rz: S.side * 0.1 });
  sign(g, 'Café · Thé', 0x2f5a4a, 0xffffff, 0.56, 0.2, S.in(0.2) - S.side * 0.03, 0.82, z, { ry: S.turn, tw: 256, th: 96 });
}

function bakery(g, S, z) {
  // the baguette kiosk
  var x = S.in(0.5);
  box(g, 0.8, 1.0, 2.5, 0xffd8a0, x, 0.5, z);
  box(g, 0.9, 0.08, 2.6, 0xf2b134, x, 1.04, z);
  [-1.2, 1.2].forEach(function (dz) { cyl(g, 0.05, 0.05, 2.5, IRON, S.in(0.12), 1.25, z + dz, { seg: 5 }); });
  box(g, 0.1, 1.5, 2.5, 0xffe9c8, S.side * (WALL_X - 0.15), 1.75, z);
  // striped awning over the counter
  for (var s = 0; s < 6; s++) {
    box(g, 1.5, 0.06, 0.45, s % 2 ? CREAM : RED, S.in(0.45), 2.5, z - 1.125 + s * 0.45, { rz: S.side * 0.14 });
  }
  sign(g, 'BOULANGERIE', 0xf2b134, 0x1b2a41, 2.3, 0.5, S.in(0.0) + S.side * 0.02, 3.0, z, { ry: S.turn, border: 0x8a4a22 });
  // baguettes in a basket, a plate of croissants, and the greeting
  cyl(g, 0.3, 0.24, 0.4, 0xc58b4a, x + S.side * 0.05, 1.28, z - 0.6, { seg: 8 });
  for (var b = 0; b < 6; b++) {
    var a = b * 1.05;
    cyl(g, 0.045, 0.045, 0.85, 0xdc9a52, x + S.side * 0.05 + Math.cos(a) * 0.1, 1.72, z - 0.6 + Math.sin(a) * 0.1, { seg: 5, rx: Math.sin(a) * 0.16, rz: Math.cos(a) * 0.16 });
  }
  cyl(g, 0.3, 0.3, 0.03, WHITE, x, 1.1, z + 0.6, { seg: 10 });
  for (var c = 0; c < 3; c++) ring(g, 0.1, 0.045, 0xe8a850, x - 0.1 + c * 0.1, 1.17, z + 0.45 + c * 0.14, { rx: Math.PI / 2, arc: 4.2, seg: 6, tube: 4, rz: c });
  sign(g, 'Bonjour !', 0x2f5a4a, 0xffffff, 0.72, 0.28, S.in(0.08), 0.5, z + 0.6, { ry: S.turn });
  // the pigeon that always turns up
  ball(g, 0.12, 0xf0ece6, S.in(0.5), 1.2, z + 1.0, { seg: 5, sz: 1.3 });
  ball(g, 0.07, 0xf0ece6, S.in(0.5), 1.32, z + 1.12, { seg: 4 });
}

function morris(g, x, z) {
  // an advertising column with a green cap, covered in posters
  var tex = postersTex();
  var body = cyl(g, 0.62, 0.62, 2.3, WHITE, x, 1.15, z, { seg: 16, map: tex, r: 0.8 });
  if (!tex) body.material = mat(0xffd23f);
  cyl(g, 0.7, 0.7, 0.14, IRON, x, 0.07, z, { seg: 16 });
  cyl(g, 0.7, 0.66, 0.16, IRON, x, 2.35, z, { seg: 16 });
  cone(g, 0.66, 0.5, IRON, x, 2.68, z, { seg: 16 });
  ball(g, 0.1, GOLD, x, 3.0, z, { seg: 6 });
}

function lamp(g, x, z) {
  // a bottle-green Parisian street lamp with a glowing globe
  cyl(g, 0.12, 0.17, 0.45, IRON, x, 0.22, z, { seg: 8 });
  cyl(g, 0.06, 0.09, 3.2, IRON, x, 1.9, z, { seg: 6 });
  ring(g, 0.14, 0.03, IRON, x, 2.6, z, { rx: Math.PI / 2, seg: 8, tube: 3 });
  cyl(g, 0.18, 0.18, 0.1, IRON, x, 3.5, z, { seg: 8 });
  ball(g, 0.3, 0xfff2b8, x, 3.8, z, { seg: 8, bulb: true });
  cone(g, 0.28, 0.2, IRON, x, 4.15, z, { seg: 8 });
}

function topiary(g, x, z) {
  cyl(g, 0.3, 0.24, 0.4, TERRA, x, 0.2, z, { seg: 8 });
  cyl(g, 0.03, 0.03, 0.5, 0x7a5a3a, x, 0.65, z, { seg: 4 });
  ball(g, 0.4, 0x3fb25a, x, 1.2, z, { seg: 6 });
  ball(g, 0.26, 0x4fc86a, x, 1.7, z, { seg: 5 });
}

function square(g, S, z) {
  morris(g, S.in(0.62), z - 0.9);
  lamp(g, S.in(0.5), z + 1.3);
  topiary(g, S.in(0.6), z + 0.2);
  // a bench against the balustrade
  box(g, 0.5, 0.07, 1.3, 0xc9783a, S.in(0.5), 0.5, z + 0.05 - 0.0, { r: 0.7 });
}

function studio(g, S, z) {
  // an easel with a painting, a flag on a pole, a small table with a vase, and a passport-stamp board
  var x = S.in(0.55);
  box(g, 0.05, 1.9, 0.05, 0xb98a55, x, 0.95, z - 1.05);
  box(g, 0.05, 1.9, 0.05, 0xb98a55, x, 0.95, z - 0.15);
  box(g, 0.05, 1.9, 0.05, 0xb98a55, x + S.side * 0.3, 0.95, z - 0.6, { rz: -S.side * 0.2 });
  var tex = paintingTex();
  box(g, 0.05, 0.9, 1.1, WHITE, x - S.side * 0.02, 1.25, z - 0.6, { r: 0.6 });
  quad(g, 1.0, 0.8, 0xffffff, x - S.side * 0.06, 1.27, z - 0.6, { ry: S.turn, mat: tex ? bulb(0xffffff, { map: tex }) : bulb(0xffb86a) });
  // flagpole with the tricolour
  var fx = S.in(0.4);
  cyl(g, 0.04, 0.05, 4.4, 0xf4efe4, fx, 2.2, z + 1.2, { seg: 5 });
  ball(g, 0.08, GOLD, fx, 4.45, z + 1.2, { seg: 5 });
  quad(g, 1.0, 0.65, 0xffffff, fx - S.side * 0.02, 3.9, z + 1.7, { ry: 0, mat: flagMat() });
  // a stamp board: "Bienvenue à Paris"
  box(g, 0.08, 0.7, 0.9, 0xe8d0a8, S.in(0.1), 0.6, z + 0.2, { r: 0.8 });
  sign(g, 'PARIS', 0xd9382f, 0xffffff, 0.7, 0.28, S.in(0.1) - S.side * 0.05, 0.78, z + 0.2, { ry: S.turn });
  ring(g, 0.16, 0.03, 0xd9382f, S.in(0.1) - S.side * 0.05, 0.42, z + 0.2, { ry: S.turn, seg: 12, tube: 3 });
  // table with a vase of flowers
  cyl(g, 0.3, 0.3, 0.05, WHITE, x, 0.7, z + 1.8, { seg: 10 });
  cyl(g, 0.04, 0.06, 0.68, IRON, x, 0.35, z + 1.8, { seg: 5 });
  cyl(g, 0.07, 0.05, 0.2, 0x7fb8e0, x, 0.83, z + 1.8, { seg: 6 });
  [0xe8334a, 0xffd23f, 0xff8fb0].forEach(function (c, i) { ball(g, 0.07, c, x + (i - 1) * 0.07, 1.0 + (i % 2) * 0.04, z + 1.8, { seg: 5 }); });
}

// ---------- the bays ----------

function bay(g, side, z, k) {
  var S = sideCtx(side);
  balustrade(g, S, z);
  skyline(g, side, z, k);
  if (k === 0) cafe(g, S, z);
  else if (k === 1) bakery(g, S, z);
  else if (k === 2) square(g, S, z);
  else studio(g, S, z);
}

function center(g, z) { floorPanel(g, floorPicture(), z, 12); }

function arch(g, z, i) {
  // tricolour bunting across the terrace, warm string lights, and two greeting banners at the sides
  var cols = [BLUE, WHITE, RED];
  var n = 13;
  for (var f = 0; f < n; f++) {
    var t = f / (n - 1);
    var x = -5.2 + t * 10.4;
    var dip = Math.sin(t * Math.PI) * 0.5;
    cone(g, 0.2, 0.42, cols[f % 3], x, 6.4 - dip - 0.2, z, { seg: 3, rz: Math.PI, sz: 0.2, bulb: true });
  }
  cyl(g, 0.01, 0.01, 10.4, 0xfff0d0, 0, 6.42, z, { rz: Math.PI / 2, seg: 3 });
  // string lights lower down at the edges only (the middle stays open for the gates)
  for (var l = 0; l < 6; l++) {
    var lt = l / 5;
    [-1, 1].forEach(function (s) { box(g, 0.14, 0.14, 0.14, [0xffe27a, 0xfff6c0][l % 2], s * (3.4 + lt * 1.8), 5.7 - Math.sin(lt * Math.PI) * 0.3, z + 0.3, { bulb: true }); });
  }
  [-1, 1].forEach(function (s, n) {
    var word = WORDS[(i + n * 3) % 6];
    cyl(g, 0.012, 0.012, 0.6, 0x7a6a5a, s * 4.6, 6.1, z, { seg: 3 });
    sign(g, word, 0xfff6e0, BLUE, 2.1, 0.62, s * 4.6, 5.5, z, { border: RED, tw: 384, th: 112 });
  });
}

function ground(g) {
  // the terrace carries on under the buildings: pale stone
  slab(g, 400, 400, 0xf3dcc0, 0, -0.03, -190, { r: 1 });
}

// ---------- the things that move ----------

function eiffel() {
  function hw(y) {
    if (y <= 40) return 1.0 + 6.2 * Math.pow(1 - y / 40, 2.2);
    return Math.max(0, 1.0 - (y - 40) * 0.045);
  }
  var ys = [0, 3, 6, 10, 14, 18, 22, 27, 32, 37, 40, 46, 52, 58, 63];
  var s = new THREE.Shape();
  s.moveTo(-hw(0), 0);
  s.lineTo(hw(0), 0);
  ys.forEach(function (y) { s.lineTo(hw(y), y); });
  s.lineTo(0, 66);
  for (var i = ys.length - 1; i >= 0; i--) s.lineTo(-hw(ys[i]), ys[i]);
  s.closePath();
  var arch1 = new THREE.Path();
  arch1.moveTo(-4.2, 0);
  arch1.lineTo(-4.2, 4.8);
  arch1.absarc(0, 4.8, 4.2, Math.PI, 0, true);
  arch1.lineTo(4.2, 0);
  arch1.closePath();
  s.holes.push(arch1);
  [[19, 6.2, 1.2], [32, 4.5, 0.45]].forEach(function (d) {
    var h = new THREE.Path();
    h.moveTo(0, d[0] - d[1]); h.lineTo(d[2], d[0]); h.lineTo(0, d[0] + d[1]); h.lineTo(-d[2], d[0]); h.closePath();
    s.holes.push(h);
  });
  var t = new THREE.Group();
  var body = 0x9a6f58;
  extrude(t, s, 1.0, body, 0, 0, 0, { r: 0.8 });
  extrude(t, s, 1.0, body, 0, 0, 0, { ry: Math.PI / 2, r: 0.8 });
  [[11, 3.0], [26, 1.9], [40, 1.25]].forEach(function (p) {
    box(t, p[1] * 2 + 1.2, 0.6, p[1] * 2 + 1.2, 0xb88a6a, 0, p[0], 0, { r: 0.8 });
  });
  cyl(t, 0.07, 0.12, 6, 0xb88a6a, 0, 64.5, 0, { seg: 4 });
  t.scale.setScalar(1.15);
  return t;
}

function hotAirBalloon(c1, c2, n) {
  var b = new THREE.Group();
  ball(b, 2.0, c1, 0, 3.7, 0, { seg: 12, sy: 1.2, mat: stripedMat(c1, c2, n) });
  cyl(b, 0.45, 0.9, 0.6, c1, 0, 1.55, 0, { seg: 8 });
  [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].forEach(function (p) { cyl(b, 0.012, 0.012, 1.1, 0x7a5a3a, p[0], 0.95, p[1], { seg: 3 }); });
  box(b, 0.9, 0.6, 0.9, 0xc58b4a, 0, 0.1, 0);
  box(b, 0.96, 0.06, 0.96, 0x8a5a2a, 0, 0.42, 0);
  b.scale.setScalar(1.15);
  return b;
}

function extras() {
  cloudBank(12, { seed: 9 });
  var eif = eiffel();
  eif.position.set(-17, 0, -95);
  animated(eif);
  mover(eif, { k: 0.1, near: -55, far: -150 });
  var spec = [[RED, WHITE, 6, -9.5, 13, -60], [BLUE, GOLD, 5, 10, 16, -95], [0x2e9e5b, 0xffb3c6, 7, -11, 18, -130]];
  spec.forEach(function (p, i) {
    var bl = hotAirBalloon(p[0], p[1], p[2]);
    bl.position.set(p[3], p[4], p[5]);
    animated(bl);
    bob(bl, 0.35, 0.6 + i * 0.13, i * 2);
    mover(bl, { k: 0.75 + i * 0.05 });
  });
  [-1, 1].forEach(function (s, i) {
    swarm({ geo: birdGeo(), count: 6, seed: 12 + i * 7, colors: [0xffffff, 0xf2e8dc, 0xe8d8c8], area: { x: [s * 4.8, s * 11], y: [3.4, 8], z: [-140, 8] }, k: 0.3, vz: [-4, -2.5], face: true, flap: 0.5, scale: [1.2, 1.7] });
  });
}

export var w_paris_rooftop = { id: 'w_paris_rooftop', indoor: false, bay: bay, center: center, arch: arch, ground: ground, extras: extras };
