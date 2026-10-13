/**
 * worlds.js — the bright "world" maps, and how the track builder reaches them.
 *
 * A world map is described by a skin (colours, fog, light, sky: see skins.js) with a `world` id, and a world module in
 * js/game/maps/ that knows how to build one bay of wall, the floor, the fixtures overhead and the things that move.
 * Like the Library Hall, a world repeats every WORLD_PERIOD units (four bays) so it scrolls without a seam.
 *
 * track.js and skinbuilders.js call in here when a skin has a world; everything else about a map (gates, coins, the
 * runner) works the same as on any other map.
 */

import * as THREE from 'three';
import { WORLD_BAY, LANE_EDGE, slab } from './mapkit.js';
import { PALETTE } from './paper.js';

import { w_library_hall } from './maps/w_library_hall.js';
import { w_translators_booth } from './maps/w_translators_booth.js';
import { w_codebreakers_lab } from './maps/w_codebreakers_lab.js';
import { w_midnight_platform } from './maps/w_midnight_platform.js';
import { w_kyoto_tea_garden } from './maps/w_kyoto_tea_garden.js';
import { w_tokyo_night_market } from './maps/w_tokyo_night_market.js';
import { w_lullaby_clouds } from './maps/w_lullaby_clouds.js';
import { w_vienna_prater_fair } from './maps/w_vienna_prater_fair.js';
import { w_stroopwafel_factory } from './maps/w_stroopwafel_factory.js';
import { w_aquarium_of_tongues } from './maps/w_aquarium_of_tongues.js';
import { w_paris_rooftop } from './maps/w_paris_rooftop.js';
import { w_bavarian_farmyard } from './maps/w_bavarian_farmyard.js';
import { w_festival_of_seasons } from './maps/w_festival_of_seasons.js';
import { w_alphabet_playroom } from './maps/w_alphabet_playroom.js';
import { w_shanghai_night_highway } from './maps/w_shanghai_night_highway.js';
import { w_monsoon_slide_park } from './maps/w_monsoon_slide_park.js';
import { w_seoul_neon_alley } from './maps/w_seoul_neon_alley.js';
import { w_milan_opera_house } from './maps/w_milan_opera_house.js';
import { w_sweet_shop_of_words } from './maps/w_sweet_shop_of_words.js';
import { w_algarve_sunset } from './maps/w_algarve_sunset.js';
import { w_calavera_fiesta } from './maps/w_calavera_fiesta.js';
import { w_taipei_bubble_tea } from './maps/w_taipei_bubble_tea.js';
import { w_rosetta_hall } from './maps/w_rosetta_hall.js';
import { w_verona_balcony } from './maps/w_verona_balcony.js';
import { w_berlin_disco_cellar } from './maps/w_berlin_disco_cellar.js';
import { w_warsaw_spark_park } from './maps/w_warsaw_spark_park.js';

/** Every world module, by id. Each is { bay, center?, arch?, ground?, extras? } (see the Playland for the shape). */
export var WORLDS = {
  w_library_hall: w_library_hall,
  w_translators_booth: w_translators_booth,
  w_codebreakers_lab: w_codebreakers_lab,
  w_midnight_platform: w_midnight_platform,
  w_kyoto_tea_garden: w_kyoto_tea_garden,
  w_tokyo_night_market: w_tokyo_night_market,
  w_lullaby_clouds: w_lullaby_clouds,
  w_vienna_prater_fair: w_vienna_prater_fair,
  w_stroopwafel_factory: w_stroopwafel_factory,
  w_aquarium_of_tongues: w_aquarium_of_tongues,
  w_paris_rooftop: w_paris_rooftop,
  w_bavarian_farmyard: w_bavarian_farmyard,
  w_festival_of_seasons: w_festival_of_seasons,
  w_alphabet_playroom: w_alphabet_playroom,
  w_shanghai_night_highway: w_shanghai_night_highway,
  w_monsoon_slide_park: w_monsoon_slide_park,
  w_seoul_neon_alley: w_seoul_neon_alley,
  w_milan_opera_house: w_milan_opera_house,
  w_sweet_shop_of_words: w_sweet_shop_of_words,
  w_algarve_sunset: w_algarve_sunset,
  w_calavera_fiesta: w_calavera_fiesta,
  w_taipei_bubble_tea: w_taipei_bubble_tea,
  w_rosetta_hall: w_rosetta_hall,
  w_verona_balcony: w_verona_balcony,
  w_berlin_disco_cellar: w_berlin_disco_cellar,
  w_warsaw_spark_park: w_warsaw_spark_park
};

