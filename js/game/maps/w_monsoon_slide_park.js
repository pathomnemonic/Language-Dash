/**
 * w_monsoon_slide_park.js — Monsoon Slide Park (skin 'Vascular Rush': the key is kept, the scene is new): a Mumbai/Kerala
 * splash park in warm monsoon rain.
 *
 * The runner follows a wet terracotta promenade between two low tiled walls. Along each wall: a chai stall, a spiral
 * water-slide tower, a lounge of striped umbrellas and a mushroom fountain with a giant rubber duck. A fat flume
 * tube winds above each wall, marigold garlands droop between the posts, rings stand across the track every few
 * seconds, and a painted skyline of apartment blocks and palms sits behind the pools. Rain streaks fall, petals
 * drift, and the signs teach: नमस्ते (hello), स्वागत (welcome), चाय (tea), पानी (water).
 * Everything stays outside the lanes (the rings are arches, the tubes run overhead).
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, quad, slab, bulb, mat, canvasTex, stripeTex, combine, xform,
  floorPanel, wallPanel, sideCtx
} from '../mapkit.js';
import { swarm, shimmer, flow, cloudBank } from '../mapfx.js';

var MARIGOLD = 0xffb21f;
var ORANGE = 0xff7a2a;
var RED = 0xe8413a;
var TEAL = 0x1fb8b4;
var BLUE = 0x2f86e0;
var YELLOW = 0xffd23f;
var GREEN = 0x34b45a;
var WOOD = 0xb8763a;
var TUBE = [RED, YELLOW, TEAL, ORANGE];

var DEVA = '"Noto Sans Devanagari","Nirmala UI","Kohinoor Devanagari",Mangal,FreeSans,"Arial Unicode MS",sans-serif';
var LATIN = '"Arial Rounded MT Bold","Trebuchet MS",Arial,sans-serif';

// ---------- painted pictures ----------

/** The promenade: terracotta tiles, cream grout and puddles that hold the sky. 12 across, 16 along, 48px to the unit. */
function floorPicture() {
  return canvasTex('monsoon_floor', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#f7e4c4';
    ctx.fillRect(0, 0, w, h);
    var tones = ['#f29a5e', '#ec8a52', '#f5a96c', '#e98250'];
    for (var j = 0; j < 16; j++) {
      for (var i = 0; i < 12; i++) {
        ctx.fillStyle = tones[(i * 3 + j * 5 + ((i * j) % 3)) % 4];
        ctx.fillRect(i * 48 + 2, j * 48 + 2, 44, 44);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(i * 48 + 2, j * 48 + 2, 44, 4);
      }
    }
    // puddles at the sides and a few across the middle, each with a sky reflection, a shine and ripple rings
    var puddles = [[70, 120, 62, 26], [490, 260, 72, 30], [120, 420, 80, 30], [440, 560, 60, 24], [300, 690, 70, 24], [60, 640, 48, 20], [500, 90, 46, 18], [290, 300, 54, 20]];
    puddles.forEach(function (p) {
      var g = ctx.createRadialGradient(p[0], p[1] - 4, 4, p[0], p[1], p[2]);
      g.addColorStop(0, '#d8f6ff');
      g.addColorStop(0.6, '#8fdcee');
      g.addColorStop(1, '#5cc5df');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p[0], p[1], p[2], p[3], 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
      for (var r = 1; r <= 2; r++) { ctx.beginPath(); ctx.ellipse(p[0] + p[2] * 0.2, p[1], p[2] * 0.22 * r, p[3] * 0.22 * r, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(31,150,175,0.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(p[0], p[1], p[2], p[3], 0, 0.2, Math.PI - 0.2); ctx.stroke();
    });
  });
}

/** A strip of teal and white tile for the front of the low wall (16 long, 1.2 high). */
function tileTex() {
  return canvasTex('monsoon_tile', 1024, 77, function (ctx, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 32; i++) {
      for (var j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#22bdb5' : '#139e9c';
        ctx.fillRect(i * 32 + 2, j * 32 + 3, 28, 28);
      }
    }
    ctx.fillStyle = '#ffb21f';
    ctx.fillRect(0, 0, w, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 7, w, 4);
  });
}

/** The backdrop: monsoon haze, apartment blocks of Mumbai in candy colours, palms, banana leaves. 16 x 9 units. */
function skylineTex() {
  return canvasTex('monsoon_skyline', 1024, 576, function (ctx, w, h) {
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#9fd8e6');
    sky.addColorStop(0.55, '#ffd9b4');
    sky.addColorStop(1, '#ffeacc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // far blocks, pale and hazy
    var far = ['#f6c7a6', '#f2d6a0', '#cfe8dc', '#f4b8a4', '#d9e6f0'];
    for (var i = 0; i < 12; i++) {
      var bw = 60 + ((i * 37) % 40);
      var bh = 150 + ((i * 71) % 130);
      var x = i * 86 - 10;
      ctx.fillStyle = far[i % far.length];
      ctx.fillRect(x, h * 0.74 - bh, bw, bh + 40);
    }
    // near blocks with balconies and window grids, in candy colours
    var near = ['#ff8f7a', '#ffc94a', '#5fd0c8', '#ff9fb5', '#8fd86a', '#ffad55', '#6fb8f0', '#ffd37a'];
    for (var b = 0; b < 8; b++) {
      var nw = 104 + ((b * 29) % 40);
      var nh = 190 + ((b * 53) % 150);
      var nx = b * 128 + 6;
      var top = h * 0.82 - nh;
      ctx.fillStyle = near[b];
      ctx.fillRect(nx, top, nw, nh + 60);
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(nx, top, nw, 10);
      for (var r = 0; r < Math.floor(nh / 36); r++) {
        for (var c = 0; c < 3; c++) {
          var wx = nx + 14 + c * ((nw - 28) / 3);
          var wy = top + 22 + r * 36;
          ctx.fillStyle = '#fff4dc'; ctx.fillRect(wx, wy, 22, 20);
          ctx.fillStyle = '#4aa8c4'; ctx.fillRect(wx + 3, wy + 3, 16, 14);
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(wx - 3, wy + 20, 28, 4);
        }
      }
    }
    // palms
    function palm(px, base, ht, lean) {
      ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, base); ctx.quadraticCurveTo(px + lean * 0.4, base - ht * 0.55, px + lean, base - ht); ctx.stroke();
      ctx.fillStyle = '#2ea65a';
      for (var f = 0; f < 7; f++) {
        var a = Math.PI + (f / 6) * Math.PI;
        var ex = px + lean + Math.cos(a) * 78;
        var ey = base - ht + Math.sin(a) * 42 + 18;
        ctx.beginPath();
        ctx.moveTo(px + lean, base - ht);
        ctx.quadraticCurveTo(px + lean + Math.cos(a) * 40, base - ht - 34 + Math.sin(a) * 8, ex, ey);
        ctx.quadraticCurveTo(px + lean + Math.cos(a) * 40, base - ht - 14, px + lean, base - ht + 4);
        ctx.fill();
      }
    }
    palm(130, h * 0.9, 300, 30); palm(390, h * 0.9, 250, -26); palm(640, h * 0.9, 330, 24); palm(900, h * 0.9, 270, -30);
    // lush green at the bottom: banana leaves
    ctx.fillStyle = '#3fb867'; ctx.fillRect(0, h * 0.88, w, h * 0.12);
    ctx.fillStyle = '#58cf78';
    for (var l = 0; l < 22; l++) {
      var lx = l * 48 + 6;
      ctx.beginPath(); ctx.ellipse(lx, h * 0.9, 20, 52 + (l % 3) * 12, ((l % 5) - 2) * 0.22, 0, Math.PI * 2); ctx.fill();
    }
    // rain haze: slanted streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 2;
    for (var s = 0; s < 120; s++) {
      var sx = (s * 97) % w; var sy = (s * 53) % h;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 8, sy + 34); ctx.stroke();
    }
  });
}

