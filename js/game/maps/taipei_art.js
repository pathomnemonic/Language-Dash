/**
 * taipei_art.js — the painter's box for the Taipei Bubble Tea Plaza: pastel shopfronts with vertical neon signs, a
 * Taipei 101 skyline, paper lanterns, bubble-tea cups, fruit slices and the pictures (wall, floor, ceiling, lantern
 * banners) built from them. The lettering is real Traditional Chinese, as used in Taiwan.
 */

import { canvasTex } from '../mapkit.js';

var CJK = '"Noto Sans TC","PingFang TC","Microsoft JhengHei","Heiti TC","WenQuanYi Zen Hei","Noto Sans CJK TC",sans-serif';
var INK = '#3a2540';
var PASTEL = ['#ff9ec4', '#7fe3cf', '#ffe27a', '#9bd3ff', '#ffb98a', '#b6ee8a'];
export var NEON = ['#ff6fa8', '#2fd9c6', '#ffd23f', '#5bb8ff'];

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

/** Lettering with a neon glow: a coloured tube with a white core. */
export function neonText(ctx, text, x, y, size, color, font) {
  ctx.save();
  ctx.font = '900 ' + size + 'px ' + (font || CJK);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.35;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.2;
  ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function label(ctx, text, x, y, size, color, font) {
  ctx.font = '900 ' + size + 'px ' + (font || CJK);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** A round paper lantern with ribs, a gold cap and a tassel. */
export function lantern(ctx, x, y, r, color, text) {
  ctx.strokeStyle = '#d99a2b'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y - r * 1.55); ctx.lineTo(x, y - r * 1.05); ctx.stroke();
  ctx.fillStyle = '#e8a93a'; rr(ctx, x - r * 0.38, y - r * 1.12, r * 0.76, r * 0.2, 3); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r * 1.0, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x, y, r * 0.95 * Math.abs(i) / 2.4 + 0.1, r * 1.0, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.2, r * 0.3, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8a93a'; rr(ctx, x - r * 0.38, y + r * 0.92, r * 0.76, r * 0.18, 3); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
  for (var t = -1; t <= 1; t++) { ctx.beginPath(); ctx.moveTo(x + t * r * 0.2, y + r * 1.1); ctx.lineTo(x + t * r * 0.28, y + r * 1.6); ctx.stroke(); }
  if (text) { disc(ctx, x, y, r * 0.62, '#fff6e0'); label(ctx, text, x, y + 1, text.length > 2 ? r * 0.42 : r * 0.62, '#c9402c'); }
}

/** A string of lanterns along a sagging cord. */
export function lanternString(ctx, x0, x1, y, sag, r, colors, texts) {
  ctx.strokeStyle = '#7a5a4a'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i <= 20; i++) { var t = i / 20; var py = y + Math.sin(t * Math.PI) * sag; if (i === 0) ctx.moveTo(x0, py); else ctx.lineTo(x0 + (x1 - x0) * t, py); }
  ctx.stroke();
  var n = Math.max(2, Math.round((x1 - x0) / (r * 2.3)));
  for (var j = 0; j < n; j++) {
    var u = (j + 0.5) / n;
    lantern(ctx, x0 + (x1 - x0) * u, y + Math.sin(u * Math.PI) * sag + r * 1.6, r, colors[j % colors.length], texts && texts[j % texts.length]);
  }
}

