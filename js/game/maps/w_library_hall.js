/**
 * w_library_hall.js — Library Hall (skin 'Hospital Hallway'; the key is kept from the original game).
 *
 * The reading hall of the Great Library of Babel, in warm wood, cream stone and brass. Every 16 units, along each wall:
 *   bay 0  a tall bookcase with a brass rail and a rolling ladder
 *   bay 1  an arched window pouring light on a reading desk with a brass lamp
 *   bay 2  a second bookcase, a globe and a stack of dictionaries
 *   bay 3  an arched window, an armchair and a floor lamp
 * The floor is honey parquet with a long rug, the ceiling is coffered. Across the hall hang brass lanterns, bunting and
 * letter banners. Pages flutter beside the walls. All of it stays outside the lanes.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, combine, xform, mat, bulb, canvasTex,
  floorPanel, ceilingPanel, wallPanel, sideCtx, bunting, sign
} from '../mapkit.js';
import { swarm, shimmer } from '../mapfx.js';

var H = 6.4;

var WOOD = 0xb9733a;
var WOOD_DARK = 0x8a5226;
var WOOD_LIGHT = 0xd6975a;
var STONE = 0xeed9aa;
var BRASS = 0xe0aa3c;
var RUST = 0xc9573a;
var SPINES = [0xb8402f, 0x2f7f6a, 0x2c6f9a, 0xd9962e, 0xf0dfb4, 0xc9633a, 0x8a3f55, 0x4f9a4a];
var FONT = '"Fraunces", "Noto Serif", "DejaVu Serif", "Noto Sans JP", "WenQuanYi Zen Hei", serif';

function rng(seed) {
  var s = seed;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ---------- painted pictures ----------

function drawBooks(ctx, x0, yTop, w, rowH, rows, seed) {
  // `rows` shelves, each rowH tall, filled with standing books; shelf planks under each row
  var r = rng(seed);
  var tones = ['#b8402f', '#2f7f6a', '#2c6f9a', '#d9962e', '#f0dfb4', '#c9633a', '#8a3f55', '#4f9a4a', '#e8c36a', '#a9552f'];
  for (var row = 0; row < rows; row++) {
    var yBase = yTop + (row + 1) * rowH;
    ctx.fillStyle = '#5b3418';
    ctx.fillRect(x0, yTop + row * rowH, w, rowH);
    var x = x0 + 2;
    while (x < x0 + w - 8) {
      var bw = 7 + Math.floor(r() * 9);
      var bh = rowH * (0.62 + r() * 0.3);
      if (x + bw > x0 + w - 2) bw = x0 + w - 2 - x;
      var c = tones[Math.floor(r() * tones.length)];
      ctx.fillStyle = c;
      ctx.fillRect(x, yBase - 8 - bh, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(x, yBase - 8 - bh, 2, bh);
      ctx.fillStyle = 'rgba(60,30,10,0.25)';
      ctx.fillRect(x + bw - 2, yBase - 8 - bh, 2, bh);
      // gold bands on the spine
      ctx.fillStyle = '#f2c35a';
      ctx.fillRect(x, yBase - 8 - bh + 6, bw, 3);
      if (r() > 0.5) ctx.fillRect(x, yBase - 8 - 9, bw, 3);
      if (r() > 0.78) x += 3 + Math.floor(r() * 10); // a gap
      x += bw;
    }
    // the plank
    ctx.fillStyle = '#c98648';
    ctx.fillRect(x0, yBase - 8, w, 8);
    ctx.fillStyle = '#e6a763';
    ctx.fillRect(x0, yBase - 8, w, 3);
  }
}

function wallPicture() {
  // 16 units long, 6.4 high at 96 px to the unit; four bays of 384 px
  var P = 96;
  return canvasTex('lib_wall', 1536, 614, function (ctx, w, h) {
    var Y = function (wy) { return h - wy * P; };
    // cream plaster
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fff3d2');
    g.addColorStop(1, '#f6e0b0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (var b = 0; b < 4; b++) {
      var bx = b * 384;
      var cx = bx + 192;
      if (b % 2 === 0) {
        // bookcase: dark wood back and five shelves of books, from 1.0 to 5.5
        ctx.fillStyle = '#7a4622';
        ctx.fillRect(bx + 22, Y(5.6), 340, Y(1.0) - Y(5.6));
        drawBooks(ctx, bx + 30, Y(5.5), 324, 0.9 * P, 5, 11 + b * 7);
        // side boards
        ctx.fillStyle = '#c98648';
        ctx.fillRect(bx + 22, Y(5.6), 9, Y(1.0) - Y(5.6));
        ctx.fillRect(bx + 353, Y(5.6), 9, Y(1.0) - Y(5.6));
        // a label card on the top
        ctx.fillStyle = '#fff1c8';
        ctx.fillRect(cx - 52, Y(5.78), 104, 24);
        ctx.strokeStyle = '#a8742c';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 52, Y(5.78), 104, 24);
        ctx.fillStyle = '#7a4622';
        ctx.font = '800 17px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b === 0 ? 'A · あ · Ж' : '你好 · م', cx, Y(5.78) + 13);
      } else {
        // arched window: stone frame, glowing glass, mullions
        var wx0 = cx - 92;
        var wx1 = cx + 92;
        var yb = Y(1.35);
        var yArc = Y(4.0);
        ctx.fillStyle = '#e8cf9a';
        ctx.beginPath();
        ctx.moveTo(wx0 - 14, yb + 8); ctx.lineTo(wx0 - 14, yArc); ctx.arc(cx, yArc, 106, Math.PI, 0); ctx.lineTo(wx1 + 14, yb + 8); ctx.closePath(); ctx.fill();
        var gl = ctx.createLinearGradient(0, yArc - 100, 0, yb);
        gl.addColorStop(0, '#ffe28a');
        gl.addColorStop(0.5, '#ffcf6a');
        gl.addColorStop(1, '#ffb84a');
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.moveTo(wx0, yb); ctx.lineTo(wx0, yArc); ctx.arc(cx, yArc, 92, Math.PI, 0); ctx.lineTo(wx1, yb); ctx.closePath(); ctx.fill();
        // sun shapes behind the glass: a hint of a tree and a tower outline
        ctx.fillStyle = 'rgba(255,250,220,0.9)';
        ctx.beginPath(); ctx.arc(cx + 30, yArc - 30, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(190,110,40,0.45)';
        ctx.fillRect(cx - 70, yb - 46, 40, 46);
        ctx.fillRect(cx - 62, yb - 66, 24, 20);
        ctx.beginPath(); ctx.arc(cx + 38, yb - 36, 28, 0, Math.PI * 2); ctx.fill();
        // mullions
        ctx.strokeStyle = '#8a5226';
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(cx, yArc - 92); ctx.lineTo(cx, yb); ctx.stroke();
        ctx.lineWidth = 6;
        [yArc + 10, yArc + 100, yArc + 190].forEach(function (yy) { ctx.beginPath(); ctx.moveTo(wx0, yy); ctx.lineTo(wx1, yy); ctx.stroke(); });
        for (var f = 1; f < 4; f++) {
          var a = Math.PI + (f * Math.PI) / 4;
          ctx.beginPath(); ctx.moveTo(cx, yArc); ctx.lineTo(cx + Math.cos(a) * 92, yArc + Math.sin(a) * 92); ctx.stroke();
        }
        // frame highlight
        ctx.strokeStyle = '#c99a4c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(wx0 - 5, yb); ctx.lineTo(wx0 - 5, yArc); ctx.arc(cx, yArc, 97, Math.PI, 0); ctx.lineTo(wx1 + 5, yb);
        ctx.stroke();
        // keystone
        ctx.fillStyle = '#d9b46a';
        ctx.fillRect(cx - 12, yArc - 118, 24, 28);
        // framed pictures either side
        [[bx + 56, 'A'], [bx + 328, 'あ']].forEach(function (f2, fi) {
          var fy = Y(3.7);
          ctx.fillStyle = '#b9733a';
          ctx.fillRect(f2[0] - 24, fy, 48, 62);
          ctx.fillStyle = fi ? '#ffe0a0' : '#cfe8d8';
          ctx.fillRect(f2[0] - 19, fy + 5, 38, 52);
          ctx.fillStyle = fi ? '#b8402f' : '#2f7f6a';
          ctx.font = '900 34px ' + FONT;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(f2[1], f2[0], fy + 33);
        });
      }
      // pilasters between the bays
      ctx.fillStyle = '#ecd29c';
      ctx.fillRect(bx - 12, Y(5.85), 24, Y(1.0) - Y(5.85));
      ctx.fillStyle = 'rgba(160,110,40,0.22)';
      ctx.fillRect(bx - 5, Y(5.7), 3, Y(1.2) - Y(5.7));
      ctx.fillRect(bx + 2, Y(5.7), 3, Y(1.2) - Y(5.7));
      ctx.fillStyle = '#f7e2ac';
      ctx.fillRect(bx - 17, Y(5.9), 34, 14);
      ctx.fillRect(bx - 17, Y(1.15), 34, 12);
    }
    // wainscot: walnut panels with raised insets, 0 .. 1.0
    ctx.fillStyle = '#b36a34';
    ctx.fillRect(0, Y(1.0), w, 1.0 * P);
    for (var p = 0; p < 8; p++) {
      var px = p * 192 + 18;
      ctx.fillStyle = '#8f5328';
      ctx.fillRect(px - 3, Y(0.88) - 3, 160 + 6, 0.62 * P + 6);
      ctx.fillStyle = '#d28f50';
      ctx.fillRect(px, Y(0.88), 160, 0.62 * P);
      ctx.fillStyle = 'rgba(255,230,170,0.35)';
      ctx.fillRect(px, Y(0.88), 160, 5);
    }
    ctx.fillStyle = '#f0d9a2';
    ctx.fillRect(0, Y(1.0) - 2, w, 12);
    ctx.fillStyle = '#d6b36a';
    ctx.fillRect(0, Y(1.0) + 8, w, 3);
    // cornice with dentils and a gold line
    ctx.fillStyle = '#f2dfb0';
    ctx.fillRect(0, 0, w, Y(5.85));
    ctx.fillStyle = '#d9b46a';
    ctx.fillRect(0, Y(5.85) - 5, w, 5);
    ctx.fillStyle = '#e2c486';
    for (var d = 0; d < w; d += 24) ctx.fillRect(d + 4, Y(5.85) - 20, 12, 15);
    ctx.fillStyle = '#e8b43e';
    ctx.fillRect(0, 22, w, 4);
    // a painted frieze of tiny words
    ctx.fillStyle = 'rgba(138,82,38,0.55)';
    ctx.font = '700 18px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var words = ['hello', 'hola', 'bonjour', 'こんにちは', 'ciao', '你好', '안녕', 'hallo'];
    for (var q = 0; q < 8; q++) ctx.fillText(words[q], q * 192 + 96, 56);
  });
}

function floorPicture() {
  // 12 across, 16 along, 48 px to the unit: honey parquet planks and a long rug
  return canvasTex('lib_floor', 576, 768, function (ctx, w, h) {
    var r = rng(5);
    var tones = ['#e0a35e', '#d99a52', '#e8b06a', '#d4934a', '#ddA05a'];
    for (var row = 0; row < 64; row++) {
      var off = Math.floor(r() * 72);
      for (var x = -off; x < w; x += 72) {
        ctx.fillStyle = tones[Math.floor(r() * tones.length)];
        ctx.fillRect(x + 1, row * 12 + 1, 70, 10);
        ctx.fillStyle = 'rgba(255,240,200,0.28)';
        ctx.fillRect(x + 1, row * 12 + 1, 70, 2);
        ctx.fillStyle = 'rgba(120,60,20,0.16)';
        ctx.fillRect(x + 8 + r() * 30, row * 12 + 5, 18, 1);
      }
    }
    // long rug: x from 1.0 to 11.0 units
    var rx0 = 48;
    var rx1 = w - 48;
    ctx.fillStyle = '#fff1d2';
    ctx.fillRect(rx0 - 6, 0, rx1 - rx0 + 12, h);
    ctx.fillStyle = '#c9573a';
    ctx.fillRect(rx0, 0, rx1 - rx0, h);
    ctx.fillStyle = '#f2c35a';
    ctx.fillRect(rx0 + 10, 0, 4, h);
    ctx.fillRect(rx1 - 14, 0, 4, h);
    ctx.fillStyle = '#2f7f86';
    ctx.fillRect(rx0 + 20, 0, 12, h);
    ctx.fillRect(rx1 - 32, 0, 12, h);
    // the field
    var fx0 = rx0 + 42;
    var fx1 = rx1 - 42;
    ctx.fillStyle = '#f0cfa0';
    ctx.fillRect(fx0, 0, fx1 - fx0, h);
    // lattice and medallions (period 384 px = 8 units)
    ctx.strokeStyle = '#e0a46a';
    ctx.lineWidth = 3;
    for (var m = 0; m < 2; m++) {
      var my = m * 384;
      for (var k = -1; k <= 1; k++) {
        var cx = w / 2 + k * 144;
        ctx.fillStyle = k === 0 ? '#2f7f86' : '#e9b878';
        ctx.beginPath(); ctx.moveTo(cx, my + 192 - 78); ctx.lineTo(cx + 54, my + 192); ctx.lineTo(cx, my + 192 + 78); ctx.lineTo(cx - 54, my + 192); ctx.closePath(); ctx.fill();
        ctx.fillStyle = k === 0 ? '#f6dc8c' : '#c9573a';
        ctx.beginPath(); ctx.moveTo(cx, my + 192 - 36); ctx.lineTo(cx + 26, my + 192); ctx.lineTo(cx, my + 192 + 36); ctx.lineTo(cx - 26, my + 192); ctx.closePath(); ctx.fill();
      }
      for (var y2 = 0; y2 <= 384; y2 += 96) {
        ctx.beginPath(); ctx.moveTo(fx0, my + y2); ctx.lineTo(fx1, my + y2); ctx.stroke();
      }
    }
    // brass strips along the walls
    ctx.fillStyle = '#f0d79a';
    ctx.fillRect(0, 0, 14, h);
    ctx.fillRect(w - 14, 0, 14, h);
  });
}

function ceilingPicture() {
  // 11.6 across x 16 along at 40 px to the unit: coffers in walnut beams, cream plaster, a gold rosette in each
  return canvasTex('lib_ceiling', 464, 640, function (ctx, w, h) {
    ctx.fillStyle = '#fff0cc';
    ctx.fillRect(0, 0, w, h);
    var bw = 12;
    var cw = w / 3;
    var ch = 160;
    for (var j = 0; j < 4; j++) {
      for (var i = 0; i < 3; i++) {
        var x = i * cw;
        var y = j * ch;
        var gr = ctx.createRadialGradient(x + cw / 2, y + ch / 2, 4, x + cw / 2, y + ch / 2, 90);
        gr.addColorStop(0, '#fffbe6');
        gr.addColorStop(1, '#f5deaa');
        ctx.fillStyle = gr;
        ctx.fillRect(x + bw, y + bw, cw - bw * 2, ch - bw * 2);
        ctx.fillStyle = '#e8b43e';
        ctx.beginPath(); ctx.arc(x + cw / 2, y + ch / 2, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff1c0';
        ctx.beginPath(); ctx.arc(x + cw / 2, y + ch / 2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#d9b46a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + bw + 4, y + bw + 4, cw - bw * 2 - 8, ch - bw * 2 - 8);
      }
    }
    ctx.fillStyle = '#a8602c';
    for (var bj = 0; bj < 4; bj++) ctx.fillRect(0, bj * ch - bw / 2 + (bj === 0 ? bw / 2 : 0), w, bw);
    ctx.fillRect(0, h - bw / 2, w, bw / 2);
    for (var bi = 0; bi <= 3; bi++) ctx.fillRect(bi * cw - (bi === 3 ? bw : bi === 0 ? 0 : bw / 2), 0, bw, h);
    ctx.fillStyle = '#d28f50';
    for (var bk = 0; bk < 4; bk++) ctx.fillRect(0, bk * ch - bw / 2 + (bk === 0 ? bw / 2 : 0), w, 3);
  });
}

function globeTex() {
  return canvasTex('lib_globe', 128, 64, function (ctx, w, h) {
    ctx.fillStyle = '#4f9fc8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8c36a';
    [[18, 22, 14, 10], [44, 30, 10, 14], [66, 18, 20, 9], [92, 28, 12, 10], [110, 40, 9, 7], [30, 46, 12, 6]].forEach(function (c) {
      ctx.beginPath(); ctx.ellipse(c[0], c[1], c[2], c[3], 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#6fbf6a';
    [[20, 20, 8, 6], [66, 17, 11, 5], [44, 30, 5, 8]].forEach(function (c) {
      ctx.beginPath(); ctx.ellipse(c[0], c[1], c[2], c[3], 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (var i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16, h); ctx.stroke(); }
    for (var j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(0, j * 16); ctx.lineTo(w, j * 16); ctx.stroke(); }
  });
}

function haloTex() {
  return canvasTex('lib_halo', 64, 64, function (ctx, w, h) {
    var g = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,240,190,0.95)');
    g.addColorStop(0.4, 'rgba(255,214,120,0.5)');
    g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function beamTex() {
  // a shaft of light: bright at the window end (top), fading toward the floor and the sides
  return canvasTex('lib_beam', 64, 128, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,238,170,0.85)');
    g.addColorStop(1, 'rgba(255,238,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    var s = ctx.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, 'rgba(0,0,0,1)');
    s.addColorStop(0.25, 'rgba(0,0,0,0)');
    s.addColorStop(0.75, 'rgba(0,0,0,0)');
    s.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
}

// ---------- shared materials ----------

var _lamp = null;
function lampMat() {
  return _lamp || (_lamp = mat(0xffc24a, { e: 0xffa826, ei: 0.7, r: 0.5 }));
}
var _halo = null;
function haloMat() {
  var tex = haloTex();
  return _halo || (tex ? (_halo = bulb(0xffffff, { map: tex, add: true, side: THREE.DoubleSide })) : bulb(0xffd68a, { add: true, op: 0.3, side: THREE.DoubleSide }));
}

function halo(g, size, x, y, z, ry) {
  var m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), haloMat());
  m.position.set(x, y, z);
  m.rotation.y = ry || 0;
  g.add(m);
  return m;
}

// ---------- the pieces ----------

function shelves(g, S, z, k) {
  var d = 0.5;
  var fx = S.in(d / 2 + 0.03);
  var r = rng(70 + k * 13);
  // planks that stand out from the painted books, end boards, and a cornice
  for (var i = 0; i < 6; i++) box(g, d, 0.08, 3.5, WOOD_LIGHT, fx, 1.0 + 0.9 * i, z, { r: 0.7 });
  [-1.77, 1.77].forEach(function (dz) { box(g, d, 4.7, 0.1, WOOD, fx, 3.35, z + dz, { r: 0.7 }); });
  box(g, d + 0.14, 0.18, 3.8, STONE, S.in((d + 0.14) / 2), 5.72, z);
  // real books standing on three of the shelves
  [0, 2, 4].forEach(function (row, ri) {
    var y = 1.04 + 0.9 * row;
    var zz = z - 1.65;
    var n = 0;
    while (zz < z + 1.6 && n < 20) {
      var bw = 0.08 + r() * 0.1;
      var bh = 0.36 + r() * 0.2;
      var c = SPINES[Math.floor(r() * SPINES.length)];
      var lean = r() > 0.92 ? 0.25 : 0;
      box(g, 0.3, bh, bw, c, S.in(0.22), y + bh / 2, zz + bw / 2, { rx: lean, r: 0.8 });
      zz += bw + 0.01 + (r() > 0.85 ? 0.12 : 0);
      n++;
    }
    if (ri === 1) box(g, 0.26, 0.05, 0.4, 0xf2e0b0, S.in(0.24), y + 0.03, z + 1.35, { r: 0.8 });
  });
}

function ladder(g, S, z) {
  // a brass rail along the top, and a wooden ladder that rolls along it
  var railX = S.in(0.62);
  cyl(g, 0.03, 0.03, 3.6, BRASS, railX, 5.35, z, { rx: Math.PI / 2, seg: 6, m: 0.5, r: 0.35 });
  [-1.6, 1.6].forEach(function (dz) { box(g, 0.1, 0.04, 0.05, BRASS, S.in(0.55), 5.4, z + dz, { m: 0.5 }); });
  var lean = 0.1;
  var bottomX = railX - S.side * 0.5; // toward the lanes, clear of the lane edge
  var lz = z + 0.2;
  [-0.3, 0.3].forEach(function (dz) {
    box(g, 0.06, 5.45, 0.06, WOOD, (railX + bottomX) / 2, 2.68, lz + dz, { rz: -S.side * lean, r: 0.7 });
  });
  for (var i = 0; i < 9; i++) {
    var t = (0.35 + i * 0.58) / 5.45;
    var rx = bottomX + (railX - bottomX) * t;
    box(g, 0.05, 0.05, 0.6, i % 2 ? WOOD_LIGHT : BRASS, rx, 0.35 + i * 0.58, lz, { m: i % 2 ? 0 : 0.4 });
  }
  box(g, 0.14, 0.14, 0.08, BRASS, railX, 5.3, lz - 0.3, { m: 0.5 });
  box(g, 0.14, 0.14, 0.08, BRASS, railX, 5.3, lz + 0.3, { m: 0.5 });
}

function windowPiece(g, S, z) {
  var turn = S.turn;
  var x = S.in(0.03);
  // stone jambs, an arch of stone in relief, a keystone and the sill
  [-0.97, 0.97].forEach(function (dz) { box(g, 0.14, 2.75, 0.2, STONE, x, 2.72, z + dz); });
  ring(g, 0.97, 0.1, STONE, x, 4.1, z, { arc: Math.PI, ry: turn, seg: 14, tube: 5 });
  box(g, 0.2, 0.3, 0.3, 0xd9b46a, x, 5.12, z);
  box(g, 0.4, 0.1, 2.4, STONE, S.in(0.2), 1.3, z);
  // plaque above
  sign(g, 'HELLO · HOLA · 你好', 0xfff0c8, 0x8a5226, 1.7, 0.32, S.in(0.02), 5.5, z, { ry: turn, border: 0xb9733a, tw: 384, th: 72 });
}

function lampAt(g, x, y, z, ry, s) {
  // a brass desk lamp with a glowing amber shade
  var k = s || 1;
  cyl(g, 0.12 * k, 0.14 * k, 0.05 * k, BRASS, x, y + 0.025 * k, z, { seg: 8, m: 0.5, r: 0.35 });
  cyl(g, 0.018 * k, 0.018 * k, 0.4 * k, BRASS, x, y + 0.22 * k, z, { seg: 5, m: 0.5 });
  cyl(g, 0.07 * k, 0.17 * k, 0.2 * k, 0xffc24a, x, y + 0.5 * k, z, { seg: 8, mat: lampMat() });
  halo(g, 0.9 * k, x, y + 0.5 * k, z, ry);
}

function readingDesk(g, S, z) {
  var x = S.in(0.5);
  box(g, 0.85, 0.07, 1.8, WOOD_LIGHT, x, 0.8, z, { r: 0.6 });
  box(g, 0.78, 0.5, 1.7, WOOD, x, 0.5, z, { r: 0.7 });
  [[-0.8, -0.34], [-0.8, 0.34], [0.8, -0.34], [0.8, 0.34]].forEach(function (p) { box(g, 0.07, 0.8, 0.07, WOOD_DARK, x + p[1], 0.4, z + p[0]); });
  // an open book, a stack and a quill pot
  var tilt = 0.18;
  box(g, 0.4, 0.04, 0.34, 0xfff6dc, S.in(0.5) + S.side * 0.05, 0.86, z - 0.45, { rz: S.side * tilt, ry: 0, r: 0.9 });
  box(g, 0.4, 0.04, 0.34, 0xfff6dc, S.in(0.5) - S.side * 0.05, 0.86, z - 0.45, { rz: -S.side * tilt, r: 0.9 });
  box(g, 0.44, 0.03, 0.76, RUST, x, 0.835, z - 0.45, { r: 0.8 });
  box(g, 0.34, 0.06, 0.42, 0x2f7f6a, x, 0.87, z + 0.35, { r: 0.8 });
  box(g, 0.32, 0.06, 0.4, 0xd9962e, x, 0.93, z + 0.35, { ry: 0.3, r: 0.8 });
  cyl(g, 0.05, 0.05, 0.12, 0x2c6f9a, x + S.side * 0.2, 0.9, z + 0.75, { seg: 6 });
  lampAt(g, S.in(0.72), 0.835, z - 0.05, S.turn, 1.15);
  // a stool
  cyl(g, 0.22, 0.2, 0.08, RUST, S.in(0.15) - S.side * 0.7, 0.5, z + 0.05, { seg: 8 });
  [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].forEach(function (p) { box(g, 0.05, 0.46, 0.05, WOOD_DARK, S.in(0.15) - S.side * 0.7 + p[0], 0.23, z + 0.05 + p[1]); });
}

function globe(g, S, z) {
  var x = S.in(0.62);
  cyl(g, 0.3, 0.34, 0.06, WOOD_DARK, x, 0.03, z, { seg: 10 });
  cyl(g, 0.045, 0.06, 0.95, WOOD, x, 0.5, z, { seg: 6 });
  ring(g, 0.6, 0.03, BRASS, x, 1.45, z, { ry: S.turn, seg: 18, tube: 4, m: 0.5, rz: 0.4 });
  var t = globeTex();
  var gb = ball(g, 0.5, 0xffffff, x, 1.45, z, { map: t, r: 0.5, seg: 14 });
  if (!t) gb.material = mat(0x4f9fc8);
  gb.rotation.y = 1.0;
  gb.rotation.z = 0.4;
}

function stack(g, S, z) {
  // dictionaries stacked on the floor
  var x = S.in(0.4);
  var cols = [RUST, 0x2c6f9a, 0xd9962e, 0x2f7f6a, 0xb8402f];
  for (var i = 0; i < 5; i++) box(g, 0.5 - i * 0.02, 0.15, 0.7 - i * 0.03, cols[i], x, 0.08 + i * 0.16, z + 1.2, { ry: (i - 2) * 0.12, r: 0.8 });
  box(g, 0.34, 0.03, 0.5, 0xfff6dc, x, 0.9, z + 1.2, { ry: 0.2 });
  for (var j = 0; j < 3; j++) box(g, 0.45, 0.13, 0.62, cols[(j + 2) % 5], S.in(0.4), 0.07 + j * 0.14, z - 1.3, { ry: 0.4 + j * 0.1, r: 0.8 });
}

function armchair(g, S, z) {
  var x = S.in(0.55);
  var c = 0xc65a3c;
  box(g, 0.8, 0.28, 1.0, c, x, 0.36, z, { r: 0.9 });
  box(g, 0.2, 0.75, 1.0, c, x + S.side * 0.3, 0.7, z, { r: 0.9 });
  box(g, 0.8, 0.45, 0.18, c, x, 0.55, z - 0.5, { r: 0.9 });
  box(g, 0.8, 0.45, 0.18, c, x, 0.55, z + 0.5, { r: 0.9 });
  box(g, 0.55, 0.12, 0.76, 0xe8795a, x - S.side * 0.05, 0.56, z, { r: 0.9 });
  [[-0.35, -0.4], [0.35, -0.4], [-0.35, 0.4], [0.35, 0.4]].forEach(function (p) { cyl(g, 0.04, 0.03, 0.18, WOOD_DARK, x + p[0], 0.1, z + p[1], { seg: 5 }); });
  // floor lamp beside it
  var lx = S.in(0.4);
  var lz = z + 1.45;
  cyl(g, 0.16, 0.18, 0.05, BRASS, lx, 0.03, lz, { seg: 8, m: 0.5, r: 0.35 });
  cyl(g, 0.025, 0.025, 1.7, BRASS, lx, 0.9, lz, { seg: 5, m: 0.5 });
  cyl(g, 0.16, 0.3, 0.38, 0xffc24a, lx, 1.95, lz, { seg: 10, mat: lampMat() });
  halo(g, 1.7, lx, 1.95, lz, S.turn);
  // a small round table with a cup of tea and a book
  var tx = S.in(0.4);
  var tz = z - 1.45;
  cyl(g, 0.28, 0.28, 0.05, WOOD_LIGHT, tx, 0.62, tz, { seg: 10 });
  cyl(g, 0.04, 0.06, 0.6, WOOD, tx, 0.3, tz, { seg: 5 });
  cyl(g, 0.2, 0.2, 0.03, WOOD_DARK, tx, 0.02, tz, { seg: 8 });
  cyl(g, 0.06, 0.045, 0.08, 0xffffff, tx, 0.69, tz + 0.05, { seg: 8 });
  box(g, 0.2, 0.05, 0.28, 0x2c6f9a, tx, 0.67, tz - 0.08, { ry: 0.5 });
}

function beams(g, S, z, k) {
  // light shafts slanting from each window into the hall; high enough to pass over the lanes
  var tex = beamTex();
  if (!tex || (k !== 1 && k !== 3)) return;
  var m = bulb(0xffffff, { map: tex, add: true, side: THREE.DoubleSide, op: 0.5 });
  var len = 3.6;
  var q = new THREE.Mesh(new THREE.PlaneGeometry(1.5, len), m);
  var a = 0.62; // lean toward the hall
  q.rotation.set(0, S.turn, S.side * a);
  q.rotation.order = 'YXZ';
  q.position.set(S.in(0.1) - S.side * (Math.sin(a) * len * 0.5), 4.4 - Math.cos(a) * len * 0.5 + 0.3, z);
  g.add(q);
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(), side, z, H, 0.0, { r: 0.9, e: 0xfff1cc, ei: 0.12 });
  if (k % 2 === 0) shelves(g, S, z, k);
  else windowPiece(g, S, z);
  if (k === 0) ladder(g, S, z);
  else if (k === 1) readingDesk(g, S, z);
  else if (k === 2) { globe(g, S, z - 0.1); stack(g, S, z); }
  else armchair(g, S, z);
  beams(g, S, z, k);
  // a brass strip along the foot of the wall
  box(g, 0.06, 0.12, 4, BRASS, S.in(0.03), 0.08, z, { m: 0.4, r: 0.4 });
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12, { r: 0.55, env: 0.3 });
  ceilingPanel(g, ceilingPicture(), z, 11.6, H);
}

function arch(g, z, i) {
  var y = H - 0.5;
  // a carved beam across the hall, with a swag of bunting
  box(g, 11, 0.38, 0.4, WOOD, 0, y, z, { r: 0.7 });
  box(g, 11, 0.07, 0.46, BRASS, 0, y - 0.22, z, { m: 0.5, r: 0.4 });
  g.add(bunting(10, [0xd9573a, 0xf2c35a, 0x2f7f86, 0xfff1d0, 0xb8402f], 0.55, y - 0.28, z + 0.3, 0.5));
  // brass lanterns hang over the edges of the hall (high above the lanes)
  [-1, 1].forEach(function (s, n) {
    var x = s * 4.3;
    cyl(g, 0.012, 0.012, 1.0, BRASS, x, y - 0.7, z, { seg: 3 });
    cone(g, 0.2, 0.18, BRASS, x, y - 1.3, z, { seg: 6, m: 0.5 });
    cyl(g, 0.16, 0.16, 0.34, 0xffc24a, x, y - 1.55, z, { seg: 6, mat: lampMat() });
    cone(g, 0.16, 0.12, BRASS, x, y - 1.8, z, { seg: 6, rx: Math.PI, m: 0.5 });
    halo(g, 1.6, x, y - 1.55, z, 0);
    // a hanging letter banner
    var letter = ['A', 'あ', 'Я', 'ع', '한', 'ß'][(i + n * 2) % 6];
    cyl(g, 0.012, 0.012, 0.4, 0x8a5226, x + s * 0.8, y - 0.55, z, { seg: 3 });
    sign(g, letter, [RUST, 0x2f7f86, 0xd9962e][(i + n) % 3], 0xfff6dc, 0.6, 0.9, x + s * 0.8, y - 1.2, z, { tw: 96, th: 144 });
  });
}

function extras() {
  // loose pages fluttering beside the walls
  var page = combine([
    { geo: new THREE.BoxGeometry(0.32, 0.015, 0.42), color: 0xfff6dc, matrix: xform(-0.15, 0.03, 0, 0, 0, -0.35) },
    { geo: new THREE.BoxGeometry(0.32, 0.015, 0.42), color: 0xf6e2b0, matrix: xform(0.15, 0.03, 0, 0, 0, 0.35) },
    { geo: new THREE.BoxGeometry(0.2, 0.02, 0.03), color: 0xc9573a, matrix: xform(-0.16, 0.05, 0.1, 0, 0, -0.35) },
    { geo: new THREE.BoxGeometry(0.16, 0.02, 0.02), color: 0x8a5226, matrix: xform(-0.15, 0.05, -0.02, 0, 0, -0.35) }
  ]);
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: page, count: 9, seed: 21 + i * 17, area: { x: [side * 3.9, side * 5.0], y: [1.8, 5.3], z: [-130, 8] }, k: 1, vy: [0.05, 0.25], vx: [-0.1, 0.1], wobble: 0.35, flap: 0.8, scale: [1.2, 1.9], colors: [0xffffff, 0xfff0c8, 0xffe0b0] });
  });
  // a few floating open books, higher up
  var book = combine([
    { geo: new THREE.BoxGeometry(0.3, 0.04, 0.4), color: 0xfff6dc, matrix: xform(-0.16, 0.06, 0, 0, 0, -0.3) },
    { geo: new THREE.BoxGeometry(0.3, 0.04, 0.4), color: 0xfff6dc, matrix: xform(0.16, 0.06, 0, 0, 0, 0.3) },
    { geo: new THREE.BoxGeometry(0.7, 0.03, 0.44), color: 0xb8402f, matrix: xform(0, -0.02, 0) }
  ]);
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: book, count: 4, seed: 61 + i * 9, area: { x: [side * 4.0, side * 4.9], y: [4.6, 5.6], z: [-130, 8] }, k: 1, wobble: 0.3, flap: 0.5, scale: [1.5, 2.1], colors: [0xffffff, 0xffe0a0, 0xa9d8c8] });
  });
  // lamps glow gently, slower than twice a second
  if (_lamp) shimmer(_lamp, 0.7, 0.18, 1.6, 0);
}

export var w_library_hall = {
  id: 'w_library_hall',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
