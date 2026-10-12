/**
 * trailshapes.js — the little shapes each trail is made of.
 *
 * Every trail is its own drawing, not a coloured dot: a folded paper plane, a cherry blossom, an ink splat, a
 * perforated postage stamp, a postcard, a snowflake, a firefly, a curling streamer, a speech bubble with a letter in
 * it, a footprint in the sand, a paper sky lantern, a maple leaf. All shapes are flat (or tiny), drawn once and
 * shared, and sized so that their longest side is the same (0.2), so the particle budgets and scales in trails.js
 * stay put.
 *
 * A shape may have variants (the five speech bubbles carry five different letters); getTrailGeometry(shape, n)
 * picks one.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

var SIZE = 0.2; // longest side of every shape

/** Centre a geometry on the origin and scale its longest side to SIZE. */
function normalize(geo) {
  geo.computeBoundingBox();
  var box = geo.boundingBox;
  var c = new THREE.Vector3();
  box.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  var size = new THREE.Vector3();
  box.getSize(size);
  var k = SIZE / Math.max(size.x, size.y, size.z, 1e-6);
  geo.scale(k, k, k);
  return geo;
}

function geoOf(shape) { return new THREE.ShapeGeometry(shape, 10); }

/** A thick line through points, as flat quads in the XY plane. */
function stroke(points, width) {
  var parts = [];
  for (var i = 0; i < points.length - 1; i++) {
    var a = points[i];
    var b = points[i + 1];
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len * width / 2;
    var ny = dx / len * width / 2;
    var shape = new THREE.Shape();
    shape.moveTo(a[0] + nx, a[1] + ny);
    shape.lineTo(b[0] + nx, b[1] + ny);
    shape.lineTo(b[0] - nx, b[1] - ny);
    shape.lineTo(a[0] - nx, a[1] - ny);
    shape.closePath();
    parts.push(new THREE.ShapeGeometry(shape));
  }
  // a round dot at every joint hides the cracks between the quads
  for (var j = 1; j < points.length - 1; j++) parts.push(disc(points[j][0], points[j][1], width / 2));
  return mergeGeometries(parts);
}

function disc(x, y, r, seg) {
  var g = new THREE.CircleGeometry(r, seg || 10);
  g.translate(x, y, 0);
  return g;
}

function ellipse(x, y, rx, ry, rot) {
  var g = new THREE.CircleGeometry(1, 14);
  g.scale(rx, ry, 1);
  if (rot) g.rotateZ(rot);
  g.translate(x, y, 0);
  return g;
}

function rectGeo(x, y, w, h) {
  var g = new THREE.PlaneGeometry(w, h);
  g.translate(x, y, 0);
  return g;
}

// ===== the shapes =====

/** A folded paper plane seen from above: a dart with a centre crease and a notch at the tail. */
function plane() {
  var wing = new THREE.Shape();
  wing.moveTo(0, 1);
  wing.lineTo(-0.85, -0.78);
  wing.lineTo(-0.16, -0.5);
  wing.lineTo(0, -0.78);
  wing.lineTo(0.16, -0.5);
  wing.lineTo(0.85, -0.78);
  wing.closePath();
  var body = new THREE.Shape(); // the keel: a long thin fold down the middle (a second layer, slightly in front)
  body.moveTo(0, 1); body.lineTo(-0.1, -0.5); body.lineTo(0, -0.78); body.lineTo(0.1, -0.5); body.closePath();
  var g2 = geoOf(body);
  g2.translate(0, 0, 0.01);
  return mergeGeometries([geoOf(wing), g2]);
}

