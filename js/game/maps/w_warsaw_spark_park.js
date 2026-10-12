/**
 * w_warsaw_spark_park.js — Warsaw Spark Park (skin id 'skin_defibrillator_shock', kept from the original game).
 *
 * An electric amusement park in Warsaw, in warm sun and blue-white sparks. The walls are a yellow-and-blue fairground
 * hoarding; every 16 units four attractions: TESLA COILS with arcing sparks, a BUMPER CAR arena (AUTOSKUTERY), a
 * pavilion with a hanging MARIA SKŁODOWSKA-CURIE poster and the Palace of Culture painted on the wall, and the
 * CHARGE-O-METER with its gauge. Polish red-and-white pennants, "Cześć!" signs and warm string lamps are everywhere.
 * Moving: sparks and arcs flickering, charged balloons, confetti, the Palace of Culture towering past in the distance.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, quad, sign, extrude, combine, xform, canvasTex, bulb,
  floorPanel, wallPanel, sideCtx
} from '../mapkit.js';
import { animated, features, swarm, shimmer, bob, cloudBank } from '../mapfx.js';
import { boltShape } from './cartoon.js';

var H = 6.4;
var SUN = 0xffe14a;
var BLUE = 0x2f9bff;
var NAVY = 0x23428f;
var RED = 0xe8334a;
var WHITE = 0xffffff;
var COPPER = 0xe0902c;
var CREAM = 0xfff0c8;
var ELEC = 0xcfeaff;
var GREEN = 0x4fd070;
var CAR = [RED, BLUE, 0xff8a1f, GREEN, 0xff5fc0, SUN];

var PPU = 96;
var WALL_W = 1536;
var WALL_H = 614;
function py(y) { return WALL_H - y * PPU; }

function rngOf(seed) {
  var s = seed;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ---------- pictures ----------

function zigPath(ctx, x0, y0, x1, y1, n, amp, rnd) {
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (var i = 1; i < n; i++) {
    var t = i / n;
    ctx.lineTo(x0 + (x1 - x0) * t + (rnd() - 0.5) * amp, y0 + (y1 - y0) * t + (rnd() - 0.5) * amp);
  }
  ctx.lineTo(x1, y1);
}

function paintBay(ctx, k, cx) {
  var w = 384;
  var left = cx - w / 2;
  var rnd = rngOf(5 + k * 11);
  // warm yellow hoarding with a lighter top
  var g = ctx.createLinearGradient(0, 0, 0, WALL_H);
  g.addColorStop(0, '#fff2a0'); g.addColorStop(1, '#ffd84a');
  ctx.fillStyle = g; ctx.fillRect(left, 0, w + 1, WALL_H);
  // blue panels with white rivets
  for (var p = 0; p < 2; p++) {
    var bx = left + 12 + p * 186;
    ctx.fillStyle = '#e8f4ff'; ctx.fillRect(bx, py(5.55), 174, 4.5 * PPU);
    ctx.fillStyle = '#2f9bff'; ctx.fillRect(bx + 6, py(5.5), 162, 4.4 * PPU);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(bx + 6, py(5.5), 162, 8);
    ctx.fillStyle = '#ffffff';
    [[14, 14], [160, 14], [14, 4.4 * PPU - 14], [160, 4.4 * PPU - 14]].forEach(function (r) { ctx.beginPath(); ctx.arc(bx + r[0], py(5.5) + r[1], 4, 0, Math.PI * 2); ctx.fill(); });
  }
  // blue-and-white striped plinth
  for (var s = 0; s < 24; s++) { ctx.fillStyle = s % 2 ? '#ffffff' : '#2f9bff'; ctx.fillRect(left + s * 16, py(0.9), 16, 0.9 * PPU); }
  ctx.fillStyle = '#23428f'; ctx.fillRect(left, py(0.95), w, 6);
  // roof stripe at the top: Polish red and white
  for (var f = 0; f < 12; f++) { ctx.fillStyle = f % 2 ? '#ffffff' : '#e8334a'; ctx.fillRect(left + f * 32, 0, 32, 34); }
  ctx.fillStyle = '#23428f'; ctx.fillRect(left, 34, w, 5);

  if (k === 0) {
    // painted lightning in the blue panels
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    for (var a = 0; a < 5; a++) { zigPath(ctx, left + 18 + a * 12, py(5.2), left + 30 + a * 70, py(1.4), 8, 40, rnd); ctx.strokeStyle = a % 2 ? '#fff6a0' : '#ffffff'; ctx.stroke(); }
    ctx.fillStyle = '#ffe14a'; ctx.font = '900 40px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#23428f'; ctx.fillRect(cx - 120, py(5.4), 240, 54);
    ctx.fillStyle = '#ffe14a'; ctx.fillText('TESLA ZONE', cx, py(5.4) + 28);
  } else if (k === 1) {
    // checker band and car silhouettes
    for (var c = 0; c < 24; c++) { ctx.fillStyle = c % 2 ? '#23428f' : '#ffffff'; ctx.fillRect(left + c * 16, py(2.3), 16, 16); ctx.fillStyle = c % 2 ? '#ffffff' : '#23428f'; ctx.fillRect(left + c * 16, py(2.3) + 16, 16, 16); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 150, py(5.3), 300, 70);
    ctx.fillStyle = '#e8334a'; ctx.font = '900 44px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('AUTOSKUTERY', cx, py(5.3) + 37, 290);
    ctx.fillStyle = '#ffe14a'; ctx.font = '900 38px "Arial Black", sans-serif'; ctx.fillText('BRRM!', cx, py(3.5));
  } else if (k === 2) {
    // the Palace of Culture and Science on a sunny sky
    var sk = ctx.createLinearGradient(0, py(5.5), 0, py(1));
    sk.addColorStop(0, '#7fd0ff'); sk.addColorStop(1, '#e6f6ff');
    ctx.fillStyle = sk; ctx.fillRect(left + 20, py(5.5), w - 40, 4.5 * PPU);
    ctx.fillStyle = '#ffffff';
    [[-100, 4.9, 28], [90, 4.5, 24]].forEach(function (cl) { [[0, 0, 1], [24, 4, 0.8], [-22, 5, 0.75]].forEach(function (b) { ctx.beginPath(); ctx.arc(cx + cl[0] + b[0], py(cl[1]) + b[1], cl[2] * b[2], 0, Math.PI * 2); ctx.fill(); }); });
    ctx.fillStyle = '#d9a86a';
    ctx.fillRect(cx - 100, py(2.4), 200, 1.4 * PPU - 0);
    ctx.fillRect(cx - 62, py(3.3), 124, 1.0 * PPU);
    ctx.fillRect(cx - 34, py(4.1), 68, 0.9 * PPU);
    ctx.fillRect(cx - 18, py(4.5), 36, 0.5 * PPU);
    ctx.beginPath(); ctx.moveTo(cx - 12, py(4.5)); ctx.lineTo(cx, py(5.4)); ctx.lineTo(cx + 12, py(4.5)); ctx.fill();
    ctx.fillStyle = '#b8803a';
    [-80, -40, 0, 40, 80].forEach(function (dx) { ctx.fillRect(cx + dx - 6, py(2.2), 12, 70); });
    ctx.fillStyle = '#ffe9a0';
    for (var wy = 0; wy < 4; wy++) for (var wx = -2; wx <= 2; wx++) ctx.fillRect(cx + wx * 22 - 5, py(3.1) + wy * 18, 10, 10);
    ctx.fillStyle = '#e8334a'; ctx.fillRect(cx - 150, py(1.95), 300, 12); ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 150, py(1.95) - 12, 300, 12);
    ctx.fillStyle = '#23428f'; ctx.font = '900 26px "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('WARSZAWA', cx, py(1.35), 280);
  } else {
    // the big dial painted on the wall and a row of bulbs
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, py(3.4), 124, 0, Math.PI * 2); ctx.fill();
    var cols = ['#2f9bff', '#4fd0ff', '#7ae04a', '#ffe14a', '#ff9a1f', '#e8334a'];
    for (var d = 0; d < 6; d++) { ctx.fillStyle = cols[d]; ctx.beginPath(); ctx.moveTo(cx, py(3.4)); ctx.arc(cx, py(3.4), 112, Math.PI + (d / 6) * Math.PI, Math.PI + ((d + 1) / 6) * Math.PI); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, py(3.4), 68, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#23428f'; ctx.fillRect(cx - 124, py(3.4), 248, 6);
    ctx.strokeStyle = '#23428f'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, py(3.4)); ctx.lineTo(cx + 62, py(3.4) - 62); ctx.stroke();
    ctx.fillStyle = '#e8334a'; ctx.beginPath(); ctx.arc(cx, py(3.4), 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#23428f'; ctx.font = '900 30px "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NAŁADUJ SIĘ!', cx, py(2.4), 260);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 140, py(5.3), 280, 60); ctx.fillStyle = '#e8334a'; ctx.font = '900 34px "Arial Black", sans-serif';
    ctx.fillText('CHARGE-O-METER', cx, py(5.3) + 32, 270);
  }
}

function wallPicture(side) {
  return canvasTex('ws_wall' + side, WALL_W, WALL_H, function (ctx, w) {
    ctx.fillStyle = '#ffe14a'; ctx.fillRect(0, 0, w, WALL_H);
    for (var k = 0; k < 4; k++) {
      var cx = (side > 0 ? k / 4 : ((4 - k) % 4) / 4) * w;
      [-w, 0, w].forEach(function (off) { paintBay(ctx, k, cx + off); });
    }
  });
}

function floorPicture() {
  // 12 across, 16 along, 48 px/unit: sunny paving of cream slabs with blue joints and little spark marks
  return canvasTex('ws_floor', 576, 768, function (ctx, w, h) {
    ctx.fillStyle = '#2f9bff'; ctx.fillRect(0, 0, w, h);
    var rnd = rngOf(13);
    for (var j = 0; j < 8; j++) for (var i = 0; i < 6; i++) {
      var c = ['#fff3b8', '#ffe98a', '#fff9d6', '#ffe070'][(i + j * 2) % 4];
      ctx.fillStyle = c; ctx.fillRect(i * 96 + 4, j * 96 + 4, 88, 88);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(i * 96 + 4, j * 96 + 4, 88, 5);
      if ((i + j) % 3 === 0) {
        // a little blue spark in the slab
        ctx.strokeStyle = '#2f9bff'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
        var x = i * 96 + 48, y = j * 96 + 48;
        ctx.beginPath(); ctx.moveTo(x + 8, y - 24); ctx.lineTo(x - 10, y + 2); ctx.lineTo(x + 4, y + 2); ctx.lineTo(x - 8, y + 26); ctx.stroke();
      }
    }
    for (var d = 0; d < 30; d++) { ctx.fillStyle = ['#e8334a', '#ffffff', '#2f9bff'][d % 3]; ctx.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 5, 5); }
  });
}

function curiePoster() {
  return canvasTex('ws_curie', 256, 340, function (ctx, w, h) {
    ctx.fillStyle = '#fff6dc'; ctx.fillRect(0, 0, w, h);
    var bg = ctx.createRadialGradient(w / 2, 150, 10, w / 2, 150, 160);
    bg.addColorStop(0, '#fffbd0'); bg.addColorStop(0.5, '#9fe6ff'); bg.addColorStop(1, '#2f9bff');
    ctx.fillStyle = bg; ctx.fillRect(10, 10, w - 20, 250);
    // rays of radium glow
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4;
    for (var r = 0; r < 14; r++) { var a = (r / 14) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(a) * 80, 150 + Math.sin(a) * 80); ctx.lineTo(w / 2 + Math.cos(a) * 150, 150 + Math.sin(a) * 150); ctx.stroke(); }
    // shoulders in a dark dress with a white collar
    ctx.fillStyle = '#3a3050'; ctx.beginPath(); ctx.moveTo(34, 262); ctx.quadraticCurveTo(48, 190, w / 2, 188); ctx.quadraticCurveTo(w - 48, 190, w - 34, 262); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(w / 2 - 36, 190); ctx.lineTo(w / 2, 226); ctx.lineTo(w / 2 + 36, 190); ctx.lineTo(w / 2 + 20, 186); ctx.lineTo(w / 2, 204); ctx.lineTo(w / 2 - 20, 186); ctx.closePath(); ctx.fill();
    // neck, face, hair with a soft bun
    ctx.fillStyle = '#f3c9a4'; ctx.fillRect(w / 2 - 14, 160, 28, 34);
    ctx.fillStyle = '#6a5040'; ctx.beginPath(); ctx.arc(w / 2, 78, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6d2b0'; ctx.beginPath(); ctx.ellipse(w / 2, 122, 42, 54, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6a5040'; ctx.beginPath(); ctx.ellipse(w / 2, 90, 48, 34, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w / 2 - 46, 96); ctx.quadraticCurveTo(w / 2 - 54, 140, w / 2 - 38, 140); ctx.lineTo(w / 2 - 36, 100); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w / 2 + 46, 96); ctx.quadraticCurveTo(w / 2 + 54, 140, w / 2 + 38, 140); ctx.lineTo(w / 2 + 36, 100); ctx.fill();
    ctx.fillStyle = '#2a2030'; ctx.beginPath(); ctx.arc(w / 2 - 15, 118, 4, 0, Math.PI * 2); ctx.arc(w / 2 + 15, 118, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b8605a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w / 2, 136, 12, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,120,0.35)'; ctx.beginPath(); ctx.arc(w / 2 - 26, 132, 8, 0, Math.PI * 2); ctx.arc(w / 2 + 26, 132, 8, 0, Math.PI * 2); ctx.fill();
    // a glowing vial
    ctx.fillStyle = '#7ae04a'; ctx.fillRect(w - 62, 214, 18, 34);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(w - 60, 206, 14, 10);
    ctx.fillStyle = '#23428f'; ctx.font = '900 21px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Maria Skłodowska-Curie', w / 2, 284, 236);
    ctx.font = '700 17px Georgia, serif'; ctx.fillStyle = '#e8334a';
    ctx.fillText('1867 – 1934', w / 2, 308);
    ctx.fillStyle = '#23428f'; ctx.font = '700 13px Arial, sans-serif'; ctx.fillText('Nobel 1903 · 1911', w / 2, 327);
  });
}

function gaugeTex() {
  return canvasTex('ws_gauge', 256, 256, function (ctx, w, h) {
    ctx.fillStyle = '#23428f'; ctx.beginPath(); ctx.arc(128, 128, 126, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.fill();
    var cols = ['#2f9bff', '#4fd0ff', '#7ae04a', '#ffe14a', '#ff9a1f', '#e8334a'];
    for (var d = 0; d < 6; d++) { ctx.fillStyle = cols[d]; ctx.beginPath(); ctx.moveTo(128, 150); ctx.arc(128, 150, 96, Math.PI * 1.1 + (d / 6) * Math.PI * 0.8, Math.PI * 1.1 + ((d + 1) / 6) * Math.PI * 0.8); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(128, 150, 54, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#23428f'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(128, 150); ctx.lineTo(176, 92); ctx.stroke();
    ctx.fillStyle = '#e8334a'; ctx.beginPath(); ctx.arc(128, 150, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#23428f'; ctx.font = '900 23px "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ŁADUJ!', 128, 214);
  });
}

// ---------- pieces ----------

var _arc;
function arcMat() { return _arc || (_arc = bulb(ELEC, { add: true, op: 0.95 })); }

/** A zigzag spark in the y-z plane at fixed x, from (z0, y0) to (z1, y1). */
function zigYZ(g, x, z0, y0, z1, y1, n, amp, seed, th) {
  var rnd = rngOf(seed);
  var pts = [[z0, y0]];
  for (var i = 1; i < n; i++) { var t = i / n; pts.push([z0 + (z1 - z0) * t + (rnd() - 0.5) * amp, y0 + (y1 - y0) * t + (rnd() - 0.5) * amp]); }
  pts.push([z1, y1]);
  for (var j = 0; j < pts.length - 1; j++) {
    var a = pts[j], b = pts[j + 1];
    var dz = b[0] - a[0], dy = b[1] - a[1];
    box(g, th || 0.06, Math.hypot(dz, dy) + 0.03, th || 0.06, ELEC, x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2, { rx: Math.atan2(dz, dy), mat: arcMat() });
  }
}

