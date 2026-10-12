/**
 * modelcatalog.js — the animated 3D heroes and Hush monsters.
 *
 * Every model here is a free download (CC0 unless noted) and is credited in public/models/CREDITS.md and the
 * README: Kenney (Blocky Characters, 3D Platformer kit), Quaternius (Farm Animals, Animated Monsters, Cute Monsters)
 * and the Khronos glTF sample Fox. Paths are relative to the site base (public/models/...).
 *
 * Heroes become avatars (shop type "skin"); monsters become the Hush's relatives (shop type "monster").
 * `flying` monsters hover above the runner, the rest stalk along the ground behind them.
 */

/**
 * Colors a hero can be dressed in. A palette is a list of swatches; "Original" (hex 0) is always offered first
 * and keeps the model's own color. Each hero has its own parts and its own palettes.
 */
function swatches(list) {
  return [{ name: 'Original', hex: 0 }].concat(list.map(function (c) { return { name: c[0], hex: c[1] }; }));
}

var FUR = swatches([['Ginger', 0xc8742a], ['Chocolate', 0x5a3a24], ['Honey', 0xe0b060], ['Cream', 0xf0e2c0], ['Slate', 0x6a7480], ['Charcoal', 0x34363c]]);
var WOOL = swatches([['Snow', 0xffffff], ['Rose', 0xf4b0c4], ['Sky', 0xa8d0f4], ['Mint', 0xa8e8cc], ['Butter', 0xf4e49a], ['Lilac', 0xcdb4ee]]);
var DARKS = swatches([['Black', 0x1d1f24], ['Charcoal', 0x3b4048], ['Navy', 0x233a6b], ['Forest', 0x2f5a3a], ['Wine', 0x6a2a3a], ['Brown', 0x6a4a2a]]);
var BRIGHTS = swatches([['Red', 0xd93030], ['Orange', 0xf08a24], ['Yellow', 0xf2cf2a], ['Lime', 0x8ad03a], ['Blue', 0x2a7ad9], ['Violet', 0x8a4fd9]]);
var HOOF = swatches([['Black', 0x1d1f24], ['Rose', 0xe08aa0], ['Gold', 0xd4a83a], ['Bone', 0xe8dcc0], ['Teal', 0x2a9a9a]]);
var PIGS = swatches([['Pink', 0xf0a6b0], ['Peach', 0xf4c0a0], ['Spotted tan', 0xc89a6a], ['Lilac', 0xcdb4ee], ['Mint', 0xa8e8cc]]);
var HORSES = swatches([['Bay', 0x7a4a30], ['Chestnut', 0xa8502a], ['Palomino', 0xe0b060], ['Grey', 0x9aa0a8], ['Black', 0x24262a], ['Cream', 0xf0e2c0]]);
// for heroes painted as one picture: the whole figure takes the tint, so the choices are light enough to stay readable
var WASH = swatches([['Rose', 0xff9fbd], ['Sky', 0x9fd0ff], ['Mint', 0x9fffcf], ['Sunny', 0xffe58a], ['Peach', 0xffb98a], ['Lilac', 0xcfa8ff], ['Ice', 0xd8f0ff]]);

/**
 * The animated 3D heroes. `parts` are the pieces of a hero a player can recolor (each part is one or more of
 * the model's materials), with a palette that suits that piece. Models painted as one texture (the blocky people,
 * the fox, Pico) get one part that tints the whole figure. `scale` sizes a hero against the standard runner
 * height (long animals are shrunk so they fit a lane). Every hero is a Wordrunner of the Lexicon Guild
 * (see docs/WORLD.md and js/stories.js). The free starter keeps the stable id "avatar_intern" that saves, the
 * leaderboard and the database already know; its name and model are the fox's.
 */