/** A hanging sign: a Devanagari word big, the meaning small under it. */
function plateTex(name, deva, en, bg, fg, border) {
  return canvasTex('monsoon_plate_' + name, 320, 128, function (ctx, w, h) {
    ctx.fillStyle = '#' + ('000000' + border.toString(16)).slice(-6);
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(2, 2, w - 4, h - 4, 26); else ctx.rect(2, 2, w - 4, h - 4); ctx.fill();
    ctx.fillStyle = '#' + ('000000' + bg.toString(16)).slice(-6);
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(10, 10, w - 20, h - 20, 20); else ctx.rect(10, 10, w - 20, h - 20); ctx.fill();
    ctx.fillStyle = '#' + ('000000' + fg.toString(16)).slice(-6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 62px ' + DEVA;
    ctx.fillText(deva, w / 2, h * 0.42);
    ctx.font = '900 30px ' + LATIN;
    ctx.fillText(en, w / 2, h * 0.8);
  });
}

function stripeAwning() {
  return stripeTex(0xff7a2a, 0xfff1d8, 5);
}

/** A strip of marigold garland: two sagging strings of orange and yellow flowers (alpha cut-out). 4 units long, 1 high. */
function garlandTex() {
  return canvasTex('monsoon_garland', 512, 128, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    for (var s = 0; s < 2; s++) {
      var x0 = s * 256;
      for (var i = 0; i < 12; i++) {
        var t = (i + 0.5) / 12;
        var x = x0 + t * 256;
        var y = 20 + Math.sin(t * Math.PI) * 62;
        ctx.fillStyle = '#2f8f4a';
        ctx.beginPath(); ctx.ellipse(x, y + 8, 7, 12, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#7a3a10';
        ctx.fillStyle = i % 2 ? '#ffb21f' : '#ff7a2a';
        ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = i % 2 ? '#ffd966' : '#ffa45c';
        ctx.beginPath(); ctx.arc(x - 3, y - 3, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
  });
}

/** The back of the chai stall: shelves of glass tumblers, tea tins and a clock, painted. */
function stallBackTex() {
  return canvasTex('monsoon_stallback', 256, 128, function (ctx, w, h) {
    ctx.fillStyle = '#e0553a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c93f27'; for (var i = 0; i < 8; i++) ctx.fillRect(i * 32, 0, 3, h);
    [40, 90].forEach(function (y, r) {
      ctx.fillStyle = '#8a5524'; ctx.fillRect(6, y + 20, w - 12, 8);
      for (var j = 0; j < 8; j++) {
        var x = 18 + j * 29;
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#4a2a10';
        if ((j + r) % 3 === 0) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - 8, y - 8, 20, 28); ctx.strokeRect(x - 8, y - 8, 20, 28); ctx.fillStyle = '#c2321f'; ctx.fillRect(x - 5, y + 2, 14, 7); }
        else { ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fillRect(x - 6, y, 16, 20); ctx.strokeRect(x - 6, y, 16, 20); ctx.fillStyle = '#d9822b'; ctx.fillRect(x - 5, y + 9, 14, 10); }
      }
    });
  });
}

// ---------- material helpers ----------

var _decals = {};
/** A cut-out picture: unlit, with transparent parts left out. */
function decalMat(tex, fallback) {
  var k = tex ? tex.uuid : 'x' + fallback;
  return _decals[k] || (_decals[k] = new THREE.MeshBasicMaterial({ color: tex ? 0xffffff : fallback, map: tex || null, alphaTest: 0.4, side: THREE.DoubleSide }));
}

var _plateMats = {};
function plateMat(tex, fallback) {
  var k = tex ? tex.uuid : 'x' + fallback;
  return _plateMats[k] || (_plateMats[k] = bulb(tex ? 0xffffff : fallback, { map: tex || null, side: THREE.DoubleSide }));
}

/** A hanging sign standing across the view (it faces the runner), hung from a short rail. */
function plate(g, tex, fallback, w, h, x, y, z, yaw) {
  quad(g, w, h, 0xffffff, x, y, z, { mat: plateMat(tex, fallback), ry: yaw || 0 });
}

var _water = null;
function waterMat() { return _water || (_water = bulb(0x9fe8f8, { op: 0.55, side: THREE.DoubleSide })); }

// ---------- the park, one bay on one side ----------

function frontWall(g, S, z) {
  // a low tiled wall with a marigold-yellow cap, two garland posts and a painted swag of marigolds between them
  box(g, 0.5, 1.1, 4, 0xffffff, S.in(0.4), 0.55, z, { r: 0.6 });
  wallPanel(g, tileTex(), S.side, z, 1.1, 0.68, { r: 0.55 });
  box(g, 0.6, 0.1, 4, YELLOW, S.in(0.4), 1.15, z);
  [-2, 0].forEach(function (dz) {
    cyl(g, 0.07, 0.07, 3.0, WOOD, S.in(0.55), 1.5, z + dz, { seg: 5 });
  });
  // the swag hangs in a plane facing the track
  var gt = garlandTex();
  quad(g, 4, 1, 0xffffff, S.in(0.55), 2.45, z, { mat: decalMat(gt, MARIGOLD), ry: S.turn });
}

function chai(g, S, z) {
  var x = S.in(0.4);
  // counter, back shelf, a striped canopy, kettle and rows of little glasses
  box(g, 0.9, 1.0, 2.6, WOOD, x, 0.5, z, { r: 0.7 });
  box(g, 1.05, 0.1, 2.75, 0xffe2a8, x, 1.05, z);
  box(g, 0.2, 1.9, 2.4, 0xe0553a, S.in(0.1), 1.95, z - 0.2);
  quad(g, 2.3, 1.15, 0xffffff, S.in(0.215), 2.0, z - 0.2, { map: stallBackTex(), ry: S.turn, r: 0.8 });
  var tilt = S.side * 0.32;
  quad(g, 2.9, 1.3, 0xffffff, S.in(0.5) - S.side * 0.1, 3.3, z, { map: stripeAwning(), r: 0.6, side: THREE.DoubleSide });
  // (the canopy above is a flat awning facing the runner; the roof slats on top give it depth)
  box(g, 1.2, 0.08, 2.9, 0xff7a2a, S.in(0.5), 3.95, z, { rz: tilt });
  cyl(g, 0.05, 0.05, 2.1, WOOD, S.in(0.88), 2.5, z - 1.4, { seg: 5 });
  cyl(g, 0.05, 0.05, 2.1, WOOD, S.in(0.88), 2.5, z + 1.4, { seg: 5 });
  // the kettle: a squat steel pot with a spout and a handle ring
  ball(g, 0.26, 0xd9dde6, x, 1.35, z + 0.4, { seg: 7, sy: 0.9, m: 0.5, r: 0.35 });
  cone(g, 0.05, 0.3, 0xd9dde6, x - S.side * 0.25, 1.5, z + 0.4, { seg: 4, rz: S.side * 0.9 });
  ring(g, 0.17, 0.025, 0x555a66, x, 1.65, z + 0.4, { seg: 8, tube: 3, arc: Math.PI });
  for (var j = 0; j < 3; j++) box(g, 0.13, 0.15, 0.13, 0xfff5dc, x - S.side * 0.2, 1.17, z - 0.4 - j * 0.3);
  // stools out front would be in the lane; instead two crates by the wall
  box(g, 0.4, 0.4, 0.4, 0x2d9d6a, S.in(0.5), 0.2, z + 1.6);
  box(g, 0.4, 0.4, 0.4, 0xff7a2a, S.in(0.5), 0.2, z + 2.05 - 0.05);
  plate(g, plateTex('chai', 'चाय', 'Chai · Tea', 0xfff1d8, 0xc2321f, 0xe0553a), 0xffe9c0, 1.7, 0.68, S.in(0.45), 4.55, z + 0.1);
}

function slideTower(g, S, z) {
  var cx = S.in(0.0);
  var tz = z - 0.2;
  // the tower: four posts, stair treads, a platform with a little roof
  [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]].forEach(function (p) {
    cyl(g, 0.07, 0.07, 4.6, 0xffffff, cx + p[0] * 0.6 - S.side * 0.1, 2.3, tz + p[1], { seg: 5 });
  });
  box(g, 1.1, 0.12, 1.3, YELLOW, cx - S.side * 0.1, 4.55, tz);
  cone(g, 1.0, 0.7, RED, cx - S.side * 0.1, 5.5, tz, { seg: 4, ry: Math.PI / 4 });
  for (var s = 0; s < 7; s++) box(g, 0.45, 0.07, 0.5, 0xffffff, cx - S.side * 0.1, 0.5 + s * 0.55, tz - 1.3 + s * 0.2, { r: 0.5 });
  // the slide: a spiral of tube around the tower, ending in a runout trough toward the runner
  var pts = [];
  var R = 0.82;
  var turns = 1.3;
  for (var i = 0; i <= 18; i++) {
    var t = i / 18;
    var a = t * turns * Math.PI * 2 + Math.PI * 0.15;
    pts.push(new THREE.Vector3(cx - S.side * 0.15 + Math.cos(a) * R * 0.98 * (1 - 0.0 * t), 4.2 - t * 3.6, tz + Math.sin(a) * R * 1.6));
  }
  var curve = new THREE.CatmullRomCurve3(pts);
  var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.3, 6, false), mat(BLUE, { r: 0.35 }));
  g.add(tube);
  // rim stripe and water at the bottom
  box(g, 0.7, 0.14, 1.6, TEAL, cx - S.side * 0.1, 0.5, z + 1.7, { rx: 0.08 });
  quad(g, 0.5, 1.4, 0xffffff, cx - S.side * 0.1, 0.62, z + 1.75, { mat: waterMat(), rx: -Math.PI / 2 });
  plate(g, plateTex('splash', 'पानी', 'Pani · Water', 0xe6faff, 0x0f6fb8, 0x2f86e0), 0xdff6ff, 1.7, 0.68, S.in(0.3), 6.3, z + 0.1);
}

