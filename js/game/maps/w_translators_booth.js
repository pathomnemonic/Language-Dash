/**
 * w_translators_booth.js — Translators Booth (skin 'Operating Room'; the key is kept from the original game).
 *
 * The hall of a language congress, where the interpreters sit in glass booths. Every 16 units, along each wall:
 *   bay 0  a glass booth: desk, headset, microphone, dictionaries and a little flag
 *   bay 1  big speech-bubble signs, a service bell on a table and a speaker's podium
 *   bay 2  a second booth, with a giant pair of headphones over it
 *   bay 3  a rack of flags, a brass bell on a pedestal and a lectern with a giant open dictionary
 * Teal and cream walls, a tiled floor in mint and cream, a white ceiling with spotlights. Across the hall hang strings of
 * national flags, with pendants of language pairs. Speech bubbles float past.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, quad, extrude, combine, xform, mat, bulb, canvasTex,
  floorPanel, ceilingPanel, wallPanel, sideCtx, sign
} from '../mapkit.js';
import { swarm, shimmer } from '../mapfx.js';

var H = 6.0;

var TEAL = 0x1fa39a;
var TEAL_DARK = 0x14756f;
var CORAL = 0xff7a59;
var GOLD = 0xffc83d;
var INK = 0x1b2a41;
var BRASS = 0xe0aa3c;
var WOOD = 0xd99a5a;
var FONT = '"Fraunces", "Noto Sans", "DejaVu Sans", "Noto Sans JP", "WenQuanYi Zen Hei", sans-serif';

// ---------- painted pictures ----------

function bubblePath(ctx, x, y, w, h, tail) {
  var r = Math.min(h * 0.32, 40);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  var tx = tail > 0 ? x + w * 0.72 : x + w * 0.28;
  ctx.lineTo(tx + 22, y + h); ctx.lineTo(tx + (tail > 0 ? 14 : -14), y + h + 30); ctx.lineTo(tx - 12, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wallPicture() {
  // 16 units long, 6 high at 96 px to the unit
  var P = 96;
  return canvasTex('tb_wall', 1536, 576, function (ctx, w, h) {
    var Y = function (wy) { return h - wy * P; };
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6fff6');
    g.addColorStop(1, '#d8f2e4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    var phrases = [['Hello!', '#ff7a59', '#ffffff'], ['¡Hola!', '#ffc83d', '#1b2a41'], ['Bonjour', '#ffffff', '#1b2a41'], ['こんにちは', '#1fa39a', '#ffffff'],
      ['你好', '#ffffff', '#c9433a'], ['Привет', '#ff7a59', '#ffffff'], ['مرحبا', '#ffc83d', '#1b2a41'], ['안녕', '#1fa39a', '#ffffff']];
    for (var b = 0; b < 4; b++) {
      var bx = b * 384;
      var cx = bx + 192;
      if (b % 2 === 0) {
        // the booth's back wall: pale wood, a corkboard of notes, and rows of coloured foam
        ctx.fillStyle = '#f3d8a8';
        ctx.fillRect(bx + 24, Y(5.0), 336, Y(1.2) - Y(5.0));
        for (var fy = 0; fy < 3; fy++) {
          for (var fx = 0; fx < 5; fx++) {
            var fc = (fx + fy) % 2 ? '#ff9a7a' : '#4fc0b4';
            var rx = bx + 40 + fx * 62;
            var ry = Y(4.9) + fy * 62;
            ctx.fillStyle = fc;
            ctx.fillRect(rx, ry, 56, 56);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 56, ry); ctx.lineTo(rx, ry + 56); ctx.closePath(); ctx.fill();
          }
        }
        ctx.fillStyle = '#c98a4a';
        ctx.fillRect(cx - 80, Y(3.35), 160, 70);
        ctx.fillStyle = '#e8b878';
        ctx.fillRect(cx - 74, Y(3.35) + 6, 148, 58);
        [['#fff6dc', -60, 12, -0.1], ['#ffd1c2', -10, 8, 0.08], ['#c8f0e4', 36, 14, -0.05]].forEach(function (n) {
          ctx.save(); ctx.translate(cx + n[1] + 18, Y(3.35) + n[2] + 20); ctx.rotate(n[3]);
          ctx.fillStyle = n[0]; ctx.fillRect(-18, -20, 40, 40);
          ctx.fillStyle = '#1b2a41'; ctx.fillRect(-12, -10, 28, 3); ctx.fillRect(-12, -2, 22, 3); ctx.fillRect(-12, 6, 26, 3);
          ctx.fillStyle = '#d9432c'; ctx.beginPath(); ctx.arc(0, -20, 4, 0, 6.3); ctx.fill();
          ctx.restore();
        });
        // booth frame colour band
        ctx.fillStyle = b === 0 ? '#ff7a59' : '#ffc83d';
        ctx.fillRect(bx + 24, Y(5.0) - 12, 336, 12);
      } else {
        // big speech bubbles on a teal-and-cream wall
        var set = b === 1 ? [0, 1, 2] : [3, 4, 5];
        [[cx - 100, Y(4.4), 200, 90, 1], [cx - 160, Y(3.1), 170, 76, -1], [cx + 20, Y(3.0), 150, 70, 1]].forEach(function (bp, bi) {
          var ph = phrases[set[bi]];
          ctx.save();
          ctx.translate(0, 5); bubblePath(ctx, bp[0], bp[1], bp[2], bp[3], bp[4]); ctx.fillStyle = 'rgba(20,60,60,0.22)'; ctx.fill();
          ctx.restore();
          bubblePath(ctx, bp[0], bp[1], bp[2], bp[3], bp[4]);
          ctx.fillStyle = ph[1]; ctx.fill();
          ctx.lineWidth = 4; ctx.strokeStyle = '#1b2a41'; ctx.stroke();
          ctx.fillStyle = ph[2];
          ctx.font = '800 ' + (bp[3] * 0.42) + 'px ' + FONT;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(ph[0], bp[0] + bp[2] / 2, bp[1] + bp[3] / 2 + 2);
        });
        // a little round world map poster
        ctx.fillStyle = '#fff3dc';
        ctx.beginPath(); ctx.arc(cx + 120, Y(4.35), 40, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#4fc0b4';
        ctx.beginPath(); ctx.arc(cx + 120, Y(4.35), 33, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ffd96a';
        ctx.beginPath(); ctx.ellipse(cx + 112, Y(4.35) - 6, 14, 10, 0.3, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 132, Y(4.35) + 10, 9, 12, -0.3, 0, 6.3); ctx.fill();
      }
      // pilaster
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 12, Y(5.5), 24, Y(1.2) - Y(5.5));
      ctx.fillStyle = '#1fa39a';
      ctx.fillRect(bx - 16, Y(5.55), 32, 10);
      ctx.fillRect(bx - 16, Y(1.25), 32, 10);
    }
    // teal wainscot with a coral rail
    ctx.fillStyle = '#1fa39a';
    ctx.fillRect(0, Y(1.2), w, 1.2 * P);
    ctx.fillStyle = '#17887f';
    for (var s = 0; s < 32; s++) ctx.fillRect(s * 48 + 21, Y(1.2) + 14, 6, 1.2 * P - 28);
    ctx.fillStyle = '#ff7a59';
    ctx.fillRect(0, Y(1.2) - 8, w, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, Y(1.2) - 12, w, 4);
    ctx.fillStyle = '#14756f';
    ctx.fillRect(0, h - 10, w, 10);
    // coral frieze with small greetings
    ctx.fillStyle = '#ff7a59';
    ctx.fillRect(0, 0, w, Y(5.5));
    ctx.fillStyle = '#ffc83d';
    ctx.fillRect(0, Y(5.5) - 5, w, 5);
    ctx.fillStyle = '#fff3dc';
    ctx.font = '800 22px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var greet = ['hello', 'hola', 'ciao', 'こんにちは', 'salut', '你好', 'hallo', '안녕'];
    for (var q = 0; q < 8; q++) ctx.fillText(greet[q], q * 192 + 96, (Y(5.5)) / 2);
  });
}

function floorPicture() {
  // 12 across, 16 along at 48 px to the unit: polished tiles in cream and mint, with a coral and gold line on the 4-unit grid
  return canvasTex('tb_floor', 576, 768, function (ctx, w, h) {
    for (var j = 0; j < 16; j++) {
      for (var i = 0; i < 12; i++) {
        var even = (i + j) % 2 === 0;
        ctx.fillStyle = even ? '#fff3dc' : '#bfe9db';
        ctx.fillRect(i * 48, j * 48, 48, 48);
        ctx.fillStyle = even ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)';
        ctx.fillRect(i * 48, j * 48, 48, 4);
        ctx.fillStyle = 'rgba(40,110,100,0.10)';
        ctx.fillRect(i * 48, j * 48 + 44, 48, 4);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    for (var k = 0; k <= 12; k++) { ctx.beginPath(); ctx.moveTo(k * 48, 0); ctx.lineTo(k * 48, h); ctx.stroke(); }
    for (var m = 0; m <= 16; m++) { ctx.beginPath(); ctx.moveTo(0, m * 48); ctx.lineTo(w, m * 48); ctx.stroke(); }
    // coral edge strips near the walls
    ctx.fillStyle = '#ff7a59';
    ctx.fillRect(0, 0, 10, h);
    ctx.fillRect(w - 10, 0, 10, h);
    // the language-pair arrows, one every 8 units, centred (they sit between the lane lines and are only a stamp of colour)
    ctx.fillStyle = 'rgba(255,200,61,0.9)';
    [0, 384].forEach(function (y0) {
      [-2.5, 2.5].forEach(function (lx) {
        var cx = w / 2 + lx * 48;
        ctx.beginPath(); ctx.moveTo(cx - 14, y0 + 190); ctx.lineTo(cx + 14, y0 + 190); ctx.lineTo(cx, y0 + 214); ctx.closePath(); ctx.fill();
        ctx.fillRect(cx - 5, y0 + 170, 10, 22);
      });
    });
  });
}

function ceilingPicture() {
  // 11.6 across x 16 along at 40 px to the unit: white acoustic panels, teal grid, round spotlights
  return canvasTex('tb_ceiling', 464, 640, function (ctx, w, h) {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    var cw = w / 3;
    var ch = 160;
    for (var j = 0; j < 4; j++) {
      for (var i = 0; i < 3; i++) {
        ctx.fillStyle = (i + j) % 2 ? '#e3f6ee' : '#fff3dc';
        ctx.fillRect(i * cw + 5, j * ch + 5, cw - 10, ch - 10);
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath(); ctx.arc(i * cw + cw / 2, j * ch + ch / 2, 17, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#fffbe0';
        ctx.beginPath(); ctx.arc(i * cw + cw / 2, j * ch + ch / 2, 10, 0, 6.3); ctx.fill();
      }
    }
    ctx.fillStyle = '#1fa39a';
    for (var gj = 0; gj < 4; gj++) ctx.fillRect(0, gj * ch - 2, w, 5);
    for (var gi = 0; gi < 3; gi++) ctx.fillRect(gi * cw - 2, 0, 5, h);
  });
}

function bubbleTex(text, fg) {
  return canvasTex('tb_btext' + text + fg, 256, 128, function (ctx, w, h) {
    ctx.fillStyle = fg;
    ctx.font = '800 ' + (text.length > 4 ? 52 : 80) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  });
}

// ---------- materials and little things ----------

var _glass = null;
function glassMat() {
  return _glass || (_glass = mat(0xd9f6ee, { op: 0.2, side: THREE.DoubleSide, r: 0.1, env: 0.8 }));
}
var _lit = null;
function litMat() { return _lit || (_lit = mat(0xfff0b0, { e: 0xffe27a, ei: 0.8, r: 0.5 })); }

function headset(g, x, y, z, color, s) {
  // a band over the head, two ear cups, a microphone boom; faces along z
  var k = s || 1;
  ring(g, 0.15 * k, 0.015 * k, color, x, y + 0.04 * k, z, { arc: Math.PI, seg: 10, tube: 4 });
  cyl(g, 0.055 * k, 0.055 * k, 0.05 * k, color, x - 0.15 * k, y + 0.03 * k, z, { rz: Math.PI / 2, seg: 8 });
  cyl(g, 0.055 * k, 0.055 * k, 0.05 * k, color, x + 0.15 * k, y + 0.03 * k, z, { rz: Math.PI / 2, seg: 8 });
  cyl(g, 0.008 * k, 0.008 * k, 0.16 * k, INK, x + 0.17 * k, y - 0.04 * k, z + 0.05 * k, { rx: 0.9, seg: 3 });
  ball(g, 0.018 * k, INK, x + 0.17 * k, y - 0.1 * k, z + 0.12 * k, { seg: 5 });
}

function flagStripes(g, kind, x, y, z, ry, w, h) {
  // a small flag made of flat colour pieces, in a plane facing along ry (0 = faces +z)
  var V = function (c, i) { quadAt(g, w / 3, h, c, x, y, z, ry, i * w / 3, 0, 0); };
  var Hh = function (c, i) { quadAt(g, w, h / 3, c, x, y, z, ry, 0, i * h / 3, 0); };
  switch (kind) {
    case 'fr': V(0x2457c5, -1); V(0xffffff, 0); V(0xe0402f, 1); break;
    case 'it': V(0x2f9e5a, -1); V(0xffffff, 0); V(0xe0402f, 1); break;
    case 'de': Hh(0x2a2a2a, 1); Hh(0xe0402f, 0); Hh(0xffc83d, -1); break;
    case 'nl': Hh(0xe0402f, 1); Hh(0xffffff, 0); Hh(0x2457c5, -1); break;
    case 'es': Hh(0xe0402f, 1); Hh(0xffc83d, 0); Hh(0xe0402f, -1); break;
    case 'ru': Hh(0xffffff, 1); Hh(0x2457c5, 0); Hh(0xe0402f, -1); break;
    case 'pl': quadAt(g, w, h / 2, 0xffffff, x, y, z, ry, 0, h / 4, 0); quadAt(g, w, h / 2, 0xe0402f, x, y, z, ry, 0, -h / 4, 0); break;
    case 'jp': quadAt(g, w, h, 0xffffff, x, y, z, ry, 0, 0, 0); quadAt(g, h * 0.6, h * 0.6, 0xe0402f, x, y, z, ry, 0, 0, 0.01, true); break;
    default: // se
      quadAt(g, w, h, 0x2f7fc5, x, y, z, ry, 0, 0, 0);
      quadAt(g, w, h * 0.22, 0xffc83d, x, y, z, ry, 0, 0, 0.01);
      quadAt(g, w * 0.22, h, 0xffc83d, x, y, z, ry, -w * 0.15, 0, 0.01);
  }
}

function quadAt(g, qw, qh, color, x, y, z, ry, ox, oy, depth, round) {
  var cs = Math.cos(ry);
  var sn = Math.sin(ry);
  var px = x + ox * cs + (depth || 0) * sn;
  var pz = z - ox * sn + (depth || 0) * cs;
  if (round) return ball(g, qw / 2, color, px, y + oy, pz, { seg: 8, sz: 0.04, ry: ry });
  return quad(g, qw, qh, color, px, y + oy, pz, { ry: ry, side: THREE.DoubleSide });
}

function booth(g, S, z, k) {
  var trim = k === 0 ? CORAL : GOLD;
  var fx = S.in(0.83);
  // floor platform, roof, posts and a sign
  box(g, 0.86, 0.12, 3.5, 0xfff3dc, S.in(0.43), 0.06, z, { r: 0.7 });
  box(g, 0.95, 0.14, 3.7, trim, S.in(0.45), 2.75, z, { r: 0.6 });
  [-1.7, 0, 1.7].forEach(function (dz) { box(g, 0.1, 2.7, 0.1, 0xffffff, fx, 1.4, z + dz, { r: 0.5 }); });
  box(g, 0.08, 0.08, 3.5, 0xffffff, fx, 0.15, z);
  box(g, 0.08, 0.08, 3.5, 0xffffff, fx, 2.65, z);
  box(g, 0.05, 2.5, 1.7, 0xd9f6ee, fx, 1.4, z - 0.85, { mat: glassMat() });
  box(g, 0.05, 2.5, 1.7, 0xd9f6ee, fx, 1.4, z + 0.85, { mat: glassMat() });
  box(g, 0.12, 0.34, 2.4, 0xffffff, S.in(0.88), 3.1, z, { r: 0.6 });
  var txt = k === 0 ? 'EN ⇄ ES' : 'FR ⇄ DE';
  sign(g, txt, k === 0 ? CORAL : GOLD, INK, 2.2, 0.28, S.in(0.95), 3.1, z, { ry: S.turn, tw: 384, th: 56 });
  // the interpreter's desk along the back, with a screen, headsets, a mic and dictionaries
  box(g, 0.45, 0.07, 2.9, WOOD, S.in(0.32), 0.85, z, { r: 0.6 });
  box(g, 0.4, 0.7, 2.8, 0xfff3dc, S.in(0.3), 0.45, z, { r: 0.7 });
  box(g, 0.05, 0.4, 0.62, INK, S.in(0.2), 1.2, z - 0.95, { ry: 0, r: 0.4 });
  box(g, 0.02, 0.34, 0.56, 0x8fe0d0, S.in(0.22), 1.2, z - 0.95, { mat: litMat() });
  box(g, 0.06, 0.2, 0.08, INK, S.in(0.22), 0.98, z - 0.95);
  headset(g, S.in(0.5), 0.99, z + 0.1, trim, 1.4);
  headset(g, S.in(0.5), 0.99, z + 0.62, 0x1fa39a, 1.4);
  cyl(g, 0.012, 0.012, 0.3, INK, S.in(0.4), 1.0, z - 0.35, { seg: 4 });
  ball(g, 0.04, INK, S.in(0.4), 1.17, z - 0.35, { seg: 6 });
  var cols = [0xc9433a, 0x2457c5, 0xffc83d, 0x2f9e5a];
  for (var i = 0; i < 4; i++) box(g, 0.28 - i * 0.02, 0.1, 0.4 - i * 0.02, cols[i], S.in(0.35), 0.93 + i * 0.1, z + 1.15, { ry: (i - 1.5) * 0.15, r: 0.8 });
  // a flag in a pot and the interpreter's chair
  cyl(g, 0.01, 0.01, 0.5, 0xffffff, S.in(0.3), 1.15, z - 1.3, { seg: 3 });
  flagStripes(g, k === 0 ? 'es' : 'fr', S.in(0.3), 1.3, z - 1.22, S.turn, 0.28, 0.2);
  cyl(g, 0.2, 0.2, 0.06, CORAL, S.in(0.52), 0.5, z + 0.35, { seg: 8 });
}

function headphones(g, S, z) {
  // a giant pair of headphones standing on the booth roof, for a sign
  var x = S.in(0.45);
  ring(g, 0.8, 0.09, CORAL, x, 3.75, z, { arc: Math.PI, ry: S.turn, seg: 16, tube: 5 });
  [-0.8, 0.8].forEach(function (dz) {
    cyl(g, 0.32, 0.32, 0.26, TEAL, x, 3.62, z + dz, { rx: 0, rz: Math.PI / 2, seg: 12 });
    cyl(g, 0.22, 0.22, 0.28, 0xfff3dc, x, 3.62, z + dz, { rz: Math.PI / 2, seg: 10 });
  });
  cyl(g, 0.06, 0.06, 0.2, INK, x, 3.5, z, { seg: 4 });
}

function bubbles(g, S, z) {
  // the tall podium
  var x = S.in(0.45);
  box(g, 0.6, 0.9, 0.8, WOOD, x, 0.45, z - 1.1, { r: 0.7 });
  box(g, 0.68, 0.07, 0.9, 0xfff3dc, x, 0.93, z - 1.1, { r: 0.7, ry: 0 });
  cyl(g, 0.012, 0.012, 0.35, INK, x, 1.12, z - 1.1, { seg: 4 });
  ball(g, 0.055, INK, x, 1.32, z - 1.1, { seg: 6 });
  box(g, 0.02, 0.36, 0.5, 0xffc83d, x - S.side * 0.31, 0.5, z - 1.1);
  // a table with a brass service bell and a stack of dictionaries
  box(g, 0.7, 0.07, 1.3, 0xfff3dc, S.in(0.5), 0.8, z + 0.9, { r: 0.6 });
  [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]].forEach(function (p) { box(g, 0.06, 0.8, 0.06, TEAL_DARK, S.in(0.5) + p[1] * 0.9, 0.4, z + 0.9 + p[0]); });
  cyl(g, 0.17, 0.19, 0.03, BRASS, S.in(0.5), 0.86, z + 0.62, { seg: 10, m: 0.5, r: 0.35 });
  ball(g, 0.15, BRASS, S.in(0.5), 0.9, z + 0.62, { seg: 10, sy: 0.75, m: 0.5, r: 0.35 });
  ball(g, 0.03, 0xe0402f, S.in(0.5), 1.04, z + 0.62, { seg: 5 });
  box(g, 0.32, 0.04, 0.2, CORAL, S.in(0.5), 0.86, z + 0.35, { r: 0.5 });
  var cols = [0x2457c5, 0xc9433a, 0x2f9e5a];
  for (var i = 0; i < 3; i++) box(g, 0.34, 0.12, 0.46, cols[i], S.in(0.5), 0.9 + i * 0.12, z + 1.25, { ry: (i - 1) * 0.2, r: 0.8 });
}

function bubbleBoard(g, S, z, y, ry, col, text, fg, w, h) {
  // a speech bubble in relief (a rounded plate with a tail) with lettering in front
  var sh = new THREE.Shape();
  var hw = w / 2;
  var hh = h / 2;
  var r = hh * 0.55;
  sh.moveTo(-hw + r, -hh);
  sh.lineTo(hw - r, -hh); sh.quadraticCurveTo(hw, -hh, hw, -hh + r);
  sh.lineTo(hw, hh - r); sh.quadraticCurveTo(hw, hh, hw - r, hh);
  sh.lineTo(-hw + r, hh); sh.quadraticCurveTo(-hw, hh, -hw, hh - r);
  sh.lineTo(-hw, -hh + r); sh.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  sh.lineTo(-hw + w * 0.12, -hh); sh.lineTo(-hw + w * 0.04, -hh - h * 0.28); sh.lineTo(-hw + w * 0.26, -hh);
  sh.closePath();
  var x = S.in(0.1);
  extrude(g, sh, 0.1, col, x, y, z, { ry: ry, curve: 3 });
  var tex = bubbleTex(text, fg);
  if (tex) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.9), bulb(0xffffff, { map: tex, op: 0.99 }));
    m.position.set(x - S.side * 0.07, y, z);
    m.rotation.y = ry;
    g.add(m);
  }
}

function flagRack(g, S, z) {
  // three flag poles on a stand, a brass bell on a pedestal and a lectern with a giant open dictionary
  var kinds = ['fr', 'it', 'de'];
  var x = S.in(0.45);
  box(g, 0.5, 0.12, 1.5, WOOD, x, 0.06, z - 1.0, { r: 0.7 });
  [-0.5, 0, 0.5].forEach(function (dz, i) {
    cyl(g, 0.02, 0.02, 3.0, BRASS, x, 1.6, z - 1.0 + dz, { seg: 5, m: 0.4 });
    ball(g, 0.04, BRASS, x, 3.12, z - 1.0 + dz, { seg: 5, m: 0.4 });
    flagStripes(g, kinds[i], x, 2.8, z - 1.0 + dz + 0.28, S.turn, 0.5, 0.34);
  });
  // brass bell on a pedestal
  var bx = S.in(0.45);
  var bz = z + 0.55;
  cyl(g, 0.3, 0.34, 0.9, TEAL, bx, 0.45, bz, { seg: 10 });
  cyl(g, 0.34, 0.34, 0.06, 0xfff3dc, bx, 0.93, bz, { seg: 10 });
  cyl(g, 0.1, 0.3, 0.42, BRASS, bx, 1.25, bz, { seg: 12, m: 0.5, r: 0.35 });
  ball(g, 0.1, BRASS, bx, 1.5, bz, { seg: 8, m: 0.5, r: 0.35 });
  ball(g, 0.05, INK, bx, 1.0, bz, { seg: 6 });
  // lectern with an open dictionary
  var lx = S.in(0.5);
  var lz = z + 1.5;
  box(g, 0.1, 0.9, 0.3, WOOD, lx, 0.45, lz, { r: 0.7 });
  box(g, 0.4, 0.04, 0.6, WOOD, lx, 0.9, lz, { r: 0.7, rz: -S.side * 0.5 });
  box(g, 0.36, 0.03, 0.28, 0xfff6dc, lx, 0.98, lz - 0.15, { rz: -S.side * 0.5, ry: 0.05 });
  box(g, 0.36, 0.03, 0.28, 0xfff6dc, lx, 0.98, lz + 0.15, { rz: -S.side * 0.5, ry: -0.05 });
  box(g, 0.4, 0.02, 0.66, CORAL, lx + S.side * 0.01, 0.94, lz, { rz: -S.side * 0.5 });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(), side, z, H, 0.0, { r: 0.85, e: 0xffffff, ei: 0.08 });
  if (k === 0 || k === 2) {
    booth(g, S, z, k);
    if (k === 2) headphones(g, S, z);
  } else if (k === 1) {
    bubbles(g, S, z);
    bubbleBoard(g, S, z + 0.3, 5.0, S.turn, 0xffffff, 'Hola', 0xc9433a, 2.1, 0.85);
  } else {
    flagRack(g, S, z);
  }
  box(g, 0.06, 0.14, 4, 0xffffff, S.in(0.03), 0.09, z, { r: 0.5 });
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12, { r: 0.4, env: 0.4 });
  ceilingPanel(g, ceilingPicture(), z, 11.6, H);
}

var FLAG_ORDER = ['fr', 'it', 'de', 'nl', 'es', 'ru', 'pl', 'jp', 'se'];

function arch(g, z, i) {
  var y = H - 0.45;
  // a truss with spotlights, a string of flags, and two pendants with language pairs
  box(g, 11, 0.3, 0.3, 0xffffff, 0, y, z, { r: 0.5 });
  box(g, 11, 0.07, 0.34, TEAL, 0, y - 0.18, z);
  for (var s = 0; s < 4; s++) {
    var sx = -4.2 + s * 2.8;
    cone(g, 0.16, 0.3, INK, sx, y - 0.4, z, { seg: 6, rx: Math.PI });
    ball(g, 0.1, 0xfff0b0, sx, y - 0.58, z, { seg: 6, mat: litMat() });
  }
  // flags on a sagging cord
  var n = 11;
  var zc = z + 0.35;
  for (var f = 0; f < n; f++) {
    var t = f / (n - 1);
    var fx = -4.8 + t * 9.6;
    var fy = y - 0.3 - Math.sin(t * Math.PI) * 0.5;
    flagStripes(g, FLAG_ORDER[(f + i) % FLAG_ORDER.length], fx, fy - 0.17, zc, 0, 0.42, 0.3);
  }
  for (var c = 0; c < 10; c++) {
    var a = c / 10;
    var b = (c + 1) / 10;
    var ax = -4.8 + a * 9.6;
    var bx = -4.8 + b * 9.6;
    var ay = y - 0.3 - Math.sin(a * Math.PI) * 0.5;
    var by = y - 0.3 - Math.sin(b * Math.PI) * 0.5;
    var len = Math.hypot(bx - ax, by - ay);
    cyl(g, 0.012, 0.012, len, INK, (ax + bx) / 2, (ay + by) / 2, zc, { rz: Math.atan2(by - ay, bx - ax) - Math.PI / 2, seg: 3 });
  }
  var pairs = ['EN ⇄ ES', 'FR ⇄ DE', 'JA ⇄ KO', 'IT ⇄ PT', 'RU ⇄ PL', 'AR ⇄ HI'];
  [-1, 1].forEach(function (sd, nn) {
    var px = sd * 4.5;
    cyl(g, 0.01, 0.01, 0.5, INK, px, y - 0.4, z, { seg: 3 });
    sign(g, pairs[(i + nn * 3) % 6], [CORAL, GOLD, 0xffffff][(i + nn) % 3], INK, 1.3, 0.34, px, y - 0.85, z, { border: INK, tw: 256, th: 68 });
  });
}

function extras() {
  // speech bubbles floating beside the walls, in soft colours
  var bubble = combine([
    { geo: new THREE.SphereGeometry(0.28, 9, 6), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 1.35, 0.9, 0.35) },
    { geo: new THREE.ConeGeometry(0.1, 0.22, 4), color: 0xffffff, matrix: xform(-0.2, -0.3, 0, Math.PI, 0, 0.2, 1, 1, 0.35) },
    { geo: new THREE.SphereGeometry(0.035, 5, 4), color: 0x1b2a41, matrix: xform(-0.15, 0, 0.1) },
    { geo: new THREE.SphereGeometry(0.035, 5, 4), color: 0x1b2a41, matrix: xform(0, 0, 0.1) },
    { geo: new THREE.SphereGeometry(0.035, 5, 4), color: 0x1b2a41, matrix: xform(0.15, 0, 0.1) }
  ]);
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: bubble, count: 8, seed: 33 + i * 13, area: { x: [side * 3.9, side * 5.0], y: [3.4, 5.4], z: [-120, 8] }, k: 1, vy: [0.02, 0.12], wobble: 0.3, flap: 0.12, scale: [1.2, 1.8], colors: [0xffffff, 0xffe08a, 0xffb9a3, 0xa8ece0] });
  });
  if (_lit) shimmer(_lit, 0.8, 0.15, 1.5, 0);
}

export var w_translators_booth = {
  id: 'w_translators_booth',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
