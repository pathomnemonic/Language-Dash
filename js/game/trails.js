/**
 * trails.js — Player trail effect system
 *
 * Agent 14 — Effects and Trails
 *
 * Architectural compliance:
 * - No independent requestAnimationFrame loops
 * - Enforces particle budgets per quality level
 * - Supports pause/resume/reset/dispose lifecycle
 * - Effects remain outside trackRoot (added directly to scene)
 * - Pools all particles at construction; no runtime allocations
 * - Reads storage for equipped trail only (allowed dependency)
 * - Fixes excessive scaling from previous version
 * - Supports quality levels: low, medium, high
 * - Supports reduced motion preference
 *
 * Each trail is a drawing that matches its name (see trailshapes.js): paper planes, blossoms, ink splats, stamps,
 * postcards, snowflakes, fireflies, streamers, speech bubbles, footprints, lanterns, maple leaves.
 */

import * as THREE from 'three';
import { storage } from '../storage.js';
import { getTrailGeometry, shapeVariants, getGlyphTexture } from './trailshapes.js';
import { PALETTE, paperizeColor } from './paper.js';

// ===== QUALITY PRESETS =====
var QUALITY_PRESETS = {
  low:    { maxParticles: 50,  spawnRate: 0.04 },
  medium: { maxParticles: 100, spawnRate: 0.025 },
  high:   { maxParticles: 150, spawnRate: 0.015 }
};

// ===== TRAIL CONFIGURATIONS =====
var TRAIL_CONFIGS = {
  trail_none: null,
  trail_planes: {
    color1: 0xfffbf2, color2: 0x5da9d6, shape: 'plane',
    size: 0.45, spread: 0.35, type: 'planes'
  },
  trail_fireflies: {
    color1: 0xf2d24a, color2: 0xb8d94a, shape: 'firefly', blink: true,
    size: 0.38, spread: 0.55, type: 'fireflies'
  },
  trail_sakura: {
    color1: 0xf4a6b8, color2: 0xfde3ea, shape: 'blossom',
    size: 0.38, spread: 0.40, type: 'petals'
  },
  trail_streamers: {
    color1: 0xd9432c, color2: 0x0e8c8a, shape: 'streamer', palette: true,
    size: 0.55, spread: 0.50, type: 'streamers'
  },
  trail_lanterns: {
    color1: 0xd9432c, color2: 0xf2b134, shape: 'lantern', flicker: true,
    size: 0.42, spread: 0.40, type: 'lanterns'
  },
  trail_glyphs: {
    color1: 0xffffff, color2: 0xffffff, shape: 'glyph', glyphs: true,
    size: 0.52, spread: 0.40, type: 'glyphs'
  },
  trail_stamps: {
    color1: 0xd9432c, color2: 0x0e8c8a, shape: 'stamp', palette: true,
    size: 0.42, spread: 0.30, type: 'stamps'
  },
  trail_postcards: {
    color1: 0xfffbf2, color2: 0xf2b134, shape: 'postcard', palette: true,
    size: 0.46, spread: 0.30, type: 'cards'
  },
  trail_snow: {
    color1: 0xe8f4fb, color2: 0xa9d4ee, shape: 'snowflake',
    size: 0.36, spread: 0.55, type: 'snow'
  },
  trail_footprints: {
    color1: 0xb99560, color2: 0xa07f4e, shape: 'footprint', flat: true,
    size: 0.8, spread: 0.12, type: 'prints'
  },
  trail_ink: {
    color1: 0x1b2a41, color2: 0x2f5d8c, shape: 'splat',
    size: 0.42, spread: 0.40, type: 'splat'
  },
  trail_leaves: {
    color1: 0xd9432c, color2: 0xf2b134, shape: 'maple',
    size: 0.38, spread: 0.45, type: 'leaves'
  }
};

/** The trail settings (exported so tests can check every trail draws what its description says). */
export var TRAIL_SETTINGS = TRAIL_CONFIGS;

var CONFETTI_COLORS = [PALETTE.red, PALETTE.marigold, PALETTE.leaf, PALETTE.sky, PALETTE.teal];

// ===== SHARED GEOMETRY (created once, reused by all particles) =====
var _sharedSphereGeo = null;


