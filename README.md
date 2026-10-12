# Language Dash

A 3D endless runner that teaches you the 1,000 most common words of a language. A word in the language you speak flashes at
the top of the screen. Three gates rush toward you, each showing a word in the language you are learning. Run through the
gate that means the same thing. One word in, one word out. Coins, power-ups, 25+ maps, a cast of Wordrunners and a creeping
silence called the Hush make the practice feel like a game.

Live at `https://pathomnemonic.github.io/Language-Dash/` (see **Deploying**). Android and iOS apps are built from the same code.

## How it works

- **The hint.** One word in the language you know (for example "dog") appears at the top of the screen.
- **The gates.** Three gates show words in the language you are learning: the right one (`perro`) and two wrong ones.
  Run through the gate that means the same thing. Languages written in another script (Japanese, Korean, Mandarin, Russian,
  Arabic, Hindi) also show a pronunciation line in Latin letters; you can turn it off in Settings.
- **After each answer** you see the pair ("dog = perro"), how to say it, and a button to hear it.
- **Obstacles** fill the lanes between questions: jump over low ones, slide under high ones, swipe around the rest.
- **The Hush.** A creeping silence eats words. A wrong answer or a lost life lets it gain on you; when it catches you the run ends.
  Answer a couple of words right and it drifts back.
- **Spaced repetition.** Every word is scheduled with FSRS (`js/fsrs.js`), so words you miss come back soon and words you
  know come back later. Missed words also return a few questions later in the same run.

## Languages

15 languages, any pair of them (15 x 14 = 210 pairs). You pick the language you speak (the hint) and the one you are
learning (the gates) on first launch and can change both any time from the **Languages** button on Home or in Settings.

English, Spanish, French, German, Italian, Portuguese, Dutch, Swedish, Polish, Russian, Japanese, Korean, Mandarin Chinese,
Arabic (Modern Standard) and Hindi.

Every pair is the same list of 1,000 concepts, ranked by how common they are (`js/lang/data/concepts.js`), with one word per
concept per language (`js/lang/data/<code>.js`). `js/lang/deck.js` joins two languages into a deck of cards. A card id is
`known-target-NNN` (for example `en-es-007`), where NNN is the word's frequency rank. Words that are identical in both
languages (a Spanish/Portuguese "hotel") cannot be a gate, so a few close pairs have slightly fewer than 1,000 cards.

### Topics and word level

Every word belongs to one of 15 topics: Basics, People & Family, Body & Health, Food & Drink, Home & Things, Nature &
Animals, Travel & Places, Time & Numbers, Colors & Describing, Actions, Feelings & Thinking, Talking, Work & School,
Shopping & Money and Small Words. **Word filters** on Home lets you pick topics and a **Word level**: the first 100,
300 or 600 words, or all 1,000. Leaving all topics off includes all of them. A word's `baseDifficulty` is 1 for ranks 1-300,
2 for 301-700 and 3 for 701-1000.

## Controls

### Touch

| Action | Gesture |
|--------|---------|
| Move left / right | Swipe left / right |
| Jump | Swipe up |
| Slide | Swipe down |
| Dash | Double-tap (or the on-screen Dash button; Settings -> Dash control) |

### Keyboard

| Action | Keys |
|--------|------|
| Move left / right | Arrow Left / Right or A / D |
| Jump | Arrow Up or W |
| Slide | Arrow Down or S |
| Dash | Shift or Space |
| Pause | Escape |

All keys can be changed in Settings -> Keyboard. Dash can be stacked up to 3 times; each stack adds speed and score, and you
cannot be hit by obstacles while dashing.

## Pace

There is no speed setting. The run starts at a comfortable jog (`START_PACE` 2, about one word every 8 seconds) and gets
0.25 faster every 3 words until it reaches `TOP_GEAR` 8 after roughly 72 words (`js/rules.js`). Relaxed pace (Settings) holds
the run at about two thirds of the starting speed and never speeds up. It is an accessibility mode: coins, levels and streaks
still count, but the run is not ranked.

