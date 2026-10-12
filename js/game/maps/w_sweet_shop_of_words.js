/**
 * w_sweet_shop_of_words.js — Sweet Shop of Words (skin 'Candy Lab': the key is kept, the scene is new): an old-fashioned
 * sweet shop where the sweets are words.
 *
 * A pink-and-cream checkerboard floor runs between walls of striped wallpaper and painted shelves of jars, under a
 * gingham awning that scallops along both sides. In turn: a bouquet of swirl lollipops, big jars of letter gumdrops,
 * a three-tier cake, and wafer shelves whose boxes are labelled with greetings (Hola, Ciao, Salut...). A candy-cane
 * arch crosses the shop every few seconds with a sweet word in two languages on it. Giant lollipops spin by,
 * gumdrops and sprinkles float.
 */

import * as THREE from 'three';
import {
  box, cyl, ball, cone, ring, quad, combine, xform, mat, canvasTex, stripeTex, css,
  floorPanel, ceilingPanel, wallPanel, sideCtx
} from '../mapkit.js';
import { animated, swarm, features, spin } from '../mapfx.js';
import { sparkleGeo, glowMat } from './cartoon.js';

var H = 6.2;
var ROSE = 0xff6f91;
var MINT = 0x5fd8b0;
var LEMON = 0xffe066;
var TANGERINE = 0xffa040;
var SKY = 0x5cc8ff;
var SWEETS = [ROSE, MINT, LEMON, TANGERINE, SKY, 0xff5a5a];
var HEX = ['#ff6f91', '#5fd8b0', '#ffe066', '#ffa040', '#5cc8ff', '#ff5a5a'];
var ROUND = '"Arial Rounded MT Bold","Trebuchet MS",Arial,sans-serif';

// ---------- painted pictures ----------

