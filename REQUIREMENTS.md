# SuNett-engine — Product Requirements & Feature Map

## What this project is

**SuNett-engine** is a framework-agnostic TypeScript library that renders **guitar
tablature as SVG in the browser** from parsed Guitar Pro song data, and lets a host
application drive and extend that tab. It ships as a distributable npm package
(dual ESM/CJS via `tsup`), not an application.

Its canonical data model is a normalized `Song` (`Track → Measure → Voice → Beat →
Note`, plus headers, chords, durations, and note effects) that mirrors the output of
the companion **`sunett-parser`** WASM Guitar Pro parser. The same model is the input
whether a song arrives pre-parsed as JSON or as a raw `.gp*` file run through the
parser.

The engine's job is threefold:

1. **Draw** a readable, standard-order tablature for one track at a time.
2. **Let the host drive it** — load songs, switch instruments, play/seek, select and
   loop regions — through a small, strongly-typed public API.
3. **Let the host restyle and extend it** — theming, interaction events, selections,
   and animations — without forking the renderer.

`SunettEngine` is the single public entry point. It owns the song lifecycle,
rendering, selection state, events, and optional persistence, and wraps the lower-level
`TabsRenderer` (which the engine also exposes for advanced use).

---

## Design principles (the "why" behind the features)

- **One instrument at a time.** A song may contain many tracks; the engine renders
  exactly one and switches between them. Simultaneous multi-track rendering is out of
  scope.
- **The host decides behavior; the engine decides drawing.** Clicks and playback emit
  typed events but have no built-in visual side effects — the host app reacts.
- **Consumer CSS always wins.** Every visual property is written as an SVG
  presentation attribute pointing at a `--sunett-*` CSS variable with a built-in
  fallback, so a plain stylesheet overrides it with no `!important` and an unstyled tab
  still renders correctly.
- **Layout math stays numeric; appearance stays in CSS.** Sizes that feed layout
  (note font size, string spacing, row spacing) are JS numbers; everything purely
  visual is a theme variable.
- **Zero-setup default, progressive configuration.** `new SunettEngine()` works out of
  the box; theming, stores, and interaction are all opt-in.
- **Responsive & self-cleaning.** The tab re-renders on container resize and tears down
  its observers, listeners, and DOM on `dispose()`.

---

## Feature map

### 1. Engine core & lifecycle

- A single public `SunettEngine` class as the package entry point, instantiable with no
  required setup and an optional config object.
- Config covers at least a `theme` and a pluggable `selectionStore`.
- Full lifecycle management: mount, (re)render, and a `dispose()` that cleans up DOM,
  observers, listeners, and internal state.
- Version reporting and sensible default state at construction.
- Direct access to the underlying `TabsRenderer` for advanced rendering not surfaced on
  the engine.

### 2. Song loading & data model

- A normalized `Song` domain model covering tracks, measures, voices, beats, notes,
  headers, chords, durations, pitches, tunings, channels, mix tables, and note effects.
- Load a pre-parsed `Song` directly (JSON path).
- Load a raw Guitar Pro file (`File | ArrayBuffer | Uint8Array`) through the integrated
  WASM parser (`loadFromFile`).
- Loading a song resets engine state (playback, cursor, selections) and re-seeds the
  active instrument to the first non-percussion track.
- A deterministic, content-derived **song hash/id** generated at load time, used as the
  persistence key for selections.
- Accessors for the current song, its tracks, and its id.

### 3. Tab rendering (the SVG staff)

- Responsive SVG layout: string lines sized from the track's tuning, computed measure
  widths, and a viewBox that adapts to the container; re-renders on resize.
- Strings drawn in **standard tablature order** (thinnest string on top), with an option
  to invert order.
- Support for instruments beyond guitar and bass (string count from tuning, capped).
- **String tuning labels** shown next to the first measure.
- **Fret/note numbers** drawn on the correct strings, scaling with the tab and clamped
  so they never overflow their string spacing (with configurable max sizes).
- Empty measures can be hidden.
- Per-note styling via `render` / `onCreate` hooks and default tab-note transform styles.
- Bravura music-font glyph paths for notation and rests.

### 4. Structural markers & rhythm

- Vertical **bar lines** between measures across all strings.
- **Double bar lines** and **repeat barlines** (open, close with repeat count).
- **Tempo** shown at the start and whenever it changes between measure headers.
- **Measure numbers** above the staff at a configurable interval.
- **Time signatures** at the first measure and whenever they change (`free_time`
  measures render without one).
- **Rhythm rendering** — beams, tuplets, and rests — driven by beat/duration data.
- *(Deferred: fermatas.)*

### 5. Note effects & guitar techniques

- Rendering of note effects and technique symbols on the tab: bends, hammer-ons,
  slides, ties, harmonics, grace notes, tremolo picking, trills, and beat-level
  techniques (slap, stroke), with technique spans across notes.