function umbrellas(g, S, z) {
  var tex = stripeTex(0xe8413a, 0xfff1d8, 6);
  var tex2 = stripeTex(0x1fb8b4, 0xffd23f, 6);
  [[-1.0, tex, 0.12], [1.15, tex2, -0.1]].forEach(function (u, i) {
    var x = S.in(0.3);
    cyl(g, 0.04, 0.04, 2.8, 0xf4f4f8, x, 1.4, z + u[0], { seg: 5 });
    cone(g, 1.35, 0.6, 0xffffff, x - S.side * 0.1, 2.95, z + u[0], { seg: 10, map: u[1], r: 0.5, rz: S.side * u[2] });
    ball(g, 0.08, MARIGOLD, x - S.side * 0.1, 3.3, z + u[0], { seg: 4 });
    // a little table and two stools
    cyl(g, 0.4, 0.4, 0.07, 0xffffff, x, 0.7, z + u[0], { seg: 8 });
    cyl(g, 0.05, 0.05, 0.7, 0xdddddd, x, 0.35, z + u[0], { seg: 4 });
  });
  // a bench and a pair of floaties (rings) against the wall
  box(g, 0.45, 0.07, 1.5, WOOD, S.in(0.6), 0.5, z + 0.1);
  box(g, 0.07, 0.5, 1.5, WOOD, S.in(0.8), 0.78, z + 0.1);
  ring(g, 0.34, 0.12, 0xff6f91, S.in(0.4), 0.45, z - 1.8, { rx: Math.PI / 2, seg: 10, tube: 5 });
  ring(g, 0.34, 0.12, 0xffd23f, S.in(0.5), 0.45, z + 1.9, { rx: Math.PI / 2, seg: 10, tube: 5 });
  plate(g, plateTex('swagat', 'स्वागत', 'Swagat · Welcome', 0xfff1d8, 0xd9432c, 0xffb21f), 0xffe9c0, 1.9, 0.76, S.in(0.35), 4.7, z + 0.1);
}

