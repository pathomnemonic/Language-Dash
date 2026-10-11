/**
 * obstacles.js — Obstacle spawning, coin patterns, and power-up orbs
 *
 * Architecture contract: Sections 16 (checklist), 13.3 (encounter plan)
 *
 * Features:
 * - Jump obstacles (low): luggage trolley, "mind the gap" sign, market crate, spilled market crates,
 *   toppled bicycle, kick scooter (ids kept from the old set: gurney, wet_floor_sign, crate,
 *   spilled_supplies, fallen_stretcher, medical_waste_bin)
 * - Slide obstacles (high): customs gate, metro tunnel, festival bunting, overhead baggage scanner
 * - Large colored directional indicators (orange up arrow = jump, blue down = slide)
 * - Obstacle bounds metadata for collision checking
 * - Deterministic obstacle spawning from encounter plans
 * - Prevention of impossible layouts (no same-frame jump+slide in same lane)
 * - Glowing coin patterns with multiple formations
 * - Dramatic power-up orbs with spinning rings and type-specific icons
 *
 * Exported obstacle metadata includes:
 * - variantId: unique string identifying the obstacle type
 * - type: 'jump' or 'slide' (matching architecture terminology)
 * - bounds: { width, height, depth } for collision
 * - lane: 0 | 1 | 2
 */

import * as THREE from 'three';
import { roundedBox, upgradeMaterials, markShared, mergeStatic, softenTranslucentScenery } from './materials.js';
import { PALETTE, toonMaterial, paperizeMaterials, outlineGroup } from './paper.js';
import { buildScenery, buildHanging } from './scenery.js';
import { buildModelCharacter, loadCharacterModel, isModelReady } from './charactermodel.js';
import { modelUrl } from './modelcatalog.js';
import { useCharacterModels, isLowQuality } from './quality.js';
import { VISUAL_SPEED } from './enginedefs.js';
import { COIN_GAP, coinsForObstacle, jumpArc, jumpArcLength, arcCoinCount } from './coinfx.js';

var LANE_X = [-3, 0, 3];

// ===== OBSTACLE VARIANT REGISTRY =====
// Each variant has an id, builder function, collision type, and bounding box.

var JUMP_VARIANTS = [
  // ids are stable (saved and shared challenge plans use them); the pictures are the travel-world versions
  { id: 'gurney',           builder: buildLuggageTrolley,   bounds: { width: 2.2, height: 0.7, depth: 1.2 } },
  { id: 'wet_floor_sign',   builder: buildMindTheGapSign,   bounds: { width: 0.8, height: 1.0, depth: 0.8 } },
  { id: 'crate',            builder: buildMarketCrate,      bounds: { width: 1.0, height: 1.0, depth: 0.8 }, model: 'crate' },
  { id: 'spilled_supplies', builder: buildSpilledCrates,    bounds: { width: 1.5, height: 0.5, depth: 0.8 }, model: 'boxes' },
  { id: 'fallen_stretcher', builder: buildToppledBicycle,   bounds: { width: 2.0, height: 0.5, depth: 0.8 } },
  { id: 'medical_waste_bin',builder: buildScooter,          bounds: { width: 0.7, height: 0.7, depth: 0.7 } },
  // A porter pushing a luggage trolley toward you: animated, jump over the trolley
  { id: 'orderly_gurney',    builder: buildLuggageTrolley,  bounds: { width: 2.2, height: 0.7, depth: 1.2 }, staff: ['characters/explorer.glb', 'characters/scout.glb', 'characters/adventurer.glb'] }
];

var SLIDE_VARIANTS = [
  { id: 'hanging_traffic_light', builder: buildCustomsGate,   bounds: { width: 2.5, height: 3.2, depth: 0.1 }, model: 'trafficlight', hang: { bottom: 1.25, fit: { width: 2.4, height: 1.9, depth: 1.2 } } },
  { id: 'hanging_chandelier',    builder: buildMetroTunnel,   bounds: { width: 2.8, height: 2.8, depth: 1.5 }, model: 'chandelier',   hang: { bottom: 1.2, fit: { width: 2.4, height: 1.7, depth: 2.4 } } },
  { id: 'hanging_sign',          builder: buildBunting,       bounds: { width: 2.2, height: 2.2, depth: 0.1 }, model: 'hangsign',    hang: { bottom: 1.25, fit: { width: 2.4, height: 1.5, depth: 0.6 } } },
  { id: 'hanging_spotlight',     builder: buildBaggageScanner, bounds: { width: 2.5, height: 2.5, depth: 0.4 }, model: 'spotlight',    hang: { bottom: 1.3, fit: { width: 2.4, height: 1.6, depth: 1.2 } } }
];

// Older ids (in saved or shared challenge plans) map to their replacements.
var VARIANT_ALIASES = {
  wheelchair: 'crate',
  or_doors: 'hanging_traffic_light',
  mri_tunnel: 'hanging_chandelier',
  caution_tape: 'hanging_sign',
  xray_arm: 'hanging_spotlight'
};

// ===== VARIANT LOOKUP =====

var ALL_VARIANTS_BY_ID = {};
(function () {
  for (var i = 0; i < JUMP_VARIANTS.length; i++) {
    ALL_VARIANTS_BY_ID[JUMP_VARIANTS[i].id] = JUMP_VARIANTS[i];
  }
  for (var j = 0; j < SLIDE_VARIANTS.length; j++) {
    ALL_VARIANTS_BY_ID[SLIDE_VARIANTS[j].id] = SLIDE_VARIANTS[j];
  }
  Object.keys(VARIANT_ALIASES).forEach(function (oldId) {
    ALL_VARIANTS_BY_ID[oldId] = ALL_VARIANTS_BY_ID[VARIANT_ALIASES[oldId]];
  });
})();

/**
 * Get obstacle variant metadata by ID.
 * @param {string} variantId
 * @returns {object|null}
 */
export function getObstacleVariant(variantId) {
  return ALL_VARIANTS_BY_ID[variantId] || null;
}

