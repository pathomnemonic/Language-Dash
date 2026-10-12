/**
 * w_midnight_platform.js — Midnight Platform (skin 'Ambulance Bay'; the key is kept from the original game).
 *
 * A night-train platform under a glass roof full of stars. On the left a long wine-red steam train waits with its
 * windows lit; on the right is the station: arched doors, travel posters, clocks. Every 16 units, along the platform:
 *   bay 0  a luggage cart piled with suitcases and a lamp post (right); train wheels (left)
 *   bay 1  the timetable board with a bench (right); a lamp post (left)
 *   bay 2  a big station clock and a trunk stack (right); train wheels (left)
 *   bay 3  the rubber duck on night duty, in a stationmaster's cap with a lantern (right); a lamp post (left)
 * Steam drifts from the train and cream puffs rise to the roof. Brass lamps pool warm light on the paving.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, combine, xform, mat, bulb, canvasTex,
  floorPanel, ceilingPanel, wallPanel, sideCtx, sign
} from '../mapkit.js';
import { swarm, shimmer } from '../mapfx.js';

var H = 6.4;

var NAVY = 0x233f7d;
var WINE = 0xb83a3c;
var GOLD = 0xf2b134;
var CREAM = 0xfff0cc;
var IRON = 0x2a3a5c;
var WOOD = 0xb9733a;
var BRASS = 0xe0aa3c;
var SUITCASES = [0xd9432c, 0x1f8f86, 0xf2b134, 0x3f86d6, 0x8a5a3a, 0xe0508a];
var FONT = '"Fraunces", "Noto Sans", "DejaVu Sans", "Noto Sans JP", "WenQuanYi Zen Hei", sans-serif';

function rng(seed) {
  var s = seed;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ---------- painted pictures ----------

function trainWall() {
  // the train alongside: one carriage per period, 96 px to the unit
  var P = 96;
  return canvasTex('mp_train', 1536, 614, function (ctx, w, h) {
    var Y = function (wy) { return h - wy * P; };
    // night shed wall above the train, with a few stars and strings of lights
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2f4f9a');
    sky.addColorStop(1, '#4a6fc0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    var r = rng(4);
    ctx.fillStyle = '#fff3c0';
    for (var s = 0; s < 40; s++) { ctx.beginPath(); ctx.arc(r() * w, r() * Y(4.5), 1.5 + r() * 2, 0, 6.3); ctx.fill(); }
    // carriage body
    ctx.fillStyle = '#2b2f4a';
    ctx.fillRect(0, Y(0.65), w, 0.5 * P);
    ctx.fillStyle = '#b83a3c';
    ctx.fillRect(24, Y(4.0), w - 48, Y(0.55) - Y(4.0));
    ctx.fillStyle = '#d65a4c';
    ctx.fillRect(24, Y(4.0), w - 48, 8);
    // gold lining
    ctx.fillStyle = '#f2b134';
    ctx.fillRect(24, Y(1.35), w - 48, 5);
    ctx.fillRect(24, Y(3.55), w - 48, 5);
    ctx.fillRect(24, Y(0.75), w - 48, 4);
    // roof lip
    ctx.fillStyle = '#fff0cc';
    ctx.fillRect(14, Y(4.25), w - 28, Y(4.0) - Y(4.25));
    ctx.fillStyle = '#e8c88a';
    ctx.fillRect(14, Y(4.25), w - 28, 6);
    // bellows between carriages at the seam
    ctx.fillStyle = '#1b2236';
    ctx.fillRect(0, Y(3.7), 24, Y(0.7) - Y(3.7));
    ctx.fillRect(w - 24, Y(3.7), 24, Y(0.7) - Y(3.7));
    // windows (bays 0 and 2) and doors (bays 1 and 3)
    for (var b = 0; b < 4; b++) {
      var bx = b * 384;
      if (b % 2 === 0) {
        [bx + 110, bx + 274].forEach(function (cx, wi) { trainWindow(ctx, cx, Y(3.4), 110, Y(2.0) - Y(3.4), b * 2 + wi); });
      } else {
        var cx2 = bx + 192;
        ctx.fillStyle = '#7a1f2a';
        ctx.fillRect(cx2 - 62, Y(3.5), 124, Y(0.6) - Y(3.5));
        ctx.fillStyle = '#e8c88a';
        ctx.fillRect(cx2 - 54, Y(3.4), 108, Y(0.7) - Y(3.4));
        // the glowing door window and a brass handle
        var gl = ctx.createLinearGradient(0, Y(3.2), 0, Y(2.2));
        gl.addColorStop(0, '#ffe08a'); gl.addColorStop(1, '#ffc24a');
        ctx.fillStyle = gl;
        ctx.fillRect(cx2 - 38, Y(3.2), 76, Y(2.1) - Y(3.2));
        ctx.fillStyle = '#7a1f2a';
        ctx.fillRect(cx2 - 2, Y(3.2), 4, Y(2.1) - Y(3.2));
        ctx.fillStyle = '#f2b134';
        ctx.fillRect(cx2 + 12, Y(1.9), 8, 30);
        // a plate with the carriage number
        ctx.fillStyle = '#fff0cc';
        ctx.fillRect(cx2 - 30, Y(1.2) - 4, 60, 26);
        ctx.fillStyle = '#7a1f2a';
        ctx.font = '800 18px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b === 1 ? 'N° 12' : '第7', cx2, Y(1.2) + 9);
      }
    }
    // a destination board on the carriage side
    ctx.fillStyle = '#fff0cc';
    ctx.fillRect(w / 2 - 96, Y(3.52) + 1, 192, 0);
  });
}

function trainWindow(ctx, cx, y, w, h, n) {
  ctx.fillStyle = '#fff0cc';
  ctx.fillRect(cx - w / 2 - 7, y - 7, w + 14, h + 14);
  var g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#ffe58f');
  g.addColorStop(1, '#ffb83e');
  ctx.fillStyle = g;
  ctx.fillRect(cx - w / 2, y, w, h);
  // a passenger, a hat or a duck, as dark silhouettes
  ctx.fillStyle = '#5a2a2a';
  var kind = n % 4;
  if (kind === 0 || kind === 2) {
    ctx.beginPath(); ctx.arc(cx - 14, y + h * 0.5, 15, 0, 6.3); ctx.fill();
    ctx.fillRect(cx - 40, y + h * 0.5 + 12, 52, h);
    if (kind === 2) { ctx.fillRect(cx - 32, y + h * 0.5 - 22, 36, 7); ctx.fillRect(cx - 24, y + h * 0.5 - 32, 20, 12); }
  } else if (kind === 1) {
    ctx.beginPath(); ctx.arc(cx + 18, y + h * 0.55, 13, 0, 6.3); ctx.fill();
    ctx.fillRect(cx - 4, y + h * 0.55 + 10, 46, h);
    ctx.fillStyle = '#d9432c'; ctx.fillRect(cx - 40, y + h - 30, 30, 30);
  } else {
    // the duck, yellow in the window
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx, y + h - 20, 26, 18, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff6a0'; ctx.beginPath(); ctx.arc(cx + 14, y + h - 42, 13, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.moveTo(cx + 24, y + h - 42); ctx.lineTo(cx + 38, y + h - 38); ctx.lineTo(cx + 24, y + h - 34); ctx.fill();
  }
  // curtains and frame bars
  ctx.fillStyle = '#e0508a';
  ctx.fillRect(cx - w / 2, y, 14, h * 0.55);
  ctx.fillRect(cx + w / 2 - 14, y, 14, h * 0.55);
  ctx.fillStyle = '#7a1f2a';
  ctx.fillRect(cx - 2, y, 4, h);
}

function stationWall() {
  var P = 96;
  return canvasTex('mp_station', 1536, 614, function (ctx, w, h) {
    var Y = function (wy) { return h - wy * P; };
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6dca0');
    g.addColorStop(1, '#ecc47a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // brick courses on the plaster
    ctx.strokeStyle = 'rgba(160,100,40,0.22)';
    ctx.lineWidth = 2;
    for (var by = 0; by < 16; by++) {
      var yy = Y(1.2) - by * 30;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
    }
    for (var b = 0; b < 4; b++) {
      var bx = b * 384;
      var cx = bx + 192;
      if (b === 0) {
        // an arched doorway to the street, with a gold sign
        archDoor(ctx, cx, Y(0.0), Y(3.4), 78, '#233f7d');
        ctx.fillStyle = '#fff0cc';
        ctx.fillRect(cx - 62, Y(4.9), 124, 36);
        ctx.fillStyle = '#233f7d';
        ctx.font = '800 22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('EXIT · SORTIE · 出口', cx, Y(4.9) + 19);
      } else if (b === 1) {
        // travel posters
        poster(ctx, bx + 36, Y(4.4), 100, 150, '#ffb347', 'PARIS', 0);
        poster(ctx, bx + 160, Y(4.6), 100, 150, '#66c7b5', 'KYOTO', 1);
        poster(ctx, bx + 282, Y(4.3), 90, 140, '#ff8f7a', 'ROMA', 2);
      } else if (b === 2) {
        // a big lit arched window
        archDoor(ctx, cx, Y(1.3), Y(3.9), 84, '#ffd77a');
        ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(cx, Y(3.9) - 84); ctx.lineTo(cx, Y(1.3)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 84, Y(2.6)); ctx.lineTo(cx + 84, Y(2.6)); ctx.stroke();
      } else {
        // the stationmaster's door and a notice board
        archDoor(ctx, cx - 70, Y(0.0), Y(3.2), 52, '#1f8f86');
        ctx.fillStyle = '#fff0cc';
        ctx.fillRect(cx - 124, Y(4.4), 110, 34);
        ctx.fillStyle = '#7a1f2a';
        ctx.font = '800 17px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('STATIONMASTER', cx - 69, Y(4.4) + 18);
        ctx.fillStyle = '#7a4a22';
        ctx.fillRect(cx + 40, Y(3.9), 130, 150);
        ctx.fillStyle = '#d8a468';
        ctx.fillRect(cx + 46, Y(3.9) + 6, 118, 138);
        ['#fff6dc', '#bff0e4', '#ffe27a', '#ffb3a0'].forEach(function (c, i) {
          ctx.fillStyle = c; ctx.fillRect(cx + 54 + (i % 2) * 54, Y(3.9) + 16 + Math.floor(i / 2) * 62, 46, 54);
          ctx.fillStyle = '#233f7d'; ctx.font = '800 20px ' + FONT; ctx.fillText(['こ', '你', 'П', 'hi'][i], cx + 77 + (i % 2) * 54, Y(3.9) + 44 + Math.floor(i / 2) * 62);
        });
      }
      ctx.fillStyle = '#fff0cc';
      ctx.fillRect(bx - 12, Y(5.6), 24, Y(1.2) - Y(5.6));
      ctx.fillStyle = '#1f8f86';
      ctx.fillRect(bx - 16, Y(5.65), 32, 10);
    }
    // teal tile wainscot
    ctx.fillStyle = '#1f8f86';
    ctx.fillRect(0, Y(1.2), w, 1.2 * P);
    ctx.strokeStyle = '#146b64'; ctx.lineWidth = 2;
    for (var tx = 0; tx < 64; tx++) { ctx.beginPath(); ctx.moveTo(tx * 24, Y(1.2)); ctx.lineTo(tx * 24, h); ctx.stroke(); }
    for (var ty = 0; ty < 5; ty++) { ctx.beginPath(); ctx.moveTo(0, Y(1.2) + ty * 23); ctx.lineTo(w, Y(1.2) + ty * 23); ctx.stroke(); }
    ctx.fillStyle = '#fff0cc';
    ctx.fillRect(0, Y(1.2) - 8, w, 10);
    // cornice with the station name
    ctx.fillStyle = '#233f7d';
    ctx.fillRect(0, 0, w, Y(5.65));
    ctx.fillStyle = '#f2b134';
    ctx.fillRect(0, Y(5.65) - 5, w, 5);
    ctx.fillStyle = '#fff0cc';
    ctx.font = '800 26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var names = ['MIDNIGHT EXPRESS', '午夜', 'MITTERNACHT', 'ПОЛНОЧЬ'];
    for (var q = 0; q < 4; q++) ctx.fillText(names[q], q * 384 + 192, Y(5.65) / 2);
  });
}

function archDoor(ctx, cx, yb, yTop, hw, color) {
  ctx.fillStyle = '#fff0cc';
  ctx.beginPath(); ctx.moveTo(cx - hw - 10, yb); ctx.lineTo(cx - hw - 10, yTop); ctx.arc(cx, yTop, hw + 10, Math.PI, 0); ctx.lineTo(cx + hw + 10, yb); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(cx - hw, yb); ctx.lineTo(cx - hw, yTop); ctx.arc(cx, yTop, hw, Math.PI, 0); ctx.lineTo(cx + hw, yb); ctx.closePath(); ctx.fill();
  if (color === '#ffd77a') {
    var g = ctx.createLinearGradient(0, yTop - hw, 0, yb);
    g.addColorStop(0, '#ffe58f'); g.addColorStop(1, '#ffb83e');
    ctx.fillStyle = g; ctx.fill();
  }
}

function poster(ctx, x, y, w, h, color, text, kind) {
  ctx.fillStyle = '#7a4a22';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fff0cc';
  ctx.beginPath(); ctx.arc(x + w * 0.7, y + h * 0.3, 14, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(35,63,125,0.7)';
  if (kind === 0) { ctx.fillRect(x + w * 0.4, y + h * 0.35, 8, h * 0.45); ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.8); ctx.lineTo(x + w * 0.44, y + h * 0.3); ctx.lineTo(x + w * 0.58, y + h * 0.8); ctx.fill(); } else if (kind === 1) { ctx.beginPath(); ctx.moveTo(x, y + h * 0.8); ctx.lineTo(x + w * 0.4, y + h * 0.4); ctx.lineTo(x + w, y + h * 0.8); ctx.fill(); } else { ctx.fillRect(x + w * 0.2, y + h * 0.45, w * 0.6, h * 0.35); ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.45, w * 0.3, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = '#fff0cc';
  ctx.fillRect(x, y + h - 30, w, 30);
  ctx.fillStyle = '#233f7d';
  ctx.font = '800 18px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h - 14);
}

function floorPicture() {
  // 12 across, 16 along at 48 px: warm paving, hazard strip on the train side, pools of lamp light
  return canvasTex('mp_floor', 576, 768, function (ctx, w, h) {
    var r = rng(12);
    var tones = ['#e6c28e', '#dcb47c', '#ebca98', '#d8ae76'];
    for (var j = 0; j < 16; j++) {
      for (var i = 0; i < 12; i++) {
        ctx.fillStyle = tones[Math.floor(r() * 4)];
        ctx.fillRect(i * 48 + 1, j * 48 + 1, 46, 46);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(i * 48 + 1, j * 48 + 1, 46, 3);
      }
    }
    // lamp light pools (lamps stand at the platform edges, every 4 units)
    [0, 1, 2, 3].forEach(function (n) {
      [60, w - 60].forEach(function (lx) {
        var cy = n * 192 + 96;
        var g = ctx.createRadialGradient(lx, cy, 4, lx, cy, 120);
        g.addColorStop(0, 'rgba(255,238,160,0.75)');
        g.addColorStop(1, 'rgba(255,230,140,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - 125, cy - 125, 250, 250);
      });
    });
    // hazard strip at the train edge and a cream strip at the station side
    for (var y = 0; y < h; y += 32) {
      ctx.fillStyle = (y / 32) % 2 ? '#f2b134' : '#233f7d';
      ctx.fillRect(0, y, 14, 32);
    }
    ctx.fillStyle = '#fff0cc';
    ctx.fillRect(w - 12, 0, 12, h);
    ctx.fillStyle = '#f2b134';
    ctx.fillRect(18, 0, 5, h);
    // MIND THE GAP stencil along the edge, once every 8 units
    ctx.save();
    ctx.fillStyle = 'rgba(35,63,125,0.55)';
    ctx.font = '800 22px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [100, 484].forEach(function (y0) {
      ctx.save(); ctx.translate(48, y0); ctx.rotate(-Math.PI / 2); ctx.fillText('MIND THE GAP · 注意', 0, 0); ctx.restore();
    });
    ctx.restore();
  });
}

function roofPicture() {
  // 11.6 across x 16 along at 40 px: a glass roof on iron ribs, with the night sky and its stars and moon
  return canvasTex('mp_roof', 464, 640, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#3a5cb0'); g.addColorStop(0.5, '#5a82d4'); g.addColorStop(1, '#3a5cb0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    var r = rng(21);
    for (var s = 0; s < 70; s++) {
      ctx.fillStyle = r() > 0.7 ? '#ffe28a' : '#ffffff';
      var rad = 1 + r() * 2.4;
      var sx = r() * w; var sy = r() * h;
      ctx.beginPath(); ctx.arc(sx, sy, rad, 0, 6.3); ctx.fill();
    }
    // a moon
    ctx.fillStyle = '#fff3c0';
    ctx.beginPath(); ctx.arc(w * 0.7, h * 0.4, 30, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#5a82d4';
    ctx.beginPath(); ctx.arc(w * 0.7 + 14, h * 0.4 - 8, 27, 0, 6.3); ctx.fill();
    // iron ribs and glazing bars
    ctx.fillStyle = '#233f7d';
    for (var j = 0; j < 4; j++) ctx.fillRect(0, j * 160 - 6, w, 12);
    for (var i = 0; i <= 3; i++) ctx.fillRect(i * (w / 3) - 3, 0, 6, h);
    ctx.fillStyle = '#f2b134';
    for (var k = 0; k < 4; k++) ctx.fillRect(0, k * 160 + 5, w, 3);
  });
}

function boardTex() {
  return canvasTex('mp_board', 512, 256, function (ctx, w, h) {
    ctx.fillStyle = '#233f7d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2b134';
    ctx.font = '800 26px ' + FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('MIDNIGHT TIMETABLE', 20, 26);
    ctx.fillStyle = '#fff0cc';
    var rows = [['23:50', 'PARIS', '1'], ['00:05', 'KYOTO 京都', '2'], ['00:20', 'BERLIN', '3'], ['00:40', 'SEOUL 서울', '4'], ['01:00', 'ROMA', '5'], ['01:15', 'MOSKVA', '6']];
    ctx.font = '700 24px ' + FONT;
    rows.forEach(function (rw, i) {
      var y = 66 + i * 31;
      ctx.fillStyle = i % 2 ? '#ffe9a8' : '#fff0cc';
      ctx.fillText(rw[0], 20, y); ctx.fillText(rw[1], 130, y);
      ctx.fillStyle = '#7ad69a'; ctx.fillText('✓', 440, y);
    });
    ctx.strokeStyle = '#f2b134'; ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  });
}

function clockTex() {
  return canvasTex('mp_clock', 128, 128, function (ctx, w, h) {
    ctx.fillStyle = '#fff6dc';
    ctx.beginPath(); ctx.arc(64, 64, 62, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#233f7d';
    for (var i = 0; i < 12; i++) { var a = (i / 12) * 6.283; ctx.beginPath(); ctx.arc(64 + Math.sin(a) * 52, 64 - Math.cos(a) * 52, i % 3 ? 3 : 5, 0, 6.3); ctx.fill(); }
    ctx.strokeStyle = '#233f7d'; ctx.lineCap = 'round';
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64, 18); ctx.stroke();
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(60, 28); ctx.stroke();
    ctx.fillStyle = '#d9432c'; ctx.beginPath(); ctx.arc(64, 64, 6, 0, 6.3); ctx.fill();
  });
}

function haloTex() {
  return canvasTex('mp_halo', 64, 64, function (ctx, w, h) {
    var g = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,244,190,0.95)');
    g.addColorStop(0.4, 'rgba(255,220,120,0.5)');
    g.addColorStop(1, 'rgba(255,210,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// ---------- shared pieces ----------

var _lamp = null;
function lampMat() { return _lamp || (_lamp = mat(0xffe08a, { e: 0xffd25a, ei: 0.8, r: 0.4 })); }
var _halo = null;
function halo(g, size, x, y, z) {
  var tex = haloTex();
  if (!_halo) _halo = tex ? bulb(0xffffff, { map: tex, add: true, side: THREE.DoubleSide }) : bulb(0xffd68a, { add: true, op: 0.3, side: THREE.DoubleSide });
  var m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), _halo);
  m.position.set(x, y, z);
  g.add(m);
}

function lampPost(g, x, z) {
  cyl(g, 0.16, 0.2, 0.2, IRON, x, 0.1, z, { seg: 8 });
  cyl(g, 0.05, 0.07, 3.3, IRON, x, 1.8, z, { seg: 6 });
  cyl(g, 0.1, 0.07, 0.15, GOLD, x, 3.4, z, { seg: 6, m: 0.4 });
  box(g, 0.34, 0.5, 0.34, 0xffe08a, x, 3.75, z, { mat: lampMat() });
  cone(g, 0.3, 0.25, IRON, x, 4.15, z, { seg: 4, ry: Math.PI / 4 });
  ball(g, 0.05, GOLD, x, 4.32, z, { seg: 5 });
  halo(g, 2.4, x, 3.75, z);
}

function suitcase(g, x, y, z, c, ry, s) {
  var k = s || 1;
  box(g, 0.34 * k, 0.5 * k, 0.7 * k, c, x, y + 0.25 * k, z, { ry: ry, r: 0.7 });
  box(g, 0.36 * k, 0.05 * k, 0.12 * k, 0x2a2118, x, y + 0.5 * k, z, { ry: ry });
  box(g, 0.36 * k, 0.44 * k, 0.04 * k, 0xfff0cc, x, y + 0.25 * k, z + 0.12 * k, { ry: ry });
}

function duck(g, x, z, S) {
  // the rubber duck on night duty: a big yellow duck in a stationmaster's cap, holding a lantern
  var y0 = 0.5;
  box(g, 0.7, 0.5, 0.7, WOOD, x, 0.25, z, { r: 0.8 });
  box(g, 0.72, 0.06, 0.72, 0xd6975a, x, 0.52, z, { r: 0.8 });
  ball(g, 0.5, 0xffd62e, x, y0 + 0.5, z, { sy: 0.9, seg: 12, r: 0.45 });
  ball(g, 0.15, 0xffd62e, x + S.side * 0.0, y0 + 0.62, z - 0.46, { seg: 7, sy: 0.7, sz: 1.4 });
  ball(g, 0.34, 0xffd62e, x, y0 + 1.15, z, { seg: 10, r: 0.45 });
  // beak, eyes and cheeks
  var bx = x - S.side * 0.3;
  box(g, 0.28, 0.07, 0.2, 0xff8a1f, bx, y0 + 1.1, z, { r: 0.5 });
  box(g, 0.24, 0.05, 0.16, 0xe8701a, bx, y0 + 1.04, z, { r: 0.5 });
  ball(g, 0.045, 0x1b2a41, x - S.side * 0.26, y0 + 1.27, z - 0.13, { seg: 5 });
  ball(g, 0.045, 0x1b2a41, x - S.side * 0.26, y0 + 1.27, z + 0.13, { seg: 5 });
  // the cap: red crown, gold band, a black peak toward the lanes
  cyl(g, 0.27, 0.3, 0.2, 0xd9432c, x, y0 + 1.5, z, { seg: 10 });
  cyl(g, 0.3, 0.3, 0.05, GOLD, x, y0 + 1.42, z, { seg: 10, m: 0.4 });
  box(g, 0.28, 0.03, 0.34, 0x1b2a41, x - S.side * 0.28, y0 + 1.4, z);
  // a lantern in its wing, and a little scarf
  var lx = x - S.side * 0.5;
  cyl(g, 0.01, 0.01, 0.3, 0x1b2a41, lx, y0 + 0.88, z + 0.38, { seg: 3 });
  box(g, 0.14, 0.2, 0.14, 0xffe08a, lx, y0 + 0.64, z + 0.38, { mat: lampMat() });
  cone(g, 0.12, 0.08, 0x1b2a41, lx, y0 + 0.78, z + 0.38, { seg: 4 });
  halo(g, 1.3, lx, y0 + 0.64, z + 0.38);
  cyl(g, 0.36, 0.36, 0.1, 0x1f8f86, x, y0 + 0.88, z, { seg: 10 });
  // a sign with a stamp
  cyl(g, 0.03, 0.03, 1.4, IRON, x, 0.7, z - 0.75, { seg: 4 });
  sign(g, 'QUACK · ALL ABOARD', CREAM, 0x7a1f2a, 1.1, 0.34, x, 1.75, z - 0.75, { ry: S.turn, border: GOLD, tw: 256, th: 80 });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  if (side < 0) {
    wallPanel(g, trainWall(), side, z, H, 0.0, { r: 0.8, e: 0xffd77a, ei: 0.18 });
    // roof lip and underframe, wheels on the bogies
    box(g, 0.5, 0.12, 4, 0xe8c88a, S.in(0.25), 4.2, z, { r: 0.7 });
    box(g, 0.3, 0.3, 4, 0x1b2236, S.in(0.15), 0.5, z);
    if (k % 2 === 0) {
      [-1.1, 1.1].forEach(function (dz) {
        cyl(g, 0.5, 0.5, 0.12, 0x1b2236, S.in(0.42), 0.55, z + dz, { rz: Math.PI / 2, seg: 14 });
        cyl(g, 0.34, 0.34, 0.14, WINE, S.in(0.46), 0.55, z + dz, { rz: Math.PI / 2, seg: 10 });
        cyl(g, 0.1, 0.1, 0.16, GOLD, S.in(0.48), 0.55, z + dz, { rz: Math.PI / 2, seg: 6, m: 0.4 });
      });
      box(g, 0.1, 0.1, 2.2, GOLD, S.in(0.5), 0.55, z, { m: 0.4 });
      // brass steam pipe along the underside
      cyl(g, 0.06, 0.06, 3.8, BRASS, S.in(0.33), 0.95, z, { rx: Math.PI / 2, seg: 6, m: 0.5 });
    } else {
      // handrails and a step at the door
      [-0.45, 0.45].forEach(function (dz) { cyl(g, 0.025, 0.025, 2.6, BRASS, S.in(0.22), 1.9, z + dz, { seg: 5, m: 0.5 }); });
      box(g, 0.4, 0.1, 1.1, 0x7a1f2a, S.in(0.3), 0.55, z);
      lampPost(g, S.in(0.85) - S.side * 0.0, z + 1.4);
    }
  } else {
    wallPanel(g, stationWall(), side, z, H, 0.0, { r: 0.8, e: 0xffe9b0, ei: 0.1 });
    if (k === 0) {
      // a luggage cart with a heap of cases, and a lamp
      var x = S.in(0.6);
      box(g, 0.8, 0.1, 1.9, WOOD, x, 0.55, z, { r: 0.7 });
      [-0.7, 0.7].forEach(function (dz) { cyl(g, 0.28, 0.28, 0.08, IRON, x - 0.42, 0.28, z + dz, { rz: Math.PI / 2, seg: 10 }); cyl(g, 0.28, 0.28, 0.08, IRON, x + 0.42, 0.28, z + dz, { rz: Math.PI / 2, seg: 10 }); });
      box(g, 0.06, 0.7, 0.06, IRON, x, 0.95, z + 1.1, { rz: 0.3 });
      box(g, 0.5, 0.06, 0.06, IRON, x, 1.3, z + 1.2);
      suitcase(g, x, 0.6, z - 0.5, SUITCASES[0], 0.1, 1.2);
      suitcase(g, x, 0.6, z + 0.3, SUITCASES[1], -0.1, 1.1);
      suitcase(g, x, 1.15, z - 0.4, SUITCASES[2], 0.2, 1.0);
      box(g, 0.5, 0.35, 0.5, SUITCASES[4], x, 1.22, z + 0.35, { r: 0.7 });
      lampPost(g, S.in(0.8), z + 1.7);
    } else if (k === 1) {
      var bt = boardTex();
      var bx = S.in(0.45);
      [-0.95, 0.95].forEach(function (dz) { cyl(g, 0.06, 0.06, 3.2, IRON, bx, 1.6, z + dz, { seg: 6 }); });
      box(g, 0.14, 1.5, 2.3, IRON, bx, 3.0, z);
      var face = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.3), bt ? bulb(0xffffff, { map: bt }) : bulb(NAVY));
      face.position.set(bx - S.side * 0.08, 3.0, z);
      face.rotation.y = S.turn;
      g.add(face);
      // a bench
      var bz = z + 0.2;
      var bnx = S.in(0.45);
      box(g, 0.5, 0.07, 1.6, WOOD, bnx, 0.5, bz, { r: 0.7 });
      box(g, 0.07, 0.55, 1.6, WOOD, bnx + S.side * 0.22, 0.85, bz, { r: 0.7 });
      [-0.7, 0.7].forEach(function (dz) { box(g, 0.45, 0.5, 0.07, IRON, bnx, 0.25, bz + dz); });
      suitcase(g, bnx, 0.54, bz - 0.4, SUITCASES[3], 0.2, 0.9);
    } else if (k === 2) {
      var ct = clockTex();
      var cx = S.in(0.18);
      cyl(g, 0.7, 0.7, 0.2, IRON, cx, 4.5, z, { rz: Math.PI / 2, seg: 20 });
      var cf = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), ct ? bulb(0xffffff, { map: ct }) : bulb(CREAM));
      cf.position.set(cx - S.side * 0.11, 4.5, z);
      cf.rotation.y = S.turn;
      g.add(cf);
      ring(g, 0.7, 0.06, GOLD, cx - S.side * 0.1, 4.5, z, { ry: S.turn, seg: 20, tube: 4, m: 0.5 });
      // a stack of trunks
      var tx = S.in(0.55);
      box(g, 0.6, 0.45, 1.3, 0x8a5a3a, tx, 0.23, z - 0.2, { r: 0.7 });
      box(g, 0.62, 0.05, 1.32, GOLD, tx, 0.46, z - 0.2, { m: 0.4 });
      box(g, 0.5, 0.4, 1.0, 0x1f8f86, tx, 0.7, z - 0.1, { ry: 0.1, r: 0.7 });
      box(g, 0.4, 0.3, 0.7, 0xd9432c, tx, 1.05, z - 0.05, { ry: -0.15, r: 0.7 });
      suitcase(g, tx, 0.0, z + 1.2, SUITCASES[5], 0.3, 1.2);
      lampPost(g, S.in(0.85), z + 1.8);
    } else {
      duck(g, S.in(0.55), z + 0.2, S);
      // a brass station bell on the wall
      cyl(g, 0.1, 0.24, 0.3, BRASS, S.in(0.2), 3.5, z - 1.4, { seg: 10, m: 0.5 });
      ball(g, 0.05, 0x1b2a41, S.in(0.2), 3.3, z - 1.4, { seg: 5 });
      lampPost(g, S.in(0.85), z + 1.8);
    }
    box(g, 0.06, 0.14, 4, GOLD, S.in(0.03), 0.09, z, { m: 0.4 });
  }
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12, { r: 0.7, env: 0.25 });
  ceilingPanel(g, roofPicture(), z, 11.6, H);
}

function arch(g, z, i) {
  var y = H - 0.4;
  // an iron truss across the platform with hanging lanterns and a string of luggage tags
  box(g, 11, 0.3, 0.3, IRON, 0, y, z);
  box(g, 11, 0.06, 0.34, GOLD, 0, y - 0.18, z, { m: 0.4 });
  [-1, 1].forEach(function (s, n) {
    var x = s * 3.9;
    cyl(g, 0.012, 0.012, 0.9, IRON, x, y - 0.6, z, { seg: 3 });
    box(g, 0.34, 0.5, 0.34, 0xffe08a, x, y - 1.3, z, { mat: lampMat() });
    cone(g, 0.3, 0.2, IRON, x, y - 1.65, z, { seg: 4, ry: Math.PI / 4, rx: Math.PI });
    cone(g, 0.3, 0.2, IRON, x, y - 0.95, z, { seg: 4, ry: Math.PI / 4 });
    halo(g, 2.2, x, y - 1.3, z);
    var txt = ['MIDNIGHT 00:00', 'PLATFORM 9', 'こんばんは', 'BONNE NUIT', 'Доброй ночи', 'GUTE NACHT'][(i + n * 3) % 6];
    sign(g, txt, [CREAM, GOLD, 0xbff0e4][(i + n) % 3], NAVY, 1.5, 0.4, s * 4.6, y - 0.9, z, { border: NAVY, tw: 320, th: 84 });
  });
  // pennant string of tickets
  for (var f = 0; f < 9; f++) {
    var t = f / 8;
    var fx = -3.2 + t * 6.4;
    var fy = y - 0.3 - Math.sin(t * Math.PI) * 0.4;
    sign(g, ['→', 'A', '→', 'あ', '→', 'Я', '→', 'ع', '→'][f], [CREAM, GOLD, 0xffb3a0, 0xbff0e4][f % 4], NAVY, 0.3, 0.38, fx, fy - 0.2, z + 0.3, { tw: 56, th: 68 });
  }
}

function extras() {
  // steam drifting from the train and up under the roof
  var puff = combine([
    { geo: new THREE.SphereGeometry(0.28, 8, 6), color: 0xffffff },
    { geo: new THREE.SphereGeometry(0.2, 7, 5), color: 0xffffff, matrix: xform(0.22, 0.12, 0.05) },
    { geo: new THREE.SphereGeometry(0.2, 7, 5), color: 0xffffff, matrix: xform(-0.2, 0.1, 0) }
  ]);
  var puffMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
  swarm({ geo: puff, material: puffMat, count: 14, seed: 77, area: { x: [-5.3, -4.5], y: [0.4, 4.2], z: [-120, 8] }, k: 1, vy: [0.25, 0.6], vx: [0.0, 0.08], wobble: 0.15, scale: [0.8, 1.6], colors: [0xffffff, 0xfff0d0] });
  // glowing moths and sparks near the lamps, and a few paper tickets blown along the platform
  var ticket = combine([
    { geo: new THREE.BoxGeometry(0.22, 0.012, 0.12), color: 0xfff0cc },
    { geo: new THREE.BoxGeometry(0.05, 0.014, 0.12), color: 0xd9432c, matrix: xform(0.08, 0, 0) }
  ]);
  swarm({ geo: ticket, count: 8, seed: 51, area: { x: [4.5, 5.2], y: [1.0, 3.8], z: [-120, 8] }, k: 1, vy: [0.02, 0.1], vz: [-1.2, -0.4], wobble: 0.3, flap: 0.9, scale: [1.5, 2.2], colors: [0xffffff, 0xffe9b0, 0xbff0e4] });
  if (_lamp) shimmer(_lamp, 0.75, 0.15, 1.7, 0);
}

export var w_midnight_platform = {
  id: 'w_midnight_platform',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