## Game modes

| Mode | Description |
|------|-------------|
| **Endless** | Run until you run out of lives (3). The pace ramps up as you go. |
| **Study** | No lives lost. A word card after every answer. |
| **Weakness** ("Tricky words") | Drills the words you miss most, with extra room from the Hush. |
| **Daily 15** | Today's 15 words, one try a day, the same for everyone. Keeps your streak going. Not ranked. |
| **Weekly Gauntlet** | 30 words (the same all week) and one life. Clear it for a weekly badge and 150 bonus coins. Not ranked. |
| **Friend challenge** | Play 15 words, share a link, a friend plays the same words to beat your score. No server needed. |
| **Versus** | Real-time head-to-head over peer-to-peer WebRTC (PeerJS), with a shared word list and map. |
| **Word Quiz** | A timed block (10/20/40 words), no running, a full review at the end. |
| **Flashcards** | Flip cards or hands-free audio review; due words first. |

Shared modes (Daily, Gauntlet, challenges, Versus) deal from the 300 most common words (`js/freecards.js`), so everyone with
the same language pair gets the same words. They are deliberately not on a leaderboard, since many players finish a fixed set
perfectly.

## Obstacles and power-ups

Jump obstacles are marked with an orange up arrow, slide obstacles with a blue down arrow. Each orb floats a shape that shows
what it does:

| Power-up | Effect |
|----------|--------|
| Shield | Absorbs one hit from an obstacle or a wrong answer |
| Magnet | Pulls in nearby coins for 10 seconds |
| 2x Score | Doubles points for 15 seconds |
| Auto-Pilot | Steers to the right gate for one question |
| Frenzy | Coins are worth 5x for 8 seconds |

When you are down to 1 life, a heart may appear on the track and restores one (up to 3).

## The Hush

The Hush chases you from behind. Every run opens with a quick look back at it, then it is out of sight. It only shows up when
you slip (a wrong answer or a lost life): it drifts in from behind the camera as if catching up, and once you answer one or
two right it drifts away again. If it catches you it lunges in and the run ends. Study and Word Quiz have no way to lose,
sudden death ends on the first wrong answer, and Weakness gives you more room. Everywhere else it depends only on your answers,
so challenges and Versus stay comparable. The Hush family you can pick in the Locker: the Mumble, the Static, the Silent
Letter, the Babble, the Mispronounced, the Run-On, the Hush itself, the Echo Wraith, the Dictionary Golem and the
Tongue-Twister Kraken. (In code the monster is still `exammonster.js`.)

## Scoring

- Correct answers build your streak; every 5 in a row raises your multiplier (up to 8x).
- A faster pace earns more points per right word.
- Dashing through a gate awards bonus points by distance and stack.
- Coins you pick up are added to your total at the end of the run. A right answer is worth 2 coins plus 1 per 3 in your streak.

## Maps

Every map is a bright animated world in the Lexicon Guild's Babel: Library Hall, Translators Booth, Codebreakers Lab,
Midnight Platform, Kyoto Tea Garden, Tokyo Night Market, Lullaby Clouds, Vienna Prater Fair, Stroopwafel Factory, Aquarium
of Tongues, Paris Rooftop, Bavarian Farmyard, Festival of Seasons (which dresses itself for the calendar), Alphabet
Playroom, Shanghai Night Highway, Monsoon Slide Park, Seoul Neon Alley, Milan Opera House, Sweet Shop of Words, Algarve
Sunset, Calavera Fiesta, Taipei Bubble Tea Plaza, Rosetta Hall, Verona Balcony Carnival, Berlin Disco Cellar and Warsaw Spark
Park (the full table is in `docs/MAP-NAMES.md`). The first four are free; the others unlock at a player level (one more every
five levels, `js/game/mapunlocks.js`) or can be bought early in the Locker's Maps tab. The map changes every 10 questions, with
the music crossfading. A favorite map (Locker or Settings) stays for the whole run. Each map has one small secret to tap for
bonus coins. Map ids and the internal skin names in `js/game/worlds.js` are unchanged from the first version of the game.
The motion is decoration: tests (`tests/unit/worldmaps.test.js`) check that every map keeps the lanes clear, repeats without a
seam and stays within a draw-call and triangle budget. Players who prefer reduced motion see the scenery still.

