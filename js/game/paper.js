/**
 * paper.js — the "Paper Passport" look of the 3D world (docs/DESIGN.md).
 *
 * Everything in the run is printed rather than lit: flat colour bands (a three-step toon ramp), warm paper and navy
 * ink instead of black and glow, a thin ink outline around the things you have to read (runner, gates, coins,
 * obstacles), and stamp colours for anything that carries meaning. This file holds
 *
 *  - PALETTE: the design tokens as hex numbers (the same values the 2D CSS uses)
 *  - paperize(hex): pulls any colour toward that palette (no violet, no pure black, a little less saturation)
 *  - toonRamp / toonMaterial: the shared gradient ramp and a cached cel-shaded material
 *  - inkMaterial / addInkHull: the outline, drawn as an inflated back-face copy (cheap, works on every quality tier)
 *  - paperizeMaterials(root): converts a built scene graph to the toon look in one pass
 */

import * as THREE from 'three';

export var PALETTE = {
  paper: 0xf6eedc,
  paperDeep: 0xebddbf,
  card: 0xfffbf2,
  ink: 0x1b2a41,
  inkSoft: 0x4b5870,
  inkFaint: 0x8a93a3,
  red: 0xd9432c,
  teal: 0x0e8c8a,
  marigold: 0xf2b134,
  sky: 0x5da9d6,
  leaf: 0x2e9e5b,
  plum: 0x7b3f6e,
  brass: 0xd9a63a,
  brassDark: 0x8a5f1c
};

/** The three answer lanes: left stamp red, centre marigold, right teal. */
export var LANE_COLORS = [PALETTE.red, PALETTE.marigold, PALETTE.teal];

var _c = new THREE.Color();
var _hsl = { h: 0, s: 0, l: 0 };
var _paper = new THREE.Color(PALETTE.paper);
var _ink = new THREE.Color(PALETTE.ink);

/**
 * Pull a colour toward the paper palette. Violets and magentas turn to ink blue and stamp red (nothing in the game
 * is purple by default), saturation drops a little, very light colours warm toward paper, very dark ones toward navy ink.
 * @param {number} hex
 * @returns {number} hex
 */
export function paperize(hex) {
  _c.setHex(hex);
  _c.getHSL(_hsl, THREE.SRGBColorSpace);
  var h = _hsl.h, s = _hsl.s, l = _hsl.l;
  if (s > 0.12 && l > 0.06) {
    // 0.66..0.80 (blue-violet and violet) -> ink blue, 0.80..0.94 (magenta/pink) -> warm coral
    if (h >= 0.66 && h < 0.80) h = 0.58 + (h - 0.66) * 0.3;
    else if (h >= 0.80 && h <= 0.94) h = 0.015 + (h - 0.80) * 0.1;
  }
  s = Math.min(s, 0.7); // (a ceiling, not a multiplier: running a colour through twice changes nothing more)
  _c.setHSL(h, s, l, THREE.SRGBColorSpace);
  if (l > 0.88) _c.lerp(_paper, 0.25);
  else if (l < 0.14) _c.lerp(_ink, 0.5);
  else _c.lerp(_paper, 0.06); // a breath of paper over everything, like ink printed on stock
  return _c.getHex();
}

// ===== TOON RAMP =====

var _ramp = null;

/** A 4-step gradient map: shadow, mid, light, highlight. Nearest filtering gives hard bands. */
export function toonRamp() {
  if (_ramp) return _ramp;
  var data = new Uint8Array([120, 120, 120, 255, 175, 175, 175, 255, 225, 225, 225, 255, 255, 255, 255, 255]);
  _ramp = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  _ramp.minFilter = THREE.NearestFilter;
  _ramp.magFilter = THREE.NearestFilter;
  _ramp.generateMipmaps = false;
  _ramp.needsUpdate = true;
  _ramp.userData.shared = true;
  return _ramp;
}

var _toon = {};

/**
 * A cached cel-shaded material.
 * @param {number} color hex (used as given; call paperize first if it should be pulled toward the palette)
 * @param {{op?: number, side?: number, map?: THREE.Texture, emissive?: number, ei?: number, fog?: boolean, vertexColors?: boolean}} [o]
 */
export function toonMaterial(color, o) {
  o = o || {};
  var key = [color, o.op, o.side, o.map && o.map.uuid, o.emissive, o.ei, o.fog, o.vertexColors ? 1 : 0].join('|');
  var m = _toon[key];
  if (!m) {
    m = _toon[key] = new THREE.MeshToonMaterial({
      color: color,
      gradientMap: toonRamp(),
      map: o.map || null,
      side: o.side === undefined ? THREE.FrontSide : o.side,
      transparent: o.op !== undefined && o.op < 1,
      opacity: o.op === undefined ? 1 : o.op,
      emissive: o.emissive || 0x000000,
      emissiveIntensity: o.ei || 0,
      fog: o.fog !== false,
      vertexColors: !!o.vertexColors
    });
    if (m.transparent) m.depthWrite = false;
    m.userData.shared = true;
  }
  return m;
}

