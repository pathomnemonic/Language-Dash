/**
 * player.js — Avatar-based player character builder
 *
 * AGENT 15 REPLACEMENT — Architecture contract §24, §31:
 * - Disposes replaced characters properly
 * - Shares animation conventions (absolute positioning, no accumulative +=)
 * - Vehicle cosmetic compatibility: items declare compatibility;
 *   incompatible items are NOT silently hidden — the UI must explain
 * - Supports end-run celebration animation
 * - Honors reduced motion
 * - Chibi/cartoon proportions with rounded limbs
 * - All 13 avatar variants including 3 vehicles
 * - Clothing system support
 * - Faceplant animation support
 *
 * FIX: Vehicle facing direction — all vehicle builders apply
 * pg.rotation.y = Math.PI / 2 so eyes face negative Z (forward
 * in gameplay) instead of negative X (sideways).
 */

import * as THREE from 'three';
import { storage } from '../storage.js';
import { SHOP_ITEMS, AVATARS } from './shopdata.js';
import { loadCharacterModel, buildModelCharacter } from './charactermodel.js';
import { useCharacterModels } from './quality.js';
import { paperizeMaterials } from './paper.js';
import { buildHat, buildGear, buildClothing, gearSlot } from './cosmetics.js';
import { measureHead, measureTorso, findHips } from './cosmetfit.js';

// ===== HELPERS =====

/**
 * Dispose all geometry and materials within a group recursively.
 * @param {THREE.Object3D} obj
 */
/** Models copied from a cache share their geometry and materials: never free those with one copy. */
function isSharedMaterial(m) {
  var x = Array.isArray(m) ? m[0] : m;
  return !!(x && x.userData && x.userData.shared);
}

export function disposeCharacter(obj) {
    if (!obj) return;
    for (var i = obj.children.length - 1; i >= 0; i--) {
        disposeCharacter(obj.children[i]);
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

export function getAvatarConfig() {
    var equipped = storage.get('equipped');
    var skinId = equipped.skin || 'avatar_intern';
    var found = AVATARS[0];
    for (var i = 0; i < AVATARS.length; i++) {
        if (AVATARS[i].id === skinId) { found = AVATARS[i]; break; }
    }
    return applyColorOverrides(found);
}

var COLOR_KEYS = { hair: 'hairColor', skin: 'skinColor', body: 'bodyColor', pants: 'pantsColor', shoe: 'shoeColor' };

/**
 * Apply the player's custom colors (Locker -> Colors) to a humanoid avatar.
 * Vehicles are left alone. Returns a copy; shop data is never mutated.
 */
function applyColorOverrides(avatar) {
    if (avatar.isVehicle) return avatar;
    var custom = storage.get('avatarColors');
    if (!custom || typeof custom !== 'object') return avatar;
    var out = Object.assign({}, avatar);
    Object.keys(COLOR_KEYS).forEach(function (k) {
        var hex = custom[k];
        if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
            out[COLOR_KEYS[k]] = parseInt(hex.slice(1), 16);
        }
    });
    return out;
}

// ===== HELPER: rounded limb (cylinder with sphere caps) =====
function buildRoundedLimb(radius, length, color) {
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: color });

    var cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, length, 8),
        mat
    );
    g.add(cyl);

    var topCap = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 8, 6),
        mat
    );
    topCap.position.y = length / 2;
    g.add(topCap);

    var botCap = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 8, 6),
        mat
    );
    botCap.position.y = -length / 2;
    g.add(botCap);

    return g;
}

// ===== HELPER: move a limb's rotation origin to its joint =====
// Limbs are built centered on their own geometry, so rotating them swings the
// limb about its middle (thigh/upper arm) and looks wrong. Shift the contents
// so the group's origin is the hip/shoulder, keeping the rest pose unchanged.
function pivotLimbAtTop(group, length) {
    var half = length / 2;
    for (var i = 0; i < group.children.length; i++) {
        group.children[i].position.y -= half;
    }
    group.position.y += half;
}

// ===== HELPER: toon shading + ink outline =====
var _toonGradient = null;
function getToonGradient() {
    if (!_toonGradient) {
        // Three-band ramp gives the flat, readable shading of a stylized game.
        _toonGradient = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
        _toonGradient.minFilter = THREE.NearestFilter;
        _toonGradient.magFilter = THREE.NearestFilter;
        _toonGradient.needsUpdate = true;
    }
    return _toonGradient;
}