export function worldOf(skin) {
  return (skin && skin.world && WORLDS[skin.world]) || null;
}

export function isWorld(skin) { return !!worldOf(skin); }

/** Which of the four bays this z is (0..3), stable as the track scrolls. */
export function worldBay(z) {
  var k = Math.round(z / WORLD_BAY);
  return ((k % 4) + 4) % 4;
}

/** One 4-unit bay of one side wall; the left call also builds the floor and ceiling pieces for the middle. */
export function buildWorldBay(skin, side, z) {
  var g = new THREE.Group();
  var w = worldOf(skin);
  var k = worldBay(z);
  w.bay(g, side, z, k, skin);
  keepLanesClear(g, side);
  if (side < 0 && w.center) w.center(g, z, k, skin);
  return g;
}

/**
 * A safety net under every bay: a low piece of scenery that reaches into the lanes is nudged back toward the wall, so
 * nothing the runner might take for an obstacle can ever sit on the track. (Overhead pieces, the floor and the ceiling
 * are left alone.)
 */
function keepLanesClear(g, side) {
  g.updateMatrixWorld(true);
  var box = new THREE.Box3();
  g.children.forEach(function (child) {
    box.setFromObject(child);
    if (box.isEmpty() || box.min.y > 2.0 || box.max.y < 0.12) return;
    if (box.min.x < 0 && box.max.x > 0) return;
    var nearest = side > 0 ? box.min.x : -box.max.x;
    var over = LANE_EDGE - nearest;
    if (over > 0 && over <= 0.7) child.position.x += side * over;
  });
}

/** Hanging fixtures across the track (bunting, banners, lamps, mobiles). */
export function buildWorldArch(skin, z) {
  var g = new THREE.Group();
  var w = worldOf(skin);
  // a counter that stays the same as the fixtures scroll past, so each one keeps its colours
  if (w.arch) w.arch(g, z, Math.abs(Math.round(z / 22)) % 6, skin);
  return g;
}

/**
 * The ground under everything: a lit base, the lane dividers, and anything the world adds beyond the walls
 * (grass, sand, water, a street).
 */
export function buildWorldGround(skin) {
  var g = new THREE.Group();
  var c = skin.colors;
  var w = worldOf(skin);
  var base = slab(g, 14, 400, c.ground, 0, 0, -190, { r: 0.8, env: 0.3 });
  base.receiveShadow = false;
  // (lane dividers are floor paint: buildPlatformMarkings in track.js)
  if (w.ground) w.ground(g, skin);
  return g;
}

// ===== DAY SKY =====
// A bright gradient with a sun, drawn only where nothing else is (it is rendered after the scenery, so the shader
// never runs on pixels the walls and floor already cover).

export function buildDaySky(skin) {
  var s = skin.sky || {};
  var sunDir = new THREE.Vector3(s.sunX === undefined ? -0.35 : s.sunX, s.sunY === undefined ? 0.45 : s.sunY, -0.8).normalize();
  var material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(s.top || 0x5da9d6) },
      horizon: { value: new THREE.Color(s.horizon || skin.colors.bg).lerp(new THREE.Color(PALETTE.paper), 0.35) },
      sunColor: { value: new THREE.Color(s.sun || 0xf2b134) },
      sunDir: { value: sunDir }
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'varying vec3 vDir; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir;',
      'void main(){',
      '  vec3 d = normalize(vDir);',
      '  float h = clamp(d.y, 0.0, 1.0);',
      '  float band = floor(pow(h, 0.35) * 5.0) / 5.0;', // flat print bands instead of a smooth gradient
      '  vec3 col = mix(horizon, top, band);',
      '  float s = dot(d, sunDir);',
      '  col = mix(col, sunColor, step(0.985, s));', // the sun is a flat disc, with no glow
      '  col = mix(col, mix(sunColor, col, 0.7), step(0.972, s) * (1.0 - step(0.985, s)));', // and a printed ring around it
      '  col = mix(col, horizon, smoothstep(0.02, -0.25, d.y));',
      '  gl_FragColor = vec4(col, 1.0);',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}'
    ].join('\n')
  });
  var dome = new THREE.Mesh(new THREE.SphereGeometry(260, 24, 12), material);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  dome.userData.isSkyDome = true;
  return dome;
}
