/**
 * calavera_art.js — the painter's box for the Calavera Fiesta: sugar skulls, marigolds, papel picado, cartoon
 * calavera musicians, painted houses and the pictures (wall, floor, ceiling, banners) built from them.
 *
 * Everything is drawn on canvases (mapkit canvasTex) so the whole street is a handful of textures: the 3D props of the
 * map only need to add depth in front of the painted street. All of it is warm, friendly and joyful.
 */

import { canvasTex } from '../mapkit.js';

export var HOUSES = [
  ['#ff7a5c', '#ffe08a'], ['#27c3bd', '#fff1c2'], ['#ffcf3f', '#e2543a'], ['#ff5f93', '#fff1c2'],
  ['#6ccf5a', '#ffe08a'], ['#4aa3e8', '#ffe9a8'], ['#ff9a2e', '#27c3bd'], ['#f2506e', '#ffe9a8']
];
var CREAM = '#fff4dc';
var INK = '#2a1738';
var MARI = ['#ff9a1f', '#ffb52e', '#ff8212', '#ffc83d'];
export var PAPEL = ['#ff5f93', '#ffb52e', '#27c3bd', '#6ccf5a', '#ff7a5c', '#4aa3e8', '#ffe14a'];

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

/** A ruffled marigold (cempasuchil) head. */
export function marigold(ctx, x, y, r) {
  var n = 9;
  for (var i = 0; i < n; i++) {
    var a = (i / n) * Math.PI * 2;
    disc(ctx, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, MARI[i % 4]);
  }
  disc(ctx, x, y, r * 0.55, '#ffb52e');
  disc(ctx, x, y, r * 0.3, '#ff8212');
  disc(ctx, x - r * 0.08, y - r * 0.08, r * 0.1, '#ffe08a');
}

