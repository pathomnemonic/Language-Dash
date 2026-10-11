import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { paperize, PALETTE, toonMaterial, newToon, paperizeMaterials, outlineGroup } from '../../js/game/paper.js';
import { spawnGates, updateGateHighlights, flashGateResult, stampGateCorrect } from '../../js/game/gates.js';
import { buildExamMonster, getMonsterParts } from '../../js/game/exammonster.js';
import { buildPowerupIcon } from '../../js/game/obstacles.js';
import { SKINS } from '../../js/game/skins.js';
import { getTheme } from '../../js/game/themes.js';
import { ATMOSPHERES, applyAtmosphere, allowedAtmospheres } from '../../js/game/atmosphere.js';

HTMLCanvasElement.prototype.getContext = () => null; // (no canvas in the test browser: paint code must cope)

// The 3D world is printed, not lit: paper, ink and stamp colours, flat shading, no glow, no violet.

const hue = (hex) => { const o = {}; new THREE.Color(hex).getHSL(o, THREE.SRGBColorSpace); return o; };
const isViolet = (hex) => { const c = hue(hex); return c.s > 0.18 && c.l > 0.1 && c.h > 0.7 && c.h < 0.92; };

function glowing(root) {
  const bad = [];
  root.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    mats.forEach((m) => {
      if (m.blending === THREE.AdditiveBlending) bad.push('additive');
      if (m.emissive && m.emissiveIntensity > 0.2 && m.emissive.getHex() !== 0) bad.push('emissive');
    });
  });
  return bad;
}

describe('paperize', () => {
  it('turns violet and magenta into ink blue and coral, and leaves paper tones alone', () => {
    [0x6a50e0, 0x8844ff, 0xcc66ff, 0xff44aa, 0x9944ff].forEach((c) => expect(isViolet(paperize(c)), c.toString(16)).toBe(false));
    const paper = paperize(PALETTE.paper);
    expect(Math.abs(hue(paper).l - hue(PALETTE.paper).l)).toBeLessThan(0.1);
  });

  it('can be run twice with nearly the same result', () => {
    [0x9a6b45, 0x35e0d0, 0xff6bd6].forEach((c) => {
      const once = paperize(c);
      const twice = paperize(once);
      expect(Math.abs(hue(once).h - hue(twice).h)).toBeLessThan(0.03);
      expect(Math.abs(hue(once).l - hue(twice).l)).toBeLessThan(0.08);
    });
  });

  it('never leaves pure black', () => {
    expect(paperize(0x000000)).not.toBe(0x000000);
  });
});

describe('no violet by default', () => {
  it('no map colour, sky or light is violet', () => {
    SKINS.forEach((skin) => {
      Object.keys(skin.colors).forEach((k) => expect(isViolet(skin.colors[k]), skin.name + ' ' + k).toBe(false));
      if (skin.sky) ['top', 'horizon', 'sun'].forEach((k) => skin.sky[k] !== undefined && expect(isViolet(skin.sky[k]), skin.name + ' sky ' + k).toBe(false));
    });
  });

  it('no time of day or weather tints a map violet', () => {
    SKINS.forEach((skin) => {
      allowedAtmospheres(skin).concat(Object.keys(ATMOSPHERES)).forEach((name) => {
        if (!skin.world || skin.indoor || skin.fixedSky) return;
        applyAtmosphere(skin, name);
        expect(isViolet(skin.colors.bg), skin.name + ' ' + name + ' bg').toBe(false);
        if (skin.sky) expect(isViolet(skin.sky.horizon), skin.name + ' ' + name + ' horizon').toBe(false);
      });
      applyAtmosphere(skin, 'day');
    });
  });

  it('no colour theme (day or night) is violet either', () => {
    ['Talking', 'Feelings & Thinking', 'Home & Things', 'People & Family', 'Basics', 'default'].forEach((s) => {
      const t = getTheme([s]);
      ['bg', 'ground', 'wall', 'glow', 'accent'].forEach((k) => expect(isViolet(t[k]), s + ' ' + k).toBe(false));
    });
  });
});