/** A zigzag spark in the x-y plane at fixed z. */
function zigXY(g, z, x0, y0, x1, y1, n, amp, seed, th) {
  var rnd = rngOf(seed);
  var pts = [[x0, y0]];
  for (var i = 1; i < n; i++) { var t = i / n; pts.push([x0 + (x1 - x0) * t + (rnd() - 0.5) * amp, y0 + (y1 - y0) * t + (rnd() - 0.5) * amp]); }
  pts.push([x1, y1]);
  for (var j = 0; j < pts.length - 1; j++) {
    var a = pts[j], b = pts[j + 1];
    var dx = b[0] - a[0], dy = b[1] - a[1];
    box(g, th || 0.06, Math.hypot(dx, dy) + 0.03, th || 0.06, ELEC, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z, { rz: Math.atan2(-dx, dy), mat: arcMat() });
  }
}

function flagPole(g, S, z, y0) {
  // a pole with a red-and-white flag streaming along the wall
  var x = S.in(0.15);
  cyl(g, 0.03, 0.03, 2.2, 0xd8dde8, x, y0 + 1.1, z, { seg: 5 });
  ball(g, 0.06, 0xffd23f, x, y0 + 2.25, z, { seg: 5 });
  box(g, 0.02, 0.28, 0.8, WHITE, x, y0 + 1.95, z - 0.4);
  box(g, 0.02, 0.28, 0.8, RED, x, y0 + 1.67, z - 0.4);
}