/** Taipei 101: stacked, flared green-blue segments and a spire. */
function taipei101(ctx, cx, base, h) {
  var segs = 8;
  var sh = h / (segs + 1.4);
  for (var i = 0; i < segs; i++) {
    var y = base - (i + 1) * sh - (i > 0 ? 0 : 0);
    var w = 54 - i * 1.2 + (i % 2 ? 0 : 0);
    ctx.fillStyle = i % 2 ? '#5fc7c0' : '#7edcd2';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.8, y + sh); ctx.lineTo(cx - w, y + sh * 0.05); ctx.lineTo(cx + w, y + sh * 0.05); ctx.lineTo(cx + w * 0.8, y + sh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (var c = -2; c <= 2; c++) ctx.fillRect(cx + c * w * 0.3 - 3, y + sh * 0.3, 6, sh * 0.4);
  }
  var top = base - segs * sh;
  ctx.fillStyle = '#7edcd2'; ctx.fillRect(cx - 24, top - sh * 0.9, 48, sh * 0.9); ctx.strokeRect(cx - 24, top - sh * 0.9, 48, sh * 0.9);
  ctx.fillStyle = '#5fc7c0'; ctx.fillRect(cx - 14, top - sh * 1.4, 28, sh * 0.5); ctx.strokeRect(cx - 14, top - sh * 1.4, 28, sh * 0.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, top - sh * 1.4); ctx.lineTo(cx, top - sh * 2.4); ctx.stroke();
}

/** A speech bubble with a greeting and its reading underneath. */
export function bubble(ctx, text, sub, x, y, w, h, fill, tail) {
  ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  rr(ctx, x, y, w, h, h * 0.4); ctx.fill(); ctx.stroke();
  var tx = x + w * (tail === 'r' ? 0.74 : 0.26);
  ctx.beginPath(); ctx.moveTo(tx - 10, y + h - 1); ctx.lineTo(tx + (tail === 'r' ? 8 : -8), y + h + 18); ctx.lineTo(tx + 12, y + h - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fill; ctx.fillRect(tx - 8, y + h - 5, 18, 7);
  label(ctx, text, x + w / 2, y + h * 0.4, h * 0.46, INK);
  label(ctx, sub, x + w / 2, y + h * 0.77, h * 0.22, '#7a5a85', '700 "Trebuchet MS", Arial, sans-serif');
}

function awning(ctx, x, y, w, c1, c2) {
  var n = 8;
  for (var s = 0; s < n; s++) {
    ctx.fillStyle = s % 2 ? c2 : c1;
    var x0 = x + s * (w / n);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w / n, y); ctx.lineTo(x0 + w / n, y + 40); ctx.arc(x0 + w / n / 2, y + 40, w / n / 2, 0, Math.PI); ctx.lineTo(x0, y + 40); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x, y - 3, w, 4);
}

/** A bubble-tea cup drawn in the picture, for painted signs. */
export function cupPicture(ctx, x, y, w, h, flavor) {
  var f = FLAVORS[flavor % FLAVORS.length];
  ctx.fillStyle = '#fff6ea'; rr(ctx, x - 4, y, w + 8, h * 0.12, 8); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = f.tea;
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.12); ctx.lineTo(x + w, y + h * 0.12); ctx.lineTo(x + w * 0.82, y + h); ctx.lineTo(x + w * 0.18, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4a3024';
  for (var i = 0; i < 10; i++) disc(ctx, x + w * (0.28 + (i % 5) * 0.11), y + h * (0.86 - Math.floor(i / 5) * 0.08), w * 0.05, '#4a3024');
  ctx.strokeStyle = f.straw; ctx.lineWidth = w * 0.08; ctx.beginPath(); ctx.moveTo(x + w * 0.6, y + h * 0.1); ctx.lineTo(x + w * 0.74, y - h * 0.32); ctx.stroke();
}

var FLAVORS = [
  { tea: '#d9a877', straw: '#ff6fa0', name: '珍珠奶茶' },
  { tea: '#a7d77a', straw: '#ffd23f', name: '抹茶' },
  { tea: '#ff9fbd', straw: '#2fd9c6', name: '草莓' },
  { tea: '#ffcf4a', straw: '#ff8a5a', name: '芒果' }
];