/**
 * Get all registered variant IDs.
 * @returns {{ jump: string[], slide: string[] }}
 */
export function getVariantIds() {
  return {
    jump: JUMP_VARIANTS.map(function (v) { return v.id; }),
    slide: SLIDE_VARIANTS.map(function (v) { return v.id; })
  };
}

// ===== JUMP OBSTACLE BUILDERS =====

/** A luggage trolley piled with two suitcases (the pushed one in the staffed variant). */
function buildLuggageTrolley() {
  var g = new THREE.Group();
  var deck = new THREE.Mesh(roundedBox(2.2, 0.1, 1.2), new THREE.MeshStandardMaterial({ color: 0x3a7bd5 }));
  deck.position.set(0, 0.3, 0);
  deck.castShadow = true;
  g.add(deck);
  // two suitcases with a stripe, a handle and a travel sticker
  var cases = [{ x: -0.5, w: 0.9, h: 0.38, color: 0xd9534f }, { x: 0.55, w: 0.8, h: 0.3, color: 0x2fa48f }];
  cases.forEach(function (c) {
    var body = new THREE.Mesh(roundedBox(c.w, c.h, 0.7), new THREE.MeshStandardMaterial({ color: c.color }));
    body.position.set(c.x, 0.35 + c.h / 2, 0);
    g.add(body);
    var band = new THREE.Mesh(roundedBox(c.w + 0.02, 0.06, 0.72), new THREE.MeshBasicMaterial({ color: 0xf4e3b0 }));
    band.position.set(c.x, 0.35 + c.h * 0.6, 0);
    g.add(band);
    var handle = new THREE.Mesh(roundedBox(0.3, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0x333344 }));
    handle.position.set(c.x, 0.37 + c.h, 0);
    g.add(handle);
    var sticker = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    sticker.position.set(c.x - 0.15, 0.35 + c.h / 2, -0.36);
    sticker.rotation.y = Math.PI;
    g.add(sticker);
  });
  // push handle at the back
  for (var hx = -0.9; hx <= 0.9; hx += 1.8) {
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0x9aa4b5 }));
    post.position.set(hx, 0.65, 0.55);
    g.add(post);
  }
  var bar = new THREE.Mesh(roundedBox(1.9, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0x9aa4b5 }));
  bar.position.set(0, 1.0, 0.55);
  g.add(bar);
  var wMat = new THREE.MeshBasicMaterial({ color: 0x333344 });
  for (var wx = -0.8; wx <= 0.8; wx += 1.6) {
    for (var wz = -0.4; wz <= 0.4; wz += 0.8) {
      var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8), wMat);
      wheel.position.set(wx, 0.1, wz);
      wheel.rotation.z = Math.PI / 2;
      g.add(wheel);
    }
  }
  addJumpIndicator(g);
  return g;
}

/** A yellow A-frame "mind the gap" sign. */
function buildMindTheGapSign() {
  var g = new THREE.Group();
  var yellow = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  var black = new THREE.MeshBasicMaterial({ color: 0x222222 });
  for (var s = -1; s <= 1; s += 2) {
    var panel = new THREE.Mesh(roundedBox(0.7, 0.95, 0.05), yellow);
    panel.position.set(0, 0.48, s * 0.17);
    panel.rotation.x = -s * 0.28;
    g.add(panel);
    // black-and-yellow gap stripes across the panel
    for (var i = 0; i < 3; i++) {
      var stripe = new THREE.Mesh(roundedBox(0.7, 0.08, 0.06), black);
      stripe.position.set(0, 0.2 + i * 0.28, s * 0.17);
      stripe.rotation.x = -s * 0.28;
      g.add(stripe);
    }
  }
  // the little "stand clear" figure: a dot over a gap
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), black);
  head.position.set(0, 0.8, -0.26);
  g.add(head);
  addJumpIndicator(g);
  return g;
}

/** A wooden market crate of oranges (the jump obstacle 'crate'). */
function buildMarketCrate() {
  var g = new THREE.Group();
  var wood = new THREE.MeshStandardMaterial({ color: 0xc58b4a });
  var slat = new THREE.MeshStandardMaterial({ color: 0x9d6a32 });
  var body = new THREE.Mesh(roundedBox(1.0, 0.8, 0.8), wood);
  body.position.set(0, 0.4, 0);
  g.add(body);
  for (var i = 0; i < 3; i++) {
    var s = new THREE.Mesh(roundedBox(1.04, 0.1, 0.84), slat);
    s.position.set(0, 0.15 + i * 0.28, 0);
    g.add(s);
  }
  var fruit = new THREE.MeshBasicMaterial({ color: 0xff8a1f });
  for (var f = 0; f < 5; f++) {
    var o = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), fruit);
    o.position.set(-0.3 + (f % 3) * 0.3, 0.88, -0.15 + Math.floor(f / 3) * 0.3);
    g.add(o);
  }
  addJumpIndicator(g);
  return g;
}

/** Market crates tipped over, oranges and a few lemons rolling away. */
function buildSpilledCrates() {
  var g = new THREE.Group();
  var crate1 = new THREE.Mesh(roundedBox(0.6, 0.5, 0.45), new THREE.MeshStandardMaterial({ color: 0xc58b4a }));
  crate1.position.set(-0.35, 0.25, 0);
  crate1.rotation.z = 0.3;
  g.add(crate1);
  var crate2 = new THREE.Mesh(roundedBox(0.5, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xa8742f }));
  crate2.position.set(0.4, 0.2, 0.2);
  g.add(crate2);
  var label = new THREE.Mesh(roundedBox(0.22, 0.1, 0.02), new THREE.MeshBasicMaterial({ color: 0x2fa48f }));
  label.position.set(0.4, 0.3, 0.02);
  g.add(label);
  var colors = [0xff8a1f, 0xffe14a, 0xff8a1f, 0x8dea3a];
  for (var i = 0; i < 4; i++) {
    var fruit = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: colors[i] }));
    fruit.position.set((Math.random() - 0.5) * 1.5, 0.1, (Math.random() - 0.5) * 0.8);
    g.add(fruit);
  }
  addJumpIndicator(g);
  return g;
}