function fountain(g, S, z) {
  var x = S.in(0.0);
  // a mushroom fountain: stem, a big red cap with cream dots, and a veil of falling water
  cyl(g, 0.3, 0.45, 2.4, 0xffffff, x, 1.2, z - 0.3, { seg: 8 });
  cone(g, 1.4, 0.8, RED, x, 2.7, z - 0.3, { seg: 10 });
  for (var d = 0; d < 5; d++) {
    var a = d * 1.3;
    ball(g, 0.14, 0xfff1d8, x - S.side * (0.2 + 0.32 * Math.cos(a)), 2.78 - 0.12 * Math.abs(Math.sin(a)), z - 0.3 + Math.sin(a) * 0.7, { seg: 4 });
  }
  cyl(g, 1.15, 1.2, 1.45, 0xffffff, x, 1.65, z - 0.3, { seg: 10, mat: waterMat(), side: THREE.DoubleSide });
  cyl(g, 1.5, 1.5, 0.14, TEAL, x, 0.07, z - 0.3, { seg: 10 });
  // a giant rubber duck
  var dx = S.in(0.45);
  var dz = z + 1.6;
  ball(g, 0.5, YELLOW, dx, 0.55, dz, { seg: 6, sy: 0.85, sz: 1.2 });
  ball(g, 0.33, YELLOW, dx, 1.2, dz - 0.22 * 0 + 0.3, { seg: 6 });
  cone(g, 0.12, 0.3, ORANGE, dx - S.side * 0.0, 1.17, dz + 0.65, { seg: 4, rx: Math.PI / 2 });
  ball(g, 0.05, 0x1b2a41, dx - 0.14, 1.28, dz + 0.55, { seg: 4 });
  ball(g, 0.05, 0x1b2a41, dx + 0.14, 1.28, dz + 0.55, { seg: 4 });
  ball(g, 0.2, YELLOW, dx, 0.7, dz - 0.55, { seg: 5, sy: 1.1 });
  plate(g, plateTex('maza', 'मज़ा', 'Maza · Fun', 0xfff1d8, 0xe8413a, 0xff7a2a), 0xffe9c0, 1.7, 0.68, S.in(0.3), 4.6, z - 1.3);
}