## The cast

Twenty Wordrunners from corners of the world, each with a tiny backstory and a language they are famous for: Tour-Guide
Tiago, Captain Klara, Platform Pavan, Trekker Tove, Rancher Rafa, Backpacker Bao, Hoodie Hana, Mapmaker Mona, Jetlag Jo,
Nimble Nao, Carlota Calavera, Gruff Gerda, Polyglot Pip, Abby Abroad, Babelbot Mo, Cipher Cass, Haggler Hamza, Dame
Dorotea, Professor Palimpsest and Guildmaster Gustav (`docs/CAST-REPORT.md`, `js/stories.js`). They are real animated glTF
models with recolorable parts in the Locker. Pals (Maneki, Fetch, Polly Glot, Tortuga...), hats, gear, trails and monsters
are all in the shop. Your profile is your Passport, the Cards tab is your Phrasebook and your daily streak is the hearth
of the Lexicon Guild. The setting is described in `docs/WORLD.md`.

## Features

- **Spaced repetition** with FSRS, due words first, and the Home screen shows how many are due
- **Pronunciation** for non-Latin scripts, and text-to-speech in both languages (the hint in your voice, the gate in the target voice)
- **Custom words** - write your own, import from CSV, TSV or Anki (`.apkg`) decks of vocabulary (front = a word you know, back = the word you are learning), or have an AI make a list with the prompt in the import guide
- **Phrasebook** - search every word by topic or text, flag mistakes, see stats per word
- **Achievements and quests** - a pool of 48 quests in six categories; six are offered each day
- **Study streak, shields and a weekly goal**, a daily goal, reminders and a streak calendar
- **Profile / Passport** with badges, ranks (Tourist to Babel Master) and leagues
- **Leaderboards, friends, cohorts and study groups** (need Supabase)
- **Accessibility** - colorblind-safe palette, dyslexia font, left/right handed buttons, relaxed pace, reduced motion, keyboard play
- **Read-aloud mode** - the hint and then "Left, Middle, Right" are spoken; hands-free audio review for commutes
- **Offline** - Settings -> Data -> Play with no connection saves everything; the phone apps already contain it
- **Language Dash Pro** - the free library is the 300 most common words of every pair; Pro unlocks all 1,000 and the study tools (`docs/PRO.md`)

## Tutorial

New players get a guided practice run on the real track (`js/tutorialrun.js`): swipe left and right, jump, slide, dash, and
then pick the right gate for a real word. The practice words are the first six words of the player's own deck, by frequency
rank. A spotlight tour (`js/tour.js`, steps in `js/tourdata.js`) then walks through Home (coins, PLAY, Languages, Word
filters, each way to play), Stats, the Locker, Quests and Profile. Nothing from the tutorial is saved. It can be left any time
with the small x, and reopened from How to play on Home. Where WebGL is unavailable a simpler practice track
(`js/tutorial.js`) is used.

## Technology

- **Three.js** (r160) for rendering (bundled), real glTF models with meshopt compression
- **Web Audio API** for procedural effects and music, **Web Speech / native TTS** for pronunciation
- **PeerJS** for Versus (bundled, lazy-loaded)
- **Supabase** for leaderboards, accounts and cloud saves (bundled, lazy-loaded, optional)
- **Vite** for the dev server and production build, **Capacitor** for the Android and iOS apps
- **Vitest** (unit) and **Playwright** (end to end) for tests

Browser support: Chrome / Edge 90+, Firefox 90+, Safari 15+, and mobile Chrome and Safari. WebGL is required.

## Build, test and run

