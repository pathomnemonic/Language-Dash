/**
 * shopdata.js — Shop items, quests, avatar definitions, and achievements
 *
 * ARCHITECTURE CONTRACT (v2.0.0):
 * - Exports canonical ID registries: ACHIEVEMENT_IDS, QUEST_IDS
 * - All achievement unlocking must use ACHIEVEMENT_IDS
 * - All quest definitions must use QUEST_IDS
 * - String literals for achievement or quest IDs outside registries are prohibited
 * - Contains no storage or UI imports
 * - Contains no evaluation side effects
 * - Every ID is unique
 * - Vehicle compatibility declared on every cosmetic item
 * - Achievement-gated cosmetics declare their gating achievement
 * - Quest event mappings declared on every quest
 * - Descriptions and thresholds aligned
 * - Perfect-run achievements evaluate perfectRuns counter
 * - Topic mastery: total >= 50 && correct/total >= 0.8
 */

import { isPremiumItem, premiumCents } from '../../supabase/functions/_shared/premium.js';
import { FEATURES } from '../features.js';
import { CHARACTER_MODELS, MONSTER_MODELS } from './modelcatalog.js';
import { PALS, NO_PAL } from '../companions.js';

// ═══════════════════════════════════════════════════════════
// CANONICAL ID REGISTRIES
// ═══════════════════════════════════════════════════════════

export var ACHIEVEMENT_IDS = Object.freeze({
  // First steps
  FIRST_RUN: 'ach_first_run',
  PERFECT_RUN: 'ach_perfect_run',

  // Streak milestones
  STREAK_10: 'ach_streak_10',
  STREAK_25: 'ach_streak_25',
  STREAK_50: 'ach_streak_50',
  STREAK_100: 'ach_streak_100',

  // Score milestones
  SCORE_1000: 'ach_score_1000',
  SCORE_5000: 'ach_score_5000',
  SCORE_10000: 'ach_score_10000',

  // Coin milestones
  COINS_500: 'ach_coins_500',
  COINS_5000: 'ach_coins_5000',

  // Encounter milestones
  ENCOUNTERS_100: 'ach_encounters_100',
  ENCOUNTERS_500: 'ach_encounters_500',
  ENCOUNTERS_1000: 'ach_encounters_1000',

  // Daily streak milestones
  DAILY_3: 'ach_daily_3',
  DAILY_7: 'ach_daily_7',
  DAILY_30: 'ach_daily_30',

  // Special
  ALL_SUBJECTS: 'ach_all_subjects',
  CUSTOM_CARD: 'ach_custom_card',
  SPEED_MAX: 'ach_speed_max',
  BUY_FIRST: 'ach_buy_first',
  GOLDEN_DOCTOR: 'ach_golden_doctor',

  // Topic mastery (total >= 50 && correct/total >= 0.8)
  MASTER_NEURO: 'ach_master_neuro',
  MASTER_CARDIO: 'ach_master_cardio',
  MASTER_NEPHRO: 'ach_master_nephro',
  MASTER_PSYCH: 'ach_master_psych',
  MASTER_GI: 'ach_master_gi',
  MASTER_PULM: 'ach_master_pulm',
  MASTER_ID: 'ach_master_id',
  MASTER_ENDO: 'ach_master_endo',
  MASTER_HEME: 'ach_master_heme',
  MASTER_RHEUM: 'ach_master_rheum',
  MASTER_OBGYN: 'ach_master_obgyn',
  MASTER_PEDS: 'ach_master_peds',
  MASTER_SURG: 'ach_master_surg',
  MASTER_EM: 'ach_master_em',
  MASTER_MULTI: 'ach_master_multi',

  // Mastery count milestones
  MASTER_1_SUBJECT: 'ach_master_1_subject',
  MASTER_5_SUBJECTS: 'ach_master_5_subjects',
  MASTER_10_SUBJECTS: 'ach_master_10_subjects',
  MASTER_ALL_SUBJECTS: 'ach_master_all_subjects',

  // Speed achievements (decisionMs based)
  FAST_500MS: 'ach_fast_500ms',
  FAST_300MS: 'ach_fast_300ms',

  // Collection achievements
  COLLECT_10: 'ach_collect_10',
  COLLECT_25: 'ach_collect_25',
  COLLECT_50: 'ach_collect_50',

  // Multiplayer achievements
  MP_FIRST: 'ach_mp_first',
  MP_WIN: 'ach_mp_win',
  MP_WIN_5: 'ach_mp_win5',

  // Endurance achievements
  PLAYTIME_30MIN: 'ach_playtime_30min',
  PLAYTIME_1HR: 'ach_playtime_1hr',

  // Words studied
  STUDIED_500: 'ach_studied_500',
  STUDIED_1000: 'ach_studied_1000',

  // Perfect run count achievements (uses perfectRuns counter)
  PERFECT_10: 'ach_perfect_10',
  PERFECT_50: 'ach_perfect_50',

  // Phrasebook achievements
  FLASHCARD_FIRST: 'ach_flashcard_first',
  FLASHCARD_10: 'ach_flashcard_10'
});

export var QUEST_IDS = Object.freeze({
  // The first twelve (the original daily set)
  STREAK_8: 'q_streak8',
  ENCOUNTERS_25: 'q_25enc',
  DAILY: 'q_daily',
  CORRECT_10: 'q_10correct',
  COINS_50: 'q_50coins',
  POWERUPS_3: 'q_3powerups',
  PERFECT_5: 'q_perfect5',
  SPEED_3: 'q_speed3',
  ALL_SUBJECTS_5: 'q_allsubjects',
  JUMP_5: 'q_jump5',
  SLIDE_5: 'q_slide5',
  RUSH_3: 'q_rush3',

  // Accuracy and streaks
  STREAK_12: 'q_streak12',
  STREAK_20: 'q_streak20',
  CLEAN_10: 'q_clean10',
  CLEAN_15: 'q_clean15',
  ACCURACY_80: 'q_acc80',
  ACCURACY_90: 'q_acc90',

  // Volume
  CORRECT_25: 'q_25correct',
  CORRECT_50: 'q_50correct',
  ENCOUNTERS_10: 'q_10enc',
  ENCOUNTERS_50: 'q_50enc',
  RUNS_3: 'q_3runs',
  RUNS_5: 'q_5runs',
  SCORE_1500: 'q_score1500',
  SCORE_3000: 'q_score3000',

  // Skill and collecting
  COINS_200: 'q_200coins',
  POWERUPS_5: 'q_5powerups',
  JUMP_12: 'q_jump12',
  SLIDE_12: 'q_slide12',
  RUSH_6: 'q_rush6',
  DODGE_20: 'q_dodge20',
  COINS_DAY_400: 'q_400coinsday',

  // Explore (topics and phrasebook cards)
  SUBJECTS_3: 'q_subjects3',
  SUBJECTS_8: 'q_subjects8',
  FLASH_10: 'q_flash10',
  FLASH_30: 'q_flash30',
  FLASH_RECALL_15: 'q_flashrecall15',
  FLASH_SESSIONS_2: 'q_flash2sessions',

  // Modes
  MODE_STUDY: 'q_modestudy',
  MODE_WEAKNESS: 'q_modeweakness',
  MODE_ENDLESS: 'q_modeendless',
  MODE_GAUNTLET: 'q_modegauntlet',
  MODE_CHALLENGE: 'q_modechallenge',

  // Speed and nerve
  SPEED_8: 'q_speed8',
  SPEED_15: 'q_speed15',
  BLINK_3: 'q_blink3',
  NO_CONTINUE_15: 'q_nocontinue15',
  QUICK_STREAK: 'q_quickstreak'
});

// ═══════════════════════════════════════════════════════════
// VEHICLE TYPES
// ═══════════════════════════════════════════════════════════

var VEHICLE_TYPES = Object.freeze({
  AMBULANCE: 'ambulance',
  RACECAR: 'racecar',
  HEARSE: 'hearse'
});

// ═══════════════════════════════════════════════════════════
// COMPATIBILITY HELPERS
// ═══════════════════════════════════════════════════════════

var COMPAT_HUMANOID_ONLY = Object.freeze({
  humanoid: true,
  vehicle: false,
  vehicleTypes: []
});

var COMPAT_ALL = Object.freeze({
  humanoid: true,
  vehicle: true,
  vehicleTypes: [VEHICLE_TYPES.AMBULANCE, VEHICLE_TYPES.RACECAR, VEHICLE_TYPES.HEARSE]
});

// ═══════════════════════════════════════════════════════════
// AVATARS
// ═══════════════════════════════════════════════════════════

