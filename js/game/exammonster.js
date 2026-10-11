/**
 * exammonster.js — the Hush (the file and identifiers are kept from the original "exam monster")
 *
 * The Hush is the creeping silence that eats words, and it chases the player.
 * It's a flat black-ink blot with cream paper eyes, ink drips, a droopy red nightcap, orbiting question marks
 * (the words it has swallowed) and, on its back, a paper speech bubble with the shush mark. Nothing glows.
 *
 * Built entirely from Three.js primitives.
 *
 * AGENT 15 CHANGES:
 * - Disposes replaced monsters properly (architecture §24, §31)
 * - Shares animation conventions with homecharacter.js (absolute positioning)
 * - Honors reduced motion setting
 * - Supports end-run celebration animation (monster retreats)
 */

import * as THREE from 'three';
import { PALETTE, newToon } from './paper.js';

/**
 * Dispose all geometry and materials within a group recursively.
 * @param {THREE.Object3D} obj
 */
/** Models copied from a cache share their geometry and materials: never free those with one copy. */
function isSharedMaterial(m) {
  var x = Array.isArray(m) ? m[0] : m;
  return !!(x && x.userData && x.userData.shared);
}

function disposeGroup(obj) {
    if (!obj) return;
    if (obj.children) {
        for (var i = obj.children.length - 1; i >= 0; i--) {
            disposeGroup(obj.children[i]);
        }
    }
    if (obj.geometry && !(obj.geometry.userData && obj.geometry.userData.shared)) obj.geometry.dispose();
    if (obj.material && !isSharedMaterial(obj.material)) {
        if (Array.isArray(obj.material)) {
            for (var m = 0; m < obj.material.length; m++) {
                if (obj.material[m].map) obj.material[m].map.dispose();
                obj.material[m].dispose();
            }
        } else {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
        }
    }
}

// ===== THE HUSH: a flat black-ink blot with a speech bubble full of silence =====
// Ink-navy shapes with cream paper eyes, a droopy red nightcap, and on its back (the side the camera sees) a big paper
// speech bubble with a "shh" finger over lips. Nothing glows. Part names and groups are the ones the engine animates.

function inkToon(color) { return newToon(color === undefined ? PALETTE.ink : color); }

/** A sphere pushed in and out into a lumpy blot (deterministic, so every Hush is the same shape). */
function blotGeometry(radius) {
    var geo = new THREE.SphereGeometry(radius, 18, 14);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
        var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        var n = Math.sin(x * 3.1 + 1.3) * Math.cos(y * 2.7) * 0.08 + Math.sin(z * 3.7 + y * 2.1) * 0.07 + Math.sin(x * 5.3 + z * 4.1) * 0.03;
        var k = 1 + n;
        pos.setXYZ(i, x * k, y * k * (y < 0 ? 0.92 : 1), z * k);
    }
    geo.computeVertexNormals();
    return geo;
}