function lamp(g, S, z, c) {
  var x = S.in(0.5);
  cyl(g, 0.05, 0.07, 3.0, NAVY, x, 1.5, z, { seg: 6 });
  ball(g, 0.2, c || 0xfff2a8, x, 3.15, z, { seg: 7, bulb: true });
  ring(g, 0.27, 0.03, NAVY, x, 3.15, z, { ry: S.turn, seg: 10, tube: 3 });
}

function stripedValance(g, S, z, k) {
  // the blue-and-white striped canopy edge at the top of each bay
  for (var i = 0; i < 8; i++) box(g, 0.9, 0.07, 0.5, (i + k) % 2 ? WHITE : BLUE, S.in(0.0) - S.side * 0.42, 6.55, z - 1.75 + i * 0.5, { rz: S.side * 0.3 });
  for (var j = 0; j < 8; j++) cone(g, 0.25, 0.3, (j + k) % 2 ? WHITE : BLUE, S.in(0.88), 6.1, z - 1.75 + j * 0.5, { seg: 3, rx: Math.PI, sz: 0.3, rz: 0 });
  extrude(g, boltShape(0.8), 0.08, SUN, S.in(0.2), 6.05, z, { ry: S.turn, bulb: true, curve: 2 });
}

function tentsBehind(g, S, z, k) {
  // fairground tops behind the wall: striped tents with pennants, seen over the hoarding
  var cols = [[RED, WHITE], [BLUE, SUN], [0xff8a1f, WHITE], [GREEN, WHITE]][k];
  var x = S.out(3.2);
  cyl(g, 1.7, 1.9, 2.4, cols[1], x, 7.4, z, { seg: 8 });
  cone(g, 2.1, 2.0, cols[0], x, 9.6, z, { seg: 8 });
  cyl(g, 0.03, 0.03, 1.0, WHITE, x, 11.0, z, { seg: 4 });
  box(g, 0.02, 0.3, 0.6, RED, x, 11.3, z - 0.3);
  // painted-on lamps along the tent skirt
  for (var i = 0; i < 4; i++) ball(g, 0.14, 0xfff2a8, S.out(1.4), 6.9, z - 1.5 + i * 1.0, { seg: 5, bulb: true });
}