function stylizeCharacter(root) {
    var gradient = getToonGradient();
    var outlineMat = new THREE.MeshBasicMaterial({ color: 0x14102a, side: THREE.BackSide });
    var toonCache = {};
    var meshes = [];
    root.traverse(function (o) { if (o.isMesh) meshes.push(o); });

    meshes.forEach(function (m) {
        var mat = m.material;
        if (mat && mat.isMeshStandardMaterial) {
            var toon = toonCache[mat.uuid];
            if (!toon) {
                toon = new THREE.MeshToonMaterial({
                    color: mat.color,
                    gradientMap: gradient,
                    emissive: mat.emissive,
                    emissiveIntensity: mat.emissiveIntensity,
                    transparent: mat.transparent,
                    opacity: mat.opacity,
                    side: mat.side
                });
                toonCache[mat.uuid] = toon;
            }
            m.material = toon;
            mat = toon;
        }

        // Outline solid volumes only (skip flat decals, glows and tiny details).
        if (!mat || mat.transparent || mat.isMeshBasicMaterial) return;
        var type = m.geometry && m.geometry.type;
        if (type === 'PlaneGeometry' || type === 'CircleGeometry') return;
        m.geometry.computeBoundingSphere();
        if (!m.geometry.boundingSphere || m.geometry.boundingSphere.radius < 0.05) return;

        var outline = new THREE.Mesh(m.geometry, outlineMat);
        outline.scale.setScalar(1.09);
        outline.userData.isOutline = true;
        m.add(outline);
    });
}

// ===== HELPER: build a capsule-shaped body =====
function buildCapsuleBody(radiusTop, radiusBottom, length, color) {
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: color });

    try {
        var capsule = new THREE.Mesh(
            new THREE.CapsuleGeometry(radiusTop, length, 8, 12),
            mat
        );
        g.add(capsule);
    } catch (e) {
        var cyl = new THREE.Mesh(
            new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 10),
            mat
        );
        g.add(cyl);
        var top = new THREE.Mesh(new THREE.SphereGeometry(radiusTop, 10, 8), mat);
        top.position.y = length / 2;
        g.add(top);
        var bot = new THREE.Mesh(new THREE.SphereGeometry(radiusBottom, 10, 8), mat);
        bot.position.y = -length / 2;
        g.add(bot);
    }

    return g;
}

// ===== VEHICLE BUILDERS =====

function buildAmbulanceVehicle(avatar) {
    var pg = new THREE.Group();
    var s = avatar.scale || 1.3;

    var bodyMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    var body = new THREE.Mesh(
        new THREE.BoxGeometry(1.4 * s, 0.7 * s, 0.9 * s),
        bodyMat
    );
    body.position.set(0, 0.6 * s, 0);
    body.castShadow = true;
    body.name = 'vehicleBody';
    pg.add(body);

    var cabMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    var cab = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 * s, 0.5 * s, 0.85 * s),
        cabMat
    );
    cab.position.set(-0.8 * s, 0.5 * s, 0);
    pg.add(cab);

    var windshieldMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 });
    var windshield = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35 * s, 0.7 * s),
        windshieldMat
    );
    windshield.position.set(-1.05 * s, 0.55 * s, 0);
    windshield.rotation.y = Math.PI / 2;
    pg.add(windshield);

    var stripeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    var stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.42 * s, 0.1 * s, 0.92 * s),
        stripeMat
    );
    stripe.position.set(0, 0.65 * s, 0);
    pg.add(stripe);

    var crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.2 * s, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    crossH.position.set(0.2 * s, 0.8 * s, 0.46 * s);
    pg.add(crossH);
    var crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.06, 0.2 * s),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    crossV.position.set(0.2 * s, 0.8 * s, 0.46 * s);
    pg.add(crossV);

    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    var wheelPositions = [
        [-0.45 * s, 0.15 * s, 0.48 * s],
        [-0.45 * s, 0.15 * s, -0.48 * s],
        [0.45 * s, 0.15 * s, 0.48 * s],
        [0.45 * s, 0.15 * s, -0.48 * s]
    ];
    var wheels = [];
    for (var wi = 0; wi < wheelPositions.length; wi++) {
        var wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 0.08 * s, 12),
            wheelMat
        );
        wheel.position.set(wheelPositions[wi][0], wheelPositions[wi][1], wheelPositions[wi][2]);
        wheel.rotation.x = Math.PI / 2;
        wheel.name = 'wheel_' + wi;
        pg.add(wheel);
        wheels.push(wheel);
    }

    var light1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 * s, 0.1 * s, 0.12 * s),
        new THREE.MeshBasicMaterial({ color: 0xff4444 })
    );
    light1.position.set(-0.15 * s, 0.98 * s, 0);
    light1.name = 'light_0';
    pg.add(light1);

    var light2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 * s, 0.1 * s, 0.12 * s),
        new THREE.MeshBasicMaterial({ color: 0x4444ff })
    );
    light2.position.set(0.15 * s, 0.98 * s, 0);
    light2.name = 'light_1';
    pg.add(light2);

    var eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (var ex = -1; ex <= 1; ex += 2) {
        var eyeW = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 * s, 8, 8),
            eyeWhiteMat
        );
        eyeW.position.set(-1.0 * s, 0.6 * s, ex * 0.2 * s);
        pg.add(eyeW);

        var pupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.04 * s, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        pupil.position.set(-1.06 * s, 0.6 * s, ex * 0.2 * s);
        pg.add(pupil);
    }

    pg.userData.wheels = wheels;
    pg.userData.isVehicle = true;
    pg.userData.vehicleType = 'ambulance';
    pg.rotation.y = Math.PI / 2;

    return pg;
}

