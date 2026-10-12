/**
 * skins.js — Track skin definitions
 *
 * Each skin defines:
 * - id: stable deterministic identifier for multiplayer skin selection
 * - name: the stable KEY from the original game. Saves (preferredMap), audio.js, secrets.js, sidemotion.js, hazards.js,
 *   analytics and the tests look maps up by it, so it is never renamed.
 * - title/desc: what the player sees (the Lexicon Guild world names; see docs/MAP-NAMES.md). Use skinTitle(skin).
 * - wallType: geometry style for side walls
 * - archType: geometry style for overhead structures
 * - groundType: visual style for the track floor
 * - particleType: floating atmospheric elements
 * - colors: complete color palette for the environment
 *
 * ARCHITECTURE CONTRACT (§23):
 * - Each skin has a stable `id` for deterministic selection.
 * - getRandomSkin() uses Math.random() for solo play.
 * - getSkinById() supports deterministic multiplayer selection.
 * - getSkinByName() supports legacy lookups.
 */

import { paperize } from './paper.js';

export var SKINS = [
  {
    id: 'skin_neural_highway',
    name: 'Neural Highway',
    title: "Shanghai Night Highway",
    desc: "A violet circuit-board speedway under stars, glowing signals racing past",
    world: 'w_shanghai_night_highway',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'sparks',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    fixedSky: true,
    sky: { top: 0x10184a, horizon: 0xff8f7a, sun: 0xfff6d8 },
    colors: {
      bg: 0xffb69a, sky: 0x10184a,
      ground: 0x4e4b6e, groundStripe: 0xff6bd6, groundAccent: 0x9a80ff,
      wallA: 0xcdbdff, wallB: 0xff6bd6, wallGlow: 0x35e0d0,
      archMain: 0xffffff, archGlow: 0xff6bd6,
      lane: 0xffffff,
      gateBase: 0x3b2fd0, gateGlow: 0xff6bd6,
      particle: 0xffffff, particleB: 0xcdbdff,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xf1e8ff, hemiBot: 0xb9a6f0,
      dirLight: 0xfff0ff
    }
  },
  {
    id: 'skin_vascular_rush',
    name: 'Vascular Rush',
    title: "Monsoon Slide Park",
    desc: "A splash-park slide in warm rain, with tubes and rings to swim through",
    world: 'w_monsoon_slide_park',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'bubbles',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    fixedSky: true,
    sky: { top: 0x7cc2d6, horizon: 0xffd6b0, sun: 0xffe7b0, sunX: 0.3, sunY: -0.4 },
    colors: {
      bg: 0xffd6b0, sky: 0xffd6b0,
      ground: 0xf29a5e, groundStripe: 0x1fb8b4, groundAccent: 0xffc58a,
      wallA: 0xffb066, wallB: 0x1fb8b4, wallGlow: 0xffd23f,
      archMain: 0xffffff, archGlow: 0xff8a3d,
      lane: 0xffffff,
      gateBase: 0x2a5fe0, gateGlow: 0xffd23f,
      particle: 0xffffff, particleB: 0xbfeaff,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xfff0dc, hemiBot: 0xe8a070,
      dirLight: 0xfff0d0
    }
  },
  {
    id: 'skin_skeletal_corridor',
    name: 'Skeletal Corridor',
    title: "Calavera Fiesta",
    desc: "A friendly skeleton street party: DJ skull, marigold-orange lights, rib arches",
    world: 'w_calavera_fiesta',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'calcium_dust',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    colors: {
      bg: 0xffd9a8, sky: 0xffd9a8,
      ground: 0xf0cf98, groundStripe: 0xff9a1f, groundAccent: 0xffc83d,
      wallA: 0xff7a5c, wallB: 0xffc83d, wallGlow: 0xff9a1f,
      archMain: 0xffffff, archGlow: 0xff9a1f,
      lane: 0xfff4dc,
      gateBase: 0x2a3d8f, gateGlow: 0xffc83d,
      particle: 0xffc83d, particleB: 0xff9a1f,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xfff0d8, hemiBot: 0xf0b070,
      dirLight: 0xfff2dc
    }
  },
  {
    id: 'skin_cellular_matrix',
    name: 'Cellular Matrix',
    title: "Taipei Bubble Tea Plaza",
    desc: "A jelly-bright plaza of giant bubble-tea cups, tapioca pearls and bouncing castles",
    world: 'w_taipei_bubble_tea',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'vesicles',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    colors: {
      bg: 0xd0f5e4, sky: 0xd0f5e4,
      ground: 0xd9f6ea, groundStripe: 0xff8fb8, groundAccent: 0xffd84a,
      wallA: 0xc8f2e4, wallB: 0xff8fb8, wallGlow: 0xffd84a,
      archMain: 0xffffff, archGlow: 0xff8fb8,
      lane: 0xffffff,
      gateBase: 0x2a7f8f, gateGlow: 0xffd84a,
      particle: 0xffd0e6, particleB: 0xbff5e6,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xf0fff8, hemiBot: 0xf0b8d0,
      dirLight: 0xfffff4
    }
  },
  {
    id: 'skin_neon_er',
    name: 'Neon ER',
    title: "Seoul Neon Alley",
    desc: "A pink-and-teal neon alley: convenience store, vending machines, jukebox diner",
    world: 'w_seoul_neon_alley',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'dust_motes',
    fog: { near: 45, far: 135 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    fixedSky: true,
    sky: { top: 0x182060, horizon: 0xff7fa8, sun: 0xfff0f8 },
    colors: {
      bg: 0xffa6c4, sky: 0x182060,
      ground: 0x2f7f8c, groundStripe: 0xff3d9a, groundAccent: 0x22e6d8,
      wallA: 0xbdf6f0, wallB: 0xff3d9a, wallGlow: 0x22e6d8,
      archMain: 0xffffff, archGlow: 0xff3d9a,
      lane: 0xff3d9a,
      gateBase: 0x1f3fb8, gateGlow: 0xffe14a,
      particle: 0xffffff, particleB: 0xaafff7,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xe8fffc, hemiBot: 0x8fd8d2,
      dirLight: 0xfff6ff
    }
  },
  {
    id: 'skin_dna_helix_tunnel',
    name: 'DNA Helix Tunnel',
    title: "Rosetta Hall",
    desc: "A carnival hall of giant twin spiral scripts, letter-block pyramids and a claw game",
    world: 'w_rosetta_hall',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'nucleotides',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    colors: {
      bg: 0xf7e3b4, sky: 0xf7e3b4,
      ground: 0xf0d08e, groundStripe: 0xe8b030, groundAccent: 0x2fb8b0,
      wallA: 0xf4dba0, wallB: 0xe2543a, wallGlow: 0xffb040,
      archMain: 0xffffff, archGlow: 0xe8b030,
      lane: 0xfff4d0,
      gateBase: 0x2a6f9a, gateGlow: 0xffd45a,
      particle: 0xffe58a, particleB: 0xffd04a,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xfff2d0, hemiBot: 0xe8b870,
      dirLight: 0xfff0d0
    }
  },
  {
    id: 'skin_cardiac_pulse',
    name: 'Cardiac Pulse',
    title: "Verona Balcony Carnival",
    desc: "A valentine carnival: heart balloons, rose bushes, balconies, swinging doors",
    world: 'w_verona_balcony',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'capsule_bits',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    colors: {
      bg: 0xffd9a8, sky: 0xffd9a8,
      ground: 0xf6d0a0, groundStripe: 0xe0305a, groundAccent: 0xf2b87a,
      wallA: 0xf4a27c, wallB: 0xe0305a, wallGlow: 0xffc83a,
      archMain: 0xfff0d0, archGlow: 0xff8fb0,
      lane: 0xffffff,
      gateBase: 0xc4243c, gateGlow: 0xffc83a,
      particle: 0xffffff, particleB: 0xffd0e0,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xfff2dc, hemiBot: 0xf0a888,
      dirLight: 0xfff0d0
    }
  },
  {
    id: 'skin_hospital_hallway',
    name: 'Hospital Hallway',
    title: "Library Hall",
    desc: "The Great Library's reading hall: arched windows, shelves, floating pages",
    world: 'w_library_hall',
    indoor: true,
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'dust_motes',
    fog: { near: 60, far: 160 },
    light: { ambient: 0.95, hemi: 0.9, dir: 0.85 },
    colors: {
      bg: 0xf6e2b4, sky: 0xf6e2b4,
      ground: 0xd9a064, groundStripe: 0xc78a4a, groundAccent: 0xe6b878,
      wallA: 0xfbefd2, wallB: 0xb9733a, wallGlow: 0xffd68a,
      archMain: 0xf0d9a8, archGlow: 0xfff2c8,
      lane: 0xfff0c8,
      gateBase: 0x7a4a22, gateGlow: 0xffd23f,
      particle: 0xfff6d8, particleB: 0xffe4a8,
      coin: 0xffcc22,
      ambient: 0xfff0d2, hemiTop: 0xfff6e0, hemiBot: 0xc8905a,
      dirLight: 0xfff2d8
    }
  },
  {
    id: 'skin_operating_room',
    name: 'Operating Room',
    title: "Translators Booth",
    desc: "A glass interpreter's booth with headsets, dictionaries and a bell",
    world: 'w_translators_booth',
    indoor: true,
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'dust_motes',
    fog: { near: 55, far: 130 },
    light: { ambient: 0.95, hemi: 0.9, dir: 0.85 },
    colors: {
      bg: 0xd2f1e6, sky: 0xd2f1e6,
      ground: 0xbfe9db, groundStripe: 0xff7a59, groundAccent: 0xfff3dc,
      wallA: 0xe6f7ee, wallB: 0x1fa39a, wallGlow: 0xffe08a,
      archMain: 0xffffff, archGlow: 0xfff0b0,
      lane: 0xffffff,
      gateBase: 0x14756f, gateGlow: 0xffd23f,
      particle: 0xffffff, particleB: 0xffe9b0,
      coin: 0xffcc22,
      ambient: 0xfffaf0, hemiTop: 0xfffbf0, hemiBot: 0xf2dcc0,
      dirLight: 0xfff6e4
    }
  },
  {
    id: 'skin_research_lab',
    name: 'Research Lab',
    title: "Codebreakers Lab",
    desc: "Where the Guild decodes scattered scripts: bubbling inkwells, cipher wheels",
    world: 'w_codebreakers_lab',
    indoor: true,
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'dust_motes',
    fog: { near: 55, far: 130 },
    light: { ambient: 0.95, hemi: 0.9, dir: 0.85 },
    colors: {
      bg: 0xf8e6b4, sky: 0xf8e6b4,
      ground: 0xeccb8a, groundStripe: 0xd9663a, groundAccent: 0xf6dfaa,
      wallA: 0xffe9b0, wallB: 0x2f9e8c, wallGlow: 0xffc46a,
      archMain: 0xe8c890, archGlow: 0xfff0c8,
      lane: 0xfff0c8,
      gateBase: 0x6a4a1a, gateGlow: 0xffbf4a,
      particle: 0xfff6d8, particleB: 0xbff0e4,
      coin: 0xffcc22,
      ambient: 0xfff2d6, hemiTop: 0xfff8e6, hemiBot: 0xe0b078,
      dirLight: 0xfff4dc
    }
  },
  {
    id: 'skin_ambulance_bay',
    name: 'Ambulance Bay',
    title: "Midnight Platform",
    desc: "A night-train platform: lamps, luggage carts, a rubber duck on night duty",
    world: 'w_midnight_platform',
    indoor: true,
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'dust_motes',
    fog: { near: 55, far: 130 },
    light: { ambient: 0.95, hemi: 0.9, dir: 0.85 },
    colors: {
      bg: 0x9cbfec, sky: 0x9cbfec,
      ground: 0xe6c28e, groundStripe: 0xf2b134, groundAccent: 0xdcb47c,
      wallA: 0xf6dca0, wallB: 0xb83a3c, wallGlow: 0xffd77a,
      archMain: 0x2a3a5c, archGlow: 0xffe08a,
      lane: 0xfff0cc,
      gateBase: 0x233f7d, gateGlow: 0xffd23f,
      particle: 0xfff3c0, particleB: 0xffe28a,
      coin: 0xffcc22,
      ambient: 0xfff4e0, hemiTop: 0xe8f0ff, hemiBot: 0xe0c090,
      dirLight: 0xfff0d0
    }
  },
  {
    id: 'skin_surgical_theater',
    name: 'Surgical Theater',
    title: "Milan Opera House",
    desc: "Velvet curtains, a chasing marquee, balcony boxes, spotlights, a trophy",
    world: 'w_milan_opera_house',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'sparks',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    colors: {
      bg: 0xffe2c8, sky: 0xffe2c8,
      ground: 0xb3122f, groundStripe: 0xffc83d, groundAccent: 0xe0264d,
      wallA: 0x8f0e2c, wallB: 0xffc83d, wallGlow: 0xffc83d,
      archMain: 0xffffff, archGlow: 0xffc83d,
      lane: 0xffc83d,
      gateBase: 0x1f3fb8, gateGlow: 0xffc83d,
      particle: 0xfff0a0, particleB: 0xffe0c0,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xfff2e6, hemiBot: 0xcf8a7a,
      dirLight: 0xfff2d8
    }
  },
  {
    id: 'skin_candy_lab',
    name: 'Candy Lab',
    title: "Sweet Shop of Words",
    desc: "A sweet shop: swirl lollipops, jars of gumdrops, a tiered cake",
    world: 'w_sweet_shop_of_words',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'capsule_bits',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    colors: {
      bg: 0xffdcee, sky: 0xffdcee,
      ground: 0xfff3fa, groundStripe: 0xff6aa8, groundAccent: 0xc9f5e4,
      wallA: 0xffc2e0, wallB: 0xff6aa8, wallGlow: 0x7ff0c6,
      archMain: 0xffffff, archGlow: 0xff6aa8,
      lane: 0xff6aa8,
      gateBase: 0x7a3bd0, gateGlow: 0xffee7a,
      particle: 0xffffff, particleB: 0xffd0e8,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xfff4fa, hemiBot: 0xe8b0c8,
      dirLight: 0xffffff
    }
  },
  {
    id: 'skin_xray_vision',
    name: 'X-Ray Vision',
    title: "Berlin Disco Cellar",
    desc: "A glowing underground disco: mirror ball, light boxes, speakers, sweeping beams",
    world: 'w_berlin_disco_cellar',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'capsule_bits',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    colors: {
      bg: 0xffd8b8, sky: 0xffd8b8,
      ground: 0xfff0e0, groundStripe: 0xff4fa8, groundAccent: 0xffd0a0,
      wallA: 0xe8703a, wallB: 0xff4fa8, wallGlow: 0x2ec8f0,
      archMain: 0xffe7c4, archGlow: 0xff4fa8,
      lane: 0xffffff,
      gateBase: 0x7a3acc, gateGlow: 0x2ec8f0,
      particle: 0xffffff, particleB: 0xffd0f0,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xfff2e8, hemiBot: 0xf0a8a0,
      dirLight: 0xffffff
    }
  },
  {
    id: 'skin_pediatric_playland',
    name: 'Pediatric Playland',
    title: "Alphabet Playroom",
    desc: "A giant playroom: letter blocks, slide, ball pit, a toy train round the walls",
    world: 'w_alphabet_playroom',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'bubbles',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.85 },
    colors: {
      bg: 0xfff0d0, sky: 0xffe6a8,
      ground: 0xf2d4a2, groundStripe: 0xffd23f, groundAccent: 0xecc78e,
      wallA: 0xfff3dc, wallB: 0xff7ab8, wallGlow: 0xffd23f,
      archMain: 0xffffff, archGlow: 0xffd23f,
      lane: 0x5aa0ff,
      gateBase: 0x3d6fe0, gateGlow: 0xff7ab8,
      particle: 0xffffff, particleB: 0xbfe6ff,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xeaf6ff, hemiBot: 0xcfd8f0,
      dirLight: 0xfff6e0
    }
  },
  {
    id: 'skin_sunshine_rehab_garden',
    name: 'Sunshine Rehab Garden',
    title: "Kyoto Tea Garden",
    desc: "A sunny stroll past pergolas, flower beds, a fountain and a tiny windmill",
    world: 'w_kyoto_tea_garden',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'dust_motes',
    fog: { near: 60, far: 160 },
    light: { ambient: 0.8, hemi: 0.8, dir: 1.0 },
    sky: { top: 0x1f86ee, horizon: 0xbfe6ff, sun: 0xfff2c0 },
    colors: {
      bg: 0xcdeeff, sky: 0x2f9bf0,
      ground: 0xe9d3ac, groundStripe: 0xd9c08f, groundAccent: 0xe0c99c,
      wallA: 0x2fae58, wallB: 0xffd23f, wallGlow: 0xfff2a0,
      archMain: 0x3fbf5a, archGlow: 0xffffff,
      lane: 0xffffff,
      gateBase: 0x2f7fe0, gateGlow: 0xffd23f,
      particle: 0xffffff, particleB: 0xfff2a0,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xcfeaff, hemiBot: 0x9fe0a0,
      dirLight: 0xfff4d6
    }
  },
  {
    id: 'skin_cafeteria_carnival',
    name: 'Cafeteria Carnival',
    title: "Tokyo Night Market",
    desc: "Awninged food stalls, a kaiten-style conveyor of dishes, ice cream and lanterns",
    world: 'w_tokyo_night_market',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'sparks',
    fog: { near: 50, far: 140 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.85 },
    fixedSky: true,
    sky: { top: 0x1d2a6e, horizon: 0xff9a62, sun: 0xfff2c8 },
    colors: {
      bg: 0xffc890, sky: 0x1d2a6e,
      ground: 0xe3be8e, groundStripe: 0xff7a6b, groundAccent: 0xffd9a0,
      wallA: 0xfff6e2, wallB: 0x20c4b0, wallGlow: 0xffd23f,
      archMain: 0xff4d4d, archGlow: 0xffd23f,
      lane: 0xff4d4d,
      gateBase: 0x1f8fa8, gateGlow: 0xffd23f,
      particle: 0xfff2a0, particleB: 0xffd0a0,
      coin: 0xffcc22,
      ambient: 0xfff4e0, hemiTop: 0xfff6e8, hemiBot: 0xf0c8a0,
      dirLight: 0xfff0d0
    }
  },
  {
    id: 'skin_neonatal_cloud_nursery',
    name: 'Neonatal Cloud Nursery',
    title: "Lullaby Clouds",
    desc: "A pastel sky walkway where every cloud hums a lullaby in a different language",
    world: 'w_lullaby_clouds',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'bubbles',
    fog: { near: 80, far: 180 },
    light: { ambient: 0.95, hemi: 0.9, dir: 0.8 },
    sky: { top: 0x8ab8ff, horizon: 0xffd2e4, sun: 0xffe6b0 },
    colors: {
      bg: 0xffd6e6, sky: 0x8ab8ff,
      ground: 0xfff0f6, groundStripe: 0xffb3d1, groundAccent: 0xd6ecff,
      wallA: 0xffffff, wallB: 0xffb3d1, wallGlow: 0xffd6ec,
      archMain: 0xffffff, archGlow: 0xffe9a0,
      lane: 0xffffff,
      gateBase: 0x6a5be0, gateGlow: 0xffb3d1,
      particle: 0xffffff, particleB: 0xd6ecff,
      coin: 0xffcc22,
      ambient: 0xfff6fa, hemiTop: 0xeaf4ff, hemiBot: 0xffd6ec,
      dirLight: 0xfff0e0
    }
  },
  {
    id: 'skin_anatomy_amusement_park',
    name: 'Anatomy Amusement Park',
    title: "Vienna Prater Fair",
    desc: "A fairground boardwalk: ferris wheel, carousel, drop tower, popcorn cart",
    world: 'w_vienna_prater_fair',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'sparks',
    fog: { near: 60, far: 160 },
    light: { ambient: 0.75, hemi: 0.8, dir: 1.0 },
    sky: { top: 0x1f86ee, horizon: 0xb8e4ff, sun: 0xfff2c0 },
    colors: {
      bg: 0xb8e4ff, sky: 0x1f86ee,
      ground: 0xf1d3a0, groundStripe: 0xe8c78e, groundAccent: 0xf4daae,
      wallA: 0xff4d6a, wallB: 0xffd23f, wallGlow: 0xfff2a0,
      archMain: 0xff4d6a, archGlow: 0xffd23f,
      lane: 0xff4d6a,
      gateBase: 0x5a3fd0, gateGlow: 0xffd23f,
      particle: 0xfff2a0, particleB: 0xffb3d1,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xcfeaff, hemiBot: 0xf0d8b0,
      dirLight: 0xfff4d6
    }
  },
  {
    id: 'skin_pharmacy_pop_factory',
    name: 'Pharmacy Pop Factory',
    title: "Stroopwafel Factory",
    desc: "A candy-coloured factory line: conveyor, bubbling syrup tanks, turning gears",
    world: 'w_stroopwafel_factory',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'capsule_bits',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.75, hemi: 0.75, dir: 0.85 },
    colors: {
      bg: 0xcdeeff, sky: 0xcdeeff,
      ground: 0xeaf6ff, groundStripe: 0xffd23f, groundAccent: 0xd4ecff,
      wallA: 0xf4fbff, wallB: 0xff6fae, wallGlow: 0x4fb8ff,
      archMain: 0xffffff, archGlow: 0xff6fae,
      lane: 0xff6fae,
      gateBase: 0x2a6fd0, gateGlow: 0xff6fae,
      particle: 0xffffff, particleB: 0xffd0e8,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xf4fbff, hemiBot: 0xc8e0f0,
      dirLight: 0xffffff
    }
  },
  {
    id: 'skin_aquarium_imaging_center',
    name: 'Aquarium Imaging Center',
    title: "Aquarium of Tongues",
    desc: "A glass tunnel under a reef where the fish mumble in every language",
    world: 'w_aquarium_of_tongues',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'bubbles',
    fog: { near: 50, far: 140 },
    light: { ambient: 0.65, hemi: 0.65, dir: 0.75 },
    colors: {
      bg: 0x5fd0f0, sky: 0x5fd0f0,
      ground: 0xf6e6bf, groundStripe: 0x1fb4d8, groundAccent: 0xf0dcae,
      wallA: 0x1fb4d8, wallB: 0x4fe0c0, wallGlow: 0x9af0ff,
      archMain: 0xdfe8f2, archGlow: 0xffe27a,
      lane: 0x1fb4d8,
      gateBase: 0x1a4fa8, gateGlow: 0xffe27a,
      particle: 0xffffff, particleB: 0x9af0ff,
      coin: 0xffcc22,
      ambient: 0xe0f8ff, hemiTop: 0xcff6ff, hemiBot: 0x7fcfe8,
      dirLight: 0xffffff
    }
  },
  {
    id: 'skin_rooftop_helipad_resort',
    name: 'Rooftop Helipad Resort',
    title: "Paris Rooftop",
    desc: "A sun deck above a pastel skyline: loungers, juice bar, pool, balloons",
    world: 'w_paris_rooftop',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'dust_motes',
    fog: { near: 70, far: 180 },
    light: { ambient: 0.7, hemi: 0.8, dir: 1.0 },
    sky: { top: 0x2a8ff0, horizon: 0xcfeaff, sun: 0xffe9a0, sunX: -0.5, sunY: 0.4 },
    colors: {
      bg: 0xcfeaff, sky: 0x2a8ff0,
      ground: 0xf3dcc0, groundStripe: 0x5fc4b8, groundAccent: 0xf0cfa6,
      wallA: 0xf8e8c8, wallB: 0x5fc4b8, wallGlow: 0xffe9a0,
      archMain: 0xe8eef6, archGlow: 0xffe27a,
      lane: 0xffffff,
      gateBase: 0x2a5fd0, gateGlow: 0xffe27a,
      particle: 0xffffff, particleB: 0xfff0a8,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xcfeaff, hemiBot: 0xf6dcb4,
      dirLight: 0xfff0d0
    }
  },
  {
    id: 'skin_vet_and_farm_clinic',
    name: 'Vet and Farm Clinic',
    title: "Bavarian Farmyard",
    desc: "Red barn, hay bales, an animal pen, a windmill and a passing tractor",
    world: 'w_bavarian_farmyard',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'dust_motes',
    fog: { near: 60, far: 160 },
    light: { ambient: 0.75, hemi: 0.8, dir: 1.0 },
    sky: { top: 0x2a8ff0, horizon: 0xcdeeff, sun: 0xfff2c0 },
    colors: {
      bg: 0xcdeeff, sky: 0x2a8ff0,
      ground: 0xf0dcae, groundStripe: 0x7fd05a, groundAccent: 0xe2c78e,
      wallA: 0xffffff, wallB: 0x2f78d0, wallGlow: 0xfff2a0,
      archMain: 0x2f78d0, archGlow: 0xffd23f,
      lane: 0xffffff,
      gateBase: 0x2f6fd0, gateGlow: 0xffd23f,
      particle: 0xfff2a0, particleB: 0xffffff,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xcfeaff, hemiBot: 0x9fe08a,
      dirLight: 0xfff4d6
    }
  },
  {
    id: 'skin_holiday_wards',
    name: 'Holiday Wards',
    title: "Festival of Seasons",
    desc: "The town square dressed for whatever the calendar says: snow, blossom, beach, pumpkins, party",
    world: 'w_festival_of_seasons',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'sparks',
    fog: { near: 60, far: 160 },
    light: { ambient: 0.85, hemi: 0.85, dir: 0.9 },
    sky: { top: 0x4aa8f0, horizon: 0xdff0ff, sun: 0xfff2c0 },
    colors: {
      bg: 0xdff0ff, sky: 0x4aa8f0,
      ground: 0xf4e6d4, groundStripe: 0xffb8d0, groundAccent: 0xf6c985,
      wallA: 0xffffff, wallB: 0xe8584a, wallGlow: 0xffd23f,
      archMain: 0xff5a8a, archGlow: 0xffd23f,
      lane: 0xff5a8a,
      gateBase: 0x3a5fd0, gateGlow: 0xffd23f,
      particle: 0xffffff, particleB: 0xffd0e8,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xeaf4ff, hemiBot: 0xf0e0f0,
      dirLight: 0xfff4e0
    }
  },
  {
    id: 'skin_defibrillator_shock',
    name: 'Defibrillator Shock',
    title: "Warsaw Spark Park",
    desc: "An electric amusement park: Tesla coils, bumper cars, a charge-o-meter",
    world: 'w_warsaw_spark_park',
    wallType: 'world',
    archType: 'world',
    groundType: 'world',
    particleType: 'sparks',
    fog: { near: 55, far: 150 },
    light: { ambient: 0.9, hemi: 0.85, dir: 0.8 },
    colors: {
      bg: 0xbfe6ff, sky: 0xbfe6ff,
      ground: 0xfff0a8, groundStripe: 0x2f9bff, groundAccent: 0xffe070,
      wallA: 0xffe14a, wallB: 0x2f9bff, wallGlow: 0xcfeaff,
      archMain: 0xffffff, archGlow: 0x2f9bff,
      lane: 0xffffff,
      gateBase: 0x1a3fa0, gateGlow: 0xffe14a,
      particle: 0xffffff, particleB: 0xcfeaff,
      coin: 0xffcc22,
      ambient: 0xffffff, hemiTop: 0xfffbe0, hemiBot: 0xe8d890,
      dirLight: 0xffffff
    }
  }
];