/** An uncached toon material that its owner may change freely (fade, recolour) and dispose. */
export function newToon(color, o) {
  o = o || {};
  return new THREE.MeshToonMaterial({
    color: color, gradientMap: toonRamp(), side: o.side === undefined ? THREE.FrontSide : o.side,
    transparent: !!o.transparent, opacity: o.op === undefined ? 1 : o.op
  });
}

// ===== INK OUTLINE =====

var _ink_mats = {};

/**
 * The outline material: flat navy ink, back faces only, pushed out along the normal in the vertex shader so a mesh
 * drawn with it is a thin silhouette behind the real one. `width` is in the mesh's own units.
 */
export function inkMaterial(width, color, skinned) {
  var key = (width || 0.03).toFixed(4) + '|' + (color === undefined ? PALETTE.ink : color) + '|' + (skinned ? 's' : 'r');
  var m = _ink_mats[key];
  if (m) return m;
  var w = width || 0.03;
  m = new THREE.MeshBasicMaterial({ color: color === undefined ? PALETTE.ink : color, side: THREE.BackSide, fog: false });
  var normalName = skinned ? 'objectNormal' : 'normal'; // (a skinned mesh's normal is already posed by the skinning chunk)
  m.onBeforeCompile = function (shader) {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      'transformed += normalize(' + normalName + ') * ' + w.toFixed(5) + ';\n#include <project_vertex>'
    );
  };
  m.customProgramCacheKey = function () { return 'ink' + w.toFixed(5) + normalName; };
  m.userData.shared = true;
  _ink_mats[key] = m;
  return m;
}

/**
 * Give a mesh an ink outline (a hull sharing its geometry). Smooth-shaded curved meshes inflate evenly; hard-edged
 * boxes also work because their corners are pushed along each face normal and stay joined by the back faces.
 * @returns {THREE.Mesh|null} the hull
 */
export function addInkHull(mesh, width, color) {
  if (!mesh || !mesh.geometry) return null;
  var hull = new THREE.Mesh(mesh.geometry, inkMaterial(width, color, false));
  hull.userData.inkHull = true;
  hull.userData.noMerge = false;
  hull.renderOrder = mesh.renderOrder;
  mesh.add(hull);
  return hull;
}

/** An outline for a flat-faced box: a slightly bigger navy box seen from the inside. Cheaper and cleaner than normal inflation. */
export function inkBox(w, h, d, t, color) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * t, h + 2 * t, d + 2 * t), new THREE.MeshBasicMaterial({ color: color === undefined ? PALETTE.ink : color, side: THREE.BackSide, fog: false }));
  m.userData.inkHull = true;
  return m;
}

/**
 * Outline every solid mesh under `root` (not see-through ones, flat planes, instanced or skinned meshes, or anything under a
 * node marked userData.noOutline). Used for the things you have to read at a glance: obstacles, pickups.
 */
export function outlineGroup(root, width) {
  var list = [];
  (function walk(o) {
    if (o.userData && (o.userData.noOutline || o.userData.inkHull)) return;
    if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && o.geometry && o.material && !Array.isArray(o.material)) {
      var t = o.geometry.type;
      var m = o.material;
      if (t !== 'PlaneGeometry' && t !== 'CircleGeometry' && t !== 'RingGeometry' && t !== 'ShapeGeometry' && !m.transparent && !m.isMeshBasicMaterial && m.side !== THREE.DoubleSide) list.push(o);
    }
    for (var i = 0; i < o.children.length; i++) walk(o.children[i]);
  })(root);
  list.forEach(function (o) { addInkHull(o, width || 0.03); });
  return list.length;
}

// ===== SCENE CONVERSION =====

function isGlowMaterial(m) {
  return m.blending === THREE.AdditiveBlending;
}

function toonFrom(m, keepColors) {
  // Keep the map, the vertex colours, the opacity and the sidedness; take the (paperized) colour
  var t = new THREE.MeshToonMaterial({
    color: keepColors ? (m.color ? m.color.getHex() : 0xffffff) : paperize(m.color ? m.color.getHex() : 0xffffff),
    gradientMap: toonRamp(),
    map: m.map || null,
    side: m.side,
    transparent: m.transparent,
    opacity: m.opacity,
    alphaTest: m.alphaTest || 0,
    vertexColors: !!m.vertexColors,
    fog: m.fog !== false,
    depthWrite: m.depthWrite
  });
  t.name = m.name;
  // Emissive paint stays, but as a gentle tint rather than a lamp
  if (m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) {
    t.emissive.set(paperize(m.emissive.getHex()));
    t.emissiveIntensity = Math.min(0.18, m.emissiveIntensity * 0.25);
  }
  t.userData.shared = true;
  return t;
}

