# Clip capture: smooth gameplay video for social posts

Internal tool, not a player feature. It makes a 4 to 8 second MP4 of the real game (H.264, yuv420p, 30 fps, 1080x1920) for slide 3 of the
social posts, where a still screenshot is not enough. Nothing of it is in the shipped game: it lives only in a build made with
`VITE_FEATURE_CAPTURE=1` and does nothing unless the page is opened with `?clip=1`. `tests/unit/capture.test.js` builds the normal game and
fails if any of it is in there (no `capture` chunk, none of its code or parameters), and checks that no workflow sets the flag.

## Why it is smooth (and why it is not a screen recording)

Screen-recording a live page is choppy because the picture is taken in real time while the game is also drawing in real time. This does
neither. The game runs on a **virtual clock**: `performance.now`, `Date`, timers, animation frames, CSS animations and `Math.random` are all
replaced, and nothing happens until the page is told to step. Each step advances the clock by exactly 1/30 s (two 1/60 s game steps), fires
the timers and animations that fall in that time, draws, and returns; the tool then takes **one** picture. A slow computer makes the capture
take longer, never choppier, and the same URL gives the same frames (the seed fixes every random choice). The frames are the game's own
`update` and `render`, called by the game's own frame function, so what is filmed is what is played (3D graphics are forced to High).

## Make a clip

```
npm ci
PW_CHROMIUM=/path/to/chromium          # optional; needs WebGL
node tools/clip/capture-clip.mjs "pair=en-hi&concept=214,215&lane=1,2&outcome=hit,hit&map=skin_neon_er&hero=avatar_robot&approach=2.6&duration=7&seed=7" --out out/clips/kal
```

It builds the capture build into `dist-capture/` the first time (`--build` rebuilds it), serves it, steps the game and saves
`out/clips/kal/frames/frame_00001.png ...`, then encodes `out/clips/kal/clip.mp4`, a `poster.png` and a `report.json`
(the page's event log, the ffprobe result, and how many neighbouring frames came out identical). Options: `--scale 2` (default: 1080x1920;
1 gives 540x960), `--crf 14`, `--warmup 0.5` (steps not saved, so the HUD has finished fading in), `--no-frames`, `--build`.
Needs `ffmpeg` and `ffprobe` on the PATH.

## The URL (the part before `&` options is what you script)

| Param | Meaning |
|---|---|
| `pair` | `known-target`, e.g. `en-hi` (the page reloads once to apply it) |
| `concept` | the deck rank(s) to ask, in order: `214` or `214,215` (the number in the card id `en-hi-214`). Any rank, free or not |
| `lane` | 0, 1 or 2: where the correct gate stands, per concept (one value applies to all). Default 1 |
| `outcome` | `hit` (steer through the correct gate) or `miss` (steer into a wrong gate), per concept. Default `hit` |
| `steer` | explicit steering instead of the automatic kind: `0.8:0,2.4:2` (seconds from GO : lane) |
| `lead` | seconds before the gate when automatic steering starts (default 1.1) |
| `approach` | seconds from GO (and between questions) until the runner reaches the gate (default 3.2) |
| `map` | a map id or name from `js/game/skins.js` (treated as owned) |
| `hero` | a hero id from `js/game/shopdata.js` (treated as owned) |
| `seed` | seed for every random choice (default 1) |
| `duration` | seconds of clip after the warm-up (default 6) |
| `start` | `run` (default: the clip starts at GO) or `intro` (the clip includes the 3.7 s countdown fly-in) |
| `hush` | `on` (default) or `off`: the monster behind the runner |
| `obstacles` | `off` (default) or `on`: gurneys and signs on the track (off, so a scripted answer cannot be spoiled by a collision) |
| `hazards` | `off` (default) or `on`: the map's own hazards |

The page API (`window.__clip`): `ready`, `error`, `info`, `events`, `step()` (one 1/30 s frame, returns `{ t, state, lane, asked, gateZ, score }`).
Pop-ups, navigation, the achievement banner and the pause button are hidden; the game's own top bar, hint and gates stay.

## Scripting a word's run

`concept` picks the word, `lane` puts the correct gate where the post wants it, `outcome=hit` steers through it and `outcome=miss` steers into a
wrong gate (for a "most people get this wrong" clip). A list runs several questions in a row, each with its own lane and outcome.
`approach` sets how long the gate takes to arrive, so a 4 to 8 second clip contains the question and its answer.

## Checking a clip

`report.json`: `verified: true` means ffprobe found H.264, yuv420p, 30/1 fps and exactly the number of frames asked for. `duplicateFrames` is how
many frames were pixel-identical to the one before: in motion it should be 0 (a still moment such as a held pose will repeat legitimately). Open
`clip.mp4` and `poster.png` to see it.