export var AVATARS = [
  {
    id: "avatar_intern",
    name: "Newcomer",
    desc: "Fresh off the plane and eager to learn",
    price: 0,
    bodyColor: 0x2288dd,
    pantsColor: 0x1a5599,
    shoeColor: 0xff3333,
    skinColor: 0xffccaa,
    hairColor: 0x332211,
    scale: 1.0,
    legSpeed: 1.0,
    armSwing: 1.0,
    icon: "🧳"
  },
  {
    id: "avatar_attending",
    name: "Guildmaster",
    desc: "Silk-scarf authority",
    price: 1500,
    bodyColor: 0xe8e8f0,
    pantsColor: 0x334455,
    shoeColor: 0x222222,
    skinColor: 0xffccaa,
    hairColor: 0x221100,
    scale: 1.05,
    legSpeed: 0.9,
    armSwing: 0.8,
    icon: "🎩"
  },
  {
    id: "avatar_superhero",
    name: "Super Linguist",
    desc: "Rescues sentences AND the world",
    price: 3000,
    bodyColor: 0xdd2222,
    pantsColor: 0x1a1a88,
    shoeColor: 0xffcc00,
    skinColor: 0xffccaa,
    hairColor: 0x111111,
    scale: 1.1,
    legSpeed: 1.2,
    armSwing: 1.3,
    hasCape: true,
    capeColor: 0xdd2222,
    icon: "🦸"
  },
  {
    id: "avatar_robot",
    name: "Robot Translator",
    desc: "Beep boop. Translating...",
    price: 4000,
    bodyColor: 0x888899,
    pantsColor: 0x666677,
    shoeColor: 0x44aaff,
    skinColor: 0xccccdd,
    hairColor: 0x555566,
    scale: 1.0,
    legSpeed: 1.1,
    armSwing: 0.7,
    hasAntenna: true,
    glowColor: 0x44aaff,
    icon: "🤖"
  },
  {
    id: "avatar_wizard",
    name: "Wizard of Words",
    desc: "Ancient spelling arts",
    price: 5000,
    bodyColor: 0x6622aa,
    pantsColor: 0x441188,
    shoeColor: 0x886633,
    skinColor: 0xffccaa,
    hairColor: 0xcccccc,
    scale: 1.0,
    legSpeed: 0.85,
    armSwing: 1.1,
    hasWizardHat: true,
    hatColor: 0x6622aa,
    icon: "🧙"
  },
  {
    id: "avatar_zombie",
    name: "Jetlagged Traveller",
    desc: "36 hours on a layover...",
    price: 2500,
    bodyColor: 0x448844,
    pantsColor: 0x336633,
    shoeColor: 0x554433,
    skinColor: 0x88bb88,
    hairColor: 0x333322,
    scale: 1.0,
    legSpeed: 1.3,
    armSwing: 1.4,
    icon: "🧟"
  },
  {
    id: "avatar_golden",
    name: "Golden Polyglot",
    desc: "Flawless runner: 0 wrong, 20+ correct in one run",
    price: 0,
    bodyColor: 0xffd700,
    pantsColor: 0xdaa520,
    shoeColor: 0xff8c00,
    skinColor: 0xffe4b5,
    hairColor: 0xb8860b,
    scale: 1.08,
    legSpeed: 1.0,
    armSwing: 1.0,
    icon: "🏆",
    hidden: true,
    gatedBy: ACHIEVEMENT_IDS.GOLDEN_DOCTOR
  },
  // Vehicle avatars
  {
    id: "avatar_ambulance",
    name: "Shuttle Van",
    desc: "Beep beep! Rush to the next stop",
    price: 6000,
    isVehicle: true,
    vehicleType: VEHICLE_TYPES.AMBULANCE,
    bodyColor: 0xf0f0f0,
    pantsColor: 0xdddddd,
    shoeColor: 0x333333,
    skinColor: 0xf0f0f0,
    hairColor: 0xff2222,
    scale: 1.3,
    legSpeed: 1.0,
    armSwing: 0.0,
    icon: "🚐"
  },
  {
    id: "avatar_racecar",
    name: "Race Car",
    desc: "Speed through your words!",
    price: 7000,
    isVehicle: true,
    vehicleType: VEHICLE_TYPES.RACECAR,
    bodyColor: 0xdd2222,
    pantsColor: 0x222222,
    shoeColor: 0x333333,
    skinColor: 0xdd2222,
    hairColor: 0xffffff,
    scale: 1.2,
    legSpeed: 1.0,
    armSwing: 0.0,
    icon: "🏎️"
  },
  {
    id: "avatar_hearse",
    name: "Night Coach",
    desc: "A dramatic ride for dramatic mistakes",
    price: 8000,
    isVehicle: true,
    vehicleType: VEHICLE_TYPES.HEARSE,
    bodyColor: 0x222222,
    pantsColor: 0x111111,
    shoeColor: 0x333333,
    skinColor: 0x222222,
    hairColor: 0x6622aa,
    scale: 1.3,
    legSpeed: 0.8,
    armSwing: 0.0,
    glowColor: 0x8844cc,
    icon: "🚌"
  },
  // Additional character avatars
  {
    id: "avatar_nurse",
    name: "Ferry Captain",
    desc: "Calls every stop in three languages",
    price: 2000,
    bodyColor: 0xffffff,
    pantsColor: 0xffffff,
    shoeColor: 0xffffff,
    skinColor: 0xffccaa,
    hairColor: 0x553322,
    hairStyle: "ponytail",
    scale: 1.0,
    legSpeed: 1.0,
    armSwing: 1.0,
    icon: "⚓"
  },
  {
    id: "avatar_surgeon",
    name: "Pastry Chef",
    desc: "Flour on the apron and a word for every pastry",
    price: 3500,
    bodyColor: 0x338855,
    pantsColor: 0x226644,
    shoeColor: 0x44aa66,
    skinColor: 0xffccaa,
    hairColor: 0x221100,
    scale: 1.0,
    legSpeed: 0.95,
    armSwing: 0.9,
    icon: "🥐"
  },
  {
    id: "avatar_skeleton",
    name: "Fiesta Skeleton",
    desc: "Dances through every fiesta",
    price: 4000,
    bodyColor: 0xeeeedd,
    pantsColor: 0xddddcc,
    shoeColor: 0xccccbb,
    skinColor: 0xeeeedd,
    hairColor: 0xeeeedd,
    scale: 0.95,
    legSpeed: 1.1,
    armSwing: 1.2,
    icon: "💃"
  }
];

// ═══════════════════════════════════════════════════════════
// SHOP ITEMS
// ═══════════════════════════════════════════════════════════