function palm(g, S, z, dz, h) {
  var x = S.out(1.4);
  cyl(g, 0.12, 0.2, h, 0xa5703a, x, h / 2, z + dz, { seg: 5 });
  for (var f = 0; f < 6; f++) {
    var a = (f / 6) * Math.PI * 2;
    cone(g, 0.2, 1.9, GREEN, x + Math.cos(a) * 0.7, h + 0.05, z + dz + Math.sin(a) * 0.7, { seg: 3, rz: Math.cos(a) * 1.15, rx: -Math.sin(a) * 1.15 });
  }
}

/** The fat flume tube winding above each wall. Its path repeats every 8 units, so it runs through the bays seamlessly. */
function flume(g, S, z, k) {
  function at(zz) {
    var u = (zz * Math.PI) / 4;
    return new THREE.Vector3(S.side * (4.95 + 0.5 * Math.sin(u)), 3.9 + 0.65 * Math.sin(u + 1.0), zz);
  }
  var pts = [];
  for (var i = 0; i <= 8; i++) pts.push(at(z - 2 + i * 0.5));
  var tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.42, 6, false), mat(TUBE[k], { r: 0.3 }));
  g.add(tube);
  // collars at the joints and posts down to the wall
  var e = at(z - 2);
  cyl(g, 0.47, 0.47, 0.14, 0xffffff, e.x, e.y, e.z + 0.0, { rx: Math.PI / 2, seg: 6 });
  [-1, 1].forEach(function (dz) {
    var p = at(z + dz);
    cyl(g, 0.07, 0.07, p.y - 0.4, 0xffffff, S.side * 5.15, (p.y - 0.4) / 2, p.z, { seg: 5 });
  });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, skylineTex(), side, z, 9.5, -5.2, { r: 1, env: 0.1, e: 0xffffff, ei: 0.25 });
  frontWall(g, S, z);
  flume(g, S, z, k);
  if (k === 0) chai(g, S, z);
  else if (k === 1) slideTower(g, S, z);
  else if (k === 2) umbrellas(g, S, z);
  else fountain(g, S, z);
  if (k === 0 || k === 2) palm(g, S, z, k === 0 ? -1.6 : 1.4, 3.8);
  if (k === 1 || k === 3) palm(g, S, z, k === 1 ? 1.6 : -1.5, 3.2);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12);
}