function buildRaceCarVehicle(avatar) {
    var pg = new THREE.Group();
    var s = avatar.scale || 1.3;

    var bodyMat = new THREE.MeshStandardMaterial({ color: 0xdd2222 });
    var body = new THREE.Mesh(
        new THREE.BoxGeometry(1.6 * s, 0.4 * s, 0.8 * s),
        bodyMat
    );
    body.position.set(0, 0.4 * s, 0);
    body.castShadow = true;
    body.name = 'vehicleBody';
    pg.add(body);

    var cockpitMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });
    var cockpit = new THREE.Mesh(
        new THREE.SphereGeometry(0.25 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        cockpitMat
    );
    cockpit.position.set(-0.1 * s, 0.6 * s, 0);
    pg.add(cockpit);

    var spoilerMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
    var spoilerWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.05 * s, 0.02 * s, 0.7 * s),
        spoilerMat
    );
    spoilerWing.position.set(0.7 * s, 0.7 * s, 0);
    pg.add(spoilerWing);
    for (var ss = -1; ss <= 1; ss += 2) {
        var support = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.25 * s, 6),
            spoilerMat
        );
        support.position.set(0.7 * s, 0.55 * s, ss * 0.25 * s);
        pg.add(support);
    }

    var crossH2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.2 * s, 0.04, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    crossH2.position.set(0, 0.62 * s, 0.41 * s);
    pg.add(crossH2);
    var crossV2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.2 * s),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    crossV2.position.set(0, 0.62 * s, 0.41 * s);
    pg.add(crossV2);

    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    var wheelPositions = [
        [-0.55 * s, 0.12 * s, 0.42 * s],
        [-0.55 * s, 0.12 * s, -0.42 * s],
        [0.55 * s, 0.12 * s, 0.42 * s],
        [0.55 * s, 0.12 * s, -0.42 * s]
    ];
    var wheels = [];
    for (var wi = 0; wi < wheelPositions.length; wi++) {
        var wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.06 * s, 12),
            wheelMat
        );
        wheel.position.set(wheelPositions[wi][0], wheelPositions[wi][1], wheelPositions[wi][2]);
        wheel.rotation.x = Math.PI / 2;
        wheel.name = 'wheel_' + wi;
        pg.add(wheel);
        wheels.push(wheel);
    }

    var eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (var ex = -1; ex <= 1; ex += 2) {
        var eyeW = new THREE.Mesh(
            new THREE.SphereGeometry(0.07 * s, 8, 8),
            eyeWhiteMat
        );
        eyeW.position.set(-0.82 * s, 0.45 * s, ex * 0.2 * s);
        pg.add(eyeW);
        var pupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.035 * s, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        pupil.position.set(-0.88 * s, 0.45 * s, ex * 0.2 * s);
        pg.add(pupil);
    }

    pg.userData.wheels = wheels;
    pg.userData.isVehicle = true;
    pg.userData.vehicleType = 'racecar';
    pg.rotation.y = Math.PI / 2;

    return pg;
}

