/**
 * rosetta_art.js — the painter's box for Rosetta Hall: carved stone with three scripts (hieroglyphs, a flowing
 * demotic-style hand and Greek capitals), letter blocks, ribbons of letters, a sandstone wall with painted columns, a
 * meander-bordered floor and a star-strewn ceiling. Everything is painted and friendly: gold, turquoise and terracotta
 * on warm sand.
 */

import { canvasTex } from '../mapkit.js';

var SANS = '"Arial Rounded MT Bold","Trebuchet MS","Noto Sans","DejaVu Sans",Arial,sans-serif';
var ARABIC = '"Noto Naskh Arabic","Noto Sans Arabic","DejaVu Sans","Arial",sans-serif';
var CJK = '"Noto Sans CJK JP","Noto Sans JP","Noto Sans SC","WenQuanYi Zen Hei","Hiragino Sans","Microsoft YaHei",sans-serif';
var INK = '#3a2a1c';
var GOLD = '#e8b030';
var TURQ = '#2fb8b0';
var TERRA = '#d9553a';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}

function disc(ctx, x, y, r, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Letters of many writing systems, for the blocks and ribbons. */
export var LETTERS = ['A', 'B', 'C', 'D', 'Α', 'Β', 'Γ', 'Δ', 'あ', 'い', 'う', 'え', '字', '文', '语', '言', 'Ж', 'Я', 'Д', 'Ф', 'ñ', 'ç', 'ü', 'ø', 'ب', 'ت', 'ج', 'د', 'Ω', 'Σ', 'Ψ', 'Λ'];
var TILE_COLORS = ['#e2543a', '#2fb8b0', '#f2b134', '#4a8fe0', '#7cc44a', '#ee7a3a', '#d9507a', '#3aa0c8'];

function fontFor(ch) {
  if (/[؀-ۿ]/.test(ch)) return ARABIC;
  if (/[぀-鿿]/.test(ch)) return CJK;
  return SANS;
}

function letterTile(ctx, ch, x, y, s, color) {
  ctx.fillStyle = color;
  rr(ctx, x, y, s, s, s * 0.18); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; rr(ctx, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.2, s * 0.1); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, s * 0.04); rr(ctx, x, y, s, s, s * 0.18); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 ' + Math.round(s * 0.62) + 'px ' + fontFor(ch);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ch, x + s / 2, y + s * 0.54);
}

/** One letter block face (used on all sides of a cube). */
export function blockTex(i) {
  return canvasTex('ros_block' + i, 128, 128, function (ctx, w, h) {
    ctx.fillStyle = '#fff1d0'; ctx.fillRect(0, 0, w, h);
    letterTile(ctx, LETTERS[(i * 5) % LETTERS.length], 8, 8, 112, TILE_COLORS[i % TILE_COLORS.length]);
  });
}

/** An atlas of lettered tiles: 8 across, 4 down. */
export function atlasTex() {
  return canvasTex('ros_atlas', 512, 256, function (ctx) {
    for (var i = 0; i < 32; i++) letterTile(ctx, LETTERS[i], (i % 8) * 64 + 3, Math.floor(i / 8) * 64 + 3, 58, TILE_COLORS[(i * 3) % TILE_COLORS.length]);
  });
}

// ---------- hieroglyphs ----------