/** A garland of marigolds along a sagging curve from (x0,y) to (x1,y). */
export function garland(ctx, x0, x1, y, sag, r, step) {
  ctx.strokeStyle = '#3e9b4a';
  ctx.lineWidth = Math.max(2, r * 0.3);
  ctx.beginPath();
  var n = 24;
  for (var i = 0; i <= n; i++) {
    var t = i / n;
    var px = x0 + (x1 - x0) * t;
    var py = y + Math.sin(t * Math.PI) * sag;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  var m = Math.max(2, Math.round(Math.abs(x1 - x0) / (step || r * 1.5)));
  for (var j = 0; j <= m; j++) {
    var u = j / m;
    marigold(ctx, x0 + (x1 - x0) * u, y + Math.sin(u * Math.PI) * sag, r * (j % 2 ? 0.92 : 1));
  }
}

var _flagCache = {};

/** One papel picado flag (paper with cut-out holes) on its own canvas. Returns the canvas, or null. */
export function flagCanvas(color, kind, w, h) {
  var key = color + kind + w + h;
  if (_flagCache[key] !== undefined) return _flagCache[key];
  var c = null;
  if (typeof document !== 'undefined') {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var f = c.getContext && c.getContext('2d');
    if (!f) { c = null; } else {
      f.fillStyle = color;
      f.fillRect(0, 0, w, h);
      f.globalCompositeOperation = 'destination-out';
      f.fillStyle = '#000';
      // a scalloped lower edge
      for (var s = 0; s < 4; s++) { f.beginPath(); f.arc((s + 0.5) * (w / 4), h, w / 8.6, 0, Math.PI * 2); f.fill(); }
      f.fillRect(w * 0.08, h * 0.06, w * 0.84, h * 0.025);
      if (kind === 0) {
        // a skull: eyes, nose and teeth
        f.beginPath(); f.arc(w * 0.5, h * 0.4, w * 0.27, 0, Math.PI * 2); f.fill();
        f.globalCompositeOperation = 'source-over';
        f.fillStyle = color;
        [-1, 1].forEach(function (d) { f.beginPath(); f.arc(w * 0.5 + d * w * 0.11, h * 0.38, w * 0.075, 0, Math.PI * 2); f.fill(); });
        f.beginPath(); f.moveTo(w * 0.5, h * 0.46); f.lineTo(w * 0.47, h * 0.53); f.lineTo(w * 0.53, h * 0.53); f.fill();
        f.fillRect(w * 0.4, h * 0.58, w * 0.2, h * 0.04);
        f.globalCompositeOperation = 'destination-out';
      } else if (kind === 1) {
        // a flower with petals
        for (var p = 0; p < 8; p++) { var a = (p / 8) * Math.PI * 2; f.beginPath(); f.ellipse(w * 0.5 + Math.cos(a) * w * 0.2, h * 0.42 + Math.sin(a) * w * 0.2, w * 0.09, w * 0.05, a, 0, Math.PI * 2); f.fill(); }
        f.globalCompositeOperation = 'source-over'; f.fillStyle = color; f.beginPath(); f.arc(w * 0.5, h * 0.42, w * 0.07, 0, Math.PI * 2); f.fill(); f.globalCompositeOperation = 'destination-out';
      } else if (kind === 2) {
        // a guitar and a row of dots
        f.beginPath(); f.ellipse(w * 0.5, h * 0.52, w * 0.18, w * 0.15, 0, 0, Math.PI * 2); f.fill();
        f.fillRect(w * 0.47, h * 0.18, w * 0.06, h * 0.32);
        f.globalCompositeOperation = 'source-over'; f.fillStyle = color; f.beginPath(); f.arc(w * 0.5, h * 0.52, w * 0.05, 0, Math.PI * 2); f.fill(); f.globalCompositeOperation = 'destination-out';
      } else {
        // a star with dots, for the diamonds and hearts
        f.beginPath();
        for (var q = 0; q < 10; q++) { var ra = q % 2 ? w * 0.12 : w * 0.28; var an = -Math.PI / 2 + (q * Math.PI) / 5; f.lineTo(w * 0.5 + Math.cos(an) * ra, h * 0.42 + Math.sin(an) * ra); }
        f.closePath(); f.fill();
      }
      for (var d = 0; d < 5; d++) { f.beginPath(); f.arc(w * (0.16 + d * 0.17), h * 0.8, w * 0.035, 0, Math.PI * 2); f.fill(); }
      f.globalCompositeOperation = 'source-over';
    }
  }
  _flagCache[key] = c;
  return c;
}

/** A string of papel picado flags hanging from a sagging cord. */
export function papelString(ctx, x0, x1, y, sag, fw, fh, seed) {
  ctx.strokeStyle = '#6b4a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  var n = 20;
  for (var i = 0; i <= n; i++) {
    var t = i / n;
    var py = y + Math.sin(t * Math.PI) * sag;
    if (i === 0) ctx.moveTo(x0 + (x1 - x0) * t, py); else ctx.lineTo(x0 + (x1 - x0) * t, py);
  }
  ctx.stroke();
  var m = Math.max(2, Math.round((x1 - x0) / (fw * 1.08)));
  for (var j = 0; j < m; j++) {
    var u = (j + 0.5) / m;
    var img = flagCanvas(PAPEL[(j + (seed || 0)) % PAPEL.length], (j + (seed || 0)) % 4, 64, 80);
    var fx = x0 + (x1 - x0) * u;
    var fy = y + Math.sin(u * Math.PI) * sag;
    if (img) ctx.drawImage(img, fx - fw / 2, fy, fw, fh); else { ctx.fillStyle = PAPEL[j % PAPEL.length]; ctx.fillRect(fx - fw / 2, fy, fw, fh); }
  }
}

/** A sugar skull face, r is the cranium radius. `hue` picks the accent colours. */
export function sugarSkull(ctx, cx, cy, r, hue) {
  var acc = [['#ff5f93', '#27c3bd', '#ffb52e'], ['#27c3bd', '#ff7a5c', '#ffe14a'], ['#ffb52e', '#4aa3e8', '#ff5f93'], ['#6ccf5a', '#ff5f93', '#ffb52e']][(hue || 0) % 4];
  ctx.lineJoin = 'round';
  // jaw and cranium
  ctx.fillStyle = CREAM;
  rr(ctx, cx - r * 0.62, cy + r * 0.45, r * 1.24, r * 0.95, r * 0.3); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 1.02, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 1.02, 0, 0, Math.PI * 2); ctx.stroke();
  rr(ctx, cx - r * 0.62, cy + r * 0.45, r * 1.24, r * 0.95, r * 0.3); ctx.stroke();
  ctx.fillStyle = CREAM; ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.2, r * 0.97, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  // flower eyes
  [-1, 1].forEach(function (d, i) {
    var ex = cx + d * r * 0.4;
    var ey = cy + r * 0.05;
    for (var p = 0; p < 10; p++) { var a = (p / 10) * Math.PI * 2; disc(ctx, ex + Math.cos(a) * r * 0.3, ey + Math.sin(a) * r * 0.3, r * 0.12, acc[(p + i) % 3]); }
    disc(ctx, ex, ey, r * 0.27, INK);
    disc(ctx, ex - r * 0.07, ey - r * 0.08, r * 0.07, '#ffffff');
  });
  // heart nose
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.52); ctx.bezierCurveTo(cx - r * 0.2, cy + r * 0.3, cx - r * 0.08, cy + r * 0.2, cx, cy + r * 0.34); ctx.bezierCurveTo(cx + r * 0.08, cy + r * 0.2, cx + r * 0.2, cy + r * 0.3, cx, cy + r * 0.52); ctx.fill();
  // forehead flower and dots
  marigoldTiny(ctx, cx, cy - r * 0.62, r * 0.17, acc[0]);
  [-0.55, -0.3, 0.3, 0.55].forEach(function (u, i) { disc(ctx, cx + u * r, cy - r * (0.7 - Math.abs(u) * 0.3), r * 0.045, acc[(i + 1) % 3]); });
  // cheeks
  [-1, 1].forEach(function (d) { disc(ctx, cx + d * r * 0.72, cy + r * 0.5, r * 0.11, 'rgba(255,95,147,0.75)'); });
  // stitched smile
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.62, r * 0.46, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  for (var s = 0; s < 7; s++) {
    var sa = 0.15 * Math.PI + (s / 6) * 0.7 * Math.PI;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(sa) * r * 0.46, cy + r * 0.62 + Math.sin(sa) * r * 0.46 - r * 0.07); ctx.lineTo(cx + Math.cos(sa) * r * 0.46, cy + r * 0.62 + Math.sin(sa) * r * 0.46 + r * 0.1); ctx.stroke();
  }
  // chin dots
  [-0.2, 0, 0.2].forEach(function (u, i) { disc(ctx, cx + u * r, cy + r * 1.2, r * 0.045, acc[i]); });
}