/** A texture that wraps round a cup (a cylinder): milk tea, ice, pearls at the bottom and a label on the front. */
export function cupTex(flavor) {
  var f = FLAVORS[flavor % FLAVORS.length];
  return canvasTex('tpe_cup' + flavor, 256, 512, function (ctx, w, h) {
    ctx.fillStyle = '#fff6ea'; ctx.fillRect(0, 0, w, h);
    // the film seal on top
    ctx.fillStyle = f.straw; ctx.fillRect(0, 0, w, h * 0.07);
    var g = ctx.createLinearGradient(0, h * 0.07, 0, h * 0.8);
    g.addColorStop(0, '#fff2e0'); g.addColorStop(0.18, f.tea); g.addColorStop(1, f.tea);
    ctx.fillStyle = g; ctx.fillRect(0, h * 0.07, w, h * 0.73);
    // ice cubes
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (var i = 0; i < 9; i++) { var cx = ((i * 71) % w); var cy = h * 0.2 + (i * 47) % (h * 0.38); [0, w].forEach(function (o) { rr(ctx, cx - 18 + o, cy, 36, 36, 8); ctx.fill(); }); }
    // tapioca pearls
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 12; c++) {
        var px = (c + (r % 2) * 0.5) * (w / 11);
        var py = h * (0.9 - r * 0.045);
        disc(ctx, px, py, 14, '#4a3024'); disc(ctx, px - 4, py - 5, 4, 'rgba(255,255,255,0.7)');
      }
    }
    ctx.fillStyle = '#4a3024'; ctx.fillRect(0, h * 0.96, w, h * 0.04);
    // the label sits on the front, which is the middle of the picture (the cup is turned so u = 0.5 faces the street)
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    rr(ctx, w / 2 - 86, h * 0.32, 172, h * 0.2, 18); ctx.fill(); ctx.stroke();
    label(ctx, f.name, w / 2, h * 0.405, f.name.length > 3 ? 42 : 52, INK);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(w * 0.12, h * 0.1, 12, h * 0.62);
  });
}

/** A heap of tapioca pearls, painted, standing on the ground. */
export function pearlHeap(w, h) {
  return canvasTex('tpe_pearls', w, h, function (ctx, cw, ch) {
    ctx.clearRect(0, 0, cw, ch);
    var rows = 6;
    for (var r = 0; r < rows; r++) {
      var n = rows - r + 1;
      for (var c = 0; c < n; c++) {
        var rad = cw / (rows * 2.5);
        var px = cw / 2 + (c - (n - 1) / 2) * rad * 2;
        var py = ch - rad - r * rad * 1.7;
        disc(ctx, px, py, rad, '#4a3024'); ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 2; ctx.stroke();
        disc(ctx, px - rad * 0.3, py - rad * 0.35, rad * 0.28, 'rgba(255,255,255,0.7)');
      }
    }
  });
}

/** A round slice of fruit on a plate-sized picture. */
export function fruitSlice(kind) {
  var spec = [['#ff9a1f', '#ffc86a', 10], ['#ffe14a', '#fff3a0', 9], ['#7cc84a', '#c9f08a', 0], ['#ff5f7a', '#ffc2cf', 0]][kind % 4];
  return canvasTex('tpe_fruit' + kind, 128, 128, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    disc(ctx, w / 2, h / 2, 60, spec[0]); disc(ctx, w / 2, h / 2, 52, spec[1]);
    ctx.strokeStyle = spec[0]; ctx.lineWidth = 3;
    if (kind % 4 < 2) { for (var i = 0; i < 10; i++) { var a = (i / 10) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 + Math.cos(a) * 52, h / 2 + Math.sin(a) * 52); ctx.stroke(); } }
    else if (kind % 4 === 2) { disc(ctx, w / 2, h / 2, 14, '#f4fbe0'); ctx.fillStyle = '#2a4a20'; for (var s = 0; s < 14; s++) { var b = (s / 14) * Math.PI * 2; ctx.beginPath(); ctx.arc(w / 2 + Math.cos(b) * 28, h / 2 + Math.sin(b) * 28, 3, 0, Math.PI * 2); ctx.fill(); } }
    else { disc(ctx, w / 2, h / 2, 34, '#ff8aa0'); for (var q = 0; q < 8; q++) { var d = (q / 8) * Math.PI * 2; disc(ctx, w / 2 + Math.cos(d) * 24, h / 2 + Math.sin(d) * 24, 3, '#fff3a0'); } }
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2); ctx.stroke();
  });
}

// ---------- painted shopfronts ----------