/** A bicycle toppled over on its side. */
function buildToppledBicycle() {
  var g = new THREE.Group();
  var tire = new THREE.MeshBasicMaterial({ color: 0x222233 });
  var frame = new THREE.MeshStandardMaterial({ color: 0x2fa48f });
  var tilt = new THREE.Group();
  tilt.rotation.z = 0.35;
  g.add(tilt);
  [-0.65, 0.65].forEach(function (wx) {
    var wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 18), tire);
    wheel.position.set(wx, 0.34, 0);
    tilt.add(wheel);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6), new THREE.MeshBasicMaterial({ color: 0xaab4c4 }));
    hub.position.set(wx, 0.34, 0);
    hub.rotation.x = Math.PI / 2;
    tilt.add(hub);
  });
  var top = new THREE.Mesh(roundedBox(1.3, 0.06, 0.06), frame);
  top.position.set(0, 0.5, 0);
  tilt.add(top);
  var down = new THREE.Mesh(roundedBox(0.9, 0.06, 0.06), frame);
  down.position.set(0.1, 0.38, 0);
  down.rotation.z = 0.5;
  tilt.add(down);
  var bars = new THREE.Mesh(roundedBox(0.06, 0.06, 0.5), new THREE.MeshBasicMaterial({ color: 0x333344 }));
  bars.position.set(0.7, 0.72, 0);
  tilt.add(bars);
  var basket = new THREE.Mesh(roundedBox(0.3, 0.2, 0.3), new THREE.MeshStandardMaterial({ color: 0xc58b4a }));
  basket.position.set(0.8, 0.6, 0);
  tilt.add(basket);
  var seat = new THREE.Mesh(roundedBox(0.28, 0.06, 0.14), new THREE.MeshBasicMaterial({ color: 0x333344 }));
  seat.position.set(-0.55, 0.62, 0);
  tilt.add(seat);
  addJumpIndicator(g);
  return g;
}

/** A kick scooter dropped in the lane. */
function buildScooter() {
  var g = new THREE.Group();
  var deck = new THREE.Mesh(roundedBox(0.8, 0.06, 0.24), new THREE.MeshStandardMaterial({ color: 0xff6bd6 }));
  deck.position.set(0, 0.18, 0);
  deck.rotation.z = 0.12;
  g.add(deck);
  var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), new THREE.MeshBasicMaterial({ color: 0xaab4c4 }));
  stem.position.set(-0.4, 0.55, 0);
  stem.rotation.z = -0.1;
  g.add(stem);
  var bar = new THREE.Mesh(roundedBox(0.05, 0.05, 0.46), new THREE.MeshBasicMaterial({ color: 0x333344 }));
  bar.position.set(-0.45, 0.95, 0);
  g.add(bar);
  var wMat = new THREE.MeshBasicMaterial({ color: 0x222233 });
  [-0.4, 0.42].forEach(function (wx) {
    var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), wMat);
    wheel.position.set(wx, 0.12, 0);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel);
  });
  addJumpIndicator(g);
  return g;
}

// ===== SLIDE OBSTACLE BUILDERS =====

/** A customs gate: a frame with a stamped header board and two hanging barrier panels. */
function buildCustomsGate() {
  var g = new THREE.Group();
  for (var sx = -1; sx <= 1; sx += 2) {
    var frame = new THREE.Mesh(roundedBox(0.1, 3.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x4a5a78 }));
    frame.position.set(sx * 1.2, 1.6, 0);
    g.add(frame);
  }
  var top = new THREE.Mesh(roundedBox(2.5, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x4a5a78 }));
  top.position.set(0, 3.0, 0);
  g.add(top);
  var header = new THREE.Mesh(roundedBox(1.6, 0.35, 0.06), new THREE.MeshBasicMaterial({ color: 0x1f3fb8 }));
  header.position.set(0, 3.0, 0.02);
  g.add(header);
  var stamp = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 14), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  stamp.position.set(0, 3.0, -0.03);
  g.add(stamp);
  for (var dx = -1; dx <= 1; dx += 2) {
    var door = new THREE.Mesh(roundedBox(1.1, 1.2, 0.08), new THREE.MeshBasicMaterial({ color: 0x2f6fd0, transparent: true, opacity: 0.85 }));
    door.position.set(dx * 0.55, 2.4, 0);
    g.add(door);
    var stripe = new THREE.Mesh(roundedBox(1.1, 0.12, 0.09), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    stripe.position.set(dx * 0.55, 2.2, 0);
    g.add(stripe);
    var light = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshBasicMaterial({ color: dx < 0 ? 0x39ff88 : 0xff4a4a }));
    light.position.set(dx * 0.55, 2.75, -0.07);
    g.add(light);
  }
  addSlideIndicator(g);
  return g;
}

/** The mouth of a metro tunnel: a tiled arch with a roundel sign and rails underneath. */
function buildMetroTunnel() {
  var g = new THREE.Group();
  var ringMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc4 });
  var outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.25, 12, 24), ringMat);
  outerRing.position.set(0, 1.5, 0);
  outerRing.rotation.y = Math.PI / 2;
  g.add(outerRing);
  var bore = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.5, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x2a2f45 }));
  bore.position.set(0, 1.5, 0);
  bore.rotation.x = Math.PI / 2;
  g.add(bore);
  var panel = new THREE.Mesh(roundedBox(2.8, 2.8, 0.15), new THREE.MeshStandardMaterial({ color: 0xb85a3c }));
  panel.position.set(0, 1.5, 0.7);
  g.add(panel);
  var hole = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16), new THREE.MeshBasicMaterial({ color: 0x15182a }));
  hole.position.set(0, 1.5, 0.78);
  g.add(hole);
  // roundel: a red ring with a blue bar
  var roundel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20), new THREE.MeshBasicMaterial({ color: 0xe03a3a }));
  roundel.position.set(0, 2.85, 0.6);
  g.add(roundel);
  var barBlue = new THREE.Mesh(roundedBox(0.6, 0.1, 0.04), new THREE.MeshBasicMaterial({ color: 0x1f3fb8 }));
  barBlue.position.set(0, 2.85, 0.6);
  g.add(barBlue);
  // two rails on the floor
  for (var r = -1; r <= 1; r += 2) {
    var rail = new THREE.Mesh(roundedBox(0.06, 0.06, 2.5), new THREE.MeshBasicMaterial({ color: 0x9aa4b5 }));
    rail.position.set(r * 0.35, 0.06, -0.5);
    g.add(rail);
  }
  var glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.6 }));
  glowRing.position.set(0, 1.5, 0.3);
  glowRing.rotation.y = Math.PI / 2;
  g.add(glowRing);
  var glowRing2 = glowRing.clone();
  glowRing2.position.set(0, 1.5, -0.3);
  g.add(glowRing2);
  addSlideIndicator(g);
  return g;
}