function buildHearseVehicle(avatar) {
    var pg = new THREE.Group();
    var s = avatar.scale || 1.3;

    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    var body = new THREE.Mesh(
        new THREE.BoxGeometry(1.5 * s, 0.6 * s, 0.85 * s),
        bodyMat
    );
    body.position.set(0, 0.55 * s, 0);
    body.castShadow = true;
    body.name = 'vehicleBody';
    pg.add(body);

    var cabMat = new THREE.MeshStandardMaterial({ color: 0x111122 });
    var cab = new THREE.Mesh(
        new THREE.BoxGeometry(0.45 * s, 0.45 * s, 0.8 * s),
        cabMat
    );
    cab.position.set(-0.8 * s, 0.5 * s, 0);
    pg.add(cab);

    var glowMat = new THREE.MeshBasicMaterial({ color: 0x6622aa, transparent: true, opacity: 0.2 });
    var glow = new THREE.Mesh(
        new THREE.BoxGeometry(1.6 * s, 0.1 * s, 0.95 * s),
        glowMat
    );
    glow.position.set(0, 0.2 * s, 0);
    pg.add(glow);

    var glassMat = new THREE.MeshBasicMaterial({ color: 0x332244, transparent: true, opacity: 0.6 });
    for (var sx = -1; sx <= 1; sx += 2) {
        var window_ = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6 * s, 0.25 * s),
            glassMat
        );
        window_.position.set(0.1 * s, 0.7 * s, sx * 0.43 * s);
        window_.rotation.y = sx * Math.PI / 2;
        pg.add(window_);
    }

    var trimMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.6 });
    var trim = new THREE.Mesh(
        new THREE.BoxGeometry(1.52 * s, 0.03 * s, 0.87 * s),
        trimMat
    );
    trim.position.set(0, 0.86 * s, 0);
    pg.add(trim);

    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    var wheelPositions = [
        [-0.5 * s, 0.15 * s, 0.45 * s],
        [-0.5 * s, 0.15 * s, -0.45 * s],
        [0.5 * s, 0.15 * s, 0.45 * s],
        [0.5 * s, 0.15 * s, -0.45 * s]
    ];
    var wheels = [];
    for (var wi = 0; wi < wheelPositions.length; wi++) {
        var wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 0.07 * s, 12),
            wheelMat
        );
        wheel.position.set(wheelPositions[wi][0], wheelPositions[wi][1], wheelPositions[wi][2]);
        wheel.rotation.x = Math.PI / 2;
        wheel.name = 'wheel_' + wi;
        pg.add(wheel);
        wheels.push(wheel);
    }

    var eyeMat = new THREE.MeshBasicMaterial({ color: 0x8844cc });
    for (var ex = -1; ex <= 1; ex += 2) {
        var eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.06 * s, 8, 8),
            eyeMat
        );
        eye.position.set(-1.0 * s, 0.55 * s, ex * 0.2 * s);
        pg.add(eye);
    }

    pg.userData.wheels = wheels;
    pg.userData.isVehicle = true;
    pg.userData.vehicleType = 'hearse';
    pg.rotation.y = Math.PI / 2;

    return pg;
}

function buildVehicle(avatar) {
    switch (avatar.vehicleType) {
        case 'ambulance': return buildAmbulanceVehicle(avatar);
        case 'racecar': return buildRaceCarVehicle(avatar);
        case 'hearse': return buildHearseVehicle(avatar);
        default: return buildAmbulanceVehicle(avatar);
    }
}

// ===== HATS, GEAR AND CLOTHING (the shapes live in cosmetics.js) =====

/**
 * Put a cosmetic on a runner. The classic blocky runner just gets it as a child. An animated hero gets it on the bone
 * it should follow (head, chest or hips), so it crouches, leans and bobs with the runner; `item` is built in runner
 * space and attaching to a bone keeps where it stands now.
 */
function wear(pg, item, bone) {
    if (!item) return;
    pg.add(item);
    if (bone) {
        pg.updateMatrixWorld(true);
        bone.attach(item);
    }
}

/** Dress a runner (classic or animated) in what the player has equipped. */
export function attachCosmetics(pg, equipped, avatar) {
    equipped = equipped || {};
    var s = avatar.scale || 1.0;
    var isModel = !!(pg.userData && pg.userData.isModel);
    var root = isModel ? pg.children[0] : null;
    var head = null, torso = null, hips = null;
    if (root) {
        pg.updateMatrixWorld(true);
        head = measureHead(root, pg);
        torso = measureTorso(root, pg);
        hips = findHips(root);
    }
    var hatItem = SHOP_ITEMS.filter(function (i) { return i.id === equipped.hat; })[0];
    var gearItem = SHOP_ITEMS.filter(function (i) { return i.id === equipped.gear; })[0];
    var clothItem = SHOP_ITEMS.filter(function (i) { return i.id === equipped.clothing; })[0];

    // gear and clothing: scaled to this hero's torso, centred on it (the classic torso is 0.62 wide, centred at y 1.03)
    function fitted(item) {
        if (!item || !torso || !torso.box) return item;
        var size = new THREE.Vector3();
        var c = new THREE.Vector3();
        torso.box.getSize(size);
        torso.box.getCenter(c);
        var f = Math.max(0.45, Math.min(1.5, size.x / 0.62));
        if (typeof window !== 'undefined' && window.__cosmDebug) console.log('COSM', avatar.id, 'torso', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2), 'c', c.y.toFixed(2), 'f', f.toFixed(2));
        var holder = new THREE.Group();
        holder.add(item);
        holder.scale.setScalar(f);
        holder.position.set(c.x, c.y - 1.03 * f, c.z);
        return holder;
    }
    var follow = torso ? torso.node : null;
    if (clothItem && clothItem.color) wear(pg, fitted(buildClothing(clothItem.id, clothItem.color, 1)), follow);
    if (gearItem && gearItem.color) {
        var slot = gearSlot(gearItem.id);
        wear(pg, fitted(buildGear(gearItem.id, gearItem.color, 1)), slot === 'hip' && hips ? hips : follow);
    }
    if (hatItem && hatItem.color && !avatar.hasWizardHat && !avatar.hasAntenna) {
        var hs = s;
        var pos = new THREE.Vector3(0, 1.97 * s, 0);
        if (isModel) {
            if (head) {
                var hsz = new THREE.Vector3();
                var hc = new THREE.Vector3();
                head.box.getSize(hsz);
                head.box.getCenter(hc);
                hs = Math.max(0.5, Math.min(1.6, Math.max(hsz.x, hsz.z) / 0.76));
                pos.set(hc.x, head.box.max.y - 0.06 * hs, hc.z);
                if (typeof window !== 'undefined' && window.__cosmDebug) console.log('COSM', avatar.id, 'head', hsz.x.toFixed(2), hsz.y.toFixed(2), hsz.z.toFixed(2), 'top', head.box.max.y.toFixed(2), 'c', hc.x.toFixed(2), hc.z.toFixed(2));
            } else {
                var top = new THREE.Box3().setFromObject(root, true).max.y;
                hs = 1;
                pos.set(0, top - 0.05, 0);
            }
        }
        var hat = buildHat(hatItem.id, hatItem.color, hs);
        if (hat) {
            hat.position.copy(pos);
            wear(pg, hat, head ? head.node : null);
        }
    }
}