// ---------- fixtures across the track ----------

var RINGS = [0xff5a3c, TEAL, 0xffc21f, BLUE];
var SIGNS = [['hello', 'नमस्ते', 'Namaste · Hello', 0xfff1d8, 0xc2321f, 0xe0553a], ['welcome', 'स्वागत', 'Swagat · Welcome', 0xe6faff, 0x0f6a8a, 0x1fb8b4], ['water', 'पानी', 'Pani · Water', 0xfff1d8, 0x0f6fb8, 0x2f86e0], ['maza', 'मज़ा', 'Maza · Fun', 0xfff6d0, 0xe8413a, 0xffb21f]];

function arch(g, z, i) {
  // a splash ring to run through: a big half ring standing on the walls, with a banner and spray nozzles
  var c = RINGS[i % 4];
  ring(g, 4.95, 0.22, c, 0, 0.05, z, { seg: 20, tube: 5, arc: Math.PI, sy: 1.12, r: 0.4, e: c, ei: 0.5 });
  [-1, 1].forEach(function (s, n) {
    ball(g, 0.34, c, s * 4.95, 0.35, z, { seg: 6, sy: 0.7 });
    cone(g, 0.12, 0.45, 0xffffff, s * 4.95, 5.3, z, { seg: 4, rz: Math.PI });
  });
  var sg = SIGNS[i % 4];
  var tex = plateTex(sg[0], sg[1], sg[2], sg[3], sg[4], sg[5]);
  plate(g, tex, 0xfff1d8, 2.3, 0.92, 0, 4.4, z, 0);
  cyl(g, 0.02, 0.02, 0.9, 0x555a66, -0.9, 5.3, z, { seg: 3 });
  cyl(g, 0.02, 0.02, 0.9, 0x555a66, 0.9, 5.3, z, { seg: 3 });
}