export var CHARACTER_MODELS = [
  { id: 'avatar_intern', name: 'Fika Fox', desc: 'Stockholm courier who never skips a coffee break and learns one new word per cup. (sv, en)', file: 'heroes/fox.glb', price: 0, icon: '🦊', color: 0xe8742a, scale: 0.78,
    parts: [{ key: 'tint', label: 'Fur wash', materials: ['fox_material'], palette: WASH }] },
  { id: 'hero_dummy', name: 'Crash-Test Kuba', desc: 'Warsaw safety tester who falls over beautifully and gets back up every single time. (pl, en)', file: 'heroes/dummy.glb', price: 800, icon: '🦺', color: 0xf2b134,
    parts: [{ key: 'tint', label: 'Suit wash', materials: ['texture-d'], palette: WASH }] },
  { id: 'hero_llama', name: 'Lola Llama', desc: 'Cusco pack-llama who carries four languages, six bags and one very small hat. (es, en)', file: 'heroes/llama.glb', price: 1600, icon: '🦙', color: 0xb08a63, scale: 1.15,
    parts: [
      { key: 'wool', label: 'Wool', materials: ['Brown'], palette: FUR },
      { key: 'face', label: 'Face & socks', materials: ['White'], palette: WOOL },
      { key: 'hooves', label: 'Hooves & ears', materials: ['Grey'], palette: HOOF }
    ] },
  { id: 'hero_pug', name: 'Percy Pug', desc: 'Piccadilly pug who has opinions about queueing and tea, and shares both loudly. (en, fr)', file: 'heroes/pug.glb', price: 2300, icon: '🐶', color: 0xe0c08a, scale: 0.8,
    parts: [
      { key: 'coat', label: 'Coat', materials: ['Beige'], palette: FUR },
      { key: 'mask', label: 'Mask & ears', materials: ['Brown'], palette: DARKS }
    ] },
  { id: 'hero_professor', name: 'Nonno Nico', desc: 'Bologna grandfather who swears pasta is a language and teaches it with both hands. (it, en)', file: 'heroes/professor.glb', price: 2900, icon: '🍝', color: 0x9fc4ea,
    parts: [{ key: 'tint', label: 'Shirt wash', materials: ['texture-i'], palette: WASH }] },
  { id: 'hero_cow', name: 'Clara Cowbell', desc: 'Swiss alpine cow whose bell announces every sentence before she has finished it. (de, fr, it)', file: 'heroes/cow.glb', price: 3500, icon: '🐄', color: 0x3a3a40, scale: 0.85,
    parts: [
      { key: 'patches', label: 'Patches', materials: ['Black'], palette: DARKS },
      { key: 'coat', label: 'Coat', materials: ['White'], palette: WOOL },
      { key: 'nose', label: 'Nose', materials: ['Pink'], palette: PIGS }
    ] },
  { id: 'hero_vest', name: 'Viennese Vera', desc: 'Vienna cafe waitress in a purple waistcoat who remembers every order in three languages. (de, it)', file: 'heroes/vest.glb', price: 4100, icon: '☕', color: 0x7b3f6e,
    parts: [{ key: 'tint', label: 'Waistcoat wash', materials: ['texture-e'], palette: WASH }] },
  { id: 'hero_ranger', name: 'Ranger Ravi', desc: 'Sikkim park ranger who names every bird in Hindi, then again in English for the tourists. (hi, en)', file: 'heroes/ranger.glb', price: 4700, icon: '🌲', color: 0x2e7a4a,
    parts: [{ key: 'tint', label: 'Uniform wash', materials: ['texture-m'], palette: WASH }] },
  { id: 'hero_sheep', name: 'Merino Mateo', desc: 'Patagonian sheep who counts everything in Spanish and falls asleep at eleven. Tonight it is ten. (es, en)', file: 'heroes/sheep.glb', price: 5300, icon: '🐑', color: 0xe8e8e8, scale: 0.85,
    parts: [
      { key: 'wool', label: 'Wool', materials: ['White'], palette: WOOL },
      { key: 'face', label: 'Face & legs', materials: ['Black'], palette: DARKS }
    ] },
  { id: 'hero_kimono', name: 'Kaede of Kyoto', desc: 'Tea-house host who corrects your politeness one gentle sip at a time. (ja, en)', file: 'heroes/kimono.glb', price: 6000, icon: '🍵', color: 0x1f8a6a,
    parts: [{ key: 'tint', label: 'Kimono wash', materials: ['texture-n'], palette: WASH }] },
  { id: 'hero_pig', name: 'Truffle Tonio', desc: 'Piedmont truffle pig with the best nose in Italy and a growing list of French phrases. (it, fr)', file: 'heroes/pig.glb', price: 6700, icon: '🐖', color: 0xe8a0a8, scale: 0.7,
    parts: [
      { key: 'hide', label: 'Hide', materials: ['Hide'], palette: PIGS },
      { key: 'hooves', label: 'Hooves', materials: ['Hooves'], palette: HOOF }
    ] },
  { id: 'hero_horse', name: 'Sagaan the Steppe Horse', desc: 'Mongolian steppe horse who has outrun three storms and one very long phrasebook. (zh, ru)', file: 'heroes/horse.glb', price: 7400, icon: '🐎', color: 0x7a4a30, scale: 1.0,
    parts: [
      { key: 'coat', label: 'Coat', materials: ['Coat'], palette: HORSES },
      { key: 'mane', label: 'Mane', materials: ['Mane'], palette: DARKS }
    ] },
  { id: 'hero_pirate', name: 'Port-Side Nuno', desc: 'Porto harbour pilot with an eye patch (a gull, long story) and a parrot that only speaks Portuguese. (pt, en)', file: 'heroes/pirate.glb', price: 8200, icon: '🦜', color: 0x2f3a7a,
    parts: [{ key: 'tint', label: 'Coat wash', materials: ['texture-p'], palette: WASH }] },
  { id: 'hero_zebra', name: 'Zola Zebra-Crossing', desc: 'Serengeti-born crossing guard whose stripes are so crisp that everyone stops and looks both ways. (en, fr)', file: 'heroes/zebra.glb', price: 9000, icon: '🦓', color: 0xeeeeee, scale: 1.0,
    parts: [
      { key: 'coat', label: 'Coat', materials: ['White'], palette: WOOL },
      { key: 'stripes', label: 'Stripes', materials: ['Black'], palette: BRIGHTS }
    ] },
  { id: 'hero_beep', name: 'Pico Pocketbot', desc: 'A pocket-size translator gadget with far too much antenna. Beeps in Japanese when it is happy. (ja, ko)', file: 'heroes/beep.glb', price: 10400, icon: '📻', color: 0x7a4fb5, scale: 0.9,
    parts: [{ key: 'tint', label: 'Casing wash', materials: ['colormap'], palette: WASH }] }
];

