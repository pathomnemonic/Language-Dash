/**
 * asia_kit.js — shared helpers for the four Asian street maps (Kyoto Tea Garden, Tokyo Night Market, Seoul Neon Alley,
 * Shanghai Night Highway): one painted picture holding many signs (so a whole street of signs is ONE draw call), quads
 * that show one cell of such a picture, unlit murals along a wall, paper lanterns, and neon lettering.
 */

import * as THREE from 'three';
import { mat, bulb, canvasTex, css, combine, WALL_X, WORLD_BAY, WORLD_PERIOD } from '../mapkit.js';
import { swarm } from '../mapfx.js';

/** A font stack that finds a Japanese, Korean or Chinese face on every phone and desktop (and falls back gracefully). */
export var CJK = '"Noto Sans JP","Hiragino Sans","Yu Gothic","Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo","PingFang SC","Microsoft YaHei","WenQuanYi Zen Hei","IPAGothic","Arial Rounded MT Bold",sans-serif';

/**
 * A picture cut into named cells. cells is [{id, x, y, w, h}] in pixels; draw(ctx, cell) paints one cell.
 * @returns {{tex: THREE.Texture|null, W: number, H: number, cells: object}}
 */
export function makeAtlas(name, W, H, cells, draw, backdrop) {
  var map = {};
  cells.forEach(function (c) { map[c.id] = c; });
  var tex = canvasTex(name, W, H, function (ctx) {
    if (backdrop) { ctx.fillStyle = backdrop; ctx.fillRect(0, 0, W, H); }
    cells.forEach(function (c) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(c.x, c.y, c.w, c.h);
      ctx.clip();
      ctx.translate(c.x, c.y);
      draw(ctx, c);
      ctx.restore();
    });
  });
  return { tex: tex, W: W, H: H, cells: map };
}

var _atlasMats = {};

/** The one shared material of an atlas. `lit` makes a lit, cel-shaded surface; the default is unlit (a sign that glows). */
export function atlasMaterial(atlas, lit, o) {
  var dbl = !!(o && o.double);
  var k = (atlas.tex ? atlas.tex.uuid : 'none') + (lit ? 'L' : 'B') + (o && o.op ? o.op : '') + (dbl ? 'D' : '');
  if (_atlasMats[k]) return _atlasMats[k];
  var m;
  var side = dbl ? THREE.DoubleSide : THREE.FrontSide;
  if (!atlas.tex) m = lit ? mat(0xd8c8a8, { side: side }) : bulb(0xd8c8a8, { side: side });
  else m = lit ? mat(0xffffff, { map: atlas.tex, r: 0.8, env: 0.2, side: side }) : bulb(0xffffff, { map: atlas.tex, op: o && o.op, side: side });
  _atlasMats[k] = m;
  return m;
}

/** A plane (standing, facing +z; turn it with ry) that shows one cell of an atlas. */
export function atlasQuad(g, atlas, id, w, h, x, y, z, o) {
  o = o || {};
  var c = atlas.cells[id];
  var geo = new THREE.PlaneGeometry(w, h);
  if (c) {
    var u0 = c.x / atlas.W;
    var u1 = (c.x + c.w) / atlas.W;
    var v0 = 1 - (c.y + c.h) / atlas.H;
    var v1 = 1 - c.y / atlas.H;
    var uv = geo.attributes.uv;
    for (var i = 0; i < uv.count; i++) {
      uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
      uv.setY(i, v0 + uv.getY(i) * (v1 - v0));
    }
  }
  var m = new THREE.Mesh(geo, atlasMaterial(atlas, !!o.lit, o));
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  if (g) g.add(m);
  return m;
}

/** An atlas cell laid flat on the ground (a painted puddle of light, a carpet, a crossing). */
export function atlasFlat(g, atlas, id, w, d, x, y, z, o) {
  var m = atlasQuad(g, atlas, id, w, d, x, y, z, o);
  m.rotation.x = -Math.PI / 2;
  if (o && o.ry) { m.rotation.x = -Math.PI / 2; m.rotation.y = 0; m.rotation.z = o.ry; }
  return m;
}