function glyph(ctx, id, x, y, s, c) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (id % 9) {
    case 0: // eye of Horus
      ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.quadraticCurveTo(0, -s * 0.5, s * 0.5, 0); ctx.quadraticCurveTo(0, s * 0.3, -s * 0.5, 0); ctx.stroke();
      disc(ctx, 0, -s * 0.02, s * 0.15, c); ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.2); ctx.quadraticCurveTo(-s * 0.1, s * 0.5, -s * 0.3, s * 0.5); ctx.stroke(); break;
    case 1: // ankh
      ctx.beginPath(); ctx.ellipse(0, -s * 0.28, s * 0.2, s * 0.26, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s * 0.02); ctx.lineTo(0, s * 0.5); ctx.moveTo(-s * 0.28, s * 0.12); ctx.lineTo(s * 0.28, s * 0.12); ctx.stroke(); break;
    case 2: // water
      for (var w = 0; w < 3; w++) { ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.25 + w * s * 0.25); ctx.lineTo(-s * 0.25, -s * 0.38 + w * s * 0.25); ctx.lineTo(0, -s * 0.25 + w * s * 0.25); ctx.lineTo(s * 0.25, -s * 0.38 + w * s * 0.25); ctx.lineTo(s * 0.5, -s * 0.25 + w * s * 0.25); ctx.stroke(); } break;
    case 3: // sun disc
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.stroke(); disc(ctx, 0, 0, s * 0.1, c); break;
    case 4: // feather
      ctx.beginPath(); ctx.moveTo(0, s * 0.5); ctx.lineTo(0, -s * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -s * 0.12, s * 0.2, s * 0.38, 0, 0, Math.PI * 2); ctx.stroke(); break;
    case 5: // reed
      ctx.beginPath(); ctx.moveTo(0, s * 0.5); ctx.lineTo(0, -s * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s * 0.2); ctx.quadraticCurveTo(-s * 0.4, -s * 0.2, -s * 0.35, -s * 0.5); ctx.moveTo(0, -s * 0.2); ctx.quadraticCurveTo(s * 0.4, -s * 0.2, s * 0.35, -s * 0.5); ctx.stroke(); break;
    case 6: // bird
      ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.3, s * 0.2, -0.3, 0, Math.PI * 2); ctx.stroke(); disc(ctx, s * 0.28, -s * 0.2, s * 0.12, c);
      ctx.beginPath(); ctx.moveTo(-s * 0.25, s * 0.2); ctx.lineTo(-s * 0.35, s * 0.5); ctx.moveTo(0, s * 0.25); ctx.lineTo(0, s * 0.5); ctx.stroke(); break;
    case 7: // scarab
      ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.28, s * 0.34, 0, 0, Math.PI * 2); ctx.stroke(); disc(ctx, 0, -s * 0.38, s * 0.1, c);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.28); ctx.lineTo(0, s * 0.4); ctx.moveTo(-s * 0.28, -s * 0.05); ctx.lineTo(-s * 0.5, -s * 0.15); ctx.moveTo(s * 0.28, -s * 0.05); ctx.lineTo(s * 0.5, -s * 0.15); ctx.stroke(); break;
    default: // snake
      ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.2); ctx.bezierCurveTo(-s * 0.3, -s * 0.4, 0, s * 0.5, s * 0.2, -s * 0.1); ctx.lineTo(s * 0.45, -s * 0.3); ctx.stroke();
  }
  ctx.restore();
}

/** The Rosetta slab: three bands of script on warm stone, a corner broken off the top. Transparent outside. */
export function slabTex() {
  return canvasTex('ros_slab', 512, 680, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    var edge = 14;
    ctx.beginPath();
    ctx.moveTo(edge, h - 4); ctx.lineTo(edge, 70); ctx.lineTo(60, 40); ctx.lineTo(150, 54); ctx.lineTo(240, 20); ctx.lineTo(w * 0.6, 30); ctx.lineTo(w * 0.72, 86); ctx.lineTo(w * 0.86, 120); ctx.lineTo(w - edge, 150); ctx.lineTo(w - edge, h - 4); ctx.closePath();
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#c49a68'); g.addColorStop(1, '#a8804f');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,240,200,0.18)'; for (var s = 0; s < 40; s++) ctx.fillRect((s * 97) % w, (s * 53) % h, 12 + (s % 4) * 6, 3);
    // top band: hieroglyphs in three colours, three rows
    var cols = [GOLD, TURQ, TERRA];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 7; c++) glyph(ctx, r * 3 + c * 2, 52 + c * 66, 92 + r * 54, 40, cols[(r + c) % 3]);
    // a cartouche
    ctx.strokeStyle = INK; ctx.lineWidth = 4; rr(ctx, 160, 266, 190, 52, 26); ctx.stroke(); glyph(ctx, 3, 192, 292, 30, TERRA); glyph(ctx, 6, 255, 292, 30, TURQ); glyph(ctx, 1, 318, 292, 30, GOLD);
    ctx.fillStyle = INK; ctx.fillRect(edge + 4, 332, w - edge * 2 - 8, 4);
    // middle band: a flowing hand, drawn as looping strokes
    ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 5;
    for (var l = 0; l < 4; l++) {
      ctx.beginPath(); ctx.moveTo(34, 372 + l * 34);
      for (var x = 34; x < w - 34; x += 22) { ctx.quadraticCurveTo(x + 6, 372 + l * 34 - 14 - ((x * 7 + l * 13) % 11), x + 11, 372 + l * 34 + 2); ctx.quadraticCurveTo(x + 16, 372 + l * 34 + 14, x + 22, 372 + l * 34); }
      ctx.stroke();
    }
    ctx.fillStyle = INK; ctx.fillRect(edge + 4, 512, w - edge * 2 - 8, 4);
    // bottom band: Greek capitals
    ctx.fillStyle = '#5a3a1c'; ctx.font = '900 34px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ΧΑΙΡΕ ΦΙΛΕ', w / 2, 548); ctx.fillText('ΛΟΓΟΣ ΚΑΙ ΓΛΩΣΣΑ', w / 2, 594); ctx.fillText('ΕΝ ΑΡΧΗ ΗΝ Ο ΛΟΓΟΣ', w / 2, 640);
    ctx.restore();
  });
}