function wallPicture() {
  // 16 x 6.2, 64px/unit: striped wallpaper, a candy-striped wainscot, two shelves of jars and a scalloped valance
  return canvasTex('sweet_wall', 1024, 400, function (ctx, w, h) {
    ctx.fillStyle = '#fff0f2'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffd6df';
    for (var i = 0; i < 64; i++) ctx.fillRect(i * 16, 0, 8, h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (var d = 0; d < 20; d++) for (var e = 0; e < 5; e++) { ctx.beginPath(); ctx.arc(d * 52 + (e % 2) * 26 + 10, 40 + e * 56, 4, 0, 7); ctx.fill(); }
    // two shelves with rows of jars and tins
    [[110, 0], [210, 1]].forEach(function (sh, r) {
      var y = sh[0];
      ctx.fillStyle = '#c98a52'; ctx.fillRect(0, y + 38, w, 10);
      ctx.fillStyle = '#a56a38'; ctx.fillRect(0, y + 48, w, 4);
      for (var j = 0; j < 22; j++) {
        var x = j * 47 + 10 + (r ? 14 : 0);
        var c = HEX[(j + r * 2) % 6];
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#5a3a2a';
        if ((j + r) % 3 === 0) { // a tin
          ctx.fillStyle = c; ctx.fillRect(x, y + 4, 34, 34); ctx.strokeRect(x, y + 4, 34, 34);
          ctx.fillStyle = '#fff'; ctx.fillRect(x + 6, y + 14, 22, 12);
        } else { // a glass jar
          ctx.fillStyle = 'rgba(230,248,255,0.95)'; ctx.fillRect(x + 2, y + 10, 32, 28); ctx.strokeRect(x + 2, y + 10, 32, 28);
          ctx.fillStyle = c; for (var g = 0; g < 6; g++) { ctx.beginPath(); ctx.arc(x + 9 + (g % 3) * 9, y + 20 + Math.floor(g / 3) * 9, 5, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#ff6f91'; ctx.fillRect(x, y + 4, 36, 7); ctx.strokeRect(x, y + 4, 36, 7);
        }
      }
    });
    // candy-striped wainscot
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 300, w, 100);
    ctx.fillStyle = '#ff6f91';
    for (var s = 0; s < 64; s++) ctx.fillRect(s * 16, 300, 8, 100);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 292, w, 8);
    ctx.fillStyle = '#5fd8b0'; ctx.fillRect(0, 286, w, 6);
    // valance
    ctx.fillStyle = '#5fd8b0'; ctx.fillRect(0, 0, w, 14);
    for (var v = 0; v < 32; v++) { ctx.fillStyle = v % 2 ? '#ffffff' : '#ff6f91'; ctx.beginPath(); ctx.arc(v * 32 + 16, 14, 16, 0, Math.PI); ctx.fill(); }
  });
}

function floorPicture() {
  // rose and cream checks with sprinkles, a candy-stripe border. 12 x 16, 48px/unit
  return canvasTex('sweet_floor', 576, 768, function (ctx, w, h) {
    for (var j = 0; j < 16; j++) for (var i = 0; i < 12; i++) {
      ctx.fillStyle = (i + j) % 2 ? '#fff6ee' : '#ff9fb3'; ctx.fillRect(i * 48, j * 48, 48, 48);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var k = 0; k < 24; k++) { var a = (k * 977) % w, b = (k * 541) % h; ctx.fillRect(a, b, 18, 5); }
    var sp = ['#5fd8b0', '#ffe066', '#5cc8ff', '#ffa040', '#ffffff', '#ff5a5a'];
    for (var s = 0; s < 80; s++) {
      var sx = (s * 389) % w, sy = (s * 233) % h;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate((s * 1.7) % 3.1); ctx.fillStyle = sp[s % 6]; ctx.fillRect(-7, -2.5, 14, 5); ctx.restore();
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 14, h); ctx.fillRect(w - 14, 0, 14, h);
    ctx.fillStyle = '#5fd8b0'; for (var t = 0; t < 32; t++) { ctx.fillRect(0, t * 24, 14, 12); ctx.fillRect(w - 14, t * 24 + 12, 14, 12); }
  });
}

function ceilingPicture() {
  return canvasTex('sweet_ceiling', 464, 640, function (ctx, w, h) {
    ctx.fillStyle = '#fff6e8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#bff2de'; for (var i = 0; i < 29; i++) ctx.fillRect(i * 16, 0, 8, h);
    for (var r = 0; r < 4; r++) {
      var cy = r * 160 + 80;
      [['#ff6f91', 120], ['#ffffff', 96], ['#ff6f91', 72], ['#ffffff', 48], ['#ffe066', 24]].forEach(function (c) {
        ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(w / 2, cy, c[1], c[1] * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      });
    }
  });
}

function gingham(pink) {
  return canvasTex('sweet_gingham' + pink, 128, 128, function (ctx, w, h) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = pink ? 'rgba(255,111,145,0.62)' : 'rgba(95,216,176,0.62)';
    for (var i = 0; i < 4; i++) { ctx.fillRect(i * 32, 0, 16, h); ctx.fillRect(0, i * 32, w, 16); }
  }, { repeat: [8, 1] });
}

function scallopTex() {
  return canvasTex('sweet_scallop', 512, 48, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#ff6f91'; ctx.beginPath(); ctx.arc(i * 32 + 16, 12, 16, 0, Math.PI); ctx.rect(i * 32, 0, 32, 12); ctx.fill();
      ctx.strokeStyle = '#d94870'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(i * 32 + 16, 12, 16, 0, Math.PI); ctx.stroke();
    }
  });
}

/** A swirl lollipop disc with a dark outline; alpha outside the circle. */
function swirlTex(ci) {
  var c1 = HEX[ci % 6], c2 = '#ffffff';
  return canvasTex('sweet_swirl' + ci, 128, 128, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c1; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var t = 0; t < 26; t += 0.2) { var r = 4 + t * 2.0; var a = t * 0.62; var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = '#7a3a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.stroke();
  });
}