function teslaScene(g, S, z, k) {
  var x = S.in(0.55);
  var tops = [];
  [-1.15, 1.15].forEach(function (dz, n) {
    var cz = z + dz;
    box(g, 0.9, 0.3, 0.9, COPPER, x, 0.15, cz);
    cyl(g, 0.34, 0.4, 0.5, NAVY, x, 0.55, cz, { seg: 8 });
    cyl(g, 0.18, 0.28, 2.5, CREAM, x, 2.05, cz, { seg: 10 });
    for (var r = 0; r < 7; r++) ring(g, 0.27 - r * 0.012, 0.035, COPPER, x, 0.95 + r * 0.32, cz, { rx: Math.PI / 2, seg: 10, tube: 3 });
    ring(g, 0.55, 0.19, 0xdcecff, x, 3.4, cz, { rx: Math.PI / 2, seg: 14, tube: 5 });
    ball(g, 0.2, 0x9fe6ff, x, 3.55, cz, { seg: 7, bulb: true });
    tops.push(cz);
  });
  // arcs: between the two coils, up into the air, and across to a wall electrode
  zigYZ(g, x, tops[0] + 0.5, 3.45, tops[1] - 0.5, 3.45, 7, 0.45, 11 + k * 3, 0.07);
  zigYZ(g, x, tops[0], 3.75, tops[0] - 0.5, 4.6, 4, 0.3, 21, 0.05);
  zigYZ(g, x, tops[1], 3.75, tops[1] + 0.5, 4.7, 4, 0.3, 31, 0.05);
  zigXY(g, tops[0] - 0.1, x, 3.5, S.in(0.0), 4.2, 5, 0.3, 41, 0.05);
  ball(g, 0.15, ELEC, S.in(0.05), 4.25, tops[0] - 0.1, { seg: 6, bulb: true });
  // warning plate
  sign(g, 'WITAJ!', SUN, NAVY, 1.2, 0.5, S.in(0.5), 4.65, z - 1.95, { border: NAVY });
  flagPole(g, S, z + 1.95, 0);
}

