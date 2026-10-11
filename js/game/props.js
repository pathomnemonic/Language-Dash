/**
 * props.js — Procedural travel and language 3D decoration builders
 *
 * ARCHITECTURE CONTRACT (§23, §30):
 * - Agent 13 owns this file.
 * - All props built from Three.js primitives (no external models).
 * - Topic-themed prop sets for the Language Dash topics (the old per-specialty sets, re-themed).
 * - Props are spawned by track.js and fly toward the camera; the home scene scatters them too.
 * - Uses MeshBasicMaterial for guaranteed visibility without lighting.
 * - Uses MeshStandardMaterial where lighting/shadow matters.
 *
 * Prop categories:
 * - Travel: suitcase, passport, globe, signpost, lighthouse, hot-air balloon, compass, postcard
 * - Words: speech bubbles, letter blocks, books, paper plane, lantern, flags
 * - Food and drink: teacup, bread basket, market stall awning
 */

import * as THREE from 'three';
import { roundedBox } from './materials.js';

// ===== HELPER: create a colored box quickly =====
function box(w, h, d, color, emissive) {
  var mat = emissive
    ? new THREE.MeshBasicMaterial({ color: color })
    : new THREE.MeshStandardMaterial({ color: color });
  return new THREE.Mesh(roundedBox(w, h, d), mat);
}

function sphere(radius, color, basic) {
  var mat = basic
    ? new THREE.MeshBasicMaterial({ color: color })
    : new THREE.MeshStandardMaterial({ color: color });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 10), mat);
}

function cylinder(rTop, rBot, h, color, basic) {
  var mat = basic
    ? new THREE.MeshBasicMaterial({ color: color })
    : new THREE.MeshStandardMaterial({ color: color });
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 10), mat);
}

/** A letter painted on a square canvas (null where canvases are unavailable, e.g. in unit tests). */
function letterTexture(ch, bg, fg) {
  if (typeof document === 'undefined') return null;
  var c = document.createElement('canvas');
  c.width = c.height = 64;
  var ctx = c.getContext && c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = fg;
  ctx.font = '900 44px "Arial Rounded MT Bold", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, 32, 36);
  var t = new THREE.CanvasTexture(c);
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ===== TRAVEL =====

export function buildSuitcase() {
  var g = new THREE.Group();
  var body = box(1.4, 1.0, 0.5, 0xd9534f);
  body.position.set(0, 0.75, 0); body.castShadow = true; g.add(body);
  var band = box(1.42, 0.14, 0.52, 0xf4e3b0, true);
  band.position.set(0, 0.8, 0); g.add(band);
  var handle = box(0.5, 0.08, 0.08, 0x333344, true);
  handle.position.set(0, 1.32, 0); g.add(handle);
  [-0.18, 0.18].forEach(function (x) { var st = box(0.06, 0.18, 0.06, 0x333344, true); st.position.set(x, 1.24, 0); g.add(st); });
  var sticker = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  sticker.position.set(-0.4, 0.7, 0.26); g.add(sticker);
  var sticker2 = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: 0x35d6e8 }));
  sticker2.position.set(0.3, 0.9, 0.26); g.add(sticker2);
  [-0.5, 0.5].forEach(function (x) { var w = cylinder(0.08, 0.08, 0.08, 0x222222, true); w.position.set(x, 0.18, 0.1); w.rotation.z = Math.PI / 2; g.add(w); });
  return g;
}

export function buildPassport() {
  var g = new THREE.Group();
  var cover = box(0.9, 1.25, 0.12, 0x1f3fb8);
  cover.position.set(0, 1.0, 0); cover.castShadow = true; g.add(cover);
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  ring.position.set(0, 1.15, 0.07); g.add(ring);
  var star = box(0.18, 0.18, 0.02, 0xffd23f, true);
  star.position.set(0, 1.15, 0.07); star.rotation.z = Math.PI / 4; g.add(star);
  var line = box(0.5, 0.06, 0.02, 0xffd23f, true);
  line.position.set(0, 0.7, 0.07); g.add(line);
  var line2 = box(0.36, 0.05, 0.02, 0xffd23f, true);
  line2.position.set(0, 0.58, 0.07); g.add(line2);
  return g;
}