/** A string of festival bunting strung between two poles. */
function buildBunting() {
  var g = new THREE.Group();
  for (var side = -1; side <= 1; side += 2) {
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.0, 6), new THREE.MeshBasicMaterial({ color: 0x8a6a4a }));
    pole.position.set(side * 1.0, 1.5, 0);
    g.add(pole);
  }
  var string = new THREE.Mesh(roundedBox(2.0, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xf4e3b0 }));
  string.position.set(0, 2.3, 0);
  g.add(string);
  var colors = [0xff4a5e, 0xffd23f, 0x35d6e8, 0x8dea3a, 0xff6bd6];
  for (var s = 0; s < 5; s++) {
    var flag = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 3), new THREE.MeshBasicMaterial({ color: colors[s] }));
    flag.position.set(-0.8 + s * 0.4, 2.1, 0);
    flag.rotation.z = Math.PI;
    g.add(flag);
  }
  var string2 = new THREE.Mesh(roundedBox(2.0, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xf4e3b0 }));
  string2.position.set(0, 1.9, 0);
  g.add(string2);
  addSlideIndicator(g);
  return g;
}

/** An overhead baggage scanner arm with a lit lens, over a ticket-barrier base. */
function buildBaggageScanner() {
  var g = new THREE.Group();
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8), new THREE.MeshBasicMaterial({ color: 0x777788 }));
  pole.position.set(-1.0, 1.5, 0);
  g.add(pole);
  var arm = new THREE.Mesh(roundedBox(2.5, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0x888899 }));
  arm.position.set(0.2, 2.5, 0);
  g.add(arm);
  var head = new THREE.Mesh(roundedBox(0.7, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0xaab4cc }));
  head.position.set(0.8, 2.2, 0);
  g.add(head);
  var lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.8 }));
  lens.position.set(0.8, 2.05, -0.26);
  g.add(lens);
  var belt = new THREE.Mesh(roundedBox(0.7, 0.04, 0.5), new THREE.MeshBasicMaterial({ color: 0x222233 }));
  belt.position.set(0.8, 2.02, 0);
  g.add(belt);
  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.08, 10), new THREE.MeshBasicMaterial({ color: 0x666677 }));
  base.position.set(-1.0, 0.04, 0);
  g.add(base);
  addSlideIndicator(g);
  return g;
}

// ===== INDICATOR BUILDERS =====

// A flat paper arrow with an ink outline on a painted floor strip: marigold-orange up = jump, sky blue down = slide.
function addIndicator(group, hex, y, down) {
  var arrowGroup = new THREE.Group();
  arrowGroup.userData.noOutline = true;
  var fill = toonMaterial(hex);
  var inkM = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide });
  [[0.25, 0.5, 0], [0.15, 0.3, down ? -0.5 : 0.5]].forEach(function (c) {
    var arrow = new THREE.Mesh(new THREE.ConeGeometry(c[0], c[1], 6), fill);
    arrow.position.set(0, c[2], 0);
    if (down) arrow.rotation.z = Math.PI;
    var hull = new THREE.Mesh(new THREE.ConeGeometry(c[0] + 0.05, c[1] + 0.07, 6), inkM);
    arrow.add(hull);
    arrowGroup.add(arrow);
  });
  arrowGroup.position.set(0, y, 0);
  group.add(arrowGroup);
  var tintPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 0.1),
    new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  tintPlane.rotation.x = -Math.PI / 2;
  tintPlane.position.set(0, 0.01, 0);
  group.add(tintPlane);
}

function addJumpIndicator(group) { addIndicator(group, 0xe8812a, 1.8, false); }

function addSlideIndicator(group) { addIndicator(group, PALETTE.sky, 1.5, true); }

// ===== OBSTACLE SPAWNING =====

/**
 * Spawn a random obstacle.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D[]} obstacleMeshes - Array to push the obstacle into
 * @param {object} [planEntry] - Optional deterministic plan entry from encounter plan
 *   Shape: { type: 'jump'|'slide', lane: 0|1|2, variantId: string, spawnOffset: number }
 * @returns {object} Metadata about the spawned obstacle: { variantId, type, lane, bounds }
 */
/**
 * Which lane an obstacle may use. Normally any lane (so obstacles give nothing away about the
 * answer); pass `avoidLane` to keep one lane clear.
 * @param {number} [avoidLane] a lane (0-2) to keep clear, or -1/undefined for no restriction
 * @param {function(): number} [rand]
 */
export function pickObstacleLane(avoidLane, rand) {
  var r = rand || Math.random;
  var lanes = [0, 1, 2].filter(function (l) { return l !== avoidLane; });
  return lanes[Math.floor(r() * lanes.length)];
}

/** Start downloading the porters that push luggage trolleys (they are only used on the 3D tiers). */
export function preloadStaffModels() {
  if (!useCharacterModels()) return;
  JUMP_VARIANTS.forEach(function (v) { (v.staff || []).forEach(function (f) { loadCharacterModel(modelUrl(f)).catch(function () { /* optional */ }); }); });
}