describe('the ticket-office gates', () => {
  const gates = [{ label: '駅', roman: 'eki', correct: false }, { label: '庭', roman: 'niwa', correct: true }, { label: '山', roman: 'yama', correct: false }];

  it('are three arches with a cream sign core first, ink outlines, and nothing that glows', () => {
    const scene = new THREE.Scene();
    const meshes = spawnGates(scene, gates, 1, {}, 'Travel & Places');
    expect(meshes).toHaveLength(3);
    meshes.forEach((g, i) => {
      const core = g.children[0];
      expect(core.isMesh).toBe(true);
      expect(core.material.isMeshToonMaterial).toBe(true);
      expect(core.material.color.getHex()).toBe(PALETTE.card);
      expect(g.userData.gate.index).toBe(i);
      expect(glowing(g)).toEqual([]);
      let hulls = 0;
      g.traverse((o) => { if (o.isMesh && o.material.side === THREE.BackSide) hulls++; });
      expect(hulls).toBeGreaterThanOrEqual(3); // the sign and both posts have an ink outline
    });
    expect(scene.children).toHaveLength(3);
  });

  it('use the stamp colours for the lanes: red, marigold, teal', () => {
    const meshes = spawnGates(new THREE.Scene(), gates, 0, {}, null);
    const post = (g) => g.children.find((c) => c.isMesh && c !== g.children[0] && c.geometry.parameters && c.geometry.parameters.height > 3);
    expect(post(meshes[0]).material.color.getHex()).toBe(PALETTE.red);
    expect(post(meshes[1]).material.color.getHex()).toBe(PALETTE.marigold);
    expect(post(meshes[2]).material.color.getHex()).toBe(PALETTE.teal);
  });

  it('dim the lanes the runner is not in', () => {
    const meshes = spawnGates(new THREE.Scene(), gates, 1, {}, null);
    updateGateHighlights(meshes, 2);
    expect(meshes[2].userData.gate.face.material.color.getHex()).toBe(0xffffff);
    expect(meshes[0].userData.gate.face.material.color.getHex()).not.toBe(0xffffff);
  });

  it('a right answer thunks a stamp on the right sign; a wrong one scribbles out the chosen sign', () => {
    const right = spawnGates(new THREE.Scene(), gates, 1, {}, null);
    stampGateCorrect(right, gates);
    expect(right[1].userData.gate.stampOk.visible).toBe(true);
    expect(right[0].userData.gate.stampOk.visible).toBe(false);

    const wrong = spawnGates(new THREE.Scene(), gates, 0, {}, null);
    flashGateResult(wrong, gates, 0);
    expect(wrong[0].userData.gate.scribble.visible).toBe(true);
    expect(wrong[0].userData.gate.stampBad.visible).toBe(true);
    expect(wrong[1].userData.gate.stampOk.visible).toBe(true); // the right one is shown with the green stamp
    expect(wrong[2].userData.gate.scribble.visible).toBe(false);
  });
});

describe('the Hush', () => {
  it('is an ink blot with cream eyes and keeps every part the engine animates', () => {
    HTMLCanvasElement.prototype.getContext = () => null;
    const m = buildExamMonster();
    const p = getMonsterParts(m);
    expect(p.body.material.color.getHex()).toBe(PALETTE.ink);
    expect(p.eyes.length).toBeGreaterThan(0);
    expect(p.eyes[0].material.color.getHex()).toBe(PALETTE.card);
    expect(p.tentacles.length).toBe(7);
    expect(p.questionMarks.length).toBe(5);
    expect(p.ridge.length).toBe(7);
    expect(p.backRing && p.aura && p.mouth).toBeTruthy();
    expect(glowing(m)).toEqual([]);
  });
});

describe('pickups', () => {
  it('power-up icons are flat enamel, not glowing', () => {
    ['shield', 'magnet', 'double', 'autoPilot', 'scoreFrenzy'].forEach((t) => {
      const icon = buildPowerupIcon(t).icon;
      expect(glowing(icon), t).toEqual([]);
      icon.traverse((o) => { if (o.isMesh) expect(o.material.isMeshToonMaterial, t).toBe(true); });
    });
  });
});

describe('paperizeMaterials and outlines', () => {
  it('turns lit materials into toon ones with paper colours, and additive glow into a flat shape', () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0xff00ff, emissiveIntensity: 1 })));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, blending: THREE.AdditiveBlending })));
    paperizeMaterials(g);
    const [solid, halo] = g.children;
    expect(solid.material.isMeshToonMaterial).toBe(true);
    expect(isViolet(solid.material.color.getHex())).toBe(false);
    expect(solid.material.emissiveIntensity).toBeLessThanOrEqual(0.18);
    expect(halo.material.blending).toBe(THREE.NormalBlending);
  });

  it('outlines solid meshes but not flat planes or see-through ones', () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), newToon(0xffffff)));
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), newToon(0xffffff)));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonMaterial({ transparent: true, opacity: 0.4 })));
    expect(outlineGroup(g, 0.03)).toBe(1);
    expect(toonMaterial(0x123456)).toBe(toonMaterial(0x123456)); // cached
  });
});