// ===== HAIRSTYLES (Classic characters) =====

/**
 * Extra hair on top of the base cap: ponytail, bun, bob, long, braids or puffs. The character faces -Z,
 * so the back of the head is +Z. Only drawn when the avatar names a `hairStyle`.
 */
export function addHairStyle(pg, avatar, headRadius, s) {
    var style = avatar.hairStyle;
    if (!style || style === 'short') return;
    var mat = new THREE.MeshStandardMaterial({ color: avatar.hairColor });
    function blob(r, x, y, z, sx, sy, sz) {
        var m = new THREE.Mesh(new THREE.SphereGeometry(r * s, 12, 10), mat);
        m.scale.set(sx, sy, sz);
        m.position.set(x * s, y * s, z * s);
        m.userData.hairStyle = style;
        pg.add(m);
        return m;
    }
    switch (style) {
        case 'ponytail':
            blob(0.16, 0, 1.95, 0.36, 1, 1, 1);        // the tie
            blob(0.12, 0, 1.62, 0.5, 0.9, 2.8, 0.9);    // the tail
            break;
        case 'bun':
            blob(0.21, 0, 2.14, 0.08, 1, 0.9, 1);
            break;
        case 'bob':
            blob(0.44, 0, 1.64, 0.1, 1.08, 0.85, 1.0);  // back hair framing the face
            blob(0.14, -0.33, 1.58, -0.12, 0.8, 1.7, 1);
            blob(0.14, 0.33, 1.58, -0.12, 0.8, 1.7, 1);
            break;
        case 'long':
            blob(0.4, 0, 1.42, 0.2, 1.0, 1.4, 0.7);
            blob(0.12, -0.34, 1.45, -0.05, 0.8, 2.3, 0.9);
            blob(0.12, 0.34, 1.45, -0.05, 0.8, 2.3, 0.9);
            break;
        case 'braids':
            [-1, 1].forEach(function (side) {
                blob(0.1, side * 0.3, 1.5, 0.12, 1, 3.4, 1);
                blob(0.08, side * 0.3, 1.18, 0.12, 1, 1, 1);
            });
            break;
        case 'puffs':
            blob(0.24, -0.32, 2.02, 0.05, 1, 1, 1);
            blob(0.24, 0.32, 2.02, 0.05, 1, 1, 1);
            break;
        default:
            break;
    }
}

// ===== MAIN BUILD FUNCTION =====

/** The player's chosen colors for this character's parts, as tints for the model. */
export function modelTints(avatar) {
    var chosen = (storage.get('modelColors') || {})[avatar.id] || {};
    var tints = [];
    (avatar.parts || []).forEach(function (part) {
        var hex = chosen[part.key];
        if (hex) tints.push({ names: part.materials, color: hex, flat: !!part.flat });
    });
    return tints;
}

export function buildPlayer() {
    var avatar = getAvatarConfig();
    var equipped = storage.get('equipped');

    if (avatar.isVehicle) {
        return printedLook(buildVehicle(avatar));
    }

    if (avatar.isModel && useCharacterModels()) {
        // Real animated model. If it is still downloading, show the
        // procedural stand-in; "langdash:model-ready" triggers a rebuild.
        var url = (import.meta.env && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : '/') + avatar.modelUrl;
        var model = buildModelCharacter(url, avatar.scale, undefined, modelTints(avatar));
        if (model) {
            // the hat, gear and clothing ride on the model's own bones
            attachCosmetics(model, equipped, avatar);
            return model;
        }
        loadCharacterModel(url).catch(function (e) {
            console.warn('[Player] Could not load character model:', e && e.message);
        });
    }

    return printedLook(buildHumanoid(avatar, equipped));
}

/** The procedural characters are cel-shaded too, with the exact colours they were built with. */
function printedLook(group) {
    paperizeMaterials(group, { keepColors: true, keepBasic: true });
    return group;
}