/** The animated crew behind a staffed obstacle (null until its character model has loaded). */
export function buildStaffMember(files, rand) {
  var file = files[Math.floor((rand || Math.random)() * files.length)];
  var url = modelUrl(file);
  if (!isModelReady(url)) { loadCharacterModel(url).catch(function () { /* the plain trolley is used */ }); return null; }
  var pg = buildModelCharacter(url, 1, 1.9);
  if (!pg) return null;
  pg.rotation.y = Math.PI; // pushing the trolley toward the runner
  pg.position.set(0, 0, -1.7);
  return pg;
}

/**
 * @param {object} [options]
 * @param {number} [options.avoidLane] a lane to keep clear (not used by the game: obstacles may be in any lane)
 * @param {number} [options.spawnZ] where it appears; well beyond the gate, so it arrives after the answer is locked
 */
export function spawnObstacle(scene, obstacleMeshes, planEntry, options) {
  options = options || {};
  var lane;
  var isSlide;
  var variant;
  var spawnZ;

  if (planEntry) {
    // Deterministic from encounter plan
    lane = planEntry.lane;
    isSlide = planEntry.type === 'slide';
    variant = ALL_VARIANTS_BY_ID[planEntry.variantId];
    spawnZ = (planEntry.spawnOffset || -50) * VISUAL_SPEED;

    // Fallback if variant not found
    if (!variant) {
      var variants = isSlide ? SLIDE_VARIANTS : JUMP_VARIANTS;
      variant = variants[0];
    }
  } else {
    // Random spawning
    lane = pickObstacleLane(options.avoidLane);
    isSlide = Math.random() < 0.5;
    var variants2 = (isSlide ? SLIDE_VARIANTS : JUMP_VARIANTS).filter(function (v) { return !v.staff || useCharacterModels(); });
    variant = variants2[Math.floor(Math.random() * variants2.length)];
    spawnZ = options.spawnZ || -50 * VISUAL_SPEED; // already in world units when the engine passes one
  }

  // Real 3D model when one is ready (high graphics tier); otherwise the built-in version.
  var obs = null;
  if (variant.model) {
    obs = variant.hang ? buildHanging(variant.model, variant.hang) : buildScenery(variant.model, variant.bounds, true);
    if (obs) (isSlide ? addSlideIndicator : addJumpIndicator)(obs);
  }
  if (!obs) {
    obs = variant.builder();
    upgradeMaterials(obs, { glowAbove: 0.92 });
  }
  var staff = variant.staff ? buildStaffMember(variant.staff) : null;
  // Printed look: paper colours and flat shading, and an ink outline so the obstacle reads at a glance
  paperizeMaterials(obs);
  if (!isLowQuality()) outlineGroup(obs, 0.03);
  if (staff) obs.add(staff);
  obs.position.set(LANE_X[lane], 0, spawnZ);
  obs.userData = {
    staff: staff,
    lane: lane,
    type: isSlide ? 'high' : 'low',
    variantId: variant.id,
    obstacleType: isSlide ? 'slide' : 'jump',
    bounds: variant.bounds
  };
  softenTranslucentScenery(obs);
  scene.add(obs);
  obstacleMeshes.push(obs);

  return {
    variantId: variant.id,
    type: isSlide ? 'slide' : 'jump',
    lane: lane,
    bounds: variant.bounds
  };
}

/**
 * Check whether two obstacle plan entries would create an impossible layout
 * (e.g., jump and slide in the same lane at the same Z offset).
 *
 * @param {object} entry1 - { type, lane, spawnOffset }
 * @param {object} entry2 - { type, lane, spawnOffset }
 * @returns {boolean} True if the layout is impossible/unfair
 */
export function isImpossibleLayout(entry1, entry2) {
  if (!entry1 || !entry2) return false;
  // Same lane, overlapping Z, different required action
  if (entry1.lane === entry2.lane) {
    var zDistance = Math.abs((entry1.spawnOffset || 0) - (entry2.spawnOffset || 0));
    if (zDistance < 5 && entry1.type !== entry2.type) {
      return true; // Player can't jump AND slide simultaneously
    }
  }
  return false;
}

// ===== COINS: BRASS TRAVEL TOKENS =====

var _coinTemplate = null;

/** Built once; every coin is a clone that shares its geometry and materials (far fewer GPU buffers). */
/** A coin is drawn this much bigger than its first model, so it reads from a distance. */
var COIN_SCALE = 1.3;

/** An 8-point compass star (long N/E/S/W points, short diagonals), flat. */
function compassStarShape(R, r, d) {
  var sh = new THREE.Shape();
  var pts = 8;
  for (var i = 0; i < pts * 2; i++) {
    var rad = i % 2 === 0 ? (i % 4 === 0 ? R : d) : r;
    var a = Math.PI / 2 + (i * Math.PI) / pts;
    if (i === 0) sh.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); else sh.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  sh.closePath();
  return sh;
}

function getCoinTemplate() {
  if (_coinTemplate) return _coinTemplate;
  var group = new THREE.Group();
  // A brass travel token: flat-shaded brass, a lighter raised rim, an engraved (darker) compass star, and a thin ink edge
  var brass = toonMaterial(PALETTE.brass);
  var rimBrass = toonMaterial(0xf0c75e);
  var engraved = toonMaterial(PALETTE.brassDark);
  var inkEdge = new THREE.MeshBasicMaterial({ color: PALETTE.ink });

  // Minted disc: face turned toward +Z so it spins like a real coin
  var coin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 22), brass);
  coin.rotation.x = Math.PI / 2;
  group.add(coin);
  var edge = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.05, 22), inkEdge); // the ink outline, as a slightly wider thin disc
  edge.rotation.x = Math.PI / 2;
  group.add(edge);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.03, 8, 28), rimBrass);
  group.add(rim);

  // Engraved compass star on both faces
  var starGeo = new THREE.ExtrudeGeometry(compassStarShape(0.22, 0.05, 0.11), { depth: 0.012, bevelEnabled: false });
  var dot = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12);
  [1, -1].forEach(function (side) {
    var star = new THREE.Mesh(starGeo, engraved);
    star.position.z = side > 0 ? 0.036 : -0.036;
    if (side < 0) star.rotation.y = Math.PI;
    group.add(star);
    var hub = new THREE.Mesh(dot, rimBrass);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = side * 0.05;
    group.add(hub);
  });

  // The disc, rim and star pieces never move relative to each other: merge them by material so a
  // coin costs a handful of draw calls (a dozen coins on screen used to cost over 300).
  mergeStatic(group);
  markShared(group);
  group.children.forEach(function (ch) { ch.position.multiplyScalar(COIN_SCALE); ch.scale.multiplyScalar(COIN_SCALE); });
  _coinTemplate = group;
  return group;
}

