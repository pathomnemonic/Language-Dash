/**
 * w_tokyo_night_market.js — Tokyo Night Market (skin 'Cafeteria Carnival'; the id is kept from the original game):
 * a yatai street at night, every stall lit by paper lanterns.
 *
 * Every 16 units, on each side (the two sides are offset so they never match): a takoyaki stall under a red octopus, a
 * kaiten-sushi counter with a belt of plates turning past stools, a ramen-and-oden stall with a waving lucky cat and a
 * giant ramen bowl, and a soft-serve stall with a towering cone. Behind them a painted street of lit windows and vertical
 * neon kana signs; across the street hang strings of red lanterns and cloth banners with greetings. The sky is a warm
 * indigo with stars; sky lanterns drift up, and steam rises from the pots.
 */

import * as THREE from 'three';
import { box, cyl, ball, cone, ring, slab, canvasTex, css, floorPanel, sideCtx, combine, xform, bulb } from '../mapkit.js';
import { flow, swarm } from '../mapfx.js';
import { makeAtlas, atlasQuad, atlasPoly, mural, neonText, plainText, rrect, prng, stars, rowOf } from './asia_kit.js';

var RED = 0xe8412e;
var WOOD = 0xb9783c;
var WOOD_D = 0x6e4428;
var CREAM = 0xfff1d6;
var TEAL = 0x20c4b0;
var YELLOW = 0xffd23f;
var PINK = 0xffb8c8;
var MINT = 0xa8ecd0;
var DARK = 0x4a3328;
var LANTERN = 0xff5535;
var LANTERN_Y = 0xffc040;

var LANTERN_DZ = [-1.35, 0.2, 1.5];

// ---------- painted pictures ----------

function streetMural() {
  // 16 units wide, 9 high, 64 px per unit: lit buildings against the night, transparent above the roofs
  return canvasTex('tokyo_mural', 1024, 576, function (ctx, w, h) {
    var rnd = prng(33);
    var widths = [170, 140, 200, 150, 120, 130, 114];
    var heights = [470, 380, 540, 420, 500, 360, 450];
    var cols = ['#35417f', '#7c3a4a', '#1f6b78', '#8a6a2e', '#4a3a86', '#a24a3a', '#27597f'];
    var x = 0;
    widths.forEach(function (bw, i) {
      var bh = heights[i];
      var top = h - bh;
      var g = ctx.createLinearGradient(0, top, 0, h);
      g.addColorStop(0, cols[i]);
      g.addColorStop(1, '#2a2040');
      ctx.fillStyle = g;
      ctx.fillRect(x, top, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, top, bw, 6);
      ctx.fillRect(x, top, 4, bh);
      // windows
      for (var wy = top + 22; wy < h - 230; wy += 52) {
        for (var wx = x + 14; wx < x + bw - 26; wx += 38) {
          var lit = rnd() < 0.72;
          ctx.fillStyle = lit ? (rnd() < 0.3 ? '#ffd9a0' : '#ffe98a') : '#3a2f55';
          ctx.fillRect(wx, wy, 24, 32);
          if (lit) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(wx, wy, 24, 5); }
          ctx.fillStyle = 'rgba(40,30,60,0.8)';
          ctx.fillRect(wx + 11, wy, 2, 32);
        }
      }
      // roof tank or aerial
      if (i % 2 === 0) { ctx.fillStyle = '#6a4a3a'; ctx.fillRect(x + bw * 0.3, top - 24, 34, 24); ctx.fillRect(x + bw * 0.3 + 6, top - 36, 22, 12); }
      else { ctx.fillStyle = '#2a2040'; ctx.fillRect(x + bw * 0.6, top - 34, 3, 34); ctx.fillRect(x + bw * 0.6 - 10, top - 26, 23, 3); }
      // shopfront band at the bottom
      ctx.fillStyle = '#4a2f2a';
      ctx.fillRect(x, h - 200, bw, 200);
      ctx.fillStyle = '#ffcf80';
      for (var sx = x + 8; sx < x + bw - 30; sx += 48) { ctx.fillRect(sx, h - 170, 38, 74); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(sx, h - 170, 38, 6); ctx.fillStyle = '#ffcf80'; }
      ctx.fillStyle = '#2f1f1c';
      ctx.fillRect(x, h - 200, bw, 8);
      x += bw;
    });
    // neon signs on the buildings: vertical plates of kana
    var signs = [[44, 'ラーメン', '#ff5a85'], [338, '居酒屋', '#37e6d4'], [612, 'ゲーム', '#ffd23f'], [868, 'カラオケ', '#ff7a2f']];
    signs.forEach(function (s) {
      var sx = s[0];
      var sy = 120;
      rrect(ctx, sx - 22, sy, 44, 4 + s[1].length * 40, 8, '#25193a', s[2], 4);
      for (var c = 0; c < s[1].length; c++) neonText(ctx, s[1][c], sx, sy + 26 + c * 40, 30, parseInt(s[2].slice(1), 16), { core: 0xffffff });
    });
    // power lines
    ctx.strokeStyle = 'rgba(30,24,50,0.85)';
    ctx.lineWidth = 2;
    [150, 190, 235].forEach(function (y0, i) {
      ctx.beginPath();
      for (var q = 0; q <= w; q += 16) {
        var yy = y0 + Math.sin((q / w) * Math.PI * (4 + i * 2)) * 10 + Math.sin(q / w * Math.PI * 2) * 0;
        if (q === 0) ctx.moveTo(q, yy); else ctx.lineTo(q, yy);
      }
      ctx.stroke();
    });
  });
}