export function buildGlobe() {
  var g = new THREE.Group();
  var base = cylinder(0.4, 0.5, 0.12, 0x6a4529);
  base.position.set(0, 0.06, 0); g.add(base);
  var stem = cylinder(0.05, 0.05, 1.0, 0xb8863a);
  stem.position.set(0, 0.6, 0); g.add(stem);
  var ball = sphere(0.8, 0x3a86d9);
  ball.position.set(0, 1.5, 0); ball.castShadow = true; g.add(ball);
  var land = new THREE.Mesh(new THREE.SphereGeometry(0.81, 10, 8, 0.4, 1.7, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: 0x4fbf6f }));
  land.position.set(0, 1.5, 0); g.add(land);
  var land2 = new THREE.Mesh(new THREE.SphereGeometry(0.81, 8, 6, 3.4, 1.2, 1.3, 0.9), new THREE.MeshStandardMaterial({ color: 0x6fd08a }));
  land2.position.set(0, 1.5, 0); g.add(land2);
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: 0xd8a860 }));
  ring.position.set(0, 1.5, 0); ring.rotation.y = Math.PI / 2; g.add(ring);
  return g;
}

export function buildSignpost() {
  var g = new THREE.Group();
  var post = cylinder(0.08, 0.1, 3.0, 0x8a5a34);
  post.position.set(0, 1.5, 0); g.add(post);
  var colors = [0xd9534f, 0x2fa48f, 0xf2c230];
  colors.forEach(function (c, i) {
    var arm = box(1.1, 0.3, 0.06, c);
    arm.position.set(i % 2 ? -0.5 : 0.5, 2.7 - i * 0.45, 0.1); g.add(arm);
    var tip = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 3), new THREE.MeshStandardMaterial({ color: c }));
    tip.rotation.z = i % 2 ? Math.PI / 2 : -Math.PI / 2;
    tip.position.set(i % 2 ? -1.15 : 1.15, 2.7 - i * 0.45, 0.1); g.add(tip);
    var l = box(0.7, 0.06, 0.02, 0xffffff, true);
    l.position.set(i % 2 ? -0.5 : 0.5, 2.7 - i * 0.45, 0.14); g.add(l);
  });
  return g;
}

export function buildLighthouse() {
  var g = new THREE.Group();
  var tower = cylinder(0.5, 0.8, 3.2, 0xffffff);
  tower.position.set(0, 1.6, 0); tower.castShadow = true; g.add(tower);
  [0.8, 1.9].forEach(function (y) { var s = cylinder(0.62 - y * 0.08, 0.66 - y * 0.08, 0.4, 0xd9534f); s.position.set(0, y, 0); g.add(s); });
  var lamp = cylinder(0.4, 0.4, 0.5, 0xfff0a0, true);
  lamp.position.set(0, 3.45, 0); g.add(lamp);
  var roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0xd9534f }));
  roof.position.set(0, 3.95, 0); g.add(roof);
  return g;
}

export function buildHotAirBalloon() {
  var g = new THREE.Group();
  var env = sphere(1.0, 0xff6bd6);
  env.scale.set(1, 1.2, 1); env.position.set(0, 2.6, 0); g.add(env);
  var stripe = sphere(1.02, 0xffd23f);
  stripe.scale.set(0.35, 1.2, 1); stripe.position.set(0, 2.6, 0); g.add(stripe);
  var basket = box(0.6, 0.45, 0.6, 0xb98a55);
  basket.position.set(0, 0.7, 0); g.add(basket);
  [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].forEach(function (p) {
    var rope = cylinder(0.01, 0.01, 1.2, 0xdddddd, true);
    rope.position.set(p[0] * 1.3, 1.5, p[1] * 1.3); g.add(rope);
  });
  return g;
}

export function buildCompass() {
  var g = new THREE.Group();
  var rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 24), new THREE.MeshStandardMaterial({ color: 0xd8a860, metalness: 0.6, roughness: 0.4 }));
  rim.position.set(0, 1.2, 0); g.add(rim);
  var face = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), new THREE.MeshBasicMaterial({ color: 0xf5ecd0 }));
  face.position.set(0, 1.2, 0); g.add(face);
  var north = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xd9534f }));
  north.position.set(0, 1.45, 0.02); g.add(north);
  var south = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0x2a5f8f }));
  south.position.set(0, 0.95, 0.02); south.rotation.z = Math.PI; g.add(south);
  return g;
}