```bash
npm install
npm run dev              # local dev server
npm run lint && npm run typecheck && npm test
npm run validate:deck    # build all 210 language-pair decks and check them
npm run build            # production build into dist/
npm run test:e2e         # Playwright (needs a build)
npm run soak -- --minutes 30   # a bot plays every mode with random inputs, watching for crashes and leaks (needs a build served on :4173)
```

The production build ships a Content-Security-Policy in `index.html` (`tools/csp.mjs`; the Supabase host is read from
`VITE_SUPABASE_URL`). Word data is split into one chunk per language, so a player only downloads the languages they use.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, tests, builds with `VITE_BASE_PATH=/Language-Dash/` and
publishes to GitHub Pages (Settings -> Pages -> Source: GitHub Actions). To enable the leaderboard in the deployed build,
add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository variables. The service worker's cache is named after the build,
so every deploy starts a fresh cache, and a notice offers a reload when a new version is ready.

Manual GitHub Pages: build with `VITE_BASE_PATH=/Language-Dash/ npm run build`, publish `dist/`, and the game will be live at
`https://pathomnemonic.github.io/Language-Dash/`.

## Error reporting (Optional)

Uncaught errors and unhandled promise rejections are logged to the console. To also collect them, set a build-time endpoint that accepts a JSON `POST`:

```
VITE_ERROR_ENDPOINT=https://example.com/languagedash-errors
```

(In GitHub, add it as a repository variable named `VITE_ERROR_ENDPOINT`.) With no URL set, nothing leaves the device. Separately, players can switch on **Settings → Data → Help fix problems** to send anonymous crash and slow-frame reports to the `client_diagnostics` table (`database/schema.sql`; nobody but you can read it in the Supabase table editor; no account id is stored). Each report holds only the error message, a trimmed stack, the area it came from and the build id, with no account, score or card data, and a page load sends at most 10 distinct reports.

## Updates and offline cache

The card chunks and game code are cached as they are first used. Settings → Data → Play with no connection fetches everything else (3D heroes, monsters, maps) in one go; the phone apps already contain it all.

The service worker's cache is named after the build (the commit in CI), so every deploy starts a fresh cache. When a new version finishes installing while the game is open, a notice offers a reload.

## Tips (Optional)

Language Dash is free. To let players leave a tip, create a page on Ko-fi, Buy Me a Coffee, GitHub Sponsors or a Stripe Payment Link, then set its URL at build time:

```
VITE_TIP_URL=https://ko-fi.com/yourname
```

(In GitHub, add it as a repository variable named `VITE_TIP_URL`.) With no URL set, no tip UI is shown. When set, a "Support the developer" button appears in Settings, and a rare note appears after a good run: never during a run or quiz, only after five or more runs, at most once a week, and players can turn it off for good. Only `https` links are accepted.

## Leaderboard, Friends and Invites Setup (Optional)