function getSharedSphereGeo() {
  if (!_sharedSphereGeo) {
    _sharedSphereGeo = new THREE.SphereGeometry(0.1, 6, 6);
  }
  return _sharedSphereGeo;
}

export class TrailSystem {
  constructor(scene, options) {
    this.scene = scene;
    this.time = 0;
    this.spawnTimer = 0;
    this.paused = false;
    this.reducedMotion = (options && options.reducedMotion) || false;
    // +1: the trail streams toward the camera (the game looks at the runner from behind).
    // -1: it streams away (the Locker looks at the runner from the front).
    this.direction = options && options.direction === -1 ? -1 : 1;
    // particles that travel past this z are put away (the Locker's camera is close: nothing should fly through it)
    this.clipZ = options && typeof options.clipZ === 'number' ? options.clipZ : Infinity;
    // A trail to show instead of the equipped one (the Locker's preview)
    this.overrideId = null;

    // Quality
    var qualityKey = (options && options.quality) || 'high';
    var preset = QUALITY_PRESETS[qualityKey] || QUALITY_PRESETS.high;
    this.maxParticles = preset.maxParticles;
    this.baseSpawnRate = preset.spawnRate;

    // Pool
    this.pool = [];
    var geo = getSharedSphereGeo(); // replaced by the trail's own shape when a particle is launched

    for (var i = 0; i < this.maxParticles; i++) {
      var mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 1.0,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({
        mesh: mesh,
        life: 0,
        maxLife: 0,
        vx: 0, vy: 0, vz: 0,
        spin: 0, phase: 0, baseX: 0, baseY: 0, strand: 0, sx: 1, sy: 1,
        active: false
      });
    }
  }

  getConfig() {
    var equipped = storage.get('equipped');
    var trailId = this.overrideId || (equipped && equipped.trail) || 'trail_none';
    return TRAIL_CONFIGS[trailId] || null;
  }

  /** Show this trail (null: back to the equipped one). Particles already in the air are cleared. */
  setOverride(trailId) {
    if (this.overrideId === (trailId || null)) return;
    this.overrideId = trailId || null;
    this.reset();
  }

  update(dt, playerX, playerY, playerZ, streak) {
    if (this.paused || this.reducedMotion) return;

    this.time += dt;
    var config = this.getConfig();

    if (!config) {
      // Hide all active particles when no trail is equipped
      for (var h = 0; h < this.pool.length; h++) {
        if (this.pool[h].active) {
          this.pool[h].mesh.visible = false;
          this.pool[h].active = false;
        }
      }
      return;
    }

    var intensity = Math.min(3.0, 1.0 + streak * 0.08);
    var spawnRate = this.baseSpawnRate / intensity;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnRate;
      this._spawnParticle(config, playerX, playerY, playerZ, intensity);
    }