export function buildPostcard() {
  var g = new THREE.Group();
  var card = box(1.5, 1.0, 0.05, 0xfff6e0);
  card.position.set(0, 1.0, 0); card.castShadow = true; g.add(card);
  var pic = box(0.8, 0.8, 0.06, 0x35d6e8, true);
  pic.position.set(-0.3, 1.0, 0.01); g.add(pic);
  var sun = new THREE.Mesh(new THREE.CircleGeometry(0.14, 10), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  sun.position.set(-0.15, 1.2, 0.05); g.add(sun);
  var stamp = box(0.28, 0.34, 0.06, 0xd9534f, true);
  stamp.position.set(0.55, 1.28, 0.01); g.add(stamp);
  [0.95, 0.82, 0.69].forEach(function (y, i) { var l = box(0.4 - i * 0.05, 0.04, 0.06, 0x888899, true); l.position.set(0.4, y - 0.2, 0.01); g.add(l); });
  return g;
}

// ===== WORDS =====

export function buildSpeechBubble() {
  var g = new THREE.Group();
  var bubble = sphere(0.8, 0xffffff, true);
  bubble.scale.set(1.4, 0.9, 0.35); bubble.position.set(0, 1.5, 0); g.add(bubble);
  var tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tail.position.set(-0.5, 0.8, 0); tail.rotation.z = 0.3; g.add(tail);
  [-0.4, 0, 0.4].forEach(function (x) { var d = sphere(0.1, 0x35d6e8, true); d.position.set(x, 1.5, 0.3); g.add(d); });
  return g;
}

export function buildLetterBlocks() {
  var g = new THREE.Group();
  var letters = [['A', '#ff6bb5'], ['あ', '#35d6e8'], ['Я', '#ffd23f'], ['한', '#4fe8a8']];
  [[0, 0.4, 0], [0.85, 0.4, 0], [0.42, 1.25, 0], [-0.1, 2.1, 0]].forEach(function (p, i) {
    var tex = letterTexture(letters[i][0], letters[i][1], '#ffffff');
    var mat = tex ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshStandardMaterial({ color: new THREE.Color(letters[i][1]) });
    var b = new THREE.Mesh(roundedBox(0.8, 0.8, 0.8), mat);
    b.position.set(p[0], p[1], p[2]); b.rotation.y = (i - 1.5) * 0.15; b.castShadow = true; g.add(b);
  });
  return g;
}

export function buildBookStack() {
  var g = new THREE.Group();
  var colors = [0xc0392b, 0x2a6f9a, 0x2f9e6f, 0xf2c230, 0x7a4aa0];
  colors.forEach(function (c, i) {
    var b = box(1.3 - i * 0.1, 0.22, 0.9 - i * 0.05, c);
    b.position.set((i % 2 ? 0.05 : -0.05), 0.12 + i * 0.23, 0); b.rotation.y = (i - 2) * 0.12; g.add(b);
    var pages = box(1.22 - i * 0.1, 0.16, 0.84 - i * 0.05, 0xf5ecd0, true);
    pages.position.set(b.position.x + 0.03, b.position.y, 0.0); pages.rotation.y = b.rotation.y; g.add(pages);
  });
  return g;
}

export function buildPaperPlane() {
  var g = new THREE.Group();
  var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  var geo = new THREE.BufferGeometry();
  // a simple folded dart: two wings and a keel
  var v = new Float32Array([
    0, 0, 1.6,   -1.0, 0.1, -0.8,   0, -0.1, -0.5,
    0, 0, 1.6,    0, -0.1, -0.5,    1.0, 0.1, -0.8,
    0, 0, 1.6,    0, -0.5, -0.6,    0, -0.1, -0.5
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
  geo.computeVertexNormals();
  var m = new THREE.Mesh(geo, mat);
  m.position.set(0, 1.5, 0); m.castShadow = true; g.add(m);
  var shade = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xcfe8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }));
  shade.position.set(0, 1.5, 0); shade.scale.set(1.01, 1.01, 1.01); g.add(shade);
  g.scale.set(1.5, 1.5, 1.5);
  return g;
}

export function buildLantern() {
  var g = new THREE.Group();
  var body = sphere(0.6, 0xff4a5e, true);
  body.scale.set(1, 1.2, 1); body.position.set(0, 1.6, 0); g.add(body);
  [0.78, -0.78].forEach(function (y) { var cap = cylinder(0.25, 0.25, 0.12, 0xffd23f, true); cap.position.set(0, 1.6 + y, 0); g.add(cap); });
  var tassel = cylinder(0.02, 0.02, 0.5, 0xffd23f, true);
  tassel.position.set(0, 0.55, 0); g.add(tassel);
  var cord = cylinder(0.015, 0.015, 1.0, 0x888899, true);
  cord.position.set(0, 2.95, 0); g.add(cord);
  return g;
}

export function buildFlagString() {
  var g = new THREE.Group();
  var colors = [0xff4a5e, 0xffd23f, 0x35d6e8, 0x8dea3a, 0xff6bd6, 0x3d8bff];
  var cord = cylinder(0.015, 0.015, 3.4, 0xf4e3b0, true);
  cord.position.set(0, 2.2, 0); cord.rotation.z = Math.PI / 2; g.add(cord);
  colors.forEach(function (c, i) {
    var flag = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    flag.position.set(-1.4 + i * 0.56, 1.9 - Math.sin((i / 5) * Math.PI) * -0.1, 0);
    flag.rotation.z = Math.PI; g.add(flag);
  });
  [-1.7, 1.7].forEach(function (x) { var p = cylinder(0.04, 0.05, 2.3, 0x8a6a4a); p.position.set(x, 1.15, 0); g.add(p); });
  return g;
}