function jarTex(set) {
  // gumdrops with letters, wrapped around a jar (256 x 128)
  return canvasTex('sweet_jar' + set, 256, 128, function (ctx, w, h) {
    ctx.fillStyle = '#e3f6ff'; ctx.fillRect(0, 0, w, h);
    var letters = set ? 'ÑÉÜÇÅÖØÆ'.split('') : 'ABCDEFGH'.split('');
    for (var r = 0; r < 5; r++) for (var c = 0; c < 8; c++) {
      var x = c * 32 + 16 + (r % 2) * 8, y = 112 - r * 24;
      ctx.fillStyle = HEX[(c + r * 2 + set) % 6]; ctx.beginPath(); ctx.ellipse(x, y, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(90,40,60,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = '900 16px ' + ROUND; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letters[(c + r) % letters.length], x, y + 1);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(0, 0, w, 6);
  });
}

function plateTex(name, big, small, bg, fg, border) {
  return canvasTex('sweet_plate_' + name, 320, 128, function (ctx, w, h) {
    ctx.fillStyle = css(border); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(2, 2, w - 4, h - 4, 30); else ctx.rect(2, 2, w - 4, h - 4); ctx.fill();
    ctx.fillStyle = css(bg); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(10, 10, w - 20, h - 20, 22); else ctx.rect(10, 10, w - 20, h - 20); ctx.fill();
    ctx.fillStyle = css(fg); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 ' + (small ? 52 : 58) + 'px ' + ROUND; ctx.fillText(big, w / 2, small ? h * 0.4 : h / 2 + 2);
    if (small) { ctx.font = '800 26px ' + ROUND; ctx.fillText(small, w / 2, h * 0.78); }
  });
}

function waferTex(word, ci) {
  // a wafer box standing upright: coloured wrapper, a wafer picture and the greeting in a speech bubble
  return canvasTex('sweet_wafer_' + word, 96, 128, function (ctx, w, h) {
    ctx.fillStyle = HEX[ci % 6]; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, h - 10, w, 10);
    ctx.fillStyle = '#f0c27a'; ctx.fillRect(14, 16, w - 28, 34);
    ctx.fillStyle = '#c98a3a'; for (var i = 0; i < 4; i++) ctx.fillRect(14, 22 + i * 8, w - 28, 3);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(8, 62, w - 16, 44, 14); else ctx.rect(8, 62, w - 16, 44); ctx.fill();
    ctx.beginPath(); ctx.moveTo(24, 104); ctx.lineTo(18, 120); ctx.lineTo(40, 104); ctx.fill();
    ctx.fillStyle = '#7a2a48'; ctx.font = '900 ' + (word.length > 5 ? 17 : 22) + 'px ' + ROUND; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(word, w / 2, 85);
  });
}

// ---------- materials ----------

var _decals = {};
function decalMat(tex, fallback) {
  var k = tex ? tex.uuid : 'x' + fallback;
  return _decals[k] || (_decals[k] = new THREE.MeshBasicMaterial({ color: tex ? 0xffffff : fallback, map: tex || null, alphaTest: 0.4, side: THREE.DoubleSide }));
}
function decal(g, tex, fallback, w, h, x, y, z, yaw) {
  return quad(g, w, h, 0xffffff, x, y, z, { mat: decalMat(tex, fallback), ry: yaw || 0 });
}

// ---------- the shop, one bay on one side ----------

function awning(g, S, z) {
  // a gingham awning leaning out from the wall, with a scalloped edge
  var tex = gingham(true);
  var a = box(g, 1.5, 0.06, 4, 0xffffff, S.in(0.55), 3.6, z, { rz: S.side * 0.38, map: tex, r: 0.7 });
  if (!tex) a.material = mat(ROSE);
  decal(g, scallopTex(), ROSE, 4, 0.375, S.in(0.55) - S.side * 0.68, 3.35 - 0.04, z, S.turn);
  // two brackets holding it up
  [-1.5, 1.5].forEach(function (d) { box(g, 0.08, 0.7, 0.08, 0xffffff, S.in(0.1), 3.5, z + d, { rz: S.side * 0.3 }); });
}

function lollies(g, S, z) {
  // a bouquet of swirl lollipops in a striped pot, and a pair of candy canes
  var x = S.in(0.45);
  cyl(g, 0.38, 0.28, 0.7, 0xffffff, x, 0.35, z, { seg: 8, map: stripeTex(0xff6f91, 0xffffff, 4), r: 0.5 });
  [[-0.5, 1.9, 0, 0.9], [0.45, 2.15, 1, 1.0], [0.0, 2.5, 2, 1.1], [-0.2, 1.45, 4, 0.8], [0.6, 1.5, 3, 0.8]].forEach(function (p) {
    var lz = z + p[0];
    cyl(g, 0.025, 0.025, p[1] - 0.4, 0xffffff, x, 0.7 + (p[1] - 0.4) / 2, lz, { seg: 4 });
    decal(g, swirlTex(p[2]), HEX[p[2]], p[3], p[3], x - S.side * 0.03, p[1] + 0.3, lz, S.turn);
  });
  [-1.4, 1.5].forEach(function (d, i) {
    var cz = z + d;
    cyl(g, 0.09, 0.09, 1.6, 0xffffff, S.in(0.3), 0.8, cz, { seg: 8, map: stripeTex(0xff4d6a, 0xffffff, 6), r: 0.4 });
    ring(g, 0.28, 0.09, 0xff4d6a, S.in(0.3), 1.6, cz + (i ? -0.28 : 0.28), { arc: Math.PI, seg: 8, tube: 4 });
  });
  decal(g, plateTex('lolli', 'Piruleta', 'lollipop (es)', 0xfff6e8, 0xd94870, ROSE), ROSE, 1.9, 0.76, S.in(0.35), 4.75, z, S.turn + S.side * 0.45);
}

function jars(g, S, z) {
  // a counter with three big jars of letter gumdrops
  var x = S.in(0.45);
  box(g, 0.9, 1.0, 3.4, 0xffffff, x, 0.5, z, { r: 0.5 });
  box(g, 1.0, 0.1, 3.5, MINT, x, 1.05, z);
  for (var i = 0; i < 3; i++) {
    var jz = z - 1.1 + i * 1.1;
    cyl(g, 0.4, 0.4, 0.95, 0xffffff, x, 1.58, jz, { seg: 10, map: jarTex(i % 2), r: 0.3, ry: i * 1.1 });
    cyl(g, 0.34, 0.4, 0.16, ROSE, x, 2.14, jz, { seg: 10 });
    ball(g, 0.1, LEMON, x, 2.28, jz, { seg: 5 });
  }
  decal(g, plateTex('gum', 'Gominolas', 'gumdrops (es)', 0xfff6e8, 0x1f8a6a, MINT), MINT, 1.9, 0.76, S.in(0.35), 4.75, z, S.turn + S.side * 0.45);
}

function cake(g, S, z) {
  var x = S.in(0.45);
  box(g, 0.9, 0.9, 2.6, 0xffffff, x, 0.45, z, { r: 0.5, map: gingham(false) });
  cyl(g, 0.8, 0.8, 0.07, 0xffffff, x, 0.93, z, { seg: 12 });
  [[0.62, 0.42, ROSE], [0.46, 0.38, 0xffffff], [0.3, 0.34, MINT]].forEach(function (t, i) {
    var y = 1.17 + i * 0.4;
    cyl(g, t[0], t[0], t[1], t[2], x, y, z, { seg: 12 });
    cyl(g, t[0] + 0.03, t[0] + 0.03, 0.07, 0xfff6e8, x, y + t[1] / 2, z, { seg: 12 });
    for (var d = 0; d < 6; d++) {
      var a = (d / 6) * Math.PI * 2;
      ball(g, 0.055, SWEETS[(d + i) % 6], x + Math.cos(a) * t[0] * 0.98, y - 0.04, z + Math.sin(a) * t[0] * 0.98, { seg: 4 });
    }
  });
  ball(g, 0.11, 0xff3d5a, x, 2.5, z, { seg: 6 });
  cyl(g, 0.012, 0.012, 0.2, 0x3a7a3a, x, 2.65, z, { seg: 3 });
  // candles with little flames
  [-0.12, 0.12].forEach(function (d) { cyl(g, 0.02, 0.02, 0.22, 0xffffff, x, 2.62, z + d, { seg: 4 }); cone(g, 0.025, 0.07, 0xffc040, x, 2.78, z + d, { seg: 4, bulb: true }); });
  // a cherry on a cake stand and cupcakes on the end of the counter
  [[-1.0, ROSE], [1.0, MINT]].forEach(function (c) {
    cone(g, 0.17, 0.2, 0xffd8a8, x, 1.05, z + c[0] * 1.15, { seg: 6, rx: Math.PI });
    ball(g, 0.19, c[1], x, 1.24, z + c[0] * 1.15, { seg: 6, sy: 0.8 });
    ball(g, 0.04, 0xff3d5a, x, 1.4, z + c[0] * 1.15, { seg: 4 });
  });
  decal(g, plateTex('cake', 'Tarta', 'cake (es)', 0xfff6e8, 0xd94870, ROSE), ROSE, 1.7, 0.68, S.in(0.35), 4.75, z, S.turn + S.side * 0.45);
}

function wafers(g, S, z) {
  // a shelving unit of wafer boxes, each labelled with a greeting
  var x = S.in(0.4);
  box(g, 0.1, 3.0, 3.6, 0xc98a52, S.in(0.08), 1.5, z, { r: 0.8 });
  var words = [['Hola', 'Ciao', 'Salut', 'Hallo'], ['Olá', 'Hej', 'Merhaba', 'Hello'], ['Ahoj', 'Привет', 'Namaste', 'Aloha']];
  for (var r = 0; r < 3; r++) {
    box(g, 0.55, 0.07, 3.6, 0xe0a870, x, 0.12 + r * 1.0, z, { r: 0.8 });
    if (r < 3) for (var c = 0; c < 4; c++) {
      var wd = words[r][c];
      decal(g, waferTex(wd, r * 2 + c), HEX[(r + c) % 6], 0.62, 0.82, S.in(0.64), 0.57 + r * 1.0, z - 1.3 + c * 0.88, S.turn);
      box(g, 0.42, 0.78, 0.6, SWEETS[(r * 2 + c + 1) % 6], x, 0.51 + r * 1.0, z - 1.3 + c * 0.88, { r: 0.6 });
    }
  }
  box(g, 0.55, 0.07, 3.6, 0xe0a870, x, 3.12, z);
  decal(g, plateTex('wafer', 'Barquillos', 'wafers (es)', 0xfff6e8, 0x8a5a2a, 0xffa040), TANGERINE, 1.9, 0.76, S.in(0.3), 4.75, z, S.turn + S.side * 0.45);
}

function bay(g, side, z, k) {
  var S = sideCtx(side);
  wallPanel(g, wallPicture(), side, z, H, 0.0, { r: 0.9 });
  awning(g, S, z);
  if (k === 0) lollies(g, S, z);
  else if (k === 1) jars(g, S, z);
  else if (k === 2) cake(g, S, z);
  else wafers(g, S, z);
}

function center(g, z) {
  floorPanel(g, floorPicture(), z, 12);
  ceilingPanel(g, ceilingPicture(), z, 11.6, H);
}

var WORDS = [['Dulce', 'sweet (es)'], ['Bonbon', 'candy (fr)'], ['Caramella', 'candy (it)'], ['Doce', 'sweet (pt)'], ['Zuckerl', 'sweet (de)'], ['Snoep', 'candy (nl)']];

function arch(g, z, i) {
  // a candy-cane arch: a half ring striped red and white, with a bow and a sweet word on a plate
  var tex = stripeTex(0xff4d6a, 0xffffff, 20);
  ring(g, 4.9, 0.2, 0xffffff, 0, 0.05, z, { seg: 22, tube: 5, arc: Math.PI, sy: 1.1, map: tex, r: 0.4 });
  // bow at the crown
  ball(g, 0.2, ROSE, 0, 5.45, z, { seg: 6 });
  cone(g, 0.3, 0.55, ROSE, -0.42, 5.45, z, { seg: 4, rz: Math.PI / 2 });
  cone(g, 0.3, 0.55, ROSE, 0.42, 5.45, z, { seg: 4, rz: -Math.PI / 2 });
  var wd = WORDS[i % 6];
  decal(g, plateTex('arch' + (i % 6), wd[0], wd[1], 0xfff6e8, 0xd94870, SWEETS[i % 6]), ROSE, 1.9, 0.76, i % 2 ? 3.4 : -3.4, 3.4, z, 0);
  cyl(g, 0.02, 0.02, 0.6, 0x888888, (i % 2 ? 3.4 : -3.4) - 0.7, 4.1, z, { seg: 3 });
  cyl(g, 0.02, 0.02, 0.6, 0x888888, (i % 2 ? 3.4 : -3.4) + 0.7, 4.1, z, { seg: 3 });
  // gumdrops strung in the corners
  for (var f = 0; f < 6; f++) {
    var s = f < 3 ? -1 : 1;
    var t = (f % 3) / 2;
    ball(g, 0.15, SWEETS[(f + i) % 6], s * (4.1 - t * 1.6), 5.6 - Math.sin(t * Math.PI) * 0.4, z, { seg: 5, sy: 0.8 });
  }
}

// ---------- things that move ----------

function bigPop(n) {
  var m = new THREE.Group();
  var wheel = new THREE.Group();
  var tex = swirlTex(n ? 4 : 0);
  var d = cyl(wheel, 0.85, 0.85, 0.14, 0xffffff, 0, 0, 0, { rz: Math.PI / 2, seg: 18, map: tex, r: 0.4 });
  if (!tex) d.material = mat(ROSE);
  wheel.position.y = 2.9;
  m.add(wheel);
  cyl(m, 0.06, 0.06, 2.6, 0xffffff, 0, 1.3, 0, { seg: 5 });
  animated(wheel);
  spin(wheel, 'x', n ? -0.7 : 0.7, 0);
  return m;
}

function gumdropGeo() {
  return combine([
    { geo: new THREE.SphereGeometry(0.16, 6, 4), color: 0xffffff, matrix: xform(0, 0, 0, 0, 0, 0, 1, 0.85, 1) },
    { geo: new THREE.CylinderGeometry(0.1, 0.16, 0.08, 6), color: 0xffffff, matrix: xform(0, -0.1, 0) }
  ]);
}

function extras() {
  features(function (i) { return bigPop(i % 2); }, { x: 5.1, spacing: 48, count: 3, z0: -30 });
  features(function (i) { return bigPop((i + 1) % 2); }, { x: -5.1, spacing: 48, count: 3, z0: -54 });
  [-1, 1].forEach(function (side, i) {
    swarm({ geo: gumdropGeo(), count: 9, seed: 30 + i, colors: SWEETS, area: { x: [side * 4.5, side * 5.2], y: [0.8, 5.6], z: [-140, 8] }, k: 1, vy: [0.2, 0.5], wobble: 0.2, turn: 1.0, scale: [0.9, 1.4] });
    swarm({ geo: sparkleGeo(0.2), material: glowMat(0.9), count: 8, seed: 70 + i, colors: [0xffffff, 0xfff0a0, 0xffd0e0], area: { x: [side * 4.4, side * 5.2], y: [1.0, 5.6], z: [-140, 8] }, k: 1, turn: 1.4, wobble: 0.1, scale: [0.7, 1.2] });
  });
}

export var w_sweet_shop_of_words = {
  id: 'w_sweet_shop_of_words',
  indoor: true,
  bay: bay,
  center: center,
  arch: arch,
  extras: extras
};