// ----- Coins drawn in bulk -----
// Every coin on the track is drawn by a few shared instanced meshes (one draw call per coin part for
// ALL coins, instead of a few per coin). Each coin is still its own light object that the game moves,
// spins and collects as before; it just has nothing to draw by itself.
var _instancing = null;
var MAX_COIN_INSTANCES = 600;

/** Switch coins to instanced drawing. Call once the scene exists; safe to call twice. */
export function enableCoinInstancing(scene) {
  if (_instancing) return;
  var template = getCoinTemplate();
  var parts = [];
  var meshes = [];
  template.children.forEach(function (child) {
    if (!child.isMesh) return;
    child.updateMatrix();
    var inst = new THREE.InstancedMesh(child.geometry, child.material, MAX_COIN_INSTANCES);
    inst.count = 0;
    inst.frustumCulled = false;
    inst.userData.noMerge = true;
    inst.renderOrder = child.renderOrder;
    scene.add(inst);
    meshes.push(inst);
    parts.push(child.matrix.clone());
  });
  _instancing = { scene: scene, meshes: meshes, parts: parts };
}

export function disableCoinInstancing() {
  if (!_instancing) return;
  _instancing.meshes.forEach(function (m) {
    if (m.parent) m.parent.remove(m);
    m.dispose(); // frees the instance buffers only; the geometry and materials are shared
  });
  _instancing = null;
}

/** The shared meshes that draw every coin (so scene sweeps can leave them alone). */
export function coinInstanceMeshes() {
  return _instancing ? _instancing.meshes.slice() : [];
}

/**
 * Put the coin meshes back in the scene if anything took them out. A map change or a new run sweeps the
 * scene for old scenery; if these were swept, every coin would stay collectable but stop being drawn.
 */
export function reattachCoinInstances(scene) {
  if (!_instancing) return 0;
  var fixed = 0;
  _instancing.meshes.forEach(function (m) {
    if (m.parent !== scene) { scene.add(m); fixed++; }
  });
  return fixed;
}

/** Whether coins are currently drawn in bulk. */
export function coinInstancingActive() {
  return !!_instancing;
}

var _tmpMatrix = null;

/** Copy each coin's position into the instanced meshes. Call once per frame, after the coins have moved. */
export function syncCoinInstances(coinList) {
  if (!_instancing) return 0;
  if (!_tmpMatrix) _tmpMatrix = new THREE.Matrix4();
  var n = 0;
  for (var i = 0; i < coinList.length && n < MAX_COIN_INSTANCES; i++) {
    var c = coinList[i];
    if (!c.userData || c.userData.type !== 'coin' || c.children.length > 0 || !c.visible) continue;
    c.updateMatrixWorld(true);
    for (var k = 0; k < _instancing.meshes.length; k++) {
      _tmpMatrix.multiplyMatrices(c.matrixWorld, _instancing.parts[k]);
      _instancing.meshes[k].setMatrixAt(n, _tmpMatrix);
    }
    n++;
  }
  for (var j = 0; j < _instancing.meshes.length; j++) {
    var inst = _instancing.meshes[j];
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
  }
  return n;
}

function makeCoinMesh(lane, z, y) {
  if (_instancing) {
    var proxy = new THREE.Object3D();
    proxy.position.set(LANE_X[lane], y || 1.2, z * VISUAL_SPEED);
    proxy.userData = { lane: lane, collected: false, type: 'coin' };
    return proxy;
  }
  var group = getCoinTemplate().clone(true);
  group.position.set(LANE_X[lane], y || 1.2, z * VISUAL_SPEED);
  group.userData = { lane: lane, collected: false, type: 'coin' };
  return group;
}

// ===== COIN PATTERNS =====
// Coins fill one or two lanes at a time (never all three), and each batch starts in a different lane
// from the last, so collecting them means switching lanes.

var _lastCoinLane = -1;

function addCoin(scene, coinMeshes, lane, z, y, air) {
  var c = makeCoinMesh(lane, z, y);
  if (air) c.userData.air = true; // up in the air: it takes a jump to reach
  softenTranslucentScenery(c);
  scene.add(c);
  coinMeshes.push(c);
}

/** A lane that is not the one the previous batch used. */
function nextCoinLane(not) {
  var avoid = not === undefined ? _lastCoinLane : not;
  var lanes = [0, 1, 2].filter(function (l) { return l !== avoid; });
  return lanes[Math.floor(Math.random() * lanes.length)];
}

/** A lane next to `lane` (one step over). */
function neighbourLane(lane) {
  if (lane === 0) return 1;
  if (lane === 2) return 1;
  return Math.random() < 0.5 ? 0 : 2;
}

// Coins sit COIN_GAP apart (close, like a trail you run along), in longer runs than they used to be.

function spawnCoinLine(scene, coinMeshes, startZ) {
  var lane = nextCoinLane();
  var n = 14 + Math.floor(Math.random() * 10);
  for (var i = 0; i < n; i++) addCoin(scene, coinMeshes, lane, startZ - i * COIN_GAP);
  _lastCoinLane = lane;
  return n * COIN_GAP;
}