// ===== FOOD AND DRINK =====

export function buildTeacup() {
  var g = new THREE.Group();
  var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.35, 0.7, 14), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  cup.position.set(0, 0.7, 0); cup.castShadow = true; g.add(cup);
  var tea = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: 0xb8713a }));
  tea.rotation.x = -Math.PI / 2; tea.position.set(0, 1.04, 0); g.add(tea);
  var handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  handle.position.set(0.7, 0.75, 0); g.add(handle);
  var saucer = cylinder(0.85, 0.7, 0.08, 0xff6bb5);
  saucer.position.set(0, 0.3, 0); g.add(saucer);
  [-0.15, 0.1, 0.35].forEach(function (x) { var st = cylinder(0.04, 0.07, 0.4, 0xdddddd, true); st.position.set(x * 0.6, 1.45, 0); st.rotation.z = 0.2; g.add(st); });
  return g;
}

export function buildBreadBasket() {
  var g = new THREE.Group();
  var basket = cylinder(0.8, 0.55, 0.5, 0xc58b4a);
  basket.position.set(0, 0.4, 0); g.add(basket);
  [[-0.3, 0.1], [0.3, 0.1], [0, -0.2]].forEach(function (p, i) {
    var loaf = sphere(0.3, [0xe0a050, 0xd99a45, 0xe8b060][i]);
    loaf.scale.set(1.6, 0.8, 0.8); loaf.position.set(p[0], 0.8, p[1]); loaf.rotation.y = i; g.add(loaf);
  });
  return g;
}

// ===== TOPIC-THEMED PROP SETS =====

/**
 * The floating props for each Language Dash topic (the old per-specialty sets, re-themed). The keys are the SUBJECTS
 * strings; getSpecialtyProps() falls back to "default" for anything else.
 */
export var SPECIALTY_PROPS = {
  "Basics": [buildSpeechBubble, buildLetterBlocks, buildPassport, buildPaperPlane],
  "People & Family": [buildSpeechBubble, buildPostcard, buildTeacup, buildLantern],
  "Body & Health": [buildTeacup, buildBreadBasket, buildCompass, buildSpeechBubble],
  "Food & Drink": [buildTeacup, buildBreadBasket, buildLantern, buildFlagString],
  "Home & Things": [buildBookStack, buildLantern, buildTeacup, buildGlobe],
  "Nature & Animals": [buildHotAirBalloon, buildPaperPlane, buildLighthouse, buildCompass],
  "Travel & Places": [buildSuitcase, buildSignpost, buildGlobe, buildLighthouse, buildHotAirBalloon],
  "Time & Numbers": [buildLetterBlocks, buildCompass, buildPassport, buildBookStack],
  "Colors & Describing": [buildFlagString, buildLantern, buildLetterBlocks, buildHotAirBalloon],
  "Actions": [buildPaperPlane, buildSuitcase, buildHotAirBalloon, buildSignpost],
  "Feelings & Thinking": [buildSpeechBubble, buildLantern, buildPostcard, buildBookStack],
  "Talking": [buildSpeechBubble, buildPostcard, buildLetterBlocks, buildPaperPlane],
  "Work & School": [buildBookStack, buildPassport, buildGlobe, buildLetterBlocks],
  "Shopping & Money": [buildSuitcase, buildBreadBasket, buildFlagString, buildPostcard],
  "Small Words": [buildLetterBlocks, buildSpeechBubble, buildPaperPlane, buildPassport],
  "default": [buildSuitcase, buildPassport, buildGlobe, buildSpeechBubble, buildPaperPlane, buildLetterBlocks, buildSignpost]
};

// All prop builders (used for general spawning)
export var PROP_BUILDERS = [
  buildSuitcase,
  buildPassport,
  buildGlobe,
  buildSignpost,
  buildLighthouse,
  buildHotAirBalloon,
  buildCompass,
  buildPostcard,
  buildSpeechBubble,
  buildLetterBlocks,
  buildBookStack,
  buildPaperPlane,
  buildLantern,
  buildFlagString,
  buildTeacup,
  buildBreadBasket
];

// Get topic-appropriate builders for the current subject
export function getSpecialtyProps(subjects) {
  if (!subjects || subjects.length === 0) return SPECIALTY_PROPS["default"];
  var primary = subjects[0];
  return SPECIALTY_PROPS[primary] || SPECIALTY_PROPS["default"];
}
