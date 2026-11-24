# Clip capture (internal, marketing)

`node tools/clip/capture-clip.mjs "<query>" --out <dir>` makes a smooth 30 fps H.264 (yuv420p) clip of the real game by stepping a virtual
clock and taking one picture per step (no screen recording). Full guide, every URL parameter and how it stays smooth: `docs/CLIP-CAPTURE.md`.
The capture code lives only in a `VITE_FEATURE_CAPTURE=1` build (`js/capture.js`); `tests/unit/capture.test.js` proves the normal build has none of it.

`sample/` holds the proof clip (`kal-en-hi.mp4`: English to Hindi, "tomorrow" then "yesterday", Seoul Neon Alley, Robot Translator, 7 s,
1080x1920, 210 frames) with its capture report. The report's video block is from the lossless-frame encode (crf 14); the committed MP4 is the same
frames re-encoded at crf 21 to keep the repository small.