/**
 * A wall picture facing the track that glows by itself (a painted night street needs no lamp). The picture covers one
 * period (16 units) and each bay shows its quarter, as for wallPanel in mapkit.js, but the surface is unlit.
 * @param {number} h wall height
 * @param {number} xin how far in from the wall line
 * @param {{y0?: number, vmin?: number, vmax?: number, lit?: boolean}} [o]
 */
export function mural(g, tex, side, z, h, xin, o) {
  o = o || {};
  var geo = new THREE.PlaneGeometry(WORLD_BAY, h);
  var uv = geo.attributes.uv;
  var vmin = o.vmin || 0;
  var vmax = o.vmax === undefined ? 1 : o.vmax;
  for (var i = 0; i < uv.count; i++) {
    var local = (uv.getX(i) - 0.5) * WORLD_BAY;
    uv.setX(i, side < 0 ? (local - z) / WORLD_PERIOD : (z + local) / WORLD_PERIOD);
    uv.setY(i, vmin + uv.getY(i) * (vmax - vmin));
  }
  var material = !tex ? (o.lit ? mat(o.color || 0xd8c8a8) : bulb(o.color || 0xd8c8a8)) : (o.lit ? mat(0xffffff, { map: tex, r: 0.85, env: 0.2 }) : bulb(0xffffff, { map: tex, op: o.alpha ? 0.999 : undefined }));
  var m = new THREE.Mesh(geo, material);
  m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  m.position.set(side * WALL_X - side * (xin || 0.01), (o.y0 || 0) + h / 2, z);
  if (g) g.add(m);
  return m;
}

