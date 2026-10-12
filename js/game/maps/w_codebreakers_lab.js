/**
 * w_codebreakers_lab.js — Codebreakers Lab (skin 'Research Lab'; the key is kept from the original game).
 *
 * The workshop where the Lexicon Guild decodes the scattered scripts: sunny ochre walls, teal tile, brass and parchment.
 * Every 16 units, along each wall:
 *   bay 0  a chalkboard of glyphs, and a bench of bubbling inkwells
 *   bay 1  a scroll rack, with a big brass cipher wheel turning above it
 *   bay 2  a second chalkboard, a desk with a magnifier and piles of scrolls
 *   bay 3  a corkboard of clues joined by red string, a tall glass inkwell and a Rosetta stone
 * The floor is carved flagstones, each with a glyph. Hanging across the lab: scroll banners and lamps full of coloured ink.
 * Ink bubbles rise beside the walls and scrolls drift by.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, combine, xform, mat, bulb, canvasTex,
  floorPanel, ceilingPanel, wallPanel, sideCtx, sign
} from '../mapkit.js';
import { animated, features, spin, swarm, shimmer } from '../mapfx.js';

var H = 6.0;

var TEAL = 0x2f9e8c;
var TEAL_DARK = 0x1d7468;
var TERRA = 0xd9663a;
var PARCH = 0xfff0cc;
var WOOD = 0xb9733a;
var WOOD_DARK = 0x8a5226;
var WOOD_LIGHT = 0xd6975a;
var BRASS = 0xe0aa3c;
var INK_COLORS = [0x2fb6a0, 0xe0508a, 0xf0b52e, 0x3f86d6, 0x6bc04f];
var FONT = '"Fraunces", "Noto Sans", "DejaVu Sans", "Noto Sans JP", "WenQuanYi Zen Hei", sans-serif';
var GLYPHS = ['A', 'あ', 'Я', 'ع', '한', 'Ω', 'ह', '字', 'ß', 'ж', 'א', 'ñ', 'α', 'カ', 'ก', 'Å'];

function rng(seed) {
  var s = seed;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ---------- painted pictures ----------

function chalkBoard(ctx, x, y, w, h, seed, title) {
  var r = rng(seed);
  ctx.fillStyle = '#a8602c';
  ctx.fillRect(x - 12, y - 12, w + 24, h + 24);
  ctx.fillStyle = '#d6975a';
  ctx.fillRect(x - 12, y - 12, w + 24, 5);
  var g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#3aa58f');
  g.addColorStop(1, '#2a8a78');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // chalk smudges
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (var i = 0; i < 6; i++) ctx.fillRect(x + r() * w * 0.8, y + r() * h * 0.8, 60 + r() * 80, 20 + r() * 30);
  var chalk = ['#fff6dc', '#ffe27a', '#ffb3a0', '#bff0e4'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6dc';
  ctx.font = '800 26px ' + FONT;
  ctx.fillText(title, x + w / 2, y + 28);
  ctx.strokeStyle = 'rgba(255,246,220,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 20, y + 52); ctx.lineTo(x + w - 20, y + 52); ctx.stroke();
  // a grid of big glyphs
  var cols = 4;
  var rows = 3;
  var cw = (w - 40) / cols;
  var rh = (h - 90) / rows;
  for (var j = 0; j < rows; j++) {
    for (var k = 0; k < cols; k++) {
      var gl = GLYPHS[Math.floor(r() * GLYPHS.length)];
      ctx.fillStyle = chalk[Math.floor(r() * chalk.length)];
      ctx.font = '700 ' + Math.round(rh * 0.7) + 'px ' + FONT;
      ctx.fillText(gl, x + 20 + cw * (k + 0.5), y + 66 + rh * (j + 0.5));
    }
  }
  // an arrow of decoding
  ctx.strokeStyle = '#ffe27a';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h - 20); ctx.lineTo(x + w * 0.7, y + h - 20); ctx.lineTo(x + w * 0.7 - 12, y + h - 30); ctx.moveTo(x + w * 0.7, y + h - 20); ctx.lineTo(x + w * 0.7 - 12, y + h - 10); ctx.stroke();
}

function wallPicture() {
  var P = 96;
  return canvasTex('cb_wall', 1536, 576, function (ctx, w, h) {
    var Y = function (wy) { return h - wy * P; };
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffe9b0');
    g.addColorStop(1, '#f6d184');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // stone block lines
    ctx.strokeStyle = 'rgba(190,130,50,0.22)';
    ctx.lineWidth = 2;
    for (var by = 0; by < 14; by++) {
      var yy = Y(1.1) - by * 36;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
      for (var bx2 = (by % 2) * 48; bx2 < w; bx2 += 96) { ctx.beginPath(); ctx.moveTo(bx2, yy); ctx.lineTo(bx2, yy - 36); ctx.stroke(); }
    }
    for (var b = 0; b < 4; b++) {
      var bx = b * 384;
      var cx = bx + 192;
      if (b === 0) chalkBoard(ctx, bx + 48, Y(4.7), 288, 270, 5, 'A → あ → Я');
      else if (b === 2) chalkBoard(ctx, bx + 48, Y(4.7), 288, 270, 17, 'ع → 한 → Ω');
      else if (b === 1) {
        // a rack of pigeonholes for scrolls, low on the wall
        ctx.fillStyle = '#8a5226';
        ctx.fillRect(bx + 30, Y(3.3), 324, Y(1.1) - Y(3.3));
        for (var rr = 0; rr < 3; rr++) {
          for (var cc = 0; cc < 4; cc++) {
            var hx = bx + 38 + cc * 78;
            var hy = Y(3.25) + rr * 66;
            ctx.fillStyle = '#5b3418';
            ctx.fillRect(hx, hy, 70, 58);
            ctx.fillStyle = ['#fff0cc', '#f5e0a8', '#ffe6b8'][(rr + cc) % 3];
            ctx.beginPath(); ctx.ellipse(hx + 35, hy + 40, 28, 12, 0, 0, 6.3); ctx.fill();
            ctx.fillRect(hx + 7, hy + 28, 56, 12);
            ctx.fillStyle = ['#d9663a', '#2f9e8c', '#e0aa3c'][(rr * 2 + cc) % 3];
            ctx.fillRect(hx + 30, hy + 28, 8, 24);
          }
        }
        ctx.fillStyle = '#d6975a';
        ctx.fillRect(bx + 24, Y(3.3) - 8, 336, 10);
        // a painted sun-dial of letters above
        ctx.fillStyle = 'rgba(217,102,58,0.2)';
        ctx.beginPath(); ctx.arc(cx, Y(4.45), 70, 0, 6.3); ctx.fill();
      } else {
        // the corkboard of clues, joined by red string
        ctx.fillStyle = '#8a5226';
        ctx.fillRect(bx + 36, Y(4.8), 312, 290);
        ctx.fillStyle = '#d8a468';
        ctx.fillRect(bx + 46, Y(4.8) + 10, 292, 270);
        var r2 = rng(33);
        var pins = [];
        for (var n = 0; n < 7; n++) {
          var px = bx + 70 + (n % 3) * 100 + r2() * 20;
          var py = Y(4.8) + 36 + Math.floor(n / 3) * 84 + r2() * 14;
          pins.push([px + 28, py + 6]);
        }
        ctx.strokeStyle = '#d9432c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        [0, 4, 1, 5, 2, 6, 3, 0].forEach(function (id, i2) { if (i2 === 0) ctx.moveTo(pins[id % 7][0], pins[id % 7][1]); else ctx.lineTo(pins[id % 7][0], pins[id % 7][1]); });
        ctx.stroke();
        for (var n2 = 0; n2 < 7; n2++) {
          ctx.save();
          ctx.translate(pins[n2][0], pins[n2][1] + 20);
          ctx.rotate((r2() - 0.5) * 0.3);
          ctx.fillStyle = ['#fff6dc', '#ffe27a', '#bff0e4', '#ffb3a0'][n2 % 4];
          ctx.fillRect(-28, -26, 56, 60);
          ctx.fillStyle = '#1b2a41';
          ctx.font = '800 30px ' + FONT;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(GLYPHS[(n2 * 3) % GLYPHS.length], 0, 4);
          ctx.fillStyle = '#d9432c';
          ctx.beginPath(); ctx.arc(0, -24, 5, 0, 6.3); ctx.fill();
          ctx.restore();
        }
      }
      // pilaster
      ctx.fillStyle = '#fff0cc';
      ctx.fillRect(bx - 12, Y(5.45), 24, Y(1.1) - Y(5.45));
      ctx.fillStyle = '#2f9e8c';
      ctx.fillRect(bx - 17, Y(5.5), 34, 12);
      ctx.fillRect(bx - 17, Y(1.15), 34, 12);
    }
    // teal tiles on the lower wall
    ctx.fillStyle = '#2f9e8c';
    ctx.fillRect(0, Y(1.1), w, 1.1 * P);
    ctx.fillStyle = '#42b6a2';
    for (var ty = 0; ty < 4; ty++) for (var tx = 0; tx < 64; tx++) ctx.fillRect(tx * 24 + 2, Y(1.1) + 4 + ty * 26, 20, 4);
    ctx.fillStyle = '#1d7468';
    for (var ty2 = 0; ty2 <= 4; ty2++) ctx.fillRect(0, Y(1.1) + ty2 * 26 - 1, w, 2);
    for (var tx2 = 0; tx2 < 64; tx2++) ctx.fillRect(tx2 * 24 - 1, Y(1.1), 2, 1.1 * P);
    ctx.fillStyle = '#d9663a';
    ctx.fillRect(0, Y(1.1) - 8, w, 10);
    ctx.fillStyle = '#fff0cc';
    ctx.fillRect(0, Y(1.1) - 12, w, 4);
    // glyph frieze
    ctx.fillStyle = '#d9663a';
    ctx.fillRect(0, 0, w, Y(5.5));
    ctx.fillStyle = '#e0aa3c';
    ctx.fillRect(0, Y(5.5) - 5, w, 5);
    ctx.fillStyle = '#fff0cc';
    ctx.font = '800 26px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var q = 0; q < 16; q++) ctx.fillText(GLYPHS[q], q * 96 + 48, Y(5.5) / 2);
  });
}

function floorPicture() {
  // 12 across, 16 along at 48 px to the unit: two-unit flagstones, each carved with a glyph
  return canvasTex('cb_floor', 576, 768, function (ctx, w, h) {
    var r = rng(9);
    for (var j = 0; j < 8; j++) {
      for (var i = 0; i < 6; i++) {
        var even = (i + j) % 2 === 0;
        ctx.fillStyle = even ? '#f6dfaa' : '#eccb8a';
        ctx.fillRect(i * 96, j * 96, 96, 96);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(i * 96 + 3, j * 96 + 3, 90, 4);
        ctx.fillStyle = 'rgba(170,110,40,0.2)';
        ctx.fillRect(i * 96 + 3, j * 96 + 89, 90, 4);
        var gl = GLYPHS[Math.floor(r() * GLYPHS.length)];
        ctx.fillStyle = even ? 'rgba(201,102,58,0.38)' : 'rgba(47,158,140,0.42)';
        ctx.font = '800 54px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gl, i * 96 + 48, j * 96 + 50);
      }
    }
    ctx.strokeStyle = 'rgba(150,95,35,0.5)';
    ctx.lineWidth = 3;
    for (var k = 0; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(k * 96, 0); ctx.lineTo(k * 96, h); ctx.stroke(); }
    for (var m = 0; m <= 8; m++) { ctx.beginPath(); ctx.moveTo(0, m * 96); ctx.lineTo(w, m * 96); ctx.stroke(); }
    ctx.fillStyle = '#2f9e8c';
    ctx.fillRect(0, 0, 10, h);
    ctx.fillRect(w - 10, 0, 10, h);
  });
}

function ceilingPicture() {
  // 11.6 across x 16 along at 40 px to the unit: parchment panels between wooden slats, with a gold star in each
  return canvasTex('cb_ceiling', 464, 640, function (ctx, w, h) {
    ctx.fillStyle = '#fff0cc';
    ctx.fillRect(0, 0, w, h);
    var cw = w / 4;
    var ch = 160;
    for (var j = 0; j < 4; j++) {
      for (var i = 0; i < 4; i++) {
        var gr = ctx.createRadialGradient(i * cw + cw / 2, j * ch + ch / 2, 3, i * cw + cw / 2, j * ch + ch / 2, 80);
        gr.addColorStop(0, '#fffbe8');
        gr.addColorStop(1, '#f9dfa0');
        ctx.fillStyle = gr;
        ctx.fillRect(i * cw + 5, j * ch + 5, cw - 10, ch - 10);
        ctx.fillStyle = '#e0aa3c';
        var cx = i * cw + cw / 2;
        var cy = j * ch + ch / 2;
        ctx.beginPath();
        for (var s = 0; s < 8; s++) { var a = (s * Math.PI) / 4; var rad = s % 2 ? 6 : 13; ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.fillStyle = '#b9733a';
    for (var bi = 0; bi <= 4; bi++) ctx.fillRect(bi * cw - 4, 0, 8, h);
    for (var bj = 0; bj < 4; bj++) ctx.fillRect(0, bj * ch - 4, w, 8);
  });
}

function wheelTex() {
  // the face of the cipher wheel: a ring of glyphs on teal, and an outer ring of letters on parchment
  return canvasTex('cb_wheel', 256, 256, function (ctx, w, h) {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = '#fff0cc';
    ctx.beginPath(); ctx.arc(0, 0, 126, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#2f9e8c';
    ctx.beginPath(); ctx.arc(0, 0, 84, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#e0aa3c';
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, 6.3); ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i = 0; i < 26; i++) {
      var a = (i / 26) * Math.PI * 2;
      ctx.save(); ctx.rotate(a); ctx.translate(0, -105);
      ctx.fillStyle = '#7a4622'; ctx.font = '800 17px ' + FONT;
      ctx.fillText(letters[i], 0, 0);
      ctx.restore();
    }
    for (var j = 0; j < 12; j++) {
      var a2 = (j / 12) * Math.PI * 2;
      ctx.save(); ctx.rotate(a2); ctx.translate(0, -58);
      ctx.fillStyle = '#fff6dc'; ctx.font = '800 26px ' + FONT;
      ctx.fillText(GLYPHS[j], 0, 0);
      ctx.restore();
    }
  });
}

function rosettaTex() {
  return canvasTex('cb_rosetta', 128, 160, function (ctx, w, h) {
    ctx.fillStyle = '#b8ad98';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d6cbb2';
    ctx.fillRect(6, 6, w - 12, h - 12);
    var bands = ['#8a6a3a', '#2f7f86', '#c9573a'];
    var glyphs = [['∴', '∵', '⋈', '∴', '∵', '⋈'], ['α', 'β', 'γ', 'δ', 'ε', 'ζ'], ['A', 'B', 'C', 'D', 'E', 'F']];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var b = 0; b < 3; b++) {
      var y0 = 12 + b * 46;
      ctx.fillStyle = bands[b];
      ctx.font = '800 20px ' + FONT;
      for (var i = 0; i < 6; i++) ctx.fillText(glyphs[b][i], 14 + i * 20, y0 + 10);
      ctx.fillRect(10, y0 + 24, 108, 3);
      ctx.fillRect(10, y0 + 32, 90, 3);
    }
  });
}

function haloTex() {
  return canvasTex('cb_halo', 64, 64, function (ctx, w, h) {
    var g = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// ---------- materials and small things ----------

var _inkMats = {};
function inkMat(color) {
  return _inkMats[color] || (_inkMats[color] = mat(color, { e: color, ei: 0.45, r: 0.3 }));
}
var _glass = null;
function glassMat() { return _glass || (_glass = mat(0xe6fbf5, { op: 0.28, side: THREE.DoubleSide, r: 0.1, env: 0.9 })); }
var _glow = {};
function glow(g, color, size, x, y, z, ry) {
  var tex = haloTex();
  var m = _glow[color] || (_glow[color] = tex ? bulb(color, { map: tex, add: true, side: THREE.DoubleSide }) : bulb(color, { add: true, op: 0.3, side: THREE.DoubleSide }));
  var q = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
  q.position.set(x, y, z);
  q.rotation.y = ry || 0;
  g.add(q);
}

function inkwell(g, x, y, z, color, s) {
  // a round glass flask of coloured ink with a cork and a quill
  var k = s || 1;
  ball(g, 0.2 * k, 0xe6fbf5, x, y + 0.2 * k, z, { seg: 10, mat: glassMat() });
  ball(g, 0.165 * k, color, x, y + 0.17 * k, z, { seg: 9, sy: 0.9, mat: inkMat(color) });
  cyl(g, 0.06 * k, 0.07 * k, 0.12 * k, 0xe6fbf5, x, y + 0.43 * k, z, { seg: 8, mat: glassMat() });
  cyl(g, 0.055 * k, 0.045 * k, 0.07 * k, 0xc98a52, x, y + 0.5 * k, z, { seg: 6 });
}

function quill(g, x, y, z, color, lean, k) {
  var s = k || 1;
  cyl(g, 0.01 * s, 0.01 * s, 0.5 * s, 0xfff0cc, x, y + 0.25 * s, z, { seg: 3, rz: lean });
  box(g, 0.02, 0.3 * s, 0.1 * s, color, x - Math.sin(lean) * 0.35 * s, y + 0.36 * s, z, { rz: lean });
}

function chalkTray(g, S, z, dz) {
  box(g, 0.2, 0.05, 2.9, WOOD_LIGHT, S.in(0.1), 1.5, z + (dz || 0), { r: 0.7 });
  [-0.7, 0.2, 0.9].forEach(function (o, i) { cyl(g, 0.018, 0.018, 0.14, [0xfff6dc, 0xffe27a, 0xffb3a0][i], S.in(0.12), 1.56, z + o, { seg: 4, rx: Math.PI / 2 }); });
}

function bench(g, S, z, flasks) {
  var x = S.in(0.5);
  box(g, 0.8, 0.09, 3.0, WOOD_LIGHT, x, 0.84, z, { r: 0.6 });
  box(g, 0.72, 0.68, 2.9, WOOD, x, 0.46, z, { r: 0.7 });
  for (var d = 0; d < 3; d++) box(g, 0.02, 0.5, 0.85, WOOD_DARK, x - S.side * 0.37, 0.46, z - 1.0 + d * 1.0);
  for (var i = 0; i < flasks; i++) {
    var c = INK_COLORS[(i + (flasks === 3 ? 0 : 2)) % 5];
    var fz = z - 1.0 + i * 1.0;
    inkwell(g, x, 0.89, fz, c, 1.55);
    glow(g, c, 0.8, x - S.side * 0.1, 1.3, fz, S.turn);
  }
  quill(g, x, 0.89, z + 1.35, 0xe0508a, 0.35, 1);
}

function scrollRack(g, S, z) {
  var x = S.in(0.3);
  for (var r2 = 0; r2 < 3; r2++) box(g, 0.45, 0.06, 3.3, WOOD_LIGHT, x, 1.1 + r2 * 0.69, z, { r: 0.7 });
  for (var c = 0; c < 5; c++) box(g, 0.45, 2.1, 0.08, WOOD, x, 2.15, z - 1.62 + c * 0.81, { r: 0.7 });
  // scrolls rolled on the shelves, and a few leaning
  var cols = [PARCH, 0xf5e0a8, 0xffe6b8];
  for (var i = 0; i < 10; i++) {
    var sz = z - 1.45 + (i % 4) * 0.8 + (i > 7 ? 0.2 : 0);
    var sy = 1.22 + Math.floor(i / 4) * 0.69;
    cyl(g, 0.1, 0.1, 0.68, cols[i % 3], S.in(0.28), sy, sz, { rx: Math.PI / 2, seg: 7, r: 0.8 });
    cyl(g, 0.045, 0.045, 0.74, [TERRA, TEAL, BRASS][i % 3], S.in(0.28), sy, sz, { rx: Math.PI / 2, seg: 5 });
  }
}

function deskLens(g, S, z) {
  var x = S.in(0.5);
  box(g, 0.85, 0.08, 1.9, WOOD_LIGHT, x, 0.8, z, { r: 0.6 });
  box(g, 0.78, 0.5, 1.8, WOOD, x, 0.51, z, { r: 0.7 });
  [[-0.85, -0.34], [-0.85, 0.34], [0.85, -0.34], [0.85, 0.34]].forEach(function (p) { box(g, 0.07, 0.8, 0.07, WOOD_DARK, x + p[1], 0.4, z + p[0]); });
  // a big magnifier on a brass stand
  var mz = z + 0.2;
  cyl(g, 0.12, 0.14, 0.04, BRASS, x, 0.86, mz, { seg: 8, m: 0.5 });
  cyl(g, 0.018, 0.018, 0.7, BRASS, x, 1.2, mz, { seg: 5, m: 0.5 });
  ring(g, 0.26, 0.03, BRASS, x, 1.55, mz, { ry: S.turn, seg: 14, tube: 5, m: 0.5 });
  cyl(g, 0.25, 0.25, 0.015, 0xe6fbf5, x - S.side * 0.0, 1.55, mz, { rz: Math.PI / 2, seg: 12, mat: glassMat() });
  // an open scroll with writing, a pile of scrolls and a candle-lamp
  box(g, 0.5, 0.02, 0.8, PARCH, x, 0.86, z - 0.5, { ry: 0.1, r: 0.9 });
  box(g, 0.3, 0.012, 0.5, 0xd9663a, x, 0.875, z - 0.5, { ry: 0.1 });
  for (var i = 0; i < 4; i++) cyl(g, 0.09, 0.09, 0.5, [PARCH, 0xf5e0a8][i % 2], x + (i % 2) * 0.1 - 0.05, 0.95 + Math.floor(i / 2) * 0.17, z + 0.85, { rx: Math.PI / 2, ry: 0.2 * (i - 1.5), seg: 7 });
  cyl(g, 0.07, 0.07, 0.2, 0xfff0cc, x, 0.97, z - 0.85, { seg: 6 });
  ball(g, 0.05, 0xffd25a, x, 1.12, z - 0.85, { seg: 5, bulb: true });
  glow(g, 0xffd25a, 0.8, x - S.side * 0.05, 1.12, z - 0.85, S.turn);
  // the stool
  cyl(g, 0.22, 0.2, 0.08, TEAL, S.in(0.85), 0.55, z + 0.0, { seg: 8 });
}

function inkTower(g, S, z) {
  // a tall glass inkwell on a pedestal, with a great quill, and the Rosetta stone
  var x = S.in(0.55);
  var iz = z + 0.9;
  cyl(g, 0.34, 0.4, 0.7, TEAL_DARK, x, 0.35, iz, { seg: 10 });
  cyl(g, 0.4, 0.4, 0.06, BRASS, x, 0.73, iz, { seg: 10, m: 0.5 });
  ball(g, 0.5, 0xe6fbf5, x, 1.35, iz, { seg: 12, mat: glassMat() });
  ball(g, 0.42, 0x2fb6a0, x, 1.28, iz, { seg: 10, sy: 0.88, mat: inkMat(0x2fb6a0) });
  cyl(g, 0.15, 0.2, 0.2, 0xe6fbf5, x, 1.85, iz, { seg: 8, mat: glassMat() });
  cyl(g, 0.02, 0.02, 1.1, 0xfff0cc, x, 2.35, iz, { seg: 4, rz: 0.15 });
  box(g, 0.03, 0.9, 0.3, 0xe0508a, x - S.side * 0.16, 2.5, iz, { rz: 0.15 });
  glow(g, 0x2fb6a0, 1.8, x - S.side * 0.2, 1.35, iz, S.turn);
  // the stone
  var sx = S.in(0.45);
  var sz = z - 1.1;
  var rt = rosettaTex();
  box(g, 0.5, 0.2, 1.2, 0xb8ad98, sx, 0.1, sz, { r: 0.9 });
  var stone = box(g, 0.3, 1.25, 1.0, 0xffffff, sx, 0.85, sz, { r: 0.9, rz: -S.side * 0.12, map: rt });
  if (!rt) stone.material = mat(0xc9bfa6);
  box(g, 0.3, 0.12, 1.0, 0xb8ad98, sx - S.side * 0.07, 1.5, sz, { r: 0.9, rz: -S.side * 0.12 });
}

function wheelFeature() {
  var m = new THREE.Group();
  var tex = wheelTex();
  // a brass ring and hub fixed to the wall; the lettered disc turns inside
  ring(m, 0.95, 0.07, BRASS, 0, 0, 0.0, { ry: Math.PI / 2, seg: 20, tube: 5, m: 0.5, r: 0.35 });
  cyl(m, 0.1, 0.1, 0.14, BRASS, 0, 0, 0, { rz: Math.PI / 2, seg: 8, m: 0.5 });
  cyl(m, 0.1, 0.1, 0.2, WOOD_DARK, 0.22, 0, 0, { rz: Math.PI / 2, seg: 6 });
  var inner = new THREE.Group();
  var disc = cyl(inner, 0.9, 0.9, 0.06, 0xffffff, 0, 0, 0, { rz: Math.PI / 2, seg: 28, map: tex, r: 0.6 });
  if (!tex) disc.material = mat(0x2f9e8c);
  // teeth around the rim
  for (var i = 0; i < 12; i++) {
    var a = (i / 12) * Math.PI * 2;
    box(inner, 0.08, 0.14, 0.14, i % 2 ? TERRA : TEAL, 0.02, Math.cos(a) * 0.93, Math.sin(a) * 0.93, { rx: -a });
  }
  animated(inner);
  m.add(inner);
  spin(inner, 'x', 0.35, 0);
  animated(m);
  return m;
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(), side, z, H, 0.0, { r: 0.85, e: 0xfff0cc, ei: 0.1 });
  if (k === 0) { chalkTray(g, S, z); bench(g, S, z, 3); }
  else if (k === 1) scrollRack(g, S, z);
  else if (k === 2) { chalkTray(g, S, z); deskLens(g, S, z); }
  else inkTower(g, S, z);
  box(g, 0.06, 0.14, 4, BRASS, S.in(0.03), 0.09, z, { m: 0.4, r: 0.4 });
  // brass picture rail along the top of the wall
  box(g, 0.08, 0.06, 4, BRASS, S.in(0.04), 5.52, z, { m: 0.4, r: 0.4 });
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12, { r: 0.6, env: 0.3 });
  ceilingPanel(g, ceilingPicture(), z, 11.6, H);
}

function arch(g, z, i) {
  var y = H - 0.45;
  box(g, 11, 0.34, 0.34, WOOD, 0, y, z, { r: 0.7 });
  box(g, 11, 0.07, 0.4, BRASS, 0, y - 0.2, z, { m: 0.5, r: 0.4 });
  // hanging lamps full of coloured ink, and scroll banners
  [-1, 1].forEach(function (s, n) {
    var x = s * 4.3;
    var c = INK_COLORS[(i + n * 2) % 5];
    cyl(g, 0.012, 0.012, 0.9, BRASS, x, y - 0.6, z, { seg: 3 });
    cone(g, 0.18, 0.18, BRASS, x, y - 1.15, z, { seg: 6, m: 0.5 });
    ball(g, 0.26, c, x, y - 1.5, z, { seg: 10, mat: inkMat(c) });
    glow(g, c, 1.5, x, y - 1.5, z, 0);
    var glyph = GLYPHS[(i * 3 + n * 5) % GLYPHS.length];
    cyl(g, 0.02, 0.02, 0.8, WOOD_DARK, x + s * 0.85, y - 0.5, z, { rz: Math.PI / 2, seg: 5 });
    sign(g, glyph, [PARCH, 0xffe27a, 0xbff0e4][(i + n) % 3], [TERRA, WOOD_DARK, TEAL_DARK][(i + n) % 3], 0.7, 1.0, x + s * 0.85, y - 1.05, z, { border: BRASS, tw: 112, th: 160 });
  });
  // a string of little glyph tiles across the lab
  var n2 = 9;
  for (var f = 0; f < n2; f++) {
    var t = f / (n2 - 1);
    var fx = -4.4 + t * 8.8;
    var fy = y - 0.3 - Math.sin(t * Math.PI) * 0.45;
    sign(g, GLYPHS[(f + i * 2) % GLYPHS.length], [PARCH, 0xffe27a, 0xbff0e4, 0xffb3a0][f % 4], WOOD_DARK, 0.36, 0.4, fx, fy - 0.2, z + 0.3, { tw: 64, th: 72 });
  }
}

function extras() {
  // bubbles of ink rising beside the walls, in the ink colours
  var bubble = combine([
    { geo: new THREE.SphereGeometry(0.14, 8, 6), color: 0xffffff },
    { geo: new THREE.SphereGeometry(0.05, 5, 4), color: 0xffffff, matrix: xform(-0.04, 0.05, 0.1) }
  ]);
  var bubMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: bubble, material: bubMat, count: 16, seed: 8 + i * 17, area: { x: [side * 4.5, side * 5.2], y: [0.9, 4.8], z: [-130, 8] }, k: 1, vy: [0.25, 0.7], wobble: 0.12, scale: [0.7, 1.5], colors: INK_COLORS });
  });
  // scrolls drifting past, high up
  var scroll = combine([
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.55, 7), color: 0xfff0cc, matrix: xform(0, 0, 0, 0, 0, Math.PI / 2) },
    { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.62, 5), color: 0xd9663a, matrix: xform(0, 0, 0, 0, 0, Math.PI / 2) },
    { geo: new THREE.BoxGeometry(0.4, 0.02, 0.2), color: 0xffe6b8, matrix: xform(0.0, -0.06, 0.12, 0.3, 0, 0) }
  ]);
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: scroll, count: 5, seed: 41 + i * 7, area: { x: [side * 4.2, side * 5.0], y: [4.4, 5.4], z: [-130, 8] }, k: 1, wobble: 0.25, flap: 0.35, scale: [1.3, 1.8], colors: [0xffffff, 0xffe6b8, 0xbff0e4] });
  });
  // the great cipher wheels, one every 32 units on alternate walls
  [-1, 1].forEach(function (side, i) {
    features(wheelFeature, { x: side * 5.15, y: 3.6, z0: -12 - i * 16, spacing: 32, count: 4 });
  });
  // the inks glow gently, slower than twice a second
  Object.keys(_inkMats).forEach(function (c, i) { shimmer(_inkMats[c], 0.45, 0.2, 1.4, i); });
}

export var w_codebreakers_lab = {
  id: 'w_codebreakers_lab',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