/** A run of coins that moves over to the next lane halfway. */
function spawnCoinSwitch(scene, coinMeshes, startZ) {
  var a = nextCoinLane();
  var b = neighbourLane(a);
  for (var i = 0; i < 9; i++) addCoin(scene, coinMeshes, a, startZ - i * COIN_GAP);
  for (var j = 0; j < 9; j++) addCoin(scene, coinMeshes, b, startZ - (10 + j) * COIN_GAP); // (a gap while the runner changes lane)
  _lastCoinLane = b;
  return 19 * COIN_GAP;
}

/** A winding S: a stretch in one lane, a stretch in the next, and back again. */
function spawnCoinZigzag(scene, coinMeshes, startZ) {
  var a = nextCoinLane();
  var b = neighbourLane(a);
  var n = 24;
  for (var i = 0; i < n; i++) {
    // groups of six, with a gap of one slot between groups for the lane change
    var group = Math.floor(i / 7);
    if (i % 7 === 6) continue;
    addCoin(scene, coinMeshes, group % 2 ? b : a, startZ - i * COIN_GAP);
  }
  _lastCoinLane = Math.floor((n - 1) / 7) % 2 ? b : a;
  return n * COIN_GAP;
}

/** An arc of coins in one lane, on the path a jump takes at the run's speed: jump to collect them all (they are in the air, so it takes a jump). */
function spawnCoinArc(scene, coinMeshes, startZ, speed) {
  var lane = nextCoinLane();
  var arc = jumpArc(speed, arcCoinCount(speed, 11));
  var half = jumpArcLength(speed) / 2;
  for (var i = 0; i < arc.length; i++) addCoin(scene, coinMeshes, lane, startZ - (half - arc[i].dz), arc[i].y, arc[i].air);
  _lastCoinLane = lane;
  return jumpArcLength(speed) + 3; // (a little run-up and run-out, so the next batch does not start on top of the landing)
}

/**
 * Coins that go with an obstacle: an arc over a jump obstacle (the jump that clears it collects them), a low trail
 * under an overhead one. They never lean toward an answer: an obstacle's lane is chosen without regard to the gates.
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D[]} coinMeshes
 * @param {{type: string, lane: number}} info what spawnObstacle returned
 * @param {number} obstacleZ the obstacle's world z when it spawned
 */
export function spawnCoinsForObstacle(scene, coinMeshes, info, obstacleZ, speed) {
  if (!info) return 0;
  var list = coinsForObstacle(info.type === 'slide' ? 'slide' : 'jump', speed);
  var middle = obstacleZ / VISUAL_SPEED;
  for (var i = 0; i < list.length; i++) addCoin(scene, coinMeshes, info.lane, middle + list[i].dz, list[i].y, list[i].air);
  return list.length;
}

/**
 * Spawn a batch of coins in a random pattern.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D[]} coinMeshes
 * @param {number} [startZ]
 * @param {number} [speed] the run's speed, which sets how long an arc is (it follows a jump)
 * @returns {number} how long the batch is (world units), so the caller can leave a gap before the next one
 */
export function spawnCoinBatch(scene, coinMeshes, startZ, speed) {
  var z = startZ || (-40 - Math.random() * 20);
  // (never two lanes at the same spot: with a coin in each of two lanes you could flick between them and take both)
  var r = Math.random() * 10;
  if (r < 4) return spawnCoinLine(scene, coinMeshes, z);
  if (r < 6) return spawnCoinSwitch(scene, coinMeshes, z);
  if (r < 8) return spawnCoinZigzag(scene, coinMeshes, z);
  return spawnCoinArc(scene, coinMeshes, z, speed);
}

/**
 * Spawn coins from a deterministic plan.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D[]} coinMeshes
 * @param {object[]} coinPlan - Array of { lane, offset, height }
 */
export function spawnCoinsFromPlan(scene, coinMeshes, coinPlan) {
  if (!coinPlan || !Array.isArray(coinPlan)) return;
  for (var i = 0; i < coinPlan.length; i++) {
    var cp = coinPlan[i];
    var c = makeCoinMesh(cp.lane, cp.offset, cp.height || 1.2);
    softenTranslucentScenery(c);
    scene.add(c);
    coinMeshes.push(c);
  }
}

// ===== POWER-UPS =====

var PU_TYPES = [
  { type: 'shield', color: PALETTE.sky, iconGeo: 'shield', label: 'SHIELD' },
  { type: 'magnet', color: PALETTE.marigold, iconGeo: 'horseshoe', label: 'MAGNET' },
  { type: 'double', color: PALETTE.teal, iconGeo: 'two-times', label: '2× SCORE' },
  { type: 'autoPilot', color: PALETTE.leaf, iconGeo: 'steering-wheel', label: 'AUTO' },
  { type: 'scoreFrenzy', color: PALETTE.red, iconGeo: 'gem', label: 'FRENZY' }
];

// ===== POWER-UP ICONS =====
// Each power-up floats a shape that shows what it does, so nobody has to memorize them:
//   shield -> a shield, magnet -> a horseshoe magnet, double -> "2×", auto-pilot -> a steering wheel,
//   score frenzy -> a gem (coins and points rain in).

// Each icon is flat-shaded enamel (the second argument used to be a glow colour; nothing glows now)
function iconMaterial(color) {
  return toonMaterial(color);
}

var _twoTimesTexture = null;
function twoTimesTexture() {
  if (_twoTimesTexture) return _twoTimesTexture;
  var canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  var ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = '900 84px system-ui, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1b2a41';
    ctx.strokeText('2\u00d7', 64, 68);
    ctx.fillStyle = '#fffbf2';
    ctx.fillText('2\u00d7', 64, 68);
  }
  _twoTimesTexture = new THREE.CanvasTexture(canvas);
  return _twoTimesTexture;
}

/**
 * @param {string} type one of the PU_TYPES
 * @returns {{icon: THREE.Object3D, flat: boolean}} flat icons face the camera instead of spinning edge-on
 */
