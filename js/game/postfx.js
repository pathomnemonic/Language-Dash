/**
 * postfx.js — the printed-page finish for the runner scene (high graphics tier).
 *
 * One cheap full-screen pass does everything: it draws a thin navy ink line wherever the scene's depth jumps (the
 * silhouettes of the runner, gates, obstacles and scenery), warms the colours a touch toward paper, and lays a very
 * faint paper grain over it. There is no bloom and no vignette. It is skipped entirely when the player turns
 * "Glow effects" off, and it switches itself off for the session if the frame rate drops (dynamic quality) so weaker
 * devices keep playing smoothly. The medium and low tiers never use it: gates, coins and the runner carry their own
 * ink outlines (paper.js).
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

var SLOW_FRAME_MS = 30;     // average frame time considered "too slow"
var SAMPLE_FRAMES = 120;    // frames averaged before deciding

/** True for laptop-class integrated graphics (Intel UHD/Iris, etc.), where multisampling is the main cost. */
function isIntegratedGpu(renderer) {
  try {
    var gl = renderer.getContext();
    var ext = gl.getExtension('WEBGL_debug_renderer_info');
    var name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /intel|uhd|iris|mali|adreno|apple gpu|powervr/i.test(name);
  } catch (e) { return false; }
}

var INK_VERTEX = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

// Edge test on disparity (1 / view depth): flat ground and walls are linear in disparity across the screen, so only real
// depth jumps (silhouettes) have a large second difference. No lines are drawn where nothing has been drawn (the sky).
var INK_FRAGMENT = [
  'uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 texel; uniform float near; uniform float far;',
  'uniform vec3 inkColor; uniform float inkAlpha; uniform float edgeWidth; uniform float grain; uniform float warm;',
  'varying vec2 vUv;',
  'float disp(vec2 uv){',
  '  float z = texture2D(tDepth, uv).x;',
  '  float viewZ = (near * far) / ((far - near) * z - far);', // negative view-space z
  '  return z >= 0.9999 ? 0.0 : -1.0 / viewZ;',
  '}',
  'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
  'void main(){',
  '  vec4 c = texture2D(tDiffuse, vUv);',
  '  vec2 o = texel * edgeWidth;',
  '  float d0 = disp(vUv);',
  '  float dl = disp(vUv - vec2(o.x, 0.0)); float dr = disp(vUv + vec2(o.x, 0.0));',
  '  float du = disp(vUv + vec2(0.0, o.y)); float dd = disp(vUv - vec2(0.0, o.y));',
  '  float lap = abs(dl + dr - 2.0 * d0) + abs(du + dd - 2.0 * d0);',
  '  float nearest = max(max(d0, dl), max(max(dr, du), dd));',
  '  float edge = smoothstep(0.05, 0.12, lap / max(nearest, 0.02)) * step(0.0005, nearest);',
  // far scenery gets a fainter line so it does not turn to mud, and the horizon gets none
  '  float fade = clamp((170.0 - 1.0 / max(nearest, 0.0001)) / 110.0, 0.0, 1.0);',
  '  c.rgb = mix(c.rgb, inkColor, edge * inkAlpha * fade);',
  '  c.rgb = mix(c.rgb, c.rgb * vec3(1.03, 1.0, 0.94), warm);',
  '  c.rgb *= 1.0 - grain * (hash(gl_FragCoord.xy) - 0.5);',
  '  gl_FragColor = c;',
  '}'
].join('\n');

class InkPass extends Pass {
  constructor(camera, size) {
    super();
    this.camera = camera;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        texel: { value: new THREE.Vector2(1 / size.x, 1 / size.y) },
        near: { value: camera.near },
        far: { value: camera.far },
        inkColor: { value: new THREE.Color(0x1b2a41) },
        inkAlpha: { value: 0.92 },
        edgeWidth: { value: 1.0 },
        grain: { value: 0.035 },
        warm: { value: 0.5 }
      },
      vertexShader: INK_VERTEX,
      fragmentShader: INK_FRAGMENT,
      depthTest: false,
      depthWrite: false
    });
    this.quad = new FullScreenQuad(this.material);
  }

  setSize(width, height) {
    this.material.uniforms.texel.value.set(1 / width, 1 / height);
    // keep the line about one CSS pixel wide on dense screens, and not hair-thin at low resolution
    this.material.uniforms.edgeWidth.value = Math.max(1, Math.min(2, height / 700)) * (this.bold ? 1.6 : 1);
  }

  render(renderer, writeBuffer, readBuffer) {
    var u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = readBuffer.depthTexture;
    u.near.value = this.camera.near;
    u.far.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {function(): number} [targetMs] the frame time the game aims for (33 ms when capped at 30 fps)
 * @returns {{render: function, setSize: function, degraded: boolean, dispose: function}}
 */
export function createPostFX(renderer, scene, camera, targetMs) {
  var size = renderer.getSize(new THREE.Vector2());
  var pixelRatio = renderer.getPixelRatio();

  // Multisampled target keeps edges smooth (the composer bypasses canvas MSAA); the depth texture feeds the ink pass.
  var coarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var target = new THREE.WebGLRenderTarget(size.x * pixelRatio, size.y * pixelRatio, {
    type: THREE.HalfFloatType,
    samples: (coarse || isIntegratedGpu(renderer)) ? 2 : 4 // phones, tablets and integrated GPUs: half the multisampling cost
  });
  target.depthTexture = new THREE.DepthTexture(size.x * pixelRatio, size.y * pixelRatio);

  var composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pixelRatio);
  composer.addPass(new RenderPass(scene, camera));
  var ink = new InkPass(camera, new THREE.Vector2(size.x * pixelRatio, size.y * pixelRatio));
  ink.setSize(size.x * pixelRatio, size.y * pixelRatio);
  composer.addPass(ink);
  composer.addPass(new OutputPass());

  var frames = 0;
  var elapsed = 0;
  var last = 0;

  var api = {
    degraded: false,

    render: function () {
      if (api.degraded) {
        renderer.render(scene, camera);
        return;
      }
      var now = performance.now();
      if (last) {
        var dt = now - last;
        // Ignore stalls from tab switches; only count real frames.
        if (dt < 250) {
          elapsed += dt;
          frames++;
          if (frames >= SAMPLE_FRAMES) {
            // "Too slow" is relative to the target: a game capped at 30 fps has 33 ms frames by design
            var target = (targetMs && targetMs()) || 1000 / 60;
            if (elapsed / frames > Math.max(SLOW_FRAME_MS, target * 1.45)) api.degraded = true;
            frames = 0;
            elapsed = 0;
          }
        }
      }
      last = now;
      composer.render();
    },

    /** Bolder ink lines (the old "Glow effects" switch now means this: a heavier, darker outline). */
    setBold: function (on) {
      var u = ink.material.uniforms;
      u.inkAlpha.value = on ? 1.0 : 0.92;
      ink.bold = !!on;
      ink.setSize(size.x * pixelRatio, size.y * pixelRatio);
    },

    setSize: function (width, height, ratio) {
      var r = ratio || renderer.getPixelRatio();
      composer.setPixelRatio(r);
      composer.setSize(width, height);
      ink.setSize(width * r, height * r);
    },

    dispose: function () {
      composer.dispose();
      target.dispose();
      if (target.depthTexture) target.depthTexture.dispose();
      ink.dispose();
    }
  };

  return api;
}
