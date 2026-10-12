/**
 * lullaby_clouds_atlas.js — word atlases for the maps that carry greetings: one canvas holds a grid of painted cells (a
 * speech bubble, a pennant, a ticket), and every quad that uses a cell shares the same material, so a hundred signs
 * in different languages cost one draw call. Used by Lullaby Clouds, Aquarium of Tongues and the Prater Fair.
 */

import * as THREE from 'three';
import { canvasTex, css, bulb } from '../mapkit.js';

var FONT = '"Arial Rounded MT Bold", "Trebuchet MS", "Noto Sans", "Noto Sans CJK JP", "Noto Sans Arabic", "Noto Sans Devanagari", "Segoe UI", Arial, sans-serif';

var _mats = {};

/**
 * A grid of painted cells on one canvas.
 * @param {string} name cache key
 * @param {number} cols
 * @param {number} rows
 * @param {number} cw cell width in pixels
 * @param {number} ch cell height in pixels
 * @param {function(CanvasRenderingContext2D, number, number, number): void} draw draws cell i into (0,0)..(w,h)
 */
export function atlasTex(name, cols, rows, cw, ch, draw) {
  return canvasTex(name, cols * cw, rows * ch, function (ctx) {
    ctx.clearRect(0, 0, cols * cw, rows * ch);
    for (var i = 0; i < cols * rows; i++) {
      ctx.save();
      ctx.translate((i % cols) * cw, Math.floor(i / cols) * ch);
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.clip();
      draw(ctx, i, cw, ch);
      ctx.restore();
    }
  });
}

/** Set `text` centred in a box, shrinking the type until it fits. */
export function fitText(ctx, text, cx, cy, maxW, size, color, weight) {
  var s = size;
  ctx.font = (weight || '900 ') + s + 'px ' + FONT;
  while (s > 10 && ctx.measureText(text).width > maxW) {
    s -= 2;
    ctx.font = (weight || '900 ') + s + 'px ' + FONT;
  }
  ctx.fillStyle = typeof color === 'number' ? css(color) : color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

/** A rounded rectangle path (with a fallback where roundRect is missing). */
export function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}

function atlasMaterial(tex) {
  if (!tex) return bulb(0xffffff, { side: THREE.DoubleSide });
  var m = _mats[tex.uuid];
  if (!m) {
    m = _mats[tex.uuid] = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide });
    m.userData.keepLook = true;
  }
  return m;
}

/**
 * An upright quad showing cell `idx` of an atlas, facing +z (turn it with ry).
 * @returns {THREE.Mesh}
 */
export function atlasQuad(g, tex, cols, rows, idx, w, h, x, y, z, o) {
  var geo = new THREE.PlaneGeometry(w, h);
  var uv = geo.attributes.uv;
  var cx = idx % cols;
  var cy = Math.floor(idx / cols);
  for (var i = 0; i < uv.count; i++) {
    uv.setXY(i, (cx + uv.getX(i)) / cols, 1 - (cy + 1 - uv.getY(i)) / rows);
  }
  var m = new THREE.Mesh(geo, atlasMaterial(tex));
  m.position.set(x, y, z);
  if (o) {
    if (o.rx) m.rotation.x = o.rx;
    if (o.ry) m.rotation.y = o.ry;
    if (o.rz) m.rotation.z = o.rz;
  }
  if (g) g.add(m);
  return m;
}
