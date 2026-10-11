/**
 * clipnames.js — matching a model's animation clips to the game's states.
 *
 * Pure (no imports) so the model build tool and the game share it.
 */

/**
 * How each logical state plays. Model packs name their clips differently
 * ("CharacterArmature|Run", "Robot_Running", "Dragon_Flying"...), so each state
 * lists name patterns in priority order and the first clip that matches is used.
 * Patterns run against the clip's base name (armature prefix and the pack's
 * "Robot_"/"Alien_"/"Dragon_" prefix removed). A state with no match falls back
 * to `fallback`, so every model still animates.
 */
export var STATE_CLIPS = {
  run: { match: [/^run$/i, /^running$/i, /^running_a$/i, /^sprint$/i, /^gallop$/i, /^fast_flying$/i, /^walk$/i, /^slime_walk$/i, /^walking$/i, /^flying$/i, /^flying_idle$/i, /run/i, /walk/i, /fly/i], loop: true, scale: 1.0 },
  jump: { match: [/^jump$/i, /^jump_full_short$/i, /^runningjump$/i, /^walkjump$/i, /^jump_idle$/i, /jump/i, /hop/i, /^roll$/i], loop: false, scale: 1.5, clamp: true, fallback: 'run' }, // (a character with no jump clip tumbles in the air with its roll)
  slide: { match: [/^roll$/i, /^duck$/i, /slide/i, /crouch/i], loop: true, scale: 1.5, fallback: 'run' },
  celebrate: { match: [/^wave$/i, /^dance$/i, /^thumbsup$/i, /^clapping$/i, /^yes$/i, /victory|cheer|emote/i], loop: false, scale: 1.2, clamp: true, fallback: 'idle' },
  death: { match: [/^death$/i, /^death_a$/i, /die|dead|faint/i, /death/i, /^hitreact$/i, /^hitrecieve$/i], loop: false, scale: 1.0, clamp: true, fallback: 'idle' },
  idle: { match: [/^idle$/i, /^survey$/i, /^standing$/i, /^flying_idle$/i, /^idle_neutral$/i, /idle/i, /stand/i, /hover/i], loop: true, scale: 1.0, fallback: 'run' },
  wave: { match: [/^wave$/i, /^dance$/i, /hello/i], loop: false, scale: 1.0, fallback: 'idle' },
  // Used by monsters: the strike when it lunges at the runner
  attack: { match: [/^attack$/i, /^headbutt$/i, /^punch$/i, /^bite_front$/i, /^dragon_attack$/i, /attack/i, /bite|claw|slash|smash/i], loop: false, scale: 1.3, clamp: false, fallback: 'idle' }
};

/**
 * Each hero's own way to celebrate a right answer, where its pack has a clip that suits it better than the generic
 * wave. Keyed by the model's file name (without .glb); patterns run against the clip's base name. A hero not listed
 * (or whose clip is missing) keeps the generic celebrate/wave/idle choice.
 */
export var HERO_CELEBRATE = {};

/**
 * How fast a hero's run cycle plays, where its pack only ships a walk (the farm animals) or a slow gait. Keyed by the
 * model's file name; a hero not listed plays its run at 1x.
 */
export var HERO_RUN_SCALE = {
  llama: 1.9, zebra: 1.7, pug: 1.9, cow: 1.9, sheep: 1.9, horse: 1.7, pig: 1.9,
  wolf: 1.4, cat: 1.5, dog: 1.5
};

/** The model file name a catalog path stands for: "heroes/fox.glb" -> "fox". */
export function heroKeyFor(url) {
  var m = /([^/]+?)\.glb(\?.*)?$/i.exec(String(url || ''));
  return m ? m[1].toLowerCase() : '';
}

var PACK_PREFIX = /^(robot|alien|dragon)_/i;

/** "CharacterArmature|Run" -> "Run"; "RobotArmature|Robot_Running" -> "Running". */
export function baseClipName(name) {
  var base = String(name).split('|').pop();
  var stripped = base.replace(PACK_PREFIX, '');
  return stripped || base;
}

/** Find the clip name that best fits a state, or null. Exported for tests. */
export function findClipName(clipNames, state) {
  var def = STATE_CLIPS[state];
  if (!def) return null;
  for (var p = 0; p < def.match.length; p++) {
    for (var i = 0; i < clipNames.length; i++) {
      if (def.match[p].test(baseClipName(clipNames[i]))) return clipNames[i];
    }
  }
  return null;
}

/** Resolve a state to a clip name, following fallbacks (never loops). */
export function resolveClipName(clipNames, state, heroKey) {
  if (state === 'celebrate' && heroKey && HERO_CELEBRATE[heroKey]) {
    var own = HERO_CELEBRATE[heroKey];
    for (var h = 0; h < own.length; h++) {
      for (var c = 0; c < clipNames.length; c++) if (own[h].test(baseClipName(clipNames[c]))) return { clip: clipNames[c], state: 'celebrate' };
    }
  }
  var seen = {};
  var s = state;
  while (s && !seen[s]) {
    seen[s] = true;
    var name = findClipName(clipNames, s);
    if (name) return { clip: name, state: s };
    s = STATE_CLIPS[s] && STATE_CLIPS[s].fallback;
  }
  return clipNames.length ? { clip: clipNames[0], state: state } : null;
}