function marigoldTiny(ctx, x, y, r, c) {
  for (var i = 0; i < 6; i++) { var a = (i / 6) * Math.PI * 2; disc(ctx, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.45, c); }
  disc(ctx, x, y, r * 0.4, '#ffe14a');
}

function sombrero(ctx, cx, y, w, c1, c2) {
  ctx.fillStyle = c1;
  ctx.beginPath(); ctx.ellipse(cx, y, w, w * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = c1;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.38, y - w * 0.04); ctx.quadraticCurveTo(cx - w * 0.3, y - w * 0.72, cx, y - w * 0.72); ctx.quadraticCurveTo(cx + w * 0.3, y - w * 0.72, cx + w * 0.38, y - w * 0.04); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c2;
  ctx.fillRect(cx - w * 0.37, y - w * 0.2, w * 0.74, w * 0.1);
  for (var i = 0; i < 6; i++) disc(ctx, cx - w * 0.3 + i * w * 0.12, y - w * 0.15, w * 0.03, '#fff1c2');
  ctx.strokeStyle = c2; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, y, w * 0.85, w * 0.15, 0, 0.1, Math.PI - 0.1); ctx.stroke();
}

/**
 * A cartoon calavera standing with feet at (cx, baseY), about `s` pixels tall.
 * o: suit, trim, hat ('sombrero' | 'crown' | 'phones' | 'topper'), tool ('guitar' | 'trumpet' | 'violin' | 'maracas' | 'decks' | null), hue
 */
