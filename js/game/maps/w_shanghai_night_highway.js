/**
 * w_shanghai_night_highway.js — Shanghai Night Highway (skin 'Neural Highway'; the id is kept from the original game):
 * an elevated expressway above the Pudong skyline, at night.
 *
 * You run along a concrete-barriered deck lit by sodium lamps on curved arms. Every 22 units a gantry crosses the road
 * with a lit sign that greets you in Chinese (你好, 欢迎, 谢谢, 一路平安) and strings of red lanterns. Across the median,
 * the other carriageway carries streaks of red and white headlights; beyond it a painted wall of glowing towers with
 * hanzi billboards, and in the distance the Oriental Pearl Tower (pink spheres on legs) and a stepped pagoda-tower.
 * Stars show over a warm city-glow horizon.
 */

import * as THREE from 'three';
import { box, cyl, ball, slab, canvasTex, floorPanel, sideCtx, combine, xform, mat } from '../mapkit.js';
import { animated, features, swarm } from '../mapfx.js';
import { makeAtlas, atlasQuad, mural, neonText, plainText, rrect, prng, stars, rowOf, periodFlat } from './asia_kit.js';

var PINK = 0xff6f9a;
var TEAL = 0x22e6d8;
var GOLD = 0xf2b134;
var RED = 0xe8412e;
var CONCRETE = 0xeadcc4;
var CAP = 0xb89a7a;
var DARK = 0x3a2f4a;
var LAMP = 0xffe3a0;