/** Neon-style lettering: a bright core, a soft halo of the same colour, on an optional dark plate. */
export function neonText(ctx, text, cx, cy, size, color, o) {
  o = o || {};
  ctx.save();
  ctx.font = (o.weight || '900') + ' ' + size + 'px ' + CJK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (o.halo !== false) {
    ctx.shadowColor = css(color);
    ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = css(color);
    ctx.fillText(text, cx, cy);
    ctx.fillText(text, cx, cy);
  }
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.strokeStyle = css(color);
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = o.core === undefined ? '#ffffff' : css(o.core);
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/** A rounded rectangle path (and fill, when `fill` is given). */
export function rrect(ctx, x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  if (fill) { ctx.fillStyle = typeof fill === 'number' ? css(fill) : fill; ctx.fill(); }
  if (stroke !== undefined && stroke !== null) { ctx.lineWidth = lw || 3; ctx.strokeStyle = typeof stroke === 'number' ? css(stroke) : stroke; ctx.stroke(); }
}

/** Text with a plain fill (no glow). */
export function plainText(ctx, text, cx, cy, size, color, o) {
  o = o || {};
  ctx.save();
  ctx.font = (o.weight || '900') + ' ' + size + 'px ' + CJK;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = typeof color === 'number' ? css(color) : color;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/** Seeded random for painting (so a picture is the same every time). */
export function prng(seed) {
  var s = seed || 1;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ===== ROOFS, FLAT STRIPS =====

/**
 * A hip roof as one mesh: a w (x) by d (z) rectangle at y = 0 rising to a ridge `h` higher. `eave` adds a flat underside
 * (seen from below). Returns the mesh, already placed.
 */
export function hipRoof(g, w, d, h, color, x, y, z, o) {
  o = o || {};
  var hw = w / 2;
  var hd = d / 2;
  var a;
  var b;
  if (d >= w) { a = [0, h, -(d - w) / 2]; b = [0, h, (d - w) / 2]; } else { a = [-(w - d) / 2, h, 0]; b = [(w - d) / 2, h, 0]; }
  var c1 = [-hw, 0, -hd];
  var c2 = [hw, 0, -hd];
  var c3 = [hw, 0, hd];
  var c4 = [-hw, 0, hd];
  var quad = function (p0, p1, p2, p3) { return [[p0, p1, p2], [p0, p2, p3]]; };
  var tris;
  if (d >= w) tris = quad(c1, c4, b, a).concat(quad(c2, c3, b, a), [[c1, c2, a], [c3, c4, b]], [[c1, c3, c2], [c1, c4, c3]]);
  else tris = quad(c1, c2, b, a).concat(quad(c4, c3, b, a), [[c1, c4, a], [c2, c3, b]], [[c1, c3, c2], [c1, c4, c3]]);
  var pos = [];
  tris.forEach(function (t) { t.forEach(function (p) { pos.push(p[0], p[1], p[2]); }); });
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  var mesh = new THREE.Mesh(geo, mat(color, { side: THREE.DoubleSide, r: o.r }));
  mesh.position.set(x, y, z);
  if (o.ry) mesh.rotation.y = o.ry;
  if (g) g.add(mesh);
  return mesh;
}

/**
 * A flat strip on the ground between two x values, painted with one picture per period (like floorPanel in mapkit.js,
 * but for the ground beside the path). The picture's u runs from x0 to x1, its v along the track.
 */
export function periodFlat(g, tex, x0, x1, z, y, o) {
  var geo = new THREE.PlaneGeometry(x1 - x0, WORLD_BAY);
  var uv = geo.attributes.uv;
  var v0 = (((-(z + WORLD_BAY / 2) / WORLD_PERIOD) % 1) + 1) % 1;
  for (var i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * 0.25);
  var material = tex ? mat(0xffffff, { map: tex, r: (o && o.r) || 0.85, env: 0.25, e: o && o.e, ei: o && o.ei }) : mat((o && o.color) || 0xcccccc);
  var m = new THREE.Mesh(geo, material);
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y || 0.02, z);
  if (g) g.add(m);
  return m;
}

/** The row (in pixels) of a painted period picture that world distance z lands on (see floorPanel: v = -z / 16). */
export function rowOf(z, H) {
  return H * ((((z / WORLD_PERIOD) % 1) + 1) % 1);
}

/**
 * A quad through four points (bottom-left, bottom-right, top-right, top-left of the picture) that shows one atlas cell:
 * a sloping awning, a banner hung at an angle. Two-sided by default.
 */
export function atlasPoly(g, atlas, id, p0, p1, p2, p3, o) {
  var c = atlas.cells[id];
  var u0 = c ? c.x / atlas.W : 0;
  var u1 = c ? (c.x + c.w) / atlas.W : 1;
  var v0 = c ? 1 - (c.y + c.h) / atlas.H : 0;
  var v1 = c ? 1 - c.y / atlas.H : 1;
  var rep = (o && o.repeat) || 1;
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([].concat(p0, p1, p2, p0, p2, p3), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u0 + (u1 - u0) * rep, v0, u0 + (u1 - u0) * rep, v1, u0, v0, u0 + (u1 - u0) * rep, v1, u0, v1], 2));
  geo.computeVertexNormals();
  var m = new THREE.Mesh(geo, atlasMaterial(atlas, !(o && o.unlit), { double: !(o && o.single) }));
  if (g) g.add(m);
  return m;
}

/** A far field of twinkle-free stars: one instanced mesh, almost fixed in the sky. */
export function stars(count, o) {
  o = o || {};
  var geo = combine([{ geo: new THREE.OctahedronGeometry(0.22, 0), color: 0xffffff }]);
  var material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  return swarm({
    geo: geo, material: material, count: count, seed: o.seed || 21,
    colors: o.colors || [0xffffff, 0xfff2c0, 0xcfe6ff],
    area: o.area || { x: [-90, 90], y: [30, 80], z: [-170, -70] },
    k: o.k === undefined ? 0.02 : o.k, scale: o.scale || [0.6, 1.5]
  });
}