function bumperCar(g, x, z, ry, c) {
  var o = { ry: ry };
  var grp = new THREE.Group();
  box(grp, 0.62, 0.22, 0.9, c, 0, 0.26, 0, { r: 0.4 });
  ball(grp, 0.4, c, 0, 0.34, -0.05, { seg: 8, sy: 0.6, sx: 0.85, sz: 1.1 });
  box(grp, 0.4, 0.3, 0.3, WHITE, 0, 0.62, 0.12, {});
  ball(grp, 0.12, 0xffd6a0, 0, 0.88, 0.12, { seg: 6 });
  ring(grp, 0.46, 0.07, 0x2a2a3a, 0, 0.18, 0, { rx: Math.PI / 2, seg: 10, tube: 3, sx: 0.78, sy: 1.0, sz: 1.0 });
  [[-0.22, -0.3], [0.22, -0.3], [-0.22, 0.3], [0.22, 0.3]].forEach(function (p) { cyl(grp, 0.09, 0.09, 0.06, 0x2a2a3a, p[0] * 1.35, 0.09, p[1], { rz: Math.PI / 2, seg: 6 }); });
  // the pole to the live ceiling grid, with a spark at the tip
  cyl(grp, 0.015, 0.015, 2.3, 0xc8d0dc, 0, 1.45, -0.3, { seg: 4 });
  ball(grp, 0.08, ELEC, 0, 2.6, -0.3, { seg: 5, bulb: true });
  grp.position.set(x, 0, z);
  grp.rotation.y = o.ry;
  g.add(grp);
}