function skyline() {
  // 16 units wide, 22 high, 48 px per unit; the picture starts 8 units below the deck
  return canvasTex('shanghai_skyline', 768, 1056, function (ctx, w, h) {
    var rnd = prng(23);
    var widths = [120, 100, 130, 96, 110, 106, 106];
    var heights = [18, 13, 20, 12, 17, 15, 14].map(function (u) { return u * 48; });
    var cols = ['#2f4f93', '#6a2f6a', '#1f7f8a', '#8a3a4a', '#35418f', '#2a7a6a', '#7a4a8a'];
    var billboards = [['你好', 0xff6f9a], ['欢迎', 0x22e6d8], ['上海', 0xffd23f], ['茶', 0x7fe86a], ['谢谢', 0xff8a5c], ['福', 0xff5a4a], ['夜上海', 0x22e6d8]];
    var x = 0;
    widths.forEach(function (bw, i) {
      var bh = heights[i];
      var top = h - bh;
      var g = ctx.createLinearGradient(0, top, 0, h);
      g.addColorStop(0, cols[i]);
      g.addColorStop(1, '#1d1840');
      ctx.fillStyle = g;
      ctx.fillRect(x, top, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(x, top, bw, 5);
      ctx.fillRect(x, top, 3, bh);
      for (var wy = top + 18; wy < h - 20; wy += 22) {
        for (var wx = x + 8; wx < x + bw - 14; wx += 15) {
          var r = rnd();
          ctx.fillStyle = r < 0.55 ? '#ffe9a0' : (r < 0.7 ? '#8ff5ee' : (r < 0.78 ? '#ff9ec0' : '#2a2150'));
          ctx.fillRect(wx, wy, 9, 13);
        }
      }
      // neon outline on the roof
      var ncol = i % 2 ? '#22e6d8' : '#ff6f9a';
      ctx.fillStyle = ncol; ctx.fillRect(x, top - 4, bw, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x, top - 3, bw, 1);
      // an aerial
      ctx.fillStyle = '#2a2150'; ctx.fillRect(x + bw / 2, top - 40, 3, 36);
      // a big lit billboard with hanzi
      var b = billboards[i];
      var by = top + 40 + (i % 3) * 120;
      rrect(ctx, x + 8, by, bw - 16, 96, 10, '#1d1640', '#' + ('000000' + b[1].toString(16)).slice(-6), 4);
      neonText(ctx, b[0], x + bw / 2, by + 50, b[0].length > 2 ? 34 : 54, b[1], { core: 0xffffff });
      x += bw;
    });
  });
}

function deck() {
  // the road: warm dark asphalt, amber edge lines, pools of lamp light under every lamp
  return canvasTex('shanghai_deck', 576, 768, function (ctx, w, h) {
    var rnd = prng(4);
    ctx.fillStyle = '#4e4b6e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (var i = 0; i < 500; i++) ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
    for (var k = 0; k < 4; k++) {
      var y = rowOf(4 * k, h);
      [0.14, 0.86].forEach(function (fx) {
        var gx = w * fx;
        var grd = ctx.createRadialGradient(gx, y, 4, gx, y, 150);
        grd.addColorStop(0, 'rgba(255,214,130,0.6)');
        grd.addColorStop(1, 'rgba(255,214,130,0)');
        ctx.fillStyle = grd; ctx.fillRect(gx - 150, y - 150, 300, 300);
      });
    }
    ctx.fillStyle = '#ffc83a';
    ctx.fillRect(0.55 * 48, 0, 5, h); ctx.fillRect(w - 0.55 * 48 - 5, 0, 5, h);
    // pink and teal reflections of the signs
    for (var s = 0; s < 14; s++) {
      var rx = s % 2 ? w - rnd() * 100 : rnd() * 100;
      ctx.fillStyle = s % 3 ? 'rgba(34,230,216,0.28)' : 'rgba(255,111,154,0.3)';
      ctx.fillRect(rx, rnd() * h, 10, 60 + rnd() * 60);
    }
  });
}

function farDeck() {
  // the other carriageway, 4.6 wide: dashed white centre line, amber edge
  return canvasTex('shanghai_far', 294, 1024, function (ctx, w, h) {
    ctx.fillStyle = '#4e4b6e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffc83a'; ctx.fillRect(w - 8, 0, 6, h);
    ctx.fillStyle = '#ffffff';
    for (var y = 0; y < h; y += 128) ctx.fillRect(w / 2 - 3, y, 6, 64);
  });
}

var _atlas = null;
function atlas() {
  if (_atlas) return _atlas;
  var cells = ['sg0', 'sg1', 'sg2', 'sg3'].map(function (id, i) { return { id: id, x: (i % 2) * 512, y: Math.floor(i / 2) * 136, w: 508, h: 132 }; });
  var sg = { sg0: ['你好！', 'Nǐ hǎo · Hello'], sg1: ['欢迎来到上海', 'Welcome to Shanghai'], sg2: ['谢谢！', 'Xièxie · Thank you'], sg3: ['一路平安', 'Yílù píng\'ān · Safe trip'] };
  _atlas = makeAtlas('shanghai_atlas', 1024, 272, cells, function (ctx, c) {
    var s = sg[c.id];
    ctx.fillStyle = '#127a6a';
    rrect(ctx, 2, 2, c.w - 4, c.h - 4, 14, '#127a6a', '#ffffff', 5);
    plainText(ctx, s[0], c.w / 2, 52, 62, '#ffffff');
    plainText(ctx, s[1], c.w / 2, 102, 28, '#ffe9a0', { weight: '700' });
  });
  return _atlas;
}

function X(side, off) { return side * (5.5 - off); }

function lampPost(g, S, z) {
  var side = S.side;
  cyl(g, 0.09, 0.12, 6.4, DARK, X(side, 0.2), 3.2, z, { seg: 5 });
  box(g, 1.9, 0.1, 0.1, DARK, X(side, 1.15), 6.45, z);
  box(g, 0.6, 0.12, 0.34, LAMP, X(side, 2.0), 6.34, z, { bulb: true });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  // the median barrier with its reflectors
  box(g, 0.6, 0.95, 4, CONCRETE, X(side, 0.2), 0.47, z);
  box(g, 0.7, 0.12, 4, CAP, X(side, 0.2), 1.0, z);
  for (var i = 0; i < 4; i++) box(g, 0.08, 0.1, 0.2, i % 2 ? RED : LAMP, X(side, 0.85), 0.6, z - 1.5 + i, { bulb: true });
  lampPost(g, S, z);
  // the other carriageway, with a streak of lamp posts of its own
  periodFlat(g, farTex(), Math.min(side * 5.8, side * 10.4), Math.max(side * 5.8, side * 10.4), z, 0.0);
  // the skyline wall, far enough out to leave room for the passing traffic
  mural(g, skyline(), side, z, 22, -6.5, { alpha: true, y0: -8 });
  if (k % 2 === 0) {
    cyl(g, 0.07, 0.09, 3.4, DARK, side * 10.4, 1.7, z + 1, { seg: 5 });
    box(g, 0.5, 0.1, 0.3, LAMP, side * 10.4, 3.4, z + 1, { bulb: true });
  }
}

var _far = null;
function farTex() {
  // (the dashes run along the track, so the picture is turned: u across, v along)
  return _far || (_far = farDeck());
}

function center(g, z) {
  floorPanel(g, deck(), z, 12);
}

// ---------- the gantry ----------

function redLantern(g, x, y, z) {
  cyl(g, 0.01, 0.01, 0.3, DARK, x, y + 0.35, z, { seg: 3 });
  ball(g, 0.26, RED, x, y, z, { seg: 7, sy: 1.15, bulb: true });
  box(g, 0.2, 0.06, 0.2, GOLD, x, y + 0.3, z);
  box(g, 0.2, 0.06, 0.2, GOLD, x, y - 0.3, z);
  cyl(g, 0.012, 0.012, 0.3, GOLD, x, y - 0.5, z, { seg: 3 });
}

function arch(g, z, i) {
  var A = atlas();
  [-1, 1].forEach(function (s) {
    cyl(g, 0.16, 0.2, 6.4, 0xe9dcc4, s * 5.2, 3.2, z, { seg: 6 });
  });
  box(g, 10.9, 0.34, 0.42, 0xe9dcc4, 0, 6.5, z);
  box(g, 10.9, 0.08, 0.5, GOLD, 0, 6.28, z);
  // the sign, lit from within
  box(g, 4.7, 1.3, 0.1, DARK, 0, 5.75, z - 0.02);
  atlasQuad(g, A, 'sg' + (i % 4), 4.5, 1.12, 0, 5.75, z + 0.04, {});
  // lanterns in clusters either side
  [-4.3, -3.2, 3.2, 4.3].forEach(function (x, n) { redLantern(g, x, 5.55 - (n % 2) * 0.25, z); });
  for (var b = 0; b < 12; b++) ball(g, 0.06, b % 2 ? TEAL : PINK, -5 + b * 0.91, 6.2, z + 0.25, { seg: 4, bulb: true });
}

function ground(g) {
  // the river far below the deck, scattered with the colours of the towers
  var tex = canvasTex('shanghai_river', 256, 256, function (ctx, w, h) {
    var rnd = prng(2);
    ctx.fillStyle = '#2a7f95';
    ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 160; i++) {
      ctx.fillStyle = ['rgba(255,111,154,0.7)', 'rgba(34,230,216,0.7)', 'rgba(255,214,130,0.8)'][i % 3];
      ctx.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 8, 2);
    }
  });
  if (tex) tex.repeat.set(30, 30);
  var river = slab(g, 400, 400, tex ? 0xffffff : 0x2a7f95, 0, -8, -190, tex ? { map: tex, r: 0.6 } : { r: 0.6 });
  void river;
}