/**
 * Maps set in the Great Library's rooms are "indoor"; the open and
 * other world maps are "outdoor". A run starts indoors, then moves outdoors, then is random.
 */
var INDOOR_IDS = [
  'skin_hospital_hallway', 'skin_operating_room', 'skin_research_lab',
  'skin_ambulance_bay'
];

/** The player-facing name of a map. (`skin.name` is a stable lookup key from the original game, not for display.) */
export function skinTitle(skin) {
  return (skin && (skin.title || skin.name)) || '';
}

export function isIndoorSkin(skin) {
  return !!skin && INDOOR_IDS.indexOf(skin.id) >= 0;
}

/** The Locker item that unlocks a map ("skin_cardiac_pulse" -> "map_cardiac_pulse"). */
export function mapItemId(skin) {
  return 'map_' + String(skin && skin.id || '').replace(/^skin_/, '');
}

/** Indoor maps are free for everyone; every other map has to be bought in the Locker. */
export function isMapUnlocked(skin, ownsItem) {
  return isIndoorSkin(skin) || !!(ownsItem && ownsItem(mapItemId(skin)));
}

function pickFrom(list, rand) {
  var r = rand || Math.random;
  return list[Math.floor(r() * list.length) % list.length];
}

/** The map a run opens on: one of the indoor maps, at random. */
export function getStartSkin(rand) {
  return pickFrom(SKINS.filter(isIndoorSkin), rand);
}

