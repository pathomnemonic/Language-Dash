/**
 * w_alphabet_playroom.js — Alphabet Playroom (skin 'Pediatric Playland', title "Alphabet Playroom"): a giant playroom
 * where everything is bigger than you.
 *
 * Every 16 units along each wall: a tower of huge wooden letter blocks (A B C), a second tower of blocks in other scripts
 * (あ ア ب), a yellow slide, and a ball pit with a giant teddy. The walls are papered pale, with a painted alphabet frieze
 * and crayon drawings taped up at child height; the floor is wood under a rainbow rug; the ceiling is a paper-cut sky. A
 * toy train carrying letter blocks circles each wall on a shelf, letter bunting hangs across the room, balloons and
 * bubbles drift by. Everything low stays outside the lanes.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, extrude, starShape, heartShape, combine, mat, canvasTex, css, sign,
  floorPanel, ceilingPanel, wallPanel, sideCtx
} from '../mapkit.js';
import { animated, mover, swarm } from '../mapfx.js';

var H = 6.4;
var RED = 0xff4d5a;
var ORANGE = 0xff9a1f;
var YELLOW = 0xffd23f;
var GREEN = 0x3fd47a;
var BLUE = 0x3d8bff;
var PINK = 0xff7ab8;
var TEAL = 0x2ec4c9;
var PURPLE = 0x9a62f0;
var RAINBOW = [RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE];
var FONT = '"Arial Rounded MT Bold", "Trebuchet MS", Arial, "Noto Sans JP", "IPAGothic", "Noto Naskh Arabic", "DejaVu Sans", sans-serif';

// ---------- painted pictures ----------

function crayon(ctx, pts, color, width) {
  // a wobbly crayon line: three slightly different passes
  for (var pass = 0; pass < 3; pass++) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = pass === 0 ? 0.9 : 0.45;
    ctx.lineWidth = width * (pass === 0 ? 1 : 0.7);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(function (p, i) {
      var jx = Math.sin(i * 12.9 + pass * 3.1) * 1.6;
      var jy = Math.cos(i * 7.7 + pass * 5.3) * 1.6;
      if (i === 0) ctx.moveTo(p[0] + jx, p[1] + jy); else ctx.lineTo(p[0] + jx, p[1] + jy);
    });
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function scribbleFill(ctx, x, y, w, h, color) {
  var pts = [];
  for (var i = 0; i < 9; i++) pts.push([x + (i % 2 ? w : 0), y + (i / 8) * h]);
  crayon(ctx, pts, color, 7);
}

function arcPts(cx, cy, r, a0, a1, n) {
  var pts = [];
  for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * (i / n); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}

function drawing(ctx, kind, x, y, w, h) {
  // a sheet of paper with tape, and a child's crayon picture on it
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(((kind * 37) % 7 - 3) * 0.012);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = 'rgba(80,60,40,0.2)'; ctx.fillRect(4, 5, w, h);
  ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,226,120,0.8)'; ctx.fillRect(w / 2 - 14, -4, 28, 12);
  var sx = w / 100;
  var sy = h / 100;
  function P(pts) { return pts.map(function (p) { return [p[0] * sx, p[1] * sy]; }); }
  if (kind === 0) { // house, sun, tree
    scribbleFill(ctx, 30 * sx, 55 * sy, 38 * sx, 30 * sy, '#ffb36a');
    crayon(ctx, P([[28, 85], [28, 52], [68, 52], [68, 85], [28, 85]]), '#d9382f', 4);
    crayon(ctx, P([[24, 54], [48, 26], [72, 54]]), '#d9382f', 4);
    scribbleFill(ctx, 40 * sx, 62 * sy, 10 * sx, 23 * sy, '#7a4a2a');
    crayon(ctx, P(arcPts(80, 18, 9, 0, 6.3, 12)), '#ffb81a', 5);
    for (var r = 0; r < 8; r++) crayon(ctx, P([[80 + Math.cos(r * 0.785) * 12, 18 + Math.sin(r * 0.785) * 12], [80 + Math.cos(r * 0.785) * 18, 18 + Math.sin(r * 0.785) * 18]]), '#ffb81a', 3);
    crayon(ctx, P([[10, 86], [90, 86]]), '#3fa24f', 5);
  } else if (kind === 1) { // family of stick people, with a heart
    [[24, 0], [50, 8], [76, 14]].forEach(function (f, i) {
      var c = ['#3d8bff', '#e8334a', '#2fae58'][i];
      crayon(ctx, P(arcPts(f[0], 34 + f[1], 8, 0, 6.3, 12)), c, 4);
      crayon(ctx, P([[f[0], 42 + f[1]], [f[0], 66 + f[1]]]), c, 4);
      crayon(ctx, P([[f[0] - 12, 52 + f[1]], [f[0] + 12, 52 + f[1]]]), c, 4);
      crayon(ctx, P([[f[0], 66 + f[1]], [f[0] - 8, 84], [f[0], 66 + f[1]], [f[0] + 8, 84]]), c, 4);
    });
    crayon(ctx, P([[50, 20], [42, 10], [50, 6], [58, 10], [50, 20]]), '#ff4d7a', 4);
  } else if (kind === 2) { // cat
    crayon(ctx, P(arcPts(50, 58, 24, 0, 6.3, 16)), '#ff9a1f', 5);
    crayon(ctx, P([[30, 42], [26, 20], [42, 34]]), '#ff9a1f', 5);
    crayon(ctx, P([[70, 42], [74, 20], [58, 34]]), '#ff9a1f', 5);
    crayon(ctx, P(arcPts(42, 54, 2, 0, 6.3, 6)), '#333333', 5);
    crayon(ctx, P(arcPts(58, 54, 2, 0, 6.3, 6)), '#333333', 5);
    crayon(ctx, P([[50, 60], [50, 64], [44, 68]]), '#e8334a', 3);
    crayon(ctx, P([[50, 64], [56, 68]]), '#e8334a', 3);
    crayon(ctx, P([[22, 58], [4, 54], [22, 62], [4, 68]]), '#555555', 2);
  } else if (kind === 3) { // rainbow and clouds
    ['#e8334a', '#ff9a1f', '#ffd23f', '#3fd47a', '#3d8bff'].forEach(function (c, i) { crayon(ctx, P(arcPts(50, 72, 38 - i * 6, Math.PI, 0, 14)), c, 5); });
    crayon(ctx, P(arcPts(14, 78, 9, 0, 6.3, 10)), '#7fb8e8', 4);
    crayon(ctx, P(arcPts(86, 78, 9, 0, 6.3, 10)), '#7fb8e8', 4);
  } else if (kind === 4) { // a train
    scribbleFill(ctx, 10 * sx, 52 * sy, 30 * sx, 22 * sy, '#e8334a');
    scribbleFill(ctx, 44 * sx, 58 * sy, 20 * sx, 16 * sy, '#3d8bff');
    scribbleFill(ctx, 68 * sx, 58 * sy, 20 * sx, 16 * sy, '#2fae58');
    [[22, 80], [34, 80], [54, 80], [78, 80]].forEach(function (c) { crayon(ctx, P(arcPts(c[0], c[1], 6, 0, 6.3, 10)), '#333333', 4); });
    crayon(ctx, P([[16, 52], [16, 36]]), '#333333', 5);
    crayon(ctx, P(arcPts(20, 28, 7, 0, 6.3, 10)), '#bbbbbb', 3);
    crayon(ctx, P([[4, 88], [96, 88]]), '#7a4a2a', 3);
  } else { // a big letter and a flower
    ctx.fillStyle = '#e8334a';
    ctx.font = '900 ' + Math.round(h * 0.7) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('a', w * 0.34, h * 0.56);
    crayon(ctx, P([[74, 90], [74, 50]]), '#3fa24f', 4);
    for (var p = 0; p < 6; p++) crayon(ctx, P(arcPts(74 + Math.cos(p * 1.047) * 9, 40 + Math.sin(p * 1.047) * 9, 5, 0, 6.3, 8)), '#ff7ab8', 4);
    crayon(ctx, P(arcPts(74, 40, 4, 0, 6.3, 8)), '#ffb81a', 4);
  }
  ctx.restore();
}

function mural() {
  // 16 units long, 6.4 high, 64 px to the unit; wraps at both ends
  return canvasTex('pr_mural', 1024, 410, function (ctx, w, h) {
    // pale papered wall with tiny stars
    ctx.fillStyle = '#fff4dc'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,178,90,0.22)';
    for (var i = 0; i < 90; i++) { ctx.save(); ctx.translate((i * 97) % w, (i * 53) % (h - 100) + 6); ctx.rotate(i); ctx.fillRect(-3, -1, 6, 2); ctx.fillRect(-1, -3, 2, 6); ctx.restore(); }
    // painted alphabet frieze, one square every unit
    var frieze = ['A', 'B', 'C', 'あ', 'ア', 'ب', 'Ж', '한', 'ह', 'ñ', 'ß', 'é', '中', 'D', 'E', 'F'];
    for (var f = 0; f < 16; f++) {
      var fx = f * 64 + 6;
      ctx.fillStyle = css(RAINBOW[f % 6]);
      ctx.fillRect(fx, 20, 52, 52);
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(fx, 20, 52, 6);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(frieze[f], fx + 26, 48);
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 80, w, 5);
    // crayon drawings taped up at child height
    var sheets = [[24, 130, 150, 120, 0], [214, 118, 128, 140, 1], [372, 140, 140, 110, 2], [544, 120, 150, 130, 3], [726, 136, 140, 112, 4], [892, 122, 112, 126, 5]];
    sheets.forEach(function (s) { drawing(ctx, s[4], s[0], s[1], s[2], s[3]); });
    // wainscot: pastel stripes under a wooden chair rail
    var wain = ['#9fd8f4', '#ffd0e0', '#fff0a0', '#c8f0c0'];
    for (var x = 0; x < w; x += 32) { ctx.fillStyle = wain[(x / 32) % 4]; ctx.fillRect(x, h - 96, 32, 96); }
    ctx.fillStyle = '#e8a860'; ctx.fillRect(0, h - 100, w, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(0, h - 100, w, 3);
  });
}

function floorPicture() {
  // 12 across, 16 along, 48 px to the unit: wood planks under a rainbow rug with two rainbows per lap
  return canvasTex('pr_floor', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#f2d4a2'; ctx.fillRect(0, 0, w, h);
    for (var p = 0; p < 12; p++) { ctx.fillStyle = p % 2 ? '#ecc78e' : '#f6dcb0'; ctx.fillRect(p * 48, 0, 46, h); }
    ctx.fillStyle = 'rgba(120,70,20,0.14)';
    for (var r = 0; r < 40; r++) ctx.fillRect((r * 79) % w, (r * 131) % h, 24, 2);
    // the rug
    ctx.fillStyle = '#fff6e0'; ctx.fillRect(20, 0, w - 40, h);
    var cols = ['#e8334a', '#ff9a1f', '#ffd23f', '#3fd47a', '#3d8bff', '#b86ae0'];
    [192, 576].forEach(function (cy) {
      cols.forEach(function (c, i) {
        ctx.beginPath(); ctx.arc(w / 2, cy + 60, 250 - i * 22, Math.PI, 0); ctx.lineTo(w / 2 + 250 - i * 22 - 22, cy + 60); ctx.arc(w / 2, cy + 60, 228 - i * 22, 0, Math.PI, true); ctx.closePath();
        ctx.fillStyle = c; ctx.fill();
      });
      // cloud puffs at the feet of the rainbow
      ctx.fillStyle = '#ffffff';
      [[w / 2 - 190, cy + 70], [w / 2 + 190, cy + 70]].forEach(function (c) { [[0, 0, 34], [30, 6, 26], [-30, 8, 24], [8, -18, 22]].forEach(function (b) { ctx.beginPath(); ctx.arc(c[0] + b[0], c[1] + b[1], b[2], 0, 6.3); ctx.fill(); }); });
      // stars between the rainbows
      ctx.fillStyle = '#ffd23f';
      [[w / 2 - 120, cy + 190], [w / 2 + 110, cy + 200], [w / 2, cy + 230]].forEach(function (s) { ctx.beginPath(); for (var i = 0; i < 10; i++) { var rr = i % 2 ? 6 : 14; var a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(s[0] + Math.cos(a) * rr, s[1] + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); });
    });
    // rug border stripes
    [[20, '#e8334a'], [32, '#ffd23f'], [w - 40, '#e8334a'], [w - 52, '#ffd23f']].forEach(function (b) { ctx.fillStyle = b[1]; ctx.fillRect(b[0], 0, 12, h); });
  });
}

function ceilingPicture() {
  return canvasTex('pr_ceiling', 464, 640, function (ctx, w, h) {
    ctx.fillStyle = '#ffeeb0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    [[0.25, 0.18], [0.72, 0.42], [0.3, 0.7], [0.8, 0.88]].forEach(function (p) {
      [[0, 0, 26], [30, 6, 20], [-30, 8, 18], [12, -12, 17]].forEach(function (b) { ctx.beginPath(); ctx.arc(p[0] * w + b[0], p[1] * h + b[1], b[2], 0, 6.3); ctx.fill(); });
    });
    ctx.fillStyle = '#ff9a8a';
    [[0.55, 0.1], [0.12, 0.5], [0.9, 0.62], [0.5, 0.95]].forEach(function (p) { ctx.beginPath(); for (var i = 0; i < 10; i++) { var rr = i % 2 ? 6 : 14; var a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(p[0] * w + Math.cos(a) * rr, p[1] * h + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); });
  });
}

var _letterCols = { A: RED, B: BLUE, C: YELLOW, 'あ': GREEN, 'ア': ORANGE, 'ب': PINK, D: TEAL, E: GREEN };
function blockTex(ch) {
  var bg = _letterCols[ch] || BLUE;
  return canvasTex('pr_block_' + ch, 128, 128, function (ctx, w, h) {
    ctx.fillStyle = css(bg); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, 0, w, 8); ctx.fillRect(0, 0, 8, h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, h - 8, w, 8); ctx.fillRect(w - 8, 0, 8, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 5; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.font = '900 ' + (ch.charCodeAt(0) > 0x600 ? 78 : 88) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, w / 2 + 3, h / 2 + 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch, w / 2, h / 2 + 4);
  });
}

function letterBlock(g, x, y, z, size, ch, ry) {
  var tex = blockTex(ch);
  var b = box(g, size, size, size, 0xffffff, x, y + size / 2, z, { ry: ry || 0, map: tex, r: 0.55 });
  if (!tex) b.material = mat(_letterCols[ch] || BLUE);
  return b;
}

// ---------- the toys ----------

function teddy(g, x, y, z, s, color, turn) {
  ball(g, 0.2 * s, color, x, y + 0.2 * s, z, { sy: 1.05, seg: 7 });
  ball(g, 0.14 * s, color, x, y + 0.5 * s, z, { seg: 7 });
  ball(g, 0.055 * s, color, x - 0.1 * s, y + 0.62 * s, z, { seg: 4 });
  ball(g, 0.055 * s, color, x + 0.1 * s, y + 0.62 * s, z, { seg: 4 });
  ball(g, 0.06 * s, 0xfff0d8, x + (turn < 0 ? 0.11 : -0.11) * s, y + 0.46 * s, z, { seg: 4 });
}

function giantTeddy(g, S, z) {
  var x = S.out(0.9);
  var c = 0xd9904c;
  var t = S.side < 0 ? 1 : -1; // the way it faces
  ball(g, 0.85, c, x, 0.8, z, { seg: 10, sy: 1.05 });
  ball(g, 0.52, 0xf6d6a8, x + t * 0.3, 0.75, z, { seg: 8, sy: 1.05 });
  ball(g, 0.55, c, x, 1.95, z, { seg: 9 });
  ball(g, 0.18, c, x, 2.4, z - 0.4, { seg: 6 });
  ball(g, 0.18, c, x, 2.4, z + 0.4, { seg: 6 });
  ball(g, 0.25, 0xf6d6a8, x + t * 0.42, 1.85, z, { seg: 7 });
  ball(g, 0.08, 0x3a2a24, x + t * 0.62, 1.9, z, { seg: 5 });
  ball(g, 0.05, 0x3a2a24, x + t * 0.5, 2.1, z - 0.18, { seg: 4 });
  ball(g, 0.05, 0x3a2a24, x + t * 0.5, 2.1, z + 0.18, { seg: 4 });
  ball(g, 0.3, c, x + t * 0.5, 0.3, z - 0.85, { seg: 7 });
  ball(g, 0.3, c, x + t * 0.5, 0.3, z + 0.85, { seg: 7 });
  ball(g, 0.25, c, x + t * 0.35, 1.05, z - 1.0, { seg: 7, sy: 1.3 });
  ball(g, 0.25, c, x + t * 0.35, 1.05, z + 1.0, { seg: 7, sy: 1.3 });
  box(g, 0.1, 0.35, 1.0, RED, x + t * 0.55, 1.45, z); // a bow tie
}

function toyBall(g, x, y, z, r, color) { return ball(g, r, color, x, y, z, { seg: 7 }); }

// ---------- one bay on one side ----------

function blocksABC(g, S, z) {
  var cx = S.out(0.2);
  letterBlock(g, cx, 0, z - 0.95, 1.8, 'A', 0.06);
  letterBlock(g, cx, 0, z + 0.95, 1.8, 'B', -0.06);
  letterBlock(g, cx + S.side * 0.05, 1.8, z, 1.6, 'C', 0.1);
  // small blocks and a ball in the strip beside them
  letterBlock(g, S.in(0.5), 0, z + 1.9, 0.55, 'D', 0.4);
  letterBlock(g, S.in(0.55), 0, z - 1.9, 0.5, 'E', -0.3);
  toyBall(g, S.in(0.3), 0.22, z + 1.4, 0.22, RED);
}

function blocksKana(g, S, z) {
  var cx = S.out(0.2);
  letterBlock(g, cx, 0, z - 0.95, 1.8, 'あ', -0.06);
  letterBlock(g, cx, 0, z + 0.95, 1.8, 'ア', 0.06);
  letterBlock(g, cx + S.side * 0.05, 1.8, z, 1.6, 'ب', -0.1);
  teddy(g, S.in(0.5), 0, z + 1.9, 1.5, 0xd9904c, S.side);
  toyBall(g, S.in(0.3), 0.22, z - 1.6, 0.22, BLUE);
}

function slide(g, S, z) {
  var x = S.out(0.15);
  var tz = z - 1.3;
  [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(function (p) { box(g, 0.12, 2.6, 0.12, BLUE, x + p[0], 1.3, tz + p[1]); });
  box(g, 1.3, 0.14, 1.3, YELLOW, x, 2.0, tz);
  box(g, 0.06, 0.5, 1.3, RED, x + 0.62, 2.3, tz);
  box(g, 0.06, 0.5, 1.3, RED, x - 0.62, 2.3, tz);
  cone(g, 1.1, 0.9, RED, x, 3.1, tz, { seg: 4, ry: Math.PI / 4 });
  // ladder on the far side
  for (var r = 0; r < 4; r++) box(g, 0.9, 0.07, 0.07, 0xf4f4f8, x, 0.4 + r * 0.45, tz - 0.72);
  box(g, 0.07, 1.9, 0.07, 0xf4f4f8, x - 0.43, 0.95, tz - 0.72, { rx: -0.1 });
  box(g, 0.07, 1.9, 0.07, 0xf4f4f8, x + 0.43, 0.95, tz - 0.72, { rx: -0.1 });
  // the chute runs toward the runner
  var run = 3.2;
  var drop = 1.7;
  var len = Math.hypot(run, drop);
  var ang = Math.atan2(drop, run);
  var cz = tz + 0.6 + run / 2;
  var cy = 1.98 - drop / 2;
  box(g, 0.9, 0.08, len, YELLOW, x, cy, cz, { rx: ang, r: 0.25, m: 0.1 });
  box(g, 0.08, 0.26, len, RED, x - 0.5, cy + 0.14, cz, { rx: ang });
  box(g, 0.08, 0.26, len, RED, x + 0.5, cy + 0.14, cz, { rx: ang });
  box(g, 0.09, 0.9, 0.09, BLUE, x - 0.4, 0.45, tz + 2.3);
  box(g, 0.09, 0.9, 0.09, BLUE, x + 0.4, 0.45, tz + 2.3);
  // a duck waiting at the bottom
  ball(g, 0.2, YELLOW, S.in(0.35), 0.2, z + 1.9, { seg: 6, sy: 0.85 });
  ball(g, 0.13, YELLOW, S.in(0.35), 0.42, z + 1.9, { seg: 6 });
  cone(g, 0.05, 0.12, ORANGE, S.in(0.35) - S.side * 0.1, 0.4, z + 1.9, { seg: 4, rz: S.side * Math.PI / 2 });
}

function ballPit(g, S, z) {
  var x = S.out(0.3);
  var pz = z - 0.9;
  // soft blue walls and a heap of balls
  box(g, 2.0, 0.6, 0.24, BLUE, x, 0.3, pz - 1.2);
  box(g, 2.0, 0.6, 0.24, BLUE, x, 0.3, pz + 1.2);
  box(g, 0.24, 0.6, 2.4, BLUE, x - 0.88, 0.3, pz);
  box(g, 0.24, 0.6, 2.4, BLUE, x + 0.88, 0.3, pz);
  box(g, 1.7, 0.3, 2.2, 0x7fb6ff, x, 0.2, pz);
  var cols = [RED, YELLOW, GREEN, ORANGE, PINK, 0xffffff, PURPLE, TEAL, BLUE];
  for (var i = 0; i < 22; i++) {
    var a = i * 2.399;
    var rr = 0.15 + (i % 5) * 0.16;
    toyBall(g, x + Math.cos(a) * rr * 1.0, 0.5 + (i % 3) * 0.12, pz + Math.sin(a) * rr * 1.5, 0.23, cols[i % cols.length]);
  }
  // a few balls that escaped into the strip beside the lane
  [[0.3, 1.9, RED], [0.55, 2.2, YELLOW], [0.4, 2.5, GREEN]].forEach(function (b) { toyBall(g, S.in(b[0]), 0.2, z + b[1] - 0.4, 0.2, b[2]); });
  giantTeddy(g, S, z + 1.5);
}

function trimAndShelf(g, S, z, k) {
  // baseboard in a rainbow colour per bay, the shelf the toy train runs on, and paper stars and hearts along the top
  box(g, 0.1, 0.3, 4, RAINBOW[k], S.in(0.05), 0.15, z);
  box(g, 0.55, 0.09, 4, 0xfff8ea, S.in(0.32), 4.2, z);
  box(g, 0.05, 0.06, 4, 0xd9dde4, S.in(0.15), 4.28, z, { m: 0.5, r: 0.3 });
  box(g, 0.05, 0.06, 4, 0xd9dde4, S.in(0.49), 4.28, z, { m: 0.5, r: 0.3 });
  box(g, 0.1, 0.5, 0.1, 0xffffff, S.in(0.15), 3.9, z - 1.2);
  box(g, 0.1, 0.5, 0.1, 0xffffff, S.in(0.15), 3.9, z + 1.2);
  var shapes = [starShape(0.3, 0.14, 5), heartShape(0.6), starShape(0.3, 0.14, 5), heartShape(0.6)];
  for (var j = 0; j < 3; j++) extrude(g, shapes[(k + j) % 4], 0.05, RAINBOW[(k * 2 + j * 2 + 1) % 6], S.in(0.12), 5.75, z - 1.2 + j * 1.2, { ry: S.turn, rz: j === 1 ? 0.2 : -0.1 });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, mural(), side, z, H, 0.0, { r: 0.9 });
  trimAndShelf(g, S, z, k);
  if (k === 0) blocksABC(g, S, z);
  else if (k === 1) blocksKana(g, S, z);
  else if (k === 2) slide(g, S, z);
  else ballPit(g, S, z);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12);
  ceilingPanel(g, ceilingPicture(), z, 11.6, H);
}

function arch(g, z, i) {
  // a string of letter flags across the room; paper shapes hang at the sides
  var y = H - 0.7;
  var letters = ['A', 'B', 'C', 'あ', 'ア', 'ب', 'Ж', '한', 'ह'];
  var n = 9;
  for (var f = 0; f < n; f++) {
    var t = f / (n - 1);
    var x = -4.8 + t * 9.6;
    var dip = Math.sin(t * Math.PI) * 0.55;
    var ch = letters[(f + i) % 9];
    sign(g, ch, RAINBOW[(f + i) % 6], 0xffffff, 0.55, 0.55, x, y - dip - 0.3, z, { tw: 128, th: 128 });
  }
  cyl(g, 0.012, 0.012, 9.8, 0x777788, 0, y - 0.02, z, { rz: Math.PI / 2, seg: 3 });
  [-1, 1].forEach(function (s, n2) {
    var sh = n2 === 0 ? starShape(0.34, 0.16, 5) : heartShape(0.7);
    cyl(g, 0.012, 0.012, 0.5, 0x777788, s * 4.6, y - 0.2, z, { seg: 3 });
    extrude(g, sh, 0.06, RAINBOW[(i * 2 + n2 + 4) % 6], s * 4.6, y - 0.75, z, { curve: 3 });
  });
}

function ground() { }

// ---------- the things that move ----------

function makeTrain(side) {
  var S = sideCtx(side);
  var t = new THREE.Group();
  var x = 0;
  cyl(t, 0.2, 0.2, 0.9, RED, x, 0.38, -0.25, { rx: Math.PI / 2, seg: 10 });
  box(t, 0.5, 0.52, 0.46, BLUE, x, 0.5, 0.42);
  box(t, 0.56, 0.07, 0.52, YELLOW, x, 0.8, 0.42);
  cyl(t, 0.07, 0.09, 0.3, 0x333844, x, 0.72, -0.5, { seg: 8 });
  ball(t, 0.08, YELLOW, x, 0.38, -0.72, { bulb: true, seg: 6 });
  [[-0.27, -0.45], [0.27, -0.45], [-0.27, 0.3], [0.27, 0.3]].forEach(function (p) { cyl(t, 0.13, 0.13, 0.08, 0x2a2d3a, x + p[0], 0.13, p[1], { rz: Math.PI / 2, seg: 8 }); });
  ['A', 'B', 'C'].forEach(function (ch, i) {
    var cz = 1.35 + i * 1.0;
    box(t, 0.56, 0.3, 0.84, [GREEN, ORANGE, PINK][i], x, 0.3, cz);
    [[-0.27, -0.28], [0.27, -0.28], [-0.27, 0.28], [0.27, 0.28]].forEach(function (p) { cyl(t, 0.11, 0.11, 0.07, 0x2a2d3a, x + p[0], 0.11, cz + p[1], { rz: Math.PI / 2, seg: 8 }); });
    letterBlock(t, x, 0.45, cz, 0.42, ch, 0.15 * i);
    box(t, 0.05, 0.05, 0.2, 0x555a66, x, 0.28, cz - 0.52);
  });
  t.position.set(S.in(0.32), 4.28, -40);
  return animated(t);
}

function bubbleGeo() { return combine([{ geo: new THREE.SphereGeometry(0.2, 8, 6), color: 0xffffff }]); }

function extras() {
  [-1, 1].forEach(function (side, i) {
    for (var c = 0; c < 2; c++) {
      var train = makeTrain(side);
      train.position.z = -30 - c * 78 - i * 20;
      mover(train, { k: 0.45 + i * 0.12 });
    }
  });
  var balloon = combine([
    { geo: new THREE.SphereGeometry(0.3, 9, 7), color: 0xffffff, matrix: new THREE.Matrix4().makeScale(1, 1.18, 1) },
    { geo: new THREE.ConeGeometry(0.06, 0.1, 5), color: 0xdddddd, matrix: new THREE.Matrix4().makeTranslation(0, -0.37, 0) },
    { geo: new THREE.CylinderGeometry(0.008, 0.008, 1.1, 3), color: 0xcccccc, matrix: new THREE.Matrix4().makeTranslation(0, -0.95, 0) }
  ]);
  var bubbleMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: balloon, count: 7, seed: 5 + i * 11, colors: RAINBOW.concat([PINK]), area: { x: [side * 4.5, side * 5.1], y: [4.4, 5.6], z: [-140, 8] }, k: 1, wobble: 0.14, scale: [0.9, 1.25] });
    swarm({ geo: bubbleGeo(), material: bubbleMat, count: 14, seed: 90 + i * 5, colors: [0xbfe6ff, 0xffd0f0, 0xd6ffe6], area: { x: [side * 4.6, side * 5.2], y: [0.8, 5.8], z: [-140, 8] }, k: 1, vy: [0.35, 0.8], wobble: 0.15, scale: [0.5, 1.2] });
  });
}

export var w_alphabet_playroom = { id: 'w_alphabet_playroom', indoor: true, bay: bay, center: center, arch: arch, ground: ground, extras: extras };