// ---------- the skyline in the distance ----------

function strut(m, a, b, r, color) {
  var dir = new THREE.Vector3().subVectors(b, a);
  var len = dir.length();
  var mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat(color));
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.add(mesh);
}

function pearl() {
  var m = new THREE.Group();
  [0, 1, 2].forEach(function (i) {
    var a = (i / 3) * Math.PI * 2 + 0.5;
    strut(m, new THREE.Vector3(Math.cos(a) * 7, 0, Math.sin(a) * 7), new THREE.Vector3(Math.cos(a) * 2.2, 22, Math.sin(a) * 2.2), 0.8, 0xe8e0d0);
  });
  ball(m, 5.6, PINK, 0, 24, 0, { seg: 12 });
  ball(m, 4.2, PINK, 0, 44, 0, { seg: 12 });
  cyl(m, 1.2, 1.2, 18, 0xe8e0d0, 0, 34, 0, { seg: 8 });
  cyl(m, 5.9, 5.9, 0.5, TEAL, 0, 24, 0, { seg: 12, bulb: true });
  cyl(m, 4.5, 4.5, 0.4, TEAL, 0, 44, 0, { seg: 12, bulb: true });
  ball(m, 1.9, 0xff8fb0, 0, 54, 0, { seg: 8 });
  cyl(m, 0.12, 0.3, 14, 0xe8e0d0, 0, 62, 0, { seg: 5 });
  ball(m, 0.5, RED, 0, 69.5, 0, { seg: 5, bulb: true });
  m.position.y = -8;
  return animated(m);
}