function buildHumanoid(avatar, equipped) {
    var pg = new THREE.Group();
    var clothingId = equipped.clothing || 'cloth_none';

    var s = avatar.scale || 1.0;

    // ===== BODY =====
    var bodyGroup = buildCapsuleBody(0.27 * s, 0.27 * s, 0.30 * s, avatar.bodyColor);
    bodyGroup.scale.set(1.12, 1, 0.82);
    bodyGroup.position.set(0, 0.92 * s, 0);
    bodyGroup.castShadow = true;
    pg.add(bodyGroup);

    // Hips: the lower torso reads as trousers so the outfit has two parts
    var hips = new THREE.Mesh(
        new THREE.CylinderGeometry(0.265 * s, 0.245 * s, 0.2 * s, 14),
        new THREE.MeshStandardMaterial({ color: avatar.pantsColor })
    );
    hips.scale.set(1.12, 1, 0.82);
    hips.position.set(0, 0.6 * s, 0);
    pg.add(hips);

    // Neck
    var neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09 * s, 0.1 * s, 0.16 * s, 10),
        new THREE.MeshStandardMaterial({ color: avatar.skinColor })
    );
    neck.position.set(0, 1.36 * s, 0);
    pg.add(neck);

    // Collar
    var collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.16 * s, 0.045 * s, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xeeeeff })
    );
    collar.position.set(0, 1.31 * s, 0);
    collar.scale.set(1, 1, 1);
    collar.rotation.x = Math.PI / 2;
    pg.add(collar);

    // ===== HEAD =====
    var headRadius = 0.38 * s;
    var head = new THREE.Mesh(
        new THREE.SphereGeometry(headRadius, 24, 20),
        new THREE.MeshStandardMaterial({ color: avatar.skinColor })
    );
    head.position.set(0, 1.68 * s, 0);
    head.name = 'head';
    pg.add(head);

    // Hair
    var hair = new THREE.Mesh(
        new THREE.SphereGeometry(headRadius * 0.95, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        new THREE.MeshStandardMaterial({ color: avatar.hairColor })
    );
    hair.position.set(0, 1.75 * s, 0);
    pg.add(hair);

    var hairBack = new THREE.Mesh(
        new THREE.SphereGeometry(headRadius * 0.88, 10, 8, 0, Math.PI * 2, 0.3, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({ color: avatar.hairColor })
    );
    hairBack.position.set(0, 1.72 * s, 0.08 * s);
    pg.add(hairBack);

    addHairStyle(pg, avatar, headRadius, s);

    // Ears
    for (var earSide = -1; earSide <= 1; earSide += 2) {
        var ear = new THREE.Mesh(
            new THREE.SphereGeometry(0.07 * s, 10, 8),
            new THREE.MeshStandardMaterial({ color: avatar.skinColor })
        );
        ear.scale.set(0.55, 1, 0.8);
        ear.position.set(earSide * headRadius * 0.98, 1.66 * s, 0.02 * s);
        pg.add(ear);
    }

    // Fringe: a few overlapping tufts across the forehead
    var fringeMat = new THREE.MeshStandardMaterial({ color: avatar.hairColor });
    [[-0.17, 0.02, 0.5], [0, 0.05, 0], [0.17, 0.02, -0.5]].forEach(function (f) {
        var tuft = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 10, 8), fringeMat);
        tuft.scale.set(1, 0.7, 0.9);
        tuft.position.set(f[0] * s, (1.93 + f[1]) * s, -0.24 * s);
        tuft.rotation.z = f[2] * 0.4;
        pg.add(tuft);
    });

    // ===== EYES =====
    var eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var eyeColorMat = new THREE.MeshBasicMaterial({ color: 0x222244 });
    var eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    if (avatar.glowColor) {
        eyeColorMat = new THREE.MeshBasicMaterial({ color: avatar.glowColor });
    }

    for (var ex = -1; ex <= 1; ex += 2) {
        var eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.10 * s, 8, 8), eyeWhiteMat);
        eyeW.position.set(ex * 0.13 * s, 1.72 * s, -0.30 * s);
        eyeW.scale.set(1, 1.1, 0.7);
        pg.add(eyeW);

        var eyeIris = new THREE.Mesh(new THREE.SphereGeometry(0.065 * s, 8, 8), eyeColorMat);
        eyeIris.position.set(ex * 0.13 * s, 1.72 * s, -0.35 * s);
        pg.add(eyeIris);

        var pupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.035 * s, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        pupil.position.set(ex * 0.13 * s, 1.72 * s, -0.38 * s);
        pg.add(pupil);

        var highlight = new THREE.Mesh(new THREE.SphereGeometry(0.02 * s, 4, 4), eyeHighlightMat);
        highlight.position.set(ex * 0.11 * s, 1.75 * s, -0.39 * s);
        pg.add(highlight);
    }

    // Eyebrows
    for (var bx = -1; bx <= 1; bx += 2) {
        var brow = new THREE.Mesh(
            new THREE.TorusGeometry(0.06 * s, 0.015 * s, 4, 8, Math.PI * 0.8),
            new THREE.MeshBasicMaterial({ color: avatar.hairColor })
        );
        brow.position.set(bx * 0.13 * s, 1.82 * s, -0.32 * s);
        brow.rotation.x = -0.2;
        brow.rotation.z = bx * 0.15;
        pg.add(brow);
    }

    // Mouth / Smile
    var smile = new THREE.Mesh(
        new THREE.TorusGeometry(0.07 * s, 0.018 * s, 6, 10, Math.PI),
        new THREE.MeshBasicMaterial({ color: 0xdd5544 })
    );
    smile.position.set(0, 1.58 * s, -0.33 * s);
    smile.rotation.z = Math.PI;
    smile.name = 'mouth';
    pg.add(smile);

    // Cheek blush
    var blushMat = new THREE.MeshBasicMaterial({ color: 0xff8888, transparent: true, opacity: 0.25 });
    for (var cx = -1; cx <= 1; cx += 2) {
        var blush = new THREE.Mesh(new THREE.CircleGeometry(0.05 * s, 8), blushMat);
        blush.position.set(cx * 0.22 * s, 1.63 * s, -0.34 * s);
        pg.add(blush);
    }

    // Nose
    var nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 * s, 6, 6),
        new THREE.MeshStandardMaterial({ color: avatar.skinColor })
    );
    nose.position.set(0, 1.65 * s, -0.37 * s);
    pg.add(nose);

    // ===== LEGS =====
    var leftLegGroup = buildRoundedLimb(0.10 * s, 0.50 * s, avatar.pantsColor);
    leftLegGroup.position.set(-0.14 * s, 0.30 * s, 0);
    leftLegGroup.name = 'leftLeg';
    pg.add(leftLegGroup);

    var rightLegGroup = buildRoundedLimb(0.10 * s, 0.50 * s, avatar.pantsColor);
    rightLegGroup.position.set(0.14 * s, 0.30 * s, 0);
    rightLegGroup.name = 'rightLeg';
    pg.add(rightLegGroup);

    // Shoes
    var shoeColor = avatar.shoeColor || 0xff3333;
    var shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor });

    var shoeL = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 8, 6), shoeMat);
    shoeL.scale.set(1.0, 0.55, 1.4);
    shoeL.position.set(0, -0.28 * s, -0.03 * s);
    leftLegGroup.add(shoeL);

    var shoeR = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 8, 6), shoeMat);
    shoeR.scale.set(1.0, 0.55, 1.4);
    shoeR.position.set(0, -0.28 * s, -0.03 * s);
    rightLegGroup.add(shoeR);

    var soleMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f8 });
    [leftLegGroup, rightLegGroup].forEach(function (leg) {
        var sole = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 10, 6), soleMat);
        sole.scale.set(1.02, 0.2, 1.42);
        sole.position.set(0, -0.335 * s, -0.03 * s);
        leg.add(sole);
    });

    // ===== ARMS =====
    var armColor = avatar.bodyColor;
    var leftArmGroup = buildRoundedLimb(0.08 * s, 0.40 * s, armColor);
    leftArmGroup.position.set(-0.37 * s, 1.04 * s, 0);
    leftArmGroup.name = 'leftArm';
    pg.add(leftArmGroup);

    var rightArmGroup = buildRoundedLimb(0.08 * s, 0.40 * s, armColor);
    rightArmGroup.position.set(0.37 * s, 1.04 * s, 0);
    rightArmGroup.name = 'rightArm';
    pg.add(rightArmGroup);

    // Hands
    var handMat = new THREE.MeshStandardMaterial({ color: avatar.skinColor });
    var handL = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 6, 6), handMat);
    handL.position.set(0, -0.24 * s, 0);
    leftArmGroup.add(handL);

    var handR = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 6, 6), handMat);
    handR.position.set(0, -0.24 * s, 0);
    rightArmGroup.add(handR);

    // Rotate limbs about the hip/shoulder rather than their centers
    pivotLimbAtTop(leftLegGroup, 0.50 * s);
    pivotLimbAtTop(rightLegGroup, 0.50 * s);
    pivotLimbAtTop(leftArmGroup, 0.40 * s);
    pivotLimbAtTop(rightArmGroup, 0.40 * s);

    // ===== AVATAR SPECIAL FEATURES =====

    // Cape (Superhero)
    if (avatar.hasCape) {
        var cape2 = new THREE.Mesh(
            new THREE.PlaneGeometry(0.75 * s, 1.0 * s),
            new THREE.MeshBasicMaterial({
                color: avatar.capeColor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.85
            })
        );
        cape2.position.set(0, 0.95 * s, 0.22 * s);
        cape2.rotation.x = 0.15;
        cape2.name = 'cape';
        pg.add(cape2);
    }

    // Antenna (Robot)
    if (avatar.hasAntenna) {
        var antennaPole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.35 * s, 6),
            new THREE.MeshBasicMaterial({ color: 0x888899 })
        );
        antennaPole.position.set(0, 2.05 * s, 0);
        pg.add(antennaPole);

        var antennaBall = new THREE.Mesh(
            new THREE.SphereGeometry(0.07 * s, 8, 8),
            new THREE.MeshBasicMaterial({ color: avatar.glowColor || 0x44aaff })
        );
        antennaBall.position.set(0, 2.25 * s, 0);
        pg.add(antennaBall);
    }

    // Wizard Hat
    if (avatar.hasWizardHat) {
        var wizHat = new THREE.Mesh(
            new THREE.ConeGeometry(0.32 * s, 0.55 * s, 8),
            new THREE.MeshStandardMaterial({ color: avatar.hatColor || 0x6622aa })
        );
        wizHat.position.set(0, 2.10 * s, 0);
        pg.add(wizHat);

        var brim = new THREE.Mesh(
            new THREE.TorusGeometry(0.38 * s, 0.04 * s, 4, 14),
            new THREE.MeshStandardMaterial({ color: avatar.hatColor || 0x6622aa })
        );
        brim.position.set(0, 1.88 * s, 0);
        brim.rotation.x = Math.PI / 2;
        pg.add(brim);

        var starMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
        for (var ws = 0; ws < 3; ws++) {
            var star = new THREE.Mesh(new THREE.OctahedronGeometry(0.03 * s, 0), starMat);
            var wsAngle = (ws / 3) * Math.PI * 2;
            star.position.set(
                Math.cos(wsAngle) * 0.25 * s,
                2.0 * s + ws * 0.12 * s,
                Math.sin(wsAngle) * 0.25 * s
            );
            pg.add(star);
        }
    }

    // Zombie dark circles
    if (avatar.id === 'avatar_zombie') {
        var darkCircleMat = new THREE.MeshBasicMaterial({ color: 0x335533, transparent: true, opacity: 0.5 });
        for (var zx = -1; zx <= 1; zx += 2) {
            var darkCircle = new THREE.Mesh(new THREE.CircleGeometry(0.06 * s, 6), darkCircleMat);
            darkCircle.position.set(zx * 0.13 * s, 1.67 * s, -0.32 * s);
            pg.add(darkCircle);
        }
    }

    // Attending coat tails
    if (avatar.id === 'avatar_attending' && clothingId === 'cloth_none') {
        var coatTail2 = new THREE.Mesh(
            new THREE.PlaneGeometry(0.55 * s, 0.5 * s),
            new THREE.MeshStandardMaterial({ color: avatar.bodyColor, side: THREE.DoubleSide })
        );
        coatTail2.position.set(0, 0.55 * s, 0.18 * s);
        coatTail2.rotation.x = 0.1;
        coatTail2.name = 'coatTail';
        pg.add(coatTail2);
    }

    stylizeCharacter(pg);

    // Clothing, hat and gear (after the stylizing pass: they come already printed and outlined)
    attachCosmetics(pg, equipped, avatar);

    return pg;
}