function bumperScene(g, S, z, k) {
  // the blue arena mat with a low red-and-white rail
  box(g, 0.9, 0.05, 3.9, BLUE, S.in(0.45), 0.04, z);
  for (var i = 0; i < 8; i++) box(g, 0.1, 0.22, 0.5, i % 2 ? WHITE : RED, S.in(0.88), 0.2, z - 1.75 + i * 0.5);
  bumperCar(g, S.in(0.4), z - 1.1, 0.5, CAR[(k + 0) % 6]);
  bumperCar(g, S.in(0.5), z + 0.2, -0.4, CAR[2]);
  bumperCar(g, S.in(0.4), z + 1.4, 0.9, CAR[4]);
  sign(g, 'Cześć!', RED, WHITE, 1.2, 0.5, S.in(0.5), 4.7, z + 1.7, { border: WHITE });
  zigYZ(g, S.in(0.5), z - 0.6, 3.6, z + 0.9, 3.6, 6, 0.3, 77, 0.04);
  lamp(g, S, z - 1.95);
}

function curieScene(g, S, z) {
  var x = S.in(0.5);
  // a pavilion: two pillars, a hanging portrait poster facing the runner, a tidy planter of flowers
  [-1.1, 1.1].forEach(function (dz, n) {
    cyl(g, 0.16, 0.2, 3.4, WHITE, x, 1.7, z + dz, { seg: 8 });
    cyl(g, 0.24, 0.24, 0.14, BLUE, x, 3.45, z + dz, { seg: 8 });
    box(g, 0.5, 0.45, 0.65, n ? SUN : 0xffa8c0, x, 0.23, z + dz * 1.5);
    ball(g, 0.34, GREEN, x, 0.7, z + dz * 1.5, { seg: 6, sy: 0.7 });
  });
  box(g, 0.14, 0.14, 2.6, BLUE, x, 3.5, z);
  var tex = curiePoster();
  var mesh = quad(g, 1.5, 1.99, 0xffffff, x, 4.7, z, { mat: tex ? bulb(0xffffff, { map: tex, side: THREE.DoubleSide }) : bulb(0xcfeaff, { side: THREE.DoubleSide }) });
  mesh.rotation.y = 0.0;
  [-0.7, 0.7].forEach(function (dz) { cyl(g, 0.012, 0.012, 0.5, NAVY, x, 3.8, z + dz, { seg: 3 }); });
  box(g, 1.6, 0.07, 0.05, NAVY, x, 3.72, z + 0.02);
  box(g, 1.6, 0.07, 0.05, NAVY, x, 5.72, z + 0.02);
  extrude(g, boltShape(0.7), 0.06, SUN, S.in(0.1), 3.0, z + 1.9, { ry: S.turn, bulb: true, curve: 2 });
  flagPole(g, S, z - 1.9, 0);
}