/** A small plaque with a hello in some language (for the ribbons and banners). */
var HELLOS = [['Hello', SANS, '#e2543a'], ['Hola', SANS, '#2fb8b0'], ['Bonjour', SANS, '#f2b134'], ['你好', CJK, '#4a8fe0'], ['Ciao', SANS, '#7cc44a'], ['Привет', SANS, '#ee7a3a'], ['こんにちは', CJK, '#2fb8b0'], ['مرحبا', ARABIC, '#e2543a'], ['Γεια σου', SANS, '#4a8fe0'], ['Hallo', SANS, '#f2b134']];

/** A hanging row of pennants with greetings in ten languages (transparent between). 10.4 x 1.8 units. */
export function pennantBanner(i) {
  return canvasTex('ros_pennant' + i, 1280, 224, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 4;
    ctx.beginPath(); for (var t = 0; t <= 40; t++) { var px = 6 + (t / 40) * (w - 12); var py = 10 + Math.sin((t / 40) * Math.PI) * 14; if (t) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
    var n = 7;
    for (var j = 0; j < n; j++) {
      var u = (j + 0.5) / n;
      var fx = 6 + u * (w - 12);
      var fy = 10 + Math.sin(u * Math.PI) * 14;
      var hl = HELLOS[(j + i * 3) % HELLOS.length];
      ctx.fillStyle = hl[2];
      ctx.beginPath(); ctx.moveTo(fx - 80, fy); ctx.lineTo(fx + 80, fy); ctx.lineTo(fx + 80, fy + 140); ctx.lineTo(fx, fy + 200); ctx.lineTo(fx - 80, fy + 140); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(fx - 80, fy, 160, 24);
      ctx.fillStyle = '#fffbe8'; ctx.font = '900 ' + (hl[0].length > 5 ? 36 : 48) + 'px ' + hl[1]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(hl[0], fx, fy + 90, 148);
    }
  });
}

