/**
 * charactermodel.js — animated glTF characters.
 *
 * Loads a .glb once, then hands out skeleton-correct clones with an
 * AnimationMixer and a small state machine (run / jump / slide / celebrate /
 * death / idle) that cross-fades between the model's authored clips.
 *
 * Loading is asynchronous. Until a model is ready the game shows the avatar's
 * procedural stand-in, then swaps to the model and fires
 * "langdash:model-ready" so the UI can rebuild.
 */

import * as THREE from 'three';
import { createGLTFLoader } from './gltfloader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { markShared } from './materials.js';
import { toonRamp, inkMaterial } from './paper.js';

var TARGET_HEIGHT = 2.05; // matches the procedural humanoids
var FADE = 0.2;

var _cache = {};    // url -> { scene, clips, height, minY }
var _loading = {};  // url -> Promise

import { STATE_CLIPS, baseClipName, findClipName, resolveClipName, heroKeyFor } from './clipnames.js';
export { baseClipName, findClipName, resolveClipName };

export function isModelReady(url) {
  return !!_cache[url];
}

/**
 * Print the model: its lit PBR materials become cel-shaded ones (flat colour bands, same colours and textures).
 * Done once on the cached original; every clone shares the result.
 */
function toonify(root) {
  var cache = {};
  root.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    var list = Array.isArray(o.material) ? o.material : [o.material];
    var out = list.map(function (m) {
      if (!m || m.isMeshToonMaterial || !(m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial)) return m;
      if (cache[m.uuid]) return cache[m.uuid];
      var t = new THREE.MeshToonMaterial({
        color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
        map: m.map || null,
        gradientMap: toonRamp(),
        side: m.side,
        transparent: m.transparent,
        opacity: m.opacity,
        alphaTest: m.alphaTest || 0,
        vertexColors: !!m.vertexColors
      });
      t.name = m.name;
      cache[m.uuid] = t;
      return t;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}

function store(url, gltf) {
  toonify(gltf.scene);
  // Skinned meshes measure wrongly until their bones' world matrices are
  // current, so update first and use the precise (posed-vertex) bounds.
  gltf.scene.updateMatrixWorld(true);
  markShared(gltf.scene);
  var box = new THREE.Box3().setFromObject(gltf.scene, true);
  _cache[url] = {
    scene: gltf.scene,
    clips: gltf.animations || [],
    height: Math.max(0.01, box.max.y - box.min.y),
    minY: box.min.y
  };
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('langdash:model-ready', { detail: { url: url } }));
}

/**
 * Start loading a model (idempotent).
 * @param {string} url
 * @returns {Promise<void>}
 */
export function loadCharacterModel(url) {
  if (_cache[url]) return Promise.resolve();
  if (_loading[url]) return _loading[url];
  _loading[url] = new Promise(function (resolve, reject) {
    createGLTFLoader().load(url, function (gltf) {
      store(url, gltf);
      delete _loading[url];
      resolve();
    }, undefined, function (err) {
      delete _loading[url];
      reject(err);
    });
  });
  return _loading[url];
}

/**
 * Register a model from bytes already in memory (used by tests and tooling).
 * @param {string} url
 * @param {ArrayBuffer} buffer
 */
export function parseCharacterModel(url, buffer) {
  return new Promise(function (resolve, reject) {
    createGLTFLoader().parse(buffer, '', function (gltf) { store(url, gltf); resolve(); }, reject);
  });
}

class ModelAnimator {
  constructor(root, clips, heroKey) {
    this.heroKey = heroKey || '';
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = {};
    var self = this;
    this.clipNames = clips.map(function (c) { return c.name; });
    clips.forEach(function (clip) { self.actions[clip.name] = self.mixer.clipAction(clip); });
    this.state = null;
    this.current = null;
  }

  /** True when the model has its own clip for this state (not just the run cycle standing in for it). */
  hasClip(state) {
    var resolved = resolveClipName(this.clipNames, state, this.heroKey);
    return !!resolved && resolved.state === state;
  }

  setState(state) {
    if (state === this.state) return;
    var resolved = resolveClipName(this.clipNames, state, this.heroKey);
    var def = STATE_CLIPS[resolved ? resolved.state : state];
    var next = resolved && this.actions[resolved.clip];
    if (!next) return;
    var prev = this.current;
    next.reset();
    next.setLoop(def.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = !!def.clamp;
    next.timeScale = def.scale || 1;
    next.enabled = true;
    next.fadeIn(FADE).play();
    if (prev && prev !== next) prev.fadeOut(FADE);
    this.current = next;
    this.state = state;
  }

  update(dt) {
    this.mixer.update(dt);
  }
}

/**
 * Repaint materials on a clone. `tints` is a list of { names, color }: every material whose name is in
 * `names` gets `color`. The shared materials are never touched (each repainted one is a copy).
 */
function applyTint(root, tints) {
  var byName = {};
  tints.forEach(function (t) {
    if (!t || !t.names || !t.color) return;
    var c = new THREE.Color(t.color);
    t.names.forEach(function (n) { byName[n] = { color: c, flat: !!t.flat }; });
  });
  root.traverse(function (o) {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    var hit = byName[o.material.name];
    if (!hit) return;
    var m = o.material.clone();
    m.color.copy(hit.color);
    if (hit.flat) m.map = null; // a flat piece (hair, a hood) takes the exact color; a painted one is only tinted
    m.userData.shared = false;
    o.material = m;
  });
}

var OUTLINE_WORLD = 0.016; // outline thickness in world units (about 1% of the runner's height)

/**
 * A thin navy ink outline: a copy of each skinned mesh, inflated along its normals and drawn back-faces only.
 * It shares the geometry and the skeleton, so it animates for free.
 */
function addInkOutline(root) {
  var skinned = [];
  root.updateMatrixWorld(true);
  root.traverse(function (o) { if (o.isSkinnedMesh && o.geometry && !o.userData.inkHull) skinned.push(o); });
  skinned.forEach(function (o) {
    // thickness in this mesh's own units: the world width, undone by the mesh's total world scale (model scale and node scales)
    var e = o.matrixWorld.elements;
    var local = OUTLINE_WORLD / Math.max(1e-6, Math.hypot(e[0], e[1], e[2]));
    var hull = new THREE.SkinnedMesh(o.geometry, inkMaterial(local, undefined, true));
    hull.bind(o.skeleton, o.bindMatrix);
    hull.frustumCulled = false;
    hull.userData.inkHull = true;
    hull.name = (o.name || 'mesh') + '_ink';
    hull.matrixAutoUpdate = o.matrixAutoUpdate;
    hull.position.copy(o.position);
    hull.quaternion.copy(o.quaternion);
    hull.scale.copy(o.scale);
    if (o.parent) o.parent.add(hull);
  });
}

/**
 * Build a character from a loaded model.
 * @param {string} url
 * @param {number} [scale] avatar scale multiplier
 * @param {number} [height] world height
 * @param {Array<{names: string[], color: number}>|{names: string[], color: number}} [tint] repaint the materials with these names (the character's recolored parts)
 * @returns {THREE.Group|null} null if the model is not loaded yet
 */
export function buildModelCharacter(url, scale, height, tint) {
  var entry = _cache[url];
  if (!entry) return null;

  var root = cloneSkinned(entry.scene);
  var tints = Array.isArray(tint) ? tint : (tint ? [tint] : []);
  if (tints.length) applyTint(root, tints);
  var k = ((height || TARGET_HEIGHT) * (scale || 1)) / entry.height;
  root.scale.setScalar(k);
  root.position.y = -entry.minY * k;
  root.rotation.y = Math.PI; // the model faces +Z; gameplay faces -Z

  addInkOutline(root);

  var pg = new THREE.Group();
  pg.add(root);
  pg.userData.isModel = true;
  pg.userData.animator = new ModelAnimator(root, entry.clips, heroKeyFor(url));
  pg.userData.animator.setState('run');
  return pg;
}

/**
 * Build a monster from a loaded model. Unlike a character, every material is
 * copied (the whole monster fades in and out) and it faces the camera.
 * @param {string} url
 * @param {number} [height] world height before the engine scales it
 * @returns {THREE.Group|null} null if the model is not loaded yet
 */
export function buildModelMonster(url, height) {
  var pg = buildModelCharacter(url, 1, height || 5.5);
  if (!pg) return null;
  var root = pg.children[0];
  // (a monster fades as a whole and keeps its own look: no shared outline hulls)
  var hulls = [];
  root.traverse(function (o) { if (o.userData && o.userData.inkHull) hulls.push(o); });
  hulls.forEach(function (h) { if (h.parent) h.parent.remove(h); });
  // Like the runner, monsters face -Z: they chase, so they look at the runner (their back is to the camera)
  root.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    o.material = Array.isArray(o.material)
      ? o.material.map(function (m) { var c = m.clone(); c.userData.shared = false; return c; })
      : Object.assign(o.material.clone(), {});
    // Each monster owns its materials (it fades them); geometry stays shared
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.userData.shared = false; });
    o.frustumCulled = false; // skinned bounds are unreliable once animated/scaled
  });
  pg.userData.isModelMonster = true;
  pg.userData.animator.setState('idle');
  return pg;
}

/**
 * Advance a model character's animation.
 * @param {THREE.Object3D} pg
 * @param {number} dt seconds
 * @param {string} [state] run | jump | slide | celebrate | death | idle | wave
 * @returns {boolean} true if pg is a model character
 */
export function updateModelAnimation(pg, dt, state) {
  var animator = pg && pg.userData && pg.userData.animator;
  if (!animator) return false;
  if (state) animator.setState(state);
  animator.update(dt);
  return true;
}

/** Names of the clips the model actually provides (for tests and tooling). */
export function getModelClipNames(url) {
  var entry = _cache[url];
  return entry ? entry.clips.map(function (c) { return c.name; }) : [];
}