function cobbles() {
  // 12 across, 16 along, 48 px per unit: warm paving stones with pools of lantern light
  return canvasTex('tokyo_floor', 576, 768, function (ctx, w, h) {
    var rnd = prng(8);
    ctx.fillStyle = '#d9b48a';
    ctx.fillRect(0, 0, w, h);
    var tones = ['#f0d2a6', '#e8c698', '#f6dcb2', '#e2bd90'];
    for (var r = 0; r < h / 24; r++) {
      var off = r % 2 ? 16 : 0;
      for (var x = -16 + off; x < w; x += 32) {
        ctx.fillStyle = tones[Math.floor(rnd() * 4)];
        rrect(ctx, x + 1.5, r * 24 + 1.5, 29, 21, 4, ctx.fillStyle);
      }
    }
    // pools of light under the lanterns (both sides), and a warm wash down the middle
    for (var k = 0; k < 4; k++) {
      LANTERN_DZ.forEach(function (dz) {
        var y = rowOf(4 * k + dz, h);
        [0.62, w - 0.62 * 48].forEach(function (px) {
          var gx = px === 0.62 ? 2.2 * 48 : w - 2.2 * 48;
          var grd = ctx.createRadialGradient(gx, y, 4, gx, y, 120);
          grd.addColorStop(0, 'rgba(255,190,90,0.55)');
          grd.addColorStop(1, 'rgba(255,190,90,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(gx - 130, y - 130, 260, 260);
        });
      });
    }
    // gutter lines at the edges
    ctx.fillStyle = 'rgba(110,68,40,0.6)';
    ctx.fillRect(0.5 * 48, 0, 4, h);
    ctx.fillRect(w - 0.5 * 48 - 4, 0, 4, h);
  });
}

function beltPicture() {
  // 0.5 wide, 4 long, 64 px per unit: a dark belt carrying plates of sushi, one per 0.67 units
  return canvasTex('tokyo_belt', 32, 256, function (ctx, w, h) {
    ctx.fillStyle = '#3a2a24';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a463c';
    ctx.fillRect(0, 0, 3, h); ctx.fillRect(w - 3, 0, 3, h);
    var tops = ['#ff7a5a', '#ffd23f', '#ff9ec0', '#ffffff', '#ff5a3a', '#7fd87a'];
    for (var i = 0; i < 6; i++) {
      var y = (i + 0.5) * (h / 6);
      ctx.fillStyle = i % 2 ? '#ffe0a0' : '#f4f4ee';
      ctx.beginPath(); ctx.arc(w / 2, y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.arc(w / 2, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath(); ctx.ellipse(w / 2, y, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = tops[i];
      ctx.beginPath(); ctx.ellipse(w / 2, y - 1, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
}

var _atlas = null;
function atlas() {
  if (_atlas) return _atlas;
  var cells = [];
  ['awnR', 'awnT', 'awnY', 'awnP'].forEach(function (id, i) { cells.push({ id: id, x: i * 128, y: 0, w: 128, h: 128 }); });
  ['nr0', 'nr1', 'nr2', 'nr3'].forEach(function (id, i) { cells.push({ id: id, x: i * 192, y: 130, w: 192, h: 160 }); });
  ['vn0', 'vn1', 'vn2', 'vn3', 'vn4', 'vn5'].forEach(function (id, i) { cells.push({ id: id, x: i * 100, y: 295, w: 96, h: 288 }); });
  ['hd0', 'hd1', 'hd2', 'hd3'].forEach(function (id, i) { cells.push({ id: id, x: i * 256, y: 590, w: 252, h: 88 }); });
  ['bn0', 'bn1', 'bn2', 'bn3'].forEach(function (id, i) { cells.push({ id: id, x: (i % 2) * 512, y: 684 + Math.floor(i / 2) * 68, w: 508, h: 64 }); });
  var awn = { awnR: '#e8412e', awnT: '#20c4b0', awnY: '#ffc830', awnP: '#ff8fb0' };
  var noren = { nr0: ['#d9432c', 'らーめん'], nr1: ['#2f4f93', 'たこやき'], nr2: ['#1f9a8a', 'すし'], nr3: ['#8a2f3a', 'おでん'] };
  var vn = { vn0: ['ラーメン', 0xff5a85], vn1: ['たこ焼', 0x37e6d4], vn2: ['寿司', 0xffd23f], vn3: ['ようこそ', 0xff7a2f], vn4: ['ありがとう', 0x6fe0ff], vn5: ['おいしい', 0xff5a85] };
  var hd = { hd0: ['回転寿司', '#2f4f93', '#ffffff'], hd1: ['たこ焼き', '#e8412e', '#fff1d6'], hd2: ['ソフトクリーム', '#ff8fb0', '#ffffff'], hd3: ['おでん', '#7a3a1a', '#ffe098'] };
  var bn = { bn0: ['ようこそ！　夜市へ', '#e8412e', '#fff1d6'], bn1: ['こんにちは！', '#2f4f93', '#ffe098'], bn2: ['ありがとう！', '#1f9a8a', '#ffffff'], bn3: ['おいしい！　たのしい！', '#d98a1a', '#fff8e0'] };
  _atlas = makeAtlas('tokyo_atlas', 1024, 830, cells, function (ctx, c) {
    var w = c.w;
    var h = c.h;
    if (awn[c.id]) {
      for (var i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff6e4' : awn[c.id]; ctx.fillRect(i * (w / 8), 0, w / 8 + 1, h); }
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, h - 22, w, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, w, 10);
    } else if (noren[c.id]) {
      var n = noren[c.id];
      ctx.fillStyle = n[0]; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(0, 0, w, 9);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      [w / 3, (2 * w) / 3].forEach(function (x) { ctx.fillRect(x - 2, 12, 4, h - 12); });
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(0, h - 10, w, 10);
      var t = n[1];
      plainText(ctx, t, w / 2, h * 0.5, t.length > 3 ? 40 : 56, '#fff6e4');
    } else if (vn[c.id]) {
      var v = vn[c.id];
      rrect(ctx, 2, 2, w - 4, h - 4, 12, '#261a3c', css(v[1]), 5);
      var text = v[0];
      var step = (h - 20) / text.length;
      for (var q = 0; q < text.length; q++) neonText(ctx, text[q], w / 2, 10 + step * (q + 0.5), Math.min(58, step * 0.86), v[1], { core: 0xffffff });
    } else if (hd[c.id]) {
      var d = hd[c.id];
      rrect(ctx, 3, 3, w - 6, h - 6, 12, d[1], '#fff1d6', 5);
      plainText(ctx, d[0], w / 2, h / 2 + 2, d[0].length > 5 ? 40 : 52, d[2]);
    } else if (bn[c.id]) {
      var b = bn[c.id];
      ctx.fillStyle = b[1]; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(0, 4, w, 3); ctx.fillRect(0, h - 7, w, 3);
      plainText(ctx, b[0], w / 2, h / 2 + 2, 44, b[2]);
    }
  });
  return _atlas;
}

// ---------- props ----------

function lantern(g, x, y, z, color, s) {
  var k = s || 1;
  ball(g, 0.2 * k, color || LANTERN, x, y, z, { seg: 6, sy: 1.25, bulb: true });
  box(g, 0.17 * k, 0.05, 0.17 * k, DARK, x, y + 0.27 * k, z);
  box(g, 0.17 * k, 0.05, 0.17 * k, DARK, x, y - 0.27 * k, z);
}

function noodleBowl(g, x, y, z, s) {
  cyl(g, 0.5 * s, 0.32 * s, 0.4 * s, RED, x, y + 0.2 * s, z, { seg: 8 });
  cyl(g, 0.46 * s, 0.46 * s, 0.05 * s, 0xf2b25a, x, y + 0.4 * s, z, { seg: 8 });
  ball(g, 0.18 * s, 0xfff8e8, x + 0.15 * s, y + 0.5 * s, z + 0.1 * s, { seg: 5, sy: 0.7 });
  ball(g, 0.07 * s, 0xffb02f, x + 0.15 * s, y + 0.55 * s, z + 0.1 * s, { seg: 4 });
  box(g, 0.34 * s, 0.05 * s, 0.1 * s, 0x3b6f3a, x - 0.18 * s, y + 0.45 * s, z - 0.1 * s, { rz: 0.15 });
  ring(g, 0.24 * s, 0.05 * s, 0xffd9a0, x - 0.1 * s, y + 0.44 * s, z, { rx: Math.PI / 2, seg: 8, tube: 3 });
}

function octopus(g, x, y, z, s) {
  ball(g, 0.5 * s, RED, x, y + 0.7 * s, z, { seg: 7, sy: 1.15 });
  [-0.16, 0.16].forEach(function (e) {
    ball(g, 0.12 * s, 0xffffff, x - 0.0, y + 0.8 * s, z + e * 2 * s, { seg: 4 });
  });
  for (var i = 0; i < 6; i++) {
    var a = (i / 6) * Math.PI * 2;
    cyl(g, 0.07 * s, 0.1 * s, 0.6 * s, RED, x + Math.cos(a) * 0.3 * s, y + 0.12 * s, z + Math.sin(a) * 0.3 * s, { seg: 4, rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5 });
  }
  box(g, 0.9 * s, 0.1 * s, 0.1 * s, 0xffffff, x, y + 0.38 * s, z); // a twisted headband
}

function nigiri(g, x, y, z, s) {
  box(g, 0.5 * s, 0.34 * s, 1.0 * s, 0xfffaf0, x, y + 0.17 * s, z);
  box(g, 0.56 * s, 0.14 * s, 1.1 * s, 0xff7a5a, x, y + 0.42 * s, z);
  box(g, 0.58 * s, 0.15 * s, 0.1 * s, 0xfff1d6, x, y + 0.43 * s, z - 0.2 * s);
  box(g, 0.58 * s, 0.15 * s, 0.1 * s, 0xfff1d6, x, y + 0.43 * s, z + 0.2 * s);
}

function softServe(g, x, y, z, s) {
  cone(g, 0.34 * s, 0.9 * s, 0xe0a050, x, y + 0.45 * s, z, { seg: 6, rx: Math.PI });
  ball(g, 0.38 * s, PINK, x, y + 1.0 * s, z, { seg: 7, sy: 0.7 });
  ball(g, 0.3 * s, MINT, x, y + 1.35 * s, z, { seg: 7, sy: 0.7 });
  ball(g, 0.22 * s, CREAM, x, y + 1.65 * s, z, { seg: 7, sy: 0.8 });
  cone(g, 0.08 * s, 0.18 * s, CREAM, x, y + 1.88 * s, z, { seg: 5 });
  ball(g, 0.07 * s, 0xe8213e, x, y + 1.96 * s, z, { seg: 5 });
}

function luckyCat(g, x, y, z, s) {
  ball(g, 0.2 * s, 0xffffff, x, y + 0.22 * s, z, { seg: 6, sy: 1.15 });
  ball(g, 0.16 * s, 0xffffff, x, y + 0.5 * s, z, { seg: 6 });
  cone(g, 0.06 * s, 0.1 * s, 0xffffff, x - 0.1 * s, y + 0.66 * s, z, { seg: 3 });
  cone(g, 0.06 * s, 0.1 * s, 0xffffff, x + 0.1 * s, y + 0.66 * s, z, { seg: 3 });
  box(g, 0.3 * s, 0.05 * s, 0.1 * s, RED, x, y + 0.36 * s, z + 0.1 * s);
  ball(g, 0.05 * s, YELLOW, x, y + 0.31 * s, z + 0.16 * s, { seg: 4 });
  cyl(g, 0.045 * s, 0.045 * s, 0.26 * s, 0xffffff, x + 0.2 * s, y + 0.46 * s, z, { seg: 4, rz: -0.4 });
}

function vendor(g, x, z, apron, yaw) {
  cyl(g, 0.2, 0.26, 0.8, apron, x, 1.0, z, { seg: 6 });
  ball(g, 0.17, 0xf2c9a0, x, 1.55, z, { seg: 6 });
  box(g, 0.4, 0.07, 0.4, 0xffffff, x, 1.72, z, { ry: yaw || 0 });
  box(g, 0.1, 0.1, 0.1, 0xffffff, x, 1.8, z);
}

function X(side, off) { return side * (5.5 - off); }

// ---------- one stall ----------

function stall(g, S, z, awn, header, norenId, counterColor, sideTone) {
  var side = S.side;
  var A = atlas();
  var yaw = S.turn;
  // counter and its cream top
  box(g, 0.85, 1.0, 3.3, counterColor, X(side, 0.58), 0.5, z);
  box(g, 0.95, 0.07, 3.4, CREAM, X(side, 0.62), 1.03, z);
  // posts at the front corners
  [-1.7, 1.7].forEach(function (dz) { cyl(g, 0.06, 0.06, 2.75, WOOD_D, X(side, 1.0), 1.4, z + dz, { seg: 5 }); });
  box(g, 0.1, 0.1, 3.5, WOOD_D, X(side, 1.0), 2.78, z);
  // the striped awning, sloping up to the wall
  atlasPoly(g, A, awn, [X(side, 1.8), 2.5, z - 1.85], [X(side, 1.8), 2.5, z + 1.85], [X(side, 0), 3.2, z + 1.85], [X(side, 0), 3.2, z - 1.85], {});
  // noren curtains hang in the stall's opening
  [-0.85, 0.85].forEach(function (dz) { atlasQuad(g, A, norenId, 1.4, 0.95, X(side, 1.0) + side * 0.02, 2.28, z + dz, { ry: yaw, lit: true }); });
  // the name board above the awning, on the wall
  atlasQuad(g, A, header, 2.3, 0.8, X(side, 0.1), 3.78, z, { ry: yaw });
  // lanterns along the awning's front edge
  LANTERN_DZ.forEach(function (dz, i) { lantern(g, X(side, 1.8), 2.4, z + dz, i === 1 ? LANTERN_Y : LANTERN); });
  void sideTone;
}

function takoyaki(g, S, z) {
  var side = S.side;
  stall(g, S, z, 'awnR', 'hd1', 'nr1', WOOD);
  box(g, 0.6, 0.12, 1.5, DARK, X(side, 0.6), 1.13, z + 0.6);
  for (var i = 0; i < 6; i++) ball(g, 0.1, 0xd89a4a, X(side, 0.5 + (i % 2) * 0.2), 1.25, z + 0.05 + i * 0.22, { seg: 5 });
  octopus(g, X(side, 0.75), 3.3, z - 0.3, 1.0);
  vendor(g, X(side, 0.2), z - 0.5, 0xffffff, S.turn);
}

function sushi(g, S, z) {
  var side = S.side;
  stall(g, S, z, 'awnT', 'hd0', 'nr2', WOOD);
  // the belt of plates turning along the counter
  var tex = beltPicture();
  var belt = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), tex ? bulb(0xffffff, { map: tex }) : bulb(0x3a2a24));
  belt.rotation.x = -Math.PI / 2;
  belt.position.set(X(side, 0.62), 1.075, z);
  g.add(belt);
  [-1.2, 0, 1.2].forEach(function (dz) { cyl(g, 0.2, 0.2, 0.06, RED, X(side, 1.75), 0.55, z + dz, { seg: 6 }); cyl(g, 0.04, 0.04, 0.5, DARK, X(side, 1.75), 0.27, z + dz, { seg: 4 }); });
  nigiri(g, X(side, 0.9), 3.3, z - 0.4, 1.3);
  vendor(g, X(side, 0.2), z + 0.6, 0x2f4f93, S.turn);
}

function ramen(g, S, z) {
  var side = S.side;
  stall(g, S, z, 'awnY', 'hd3', 'nr3', WOOD_D);
  cyl(g, 0.3, 0.3, 0.35, 0xf4f4ee, X(side, 0.55), 1.25, z + 0.7, { seg: 8 });
  cyl(g, 0.32, 0.32, 0.05, RED, X(side, 0.55), 1.45, z + 0.7, { seg: 8 });
  noodleBowl(g, X(side, 0.55), 1.07, z - 0.6, 0.55);
  luckyCat(g, X(side, 0.55), 1.07, z - 1.3, 1.1);
  noodleBowl(g, X(side, 0.85), 3.25, z, 1.7);
  vendor(g, X(side, 0.2), z + 0.3, 0xd9432c, S.turn);
}

function iceCream(g, S, z) {
  var side = S.side;
  stall(g, S, z, 'awnP', 'hd2', 'nr0', 0xff9cb8);
  [-0.8, 0, 0.8].forEach(function (dz, i) { softServe(g, X(side, 0.6), 1.07, z + dz, 0.45); void i; });
  softServe(g, X(side, 0.85), 3.25, z, 1.55);
  vendor(g, X(side, 0.2), z + 0.2, 0xff8fb0, S.turn);
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  var j = (k + (side > 0 ? 2 : 0)) % 4;
  mural(g, streetMural(), side, z, 9, 0.02, { alpha: true });
  if (j === 0) takoyaki(g, S, z);
  else if (j === 1) sushi(g, S, z);
  else if (j === 2) ramen(g, S, z);
  else iceCream(g, S, z);
  // a vertical neon sign leaning out over the stalls
  atlasQuad(g, atlas(), 'vn' + ((j * 2 + (side > 0 ? 1 : 0)) % 6), 0.62, 1.86, X(side, 1.45), 4.4, z + 1.7, {});
  // a post and the cable the lanterns hang from
  box(g, 0.1, 0.1, 4, DARK, X(side, 1.8), 2.85, z);
}

function center(g, z) {
  floorPanel(g, cobbles(), z, 12);
}

// ---------- hanging over the street ----------

function arch(g, z, i) {
  var A = atlas();
  // a string of lanterns across the street, sagging in the middle, alternating red and gold
  var y0 = 6.1;
  var n = 9;
  var prev = null;
  for (var f = 0; f < n; f++) {
    var t = f / (n - 1);
    var x = -4.9 + t * 9.8;
    var y = y0 - Math.sin(t * Math.PI) * 0.6;
    lantern(g, x, y - 0.28, z, f % 2 ? LANTERN_Y : LANTERN, 1.0);
    if (prev) box(g, 1.3, 0.025, 0.025, DARK, (prev[0] + x) / 2, (prev[1] + y) / 2 + 0.0, z, { rz: Math.atan2(y - prev[1], x - prev[0]) });
    prev = [x, y];
  }
  // cloth banner on the high cable, greeting in Japanese
  var b = 'bn' + (i % 4);
  atlasPoly(g, A, b, [-2.6, 6.55, z + 0.05], [2.6, 6.55, z + 0.05], [2.6, 7.2, z + 0.05], [-2.6, 7.2, z + 0.05], {});
  box(g, 10.4, 0.04, 0.04, DARK, 0, 7.25, z);
}

function ground(g) {
  slab(g, 400, 400, 0xd9b48a, 0, -0.02, -190, { r: 1 });
}

// ---------- the things that move ----------

function steamGeo() { return combine([{ geo: new THREE.SphereGeometry(0.2, 6, 5), color: 0xffffff }]); }

function skyLanternGeo() {
  return combine([
    { geo: new THREE.SphereGeometry(0.4, 7, 5), color: 0xffa040, matrix: xform(0, 0, 0, 0, 0, 0, 1, 1.2, 1) },
    { geo: new THREE.BoxGeometry(0.34, 0.1, 0.34), color: 0xffe9a0, matrix: xform(0, -0.52, 0) }
  ]);
}

function extras() {
  // the belts turn
  flow(beltPicture(), 0, 0.1);
  // steam from the pots
  var steam = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: steamGeo(), material: steam, count: 22, seed: 50 + i * 3, colors: [0xffffff, 0xfff3e0], area: { x: [side * 4.7, side * 5.3], y: [1.2, 3.4], z: [-140, 8] }, k: 1, vy: [0.4, 0.8], wobble: 0.12, scale: [0.7, 1.6] });
    swarm({ geo: skyLanternGeo(), count: 9, seed: 70 + i * 7, area: { x: [side * 7, side * 16], y: [9, 26], z: [-140, 6] }, k: 1, vy: [0.3, 0.6], wobble: 0.3, scale: [0.9, 1.4], material: new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }) });
  });
  stars(70, { colors: [0xffffff, 0xfff2c0, 0xffe0b0] });
}

export var w_tokyo_night_market = { id: 'w_tokyo_night_market', indoor: false, bay: bay, center: center, arch: arch, ground: ground, extras: extras };
