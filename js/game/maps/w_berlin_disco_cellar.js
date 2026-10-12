/**
 * w_berlin_disco_cellar.js — Berlin Disco Cellar (skin id 'skin_xray_vision', kept from the original game).
 *
 * A glowing club under a Berlin railway arch: warm brick vaults, a lit dance floor of coloured tiles, and every 16
 * units four scenes: a pink-and-cyan SPEAKER STACK under a BASS light box, the GRAFFITI wall (HALLO, a painted TV
 * tower), the DJ booth with a sunburst and a TANZEN light box, and the vaulted bar with a FEIER sign. Light boxes carry
 * bold German words. Overhead: brick ribs, spotlights and mirror balls. Moving: mirror balls spinning, light spots
 * sliding over the walls, sweeping beams, drifting confetti.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, sign, extrude, starShape, combine, xform, canvasTex, bulb,
  floorPanel, ceilingPanel, wallPanel, sideCtx
} from '../mapkit.js';
import { animated, features, swarm, spin, sway, shimmer } from '../mapfx.js';

var H = 6.4;
var PINK = 0xff4fa8;
var CYAN = 0x2ec8f0;
var YELLOW = 0xffd23f;
var LIME = 0x7ae04a;
var ORANGE = 0xff8a3a;
var VIOLET = 0xa066ff;
var WHITE = 0xffffff;
var CLUB = [PINK, CYAN, YELLOW, LIME, ORANGE, VIOLET];

var PPU = 96;
var WALL_W = 1536;
var WALL_H = 614;
function py(y) { return WALL_H - y * PPU; }

function rngOf(seed) {
  var s = seed;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function bricks(ctx, left, w, top, bottom, rnd, base) {
  var tones = base || ['#e8703a', '#f0834a', '#dc6432', '#f39a5a', '#e57a42'];
  ctx.fillStyle = '#ffe7c4'; ctx.fillRect(left, top, w, bottom - top);
  var row = 0;
  for (var y = top; y < bottom; y += 16) {
    var off = (row % 2) * 24;
    for (var x = left - 48 + off; x < left + w; x += 48) {
      ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
      ctx.fillRect(Math.max(left, x + 2), y + 2, Math.min(44, left + w - x - 2), 12);
    }
    row++;
  }
}

function neonLine(ctx, x0, y, x1, color) {
  ctx.fillStyle = color; ctx.fillRect(x0, y, x1 - x0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x0, y + 2, x1 - x0, 2);
}

function bubbleWord(ctx, text, cx, cy, size, fill, stroke) {
  ctx.font = '900 ' + size + 'px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.28; ctx.strokeStyle = stroke; ctx.strokeText(text, cx, cy);
  ctx.lineWidth = size * 0.1; ctx.strokeStyle = '#ffffff'; ctx.strokeText(text, cx, cy);
  ctx.fillStyle = fill; ctx.fillText(text, cx, cy);
}

function paintBay(ctx, k, cx) {
  var w = 384;
  var left = cx - w / 2;
  var rnd = rngOf(23 + k * 7);
  bricks(ctx, left, w + 1, 0, WALL_H, rnd);
  // glowing brick arches (the vault ribs come down the wall) at both edges of the bay
  [left, left + w].forEach(function (ex) {
    ctx.fillStyle = '#ffe7c4'; ctx.fillRect(ex - 9, 0, 18, WALL_H);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(ex - 9, 0, 5, WALL_H);
  });
  // a painted dado: coloured tiles low on the wall
  for (var t = 0; t < 12; t++) { ctx.fillStyle = CSS[(t + k) % CSS.length]; ctx.fillRect(left + t * 32, py(0.9), 32, 0.9 * PPU); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(left + t * 32, py(0.9), 32, 5); }
  neonLine(ctx, left + 14, py(0.92), left + w - 14, '#ffffff');
  neonLine(ctx, left + 14, py(5.95), left + w - 14, CSS[(k * 2) % CSS.length]);
  neonLine(ctx, left + 14, py(5.7), left + w - 14, CSS[(k * 2 + 1) % CSS.length]);

  if (k === 0) {
    // an arched niche, glowing, behind the speakers
    ctx.fillStyle = '#ffe7c4'; ctx.beginPath(); ctx.moveTo(cx - 150, py(1)); ctx.lineTo(cx - 150, py(3.7)); ctx.arc(cx, py(3.7), 150, Math.PI, 0); ctx.lineTo(cx + 150, py(1)); ctx.fill();
    var g = ctx.createLinearGradient(0, py(5.2), 0, py(1));
    g.addColorStop(0, '#ff8ad0'); g.addColorStop(1, '#ffd36a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 138, py(1)); ctx.lineTo(cx - 138, py(3.7)); ctx.arc(cx, py(3.7), 138, Math.PI, 0); ctx.lineTo(cx + 138, py(1)); ctx.fill();
  } else if (k === 1) {
    // the graffiti wall
    ctx.fillStyle = '#fff6e0'; ctx.fillRect(left + 22, py(5.5), w - 44, 4.3 * PPU);
    var gg = ctx.createLinearGradient(left, 0, left + w, 0);
    gg.addColorStop(0, '#7fe0ff'); gg.addColorStop(0.5, '#ffe58a'); gg.addColorStop(1, '#ff9ad0');
    ctx.fillStyle = gg; ctx.fillRect(left + 28, py(5.44), w - 56, 4.18 * PPU);
    bubbleWord(ctx, 'HALLO', cx, py(3.9), 78, '#ff3d8a', '#2a1a5a');
    bubbleWord(ctx, 'Tschüss!', cx - 20, py(2.3), 50, '#2ec84a', '#2a1a5a');
    // the TV tower: shaft, ball, antenna
    ctx.fillStyle = '#2a1a5a';
    ctx.beginPath(); ctx.moveTo(cx + 120, py(1.3)); ctx.lineTo(cx + 128, py(1.3)); ctx.lineTo(cx + 126, py(3.6)); ctx.lineTo(cx + 122, py(3.6)); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 124, py(3.3), 17, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#2a1a5a'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#2a1a5a'; ctx.fillRect(cx + 123, py(3.9), 2, 56);
    // stars and splats
    [[-130, 4.9, '#ffd23f'], [150, 4.8, '#7a4ae0'], [-150, 1.5, '#ff8a3a']].forEach(function (s) { ctx.fillStyle = s[2]; ctx.beginPath(); ctx.arc(cx + s[0], py(s[1]), 16, 0, Math.PI * 2); ctx.fill(); });
  } else if (k === 2) {
    // sunburst behind the DJ booth
    ctx.save(); ctx.beginPath(); ctx.rect(left + 22, py(5.5), w - 44, 4.5 * PPU); ctx.clip();
    for (var r = 0; r < 18; r++) {
      ctx.fillStyle = r % 2 ? '#ffd23f' : '#ff6ab4';
      ctx.beginPath(); ctx.moveTo(cx, py(1.6)); ctx.arc(cx, py(1.6), 380, (r / 18) * Math.PI * 2, ((r + 1) / 18) * Math.PI * 2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, py(3.2), 54, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1a5a'; ctx.beginPath(); ctx.arc(cx, py(3.2), 44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4fa8'; ctx.beginPath(); ctx.arc(cx, py(3.2), 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, py(3.2), 30, 0.3, 2.4); ctx.stroke();
    bubbleWord(ctx, 'DANKE', cx, py(5.0), 54, '#ffffff', '#c0207a');
  } else {
    // posters: ticket stubs and flyers for the night
    var pr = rngOf(77);
    for (var p = 0; p < 6; p++) {
      var px = left + 34 + (p % 3) * 108, pyy = py(4.7) + Math.floor(p / 3) * 150;
      ctx.save(); ctx.translate(px + 44, pyy + 62); ctx.rotate((pr() - 0.5) * 0.14);
      ctx.fillStyle = CSS[p % CSS.length]; ctx.fillRect(-44, -62, 92, 130);
      ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fillRect(-36, -54, 76, 56);
      ctx.fillStyle = '#2a1a5a'; ctx.font = '900 17px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(['KONZERT', 'FEIER', 'MUSIK', 'EINTRITT', 'LIVE', 'NACHT'][p], 2, -26, 70);
      ctx.fillStyle = '#ffffff'; ctx.font = '700 13px Arial, sans-serif'; ctx.fillText(['ab 22 Uhr', 'heute', 'laut!', 'frei', 'Band', 'bis 6 Uhr'][p], 2, 24, 80);
      ctx.restore();
    }
  }
}

var CSS = ['#ff4fa8', '#2ec8f0', '#ffd23f', '#7ae04a', '#ff8a3a', '#a066ff'];

function wallPicture(side) {
  return canvasTex('bd_wall' + side, WALL_W, WALL_H, function (ctx, w) {
    ctx.fillStyle = '#e8703a'; ctx.fillRect(0, 0, w, WALL_H);
    for (var k = 0; k < 4; k++) {
      var cx = (side > 0 ? k / 4 : ((4 - k) % 4) / 4) * w;
      [-w, 0, w].forEach(function (off) { paintBay(ctx, k, cx + off); });
    }
  });
}

function floorPicture() {
  // 12 across, 16 along, 48 px/unit: a dance floor of 1.5-unit coloured tiles
  return canvasTex('bd_floor', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#fff6e8'; ctx.fillRect(0, 0, w, h);
    var s = 48;
    for (var j = 0; j * s < h + s; j++) {
      for (var i = 0; i * s < w + s; i++) {
        var c = ['#ff8ac8', '#6fd8f5', '#ffe070', '#a4ea78', '#ffaa66', '#c0a0ff'][(i * 2 + j * 3 + ((i + j) % 2)) % 6];
        var g = ctx.createRadialGradient(i * s + s / 2, j * s + s / 2, 4, i * s + s / 2, j * s + s / 2, s * 0.7);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, c); g.addColorStop(1, c);
        ctx.fillStyle = g; ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      }
    }
  });
}

function ceilingPicture() {
  // 11.6 across, 16 along, 40 px/unit: a brick barrel vault with cream ribs
  return canvasTex('bd_ceiling', 464, 640, function (ctx, w, h) {
    bricks(ctx, 0, w, 0, h, rngOf(9), ['#f08a52', '#f79a62', '#e8784a', '#ffa872']);
    ctx.fillStyle = '#ffe7c4';
    for (var r = 0; r < 4; r++) ctx.fillRect(0, r * 160 + 76, w, 18);
    var g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,230,160,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

// ---------- scenes ----------

function lightBox(g, S, text, color, fg, x, y, z, ry) {
  // a glowing sign box with bold lettering; it sticks out and its face is lit
  box(g, 0.22, 0.62, 1.62, 0x3a2a5a, S.in(0.12), y, z, { ry: 0 });
  sign(g, text, color, fg, 1.5, 0.5, S.in(0.24), y, z, { ry: ry === undefined ? S.turn : ry, border: WHITE, tw: 256, th: 96 });
}

function speakerStack(g, S, z, i) {
  var x = S.in(0.5);
  var cols = [PINK, CYAN, YELLOW];
  [-1.0, 0.0, 1.0].forEach(function (dz, n) {
    var tall = n === 1 ? 3 : 2;
    for (var r = 0; r < tall; r++) {
      var c = cols[(n + r + i) % 3];
      box(g, 0.78, 0.95, 0.85, c, x, 0.5 + r * 0.98, z + dz * 0.95);
      box(g, 0.82, 0.06, 0.88, WHITE, x, 0.02 + r * 0.98 + 0.97, z + dz * 0.95);
      // the woofer: a ring, a dark cone, a dust cap, facing the lane
      var fx = x + S.side * -0.4;
      cyl(g, 0.3, 0.3, 0.05, WHITE, fx, 0.55 + r * 0.98, z + dz * 0.95, { rz: Math.PI / 2, seg: 12 });
      cyl(g, 0.23, 0.23, 0.07, 0x3a2a5a, fx + S.side * -0.01, 0.55 + r * 0.98, z + dz * 0.95, { rz: Math.PI / 2, seg: 12 });
      ball(g, 0.09, 0xfff0a0, fx + S.side * -0.06, 0.55 + r * 0.98, z + dz * 0.95, { seg: 6 });
      cyl(g, 0.07, 0.07, 0.04, WHITE, fx, 0.88 + r * 0.98, z + dz * 0.95, { rz: Math.PI / 2, seg: 8 });
    }
  });
  lightBox(g, S, 'BASS', PINK, WHITE, 0, 4.1, z, undefined);
}

function graffitiScene(g, S, z) {
  // a bench of crates, a spray can stack and a blade sign
  var x = S.in(0.55);
  [-1.4, 1.4].forEach(function (dz, n) {
    box(g, 0.7, 0.5, 0.9, n ? CYAN : LIME, x, 0.25, z + dz);
    box(g, 0.7, 0.5, 0.9, n ? PINK : YELLOW, x, 0.75, z + dz + 0.05, { ry: 0.12 });
    cyl(g, 0.09, 0.09, 0.3, ORANGE, x, 1.15, z + dz, { seg: 8 });
    cyl(g, 0.05, 0.05, 0.1, WHITE, x, 1.35, z + dz, { seg: 6 });
  });
  lightBox(g, S, 'HALLO', CYAN, 0x2a1a5a, 0, 4.35, z - 1.35, undefined);
  // a hanging blade sign facing the runner
  cyl(g, 0.02, 0.02, 1.1, 0x3a2a5a, S.in(0.5), 3.5, z + 1.7, { rz: Math.PI / 2, seg: 3 });
  sign(g, 'NACHT', VIOLET, WHITE, 1.2, 0.5, S.in(0.55), 3.25, z + 1.7, { border: YELLOW });
  // a star of light
  extrude(g, starShape(0.42, 0.2, 5), 0.08, YELLOW, S.in(0.1), 5.1, z + 1.2, { ry: S.turn, bulb: true, curve: 2 });
}

function djScene(g, S, z) {
  var x = S.in(0.5);
  // the booth: a long cabinet with a lit front, two turntables, a mixer
  box(g, 0.9, 1.1, 3.2, 0x5a2a8a, x, 0.55, z);
  box(g, 0.94, 0.08, 3.26, WHITE, x, 1.12, z);
  box(g, 0.04, 0.8, 2.8, PINK, S.in(0.04) + S.side * 0.0 + S.side * -0.0 + (S.side < 0 ? 0.42 : -0.42), 0.55, z, { bulb: true });
  [-0.9, 0.9].forEach(function (dz) {
    box(g, 0.6, 0.06, 0.7, 0xe8e8f0, x, 1.19, z + dz);
    cyl(g, 0.27, 0.27, 0.03, 0x2a1a5a, x, 1.23, z + dz, { seg: 12 });
    cyl(g, 0.07, 0.07, 0.04, YELLOW, x, 1.25, z + dz, { seg: 8 });
  });
  box(g, 0.4, 0.12, 0.5, CYAN, x, 1.2, z);
  // a DJ with big headphones: a round friendly figure
  ball(g, 0.3, ORANGE, x, 1.65, z + 0.0, { seg: 8, sy: 1.1 });
  ball(g, 0.2, 0xffd6a0, x, 2.1, z, { seg: 8 });
  ring(g, 0.22, 0.04, WHITE, x, 2.13, z, { ry: Math.PI / 2, seg: 10, tube: 3, arc: Math.PI });
  ball(g, 0.08, PINK, x, 2.08, z - 0.22, { seg: 5 });
  ball(g, 0.08, PINK, x, 2.08, z + 0.22, { seg: 5 });
  lightBox(g, S, 'TANZEN', YELLOW, 0xc0207a, 0, 4.1, z, undefined);
}

function barScene(g, S, z) {
  var x = S.in(0.5);
  // a bar counter with stools and bottles of soft drinks, and a FEIER sign
  box(g, 0.8, 1.0, 3.0, 0x3a8aff, x, 0.5, z);
  box(g, 0.9, 0.08, 3.1, WHITE, x, 1.04, z);
  [-1.1, -0.35, 0.4, 1.15].forEach(function (dz, n) {
    cyl(g, 0.22, 0.22, 0.05, [PINK, YELLOW, LIME, ORANGE][n], S.in(0.15) + (S.side < 0 ? 0.0 : 0.0), 0.62, z + dz, { seg: 8 });
  });
  [-1.0, 0, 1.0].forEach(function (dz, n) { cyl(g, 0.07, 0.06, 0.3, [LIME, ORANGE, PINK][n], x, 1.23, z + dz, { seg: 6 }); ball(g, 0.06, WHITE, x, 1.42, z + dz, { seg: 5 }); });
  [-1.0, 0.15, 1.2].forEach(function (dz, n) {
    cyl(g, 0.03, 0.03, 0.55, 0x3a2a5a, S.in(0.15), 0.28, z + dz, { seg: 5 });
    cyl(g, 0.2, 0.2, 0.08, [PINK, CYAN, YELLOW][n], S.in(0.15), 0.6, z + dz, { seg: 8 });
  });
  lightBox(g, S, 'FEIER', LIME, 0x2a1a5a, 0, 4.1, z, undefined);
  // a neon heart-less sparkle: a star on each side
  [-1.4, 1.4].forEach(function (dz, n) { extrude(g, starShape(0.3, 0.14, 5), 0.06, CLUB[n + 2], S.in(0.1), 3.0, z + dz, { ry: S.turn, bulb: true, curve: 2 }); });
}

function ribs(g, S, z, k) {
  // the vault comes down the wall in a brick pier at each bay edge
  box(g, 0.5, 5.4, 0.45, 0xf0a064, S.in(0.25), 3.0, z + 2.0);
  box(g, 0.1, 0.12, 0.5, WHITE, S.in(0.5), 5.7, z + 2.0, { bulb: true });
  // a spotlight on the wall top, throwing a coloured pool
  cone(g, 0.2, 0.4, 0x3a2a5a, S.in(0.3), 5.4, z + (k % 2 ? -0.8 : 0.8), { seg: 6, rz: S.side * 0.7 });
  ball(g, 0.12, CLUB[(k + (S.side > 0 ? 3 : 0)) % 6], S.in(0.5), 5.25, z + (k % 2 ? -0.8 : 0.8), { seg: 6, bulb: true });
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(side), side, z, H, 0.0, { r: 0.9 });
  ribs(g, S, z, k);
  if (k === 0) speakerStack(g, S, z, side > 0 ? 1 : 0);
  else if (k === 1) graffitiScene(g, S, z);
  else if (k === 2) djScene(g, S, z);
  else barScene(g, S, z);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12);
  ceilingPanel(g, ceilingPicture(), z, 11.6, H);
}

// ---------- overhead ----------

function arch(g, z, i) {
  // a brick rib across the vault, spots hanging from it and a string of bulbs along it
  ring(g, 5.2, 0.14, 0xffe7c4, 0, H - 1.5, z, { arc: Math.PI, seg: 20, tube: 4, sy: 0.27 });
  for (var n = 0; n < 9; n++) {
    var a = Math.PI * (n + 0.5) / 9;
    ball(g, 0.1, CLUB[(n + i) % 6], Math.cos(a) * 5.2, H - 1.5 + Math.sin(a) * 5.2 * 0.27, z, { seg: 5, bulb: true });
  }
  [-1, 1].forEach(function (s, n) {
    cyl(g, 0.02, 0.02, 0.6, 0x3a2a5a, s * 3.2, H - 0.3, z, { seg: 3 });
    cone(g, 0.22, 0.4, 0x3a2a5a, s * 3.2, H - 0.75, z, { seg: 6, rz: s * 0.5, rx: Math.PI });
    ball(g, 0.13, CLUB[(i + n * 2 + 1) % 6], s * 3.25, H - 0.95, z, { seg: 6, bulb: true });
  });
}

// ---------- the things that move ----------

function mirrorBall(n) {
  var m = new THREE.Group();
  var geo = new THREE.IcosahedronGeometry(0.75, 1).toNonIndexed();
  var tint = ['#ffffff', '#9fe6ff', '#ffc0e0', '#fff0a0'].map(function (c) { return new THREE.Color(c); });
  var cols = new Float32Array(geo.attributes.position.count * 3);
  for (var f = 0; f < geo.attributes.position.count / 3; f++) {
    var c = tint[(f * 7 + (f >> 2)) % 4];
    for (var v = 0; v < 3; v++) { cols[(f * 3 + v) * 3] = c.r; cols[(f * 3 + v) * 3 + 1] = c.g; cols[(f * 3 + v) * 3 + 2] = c.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  var pieces = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.3, flatShading: true, envMapIntensity: 0.9 }));
  m.add(pieces);
  cyl(m, 0.02, 0.02, 1.4, 0x555566, 0, 1.1, 0, { seg: 3 });
  cyl(m, 0.12, 0.12, 0.08, 0x555566, 0, 1.8, 0, { seg: 6 });
  m.position.y = H - 2.0;
  m.userData.keep = true;
  animated(m);
  spin(m, 'y', 0.6, n);
  // a glittering crown of sparkles around it
  var wrap = new THREE.Group();
  wrap.add(m);
  return wrap;
}

function beam(n) {
  // a soft translucent cone of coloured light from the ceiling, sweeping
  var grp = new THREE.Group();
  var c = CLUB[n % 6];
  var m = new THREE.Mesh(new THREE.ConeGeometry(1.2, 6, 10, 1, true), bulb(c, { add: true, op: 0.22, side: THREE.DoubleSide }));
  m.position.y = -3;
  grp.add(m);
  grp.position.y = H - 0.2;
  animated(grp);
  sway(grp, 'z', 0.5, 0.7, n * 1.3);
  return grp;
}

function extras() {
  features(mirrorBall, { x: 0, y: 0, spacing: 32, count: 5, z0: -16 });
  features(beam, { x: -4.2, spacing: 40, count: 4, z0: -10 });
  features(function (n) { return beam(n + 3); }, { x: 4.2, spacing: 40, count: 4, z0: -30 });
  // light spots from the mirror ball slide over both walls
  var glow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  [-1, 1].forEach(function (side, i) {
    var geo = combine([{ geo: new THREE.CircleGeometry(0.38, 12), color: 0xffffff, matrix: xform(0, 0, 0, 0, side * -Math.PI / 2, 0) }]);
    swarm({ geo: geo, material: glow, count: 16, seed: 21 + i, colors: CLUB, area: { x: [side * 5.42, side * 5.42], y: [0.6, 5.6], z: [-140, 8] }, k: 1, vz: [-2.4, 2.4], vy: [-0.25, 0.25], scale: [0.6, 1.5] });
    var conf = combine([{ geo: new THREE.PlaneGeometry(0.14, 0.09), color: 0xffffff }]);
    swarm({ geo: conf, material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), count: 30, seed: 60 + i, colors: CLUB, area: { x: [side * 4.4, side * 5.3], y: [0.4, 6.0], z: [-120, 6] }, k: 1, vy: [-0.9, -0.5], wobble: 0.3, turn: 3, scale: [1, 1.6] });
  });
  // the bulbs on the ribs breathe
  shimmer(bulb(0xffffff, { op: 0.95 }), 0.85, 0.12, 2.6, 0);
}

export var w_berlin_disco_cellar = {
  id: 'w_berlin_disco_cellar',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