export function getPlayerLimbs(playerGroup) {
    // For vehicles, return wheel references
    if (playerGroup.userData && playerGroup.userData.isVehicle) {
        var wheels = [];
        var lights = [];
        playerGroup.traverse(function (child) {
            if (child.name && child.name.indexOf('wheel_') === 0) wheels.push(child);
            if (child.name && child.name.indexOf('light_') === 0) lights.push(child);
        });
        return {
            wheels: wheels,
            lights: lights,
            body: playerGroup.getObjectByName('vehicleBody'),
            leftLeg: null,
            rightLeg: null,
            leftArm: null,
            rightArm: null,
            cape: null,
            head: null,
            mouth: null,
            coatTail: null,
            isVehicle: true
        };
    }

    if (playerGroup.userData && playerGroup.userData.isModel) {
        // Animated by its own clips; no procedural limbs to drive.
        return {
            leftLeg: null, rightLeg: null, leftArm: null, rightArm: null,
            cape: null, head: null, mouth: null, coatTail: null,
            isVehicle: false, isModel: true
        };
    }

    return {
        leftLeg: playerGroup.getObjectByName('leftLeg'),
        rightLeg: playerGroup.getObjectByName('rightLeg'),
        leftArm: playerGroup.getObjectByName('leftArm'),
        rightArm: playerGroup.getObjectByName('rightArm'),
        cape: playerGroup.getObjectByName('cape'),
        head: playerGroup.getObjectByName('head'),
        mouth: playerGroup.getObjectByName('mouth'),
        coatTail: playerGroup.getObjectByName('coatTail'),
        isVehicle: false
    };
}
