/**
 * cosmetfit.js — where on an animated hero a hat, a piece of gear or an outfit goes.
 *
 * Every hero model has its own rig and its own shape (a blocky tester, a llama, a fox with a tail), so instead of
 * guessing, the head and the torso are measured: the vertices that belong to the head bone (or the bones that make up
 * the torso) are boxed, in the model's rest pose. The hat then sits on top of that head box, scaled to its width, and
 * gear and clothing are scaled to the torso and centred on it. Models that are not skinned (a rig made of plain nodes)
 * are measured by the meshes under the matching nodes. Returns null when a part cannot be found: the caller then falls
 * back to the classic runner's proportions.
 */

import * as THREE from 'three';

var HEAD_RE = /(^|[^a-z])head([^a-z]|$)/i;
var TORSO_RE = /(^|[^a-z])(chest|spine|torso|upperchest)([^a-z]|$)/i;
var NOT_TORSO_RE = /(head|neck|arm|hand|leg|foot|tail|hip|clav|finger|thumb|ear|eye|jaw|hat|hair)/i;

/** The first node (bone or plain group) whose name matches. */
export function findNode(root, patterns) {
  var nodes = [];
  root.traverse(function (o) { if (!o.isMesh && !o.isLight && o.name) nodes.push(o); });
  for (var i = 0; i < patterns.length; i++) {
    for (var j = 0; j < nodes.length; j++) if (patterns[i].test(nodes[j].name)) return nodes[j];
  }
  return null;
}

/** Every node under (and including) `node`. */
function subtree(node) {
  var out = [];
  node.traverse(function (o) { out.push(o); });
  return out;
}

/**
 * The box (in the space of `space`, an ancestor of root) of everything that moves with the given nodes.
 * @param {THREE.Object3D} root the model
 * @param {THREE.Object3D[]} nodes the bones/nodes that count
 * @param {THREE.Object3D} space
 */
export function boxOfNodes(root, nodes, space) {
  var set = {};
  nodes.forEach(function (n) { set[n.uuid] = true; });
  var box = new THREE.Box3();
  var v = new THREE.Vector3();
  var any = false;
  space.updateMatrixWorld(true);
  var inv = new THREE.Matrix4().copy(space.matrixWorld).invert();
  root.traverse(function (o) {
    if (!o.isMesh || o.userData.inkHull) return;
    if (o.isSkinnedMesh && o.geometry.attributes.skinIndex && o.skeleton) {
      var idx = o.geometry.attributes.skinIndex;
      var wts = o.geometry.attributes.skinWeight;
      var bones = o.skeleton.bones;
      var mw = new THREE.Matrix4();
      for (var i = 0; i < idx.count; i++) {
        var best = 0, bw = -1;
        for (var k = 0; k < 4; k++) { var w = wts.getComponent(i, k); if (w > bw) { bw = w; best = idx.getComponent(i, k); } }
        var bone = bones[best];
        if (bone && set[bone.uuid]) {
          o.getVertexPosition(i, v);
          mw.multiplyMatrices(inv, o.matrixWorld);
          v.applyMatrix4(mw);
          box.expandByPoint(v);
          any = true;
        }
      }
    } else {
      // an ordinary mesh counts when it is a direct child of one of the nodes
      var p = o.parent;
      if (p && set[p.uuid]) {
        var b = new THREE.Box3().setFromObject(o);
        b.applyMatrix4(inv);
        box.union(b);
        any = true;
      }
    }
  });
  return any ? box : null;
}

/** The head of a hero: { box, bone } in the space of `space`, or null. */
export function measureHead(root, space) {
  var node = findNode(root, [/^(mixamorig[:_]?)?head$/i, HEAD_RE]);
  if (!node) return null;
  var box = boxOfNodes(root, subtree(node), space);
  return box ? { box: box, node: node } : null;
}

/** The torso of a hero: { box (or null when it cannot be measured), node (the bone gear and clothing follow, or null) }, or null. */
export function measureTorso(root, space) {
  var nodes = [];
  root.traverse(function (o) { if (!o.isMesh && o.name && TORSO_RE.test(o.name) && !NOT_TORSO_RE.test(o.name.replace(TORSO_RE, ''))) nodes.push(o); });
  var box = nodes.length ? boxOfNodes(root, nodes, space) : null;
  if (box) {
    var sz = box.getSize(new THREE.Vector3());
    if (sz.y < 0.2 || sz.x < 0.2) box = null; // too few vertices to trust: use the classic proportions
  }
  // follow the highest of the torso bones (the chest), or the last one found
  var follow = findNode(root, [/^(mixamorig[:_]?)?(upper[ _.]?chest|chest)$/i, /spine[ _.]?(2|3)$/i, /spine/i, /torso/i, /body/i]) || nodes[nodes.length - 1] || null;
  return follow || box ? { box: box, node: follow } : null;
}

/** The hips of a hero (what a hip-worn thing follows), or null. */
export function findHips(root) {
  return findNode(root, [/^(mixamorig[:_]?)?hips?$/i, /(^|[^a-z])hips?([^a-z]|$)/i, /pelvis/i]);
}