/** A cherry blossom: five petals, each with the little notch at the tip. */
function blossom() {
  var parts = [];
  for (var i = 0; i < 5; i++) {
    var p = new THREE.Shape();
    p.moveTo(0, 0);
    p.bezierCurveTo(-0.55, 0.15, -0.5, 0.82, -0.12, 0.98);
    p.lineTo(0, 0.82); // the notch
    p.lineTo(0.12, 0.98);
    p.bezierCurveTo(0.5, 0.82, 0.55, 0.15, 0, 0);
    var g = geoOf(p);
    g.rotateZ(i / 5 * Math.PI * 2);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

/** An ink splat: a blob with ragged edges, a few drips and flying droplets. */
function splat() {
  var s = new THREE.Shape();
  var n = 14;
  var radii = [0.62, 0.95, 0.58, 0.8, 0.5, 1.0, 0.6, 0.72, 0.9, 0.55, 0.78, 0.98, 0.52, 0.7];
  for (var i = 0; i < n; i++) {
    var a = i / n * Math.PI * 2;
    var r = radii[i];
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  var parts = [geoOf(s)];
  parts.push(disc(-1.18, 0.62, 0.17), disc(1.08, -0.5, 0.2), disc(0.35, 1.2, 0.12), disc(-0.5, -1.12, 0.14), disc(1.3, 0.45, 0.1));
  return mergeGeometries(parts);
}

/** A postage stamp: a perforated edge round a framed window with a little star in it. */
function stamp() {
  var w = 1, h = 1.25;
  var s = new THREE.Shape();
  // scalloped outline: a rectangle whose edge is a run of half-circle bites
  var bite = 0.09;
  var stepsX = 6, stepsY = 8;
  function edge(x0, y0, x1, y1, steps, first) {
    for (var i = 0; i < steps; i++) {
      var t0 = i / steps, t1 = (i + 1) / steps;
      var ax = x0 + (x1 - x0) * t0, ay = y0 + (y1 - y0) * t0;
      var bx = x0 + (x1 - x0) * t1, by = y0 + (y1 - y0) * t1;
      var mx = (ax + bx) / 2, my = (ay + by) / 2;
      var nx = (y1 - y0), ny = -(x1 - x0);
      var nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      if (first && i === 0) s.moveTo(ax, ay); else s.lineTo(ax, ay);
      // a bite into the stamp (towards the inside)
      s.lineTo(mx - nx * 0, my - ny * 0);
      s.quadraticCurveTo(mx - nx * bite * 2.2, my - ny * bite * 2.2, bx, by);
    }
  }
  edge(-w / 2, -h / 2, w / 2, -h / 2, stepsX, true);
  edge(w / 2, -h / 2, w / 2, h / 2, stepsY, false);
  edge(w / 2, h / 2, -w / 2, h / 2, stepsX, false);
  edge(-w / 2, h / 2, -w / 2, -h / 2, stepsY, false);
  s.closePath();
  var win = new THREE.Path();
  win.moveTo(-0.34, -0.5); win.lineTo(0.34, -0.5); win.lineTo(0.34, 0.5); win.lineTo(-0.34, 0.5); win.closePath();
  s.holes.push(win);
  // a small five-point star in the window
  var star = new THREE.Shape();
  for (var k = 0; k < 10; k++) {
    var r = k % 2 === 0 ? 0.2 : 0.085;
    var a = k / 10 * Math.PI * 2 + Math.PI / 2;
    if (k === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r); else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  star.closePath();
  return mergeGeometries([geoOf(s), geoOf(star)]);
}

/** A postcard (the back of one): the card with a stamp box, the address lines and the line down the middle. */
function postcard() {
  var s = new THREE.Shape();
  var w = 1.5, h = 1;
  s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
  function hole(x0, y0, x1, y1) {
    var p = new THREE.Path();
    p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.closePath();
    s.holes.push(p);
  }
  hole(0.4, 0.16, 0.64, 0.42); // the stamp box
  hole(0.0 + 0.07, -0.05, 0.62, -0.01); // address lines
  hole(0.07, -0.2, 0.62, -0.16);
  hole(0.07, -0.35, 0.45, -0.31);
  hole(-0.025, -0.4, 0.025, 0.4); // the divider
  return geoOf(s);
}

/** A six-armed snowflake with a pair of little branches on every arm. */
function snowflake() {
  var parts = [];
  for (var i = 0; i < 6; i++) {
    var a = i / 6 * Math.PI * 2;
    var ca = Math.cos(a), sa = Math.sin(a);
    parts.push(stroke([[0, 0], [ca, sa]], 0.17));
    [0.5, 0.78].forEach(function (t) {
      var bx = ca * t, by = sa * t;
      var len = (1 - t) * 0.75 + 0.12;
      [-1, 1].forEach(function (side) {
        var ba = a + side * 0.9;
        parts.push(stroke([[bx, by], [bx + Math.cos(ba) * len, by + Math.sin(ba) * len]], 0.12));
      });
    });
  }
  return mergeGeometries(parts);
}

/** A firefly: a round body, a head and two wings. */
function firefly() {
  return mergeGeometries([
    ellipse(0, -0.2, 0.42, 0.56), // the glowing abdomen
    disc(0, 0.5, 0.22),
    ellipse(-0.7, 0.28, 0.42, 0.2, 0.3),
    ellipse(0.7, 0.28, 0.42, 0.2, -0.3)
  ]);
}

/** A curling party streamer: a long ribbon that loops. */
function streamer() {
  var pts = [];
  for (var i = 0; i <= 18; i++) {
    var t = i / 18;
    pts.push([-1 + t * 2, Math.sin(t * Math.PI * 3.2) * 0.45 * (1 - t * 0.3)]);
  }
  return stroke(pts, 0.22);
}

/** A speech bubble (rounded box with a tail) drawn with its own letter on it: the letters are painted in glyphtexture. */
export var GLYPHS = ['A', 'あ', 'Я', 'ع', '한'];
function speechOutline() {
  var s = new THREE.Shape();
  var w = 0.62, h = 0.46, r = 0.2;
  s.moveTo(-w + r, -h);
  s.lineTo(-0.3, -h);
  s.lineTo(-0.5, -h - 0.34); // the tail
  s.lineTo(0.02, -h);
  s.lineTo(w - r, -h);
  s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r);
  s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r);
  s.lineTo(-w, -h + r);
  s.quadraticCurveTo(-w, -h, -w + r, -h);
  return s;
}
function glyphBubble(i) {
  var g = geoOf(speechOutline());
  // the texture holds the five bubbles side by side: map this one's bounds to its cell
  g.computeBoundingBox();
  var b = g.boundingBox;
  var pos = g.attributes.position;
  var uv = new Float32Array(pos.count * 2);
  for (var k = 0; k < pos.count; k++) {
    uv[k * 2] = (i + (pos.getX(k) - b.min.x) / (b.max.x - b.min.x)) / GLYPHS.length;
    uv[k * 2 + 1] = (pos.getY(k) - b.min.y) / (b.max.y - b.min.y);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** A sole and five toes, flat on the sand (left foot; the trail mirrors every other print). */
function footprint() {
  var parts = [
    ellipse(0, -0.45, 0.34, 0.5), // heel and arch
    ellipse(-0.06, 0.2, 0.42, 0.42), // ball of the foot
    ellipse(-0.36, 0.74, 0.14, 0.17), // toes, big one first
    ellipse(-0.1, 0.9, 0.12, 0.15),
    ellipse(0.12, 0.84, 0.11, 0.14),
    ellipse(0.31, 0.7, 0.1, 0.13),
    ellipse(0.43, 0.5, 0.085, 0.11)
  ];
  var g = mergeGeometries(parts);
  g.rotateX(-Math.PI / 2); // lie on the ground
  return g;
}

/** A paper sky lantern: a rounded paper body with its two ribs and a small flame glowing at the bottom. */
function lantern() {
  var s = new THREE.Shape();
  s.moveTo(-0.38, -0.7);
  s.lineTo(0.38, -0.7);
  s.bezierCurveTo(0.7, -0.2, 0.62, 0.5, 0.22, 0.78);
  s.lineTo(-0.22, 0.78);
  s.bezierCurveTo(-0.62, 0.5, -0.7, -0.2, -0.38, -0.7);
  s.closePath();
  function slit(y) {
    var p = new THREE.Path();
    p.moveTo(-0.5, y); p.lineTo(0.5, y); p.lineTo(0.5, y + 0.05); p.lineTo(-0.5, y + 0.05); p.closePath();
    s.holes.push(p);
  }
  slit(0.22); slit(-0.28);
  var parts = [geoOf(s), disc(0, -0.9, 0.13)]; // the flame
  return mergeGeometries(parts);
}

/** A maple leaf: five pointed lobes, a stalk. */
function maple() {
  var pts = [
    [0, 1], [0.16, 0.62], [0.42, 0.74], [0.36, 0.36], [0.78, 0.4], [0.58, 0.12], [0.86, -0.02], [0.5, -0.18], [0.54, -0.48],
    [0.14, -0.36], [0.06, -0.75], [-0.06, -0.75], [-0.14, -0.36], [-0.54, -0.48], [-0.5, -0.18], [-0.86, -0.02], [-0.58, 0.12],
    [-0.78, 0.4], [-0.36, 0.36], [-0.42, 0.74], [-0.16, 0.62]
  ];
  var s = new THREE.Shape();
  pts.forEach(function (p, i) { if (i === 0) s.moveTo(p[0], p[1]); else s.lineTo(p[0], p[1]); });
  s.closePath();
  return mergeGeometries([geoOf(s), rectGeo(0, -0.92, 0.1, 0.4)]);
}

/** shape name -> how to draw it (one builder, or a list of variants), and the plain words a description can use for it. */
var BUILDERS = {
  plane:     { build: plane,     words: ['paper plane'] },
  blossom:   { build: blossom,   words: ['blossom', 'petal'] },
  splat:     { build: splat,     words: ['ink', 'splat'] },
  stamp:     { build: stamp,     words: ['stamp'] },
  postcard:  { build: postcard,  words: ['postcard'] },
  snowflake: { build: snowflake, words: ['snowflake'] },
  firefly:   { build: firefly,   words: ['firefly', 'fireflies'] },
  streamer:  { build: streamer,  words: ['streamer'] },
  glyph:     { variants: GLYPHS.map(function (g, i) { return function () { return glyphBubble(i); }; }), words: ['speech bubble', 'letter'] },
  footprint: { build: footprint, words: ['footprint', 'footprints'] },
  lantern:   { build: lantern,   words: ['lantern'] },
  maple:     { build: maple,     words: ['maple', 'leaf', 'leaves'] }
};

export var TRAIL_SHAPES = Object.keys(BUILDERS);

/** The words a description may use to name each shape (used by the test that keeps descriptions honest). */
export function shapeWords(shape) {
  return BUILDERS[shape] ? BUILDERS[shape].words.slice() : [];
}

/** How many variants a shape has (1 for most). */
export function shapeVariants(shape) {
  return BUILDERS[shape] && BUILDERS[shape].variants ? BUILDERS[shape].variants.length : 1;
}

var _cache = {};

/** The shared geometry for a shape (built on first use); `variant` picks one of a shape's variants. */
export function getTrailGeometry(shape, variant) {
  if (!BUILDERS[shape]) shape = 'blossom';
  var def = BUILDERS[shape];
  var v = def.variants ? ((variant | 0) % def.variants.length + def.variants.length) % def.variants.length : 0;
  var key = shape + ':' + v;
  if (!_cache[key]) {
    var raw = def.variants ? def.variants[v]() : def.build();
    // a flat footprint lies on the ground: normalise by its widest side but keep it flat
    _cache[key] = normalize(raw);
  }
  return _cache[key];
}

var _glyphTexture;

/**
 * The picture the speech-bubble trail wears: five paper bubbles side by side, an ink outline and a coloured letter
 * (Latin A, Japanese あ, Cyrillic Я, Arabic ع, Korean 한) in each. Null where there is no canvas (tests, servers).
 */
export function getGlyphTexture() {
  if (_glyphTexture !== undefined) return _glyphTexture;
  _glyphTexture = null;
  if (typeof document === 'undefined' || typeof OffscreenCanvas === 'undefined' && !(document.createElement && document.createElement('canvas').getContext)) return _glyphTexture;
  var cell = 128;
  var canvas;
  try { canvas = document.createElement('canvas'); } catch (e) { return _glyphTexture; }
  canvas.width = cell * GLYPHS.length;
  canvas.height = cell;
  var ctx = null;
  try { ctx = canvas.getContext('2d'); } catch (e2) { ctx = null; }
  if (!ctx) return _glyphTexture;
  var inks = ['#d9432c', '#0e8c8a', '#7b3f6e', '#2e9e5b', '#c97a00'];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  GLYPHS.forEach(function (gl, i) {
    // the bubble: the same outline as the geometry (box -0.62..0.62 x -0.46..0.46 plus the tail), scaled into the cell
    var x0 = i * cell, pad = 4;
    var bw = cell - pad * 2;
    var bh = cell - pad * 2;
    function px(x) { return x0 + pad + (x + 0.62) / 1.24 * bw; }
    function py(y) { return pad + (1 - (y + 0.8) / 1.26) * bh; } // (the geometry spans y -0.8..0.46 in its own units)
    ctx.beginPath();
    var o = speechOutline().getPoints(12);
    o.forEach(function (p, k) { if (k === 0) ctx.moveTo(px(p.x), py(p.y)); else ctx.lineTo(px(p.x), py(p.y)); });
    ctx.closePath();
    ctx.fillStyle = '#fffbf2';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1b2a41';
    ctx.stroke();
    ctx.fillStyle = inks[i % inks.length];
    ctx.font = '700 62px "Noto Sans", "Noto Sans JP", "Noto Sans KR", "Noto Naskh Arabic", "Yu Gothic", "Malgun Gothic", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gl, px(0), py(0));
  });
  var tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.shared = true;
  _glyphTexture = tex;
  return tex;
}