/** Two ribbons of letters winding round each other, seen from the side (transparent around). 10.4 x 2.4 units. */
export function ribbonBanner() {
  return canvasTex('ros_ribbon', 1280, 300, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    var amp = 82;
    var cy = h / 2;
    for (var pass = 0; pass < 2; pass++) {
      for (var strand = 0; strand < 2; strand++) {
        var ph = strand * Math.PI;
        // draw the far part of each strand first, then the near part
        ctx.strokeStyle = strand ? '#2fb8b0' : '#e8b030'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        for (var x = 0; x < w; x += 6) {
          var a = (x / 320) * Math.PI * 2 + ph;
          var near = Math.cos(a) > 0;
          if (near !== (pass === 1)) continue;
          ctx.beginPath(); ctx.moveTo(x, cy + Math.sin(a) * amp); ctx.lineTo(x + 7, cy + Math.sin(a + 6 / 320 * Math.PI * 2) * amp); ctx.stroke();
        }
        for (var i = 0; i < 28; i++) {
          var tx = 20 + i * 45;
          var ta = (tx / 320) * Math.PI * 2 + ph;
          var tnear = Math.cos(ta) > 0;
          if (tnear !== (pass === 1)) continue;
          var sz = 30 + Math.cos(ta) * 9;
          letterTile(ctx, LETTERS[(i * 3 + strand * 7) % LETTERS.length], tx - sz / 2, cy + Math.sin(ta) * amp - sz / 2, sz, TILE_COLORS[(i + strand * 3) % TILE_COLORS.length]);
        }
      }
    }
    // rungs: small gold bars between the strands where they cross
    ctx.fillStyle = 'rgba(232,176,48,0.9)';
    for (var rr2 = 0; rr2 < 8; rr2++) { var rx = rr2 * 160 + 80; ctx.beginPath(); ctx.arc(rx, cy, 8, 0, Math.PI * 2); ctx.fill(); }
  });
}

// ---------- the hall ----------

export var WALL_W = 2048;
export var WALL_H = 820;

