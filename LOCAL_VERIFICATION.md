# Local playback verification

The `codex/playback-fidelity` branches were verified together without publishing packages or pushing branches.

## Checks

- Engine: 357 unit tests, typecheck, lint and ESM/CJS/type-declaration build.
- Parser: 253 Rust tests, workspace tests and WASM target compilation. A release WASM binary was built and processed with matching wasm-bindgen 0.2.126 bindings.
- Parser WASM to built engine: all 248 repository fixtures (14 GP3, 34 GP4, 52 GP5, 74 GPX and 74 GP) compiled successfully. Checked 25,209 note events for finite valid intervals, pitch and velocity, as well as deterministic output and unchanged source data.
- Browser integration: an isolated build of the existing synth player substitutes the local parser WASM and local engine compiler. Edge checks the showcase's finite, non-silent audio and imports/playback/pause/stop for fixtures in all five formats. It does not replace the installed player's packages or modify sample assets.
- Added failing-before-fix regressions for strum offsets exceeding a short note's gate and let-ring trills repeating beyond their written duration.
- The five-format browser sequence exposed stale tone assignments when changing to a song with fewer tracks. The synth player now resets assignments before applying the new mixer (`49b97fd` on its local `codex/local-verification` branch). The same sequence passes after the fix. That repository previously had no commits; only the player file was checkpointed and changed here, and other existing files remain untracked.

## Reproduce integration checks

Build the engine with `npm run build`. In the parser repository, build `sunett-parser` for `wasm32-unknown-unknown` with the `wasm` feature, then generate both `nodejs` and `bundler` bindings with a wasm-bindgen CLI matching Cargo.lock.

From the engine repository:

```powershell
node scripts/verify-parser-integration.mjs ../guitarproparser-wasm/target/verification-node/scorelib.js ../guitarproparser-wasm/test
node scripts/verify-synth-browser.mjs C:/Users/denis/Desktop/Sunett-Synth ../guitarproparser-wasm/target/verification-browser ../guitarproparser-wasm/test
```

The browser check uses the synth checkout's installed esbuild/Playwright and existing prepared `downloads/audio` assets; Edge must be installed. Paths are command-line arguments so another checkout can be used.

## What this does not establish

Passing tests do not establish perfect fidelity to Guitar Pro or to studio recordings. Repeat expansion, mid-measure tempo automation and the other limitations in PLAYBACK_FIDELITY.md remain. Browser performance on mobile devices and maximum-polyphony stress testing are not covered. The normal synth build still requires deliberate dependency integration before users receive these updated libraries.