export function calavera(ctx, cx, baseY, s, o) {
  var bone = CREAM;
  var head = s * 0.2;
  var hy = baseY - s + head * 1.15;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // legs: bones in boots
  ctx.strokeStyle = INK; ctx.lineWidth = s * 0.045;
  [-1, 1].forEach(function (d) {
    ctx.fillStyle = o.suit2 || o.suit;
    rr(ctx, cx + d * s * 0.11 - s * 0.07, baseY - s * 0.42, s * 0.14, s * 0.36, s * 0.05); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(cx + d * s * 0.11 + d * s * 0.03, baseY - s * 0.03, s * 0.11, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  });
  // torso: the suit jacket over a bony chest
  ctx.fillStyle = o.suit;
  rr(ctx, cx - s * 0.2, baseY - s * 0.76, s * 0.4, s * 0.4, s * 0.1); ctx.fill(); ctx.stroke();
  ctx.fillStyle = bone;
  ctx.beginPath(); ctx.moveTo(cx - s * 0.07, baseY - s * 0.76); ctx.lineTo(cx + s * 0.07, baseY - s * 0.76); ctx.lineTo(cx, baseY - s * 0.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = s * 0.012;
  for (var r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.05, baseY - s * 0.72 + r * s * 0.05); ctx.lineTo(cx + s * 0.05, baseY - s * 0.72 + r * s * 0.05); ctx.stroke(); }
  ctx.fillStyle = o.trim;
  for (var b = 0; b < 4; b++) disc(ctx, cx + (b % 2 ? 1 : -1) * s * 0.15, baseY - s * 0.72 + b * s * 0.085, s * 0.018, o.trim);
  ctx.lineWidth = s * 0.045; ctx.strokeStyle = INK;
  // arms
  var tool = o.tool;
  function arm(x0, y0, x1, y1, x2, y2) {
    ctx.strokeStyle = INK; ctx.lineWidth = s * 0.075;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = o.suit; ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = bone; ctx.lineWidth = s * 0.035;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    disc(ctx, x2, y2, s * 0.03, bone);
  }
  if (tool === 'guitar') {
    ctx.save(); ctx.translate(cx + s * 0.02, baseY - s * 0.52); ctx.rotate(-0.5);
    ctx.fillStyle = '#c9772e'; ctx.strokeStyle = INK; ctx.lineWidth = s * 0.012;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.16, s * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-s * 0.1, 0, s * 0.1, s * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    disc(ctx, 0, 0, s * 0.04, INK);
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(s * 0.1, -s * 0.02, s * 0.3, s * 0.04);
    ctx.restore();
    arm(cx - s * 0.2, baseY - s * 0.7, cx - s * 0.32, baseY - s * 0.55, cx + s * 0.28, baseY - s * 0.72);
    arm(cx + s * 0.2, baseY - s * 0.7, cx + s * 0.26, baseY - s * 0.55, cx + s * 0.02, baseY - s * 0.5);
  } else if (tool === 'trumpet') {
    ctx.strokeStyle = '#f2b530'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.moveTo(cx + s * 0.02, baseY - s * 0.86); ctx.lineTo(cx + s * 0.34, baseY - s * 0.86); ctx.stroke();
    ctx.fillStyle = '#f2b530'; ctx.beginPath(); ctx.moveTo(cx + s * 0.34, baseY - s * 0.86); ctx.lineTo(cx + s * 0.46, baseY - s * 0.96); ctx.lineTo(cx + s * 0.46, baseY - s * 0.76); ctx.closePath(); ctx.fill();
    arm(cx - s * 0.2, baseY - s * 0.7, cx - s * 0.28, baseY - s * 0.82, cx + s * 0.1, baseY - s * 0.85);
    arm(cx + s * 0.2, baseY - s * 0.7, cx + s * 0.3, baseY - s * 0.75, cx + s * 0.25, baseY - s * 0.85);
  } else if (tool === 'maracas') {
    arm(cx - s * 0.2, baseY - s * 0.7, cx - s * 0.36, baseY - s * 0.78, cx - s * 0.42, baseY - s * 0.98);
    arm(cx + s * 0.2, baseY - s * 0.7, cx + s * 0.36, baseY - s * 0.78, cx + s * 0.42, baseY - s * 0.98);
    disc(ctx, cx - s * 0.42, baseY - s * 1.04, s * 0.06, '#ff5f93'); disc(ctx, cx + s * 0.42, baseY - s * 1.04, s * 0.06, '#27c3bd');
  } else if (tool === 'violin') {
    ctx.save(); ctx.translate(cx - s * 0.12, baseY - s * 0.78); ctx.rotate(-0.8);
    ctx.fillStyle = '#c9772e'; ctx.strokeStyle = INK; ctx.lineWidth = s * 0.012;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.1, s * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillRect(s * 0.08, -s * 0.012, s * 0.2, s * 0.024);
    ctx.restore();
    arm(cx - s * 0.2, baseY - s * 0.7, cx - s * 0.3, baseY - s * 0.8, cx + s * 0.1, baseY - s * 0.84);
    arm(cx + s * 0.2, baseY - s * 0.7, cx + s * 0.34, baseY - s * 0.62, cx - s * 0.1, baseY - s * 0.72);
  } else if (tool === 'decks') {
    arm(cx - s * 0.2, baseY - s * 0.7, cx - s * 0.34, baseY - s * 0.55, cx - s * 0.28, baseY - s * 0.42);
    arm(cx + s * 0.2, baseY - s * 0.7, cx + s * 0.4, baseY - s * 0.95, cx + s * 0.44, baseY - s * 1.1);
  } else {
    arm(cx - s * 0.2, baseY - s * 0.7, cx - s * 0.34, baseY - s * 0.55, cx - s * 0.3, baseY - s * 0.4);
    arm(cx + s * 0.2, baseY - s * 0.7, cx + s * 0.34, baseY - s * 0.55, cx + s * 0.3, baseY - s * 0.4);
  }
  // head
  sugarSkull(ctx, cx, hy, head, o.hue || 0);
  if (o.hat === 'sombrero') sombrero(ctx, cx, hy - head * 0.78, head * 1.9, o.hatColor || '#2a1738', o.trim);
  else if (o.hat === 'crown') {
    for (var m = -2; m <= 2; m++) marigold(ctx, cx + m * head * 0.4, hy - head * (1.0 - Math.abs(m) * 0.06), head * 0.22);
    marigold(ctx, cx - head * 0.9, hy - head * 0.5, head * 0.2);
  } else if (o.hat === 'phones') {
    ctx.strokeStyle = '#2a1738'; ctx.lineWidth = head * 0.14;
    ctx.beginPath(); ctx.arc(cx, hy - head * 0.1, head * 1.08, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
    [-1, 1].forEach(function (d) { rr(ctx, cx + d * head * 1.08 - head * 0.16, hy - head * 0.3, head * 0.32, head * 0.6, head * 0.1); ctx.fillStyle = o.trim; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke(); });
  } else if (o.hat === 'topper') {
    ctx.fillStyle = '#2a1738'; ctx.fillRect(cx - head * 0.6, hy - head * 1.7, head * 1.2, head * 0.9); ctx.fillRect(cx - head * 1.0, hy - head * 0.88, head * 2.0, head * 0.14);
    ctx.fillStyle = o.trim; ctx.fillRect(cx - head * 0.6, hy - head * 1.0, head * 1.2, head * 0.14);
    marigold(ctx, cx + head * 0.5, hy - head * 0.95, head * 0.2);
  }
}

// ---------- painted houses ----------

function archWindow(ctx, x, y, w, h, glow, shutter) {
  ctx.fillStyle = shutter;
  rr(ctx, x - w * 0.22, y, w * 0.22, h, 3); ctx.fill();
  rr(ctx, x + w, y, w * 0.22, h, 3); ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w * 0.5); ctx.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + w * 0.1, y + w * 0.55, w * 0.8, 3);
  ctx.fillRect(x + w / 2 - 1.5, y + w * 0.1, 3, h - w * 0.1);
}