/**
 * The map after a transition. The first change of a run goes outdoors; after that it is any map but
 * the current one.
 * @param {object} current the map being left
 * @param {number} changesSoFar how many map changes this run has already made (0 for the first)
 * @param {function(): number} [rand]
 * @param {function(string): boolean} [ownsItem] which Locker items the player owns (omit to allow every map)
 */
export function getNextSkin(current, changesSoFar, rand, ownsItem) {
  var open = SKINS.filter(function (s) { return isMapUnlocked(s, ownsItem || function () { return true; }); });
  // The first change of a run goes outdoors, if the player has any outdoor map; otherwise it stays among the indoor ones
  var outdoor = open.filter(function (s) { return !isIndoorSkin(s); });
  var pool = changesSoFar < 1 && outdoor.length ? outdoor : open;
  var others = pool.filter(function (s) { return !current || s.id !== current.id; });
  return pickFrom(others.length ? others : pool, rand);
}

/**
 * Pick a random skin from the available pool.
 * Called at the start of each solo run.
 */
export function getRandomSkin() {
  return SKINS[Math.floor(Math.random() * SKINS.length)];
}

/**
 * Get a specific skin by name (legacy support).
 * @param {string} name
 * @returns {object}
 */
export function getSkinByName(name) {
  for (var i = 0; i < SKINS.length; i++) {
    if (SKINS[i].name === name || SKINS[i].title === name) return SKINS[i];
  }
  return SKINS[0];
}

/**
 * Get a specific skin by stable ID.
 * Used for deterministic multiplayer skin selection.
 * @param {string} skinId
 * @returns {object}
 */
export function getSkinById(skinId) {
  for (var i = 0; i < SKINS.length; i++) {
    if (SKINS[i].id === skinId) return SKINS[i];
  }
  return SKINS[0];
}

/**
 * Get all skin IDs (for multiplayer skin selection).
 * @returns {string[]}
 */
export function getAllSkinIds() {
  return SKINS.map(function (s) { return s.id; });
}

// ===== PAPER PALETTE =====
// Every map's colours are pulled toward the Paper Passport palette once, here (paper.js: no violet, no pure black, a
// little less saturation), so the sky, haze, lights, floor and walls all share one printed look.
SKINS.forEach(function (skin) {
  [skin.colors, skin.sky].forEach(function (group) {
    if (!group) return;
    Object.keys(group).forEach(function (k) {
      if (typeof group[k] === 'number' && k !== 'sunX' && k !== 'sunY') group[k] = paperize(group[k]);
    });
  });
});