export var SHOP_ITEMS = [
  // --- Skins (avatars) ---
  { id: "avatar_intern", name: "Newcomer", price: 0, type: "skin", color: 0x2288dd, icon: "🧳", compatibility: COMPAT_ALL },
  { id: "avatar_attending", name: "Guildmaster", price: 1500, type: "skin", color: 0xe8e8f0, icon: "🎩", compatibility: COMPAT_ALL },
  { id: "avatar_superhero", name: "Super Linguist", price: 3000, type: "skin", color: 0xdd2222, icon: "🦸", compatibility: COMPAT_ALL },
  { id: "avatar_robot", name: "Robot Translator", price: 4000, type: "skin", color: 0x888899, icon: "🤖", compatibility: COMPAT_ALL },
  { id: "avatar_wizard", name: "Wizard of Words", price: 5000, type: "skin", color: 0x6622aa, icon: "🧙", compatibility: COMPAT_ALL },
  { id: "avatar_zombie", name: "Jetlagged Traveller", price: 2500, type: "skin", color: 0x448844, icon: "🧟", compatibility: COMPAT_ALL },
  { id: "avatar_golden", name: "Golden Polyglot", price: 0, type: "skin", color: 0xffd700, icon: "🏆", hidden: true, gatedBy: ACHIEVEMENT_IDS.GOLDEN_DOCTOR, compatibility: COMPAT_ALL },
  { id: "avatar_ambulance", name: "Shuttle Van", price: 6000, type: "skin", color: 0xf0f0f0, icon: "🚐", compatibility: COMPAT_ALL },
  { id: "avatar_racecar", name: "Race Car", price: 7000, type: "skin", color: 0xdd2222, icon: "🏎️", compatibility: COMPAT_ALL },
  { id: "avatar_hearse", name: "Night Coach", price: 8000, type: "skin", color: 0x222222, icon: "🚌", compatibility: COMPAT_ALL },
  { id: "avatar_nurse", name: "Ferry Captain", price: 2000, type: "skin", color: 0xffffff, icon: "⚓", compatibility: COMPAT_ALL },
  { id: "avatar_surgeon", name: "Pastry Chef", price: 3500, type: "skin", color: 0x338855, icon: "🥐", compatibility: COMPAT_ALL },
  { id: "avatar_skeleton", name: "Fiesta Skeleton", price: 4000, type: "skin", color: 0xeeeedd, icon: "💃", compatibility: COMPAT_ALL },

  // --- Maps (places around the world; the four Library rooms are free for everyone) ---
  { id: "map_sunshine_rehab_garden", name: "Kyoto Tea Garden", desc: "A sunny stroll past pergolas, flower beds and a fountain", price: 950, type: "map", skinId: "skin_sunshine_rehab_garden", color: 0x62d06c, icon: "🌸", compatibility: COMPAT_ALL },
  { id: "map_cafeteria_carnival", name: "Tokyo Night Market", desc: "Lantern-lit food stalls and a conveyor belt of dishes", price: 1650, type: "map", skinId: "skin_cafeteria_carnival", color: 0xff4d4d, icon: "🏮", compatibility: COMPAT_ALL },
  { id: "map_neonatal_cloud_nursery", name: "Lullaby Clouds", desc: "A pastel sky walkway where every cloud hums a lullaby", price: 1850, type: "map", skinId: "skin_neonatal_cloud_nursery", color: 0xffb3d1, icon: "☁️", compatibility: COMPAT_ALL },
  { id: "map_anatomy_amusement_park", name: "Vienna Prater Fair", desc: "Ferris wheel, carousel and a very tall drop tower", price: 2100, type: "map", skinId: "skin_anatomy_amusement_park", color: 0xff4d6a, icon: "🎡", compatibility: COMPAT_ALL },
  { id: "map_pharmacy_pop_factory", name: "Stroopwafel Factory", desc: "Giant waffles roll off the candy-coloured line", price: 2350, type: "map", skinId: "skin_pharmacy_pop_factory", color: 0xff6fae, icon: "🏭", compatibility: COMPAT_ALL },
  { id: "map_aquarium_imaging_center", name: "Aquarium of Tongues", desc: "A glass tunnel under a reef where the fish mumble in every language", price: 2550, type: "map", skinId: "skin_aquarium_imaging_center", color: 0x4fe0ff, icon: "🐠", compatibility: COMPAT_ALL },
  { id: "map_rooftop_helipad_resort", name: "Paris Rooftop", desc: "A sun deck above the pastel skyline", price: 2800, type: "map", skinId: "skin_rooftop_helipad_resort", color: 0x2fd0d8, icon: "🗼", compatibility: COMPAT_ALL },
  { id: "map_vet_and_farm_clinic", name: "Bavarian Farmyard", desc: "A red barn, hay bales and very opinionated animals", price: 1150, type: "map", skinId: "skin_vet_and_farm_clinic", color: 0xd9382f, icon: "🐄", compatibility: COMPAT_ALL },
  { id: "map_holiday_wards", name: "Festival of Seasons", desc: "The square dressed for the season: snow, blossoms, beaches, pumpkins or a party", price: 1400, type: "map", skinId: "skin_holiday_wards", color: 0xff5a8a, icon: "🎉", compatibility: COMPAT_ALL },
  { id: "map_pediatric_playland", name: "Alphabet Playroom", desc: "A giant playroom of letter blocks and a toy train", price: 700, type: "map", skinId: "skin_pediatric_playland", color: 0xff7ab8, icon: "🔤", compatibility: COMPAT_ALL },
  { id: "map_neural_highway", name: "Shanghai Night Highway", desc: "A violet circuit-board speedway under the stars", price: 3050, type: "map", skinId: "skin_neural_highway", color: 0xaa66ff, icon: "🌃", compatibility: COMPAT_ALL },
  { id: "map_vascular_rush", name: "Monsoon Slide Park", desc: "A splash-park slide in warm rain", price: 3250, type: "map", skinId: "skin_vascular_rush", color: 0xff5566, icon: "🌧️", compatibility: COMPAT_ALL },
  { id: "map_neon_er", name: "Seoul Neon Alley", desc: "An all-night neon alley with a jukebox diner", price: 3500, type: "map", skinId: "skin_neon_er", color: 0xff4488, icon: "🍜", compatibility: COMPAT_ALL },
  { id: "map_surgical_theater", name: "Milan Opera House", desc: "Velvet curtains, spotlights and a standing ovation", price: 3750, type: "map", skinId: "skin_surgical_theater", color: 0x88ddff, icon: "🎭", compatibility: COMPAT_ALL },
  { id: "map_candy_lab", name: "Sweet Shop of Words", desc: "A sweet shop where every jar holds a word", price: 3950, type: "map", skinId: "skin_candy_lab", color: 0xff88cc, icon: "🍬", compatibility: COMPAT_ALL },
  { id: "map_prescription_sunset", name: "Algarve Sunset", desc: "Golden hour on a boardwalk: lighthouse, surf shack and ice pops", price: 4200, type: "map", skinId: "skin_prescription_sunset", color: 0xffaa55, icon: "🌅", compatibility: COMPAT_ALL },
  { id: "map_skeletal_corridor", name: "Calavera Fiesta", desc: "A friendly skeleton street party under giant rib arches", price: 4450, type: "map", skinId: "skin_skeletal_corridor", color: 0xffeedd, icon: "💀", compatibility: COMPAT_ALL },
  { id: "map_cellular_matrix", name: "Taipei Bubble Tea Plaza", desc: "A jelly-bright plaza of giant cups and bouncing castles", price: 4650, type: "map", skinId: "skin_cellular_matrix", color: 0x66ffaa, icon: "🧋", compatibility: COMPAT_ALL },
  { id: "map_dna_helix_tunnel", name: "Rosetta Hall", desc: "A carnival hall of giant twin spirals and letter-block pyramids", price: 4900, type: "map", skinId: "skin_dna_helix_tunnel", color: 0x66aaff, icon: "🪨", compatibility: COMPAT_ALL },
  { id: "map_cardiac_pulse", name: "Verona Balcony Carnival", desc: "A valentine carnival of heart balloons and rose bushes", price: 5150, type: "map", skinId: "skin_cardiac_pulse", color: 0xff5588, icon: "💌", compatibility: COMPAT_ALL },
  { id: "map_xray_vision", name: "Berlin Disco Cellar", desc: "A glowing underground disco where every skeleton can dance", price: 5350, type: "map", skinId: "skin_xray_vision", color: 0x44eeff, icon: "🪩", compatibility: COMPAT_ALL },
  { id: "map_defibrillator_shock", name: "Warsaw Spark Park", desc: "An electric amusement park: Tesla coils, bumper cars and a charge-o-meter", price: 5600, type: "map", skinId: "skin_defibrillator_shock", color: 0xffee66, icon: "⚡", compatibility: COMPAT_ALL },

  // --- The Hush and its relatives ---
  { id: "monster_classic", name: "The Hush", price: 0, type: "monster", color: 0x220044, icon: "👾", compatibility: COMPAT_ALL },
  { id: "monster_wraith", name: "Echo Wraith", price: 3000, type: "monster", color: 0x33ccff, icon: "👻", compatibility: COMPAT_ALL },
  { id: "monster_golem", name: "Dictionary Golem", price: 5000, type: "monster", color: 0xffaa33, icon: "📚", compatibility: COMPAT_ALL },
  { id: "monster_kraken", name: "Tongue-Twister Kraken", price: 7000, type: "monster", color: 0xff7733, icon: "🐙", compatibility: COMPAT_ALL },

  // --- Hats (humanoid only) ---
  { id: "hat_none", name: "No Hat", price: 0, type: "hat", color: null, compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_beret", name: "Parisian Beret", price: 400, type: "hat", color: 0xb5373b, icon: "🎨", desc: "Worn at an angle that says: I have opinions about croissants.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_paperboat", name: "Paper Boat Hat", price: 300, type: "hat", color: 0xf1ead6, icon: "⛵", desc: "Folded from yesterday's newspaper. Floats, mostly.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_bucket", name: "Bucket Hat", price: 500, type: "hat", color: 0x4aa56a, icon: "🪣", desc: "Rain, sun, ferry spray: it has handled all three.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_flatcap", name: "Flat Cap", price: 600, type: "hat", color: 0x8a7a66, icon: "🧢", desc: "A tweed cap from a Dublin market, ideal for haggling over idioms.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_tam", name: "Tam o' Shanter", price: 700, type: "hat", color: 0xd9432c, icon: "🏴", desc: "A Scottish bonnet with a red pom-pom you can spot across a glen.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_boater", name: "Gondolier's Boater", price: 800, type: "hat", color: 0xe9d8a0, icon: "🚣", desc: "A straw boater with a striped ribbon, straight off a Venice canal.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_panama", name: "Panama Hat", price: 900, type: "hat", color: 0xe3d3a1, icon: "👒", desc: "Woven in Ecuador, not Panama. Everyone corrects the name.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_bowler", name: "Bowler Hat", price: 1000, type: "hat", color: 0x2b3445, icon: "🎩", desc: "A London bowler: polite, round and always on time.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_ricehat", name: "Rice-Field Hat", price: 1100, type: "hat", color: 0xd7b66e, icon: "🌾", desc: "A wide woven straw cone that keeps off sun and rain from Hanoi to Hunan.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_fez", name: "Marrakech Fez", price: 1300, type: "hat", color: 0xb3262f, icon: "🕌", desc: "A red felt fez bought in the Marrakech souk, tassel included.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_pith", name: "Pith Helmet", price: 1500, type: "hat", color: 0xe9dcb8, icon: "🧭", desc: "For expeditions into the unexplored corners of verb tables.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_ushanka", name: "Ushanka", price: 1700, type: "hat", color: 0x8a8a92, icon: "❄️", desc: "A fur-flapped winter hat for a very long platform in Novosibirsk.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_aviator", name: "Aviator Cap", price: 2000, type: "hat", color: 0x7a4a2a, icon: "🛩️", desc: "Leather cap, goggles pushed up: for dawn flights over any border.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_laurel", name: "Laurel Wreath", price: 2500, type: "hat", color: 0x4aa56a, icon: "🏛️", desc: "For anyone who finishes a long run. Ancient Greece would approve.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_chullo", name: "Chullo", price: 2800, type: "hat", color: 0xd9432c, icon: "🏔️", desc: "A knitted Andean cap with ear flaps and tassels, from a market high above Cusco.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "hat_sombrero", name: "Wide Sombrero", price: 3500, type: "hat", color: 0xd9b366, icon: "🎉", desc: "A wide-brimmed sombrero for the longest, loudest fiesta.", compatibility: COMPAT_HUMANOID_ONLY },

  // --- Trails (all avatars) ---
  { id: "trail_none", name: "No Trail", price: 0, type: "trail", color: null, compatibility: COMPAT_ALL },
  { id: "trail_planes", name: "Paper Planes", price: 500, type: "trail", color: 0x5da9d6, desc: "Folded paper planes glide out behind you: every farewell note you never sent.", compatibility: COMPAT_ALL },
  { id: "trail_fireflies", name: "Fireflies", price: 1500, type: "trail", color: 0xd8d040, desc: "Fireflies blink behind you, like the lights of a village you just ran through at dusk.", compatibility: COMPAT_ALL },
  { id: "trail_sakura", name: "Cherry Blossoms", price: 900, type: "trail", color: 0xf4a6b8, desc: "Cherry blossom petals tumble in your wake, a week of spring in Kyoto in a single run.", compatibility: COMPAT_ALL },
  { id: "trail_streamers", name: "Party Streamers", price: 2000, type: "trail", color: 0xd9432c, desc: "Curling party streamers burst out behind you, courtesy of someone else's birthday.", compatibility: COMPAT_ALL },
  { id: "trail_lanterns", name: "Sky Lanterns", price: 2300, type: "trail", color: 0xf2b134, desc: "Paper sky lanterns rise behind you with a small flame flickering in each.", compatibility: COMPAT_ALL },
  { id: "trail_glyphs", name: "Say-It Bubbles", price: 3300, type: "trail", color: 0x0e8c8a, desc: "Speech bubbles float up wearing a letter each: A, あ, Я, ع, 한.", compatibility: COMPAT_ALL },
  { id: "trail_stamps", name: "Passport Stamps", price: 1200, type: "trail", color: 0xd9432c, desc: "Perforated stamps thunk down behind you in every Guild colour. Border control waves you through.", compatibility: COMPAT_ALL },
  { id: "trail_postcards", name: "Postcards", price: 600, type: "trail", color: 0xf2b134, desc: "Postcards flip end over end behind you: wish you were here, wish you were faster.", compatibility: COMPAT_ALL },
  { id: "trail_snow", name: "Snowflakes", price: 2700, type: "trail", color: 0xa9d4ee, desc: "Six-armed snowflakes drift behind you, straight from a Swedish winter morning.", compatibility: COMPAT_ALL },
  { id: "trail_footprints", name: "Sandy Footprints", price: 450, type: "trail", color: 0xb99560, desc: "Left, right, left: your footprints stay pressed in the sand for a moment.", compatibility: COMPAT_ALL },
  { id: "trail_ink", name: "Ink Splatter", price: 750, type: "trail", color: 0x1b2a41, desc: "Splats of navy ink pop out behind you. Somebody dropped the inkwell, and nobody minds.", compatibility: COMPAT_ALL },
  { id: "trail_leaves", name: "Maple Leaves", price: 300, type: "trail", color: 0xd9432c, desc: "Red and gold maple leaves flutter down behind you, a Canadian autumn in your wake.", compatibility: COMPAT_ALL },

  // --- Gear (humanoid only) ---
  { id: "gear_none", name: "No Gear", price: 0, type: "gear", color: null, compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_satchel", name: "Airmail Satchel", price: 300, type: "gear", color: 0x8b5a2b, icon: "✉️", desc: "A courier's satchel with red and blue airmail stripes.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_compass", name: "Brass Compass", price: 500, type: "gear", color: 0xd9a63a, icon: "🧭", desc: "Always points north. You choose the direction of the words.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_binoculars", name: "Binoculars", price: 700, type: "gear", color: 0x3b4452, icon: "🔭", desc: "For spotting gates (and birds) from far away.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_tube", name: "Map Tube", price: 800, type: "gear", color: 0x0e8c8a, icon: "🗺️", desc: "A tube of rolled-up maps. One of them is of the Library.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_camera", name: "Pocket Camera", price: 900, type: "gear", color: 0x2f3a4c, icon: "📷", desc: "Snap every sign you cannot read yet.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_pillow", name: "Travel Pillow", price: 1000, type: "gear", color: 0x7b3f6e, icon: "🛌", desc: "A neck pillow for the overnight train and the long vowels.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_umbrella", name: "Furled Umbrella", price: 1200, type: "gear", color: 0x5da9d6, icon: "☂️", desc: "Because it always rains in the one city you forgot to check.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_lantern", name: "Hand Lantern", price: 1400, type: "gear", color: 0xd9a63a, icon: "🏮", desc: "A hand lantern for the Library's lower stacks.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_spyglass", name: "Brass Spyglass", price: 1600, type: "gear", color: 0x8a5f1c, icon: "🔍", desc: "For reading road signs three villages away.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_ukulele", name: "Travelling Ukulele", price: 1800, type: "gear", color: 0xc98a4a, icon: "🎶", desc: "Plays three chords and a farewell song in four languages.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_fan", name: "Folding Fan", price: 2000, type: "gear", color: 0xd9432c, icon: "🌸", desc: "A paper hand fan for hot platforms and sharp comebacks.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_accordion", name: "Street Accordion", price: 2200, type: "gear", color: 0xb3262f, icon: "🎵", desc: "A squeezebox that has played every station platform in Europe.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_suitcase", name: "Sticker Suitcase", price: 2500, type: "gear", color: 0xd9432c, icon: "🧳", desc: "A hard-shell case with a sticker from every stop.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_kite", name: "Festival Kite", price: 2800, type: "gear", color: 0xd9432c, icon: "🪁", desc: "A diamond kite with a long tail that follows you across the sky.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "gear_globe", name: "Pocket Globe", price: 3500, type: "gear", color: 0x3e86c4, icon: "🌍", desc: "A little world to spin when you cannot choose where to go next.", compatibility: COMPAT_HUMANOID_ONLY },

  // --- Clothing (humanoid only) ---
  { id: "cloth_none", name: "No Clothing", price: 0, type: "clothing", color: null, compatibility: COMPAT_HUMANOID_ONLY },
  { id: "cloth_scarf", name: "Tartan Scarf", price: 500, type: "clothing", color: 0xd9432c, icon: "🧣", desc: "A wool tartan scarf with fringe. Cosy in every climate.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "cloth_linen", name: "Linen Shirt", price: 800, type: "clothing", color: 0xe9dcc2, icon: "👕", desc: "A breezy linen shirt, creased by the best journeys.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "cloth_denim", name: "Denim Jacket", price: 1000, type: "clothing", color: 0x4a78b0, icon: "👖", desc: "Faded denim with brass buttons, the same in every language.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "cloth_slicker", name: "Rain Slicker", price: 1200, type: "clothing", color: 0xf2c230, icon: "🌧️", desc: "Bright yellow with a deep hood, ready for any harbour.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "cloth_tracksuit", name: "Tracksuit", price: 1500, type: "clothing", color: 0x0e8c8a, icon: "🏃", desc: "Teal with white stripes, made for sprinting through stations.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "cloth_happi", name: "Festival Happi", price: 2000, type: "clothing", color: 0x1f3a6b, icon: "🎐", desc: "A navy happi coat with a white collar, worn at Japanese summer festivals.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "cloth_vest", name: "Alpine Vest", price: 2200, type: "clothing", color: 0x2e9e5b, icon: "⛰️", desc: "A green waistcoat with red lacing, from a village above the tree line.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "cloth_parka", name: "Expedition Parka", price: 2800, type: "clothing", color: 0xd9742c, icon: "🧊", desc: "A hooded parka with a fur ruff for the coldest border crossings.", compatibility: COMPAT_HUMANOID_ONLY },
  { id: "cloth_poncho", name: "Striped Poncho", price: 3000, type: "clothing", color: 0xd9432c, icon: "🌄", desc: "A woven poncho with fringe, in the colours of an Andean market.", compatibility: COMPAT_HUMANOID_ONLY },
];

// --- Pals (see companions.js): a travel companion on the Home screen; one free, the rest to buy, and "no buddy" for anyone who prefers none ---
SHOP_ITEMS.push({ id: NO_PAL, name: "No pal", desc: "A quiet Home screen", price: 0, type: "pal", color: 0x445566, icon: "🚫", compatibility: COMPAT_ALL });
PALS.forEach(function (p) {
  SHOP_ITEMS.push({ id: p.id, name: p.name, desc: p.desc, price: p.price, type: "pal", color: p.color, icon: p.emoji, compatibility: COMPAT_ALL });
});


// ═══════════════════════════════════════════════════════════
// ANIMATED 3D MODELS (see modelcatalog.js)
// The starter guide is now a real animated model. The original blocky Newcomer stays
// available as "Classic Runner" because only it can wear hats, gear and outfits.
// ═══════════════════════════════════════════════════════════

(function registerModels() {
  var intern = AVATARS[0];
  AVATARS.push(Object.assign({}, intern, {
    id: "avatar_classic",
    name: "Classic Runner",
    desc: "The original blocky runner. Works with every hat, gear and outfit"
  }));
  SHOP_ITEMS.push({ id: "avatar_classic", name: "Classic Runner", price: 0, type: "skin", color: 0x2288dd, icon: "🧳", compatibility: COMPAT_ALL });

  CHARACTER_MODELS.forEach(function (m) {
    if (m.id === "avatar_intern") {
      intern.isModel = true;
      intern.modelUrl = "models/" + m.file;
      intern.name = m.name;
      intern.desc = m.desc;
      intern.bodyColor = m.color;
      intern.icon = m.icon;
      intern.parts = m.parts || [];
      intern.scale = m.scale || 1.0;
      // (the Locker lists the shop entry, so it takes the hero's name too)
      SHOP_ITEMS.forEach(function (it) { if (it.id === "avatar_intern") { it.name = m.name; it.icon = m.icon; it.color = m.color; } });
      return;
    }
    AVATARS.push({
      id: m.id,
      name: m.name,
      desc: m.desc,
      price: m.price,
      // Stand-in colors used until the 3D model has finished loading
      bodyColor: m.color,
      pantsColor: 0x334455,
      shoeColor: 0x222233,
      skinColor: 0xe0b090,
      hairColor: 0x332211,
      scale: m.scale || 1.0,
      legSpeed: 1.0,
      armSwing: 1.0,
      isModel: true,
      parts: m.parts || [],
      modelUrl: "models/" + m.file,
      icon: m.icon
    });
    SHOP_ITEMS.push({ id: m.id, name: m.name, price: m.price, type: "skin", color: m.color, icon: m.icon, compatibility: COMPAT_HUMANOID_ONLY });
  });

  MONSTER_MODELS.forEach(function (m) {
    SHOP_ITEMS.push({ id: m.id, name: m.name, price: m.price, type: "monster", color: m.color, icon: m.icon, compatibility: COMPAT_ALL });
  });
})();

// ═══════════════════════════════════════════════════════════
// ARCHIVED ITEMS
// The original blocky characters, the vehicles and the original monsters are archived: they stay in the code (and in
// anything a player already owns), but the Locker does not show them and nobody is left wearing one.
// Set ARCHIVE_CLASSIC to false to bring them back.
// ═══════════════════════════════════════════════════════════

export var ARCHIVE_CLASSIC = true;

var ARCHIVED_IDS = {};
(function markArchived() {
  AVATARS.forEach(function (a) { if (!a.isModel) ARCHIVED_IDS[a.id] = true; });
  var modelMonsters = {};
  MONSTER_MODELS.forEach(function (m) { modelMonsters[m.id] = true; });
  SHOP_ITEMS.forEach(function (i) { if (i.type === "monster" && !modelMonsters[i.id]) ARCHIVED_IDS[i.id] = true; });
})();

/** True for an archived character or monster (kept in code, hidden from players). */
export function isArchivedItem(id) { return ARCHIVE_CLASSIC && ARCHIVED_IDS[id] === true; }

// Delisted heroes: ids the shop no longer sells; a player who already owns one keeps it (the Locker still shows it to them).
// None at the moment: every hero in the roster is for sale.
export var DELISTED_HEROES = [];

/** True for a hero that is no longer sold (it stays with anyone who owns it). */
export function isDelisted(id) { return DELISTED_HEROES.indexOf(id) >= 0; }

/** The delisted heroes' shop entries, for the Locker to show to the players who own them. */
export var DELISTED_ITEMS = SHOP_ITEMS.filter(function (i) { return isDelisted(i.id); });

/** What the Locker may sell: everything except archived and delisted items. */
export var LOCKER_ITEMS = SHOP_ITEMS.filter(function (i) { return !isArchivedItem(i.id) && !isDelisted(i.id); });

// Some items are sold for real money only (supabase/functions/_shared/premium.js has the list and the prices). They
// have no coin price, so nothing that works from coin prices (affordable dots, "cheapest thing wanted") picks them up.
LOCKER_ITEMS.forEach(function (i) {
  if (FEATURES.backend && isPremiumItem(i.id)) { i.coinValue = i.price; i.price = 0; i.premium = true; i.usdCents = premiumCents(i.id); }
});

// ═══════════════════════════════════════════════════════════
// QUESTS
// Each quest declares its event mapping so storage can
// evaluate progress without the engine referencing quest IDs.
// ═══════════════════════════════════════════════════════════

/**
 * The daily quest pool. Each day a handful are picked from it (see pickDailyQuests), one per category, so the
 * list changes every day and every kind of play gets a quest.
 *
 *   metric: what is measured (storage.js _questMetrics turns a finished run into these numbers)
 *   agg:    'sum' adds up across the day's runs, 'max' keeps the best single run, 'distinct' counts different things
 */
export var QUESTS = [
  { id: QUEST_IDS.STREAK_8, title: 'Hot Streak', desc: '8 correct in a row in one run', target: 8, reward: 30, category: 'accuracy', metric: 'bestStreak', agg: 'max' },
  { id: QUEST_IDS.PERFECT_5, title: 'Perfect Five', desc: '5 correct in a row without a mistake', target: 5, reward: 30, category: 'accuracy', metric: 'bestStreak', agg: 'max' },
  { id: QUEST_IDS.STREAK_12, title: 'On a Roll', desc: '12 correct in a row in one run', target: 12, reward: 50, category: 'accuracy', metric: 'bestStreak', agg: 'max' },
  { id: QUEST_IDS.STREAK_20, title: 'Unstoppable', desc: '20 correct in a row in one run', target: 20, reward: 70, category: 'accuracy', metric: 'bestStreak', agg: 'max' },
  { id: QUEST_IDS.CLEAN_10, title: 'Clean Sheet', desc: 'Finish a run with 10+ correct and no mistakes', target: 10, reward: 50, category: 'accuracy', metric: 'cleanCorrect', agg: 'max' },
  { id: QUEST_IDS.CLEAN_15, title: 'Spotless', desc: 'Finish a run with 15+ correct and no mistakes', target: 15, reward: 70, category: 'accuracy', metric: 'cleanCorrect', agg: 'max' },
  { id: QUEST_IDS.ACCURACY_80, title: 'Sharp Tongue', desc: 'Finish a run of 10+ answers at 80% accuracy or better', target: 80, reward: 40, category: 'accuracy', metric: 'accuracyOf10', agg: 'max' },
  { id: QUEST_IDS.ACCURACY_90, title: 'Native Ear', desc: 'Finish a run of 10+ answers at 90% accuracy or better', target: 90, reward: 60, category: 'accuracy', metric: 'accuracyOf10', agg: 'max' },
  { id: QUEST_IDS.ENCOUNTERS_10, title: 'Warm-Up', desc: 'Answer 10 words today', target: 10, reward: 20, category: 'volume', metric: 'encountersCompleted', agg: 'sum' },
  { id: QUEST_IDS.ENCOUNTERS_25, title: 'Marathon', desc: 'Answer 25 words today', target: 25, reward: 40, category: 'volume', metric: 'encountersCompleted', agg: 'sum' },
  { id: QUEST_IDS.ENCOUNTERS_50, title: 'Long Haul', desc: 'Answer 50 words today', target: 50, reward: 70, category: 'volume', metric: 'encountersCompleted', agg: 'sum' },
  { id: QUEST_IDS.CORRECT_10, title: 'Sharp Ears', desc: '10 correct answers today', target: 10, reward: 30, category: 'volume', metric: 'correct', agg: 'sum' },
  { id: QUEST_IDS.CORRECT_25, title: 'Quick Study', desc: '25 correct answers today', target: 25, reward: 50, category: 'volume', metric: 'correct', agg: 'sum' },
  { id: QUEST_IDS.CORRECT_50, title: 'Word Bank', desc: '50 correct answers today', target: 50, reward: 70, category: 'volume', metric: 'correct', agg: 'sum' },
  { id: QUEST_IDS.RUNS_3, title: 'Three Stops', desc: 'Finish 3 runs today', target: 3, reward: 30, category: 'volume', metric: 'runs', agg: 'sum' },
  { id: QUEST_IDS.RUNS_5, title: 'Grand Tour', desc: 'Finish 5 runs today', target: 5, reward: 50, category: 'volume', metric: 'runs', agg: 'sum' },
  { id: QUEST_IDS.SCORE_1500, title: 'High Scorer', desc: 'Score 5,000 points in one run', target: 5000, reward: 40, category: 'volume', metric: 'score', agg: 'max' },
  { id: QUEST_IDS.SCORE_3000, title: 'Big Score', desc: 'Score 12,000 points in one run', target: 12000, reward: 60, category: 'volume', metric: 'score', agg: 'max' },
  { id: QUEST_IDS.COINS_50, title: 'Pocket Change', desc: 'Collect 200 coins in one run', target: 200, reward: 30, category: 'skill', metric: 'coinsCollected', agg: 'max' },
  { id: QUEST_IDS.COINS_200, title: 'Souvenir Hunter', desc: 'Collect 500 coins in one run', target: 500, reward: 50, category: 'skill', metric: 'coinsCollected', agg: 'max' },
  { id: QUEST_IDS.COINS_DAY_400, title: 'Coin Rush', desc: 'Collect 1,000 coins today', target: 1000, reward: 50, category: 'skill', metric: 'coinsCollected', agg: 'sum' },
  { id: QUEST_IDS.POWERUPS_3, title: 'Powered Up', desc: 'Collect 3 power-ups in one run', target: 3, reward: 50, category: 'skill', metric: 'powerupsCollected', agg: 'max' },
  { id: QUEST_IDS.POWERUPS_5, title: 'Power Hungry', desc: 'Collect 5 power-ups in one run', target: 5, reward: 60, category: 'skill', metric: 'powerupsCollected', agg: 'max' },
  { id: QUEST_IDS.JUMP_5, title: 'Puddle Hopper', desc: 'Jump over 3 obstacles in one run', target: 3, reward: 20, category: 'skill', metric: 'obstaclesJumped', agg: 'max' },
  { id: QUEST_IDS.JUMP_12, title: 'Hurdler', desc: 'Jump over 6 obstacles in one run', target: 6, reward: 40, category: 'skill', metric: 'obstaclesJumped', agg: 'max' },
  { id: QUEST_IDS.SLIDE_5, title: 'Limbo Learner', desc: 'Slide under 3 obstacles in one run', target: 3, reward: 20, category: 'skill', metric: 'obstaclesSlid', agg: 'max' },
  { id: QUEST_IDS.SLIDE_12, title: 'Limbo King', desc: 'Slide under 6 obstacles in one run', target: 6, reward: 40, category: 'skill', metric: 'obstaclesSlid', agg: 'max' },
  { id: QUEST_IDS.RUSH_3, title: 'Rush Hour', desc: 'Rush through 3 gates in one run', target: 3, reward: 30, category: 'skill', metric: 'rushesUsed', agg: 'max' },
  { id: QUEST_IDS.RUSH_6, title: 'Rush Master', desc: 'Rush through 6 gates in one run', target: 6, reward: 50, category: 'skill', metric: 'rushesUsed', agg: 'max' },
  { id: QUEST_IDS.DODGE_20, title: 'Acrobat', desc: 'Jump or slide past 10 obstacles in one run', target: 10, reward: 50, category: 'skill', metric: 'dodges', agg: 'max' },
  { id: QUEST_IDS.SUBJECTS_3, title: 'Triple Threat', desc: 'Answer words from 3 different topics today', target: 3, reward: 20, category: 'explore', metric: 'subjects', agg: 'distinct' },
  { id: QUEST_IDS.ALL_SUBJECTS_5, title: 'Well-Travelled', desc: 'Answer words from 5 different topics today', target: 5, reward: 50, category: 'explore', metric: 'subjects', agg: 'distinct' },
  { id: QUEST_IDS.SUBJECTS_8, title: 'Polymath', desc: 'Answer words from 8 different topics today', target: 8, reward: 70, category: 'explore', metric: 'subjects', agg: 'distinct' },
  { id: QUEST_IDS.FLASH_10, title: 'Phrasebook Warm-Up', desc: 'Go through 10 phrasebook cards today', target: 10, reward: 30, category: 'explore', metric: 'flashcards', agg: 'sum' },
  { id: QUEST_IDS.FLASH_30, title: 'Phrasebook Marathon', desc: 'Go through 30 phrasebook cards today', target: 30, reward: 50, category: 'explore', metric: 'flashcards', agg: 'sum' },
  { id: QUEST_IDS.FLASH_RECALL_15, title: 'Total Recall', desc: 'Know 15 phrasebook cards today', target: 15, reward: 40, category: 'explore', metric: 'flashcardsKnown', agg: 'sum' },
  { id: QUEST_IDS.FLASH_SESSIONS_2, title: 'Two Sessions', desc: 'Finish 2 phrasebook sessions today', target: 2, reward: 30, category: 'explore', metric: 'flashcardSessions', agg: 'sum' },
  { id: QUEST_IDS.DAILY, title: 'Daily Delivery', desc: 'Complete the daily run', target: 1, reward: 50, category: 'mode', metric: 'dailyCompleted', agg: 'sum' },
  { id: QUEST_IDS.MODE_STUDY, title: 'Study Session', desc: 'Finish a run in Study mode', target: 1, reward: 30, category: 'mode', metric: 'mode_study', agg: 'sum' },
  { id: QUEST_IDS.MODE_WEAKNESS, title: 'Face the Tricky Ones', desc: 'Finish a run in Weakness mode', target: 1, reward: 40, category: 'mode', metric: 'mode_weakness', agg: 'sum' },
  { id: QUEST_IDS.MODE_ENDLESS, title: 'Endless Runner', desc: 'Finish an Endless run', target: 1, reward: 20, category: 'mode', metric: 'mode_endless', agg: 'sum' },
  { id: QUEST_IDS.MODE_GAUNTLET, title: 'Brave the Gauntlet', desc: 'Finish a Weekly Gauntlet run', target: 1, reward: 60, category: 'mode', metric: 'mode_tournament', agg: 'sum' },
  { id: QUEST_IDS.MODE_CHALLENGE, title: 'Take a Challenge', desc: 'Finish a friend challenge run', target: 1, reward: 40, category: 'mode', metric: 'mode_challenge', agg: 'sum' },
  { id: QUEST_IDS.SPEED_3, title: 'Speed Round', desc: 'Answer 3 words correctly in under 2 seconds each', target: 3, reward: 40, category: 'speed', metric: 'quick', agg: 'sum' },
  { id: QUEST_IDS.SPEED_8, title: 'Quick Draw', desc: 'Answer 8 words correctly in under 2 seconds each', target: 8, reward: 50, category: 'speed', metric: 'quick', agg: 'sum' },
  { id: QUEST_IDS.SPEED_15, title: 'Lightning', desc: 'Answer 15 words correctly in under 2 seconds each', target: 15, reward: 70, category: 'speed', metric: 'quick', agg: 'sum' },
  { id: QUEST_IDS.BLINK_3, title: 'Blink', desc: 'Answer 2 words correctly in under 1 second each', target: 2, reward: 50, category: 'speed', metric: 'blink', agg: 'sum' },
  { id: QUEST_IDS.NO_CONTINUE_15, title: 'No Second Chances', desc: 'Answer 15 words in one run without using a continue', target: 15, reward: 40, category: 'speed', metric: 'noContinue', agg: 'max' },
  { id: QUEST_IDS.QUICK_STREAK, title: 'Quick Pair', desc: 'Get 2 quick correct answers (under 2 s) in one run', target: 2, reward: 30, category: 'speed', metric: 'quickInRun', agg: 'max' }
];

export var QUEST_CATEGORIES = Object.freeze(['accuracy', 'volume', 'skill', 'explore', 'mode', 'speed']);

/** How many quests are on offer each day. */
export var DAILY_QUEST_COUNT = QUEST_CATEGORIES.length;

function hashString(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function seededRandom(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Which quests are on offer on a given day: one from each category, chosen by the date so every player sees the
 * same list, and never one that was on offer the day before.
 * @param {string} dateKey e.g. '2026-10-03'
 * @param {string[]} [avoidIds] ids to skip (yesterday's quests)
 * @returns {string[]} quest ids
 */
/** What it costs to swap one quest for a new one (a few seconds of play: more than a quest's reward would be a trap). */
export var QUEST_SWAP_COST = 75;

/**
 * The quest to offer in place of one the player wants rid of: one that is not already on offer today and not finished,
 * preferring one they have not started (so it is a fresh goal) and one of the same kind.
 * @param {string[]} offeredIds quests on offer today
 * @param {string} oldId the quest being swapped out
 * @param {function(string): number} progressOf today's progress on a quest
 * @param {function(): number} [rand]
 * @returns {string|null}
 */
export function pickReplacementQuest(offeredIds, oldId, progressOf, rand) {
  var old = QUESTS.filter(function (q) { return q.id === oldId; })[0];
  var open = QUESTS.filter(function (q) { return offeredIds.indexOf(q.id) < 0 && (progressOf(q.id) || 0) < q.target; });
  var same = function (q) { return old && q.category === old.category; };
  var fresh = function (q) { return !(progressOf(q.id) > 0); };
  var tiers = [
    open.filter(function (q) { return fresh(q) && same(q); }),
    open.filter(fresh),
    open.filter(same),
    open
  ];
  for (var i = 0; i < tiers.length; i++) {
    if (tiers[i].length) return tiers[i][Math.floor((rand || Math.random)() * tiers[i].length) % tiers[i].length].id;
  }
  return null;
}

export function pickDailyQuests(dateKey, avoidIds) {
  var avoid = avoidIds || [];
  var rand = seededRandom(hashString('ld-quests:' + dateKey));
  return QUEST_CATEGORIES.map(function (cat) {
    var all = QUESTS.filter(function (q) { return q.category === cat; });
    var fresh = all.filter(function (q) { return avoid.indexOf(q.id) < 0; });
    var from = fresh.length ? fresh : all;
    return from[Math.floor(rand() * from.length)].id;
  });
}

// ═══════════════════════════════════════════════════════════
// ACHIEVEMENTS
// Each achievement uses ACHIEVEMENT_IDS for its id.
// Descriptions are aligned with evaluation thresholds.
// ═══════════════════════════════════════════════════════════

export var ACHIEVEMENTS = [
  // --- First steps ---
  { id: ACHIEVEMENT_IDS.FIRST_RUN, name: "First Steps", desc: "Complete your first run (1+ words answered)", icon: "🏃", condition: "totalEncounters >= 1" },
  { id: ACHIEVEMENT_IDS.PERFECT_RUN, name: "Word Perfect", desc: "Finish a run with no mistakes and at least 5 correct", icon: "💯", condition: "completed && correct >= 5 && wrong === 0" },

  // --- Streak milestones ---
  { id: ACHIEVEMENT_IDS.STREAK_10, name: "On Fire", desc: "Reach a 10-word streak", icon: "🔥", condition: "bestStreak >= 10" },
  { id: ACHIEVEMENT_IDS.STREAK_25, name: "Unstoppable", desc: "Reach a 25-word streak", icon: "⚡", condition: "bestStreak >= 25" },
  { id: ACHIEVEMENT_IDS.STREAK_50, name: "Legendary", desc: "Reach a 50-word streak", icon: "👑", condition: "bestStreak >= 50" },
  { id: ACHIEVEMENT_IDS.STREAK_100, name: "Mythical", desc: "Reach a 100-word streak", icon: "🌟", condition: "bestStreak >= 100" },

  // --- Score milestones ---
  { id: ACHIEVEMENT_IDS.SCORE_1000, name: "Rising Star", desc: "Score 5,000 points in one run", icon: "⭐", condition: "score >= 5000" },
  { id: ACHIEVEMENT_IDS.SCORE_5000, name: "High Flyer", desc: "Score 15,000 points in one run", icon: "🌟", condition: "score >= 15000" },
  { id: ACHIEVEMENT_IDS.SCORE_10000, name: "Guild Champion", desc: "Score 30,000 points in one run", icon: "🏆", condition: "score >= 30000" },

  // --- Coin milestones ---
  { id: ACHIEVEMENT_IDS.COINS_500, name: "Piggy Bank", desc: "Earn 500 total coins across all runs", icon: "🪙", condition: "totalCoinsEarned >= 500" },
  { id: ACHIEVEMENT_IDS.COINS_5000, name: "Wealthy Wanderer", desc: "Earn 5,000 total coins across all runs", icon: "💰", condition: "totalCoinsEarned >= 5000" },

  // --- Encounter milestones ---
  { id: ACHIEVEMENT_IDS.ENCOUNTERS_100, name: "Seasoned Traveller", desc: "Answer 100 total words", icon: "📚", condition: "totalEncounters >= 100" },
  { id: ACHIEVEMENT_IDS.ENCOUNTERS_500, name: "Veteran Wordrunner", desc: "Answer 500 total words", icon: "🎖️", condition: "totalEncounters >= 500" },
  { id: ACHIEVEMENT_IDS.ENCOUNTERS_1000, name: "Grand Wordrunner", desc: "Answer 1,000 total words", icon: "🏅", condition: "totalEncounters >= 1000" },

  // --- Daily streak milestones ---
  { id: ACHIEVEMENT_IDS.DAILY_3, name: "Consistent", desc: "Complete 3 daily runs in a row", icon: "📅", condition: "dailyStreak >= 3" },
  { id: ACHIEVEMENT_IDS.DAILY_7, name: "Dedicated", desc: "Complete 7 daily runs in a row", icon: "🗓️", condition: "dailyStreak >= 7" },
  { id: ACHIEVEMENT_IDS.DAILY_30, name: "Committed", desc: "Complete 30 daily runs in a row", icon: "🔥", condition: "dailyStreak >= 30" },

  // --- Special achievements ---
  { id: ACHIEVEMENT_IDS.ALL_SUBJECTS, name: "Citizen of the World", desc: "Answer words from all 15 topics", icon: "🌍", condition: "subjectsTouched >= 15" },
  { id: ACHIEVEMENT_IDS.CUSTOM_CARD, name: "Phrasemaker", desc: "Create your first custom word card", icon: "📝", condition: "customCardCreated" },
  { id: ACHIEVEMENT_IDS.SPEED_MAX, name: "Top Gear", desc: "Reach the top gear in one run", icon: "🏎️", condition: "userSpeed >= 10" },
  { id: ACHIEVEMENT_IDS.BUY_FIRST, name: "Souvenir Shopper", desc: "Buy your first item from the Locker", icon: "🛍️", condition: "firstPurchase" },
  { id: ACHIEVEMENT_IDS.GOLDEN_DOCTOR, name: "Golden Polyglot", desc: "Perfect run with 20+ correct answers (0 wrong, 20+ correct)", icon: "✨", condition: "completed && wrong === 0 && correct >= 20" },

  // --- Topic mastery (total >= 50 && correct/total >= 0.8) ---
  { id: ACHIEVEMENT_IDS.MASTER_NEURO, name: "Master of Basics", desc: "80%+ accuracy in Basics (50+ words answered)", icon: "👋", condition: "subjectMastery:Basics" },
  { id: ACHIEVEMENT_IDS.MASTER_CARDIO, name: "Master of People & Family", desc: "80%+ accuracy in People & Family (50+ words answered)", icon: "👪", condition: "subjectMastery:People & Family" },
  { id: ACHIEVEMENT_IDS.MASTER_NEPHRO, name: "Master of Body & Health", desc: "80%+ accuracy in Body & Health (50+ words answered)", icon: "🖐️", condition: "subjectMastery:Body & Health" },
  { id: ACHIEVEMENT_IDS.MASTER_PSYCH, name: "Master of Food & Drink", desc: "80%+ accuracy in Food & Drink (50+ words answered)", icon: "🍜", condition: "subjectMastery:Food & Drink" },
  { id: ACHIEVEMENT_IDS.MASTER_GI, name: "Master of Home & Things", desc: "80%+ accuracy in Home & Things (50+ words answered)", icon: "🏠", condition: "subjectMastery:Home & Things" },
  { id: ACHIEVEMENT_IDS.MASTER_PULM, name: "Master of Nature & Animals", desc: "80%+ accuracy in Nature & Animals (50+ words answered)", icon: "🦜", condition: "subjectMastery:Nature & Animals" },
  { id: ACHIEVEMENT_IDS.MASTER_ID, name: "Master of Travel & Places", desc: "80%+ accuracy in Travel & Places (50+ words answered)", icon: "🧳", condition: "subjectMastery:Travel & Places" },
  { id: ACHIEVEMENT_IDS.MASTER_ENDO, name: "Master of Time & Numbers", desc: "80%+ accuracy in Time & Numbers (50+ words answered)", icon: "⏰", condition: "subjectMastery:Time & Numbers" },
  { id: ACHIEVEMENT_IDS.MASTER_HEME, name: "Master of Colors & Describing", desc: "80%+ accuracy in Colors & Describing (50+ words answered)", icon: "🎨", condition: "subjectMastery:Colors & Describing" },
  { id: ACHIEVEMENT_IDS.MASTER_RHEUM, name: "Master of Actions", desc: "80%+ accuracy in Actions (50+ words answered)", icon: "🏃", condition: "subjectMastery:Actions" },
  { id: ACHIEVEMENT_IDS.MASTER_OBGYN, name: "Master of Feelings & Thinking", desc: "80%+ accuracy in Feelings & Thinking (50+ words answered)", icon: "💭", condition: "subjectMastery:Feelings & Thinking" },
  { id: ACHIEVEMENT_IDS.MASTER_PEDS, name: "Master of Talking", desc: "80%+ accuracy in Talking (50+ words answered)", icon: "💬", condition: "subjectMastery:Talking" },
  { id: ACHIEVEMENT_IDS.MASTER_SURG, name: "Master of Work & School", desc: "80%+ accuracy in Work & School (50+ words answered)", icon: "🎒", condition: "subjectMastery:Work & School" },
  { id: ACHIEVEMENT_IDS.MASTER_EM, name: "Master of Shopping & Money", desc: "80%+ accuracy in Shopping & Money (50+ words answered)", icon: "🛍️", condition: "subjectMastery:Shopping & Money" },
  { id: ACHIEVEMENT_IDS.MASTER_MULTI, name: "Master of Small Words", desc: "80%+ accuracy in Small Words (50+ words answered)", icon: "🔗", condition: "subjectMastery:Small Words" },

  // --- Mastery count milestones ---
  { id: ACHIEVEMENT_IDS.MASTER_1_SUBJECT, name: "Specialist", desc: "Achieve mastery in 1 topic (50+ words, 80%+ accuracy)", icon: "🎓", condition: "masteredSubjects >= 1" },
  { id: ACHIEVEMENT_IDS.MASTER_5_SUBJECTS, name: "Polymath", desc: "Achieve mastery in 5 topics", icon: "📖", condition: "masteredSubjects >= 5" },
  { id: ACHIEVEMENT_IDS.MASTER_10_SUBJECTS, name: "Linguist", desc: "Achieve mastery in 10 topics", icon: "🧑‍🎓", condition: "masteredSubjects >= 10" },
  { id: ACHIEVEMENT_IDS.MASTER_ALL_SUBJECTS, name: "Babel Master", desc: "Achieve mastery in all 15 topics", icon: "🏛️", condition: "masteredSubjects >= 15" },

  // --- Speed achievements (uses decisionMs, correct answer only, player-controlled) ---
  { id: ACHIEVEMENT_IDS.FAST_500MS, name: "Quick Draw", desc: "Answer correctly in under 500ms", icon: "⚡", condition: "fastestCorrectAnswer < 500" },
  { id: ACHIEVEMENT_IDS.FAST_300MS, name: "Lightning Reflexes", desc: "Answer correctly in under 300ms", icon: "🌩️", condition: "fastestCorrectAnswer < 300" },

  // --- Collection achievements ---
  { id: ACHIEVEMENT_IDS.COLLECT_10, name: "Collector", desc: "Own 10 items from the Locker", icon: "🎒", condition: "ownedItems >= 10" },
  { id: ACHIEVEMENT_IDS.COLLECT_25, name: "Hoarder", desc: "Own 25 items from the Locker", icon: "🏪", condition: "ownedItems >= 25" },
  { id: ACHIEVEMENT_IDS.COLLECT_50, name: "Completionist", desc: "Own 50 items from the Locker", icon: "💎", condition: "ownedItems >= 50" },

  // --- Multiplayer achievements ---
  { id: ACHIEVEMENT_IDS.MP_FIRST, name: "Challenger", desc: "Play your first versus match", icon: "🎮", condition: "multiplayerGamesPlayed >= 1" },
  { id: ACHIEVEMENT_IDS.MP_WIN, name: "Victor", desc: "Win a versus match", icon: "🥇", condition: "multiplayerWins >= 1" },
  { id: ACHIEVEMENT_IDS.MP_WIN_5, name: "Dominant", desc: "Win 5 versus matches", icon: "🏆", condition: "multiplayerWins >= 5" },

  // --- Endurance achievements ---
  { id: ACHIEVEMENT_IDS.PLAYTIME_30MIN, name: "Marathon Runner", desc: "Play for 30 minutes total", icon: "⏱️", condition: "totalPlayTimeMs >= 1800000" },
  { id: ACHIEVEMENT_IDS.PLAYTIME_1HR, name: "Long Journey", desc: "Play for 1 hour total", icon: "🕐", condition: "totalPlayTimeMs >= 3600000" },

  // --- Words studied ---
  { id: ACHIEVEMENT_IDS.STUDIED_500, name: "Scholar", desc: "Study 500 total words across all modes", icon: "📚", condition: "totalCardsStudied >= 500" },
  { id: ACHIEVEMENT_IDS.STUDIED_1000, name: "Professor", desc: "Study 1,000 total words across all modes", icon: "🎓", condition: "totalCardsStudied >= 1000" },

  // --- Perfect run count achievements (uses perfectRuns counter, NOT lifetime correct) ---
  { id: ACHIEVEMENT_IDS.PERFECT_10, name: "Word-Perfect Ten", desc: "Complete 10 perfect runs (no mistakes, 5+ correct each)", icon: "🎯", condition: "perfectRuns >= 10" },
  { id: ACHIEVEMENT_IDS.PERFECT_50, name: "Flawless", desc: "Complete 50 perfect runs", icon: "💫", condition: "perfectRuns >= 50" },

  // --- Phrasebook achievements ---
  { id: ACHIEVEMENT_IDS.FLASHCARD_FIRST, name: "Phrasebook Beginner", desc: "Complete your first phrasebook session", icon: "📖", condition: "flashcardSessions >= 1" },
  { id: ACHIEVEMENT_IDS.FLASHCARD_10, name: "Phrasebook Regular", desc: "Complete 10 phrasebook sessions", icon: "📝", condition: "flashcardSessions >= 10" }
];

// ═══════════════════════════════════════════════════════════
// CONTINUE COST
// ═══════════════════════════════════════════════════════════

export var CONTINUE_COST = 100;


function previousDateKey(dateKey) {
  var d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

var QUEST_EPOCH = '2026-01-01';
var _questDayCache = {};

/**
 * The quest ids on offer on a date. Same for every player and every device. The chain runs day by day from a
 * fixed start date, so a day never repeats the quests of the day before.
 * @param {string} dateKey
 * @returns {string[]}
 */
export function questIdsForDate(dateKey) {
  if (_questDayCache[dateKey]) return _questDayCache[dateKey].slice();
  if (dateKey <= QUEST_EPOCH) return pickDailyQuests(dateKey);
  var chain = [];
  var d = dateKey;
  var guard = 0;
  while (d > QUEST_EPOCH && !_questDayCache[d] && guard++ < 4000) { chain.push(d); d = previousDateKey(d); }
  var prev = _questDayCache[d] || (_questDayCache[d] = pickDailyQuests(d));
  for (var i = chain.length - 1; i >= 0; i--) {
    prev = _questDayCache[chain[i]] = pickDailyQuests(chain[i], prev);
  }
  return _questDayCache[dateKey].slice();
}

/** How the badges are grouped on the Profile (every badge is in exactly one group; a test checks that). */
export var ACHIEVEMENT_GROUPS = [
  { id: 'start', title: 'Getting started', icon: '🌱', keys: ['FIRST_RUN', 'PERFECT_RUN', 'GOLDEN_DOCTOR', 'CUSTOM_CARD', 'BUY_FIRST', 'FLASHCARD_FIRST', 'FLASHCARD_10'] },
  { id: 'streaks', title: 'Streaks and perfect runs', icon: '🔥', keys: ['STREAK_10', 'STREAK_25', 'STREAK_50', 'STREAK_100', 'PERFECT_10', 'PERFECT_50', 'DAILY_3', 'DAILY_7', 'DAILY_30'] },
  { id: 'scores', title: 'Scores and coins', icon: '🏆', keys: ['SCORE_1000', 'SCORE_5000', 'SCORE_10000', 'COINS_500', 'COINS_5000'] },
  { id: 'cards', title: 'Words answered', icon: '📚', keys: ['ENCOUNTERS_100', 'ENCOUNTERS_500', 'ENCOUNTERS_1000', 'STUDIED_500', 'STUDIED_1000', 'ALL_SUBJECTS'] },
  { id: 'mastery', title: 'Topic mastery', icon: '🎓', keys: ['MASTER_NEURO', 'MASTER_CARDIO', 'MASTER_NEPHRO', 'MASTER_PSYCH', 'MASTER_GI', 'MASTER_PULM', 'MASTER_ID', 'MASTER_ENDO', 'MASTER_HEME', 'MASTER_RHEUM', 'MASTER_OBGYN', 'MASTER_PEDS', 'MASTER_SURG', 'MASTER_EM', 'MASTER_MULTI', 'MASTER_1_SUBJECT', 'MASTER_5_SUBJECTS', 'MASTER_10_SUBJECTS', 'MASTER_ALL_SUBJECTS'] },
  { id: 'speed', title: 'Speed and stamina', icon: '⚡', keys: ['FAST_500MS', 'FAST_300MS', 'SPEED_MAX', 'PLAYTIME_30MIN', 'PLAYTIME_1HR'] },
  { id: 'collect', title: 'Locker and versus', icon: '🎒', keys: ['COLLECT_10', 'COLLECT_25', 'COLLECT_50', 'MP_FIRST', 'MP_WIN', 'MP_WIN_5'] }
];