function paintBubble() {
    if (typeof document === 'undefined') return null;
    var canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 256;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;
    var ink = '#1b2a41';
    // the bubble: a rounded card with a tail, cream fill and a thick ink outline
    function bubblePath() {
        var x = 14, y = 14, w = 292, h = 186, r = 44;
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(210, y + h); ctx.lineTo(236, 246); ctx.lineTo(160, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
    bubblePath();
    ctx.fillStyle = '#fffbf2';
    ctx.fill();
    ctx.lineWidth = 12; ctx.lineJoin = 'round'; ctx.strokeStyle = ink;
    ctx.stroke();
    // "shhh" lettering
    ctx.fillStyle = ink;
    ctx.font = '900 62px "Fraunces","Georgia",serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SHHH', 120, 106);
    // the shush mark: pursed lips with a finger laid across them
    ctx.fillStyle = '#d9432c';
    ctx.beginPath(); ctx.ellipse(252, 140, 44, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(214, 140); ctx.lineTo(290, 140); ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#f2c7a0';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(238, 34, 28, 118, 14); else ctx.rect(238, 34, 28, 118);
    ctx.fill();
    ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#fffbf2';
    ctx.beginPath(); ctx.ellipse(252, 52, 8, 11, 0, 0, Math.PI * 2); ctx.fill(); // the nail
    var tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export function buildExamMonster() {
    var g = new THREE.Group();

    // ===== MAIN BODY: a big ink blot =====
    var bodyMat = inkToon(PALETTE.ink);
    var body = new THREE.Mesh(blotGeometry(1.2), bodyMat);
    body.name = 'monsterBody';
    g.add(body);

    // A pale second outline around the blot (a flat translucent shape, the old "aura"); the engine fades it in as danger grows
    var auraMat = new THREE.MeshBasicMaterial({
        color: PALETTE.ink,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    var aura = new THREE.Mesh(new THREE.SphereGeometry(1.42, 14, 12), auraMat);
    aura.name = 'monsterAura';
    g.add(aura);

    // ===== EYES: flat cream paper eyes with ink pupils =====
    var eyeMat = new THREE.MeshBasicMaterial({ color: PALETTE.card });
    var pupilMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink });

    var eyePositions = [
        { x: -0.4, y: 0.5, z: -0.95, size: 0.16 },
        { x: 0.4, y: 0.5, z: -0.95, size: 0.16 },
        { x: -0.2, y: 0.76, z: -0.88, size: 0.09 },
        { x: 0.2, y: 0.76, z: -0.88, size: 0.09 },
        { x: -0.58, y: 0.26, z: -0.8, size: 0.08 },
        { x: 0.58, y: 0.26, z: -0.8, size: 0.08 }
    ];

    var eyes = [];
    for (var ei = 0; ei < eyePositions.length; ei++) {
        var ep = eyePositions[ei];
        var eye = new THREE.Mesh(new THREE.SphereGeometry(ep.size, 10, 8), eyeMat);
        eye.position.set(ep.x, ep.y, ep.z);
        eye.scale.set(1, 1.15, 0.6);
        g.add(eye);
        eyes.push(eye);
        var pupil = new THREE.Mesh(new THREE.SphereGeometry(ep.size * 0.5, 8, 6), pupilMat);
        pupil.position.set(ep.x * 0.97, ep.y - ep.size * 0.1, ep.z - ep.size * 0.55);
        g.add(pupil);
    }

    // ===== MOUTH: a small round "shh" mouth =====
    var mouthMat = new THREE.MeshBasicMaterial({ color: 0x0b1320 });
    var mouth = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.4),
        mouthMat
    );
    mouth.position.set(0, -0.3, -0.8);
    mouth.rotation.x = 0.2;
    mouth.name = 'monsterMouth';
    g.add(mouth);

    // ===== DRIPS (the old tentacles): ink pseudopods with rounded ends =====
    var tentacleMat = inkToon(0x24344f);

    var tentacles = [];
    var tentacleConfigs = [
        { angle: 0, offsetY: -0.6, len: 1.8, radius: 0.1 },
        { angle: Math.PI * 0.3, offsetY: -0.4, len: 1.5, radius: 0.08 },
        { angle: -Math.PI * 0.3, offsetY: -0.4, len: 1.5, radius: 0.08 },
        { angle: Math.PI * 0.6, offsetY: -0.2, len: 1.2, radius: 0.07 },
        { angle: -Math.PI * 0.6, offsetY: -0.2, len: 1.2, radius: 0.07 },
        { angle: Math.PI * 0.15, offsetY: 0.1, len: 1.6, radius: 0.09 },
        { angle: -Math.PI * 0.15, offsetY: 0.1, len: 1.6, radius: 0.09 }
    ];

    for (var tci = 0; tci < tentacleConfigs.length; tci++) {
        var tc = tentacleConfigs[tci];
        var tentGroup = new THREE.Group();

        var segCount = 6;
        for (var seg = 0; seg < segCount; seg++) {
            var segRadius = tc.radius * (1 - seg / segCount * 0.6);
            var segLen = tc.len / segCount;
            var tentSeg = new THREE.Mesh(
                new THREE.CylinderGeometry(segRadius, segRadius * 1.1, segLen, 6),
                tentacleMat
            );
            tentSeg.position.y = -seg * segLen;
            tentSeg.rotation.x = seg * 0.15;
            tentSeg.rotation.z = Math.sin(seg * 0.5) * 0.1;
            tentGroup.add(tentSeg);
        }

        // A round ink drop at the end
        var tip = new THREE.Mesh(new THREE.SphereGeometry(tc.radius * 0.9, 8, 6), tentacleMat);
        tip.position.y = -tc.len;
        tentGroup.add(tip);

        tentGroup.position.set(
            Math.sin(tc.angle) * 0.8,
            tc.offsetY,
            Math.cos(tc.angle) * -0.8
        );
        tentGroup.rotation.x = -0.5;
        tentGroup.rotation.z = tc.angle * 0.3;

        g.add(tentGroup);
        tentacles.push(tentGroup);
    }

    // ===== NIGHTCAP (a droopy, sleepy hat: the Hush puts words to sleep), now in stamp red and cream =====
    var capGroup = new THREE.Group();
    var board = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 10), newToon(PALETTE.red));
    board.position.y = 0.45;
    board.rotation.z = -0.25;
    capGroup.add(board);

    var capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.14, 10), newToon(PALETTE.card));
    capBase.position.y = -0.02;
    capGroup.add(capBase);

    var tassel = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), newToon(PALETTE.card));
    tassel.position.set(-0.2, 0.98, 0);
    capGroup.add(tassel);

    capGroup.position.set(0, 1.3, 0);
    capGroup.rotation.z = 0.15;
    capGroup.rotation.x = -0.1;
    g.add(capGroup);

    // ===== ORBITING QUESTION MARKS (the words it has swallowed): ink-black glyphs =====
    var questionMarks = [];
    var qmMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink });

    for (var qi = 0; qi < 5; qi++) {
        var qmGroup = new THREE.Group();

        var qCurve = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 10, Math.PI * 1.5), qmMat);
        qmGroup.add(qCurve);
        var qStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 5), qmMat);
        qStem.position.set(0.1, -0.07, 0);
        qmGroup.add(qStem);
        var qDot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), qmMat);
        qDot.position.set(0.1, -0.15, 0);
        qmGroup.add(qDot);

        qmGroup.userData.orbitAngle = (qi / 5) * Math.PI * 2;
        qmGroup.userData.orbitRadius = 2.0;
        qmGroup.userData.orbitSpeed = 0.8 + qi * 0.15;
        qmGroup.userData.orbitHeight = (qi - 2) * 0.4;

        g.add(qmGroup);
        questionMarks.push(qmGroup);
    }

    // ===== INK SPECKS floating off the blot =====
    var particleMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.7 });
    for (var pi = 0; pi < 10; pi++) {
        var particle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), particleMat.clone());
        particle.position.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 2
        );
        particle.userData.driftPhase = Math.random() * Math.PI * 2;
        particle.userData.driftSpeed = 0.5 + Math.random() * 0.5;
        g.add(particle);
    }

    // ===== BACK VIEW (this is the side the player's camera sees) =====
    // The monster faces the runner, so the camera looks at its back: a paper speech bubble full of silence, a drippy ridge
    // of ink spikes and long ink arms with paper claws reaching past the body toward the player.
    var ridgeMat = inkToon(0x24344f);
    var ridge = [];
    for (var ri = 0; ri < 7; ri++) {
        var spike = new THREE.Mesh(new THREE.ConeGeometry(0.11 - ri * 0.006, 0.55 - Math.abs(ri - 3) * 0.05, 5), ridgeMat);
        var ra = -0.9 + ri * 0.3;               // arc over the top-back
        spike.position.set(0, Math.sin(ra + 0.9) * 0.75 + 0.55, 0.95 - Math.cos(ra + 0.9) * 0.55);
        spike.rotation.x = 0.7 - ri * 0.18;
        g.add(spike);
        ridge.push(spike);
    }

    var bubbleTex = paintBubble();
    var label = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 1.52),
        new THREE.MeshBasicMaterial({ map: bubbleTex, color: bubbleTex ? 0xffffff : PALETTE.card, transparent: true, depthWrite: false })
    );
    label.position.set(0, 0.1, 1.3);
    g.add(label);

    // (the old pulsing ring): a thin ink ring behind the bubble that the engine pulses as the Hush closes in
    var backRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.04, 6, 32),
        new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.8 })
    );
    backRing.position.set(0, 0.05, 1.05);
    g.add(backRing);

    var clawMat = inkToon(0x24344f);
    var boneMat = newToon(PALETTE.card);
    for (var side = -1; side <= 1; side += 2) {
        var arm = new THREE.Group();
        var upper = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.3, 7), clawMat);
        upper.rotation.x = Math.PI / 2 - 0.35;
        upper.position.set(0, 0, -0.55);
        arm.add(upper);
        var fore = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.1, 7), clawMat);
        fore.rotation.x = Math.PI / 2 + 0.2;
        fore.position.set(0, -0.28, -1.5);
        arm.add(fore);
        for (var fi = -1; fi <= 1; fi++) {
            var claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42, 5), boneMat);
            claw.rotation.x = -Math.PI / 2;
            claw.position.set(fi * 0.11, -0.3, -2.2);
            arm.add(claw);
        }
        arm.position.set(side * 1.25, 0.1, 0);
        arm.rotation.y = -side * 0.12;
        g.add(arm);
    }

    // Store references for animation
    g.userData.monsterParts = {
        ridge: ridge,
        backRing: backRing,
        eyes: eyes,
        tentacles: tentacles,
        mouth: mouth,
        questionMarks: questionMarks,
        body: body,
        aura: aura
    };

    return g;
}

/**
 * Get monster animation part references from a built monster group.
 * @param {THREE.Group} monsterGroup
 * @returns {object}
 */
export function getMonsterParts(monsterGroup) {
    return monsterGroup.userData.monsterParts || {
        eyes: [],
        tentacles: [],
        mouth: null,
        questionMarks: [],
        ridge: [],
        backRing: null,
        body: null,
        aura: null
    };
}

/**
 * Safely dispose a monster group and all its GPU resources.
 * Prevents GPU memory leaks when monsters are replaced (architecture §31).
 * @param {THREE.Scene} scene
 * @param {THREE.Group} monsterGroup
 */
export function disposeExamMonster(scene, monsterGroup) {
    if (!monsterGroup) return;
    scene.remove(monsterGroup);
    disposeGroup(monsterGroup);
}