function ground(g) {
  // lawn beyond the promenade, and a channel of moving water along each side
  slab(g, 400, 400, 0x4fbf6a, 0, -0.04, -190, { r: 1 });
  var tex = canvasTex('monsoon_channel', 128, 128, function (ctx, w, h) {
    ctx.fillStyle = '#35c7d6'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
    for (var i = 0; i < 6; i++) { ctx.beginPath(); for (var x = 0; x <= w; x += 8) ctx.lineTo(x, 12 + i * 22 + Math.sin((x / w) * Math.PI * 2 + i) * 5); ctx.stroke(); }
  }, { repeat: [2, 60] });
  [-1, 1].forEach(function (s) { slab(g, 3.2, 440, tex ? 0xffffff : 0x35c7d6, s * 7.6, 0.02, -200, { map: tex || undefined, r: 0.3, env: 0.6 }); });
  if (tex) flow(tex, 0, 0.35);
}

// ---------- things that move ----------

function streakGeo() {
  return combine([{ geo: new THREE.CylinderGeometry(0.014, 0.014, 0.9, 3), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0.12) }]);
}

function petalGeo() {
  var s = new THREE.Shape();
  s.moveTo(0, 0.1); s.quadraticCurveTo(0.1, 0.0, 0, -0.1); s.quadraticCurveTo(-0.1, 0.0, 0, 0.1);
  return combine([{ geo: new THREE.ShapeGeometry(s), color: 0xffffff, matrix: xform(0, 0, 0) }]);
}

function extras() {
  cloudBank(8, { seed: 3, colors: [0xffd6b8, 0xffe6cc, 0xfff0e0], area: { x: [-70, 70], y: [16, 32], z: [-150, 10] } });
  // warm rain, falling fast and slanting a little
  var rain = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false });
  swarm({ geo: streakGeo(), material: rain, count: 150, seed: 77, colors: [0xffffff, 0xd6f2ff], area: { x: [-9, 9], y: [0, 9], z: [-70, 8] }, k: 0.2, vy: [-17, -23], vx: [0.8, 1.6], scale: [0.8, 1.3] });
  // marigold petals drifting
  swarm({ geo: petalGeo(), material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), count: 36, seed: 12, colors: [MARIGOLD, ORANGE, YELLOW], area: { x: [-8, 8], y: [0.6, 6], z: [-140, 8] }, k: 1, vy: [-0.5, -0.2], wobble: 0.4, turn: 1.5, scale: [0.9, 1.5] });
  shimmer(waterMat(), 0.55, 0.12, 2.4, 0);
}

export var w_monsoon_slide_park = {
  id: 'w_monsoon_slide_park',
  indoor: false,
  bay: bay,
  center: center,
  arch: arch,
  ground: ground,
  extras: extras
};