/** A two-or-three storey painted house, base at baseY. */
export function house(ctx, x, w, h, baseY, hc, o) {
  o = o || {};
  var top = baseY - h;
  ctx.fillStyle = hc[0];
  ctx.fillRect(x, top, w, h);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x, top, w, h);
  // cornice and roof line
  ctx.fillStyle = hc[1];
  ctx.fillRect(x - 5, top - 14, w + 10, 16);
  ctx.strokeRect(x - 5, top - 14, w + 10, 16);
  for (var t = 0; t < Math.floor(w / 18); t++) { ctx.fillStyle = t % 2 ? hc[0] : '#ffffff'; ctx.fillRect(x + 4 + t * 18, top + 4, 12, 7); }
  // base stripe
  ctx.fillStyle = hc[1]; ctx.fillRect(x, baseY - 26, w, 26);
  ctx.fillStyle = 'rgba(42,23,56,0.18)'; ctx.fillRect(x, baseY - 26, w, 4);
  // door
  var dw = Math.min(70, w * 0.3);
  var dx = x + w / 2 - dw / 2;
  if (!o.noDoor) {
    ctx.fillStyle = '#8a4a2a';
    ctx.beginPath(); ctx.moveTo(dx, baseY); ctx.lineTo(dx, baseY - 90); ctx.arc(dx + dw / 2, baseY - 90, dw / 2, Math.PI, 0); ctx.lineTo(dx + dw, baseY); ctx.fill();
    ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = hc[1]; ctx.beginPath(); ctx.arc(dx + dw * 0.78, baseY - 46, 4, 0, Math.PI * 2); ctx.fill();
  }
  // windows on each upper storey, with flower boxes of marigolds
  var storeys = Math.max(1, Math.round((h - 130) / 130));
  for (var s = 0; s < storeys; s++) {
    var wy = top + 34 + s * 118;
    var cols = w > 190 ? 3 : 2;
    for (var c = 0; c < cols; c++) {
      var ww = 40;
      var wx = x + (w / cols) * (c + 0.5) - ww / 2;
      if (o.noDoor !== true && s === storeys - 1 && cols === 3 && c === 1) { /* balcony over the door */
        archWindow(ctx, wx, wy, ww, 74, '#ffe9a0', hc[1]);
        ctx.fillStyle = '#2a1738'; ctx.fillRect(wx - 16, wy + 70, ww + 32, 5);
        for (var rb = 0; rb < 7; rb++) ctx.fillRect(wx - 14 + rb * 10, wy + 52, 3, 20);
        continue;
      }
      archWindow(ctx, wx, wy, ww, 74, '#ffe9a0', hc[1]);
      ctx.fillStyle = '#8a4a2a'; ctx.fillRect(wx - 6, wy + 70, ww + 12, 12);
      for (var f = 0; f < 4; f++) marigold(ctx, wx + 4 + f * 11, wy + 68, 6);
    }
  }
  if (o.skull !== undefined) {
    // a mural of a sugar skull on the wall
    var sr = Math.min(w * 0.27, 52);
    ctx.fillStyle = hc[1]; ctx.beginPath(); ctx.arc(x + w / 2, top + h * 0.38, sr * 1.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    sugarSkull(ctx, x + w / 2, top + h * 0.36, sr, o.skull);
  }
}

