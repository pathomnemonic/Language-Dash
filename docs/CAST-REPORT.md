# Cast report

Heroes and Hush monsters were rebuilt from new free 3D models (see docs/HEROES-REPORT.md and public/models/CREDITS.md). Backstories (long form) are in js/stories.js.

| id | name | model | one-liner |
|---|---|---|---|
| avatar_intern | Fika Fox | heroes/fox.glb | Stockholm courier who never skips a coffee break and learns one new word per cup. (sv, en) |
| hero_dummy | Crash-Test Kuba | heroes/dummy.glb | Warsaw safety tester who falls over beautifully and gets back up every single time. (pl, en) |
| hero_llama | Lola Llama | heroes/llama.glb | Cusco pack-llama who carries four languages, six bags and one very small hat. (es, en) |
| hero_pug | Percy Pug | heroes/pug.glb | Piccadilly pug who has opinions about queueing and tea, and shares both loudly. (en, fr) |
| hero_professor | Nonno Nico | heroes/professor.glb | Bologna grandfather who swears pasta is a language and teaches it with both hands. (it, en) |
| hero_cow | Clara Cowbell | heroes/cow.glb | Swiss alpine cow whose bell announces every sentence before she has finished it. (de, fr, it) |
| hero_vest | Viennese Vera | heroes/vest.glb | Vienna cafe waitress in a purple waistcoat who remembers every order in three languages. (de, it) |
| hero_ranger | Ranger Ravi | heroes/ranger.glb | Sikkim park ranger who names every bird in Hindi, then again in English for the tourists. (hi, en) |
| hero_sheep | Merino Mateo | heroes/sheep.glb | Patagonian sheep who counts everything in Spanish and falls asleep at eleven. Tonight it is ten. (es, en) |
| hero_kimono | Kaede of Kyoto | heroes/kimono.glb | Tea-house host who corrects your politeness one gentle sip at a time. (ja, en) |
| hero_pig | Truffle Tonio | heroes/pig.glb | Piedmont truffle pig with the best nose in Italy and a growing list of French phrases. (it, fr) |
| hero_horse | Sagaan the Steppe Horse | heroes/horse.glb | Mongolian steppe horse who has outrun three storms and one very long phrasebook. (zh, ru) |
| hero_pirate | Port-Side Nuno | heroes/pirate.glb | Porto harbour pilot with an eye patch (a gull, long story) and a parrot that only speaks Portuguese. (pt, en) |
| hero_zebra | Zola Zebra-Crossing | heroes/zebra.glb | Serengeti-born crossing guard whose stripes are so crisp that everyone stops and looks both ways. (en, fr) |
| hero_beep | Pico Pocketbot | heroes/beep.glb | A pocket-size translator gadget with far too much antenna. Beeps in Japanese when it is happy. (ja, ko) |

Hush family

- hush_blot: The Blot (hush/blot.glb)
- hush_flutter: The Flutter (hush/flutter.glb)
- hush_drone: The Drone (hush/drone.glb)
- hush_stare: The Stare (hush/stare.glb)
- hush_snap: The Snap (hush/snap.glb)
- hush_prickle: The Prickle (hush/prickle.glb)
- hush_gnarl: The Gnarl (hush/gnarl.glb)
- hush_murmur: The Murmur (hush/murmur.glb)
- Classic builders (js/game/monsters.js): monster_classic The Hush, monster_wraith Echo Wraith, monster_golem Dictionary Golem, monster_kraken Tongue-Twister Kraken (procedural, archived from the Locker).

Other changes
- Pals (js/companions.js): ids kept; renamed Maneki, Fetch, Lapin, Raposa, Mochi, Buho, Kaeru, Octo-Lingo, Long. New: pal_parrot (Polly Glot), pal_tortoise (Tortuga), pal_crane (Origami), pal_dictionary (Pocket Dictionary). Test updated.
- Shop: avatars, maps (see docs/MAP-NAMES.md), hats, gear, clothing, trails, monsters, quests and achievements all reworded. MASTER_NEURO..MASTER_MULTI map 1:1 onto the 15 topics; their `condition` strings now read `subjectMastery:<Topic>` (descriptive only).
- Palette SCRUBS renamed JACKETS; part labels 'Scrub top/pants' now 'Jacket'/'Trousers'.
- subjectstyle.js, flavor.js (streak lines, verdicts, loading lines), profileicons.js icon groups rewritten.

Could not change (another file owns it)
- js/game/trails.js (shape 'cell', 'pill', 'ekg') and js/game/trailshapes.js words (line ~137-141): trail_blood / trail_pills / trail_ekg still DRAW blood cells, pills and an EKG spike. tests/unit/trailshapes.test.js forces the description to mention heartbeat / blood cell / capsule, so trail_blood desc says "Round red petals drifting like blood cells in a rose garden". Rename the shape words (e.g. add 'petal') and simplify that desc.
- js/game/worlds.js (skin `name:` lines 23-619), js/audio.js 246-288, js/game/secrets.js 20-23, js/game/sidemotion.js 43: skin names still 'Hospital Hallway', 'Operating Room', etc. (used as keys). Map agent to rename; display names are in docs/MAP-NAMES.md.
- js/game/exammonster.js (file/identifiers `buildExamMonster`) and its internal visuals: not renamed.
- js/storage.js:577 SUBJECT_MASTERY_KEYS still maps 'Neurology'... to MASTER_*; needs the 15 topic strings in WORLD.md order. tests/unit/achievements.test.js:56-60 still uses subjectStats.Neurology/Cardiology and will need updating when storage changes.
- js/storage.js:2175 SPEED_MAX awards on peakPace >= 8 now (test updated); the ACHIEVEMENTS condition string stays `userSpeed >= 10` as instructed.
- Locker UI headings ('Exam Monsters' tab text, tests/unit/locker.test.js:177-179) are in the locker UI file.
- Quest titles 'Daily Delivery', 'Face the Tricky Ones' refer to the Daily and Weakness modes; rename those modes' UI labels to match if desired.
- Rank labels used by js/rewardsui.js come from the progression file (not edited).