    // Update active particles
    for (var i = 0; i < this.pool.length; i++) {
      var p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt * this.direction;
      if (p.mesh.position.z > this.clipZ) { p.active = false; p.mesh.visible = false; continue; }

      var lifeRatio = p.life / p.maxLife;
      p.mesh.material.opacity = lifeRatio * 0.95 * (p.opacityScale || 1);

      // Scale: size * 4 (reduced from previous 15x to fix excessive scaling)
      var scale = lifeRatio * config.size * 4;
      p.mesh.scale.set(scale * p.sx, scale * p.sy, scale);

      // Flat shapes turn as they fly
      if (p.spin) p.mesh.rotation.z += p.spin * dt;

      // Type-specific animation
      var age = p.maxLife - p.life;
      switch (config.type) {
        case 'planes':
          p.mesh.rotation.z = p.baseRot + Math.sin(age * 3 + p.phase) * 0.25; // a gliding wobble
          p.vy += Math.sin(age * 2.2 + p.phase) * dt * 0.8;
          break;
        case 'petals':
        case 'leaves':
          p.mesh.position.x += Math.sin(age * 3 + p.phase) * dt * 0.9; // flutters side to side as it falls
          p.mesh.rotation.y = Math.sin(age * 4 + p.phase) * 1.0;
          break;
        case 'snow':
          p.mesh.position.x += Math.sin(age * 1.7 + p.phase) * dt * 0.5;
          break;
        case 'fireflies':
          p.mesh.position.x += Math.sin(age * 2.3 + p.phase) * dt * 0.8;
          p.mesh.position.y += Math.cos(age * 1.9 + p.phase) * dt * 0.6;
          p.mesh.material.opacity *= 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(age * 9 + p.phase)); // blinks
          break;
        case 'lanterns':
          p.mesh.position.x += Math.sin(age * 1.4 + p.phase) * dt * 0.4;
          p.mesh.rotation.z = Math.sin(age * 2 + p.phase) * 0.15;
          p.mesh.material.opacity *= 0.82 + 0.18 * Math.sin(age * 14 + p.phase); // the flame flickers
          break;
        case 'glyphs':
          p.vy += dt * 0.4;
          p.mesh.position.x += Math.sin(age * 2.5 + p.phase) * dt * 0.5;
          p.mesh.rotation.z = Math.sin(age * 3 + p.phase) * 0.18;
          break;
        case 'stamps': {
          // thunk: lands big, shrinks to its size in a quarter second
          var pop = 1 + Math.max(0, 0.25 - age) * 5;
          p.mesh.scale.set(scale * pop, scale * pop, scale);
          break;
        }
        case 'cards':
          p.mesh.rotation.y += dt * p.flip; // tumbles end over end
          break;
        case 'splat': {
          var splash = Math.min(1, age * 7); // the splat opens in a blink
          var sc = scale * (0.3 + 0.7 * splash);
          p.mesh.scale.set(sc, sc, sc);
          break;
        }
        case 'streamers':
          p.vx *= 1.005;
          p.vz *= 1.005;
          p.vy -= dt * 0.8;
          p.mesh.rotation.y += dt * p.flip;
          break;
        case 'prints': {
          var fade = Math.min(1, p.life / 0.8);
          p.mesh.material.opacity = Math.min(0.9, lifeRatio * 1.6) * fade * 0.9;
          p.mesh.scale.set(config.size * 4 * p.sx, config.size * 4, config.size * 4);
          break;
        }
      }
    }
  }

  _spawnParticle(config, px, py, pz, intensity) {
    var p = null;
    for (var i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        p = this.pool[i];
        break;
      }
    }
    if (!p) return;

    p.active = true;
    p.mesh.visible = true;
    p.maxLife = 1.5 + Math.random() * 0.5;
    p.life = p.maxLife;
    p.phase = Math.random() * Math.PI * 2;
    p.baseRot = 0;
    p.flip = 0;

    var spread = config.spread * intensity;
    p.mesh.position.set(
      px + (Math.random() - 0.5) * spread,
      (py + 0.5) + (Math.random() - 0.5) * spread * 0.5,
      pz + this.direction * (0.5 + Math.random() * 0.3)
    );

    // Default velocities
    p.vx = (Math.random() - 0.5) * 1.8;
    p.vy = (Math.random() - 0.3) * 1.2;
    p.vz = 2.5 + Math.random() * 2.5;

    // Type-specific spawn behavior
    switch (config.type) {
      case 'planes':
        p.vx = (Math.random() - 0.5) * 2.4;
        p.vy = 0.2 + Math.random() * 0.8;
        p.vz = 3.0 + Math.random() * 2.0;
        p.baseRot = (Math.random() - 0.5) * 0.8;
        break;
      case 'petals':
      case 'leaves':
        p.vx *= 0.4;
        p.vy = -0.2 - Math.random() * 0.5;
        p.vz = 1.6 + Math.random() * 1.6;
        p.maxLife = 1.8 + Math.random() * 0.6;
        p.life = p.maxLife;
        break;
      case 'snow':
        p.vx *= 0.3;
        p.vy = -0.3 - Math.random() * 0.4;
        p.vz = 1.2 + Math.random() * 1.5;
        p.maxLife = 2 + Math.random() * 0.5;
        p.life = p.maxLife;
        break;
      case 'fireflies':
        p.vx *= 0.3;
        p.vy = (Math.random() - 0.3) * 0.5;
        p.vz = 0.9 + Math.random() * 1.3;
        p.maxLife = 2 + Math.random() * 0.6;
        p.life = p.maxLife;
        break;
      case 'lanterns':
        p.vx *= 0.25;
        p.vy = 0.5 + Math.random() * 0.7;
        p.vz = 1.0 + Math.random() * 1.2;
        p.maxLife = 2 + Math.random() * 0.5;
        p.life = p.maxLife;
        break;
      case 'glyphs':
        p.vx *= 0.3;
        p.vy = 0.8 + Math.random() * 1.2;
        p.vz = 1.0 + Math.random() * 1.4;
        break;
      case 'stamps':
        p.vx = (Math.random() - 0.5) * 1.4;
        p.vy = 0.3 + Math.random() * 0.7;
        p.vz = 2.0 + Math.random() * 1.5;
        p.baseRot = (Math.random() - 0.5) * 0.7;
        break;
      case 'cards':
        p.vx = (Math.random() - 0.5) * 1.8;
        p.vy = 0.2 + Math.random() * 0.6;
        p.vz = 2.2 + Math.random() * 2.0;
        p.flip = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3);
        p.baseRot = (Math.random() - 0.5) * 1.2;
        break;
      case 'splat':
        p.vx = (Math.random() - 0.5) * 1.6;
        p.vy = (Math.random() - 0.2) * 1.0;
        p.vz = 1.8 + Math.random() * 1.6;
        p.baseRot = Math.random() * Math.PI * 2;
        break;
      case 'streamers': {
        var burstAngle = Math.random() * Math.PI * 2;
        p.vx = Math.cos(burstAngle) * 2.0;
        p.vz = Math.sin(burstAngle) * 1.5 + 2.0;
        p.vy = 0.6 + Math.random() * 1.8;
        p.baseRot = Math.random() * Math.PI;
        p.flip = (Math.random() - 0.5) * 8;
        break;
      }
      case 'prints':
        p.vx = 0; p.vy = 0;
        p.vz = 3.2; // the ground slides past at track speed
        p.maxLife = 1.8;
        p.life = p.maxLife;
        this._foot = this._foot ? 0 : 1; // left, right, left...
        p.mesh.position.set(px + (this._foot ? 0.2 : -0.2), 0.04, pz + this.direction * 0.5);
        break;
    }

    // The shape this trail is made of (some shapes have variants: each speech bubble carries its own letter)
    var variants = shapeVariants(config.shape);
    p.mesh.geometry = getTrailGeometry(config.shape, variants > 1 ? Math.floor(Math.random() * variants) : 0);
    p.mesh.rotation.set(0, 0, p.baseRot);
    p.spin = 0;
    p.mesh.material.blending = THREE.NormalBlending; // printed ink, never additive glow
    var tex = config.glyphs ? getGlyphTexture() : null;
    if ((p.mesh.material.map || null) !== tex) { p.mesh.material.map = tex; p.mesh.material.needsUpdate = true; }

    // Color
    var t = Math.random();
    var c1 = new THREE.Color(config.color1);
    var c2 = new THREE.Color(config.color2);
    if (config.palette) {
      c1.setHex(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
    } else {
      c1.lerp(c2, t);
    }
    if (config.glyphs) p.mesh.material.color.setHex(0xffffff);
    else p.mesh.material.color.copy(paperizeColor(c1));
    p.mesh.material.opacity = 0.95;
    p.opacityScale = 1;

    var s = config.size * (0.8 + Math.random() * 0.4) * intensity * 4;
    p.mesh.scale.set(s, s, s);

    p.sx = 1;
    p.sy = 1;
    if (config.type === 'prints') p.sx = this._foot ? -1 : 1;
    if (config.type === 'petals' || config.type === 'leaves' || config.type === 'snow') p.spin = (Math.random() - 0.5) * 3;
    if (config.type === 'splat' || config.type === 'fireflies') p.spin = 0;
  }

  // ===== LIFECYCLE =====

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  reset() {
    this.time = 0;
    this.spawnTimer = 0;
    for (var i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
      this.pool[i].mesh.visible = false;
    }
  }

  setReducedMotion(enabled) {
    this.reducedMotion = enabled;
    if (enabled) {
      this.reset();
    }
  }

  dispose() {
    for (var i = 0; i < this.pool.length; i++) {
      this.scene.remove(this.pool[i].mesh);
      // Shared geometry — do NOT dispose (other instances may use it)
      this.pool[i].mesh.material.dispose();
    }
    this.pool = [];
  }
}