/** A speech bubble with a word in it. */
export function bubble(ctx, text, x, y, w, h, fill, ink, tail) {
  ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  rr(ctx, x, y, w, h, h * 0.45); ctx.fill(); ctx.stroke();
  var tx = x + w * (tail === 'r' ? 0.74 : 0.26);
  ctx.beginPath(); ctx.moveTo(tx - 10, y + h - 1); ctx.lineTo(tx + (tail === 'r' ? 8 : -8), y + h + 18); ctx.lineTo(tx + 12, y + h - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fill; ctx.fillRect(tx - 8, y + h - 5, 18, 7);
  ctx.fillStyle = ink;
  ctx.font = '900 ' + Math.round(h * 0.5) + 'px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 2, w - 12);
}

/** Lettering on a painted sign board. */
export function board(ctx, text, x, y, w, h, fill, ink, trim) {
  ctx.fillStyle = fill; ctx.strokeStyle = trim || INK; ctx.lineWidth = 4;
  rr(ctx, x, y, w, h, h * 0.2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = '900 ' + Math.round(h * 0.52) + 'px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 2, w - 14);
}

function stringLights(ctx, x0, x1, y, sag, cols) {
  ctx.strokeStyle = '#4a3a30'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i <= 20; i++) { var t = i / 20; var py = y + Math.sin(t * Math.PI) * sag; if (i === 0) ctx.moveTo(x0, py); else ctx.lineTo(x0 + (x1 - x0) * t, py); }
  ctx.stroke();
  var n = Math.round((x1 - x0) / 26);
  for (var j = 0; j <= n; j++) {
    var u = j / n;
    var px = x0 + (x1 - x0) * u;
    var py2 = y + Math.sin(u * Math.PI) * sag + 8;
    var g = ctx.createRadialGradient(px, py2, 1, px, py2, 13);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, cols[j % cols.length]); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py2, 13, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- the pictures ----------

export var PX = 128; // pixels to the unit on the wall picture
export var WALL_W = 2048;
export var WALL_H = 820;

/** The four bays of the street. cx is the centre of the bay on the picture, in pixels. */
function paintBay(ctx, k, cx) {
  var base = WALL_H - 6;
  var x0 = cx - 256;
  var H = HOUSES;
  if (k === 0) {
    // the DJ bay: a marigold sun painted behind the decks, between two slim houses
    house(ctx, x0, 112, 420, base, H[3], { noDoor: true });
    house(ctx, x0 + 400, 112, 440, base, H[1], { noDoor: true });
    ctx.save();
    ctx.translate(cx, base - 400);
    for (var r = 0; r < 20; r++) {
      ctx.fillStyle = r % 2 ? '#ffd23f' : '#ffb52e';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 238, (r / 20) * Math.PI * 2, ((r + 1) / 20) * Math.PI * 2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    disc(ctx, cx, base - 400, 170, '#ff7a5c'); disc(ctx, cx, base - 400, 150, '#ffe08a'); disc(ctx, cx, base - 400, 100, '#ffb52e');
    for (var mm = 0; mm < 16; mm++) marigold(ctx, cx + Math.cos((mm / 16) * Math.PI * 2) * 172, base - 400 + Math.sin((mm / 16) * Math.PI * 2) * 172, 15);
    garland(ctx, x0 + 14, x0 + 498, base - 110, 24, 17);
  } else if (k === 1) {
    // the altar bay: a big arched niche framed in marigolds between two houses
    house(ctx, x0 - 4, 130, 400, base, H[2], { noDoor: true });
    house(ctx, x0 + 390, 126, 430, base, H[5], { noDoor: true });
    var nx = cx - 125;
    ctx.fillStyle = H[6][0];
    ctx.beginPath(); ctx.moveTo(nx, base); ctx.lineTo(nx, base - 360); ctx.arc(cx, base - 360, 125, Math.PI, 0); ctx.lineTo(nx + 250, base); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.moveTo(nx + 18, base); ctx.lineTo(nx + 18, base - 360); ctx.arc(cx, base - 360, 107, Math.PI, 0); ctx.lineTo(nx + 232, base); ctx.fill();
    for (var a = 0; a < 17; a++) {
      var ang = Math.PI + (a / 16) * Math.PI;
      marigold(ctx, cx + Math.cos(ang) * 125, base - 360 + Math.sin(ang) * 125, 14);
    }
    for (var m = 0; m < 6; m++) { marigold(ctx, nx, base - 40 - m * 60, 14); marigold(ctx, nx + 250, base - 40 - m * 60, 14); }
    marigold(ctx, cx, base - 500, 26); marigold(ctx, cx - 44, base - 486, 20); marigold(ctx, cx + 44, base - 486, 20);
    papelString(ctx, nx + 20, nx + 230, base - 470, 14, 34, 42, 1);
  } else if (k === 2) {
    // the church: twin bell towers, a round window and a clock, on the plaza
    ctx.fillStyle = '#ffe9c8';
    ctx.fillRect(cx - 190, base - 330, 380, 330);
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeRect(cx - 190, base - 330, 380, 330);
    [-1, 1].forEach(function (d) {
      var tx = cx + d * 140 - 46;
      ctx.fillStyle = '#ffd9a0'; ctx.fillRect(tx, base - 590, 92, 590); ctx.strokeRect(tx, base - 590, 92, 590);
      ctx.fillStyle = '#ff7a5c'; ctx.beginPath(); ctx.moveTo(tx - 6, base - 590); ctx.lineTo(tx + 46, base - 690); ctx.lineTo(tx + 98, base - 590); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a2f2a';
      ctx.beginPath(); ctx.moveTo(tx + 22, base - 470); ctx.lineTo(tx + 22, base - 530); ctx.arc(tx + 46, base - 530, 24, Math.PI, 0); ctx.lineTo(tx + 70, base - 470); ctx.fill();
      ctx.fillStyle = '#f2b530'; ctx.beginPath(); ctx.arc(tx + 46, base - 500, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe14a'; ctx.fillRect(tx + 43, base - 720, 6, 36); ctx.fillRect(tx + 34, base - 710, 24, 6);
    });
    ctx.fillStyle = '#ff9a2e'; ctx.beginPath(); ctx.moveTo(cx - 200, base - 330); ctx.lineTo(cx, base - 460); ctx.lineTo(cx + 200, base - 330); ctx.closePath(); ctx.fill(); ctx.stroke();
    disc(ctx, cx, base - 330, 50, '#fff4dc'); ctx.beginPath(); ctx.arc(cx, base - 330, 50, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, base - 330); ctx.lineTo(cx, base - 362); ctx.moveTo(cx, base - 330); ctx.lineTo(cx + 22, base - 320); ctx.stroke();
    ctx.fillStyle = '#8a4a2a'; ctx.beginPath(); ctx.moveTo(cx - 44, base); ctx.lineTo(cx - 44, base - 150); ctx.arc(cx, base - 150, 44, Math.PI, 0); ctx.lineTo(cx + 44, base); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffb52e'; ctx.fillRect(cx - 3, base - 190, 6, 190);
    garland(ctx, cx - 190, cx + 190, base - 260, 40, 15);
    bubble(ctx, '¡Hola!', cx - 40, base - 700, 110, 56, '#fff4dc', '#2a1738', 'l');
  } else {
    // the market bay: two shopfronts with striped awnings
    house(ctx, x0 - 4, 262, 330, base, H[4], { noDoor: true });
    house(ctx, x0 + 262, 254, 360, base, H[7], { noDoor: true });
    [[x0 - 4, 262, '#ff5f93', 'TACOS'], [x0 + 262, 254, '#27c3bd', 'CHURROS']].forEach(function (s, i) {
      var ay = base - 210;
      for (var st = 0; st < 8; st++) {
        ctx.fillStyle = st % 2 ? '#ffffff' : s[2];
        ctx.beginPath(); ctx.moveTo(s[0] + st * (s[1] / 8), ay); ctx.lineTo(s[0] + (st + 1) * (s[1] / 8), ay); ctx.lineTo(s[0] + (st + 1) * (s[1] / 8) + 6, ay + 52); ctx.lineTo(s[0] + st * (s[1] / 8) - 6, ay + 52); ctx.fill();
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(s[0] - 6, ay, s[1] + 12, 52);
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(s[0] + 20, ay + 56, s[1] - 40, 90); ctx.strokeRect(s[0] + 20, ay + 56, s[1] - 40, 90);
      board(ctx, s[3], s[0] + 40, ay - 78, s[1] - 80, 56, '#fff4dc', i ? '#d9432c' : '#c92a63');
    });
    board(ctx, 'PAN DE MUERTO', cx - 130, base - 470, 260, 52, '#ffb52e', '#2a1738');
    sugarSkull(ctx, x0 + 120, base - 250, 0, 0);
  }
  stringLights(ctx, x0, x0 + 512, base - 560, 26, ['#ff5f93', '#ffe14a', '#27c3bd', '#ff9a1f']);
}

function cloudsAndStars(ctx, w, h) {
  var sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3a8fe0'); sky.addColorStop(0.45, '#7cc4f0'); sky.addColorStop(0.72, '#ffc58a'); sky.addColorStop(1, '#ffa56a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (var s = 0; s < 40; s++) { var sx = (s * 337) % w; var sy = 20 + ((s * 151) % 240); ctx.beginPath(); ctx.arc(sx, sy, 2 + (s % 3), 0, Math.PI * 2); ctx.fill(); }
  // a smiling moon
  disc(ctx, w * 0.74, 120, 54, '#fff1b0'); disc(ctx, w * 0.74 + 14, 108, 12, 'rgba(255,200,90,0.5)');
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  [[0.12, 0.2], [0.4, 0.16], [0.62, 0.26], [0.9, 0.18]].forEach(function (c) { [[0, 0, 40], [44, 8, 30], [-44, 10, 28], [18, -16, 28]].forEach(function (b) { ctx.beginPath(); ctx.arc(c[0] * w + b[0], c[1] * h + b[1], b[2], 0, Math.PI * 2); ctx.fill(); }); });
}

/** The wall of the street for one side: the four bays are placed where that side's bays fall on the picture. */
export function wallPicture(side) {
  return canvasTex('cal_wall' + side, WALL_W, WALL_H, function (ctx, w, h) {
    cloudsAndStars(ctx, w, h);
    // a few papel picado strings across the sky, running through all bays
    for (var i = 0; i < 4; i++) papelString(ctx, i * 512, i * 512 + 512, 90 + (i % 2) * 20, 30, 40, 52, i * 2);
    // cobbled lane edge
    ctx.fillStyle = '#d9b27a'; ctx.fillRect(0, h - 8, w, 8);
    for (var k = 0; k < 4; k++) {
      var cx = (side > 0 ? k * 0.25 : ((4 - k) % 4) * 0.25) * w;
      [cx - w, cx, cx + w].forEach(function (c) { if (c > -300 && c < w + 300) paintBay(ctx, k, c); });
    }
    // greetings in speech bubbles on the facades, one per bay
    var hello = [['Buenas noches', 0], ['¿Cómo estás?', 1], ['Mucho gusto', 2], ['¡Salud!', 3]];
    hello.forEach(function (hh) {
      var cx2 = (side > 0 ? hh[1] * 0.25 : ((4 - hh[1]) % 4) * 0.25) * w;
      [cx2 - w, cx2, cx2 + w].forEach(function (c) { if (c > -300 && c < w + 300) bubble(ctx, hh[0], c + (hh[1] % 2 ? -210 : 100), 150 + (hh[1] % 3) * 14, hh[0].length > 8 ? 190 : 130, 52, '#fff4dc', '#2a1738', hh[1] % 2 ? 'r' : 'l'); });
    });
  });
}

export function floorPicture() {
  // 12 across, 16 along, 64 pixels to the unit: sand-coloured flagstones, a marigold petal path and mosaic edges
  return canvasTex('cal_floor', 768, 1024, function (ctx, w, h) {
    ctx.fillStyle = '#f0cf98'; ctx.fillRect(0, 0, w, h);
    var cw = 64;
    for (var j = 0; j < 16; j++) {
      for (var i = 0; i < 12; i++) {
        var off = j % 2 ? cw / 2 : 0;
        var x = i * cw - off;
        var shade = ((i * 7 + j * 13) % 5) / 5;
        ctx.fillStyle = 'rgb(' + Math.round(240 - shade * 14) + ',' + Math.round(208 - shade * 16) + ',' + Math.round(152 - shade * 18) + ')';
        ctx.fillRect(x + 2, j * cw + 2, cw - 4, cw - 4);
        if (x < 0) ctx.fillRect(x + w + 2, j * cw + 2, cw - 4, cw - 4);
      }
    }
    // a woven band of colour at each edge
    var cols = ['#ff5f93', '#ffb52e', '#27c3bd', '#ff7a5c', '#6ccf5a'];
    [0, w - 80].forEach(function (bx, side) {
      ctx.fillStyle = '#fff4dc'; ctx.fillRect(bx, 0, 80, h);
      for (var t = 0; t < 32; t++) {
        var y = t * 32;
        ctx.fillStyle = cols[(t + side) % 5];
        ctx.beginPath(); ctx.moveTo(bx + 40, y + 2); ctx.lineTo(bx + 72, y + 16); ctx.lineTo(bx + 40, y + 30); ctx.lineTo(bx + 8, y + 16); ctx.closePath(); ctx.fill();
        disc(ctx, bx + 40, y + 16, 5, '#fff4dc');
      }
    });
    // an ornamental carpet of coloured sawdust (a tapete) down the middle of the street: diamonds in a woven border
    ctx.fillStyle = 'rgba(255,244,220,0.42)'; ctx.fillRect(w / 2 - 232, 0, 464, h);
    ctx.fillStyle = 'rgba(255,154,31,0.55)'; ctx.fillRect(w / 2 - 232, 0, 10, h); ctx.fillRect(w / 2 + 222, 0, 10, h);
    ctx.fillStyle = 'rgba(39,195,189,0.5)'; ctx.fillRect(w / 2 - 216, 0, 5, h); ctx.fillRect(w / 2 + 211, 0, 5, h);
    for (var dd = 0; dd < 16; dd++) {
      [-1, 1].forEach(function (sd) {
        var dx = w / 2 + sd * 196; var dy = dd * 64 + 32;
        ctx.fillStyle = dd % 2 ? 'rgba(255,95,147,0.55)' : 'rgba(255,200,61,0.65)';
        ctx.beginPath(); ctx.moveTo(dx, dy - 24); ctx.lineTo(dx + 16, dy); ctx.lineTo(dx, dy + 24); ctx.lineTo(dx - 16, dy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,244,220,0.8)'; ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI * 2); ctx.fill();
      });
    }
    // marigold petals strewn along the way, thicker at the sides (it tiles in both directions)
    for (var p = 0; p < 150; p++) {
      var px = 90 + ((p * 197) % (w - 180));
      var py = (p * 331) % h;
      var edge = Math.abs(px - w / 2) / (w / 2);
      if (edge < 0.45 && p % 3) continue;
      ctx.save(); ctx.translate(px, py); ctx.rotate(p * 1.7);
      ctx.fillStyle = MARI[p % 4];
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });
}

export function ceilingPicture() {
  return canvasTex('cal_ceiling', 464, 640, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#ff9a6a'); g.addColorStop(0.5, '#8fcdf0'); g.addColorStop(1, '#ff9a6a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (var s = 0; s < 36; s++) { ctx.beginPath(); ctx.arc((s * 131) % w, (s * 97) % h, 2 + (s % 3), 0, Math.PI * 2); ctx.fill(); }
    // diagonal strings of papel picado across the sky
    ctx.save();
    ctx.translate(0, h * 0.28); ctx.rotate(0.12);
    papelString(ctx, -20, w + 20, 0, 24, 38, 50, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(0, h * 0.78); ctx.rotate(-0.12);
    papelString(ctx, -20, w + 20, 0, 24, 38, 50, 3);
    ctx.restore();
  });
}

/** A row of papel picado flags to hang across the street (transparent between them). 10.4 x 2 units. */
export function bannerPicture(i) {
  return canvasTex('cal_banner' + i, 1280, 256, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    papelString(ctx, 6, w - 6, 12, 10, 112, 196, i * 2);
  });
}

/** A standing painted cut-out of a calavera (transparent around it). */
export function standee(name, w, h, paint) {
  return canvasTex('cal_standee_' + name, w, h, function (ctx, cw, ch) { ctx.clearRect(0, 0, cw, ch); paint(ctx, cw, ch); });
}

export function djStandee() {
  return standee('dj', 320, 420, function (ctx, w, h) {
    calavera(ctx, w / 2, h - 6, 400, { suit: '#27c3bd', suit2: '#ff7a5c', trim: '#ffe14a', hat: 'phones', tool: 'decks', hue: 1 });
    marigold(ctx, w / 2 - 36, 60, 14); marigold(ctx, w / 2 + 22, 54, 14);
  });
}

export function mariachiStandee(n) {
  var specs = [
    { suit: '#2a3d8f', suit2: '#2a3d8f', trim: '#ffe14a', hat: 'sombrero', hatColor: '#ff5f93', tool: 'guitar', hue: 0 },
    { suit: '#d9432c', suit2: '#2a1738', trim: '#fff4dc', hat: 'sombrero', hatColor: '#2a1738', tool: 'trumpet', hue: 2 },
    { suit: '#27c3bd', suit2: '#2a1738', trim: '#ff5f93', hat: 'crown', tool: 'maracas', hue: 3 },
    { suit: '#ffb52e', suit2: '#2a1738', trim: '#d9432c', hat: 'sombrero', hatColor: '#27c3bd', tool: 'violin', hue: 1 }
  ];
  return standee('mariachi' + n, 300, 420, function (ctx, w, h) { calavera(ctx, w / 2, h - 6, 396, specs[n]); });
}

export function catrinaStandee() {
  return standee('catrina', 300, 420, function (ctx, w, h) {
    // La Catrina: a skull in a wide flowered hat and a ruffled dress
    var cx = w / 2;
    ctx.fillStyle = '#ff5f93'; ctx.strokeStyle = '#2a1738'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - 40, h - 250); ctx.lineTo(cx - 118, h - 8); ctx.lineTo(cx + 118, h - 8); ctx.lineTo(cx + 40, h - 250); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (var r = 0; r < 4; r++) { ctx.fillStyle = r % 2 ? '#ffb52e' : '#27c3bd'; ctx.beginPath(); ctx.ellipse(cx, h - 40 - r * 52, 118 - r * 22, 14, 0, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = '#fff4dc'; ctx.fillRect(cx - 14, h - 250, 28, 30);
    sugarSkull(ctx, cx, h - 305, 62, 0);
    ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.ellipse(cx, h - 360, 128, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5f93'; ctx.beginPath(); ctx.ellipse(cx, h - 372, 62, 40, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    for (var m = 0; m < 5; m++) marigold(ctx, cx - 88 + m * 44, h - 370 + (m % 2) * 8, 15);
  });
}