function chargeScene(g, S, z) {
  var x = S.in(0.5);
  // a tall charge meter: a stack of lit segments from blue to red, a gold bell on top
  box(g, 0.8, 0.5, 0.8, NAVY, x, 0.25, z - 0.9);
  box(g, 0.32, 3.4, 0.32, 0x2a3a6a, x, 2.1, z - 0.9);
  var cols = [0x2f9bff, 0x2fb8ff, 0x4fd0ff, 0x7ae04a, 0xb0e040, 0xffe14a, 0xffc02a, 0xff9a1f, 0xff6a2a, 0xe8334a];
  cols.forEach(function (c, i) { box(g, 0.2, 0.26, 0.4, c, S.in(0.38), 0.7 + i * 0.3, z - 0.9, { bulb: true }); });
  ball(g, 0.3, 0xffd23f, x, 4.0, z - 0.9, { seg: 8 });
  cyl(g, 0.04, 0.04, 0.25, 0xffd23f, x, 3.8, z - 0.9, { seg: 4 });
  // the gauge: a dial hanging on an arm, facing the runner
  var gt = gaugeTex();
  box(g, 0.08, 0.08, 1.4, NAVY, x, 4.3, z + 0.9);
  var dial = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), gt ? bulb(0xffffff, { map: gt, side: THREE.DoubleSide }) : bulb(BLUE, { side: THREE.DoubleSide }));
  dial.position.set(x, 4.9, z + 0.9);
  g.add(dial);
  cyl(g, 0.02, 0.02, 0.6, NAVY, x, 4.45, z + 0.9, { seg: 3 });
  // a battery bench
  box(g, 0.6, 0.6, 1.0, SUN, x, 0.3, z + 1.4);
  box(g, 0.2, 0.12, 0.3, 0x2a3a6a, x, 0.66, z + 1.4);
  extrude(g, boltShape(0.55), 0.06, WHITE, S.in(0.1) + (S.side < 0 ? 0.32 : -0.32), 0.34, z + 1.4, { ry: S.turn, curve: 2 });
  sign(g, 'Dziękuję!', BLUE, WHITE, 1.4, 0.5, S.in(0.5), 3.5, z + 1.95, { border: SUN });
  lamp(g, S, z - 1.95);
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(side), side, z, H, 0.0, { r: 0.9 });
  stripedValance(g, S, z, k);
  tentsBehind(g, S, z, k);
  if (k === 0) teslaScene(g, S, z, side > 0 ? 1 : 0);
  else if (k === 1) bumperScene(g, S, z, side > 0 ? 3 : 0);
  else if (k === 2) curieScene(g, S, z);
  else chargeScene(g, S, z);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12);
}

// ---------- overhead ----------

var BANNERS = ['Cześć!', 'Witaj w parku!', 'Iskra!', 'Dziękuję!'];

function arch(g, z, i) {
  var y = H - 0.5;
  var half = 5.2;
  var n = 15;
  for (var f = 0; f < n; f++) {
    var t = f / (n - 1);
    var x = -half + t * half * 2;
    var dip = Math.sin(t * Math.PI) * 0.55;
    ball(g, 0.1, f % 2 ? 0xfff2a8 : ELEC, x, y - dip - 0.1, z, { seg: 5, bulb: true });
    if (f % 2 === 0 && f > 0 && f < n - 1) cone(g, 0.15, 0.34, (f / 2) % 2 ? WHITE : RED, x, y - dip - 0.38, z, { seg: 3, rx: Math.PI, sz: 0.2 });
  }
  for (var s = 0; s < 10; s++) {
    var t0 = s / 10, t1 = (s + 1) / 10;
    var x0 = -half + t0 * half * 2, x1 = -half + t1 * half * 2;
    var y0 = y - Math.sin(t0 * Math.PI) * 0.55, y1 = y - Math.sin(t1 * Math.PI) * 0.55;
    cyl(g, 0.012, 0.012, Math.hypot(x1 - x0, y1 - y0), NAVY, (x0 + x1) / 2, (y0 + y1) / 2, z, { rz: Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2, seg: 3 });
  }
  sign(g, BANNERS[i % BANNERS.length], [BLUE, RED, NAVY, 0xff8a1f][i % 4], [WHITE, WHITE, SUN, WHITE][i % 4], 4.2, 0.8, 0, H - 1.5, z + 0.05, { border: SUN });
  [-1, 1].forEach(function (s2) {
    cyl(g, 0.012, 0.012, 0.6, NAVY, s2 * 2.0, H - 0.95, z, { seg: 3 });
    extrude(g, boltShape(1.1), 0.12, SUN, s2 * 4.5, H - 1.4, z, { bulb: true, curve: 2 });
  });
}