The leaderboard, friend requests and match invites use [Supabase](https://supabase.com/) (free tier).

1. Create a Supabase project.
2. In the SQL editor run `database/schema.sql`, then `database/policies.sql`, then any of `cohorts.sql`, `discovery.sql`, `pro.sql`, `analytics.sql`, `analytics_views.sql` you use, and **always `database/lockdown.sql` last, then `database/audit.sql` (it must return no rows; see `docs/SECURITY.md`)** (all are safe to re-run). `lockdown.sql` closes every function and table to the app roles except the short lists the app needs; without it a project's default grants leave payment-only functions callable by any player.
3. In **Authentication -> Providers**, enable **Allow anonymous sign-ins**. Players are signed in as guests automatically; they can link an email later from the Account tab.
4. Provide your project URL and anon key, either by setting `SUPABASE_URL` / `SUPABASE_ANON_KEY` in `js/leaderboard.js`, or (preferred) with environment variables at build time:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   The anon key is safe to expose; Row Level Security protects the data.
5. Optional: Database -> Replication, confirm `match_invites` is enabled for realtime invite pop-ups (schema.sql does this).

Group boards and deck sharing use the same setup (`schema.sql` creates the tables and functions).

### Accounts and cloud saves

Players start as guests. From **Leaderboard -> Account** they can create a free account with an email and password (a guest keeps their scores, friends and groups when they upgrade), sign in on another device, and reset a forgotten password. Signed-in players get their progress saved to the cloud automatically (table `player_saves`, private to each account). If a device and the account both hold progress, the player is asked which to keep, and one device can never silently overwrite a newer save from another.

Supabase setup for accounts:

1. Re-run `database/schema.sql` and `database/policies.sql` (adds the `player_saves` table and save functions).
2. **Authentication -> Providers -> Email**: enabled by default. Decide whether to require **Confirm email** (recommended).
3. **Authentication -> URL Configuration**: set **Site URL** to your live game URL (for example `https://<user>.github.io/Language-Dash/`) and add it, plus `http://localhost:5173`, under **Redirect URLs**. Confirmation and reset links send players back here.
4. Supabase's built-in email sender is limited to a few messages per hour. For real use, add your own SMTP provider under **Authentication -> SMTP Settings** (Resend, Postmark, SendGrid, Brevo and similar all work).

In the app: set a display name on the Leaderboard screen, then use **Find** or **＋ Add** to send friend requests, **Requests** to accept them, and **Invite** on a friend (after hosting a multiplayer room) to send a match invite.

## Credits

- `css/fonts/opendyslexic-*.woff2` — OpenDyslexic by Abbie Gonzalez ([opendyslexic.org](https://opendyslexic.org/)), SIL Open Font License 1.1 (see `css/fonts/OpenDyslexic-LICENSE.txt`), via the `@fontsource/opendyslexic` package.



- `public/models/heroes/*.glb`, `public/models/hush/*.glb` — the heroes and Hush monsters, all free downloads; full table with authors, licenses and URLs in [`public/models/CREDITS.md`](public/models/CREDITS.md). Heroes: Fox (model PixelMannen CC0, rigging and animation tomkranis plus glTF conversion @AsoboStudio and @scurest, both CC-BY 4.0, from Khronos glTF-Sample-Assets), farm animals (Llama, Zebra, Pug, Cow, Sheep, Horse, Pig) by Quaternius (CC0), the people from Kenney's Blocky Characters 2.0 (CC0) and Pico from Kenney's Starter Kit 3D Platformer (CC0). Monsters: Slime and Bat from Quaternius's Animated Monster Pack, Cthulhu, Cyclops, Cactus, Crab, Bee and Tree from Quaternius's Cute Animated Monsters (all CC0).

- `public/models/obstacles/*.glb`, `public/models/props/*.glb` — small props (hospital bed, traffic cone, cardboard boxes, traffic barrier, trash can, street light, air conditioner) by [Quaternius](https://quaternius.com/), and a computer screen and hospital sign by [Kenney](https://kenney.nl/), and a telescope by CreativeTrio; all CC0 1.0, from [Poly Pizza](https://poly.pizza/).

- `public/models/obstacles/*.glb` (crate, traffic light, chandelier, spot light, sign) and `public/models/props/*.glb` (heart, first aid kit, potion bottle, skull, bone, tree) — by Quaternius (CC0 1.0) except the chandelier (CreativeTrio) and spot light (iPoly3D), all CC0 1.0 from [Poly Pizza](https://poly.pizza/); the tree is by Kenney.


- `public/models/kaykit/kaykit.glb` — props for the bright maps (burgers, kitchen and diner pieces, pumpkins, jack-o'-lanterns, candles, a ribcage and a coffin for the skeleton party, autumn trees, city buildings, furniture) from the KayKit Restaurant Bits, Halloween Bits, City Builder Bits and Furniture Bits packs by Kay Lousberg ([kaylousberg.com](https://www.kaylousberg.com/), CC0 1.0). `tools/pack-kaykit.mjs` packs only the models the maps use into one file that shares one swatch texture; the packs are not stored in this repository (see the tool's header for where to get them).


## Mobile app (Android and iOS)

**Publishing: start with [docs/RELEASE_GUIDE.md](docs/RELEASE_GUIDE.md)** (Google Play first, then the App Store; ready-to-paste listings are in `store/`, moderation in [docs/MODERATION.md](docs/MODERATION.md)). The game is wrapped with Capacitor, so the same code runs as a phone app. The Android project is in `android/` (build it with `npm run app:android`, or run the **Android app** workflow on GitHub for a downloadable APK). iOS is finished on a Mac; see **[docs/APP.md](docs/APP.md)** for the full guide, what only you can do (developer accounts, signing key, screenshots), the testing checklist and store steps, and [docs/STORE_LISTING.md](docs/STORE_LISTING.md) for draft store text and the privacy answers. Privacy Policy and Terms of Use pages are in `public/` and linked from Settings; players can delete their account in-app.

## Rating and feedback

After a good run, once the player has played a while, the results screen asks "Are you enjoying Language Dash?". Yes leads to
"Would you rate it?" and then the store's own rating box (Google Play's in-app review, or the iPhone's rating sheet),
with the store page as a back-up (`market://` or `itms-apps://`, then the web page, then a copied link). "Not really"
leads to a feedback form instead, never the store. Feedback goes to the `app_feedback` table (read it in
`feedback_inbox`); if the server cannot be reached the player is offered an email, then a copied message, so nothing is
lost. Settings > About & help has the same Send feedback and Rate buttons.

Build-time settings (repository variables on GitHub, environment variables in Codemagic or `.env.production` for the
Android build):

| Variable | What it does |
|---|---|
| `VITE_SUPPORT_EMAIL` | where feedback emails go when the server cannot be reached |
| `VITE_APPSTORE_ID` | the numeric App Store id, so Rate can open the App Store page (the in-app rating sheet works without it) |
| `VITE_REVIEW_URL` | an `https` page to rate on, as a last back-up (and the only option on the plain web) |


## Coins: what you earn and what things cost

Earning (about 50 coins for each minute on the track): a right answer pays 2 coins plus 1 for every 3 in your streak, and each coin picked up on the track is 1 (5 under Score Frenzy). Daily quests are a bonus on top: 20 to 70 coins each, so a full day of six is worth roughly 150 to 350 coins, a few minutes of play. The daily login reward, weekly goal (250) and Weekly Gauntlet clear (150) are small thank-yous. Prices run from 300 (caps) to 8,000 (the dearest heroes), so a first trail or map is a few days of casual play and the dearest items about a week. `tests/unit/economy.test.js` keeps these in proportion: change a price or a reward and it tells you if the balance has drifted.

The soft glowing specks that float across the track are off by default (Settings > Look > Floating glow particles).


## Adding or fixing words

Word data lives in `js/lang/data/`: `concepts.js` (the 1,000 concepts with topic and rank) and one file per language with
one word per concept (plus a romanization for non-Latin scripts). After editing run `npm run validate:deck`: it builds all 210
pairs and checks that each has at least 950 cards (close pairs may fall short only because words are identical), two distinct
wrong gates per card that equal neither the answer nor the hint, valid topics and levels, and romanization on every non-Latin
target. Cards a player imports are validated by `js/cardschema.js` and `js/cardleaks.js`.

## License

This project is provided for educational purposes. It is a practice game, not a language course or a fluency test.

## Analytics

First-party, anonymous, opt-in usage analytics (no third-party SDK). Events go to this project's Supabase database and are read with SQL views.
See [docs/ANALYTICS-GUIDE.md](docs/ANALYTICS-GUIDE.md) (setup, what to look at, launch checklist) and [docs/ANALYTICS.md](docs/ANALYTICS.md) (every event, generated from the code).
- Tip jar (in-app purchases for tips): [docs/TIP-JAR.md](docs/TIP-JAR.md)
- Language Dash Pro (subscription, Library and Lifetime; ships on, with 300 free cards): [docs/PRO.md](docs/PRO.md), pricing rationale in [docs/MONETIZATION-STRATEGY.md](docs/MONETIZATION-STRATEGY.md)