- Correct notation glyphs and note-continuation resolution.
- **Fixing specific tab notations** that don't yet render correctly is ongoing.

### 6. Theming & appearance

- Appearance driven entirely by `--sunett-*` CSS variables (single source of truth in
  `src/theme/variables.ts`), applied inline per target SVG so themes are scoped per tab.
- Three usage tiers: **no setup** (inherits `currentColor`), **shipped presets**
  (`default`, `dark`, `high-contrast` — as both JS objects and CSS files), and
  **custom themes** via `defineTheme()` / `mergeThemes()`.
- Theme held as engine state: seed via constructor, `setTheme()` merges + re-renders,
  `getTheme()` reads, and a `theme` passed to a render call replaces it. Any shape
  (preset name, `ThemeInput`, or built `Theme`) is normalized by `coerceTheme`.
- Themes cover appearance **plus a small numeric `sizing` section** (note font size,
  string spacing, row spacing, and their min/max) that feeds layout.
- A test guarantees the JS and CSS versions of each preset never drift.
- **Per-string, per-note, per-fret, and per-notation color customization** — expanding
  color control beyond whole-tab and per-string coloring.

### 7. Selections

- Add, update, remove, list, and look up selections over the tab, plus bulk
  `setSelections()` for restoring a saved set.
- Each selection carries a time range and is scoped to the current song id; supports
  **labels and colors**.
- **Draft selections**: begin / update / commit / cancel an in-progress selection
  (e.g. a pointer drag), drawn distinctly until committed.
- Built-in pointer interaction (`enableSelectionInput`): drag to create, right-click to
  delete, double-click to edit — with mobile support and edge auto-scroll.
- Hit-testing and coordinate mapping: `timeAtPoint()`, `selectionAt()`, and time
  snapping to the beat/measure grid (`snapTime`, `SnapMode`).
- Optional **persistence** across sessions via a pluggable `selectionStore` adapter,
  keyed by song hash.

### 8. Events (extension surface)

- A typed event system (`.on()` / `.off()`) where event names and payloads live in a
  central type map, so unknown event names fail at compile time.
- Selection lifecycle events exist today (`selectionAdded/Updated/Removed`,
  `selectionsChanged`).
- The intended full event set also spans lifecycle and interaction: `ready`,
  `songLoaded`, `songLoadError`, `playbackStarted/Paused/Stopped`,
  `playbackPositionChanged`, `noteClick`, `symbolClick`, and `instrumentChanged`.

### 9. Interaction — note & symbol clicks

- Individual fret numbers and technique symbols are clickable, emitting typed
  `noteClick` / `symbolClick` events with rich payloads (note object, string, fret,
  measure index, time position, symbol type).
- Invisible but correctly sized hit areas with a minimum 44×44px touch target; clicks on
  empty tab area fire nothing; works for both mouse and touch.
- No default visual side effect — the host decides.

### 10. Instrument switching

- Enumerate switchable (non-percussion) instruments, query the active one, and switch
  tracks — re-rendering the tab, resetting playback, and updating string/fret layout to
  the new tuning.
- Descriptive errors for percussion or non-existent tracks; `instrumentChanged` event on
  success.

### 11. Playback / transport

- A visual, time-based transport (audio sync out of scope for now): `play`, `pause`,
  `stop`, `seek`, with playback-state and current-position queries.
- A visual playback cursor moving across the tab in sync with elapsed time, derived from
  tempo and beat/measure timing, drawn as a separate SVG layer and animated with
  `requestAnimationFrame`.
- Playback lifecycle and position events.

### 12. Loop practice

- Loop a time range or a saved selection's range: `setLoop`, `setLoopFromSelection`,
  `clearLoop`, `getLoop`.
- When active, playback seeks back to the loop start at the end; `stop` returns to loop
  start; the loop range is visually indicated distinctly from selections.

### 13. Animations (learning feedback)

- Opt-in, CSS-class-driven note/symbol animations (`highlight`, `shake`, `pulse`) that
  self-clean, triggerable from the API (`animateNote`) and automatically by the playback
  cursor.
- Respects `prefers-reduced-motion`; animation colors follow the active theme.

### 14. Lyrics

- Render lyrics under the tab, with customization to show / hide / modify them.

### 15. Distribution, docs & tooling

- Published as a dual ESM/CJS npm package with a typed `exports` map that also ships
  base and preset theme stylesheets.
- Comprehensive public API documentation: overview, install, quick start, full API
  reference (constructor, methods, events + payloads, config and theme options),
  JSDoc on all exported types, and a no-framework `playground/` example.
- Tooling baseline: `tsup` build, `tsc` typecheck, oxlint, Prettier, knip, Jest, and a
  husky pre-commit hook (lint-staged → typecheck → test), plus GitHub CI/CD.
- A standalone Vite **playground** that imports the renderer from source and loads the
  WASM parser for manual visual testing.