// ---------- the things that move ----------

function palace() {
  // the Palace of Culture and Science, seen far off beside the park
  var p = new THREE.Group();
  box(p, 14, 6, 10, 0xe8c48a, 0, 3, 0);
  box(p, 9, 8, 7, 0xefcf98, 0, 10, 0);
  box(p, 5.5, 7, 4.6, 0xf3d8a6, 0, 17.5, 0);
  box(p, 3.2, 5, 3, 0xf6dfb0, 0, 23.5, 0);
  cone(p, 1.8, 6, 0xdca85a, 0, 29, 0, { seg: 4, ry: Math.PI / 4 });
  cyl(p, 0.1, 0.1, 5, 0xd8dde8, 0, 34, 0, { seg: 4 });
  ball(p, 0.4, SUN, 0, 31.6, 0, { seg: 6 });
  for (var i = 0; i < 4; i++) ball(p, 0.15, 0xfff2a8, -3 + i * 2, 6.2, 5.2, { seg: 5, bulb: true });
  box(p, 14.4, 0.4, 10.4, WHITE, 0, 6.1, 0);
  animated(p);
  return p;
}

function balloonGeo() {
  return combine([
    { geo: new THREE.SphereGeometry(0.3, 9, 7), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 1, 1.18, 1) },
    { geo: new THREE.CylinderGeometry(0.008, 0.008, 1.1, 3), color: 0xdddddd, matrix: xform(0, -0.95, 0) }
  ]);
}

function sparkBallon(n) {
  // a floating blue-white charge ball with a halo, bobbing high above the walls
  var m = new THREE.Group();
  ball(m, 1.1, ELEC, 0, 0, 0, { seg: 8, bulb: true });
  ring(m, 1.7, 0.08, WHITE, 0, 0, 0, { rx: Math.PI / 2, seg: 18, tube: 3, bulb: true });
  ring(m, 1.7, 0.08, WHITE, 0, 0, 0, { seg: 18, tube: 3, bulb: true });
  m.position.y = 12;
  animated(m);
  bob(m, 0.5, 1.1, n);
  return m;
}

function extras() {
  cloudBank(7, { seed: 19, opacity: 0.92 });
  features(palace, { x: -30, spacing: 160, count: 2, z0: -70, yaw: 0 });
  features(function (n) { return sparkBallon(n); }, { x: 11, spacing: 60, count: 3, z0: -30 });
  features(function (n) { return sparkBallon(n + 1); }, { x: -11, spacing: 70, count: 3, z0: -55 });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: balloonGeo(), count: 9, seed: 7 + i * 13, colors: [RED, WHITE, BLUE, SUN, 0xff8a1f], area: { x: [side * 4.4, side * 5.1], y: [3.4, 5.8], z: [-140, 8] }, k: 1, wobble: 0.18, scale: [0.9, 1.3] });
    // sparks: small bright flashes that tumble through the air beside the walls
    var spark = combine([
      { geo: new THREE.OctahedronGeometry(0.1, 0), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 0.5, 2.2, 0.5) },
      { geo: new THREE.OctahedronGeometry(0.1, 0), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 2.2, 0.5, 0.5) }
    ]);
    swarm({ geo: spark, material: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), count: 22, seed: 55 + i, colors: [ELEC, WHITE, 0x9fe6ff, 0xfff2a8], area: { x: [side * 4.4, side * 5.3], y: [0.5, 6.0], z: [-130, 6] }, k: 1, vy: [-0.4, 0.4], wobble: 0.4, turn: 6, scale: [1, 2] });
    var conf = combine([{ geo: new THREE.PlaneGeometry(0.14, 0.09), color: 0xffffff }]);
    swarm({ geo: conf, material: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), count: 24, seed: 88 + i, colors: [RED, WHITE, BLUE, SUN], area: { x: [side * 4.4, side * 5.3], y: [0.4, 6.0], z: [-120, 6] }, k: 1, vy: [-0.9, -0.5], wobble: 0.3, turn: 3, scale: [1, 1.6] });
  });
  // the arcs and string lamps flicker and glow, slower than three flashes a second
  shimmer(arcMat(), 0.7, 0.3, 7.5, 0);
  shimmer(bulb(0xfff2a8, { op: 0.95 }), 0.85, 0.12, 2.2, 1);
}

export var w_warsaw_spark_park = {
  id: 'w_warsaw_spark_park',
  indoor: false,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