function column(ctx, x, base, h, w) {
  var g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#e8c27a'); g.addColorStop(0.5, '#fbe4a4'); g.addColorStop(1, '#d9a85a');
  ctx.fillStyle = g; ctx.fillRect(x, base - h, w, h);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x, base - h, w, h);
  // painted bands and a lotus capital
  ctx.fillStyle = TURQ; ctx.fillRect(x, base - h + 36, w, 14); ctx.fillStyle = TERRA; ctx.fillRect(x, base - h + 54, w, 10); ctx.fillStyle = GOLD; ctx.fillRect(x, base - h + 68, w, 6);
  for (var p = 0; p < 4; p++) { ctx.fillStyle = p % 2 ? '#6cc060' : TURQ; ctx.beginPath(); ctx.ellipse(x + w * (0.15 + p * 0.23), base - h + 18, w * 0.12, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#e8c27a'; ctx.fillRect(x - 8, base - h - 10, w + 16, 14); ctx.strokeRect(x - 8, base - h - 10, w + 16, 14);
  ctx.fillRect(x - 6, base - 24, w + 12, 24); ctx.strokeRect(x - 6, base - 24, w + 12, 24);
  for (var gl = 0; gl < Math.floor((h - 160) / 46); gl++) glyph(ctx, gl * 2 + 1, x + w / 2, base - h + 108 + gl * 46, 26, gl % 2 ? TURQ : TERRA);
}

function paintBay(ctx, k, cx) {
  var base = WALL_H - 6;
  // each bay has a pilaster at both edges and its own painting between them
  column(ctx, cx - 256 + 4, base, 590, 56);
  column(ctx, cx + 256 - 60, base, 590, 56);
  var l = cx - 190;
  var r = cx + 190;
  if (k === 0) {
    // a window onto the sky with an arch, and a plaque of a ship (the Nile)
    ctx.fillStyle = '#9ad8e6'; ctx.beginPath(); ctx.moveTo(l + 30, base - 40); ctx.lineTo(l + 30, base - 340); ctx.arc(cx, base - 340, 160, Math.PI, 0); ctx.lineTo(r - 30, base - 40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(cx + 40, base - 380, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f3d28a'; ctx.beginPath(); ctx.moveTo(l + 30, base - 40); ctx.lineTo(l + 120, base - 170); ctx.lineTo(l + 210, base - 40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 20, base - 40); ctx.lineTo(cx + 130, base - 210); ctx.lineTo(r - 30, base - 40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a9fcf'; ctx.fillRect(l + 30, base - 52, r - l - 60, 14);
  } else if (k === 1) {
    // a wall of hanging greetings
    var hs = [['Hello', '#e2543a'], ['Hola', '#2fb8b0'], ['你好', '#4a8fe0'], ['Ciao', '#7cc44a'], ['Привет', '#ee7a3a'], ['Hallo', '#f2b134']];
    hs.forEach(function (hh, i) {
      var px = l + 6 + (i % 3) * 126; var py = base - 520 + Math.floor(i / 3) * 190;
      ctx.fillStyle = hh[1]; ctx.fillRect(px, py, 112, 150); ctx.beginPath(); ctx.moveTo(px, py + 150); ctx.lineTo(px + 56, py + 190); ctx.lineTo(px + 112, py + 150); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(px, py, 112, 150);
      ctx.fillStyle = '#fffbe8'; ctx.font = '900 ' + (hh[0].length > 5 ? 26 : 34) + 'px ' + fontFor(hh[0]); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hh[0], px + 56, py + 74, 100);
      ctx.fillStyle = GOLD; ctx.fillRect(px - 4, py - 8, 120, 10);
    });
  } else if (k === 2) {
    // a big sun disc with rays over a doorway
    ctx.save(); ctx.translate(cx, base - 400);
    for (var q = 0; q < 24; q++) { ctx.fillStyle = q % 2 ? '#ffd45a' : '#ffb830'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 200, (q / 24) * Math.PI * 2, ((q + 1) / 24) * Math.PI * 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    disc(ctx, cx, base - 400, 120, TERRA); disc(ctx, cx, base - 400, 100, '#ffe58a');
    glyph(ctx, 0, cx, base - 400, 130, INK);
  } else {
    // two obelisks and a wide band of hieroglyphs
    [l + 40, r - 40].forEach(function (ox) {
      ctx.fillStyle = '#e8c27a'; ctx.beginPath(); ctx.moveTo(ox - 36, base - 30); ctx.lineTo(ox - 26, base - 520); ctx.lineTo(ox, base - 580); ctx.lineTo(ox + 26, base - 520); ctx.lineTo(ox + 36, base - 30); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(ox - 26, base - 520); ctx.lineTo(ox, base - 580); ctx.lineTo(ox + 26, base - 520); ctx.closePath(); ctx.fill();
      for (var g = 0; g < 7; g++) glyph(ctx, g + k, ox, base - 460 + g * 58, 28, g % 2 ? TURQ : TERRA);
    });
  }
  // a frieze of glyphs near the top of every bay
  ctx.fillStyle = '#fbe4a4'; ctx.fillRect(l - 30, 76, r - l + 60, 66); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(l - 30, 76, r - l + 60, 66);
  for (var f = 0; f < 8; f++) glyph(ctx, f + k * 2, l - 4 + f * 52, 110, 34, [GOLD, TURQ, TERRA][f % 3]);
}

/** The wall of the hall for one side, with its bays placed where that side's bays fall on the picture. */
export function wallPicture(side) {
  return canvasTex('ros_wall' + side, WALL_W, WALL_H, function (ctx, w, h) {
    // sandstone blocks
    ctx.fillStyle = '#f4dba0'; ctx.fillRect(0, 0, w, h);
    for (var row = 0; row < 14; row++) {
      var y = row * 60;
      var shift = row % 2 ? 64 : 0;
      for (var x = -shift; x < w; x += 128) {
        var tint = ((row * 7 + (x / 128 | 0) * 13) % 5);
        ctx.fillStyle = ['#f4dba0', '#efd092', '#f8e2ac', '#ecca8a', '#f2d69c'][tint];
        ctx.fillRect(x + 2, y + 2, 124, 56);
      }
    }
    ctx.fillStyle = 'rgba(160,110,50,0.25)';
    for (var gy = 0; gy <= 14; gy++) ctx.fillRect(0, gy * 60, w, 3);
    // a painted band of lotus and papyrus along the very top, and a cobalt and gold dado
    for (var b = 0; b < 64; b++) { ctx.fillStyle = b % 2 ? '#2fb8b0' : '#e2543a'; ctx.fillRect(b * 32, 0, 32, 28); ctx.fillStyle = '#e8b030'; ctx.fillRect(b * 32, 28, 32, 8); }
    ctx.fillStyle = '#2fb8b0'; ctx.fillRect(0, h - 70, w, 12); ctx.fillStyle = '#e8b030'; ctx.fillRect(0, h - 58, w, 6);
    for (var k = 0; k < 4; k++) {
      var cx = (side > 0 ? k * 0.25 : ((4 - k) % 4) * 0.25) * w;
      [cx - w, cx, cx + w].forEach(function (c) { if (c > -300 && c < w + 300) paintBay(ctx, k, c); });
    }
  });
}

export function floorPicture() {
  // 12 across, 16 along, 64 pixels to the unit: sandstone flags with a Greek-key border and a gold inlay
  return canvasTex('ros_floor', 768, 1024, function (ctx, w, h) {
    ctx.fillStyle = '#f0d08e'; ctx.fillRect(0, 0, w, h);
    for (var j = 0; j < 8; j++) for (var i = 0; i < 6; i++) {
      var t = (i * 5 + j * 3) % 4;
      ctx.fillStyle = ['#f3d698', '#eec982', '#f6dca4', '#e9c27a'][t];
      ctx.fillRect(i * 128 + 3, j * 128 + 3, 122, 122);
    }
    ctx.strokeStyle = 'rgba(150,100,40,0.35)'; ctx.lineWidth = 3;
    for (var g = 0; g <= 6; g++) { ctx.beginPath(); ctx.moveTo(g * 128, 0); ctx.lineTo(g * 128, h); ctx.stroke(); }
    for (var g2 = 0; g2 <= 8; g2++) { ctx.beginPath(); ctx.moveTo(0, g2 * 128); ctx.lineTo(w, g2 * 128); ctx.stroke(); }
    // Greek-key meander borders down each edge
    [0, w - 80].forEach(function (bx) {
      ctx.fillStyle = '#2f9fa8'; ctx.fillRect(bx, 0, 80, h);
      ctx.strokeStyle = '#ffe58a'; ctx.lineWidth = 8; ctx.lineJoin = 'miter';
      for (var m = 0; m < 16; m++) { var y0 = m * 64 + 8; ctx.beginPath(); ctx.moveTo(bx + 10, y0 + 48); ctx.lineTo(bx + 10, y0 + 6); ctx.lineTo(bx + 62, y0 + 6); ctx.lineTo(bx + 62, y0 + 36); ctx.lineTo(bx + 30, y0 + 36); ctx.lineTo(bx + 30, y0 + 22); ctx.stroke(); }
    });
    // gold inlay lines and a few carved letters on the flags
    ctx.fillStyle = 'rgba(232,176,48,0.7)'; ctx.fillRect(150, 0, 6, h); ctx.fillRect(w - 156, 0, 6, h);
    ctx.fillStyle = 'rgba(150,100,40,0.28)'; ctx.font = '900 54px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var s = 0; s < 14; s++) ctx.fillText(LETTERS[(s * 5) % 32], 190 + ((s * 211) % (w - 380)), (s * 197) % h, 60);
  });
}

export function ceilingPicture() {
  return canvasTex('ros_ceiling', 464, 640, function (ctx, w, h) {
    ctx.fillStyle = '#56c3bc'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe58a';
    for (var s = 0; s < 34; s++) {
      var px = (s * 137) % w; var py = (s * 89) % h; ctx.beginPath();
      for (var p = 0; p < 10; p++) { var ra = p % 2 ? 5 : 12; var an = -Math.PI / 2 + (p * Math.PI) / 5; ctx.lineTo(px + Math.cos(an) * ra, py + Math.sin(an) * ra); }
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#e8b030'; ctx.fillRect(0, 0, 14, h); ctx.fillRect(w - 14, 0, 14, h); ctx.fillStyle = '#e2543a'; ctx.fillRect(14, 0, 8, h); ctx.fillRect(w - 22, 0, 8, h);
    // golden coffers across the vault
    ctx.strokeStyle = 'rgba(232,176,48,0.9)'; ctx.lineWidth = 6; for (var c = 0; c < 2; c++) ctx.strokeRect(40, 10 + c * 320, w - 80, 300);
  });
}