function shop(ctx, x, w, h, base, color, trim, o) {
  o = o || {};
  var top = base - h;
  ctx.fillStyle = color; ctx.fillRect(x, top, w, h);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x, top, w, h);
  // roof edge, water tank and aerials
  ctx.fillStyle = trim; ctx.fillRect(x - 4, top - 12, w + 8, 14); ctx.strokeRect(x - 4, top - 12, w + 8, 14);
  if (o.tank) { ctx.fillStyle = '#d6e6ee'; ctx.fillRect(x + w * 0.2, top - 56, 36, 44); ctx.strokeRect(x + w * 0.2, top - 56, 36, 44); }
  // upper windows with air conditioners and plants
  var storeys = Math.max(0, Math.round((h - 150) / 120));
  for (var s = 0; s < storeys; s++) {
    for (var c = 0; c < 2; c++) {
      var wx = x + w * (0.2 + c * 0.45);
      var wy = top + 22 + s * 112;
      ctx.fillStyle = '#fff6c8'; rr(ctx, wx, wy, 44, 62, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(wx + 4, wy + 4, 14, 54);
      ctx.fillStyle = '#f2f6f8'; rr(ctx, wx + 6, wy + 66, 32, 16, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4cb85a'; ctx.beginPath(); ctx.arc(wx + 8, wy + 62, 6, 0, Math.PI * 2); ctx.arc(wx + 36, wy + 62, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  // shop front: awning, window and a counter
  var fy = base - 150;
  awning(ctx, x + 4, fy, w - 8, o.a1 || '#ff8fb8', '#ffffff');
  ctx.fillStyle = '#fff1c8'; rr(ctx, x + 14, fy + 54, w - 28, 80, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = trim; ctx.fillRect(x + 8, base - 22, w - 16, 22); ctx.strokeRect(x + 8, base - 22, w - 16, 22);
  // the vertical sign blade
  if (o.blade) {
    var bx = x + w - 34;
    ctx.fillStyle = '#fff6d8'; rr(ctx, bx - 20, top + 40, 40, 36 * o.blade.length + 12, 8); ctx.fill(); ctx.stroke();
    for (var i = 0; i < o.blade.length; i++) label(ctx, o.blade[i], bx, top + 66 + i * 36, 30, o.bladeColor || '#d9432c');
  }
}

function paintBay(ctx, k, cx) {
  var base = WALL_H - 6;
  var x0 = cx - 256;
  if (k === 0) {
    taipei101(ctx, cx - 40, base - 300, 560);
    shop(ctx, x0 - 6, 150, 360, base, '#ffd0e0', '#ffe27a', { blade: '珍珠', a1: '#ff8fb8', tank: true });
    shop(ctx, x0 + 370, 150, 330, base, '#b8f0e0', '#ffb98a', { blade: '奶茶', a1: '#2fd9c6' });
    neonText(ctx, '夜市', x0 + 440, base - 420, 48, NEON[0]);
  } else if (k === 1) {
    shop(ctx, x0 - 6, 210, 300, base, '#ffe9a0', '#ff9ec4', { a1: '#ffb347' });
    shop(ctx, x0 + 300, 220, 340, base, '#c9ecff', '#ffe27a', { blade: '好玩', a1: '#5bb8ff', tank: true });
    ctx.fillStyle = '#ff9ec4'; ctx.beginPath(); ctx.arc(x0 + 262, base - 330, 40, 0, Math.PI * 2); ctx.fill();
    bubble(ctx, '你好!', 'nǐ hǎo', x0 + 200, base - 470, 140, 64, '#ffffff', 'l');
  } else if (k === 2) {
    // the tea shop: a big menu board and a neon cup
    ctx.fillStyle = '#ffd9ea'; ctx.fillRect(x0, base - 380, 512, 380);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x0, base - 380, 512, 380);
    ctx.fillStyle = '#fff6d8'; rr(ctx, cx - 190, base - 330, 380, 200, 14); ctx.fill(); ctx.stroke();
    label(ctx, '珍珠奶茶', cx - 80, base - 290, 40, '#d9432c');
    label(ctx, '半糖少冰', cx - 80, base - 238, 30, INK);
    label(ctx, '加珍珠', cx - 80, base - 192, 30, INK);
    label(ctx, 'bubble tea', cx - 80, base - 152, 22, '#7a5a85', '700 "Trebuchet MS", Arial, sans-serif');
    cupPicture(ctx, cx + 70, base - 320, 80, 170, 0);
    awning(ctx, x0 + 10, base - 440, 492, '#ff8fb8', '#ffffff');
    neonText(ctx, '歡迎光臨', cx, base - 530, 52, NEON[1]);
  } else {
    shop(ctx, x0 - 6, 200, 330, base, '#fff0a8', '#7fe3cf', { blade: '水果', a1: '#ffb347' });
    shop(ctx, x0 + 290, 230, 360, base, '#e0f6c8', '#ff9ec4', { blade: '好喝', a1: '#b6ee8a', tank: true });
    // a neon heart
    ctx.save(); ctx.translate(x0 + 255, base - 440); ctx.shadowColor = NEON[0]; ctx.shadowBlur = 14; ctx.strokeStyle = NEON[0]; ctx.lineWidth = 12; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-60, -10, -30, -50, 0, -18); ctx.bezierCurveTo(30, -50, 60, -10, 0, 30); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  }
  // lanterns across the top of every bay, red, pink and yellow
  lanternString(ctx, x0 + 4, x0 + 252, 120, 18, 22, ['#ff5a5a', '#ff9ec4', '#ffd23f'], k === 2 ? ['福', '', ''] : null);
  lanternString(ctx, x0 + 260, x0 + 508, 120, 18, 22, ['#ffd23f', '#ff5a5a', '#ff9ec4'], k === 0 ? ['', '福', ''] : null);
}

export var WALL_W = 2048;
export var WALL_H = 820;

function skyline(ctx, w, h) {
  var sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#8fe0e0'); sky.addColorStop(0.5, '#c8f2e4'); sky.addColorStop(0.8, '#ffd9e6'); sky.addColorStop(1, '#ffc2d6');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  [[0.1, 0.22], [0.37, 0.14], [0.66, 0.26], [0.9, 0.16]].forEach(function (c) { [[0, 0, 36], [40, 8, 28], [-40, 10, 26], [16, -14, 26]].forEach(function (b) { ctx.beginPath(); ctx.arc(c[0] * w + b[0], c[1] * h + b[1], b[2], 0, Math.PI * 2); ctx.fill(); }); });
  // pastel far buildings
  for (var i = 0; i < 32; i++) {
    ctx.fillStyle = PASTEL[i % 6];
    var bh = 150 + ((i * 53) % 180);
    ctx.globalAlpha = 0.55; ctx.fillRect(i * 64 + 4, h - bh - 60, 54, bh + 60); ctx.globalAlpha = 1;
  }
  // a moon and stars: a night market, but a sweet one
  ctx.fillStyle = '#fff6b8'; ctx.beginPath(); ctx.arc(w * 0.82, 130, 46, 0, Math.PI * 2); ctx.fill();
}

/** The wall of the plaza for one side: bay k is drawn where that side's bay k falls on the picture. */
export function wallPicture(side) {
  return canvasTex('tpe_wall' + side, WALL_W, WALL_H, function (ctx, w, h) {
    skyline(ctx, w, h);
    ctx.fillStyle = '#ffe7a8'; ctx.fillRect(0, h - 8, w, 8);
    for (var k = 0; k < 4; k++) {
      var cx = (side > 0 ? k * 0.25 : ((4 - k) % 4) * 0.25) * w;
      [cx - w, cx, cx + w].forEach(function (c) { if (c > -300 && c < w + 300) paintBay(ctx, k, c); });
    }
    // greetings
    var hello = [['謝謝!', 'xièxie', 0], ['好喝!', 'hǎo hē', 1], ['再見!', 'zàijiàn', 2], ['你好!', 'nǐ hǎo', 3]];
    hello.forEach(function (hh) {
      var cx2 = (side > 0 ? hh[2] * 0.25 : ((4 - hh[2]) % 4) * 0.25) * w;
      [cx2 - w, cx2, cx2 + w].forEach(function (c) { if (c > -300 && c < w + 300 && hh[2] !== 1) bubble(ctx, hh[0], hh[1], c - 220 + hh[2] * 30, 230 + (hh[2] % 2) * 20, 150, 66, '#ffffff', hh[2] % 2 ? 'r' : 'l'); });
    });
  });
}

export function floorPicture() {
  // 12 across, 16 along, 64 pixels to the unit: pastel tiles with a jelly-dot pattern and straw-striped borders
  return canvasTex('tpe_floor', 768, 1024, function (ctx, w, h) {
    var cols = ['#c8f4e2', '#ffd6e6', '#fff0b8', '#cfeaff'];
    for (var j = 0; j < 16; j++) for (var i = 0; i < 12; i++) {
      ctx.fillStyle = cols[(i + j * 2) % 4 === 0 ? 0 : (i + j) % 2 ? 1 : 2];
      ctx.fillStyle = (i + j) % 2 ? '#d9f6ea' : '#fff0f4';
      ctx.fillRect(i * 64, j * 64, 64, 64);
    }
    // big translucent pearls (circles) scattered over the tiles
    var pc = ['#ffb3cd', '#9fe6d3', '#ffe27a', '#b9dcff'];
    for (var p = 0; p < 34; p++) {
      var px = 60 + ((p * 241) % (w - 120));
      var py = (p * 389) % h;
      var rad = 14 + (p % 4) * 6;
      ctx.fillStyle = pc[p % 4]; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.8; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px - rad * 0.3, py - rad * 0.3, rad * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    // straw-striped bands at the edges
    [0, w - 72].forEach(function (bx) {
      for (var s = 0; s < 32; s++) { ctx.fillStyle = s % 2 ? '#ff8fb8' : '#ffffff'; ctx.fillRect(bx, s * 32, 72, 32); }
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(bx + 10, 0, 8, h);
    });
    // thin tile lines
    ctx.strokeStyle = 'rgba(120,170,160,0.28)'; ctx.lineWidth = 2;
    for (var g = 0; g <= 12; g++) { ctx.beginPath(); ctx.moveTo(g * 64, 0); ctx.lineTo(g * 64, h); ctx.stroke(); }
    for (var g2 = 0; g2 <= 16; g2++) { ctx.beginPath(); ctx.moveTo(0, g2 * 64); ctx.lineTo(w, g2 * 64); ctx.stroke(); }
  });
}

export function ceilingPicture() {
  return canvasTex('tpe_ceiling', 464, 640, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#ffc2d6'); g.addColorStop(0.5, '#a8ecde'); g.addColorStop(1, '#ffc2d6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (var s = 0; s < 30; s++) { ctx.beginPath(); ctx.arc((s * 151) % w, (s * 103) % h, 2 + (s % 3), 0, Math.PI * 2); ctx.fill(); }
    // strings of lanterns, seen from below
    var cols = ['#ff5a5a', '#ffd23f', '#ff9ec4'];
    for (var r = 0; r < 2; r++) for (var i = 0; i < 6; i++) { disc(ctx, 40 + i * 76 + r * 38, 120 + r * 320, 22, cols[(i + r) % 3]); disc(ctx, 40 + i * 76 + r * 38 - 6, 114 + r * 320, 6, 'rgba(255,255,255,0.6)'); }
  });
}

/** A row of lanterns, some with a greeting, to hang across the street (transparent between). 10.4 x 2.2 units. */
export function bannerPicture(i) {
  var texts = [['你好', '', '謝謝', '', '歡迎'], ['', '福', '', '夜市', ''], ['好喝', '', '加珍珠', '', '']][i % 3];
  return canvasTex('tpe_banner' + i, 1280, 270, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    lanternString(ctx, 6, w - 6, 10, 14, 52, [['#ff5a5a', '#ffd23f', '#ff9ec4', '#7fe3cf', '#ff8fb8'][i % 5], '#ffd23f', '#ff9ec4', '#7fe3cf', '#ff7a8a'], texts.length ? texts : null);
  });
}