var _towerTex = null;
function towerTex() {
  if (_towerTex === null) {
    _towerTex = canvasTex('shanghai_tower', 64, 256, function (ctx, w, h) {
      var rnd = prng(6);
      ctx.fillStyle = '#35418f'; ctx.fillRect(0, 0, w, h);
      for (var y = 6; y < h - 6; y += 12) for (var x = 6; x < w - 6; x += 10) { ctx.fillStyle = rnd() < 0.65 ? '#ffe9a0' : '#8ff5ee'; ctx.fillRect(x, y, 6, 7); }
    }) || false;
  }
  return _towerTex || null;
}

function pagodaTower() {
  var m = new THREE.Group();
  var tex = towerTex();
  var wallMat = tex ? { map: tex, r: 0.8 } : {};
  var widths = [10, 8.4, 6.8, 5.2, 3.8];
  var y = 0;
  widths.forEach(function (w, i) {
    var h = 9 + (i === 0 ? 5 : 0);
    box(m, w, h, w, 0xffffff, 0, y + h / 2, 0, wallMat);
    box(m, w + 1.6, 0.5, w + 1.6, i % 2 ? PINK : TEAL, 0, y + h + 0.25, 0, { bulb: true });
    y += h + 0.5;
  });
  cyl(m, 0.15, 0.3, 9, 0xe8e0d0, 0, y + 4.5, 0, { seg: 5 });
  ball(m, 0.5, RED, 0, y + 9.2, 0, { seg: 5, bulb: true });
  m.position.y = -8;
  return animated(m);
}

function streakGeo() {
  return combine([
    { geo: new THREE.BoxGeometry(0.18, 0.14, 2.6), color: 0xffffff, matrix: xform(0, 0, 0) },
    { geo: new THREE.BoxGeometry(0.5, 0.3, 1.2), color: 0xffffff, matrix: xform(0, 0.02, 0.6) }
  ]);
}

function extras() {
  var mater = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
  [-1, 1].forEach(function (side, i) {
    // headlights coming toward you (white and gold), tail lights going away (red)
    swarm({ geo: streakGeo(), material: mater, count: 8, seed: 5 + i, colors: [0xfff6d0, 0xffffff, 0xffd980], area: { x: [side * 6.6, side * 8.0], y: [0.15, 0.15], z: [-150, 10] }, k: 0, vz: [18, 30], scale: [1, 1.4] });
    swarm({ geo: streakGeo(), material: mater, count: 10, seed: 19 + i, colors: [0xff3a3a, 0xff5a4a, 0xff8a3a], area: { x: [side * 8.6, side * 10.0], y: [0.15, 0.15], z: [-150, 10] }, k: 1, vz: [-14, -6], scale: [1, 1.4] });
  });
  stars(90, { colors: [0xffffff, 0xfff2c0, 0xcfe6ff] });
  features(pearl, { x: -25, spacing: 150, count: 2, z0: -80 });
  features(pagodaTower, { x: 27, spacing: 150, count: 2, z0: -150 });
}

export var w_shanghai_night_highway = { id: 'w_shanghai_night_highway', indoor: false, bay: bay, center: center, arch: arch, ground: ground, extras: extras };
