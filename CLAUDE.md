# SuNett-engine

NEVER ADD COMMENTS EXCEPT JSDOC

A TypeScript library that renders **guitar tablature as SVG in the browser** from
parsed Guitar Pro song data. Shipped as a distributable library (dual ESM/CJS via
`tsup`), not an application.

> Status: early / WIP. The package entry `src/index.ts` is still a stub, and the
> renderer (`TabsRenderer`) is **not yet exported** from it — `tsup` only bundles
> `src/index.ts`, so the build currently ships nothing usable. Note/fret drawing is
> also not implemented yet (`renderMeasure` stops after strings, barlines, and labels).

## Commands

| Task      | Command                                             |
| --------- | --------------------------------------------------- |
| Build     | `npm run build` (tsup) · `npm run dev` (watch)      |
| Typecheck | `npm run typecheck` (`tsc --noEmit`)                |
| Lint      | `npm run lint` (oxlint) · `npm run lint:fix`        |
| Format    | `npm run prettier:check` / `npm run prettier:write` |
| Dead code | `npm run knip`                                      |
| Test      | `npm run test` (`jest --passWithNoTests`)           |

A husky **pre-commit** hook runs `lint-staged` → `typecheck` → `test`, so every commit
must lint clean and typecheck.

## Project structure

```
src/
  index.ts                       # package entry (currently a stub)
  constants/
    tabRendererConstants.ts      # TabsRendererConstants — layout/spacing defaults
  utils/
    songHelper.ts                # SongHelper class — name/tracks/measures accessors over a Song
    tabs/
      tabsRenderer.ts            # TabsRenderer class — layout math & SVG drawing
      tabsOptionsNormalizer.ts   # normalizeOptions() — merge options over constants
  types/                         # Guitar Pro domain model (mirrors the sunett-parser output)
    song.ts track.ts measure.ts voice.ts note.ts
    duration.ts pitch.ts octaves.ts channels.ts lyrics.ts mixTable.ts barre.ts
    beats/    beat.ts beatDisplay.ts slap.ts stroke.ts
    chords/   chord.ts chordType.ts alteration.ts
    notes/    fingering.ts noteEffects.ts noteType.ts
      effects/ bend.ts grace.ts harmonic.ts slide.ts tremoloPicking.ts trill.ts
    UI/       measureContext.ts measureBounds.ts rendererOptions.ts tabLayout.ts
playground/                      # separate Vite app for manual visual testing
  src/main.ts                    # parses a .gp* fixture, new TabsRenderer(song).generateMeasures()
  public/tabs/*.gp*              # Guitar Pro fixtures
.claude/skills/                  # Claude Code skills for this repo (see folder README)
```

### How it fits together

- **Domain types** (`src/types/`) model the Guitar Pro format
  (`Song → Track → Measure → Voice → Beat → Note` plus headers, chords, durations,
  and note effects). They mirror the output of **`sunett-parser`**, a separate WASM
  Guitar Pro parser (`../../guitarproparser-wasm`).
- **Renderer** (`src/utils/tabs/tabsRenderer.ts`) — the `TabsRenderer` class wraps a
  `Song`; `new TabsRenderer(song).generateMeasures(trackIndex?, options?)` finds an
  `<svg>` target (default `#tabs`), computes a responsive layout, and draws string lines,
  barlines (repeats, double/final bars), and measure-index labels. The string count comes
  from the track's tuning (`track.strings.length`, capped by `MAX_STRING_COUNT`). It
  re-renders on resize via `ResizeObserver` and tracks per-SVG cleanup in a `WeakMap`.
  `SongHelper` (`src/utils/songHelper.ts`) is a small companion class for reading a song's
  name, tracks, and measures.
- **Styling lives in the consumer**, not the library. The renderer only assigns CSS
  classes (`string`, `barline` + `barline-start/-end/-inner/-repeat-open`, `repeat-dot`,
  `repeat-count`, `measure-index`, …); the actual styles live in the consuming app's CSS
  (see `playground/src/style.css`).
- **Playground** is its own package. It imports the renderer directly from `../../src`
  (source, not the built `dist`) and requires `vite-plugin-wasm` to load the parser.
  Run it with `npm run dev` from inside `playground/`.

## Coding style & rules

Match the existing code. Concretely:

- **Structure**: stateful pieces are classes (`TabsRenderer`, `SongHelper`) — expose a
  small public API and keep the rest `private`, with public methods first and private
  helpers below (top-down, callers above callees). Pure, stateless utilities stay as
  module-level `function` declarations (e.g. `clamp`), preferred over arrow-function
  consts; export only the public surface.
- **Types**: use `type` aliases, not `interface`. Model enums as
  `const Foo = { ... } as const` and reference them with `keyof typeof Foo`; co-locate
  each enum-like const with the type that uses it.
- **Imports**: type-only imports must use `import type` (lint-enforced). Inside `src/`,
  imports are extensionless (`"../types/song"`).
- **Naming**: `PascalCase` for types and enum-like const objects; `camelCase` for
  variables, functions, and file names; `SCREAMING_SNAKE_CASE` for constant-record keys
  (e.g. `TabsRendererConstants`). Folders are lowercase except `UI`.
- **Options & defaults**: public functions take an all-optional options object and merge
  it over constants with `??` (see `normalizeOptions`). No magic numbers inline — put
  layout/spacing values in `src/constants/`.
- **Control flow**: guard clauses / early returns over nesting. `===`/`!==` only,
  `const` by default (never `var`), always use braces. Keep functions to **≤ 5 params**
  (lint-enforced) — pass a context/bounds object when more are needed (see
  `MeasureContext`, `MeasureBounds`).
- **Separation of concerns**: keep pure layout math (`calculateLayout`,
  `calculateMeasureWidths`) separate from DOM/SVG drawing (`renderMeasure`,
  `renderStringLines`). DOM-touching code guards `typeof document === "undefined"`.
- **SVG**: create elements with `document.createElementNS` via the `createSvgElement`
  helper. Appearance (color, opacity) lives in CSS classes; only geometry and
  constant-driven widths (e.g. `stroke-width` from `tabRendererConstants`) are set as
  attributes in TS — never hardcode visual styling inline.
- **No `console`** in library code (oxlint warns); the playground opts out per-file with
  `// oxlint-disable no-console`.
- **Formatting**: Prettier defaults (2-space indent, double quotes, semicolons, trailing
  commas). oxlint enforces `eqeqeq`, `no-var`, `prefer-const`, `curly`,
  `consistent-type-imports`, and `max-params: 5`.

## Environment

Windows / PowerShell. TypeScript ~6.0 (strict), target ES2020, module ESNext, bundler
resolution, lib `ES2020` + `DOM`. Tests run through babel-jest
(`@babel/preset-env` + `preset-typescript`).
