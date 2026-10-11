# Cast report

Heroes (ids, 3D files, parts and palettes unchanged; names, descs, icons, colors new). Backstories (long form) are in js/stories.js.

| id | name | one-liner |
|---|---|---|
| avatar_intern | Tour-Guide Tiago | Lisbon guide who leads with a tiny flag and says "this way, please" in six accents. (pt, es) |
| avatar_m_nurse | Captain Klara | Gdansk ferry captain who announces every stop in three languages. Nobody has missed one. (pl, sv) |
| avatar_m_paramedic | Platform Pavan | Delhi station porter: bags on his head, every announcement by heart. (hi, en) |
| avatar_m_intern | Trekker Tove | Swedish hiker who answers "how far?" with "just over that hill". Always. (sv, en) |
| avatar_m_explorer | Rancher Rafa | Pampas rancher who learned English from a radio drama and a very patient horse. (es, en) |
| avatar_m_adventurer | Backpacker Bao | Twelve countries so far; his phrasebook is mostly tape and sticky notes. (zh, ja) |
| avatar_m_rogue | Hoodie Hana | Seoul night owl with six snack pockets who whispers the answer a beat early. (ko, ja) |
| avatar_m_scout | Mapmaker Mona | Cairo mapmaker who doodles a smug camel on every map she draws. (ar, fr) |
| avatar_m_zombie | Jetlag Jo | Landed three time zones ago and has not caught up. Still answers first. (en, es) |
| avatar_m_ninja | Nimble Nao | Tokyo night courier on a silent bike: delivers parcels and perfect politeness. (ja, en) |
| avatar_m_skeleton | Carlota Calavera | Fiesta skeleton from Oaxaca who rattles through every song and will not sit down. (es) |
| avatar_m_orc | Gruff Gerda | Big, green, unbothered Black Forest baker. Says "genau" like a full stop. (de, nl) |
| avatar_m_wizard | Polyglot Pip | Casts spells in fourteen languages and mispronounces the fifteenth. (it, fr, en) |
| avatar_m_alien | Abby Abroad | An alien on exchange in Amsterdam: learned Dutch from bike bells and cheese labels. (nl, en) |
| avatar_m_robot | Babelbot Mo | Built to translate anything; keeps translating the toaster by accident. (ja, zh, en) |
| avatar_m_hooded | Cipher Cass | Hooded codebreaker who solves ciphers on cafe napkins between sips of tea. (ru, pl) |
| avatar_m_barbarian | Haggler Hamza | Souk stallholder who haggles in three languages and always adds a free fig. (ar, fr) |
| avatar_m_knight | Dame Dorotea | Knight of the Great Library; guards the irregular-verbs shelf with a polished shield. (it, fr) |
| avatar_m_mage | Professor Palimpsest | Reads faded scripts nobody else can, with a cup of tea going cold beside her. (ar, ru) |
| avatar_m_king | Guildmaster Gustav | Runs the Lexicon Guild. The crown suits him; the dictionary under his arm suits him more. (sv, de) |

Hush family (monster_m_* ids/files/flags unchanged)

- monster_m_ghost: The Mumble (the Mumble (free))
- monster_m_skull: The Static (the Static)
- monster_m_yeti: The Silent Letter (the Silent Letter)
- monster_m_brute: The Babble (the Babble)
- monster_m_demon: The Mispronounced (the Mispronounced (false friends))
- monster_m_dragon: The Run-On (the Run-On)
- Classic builders (js/game/monsters.js): monster_classic The Hush, monster_wraith Echo Wraith, monster_golem Dictionary Golem (back label LEXICON), monster_kraken Tongue-Twister Kraken (label TWIST). The wraith back label reads SHHH!

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