/**
 * Heroes that were retired, with what they became. No saves from before the 3D roster rebuild exist, so there is
 * nothing to migrate; the table stays so a future retirement has somewhere to go (storage.js reads it).
 */
export var RETIRED_CHARACTERS = {};

/** The recolorable parts of a character, or [] */
export function getCharacterParts(id) {
  for (var i = 0; i < CHARACTER_MODELS.length; i++) {
    if (CHARACTER_MODELS[i].id === id) return CHARACTER_MODELS[i].parts || [];
  }
  return [];
}

/**
 * The Hush and its relatives. Each is a creepy-cute rigged model; `scale` sizes it against the standard monster
 * height (the wide ones are shrunk so none fills the screen when it catches the runner). They are all dark and quiet on purpose: the Hush eats words.
 */
export var MONSTER_MODELS = [
  { id: 'hush_blot', name: 'The Blot', file: 'hush/blot.glb', price: 0, icon: '🟢', color: 0x46cb29, flying: false, scale: 0.4 },
  { id: 'hush_flutter', name: 'The Flutter', file: 'hush/flutter.glb', price: 1600, icon: '🦇', color: 0x6a3a8a, flying: true, scale: 0.55 },
  { id: 'hush_drone', name: 'The Drone', file: 'hush/drone.glb', price: 2400, icon: '🐝', color: 0xd8a820, flying: true, scale: 0.55 },
  { id: 'hush_stare', name: 'The Stare', file: 'hush/stare.glb', price: 3300, icon: '👁️', color: 0x9a7a52, flying: false, scale: 0.6 },
  { id: 'hush_snap', name: 'The Snap', file: 'hush/snap.glb', price: 4300, icon: '🦀', color: 0x9a2a2a, flying: false, scale: 0.5 },
  { id: 'hush_prickle', name: 'The Prickle', file: 'hush/prickle.glb', price: 5300, icon: '🌵', color: 0x3a7a3a, flying: false, scale: 0.6 },
  { id: 'hush_gnarl', name: 'The Gnarl', file: 'hush/gnarl.glb', price: 6400, icon: '🌳', color: 0x6a4a2a, flying: false, scale: 0.6 },
  { id: 'hush_murmur', name: 'The Murmur', file: 'hush/murmur.glb', price: 7700, icon: '🐙', color: 0x2f5a3f, flying: true, scale: 0.4 }
];

var MONSTER_BY_ID = {};
MONSTER_MODELS.forEach(function (m) { MONSTER_BY_ID[m.id] = m; });

/** @returns {object|null} catalog entry for a monster id, if it is a 3D model */
export function getMonsterModel(id) {
  return MONSTER_BY_ID[id] || null;
}

/** Public URL for a catalog file. */
export function modelUrl(file) {
  var base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  return base + 'models/' + file;
}