export function buildPowerupIcon(type) {
  var g = new THREE.Group();
  var white = PALETTE.card;
  switch (type) {
    case 'shield': {
      // a heater shield with a blue field in the middle
      var outline = new THREE.Shape();
      outline.moveTo(0, 0.4); outline.lineTo(0.3, 0.3); outline.lineTo(0.3, 0.04);
      outline.quadraticCurveTo(0.3, -0.26, 0, -0.44);
      outline.quadraticCurveTo(-0.3, -0.26, -0.3, 0.04); outline.lineTo(-0.3, 0.3); outline.closePath();
      var inset = new THREE.Shape();
      inset.moveTo(0, 0.3); inset.lineTo(0.2, 0.23); inset.lineTo(0.2, 0.04);
      inset.quadraticCurveTo(0.2, -0.17, 0, -0.32);
      inset.quadraticCurveTo(-0.2, -0.17, -0.2, 0.04); inset.lineTo(-0.2, 0.23); inset.closePath();
      var body = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2 }), iconMaterial(white));
      var field = new THREE.Mesh(new THREE.ExtrudeGeometry(inset, { depth: 0.04, bevelEnabled: false }), iconMaterial(PALETTE.sky));
      body.position.z = -0.04;
      field.position.z = 0.06;
      g.add(body); g.add(field);
      return { icon: g, flat: true };
    }
    case 'magnet': {
      // a red horseshoe with silver tips, open end down
      var arc = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.075, 10, 24, Math.PI), iconMaterial(PALETTE.red));
      g.add(arc);
      [-0.2, 0.2].forEach(function (x) {
        var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 12), iconMaterial(PALETTE.red));
        leg.position.set(x, -0.11, 0);
        g.add(leg);
        var tip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12), iconMaterial(PALETTE.card));
        tip.position.set(x, -0.27, 0);
        g.add(tip);
      });
      g.position.y = 0;
      var holder = new THREE.Group();
      g.position.y = 0.06;
      holder.add(g);
      return { icon: holder, flat: true };
    }
    case 'double': {
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: twoTimesTexture(), transparent: true, depthWrite: false }));
      sprite.scale.set(0.95, 0.95, 1);
      g.add(sprite);
      return { icon: g, flat: false }; // a sprite already faces the camera
    }
    case 'autoPilot': {
      // a steering wheel: the runner steers itself
      var rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 10, 28), iconMaterial(white));
      g.add(rim);
      [90, 210, 330].forEach(function (deg) {
        var a = deg * Math.PI / 180;
        var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.27, 0.05), iconMaterial(white));
        spoke.position.set(Math.cos(a) * 0.135, Math.sin(a) * 0.135, 0);
        spoke.rotation.z = a - Math.PI / 2;
        g.add(spoke);
      });
      var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16), iconMaterial(PALETTE.leaf));
      hub.rotation.x = Math.PI / 2;
      g.add(hub);
      return { icon: g, flat: true };
    }
    case 'scoreFrenzy': {
      // a cut gem: points and coins pour in
      var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), iconMaterial(0xf08a78));
      gem.scale.set(1, 1.4, 1);
      g.add(gem);
      return { icon: g, flat: false };
    }
    default: {
      var fallback = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), iconMaterial(white));
      g.add(fallback);
      return { icon: g, flat: false };
    }
  }
}

/**
 * Spawn a random power-up orb.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D[]} coinMeshes
 * @param {object} [planEntry] - Optional deterministic plan { type, lane, offset }
 */
export function spawnPowerup(scene, coinMeshes, planEntry, disabledTypes) {
  var puDef;
  var lane;
  var spawnZ;

  if (planEntry) {
    // Deterministic
    lane = planEntry.lane;
    spawnZ = (planEntry.offset || -55) * VISUAL_SPEED;
    puDef = null;
    for (var pi = 0; pi < PU_TYPES.length; pi++) {
      if (PU_TYPES[pi].type === planEntry.type) {
        puDef = PU_TYPES[pi];
        break;
      }
    }
    if (!puDef) puDef = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
  } else {
    // Random, skipping any the player turned off (single-player rules)
    var allowed = PU_TYPES.filter(function (t) { return !disabledTypes || disabledTypes.indexOf(t.type) < 0; });
    if (allowed.length === 0) return;
    puDef = allowed[Math.floor(Math.random() * allowed.length)];
    lane = Math.floor(Math.random() * 3);
    spawnZ = -55 * VISUAL_SPEED;
  }

  var color = puDef.color;
  var group = new THREE.Group();

  // An enamel pin badge: ink rim, brass bezel, a coloured enamel field and the icon on top. Pins face the runner.
  var face = new THREE.Group();
  function disc(r, d, mat, z) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d, 28), mat);
    m.rotation.x = Math.PI / 2;
    m.position.z = z;
    face.add(m);
    return m;
  }
  disc(0.8, 0.12, new THREE.MeshBasicMaterial({ color: PALETTE.ink }), -0.01); // the ink outline
  disc(0.73, 0.16, toonMaterial(PALETTE.brass), 0);
  disc(0.63, 0.18, toonMaterial(color), 0.01);                                  // the enamel field
  var inner = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 6, 36), toonMaterial(PALETTE.card));
  inner.position.z = 0.1;
  face.add(inner);
  // the pin's little "post" and clutch show when the badge turns
  var post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), toonMaterial(PALETTE.brassDark));
  post.rotation.x = Math.PI / 2;
  post.position.z = -0.2;
  face.add(post);

  // Type-specific icon: a shape that says what the power-up does (see buildPowerupIcon)
  var made = buildPowerupIcon(puDef.type);
  var icon = made.icon;
  if (icon) {
    icon.scale.setScalar(0.95);
    icon.position.set(0, 0, 0.12);
    face.add(icon);
  }
  group.add(face);

  group.position.set(LANE_X[lane], 1.5, spawnZ);
  group.userData = {
    lane: lane,
    collected: false,
    type: 'powerup',
    powerupType: puDef.type,
    // the badge is turned back toward the camera as the orb spins, so it always reads (the engine does this for 'flat' icons)
    icon: face,
    flatIcon: true
  };

  softenTranslucentScenery(group);
  scene.add(group);
  coinMeshes.push(group);
}