/** Recolour the vertex-colour attribute of a geometry once (the map kits bake colours into their shapes). */
function paperizeVertexColors(geo) {
  if (!geo || geo.userData.paperized) return;
  var attr = geo.attributes && geo.attributes.color;
  geo.userData.paperized = true;
  if (!attr || attr.itemSize < 3) return;
  var cache = {};
  for (var i = 0; i < attr.count; i++) {
    _c.setRGB(attr.getX(i), attr.getY(i), attr.getZ(i), THREE.LinearSRGBColorSpace);
    var hex = _c.getHex(THREE.SRGBColorSpace);
    var out = cache[hex];
    if (out === undefined) { out = cache[hex] = paperize(hex); }
    _c.setHex(out, THREE.SRGBColorSpace);
    attr.setXYZ(i, _c.r, _c.g, _c.b);
  }
  attr.needsUpdate = true;
}

/**
 * Convert everything under `root` to the printed look: lit PBR, Lambert and plain opaque basic materials become toon
 * materials with paperized colours; additive glow becomes a flat translucent shape; see-through and map-only
 * materials keep their look but lose the neon. Characters' skinned meshes are handled in charactermodel.js.
 * Safe to call more than once (converted materials are skipped).
 * @param {THREE.Object3D} root
 * @param {{keepBasic?: boolean, keepColors?: boolean}} [opts] keepBasic: leave plain MeshBasicMaterial alone (UI-like meshes);
 *   keepColors: shade flat but do not move the colours (characters keep the exact colours their owners picked)
 */
var _converted = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

export function paperizeMaterials(root, opts) {
  opts = opts || {};
  var cache = {};
  root.traverse(function (o) {
    if (o.isInstancedMesh && o.instanceColor && !o.userData.instancePaper) {
      // (balloons, bulbs and fish are drawn in bulk, each with its own colour)
      o.userData.instancePaper = true;
      var ic = o.instanceColor;
      for (var k = 0; k < ic.count; k++) {
        _c.setRGB(ic.getX(k), ic.getY(k), ic.getZ(k), THREE.LinearSRGBColorSpace);
        _c.setHex(paperize(_c.getHex(THREE.SRGBColorSpace)), THREE.SRGBColorSpace);
        ic.setXYZ(k, _c.r, _c.g, _c.b);
      }
      ic.needsUpdate = true;
    }
    if (!o.material || o.userData.inkHull) return;
    var many = Array.isArray(o.material);
    var list = many ? o.material : [o.material];
    var out = list.map(function (m) {
      if (!m || m.userData.paper || m.isMeshToonMaterial || m.isShaderMaterial || m.isPointsMaterial || m.isSpriteMaterial) return m;
      if (m.userData && m.userData.keepLook) return m;
      var next = cache[m.uuid] || (_converted && _converted.get(m));
      if (next) return next;
      if (m.isMeshBasicMaterial) {
        if (m.wireframe) return m;
        if (isGlowMaterial(m)) {
          // A glow halo becomes a flat, faint, normally-blended shape
          var flat = m.clone();
          flat.blending = THREE.NormalBlending;
          flat.opacity = Math.min(flat.opacity, 0.35);
          flat.transparent = true;
          flat.color.setHex(paperize(flat.color.getHex()));
          flat.userData.paper = true;
          flat.userData.shared = true;
          cache[m.uuid] = flat;
          return flat;
        }
        // Unlit paint (signs, lamps, ground markings) stays unlit; only the colour moves toward the palette
        if (m.map || opts.keepBasic) { m.userData.paper = true; return m; }
        var basic = m.clone();
        basic.color.setHex(paperize(basic.color.getHex()));
        basic.userData.paper = true;
        basic.userData.shared = true;
        cache[m.uuid] = basic;
        return basic;
      }
      if (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial) {
        var tm = toonFrom(m, opts.keepColors);
        tm.userData.paper = true;
        cache[m.uuid] = tm;
        return tm;
      }
      return m;
    });
    list.forEach(function (orig, i) { if (_converted && orig && out[i] !== orig) _converted.set(orig, out[i]); });
    if (many) o.material = out; else o.material = out[0];
    if (o.geometry && o.material && !many && o.material.vertexColors) paperizeVertexColors(o.geometry);
  });
}

/** Convenience: paper-tone a THREE.Color in place. */
export function paperizeColor(color) {
  color.setHex(paperize(color.getHex()));
  return color;
}

/**
 * Move every pixel of a painted canvas onto the paper palette (the map kits paint their signs, stripes and tiles with
 * colours picked for the old neon look). Same rules as paperize(); a no-op where the canvas cannot be read.
 */
export function paperizeCanvas(ctx, w, h) {
  var img;
  try { img = ctx.getImageData(0, 0, w, h); } catch (e) { return; }
  var d = img.data;
  var cache = new Map();
  for (var i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    var key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    var out = cache.get(key);
    if (out === undefined) { out = paperize(key); cache.set(key, out); }
    d[i] = (out >> 16) & 255;
    d[i + 1] = (out >> 8) & 255;
    d[i + 2] = out & 255;
  }
  ctx.putImageData(img, 0, 0);
}
