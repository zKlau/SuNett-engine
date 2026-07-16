# Add themes

Follow-up to `add-tab-notes`. Adds a theming system so consumers can restyle the
whole tab (strings, barlines, notes, labels) without touching the renderer.

## Goal

- Ship a small, opinionated theming API that covers ~95% of consumer needs with
  ~5% of the surface area.
- Ship 4–5 preset themes so a consumer can pick one and be done.
- Keep the "override via a plain CSS file" path first-class — the JS API is sugar,
  not a parallel system.

## Non-goals

- Runtime theme editors, animation systems, or a plugin architecture.
- Per-note or per-measure themes (out of scope; already covered by the existing
  `render` / `onCreate` hooks in `TabNoteOptions`).
- A `.toCSS()` / `.toStyle()` serialization API — YAGNI, add later if asked.
- A standalone `applyTheme(theme, element)` public export — the renderer's
  `theme` option covers per-tab scoping internally.

## Public API

The entire consumer-facing surface:

```ts
import { TabsRenderer, defineTheme, type Theme } from "@zklau/sunett-engine";

// 1. Use a preset by name
new TabsRenderer(song).generateMeasures(0, { theme: "dark" });

// 2. Define a custom theme once, pass it in
const myTheme = defineTheme({
  colors: {
    fg: "#111",
    muted: "#666",
    noteFg: "#111",
    noteBg: "#fff",
    string: "#111",
    barline: "#111",
    accent: "#c084fc",
  },
  fonts: {
    note: "JetBrains Mono, ui-monospace, monospace",
    label: "system-ui, sans-serif",
  },
  opacity: {
    string: 0.7,
    barline: 0.9,
  },
});

new TabsRenderer(song).generateMeasures(0, { theme: myTheme });

// 3. Or ignore the JS API entirely and override CSS variables directly
// :root { --sunett-color-fg: #111; }
```

New / changed types:

- `Theme` — opaque object returned by `defineTheme`. Internally holds a map of
  `--sunett-*` CSS var name → value.
- `ThemeInput` — the argument to `defineTheme` (all fields optional).
- `PresetTheme` — string union `"default" | "dark" | "classic" | "minimal" | "high-contrast"`.
- `TabRendererOptions.theme?: Theme | PresetTheme` — new field.

## CSS variable surface

Kept intentionally small and semantic. Every var has a fallback so an unthemed
consumer still gets a working tab.

```
--sunett-color-fg              (defaults to currentColor)
--sunett-color-muted           (defaults to currentColor with 0.55 opacity via color-mix)
--sunett-color-note-fg         (defaults to var(--sunett-color-fg))
--sunett-color-note-bg         (defaults to Canvas / white)
--sunett-color-string          (defaults to var(--sunett-color-fg))
--sunett-color-barline         (defaults to var(--sunett-color-fg))
--sunett-color-accent          (defaults to var(--sunett-color-fg))

--sunett-font-note             (defaults to ui-monospace, monospace)
--sunett-font-label            (defaults to system-ui, sans-serif)

--sunett-string-opacity        (defaults to 0.68)
--sunett-barline-opacity       (defaults to 0.68)
```

## Preset themes

Small, distinct, purposeful. Each is a tiny CSS file (~15–30 lines) _and_ a JS
object exported from `src/theme/presets/`.

- `default` — neutral, adapts to page color via `currentColor`. Same look as
  today's playground.
- `dark` — explicit dark palette. Doesn't rely on `prefers-color-scheme`.
- `classic` — traditional Guitar Pro look (thicker barlines, serif labels).
- `minimal` — thin strings, no note backgrounds, monochrome.
- `high-contrast` — a11y-first (WCAG AAA on both light and dark hosts).

## File structure

```
src/
  theme/
    index.ts                     # re-export public API (defineTheme, Theme, PresetTheme)
    theme.ts                     # Theme type, defineTheme(), internal apply-to-element helper
    variables.ts                 # constant list of CSS var names (single source of truth)
    presets/
      index.ts                   # preset registry: { default, dark, classic, minimal, high-contrast }
      default.ts
      dark.ts
      classic.ts
      minimal.ts
      highContrast.ts
  utils/tabs/
    tabsRenderer.ts              # resolve options.theme → apply vars on the SVG element
    tabsOptionsNormalizer.ts     # normalize theme option (preset string → Theme)
  index.ts                       # export defineTheme, Theme, PresetTheme
styles/
  base.css                       # default CSS var declarations + minimal element styles
  themes/
    dark.css
    classic.css
    minimal.css
    high-contrast.css
```

The `styles/` folder is source; `tsup` copies it to `dist/styles/` on build.

## Renderer wiring

Inside `TabsRenderer.generateMeasures`:

1. Resolve `options.theme` in `normalizeOptions` — if it's a preset string, look
   it up in the registry; if it's a `Theme`, use it as-is; if absent, no vars set.
2. Before the first render, walk the theme's var map and call
   `svg.style.setProperty(name, value)` for each entry. Scoped to that SVG only.
3. On re-render (resize observer), skip re-applying — vars persist on the element.
4. The cleanup fn (already tracked per-SVG) removes the vars on disposal.

No other renderer code changes — the SVG elements already reference the vars via
the inline defaults added in the previous branch (`fill="var(--sunett-color-string, currentColor)"`
etc.).

## package.json changes

```jsonc
{
  "files": ["dist"],
  "exports": {
    ".": {
      /* existing */
    },
    "./styles.css": "./dist/styles/base.css",
    "./themes/dark.css": "./dist/styles/themes/dark.css",
    "./themes/classic.css": "./dist/styles/themes/classic.css",
    "./themes/minimal.css": "./dist/styles/themes/minimal.css",
    "./themes/high-contrast.css": "./dist/styles/themes/high-contrast.css",
  },
}
```

Consumer usage:

```ts
import "@zklau/sunett-engine/styles.css"; // base defaults
import "@zklau/sunett-engine/themes/dark.css"; // preset (CSS route)
```

## Build changes

Extend `tsup.config.ts` to copy `styles/**/*.css` to `dist/styles/`. Options:

1. Use `tsup`'s `publicDir` — simplest, one-line change.
2. Add a small pre-build script that copies with `fs.cp`.

Prefer option 1.

## Implementation order (commit-by-commit)

1. `Add CSS variable surface` — introduce `styles/base.css` and update the
   existing inline SVG defaults (from `add-tab-notes`) to reference the vars.
2. `Add theme types and defineTheme` — pure JS/TS, no rendering changes.
3. `Add theme presets` — the 5 preset objects + matching CSS files.
4. `Wire theme option into renderer` — normalizer + apply-vars-to-SVG.
5. `Ship CSS via package exports` — tsup config + package.json exports map.
6. `Document theming` — README section, CLAUDE.md convention update.

## Testing

- Unit tests for `defineTheme`: input coverage, missing fields, override behavior.
- Unit tests for the preset registry (each preset resolves).
- Unit test for the normalizer: `theme: "dark"` → resolves; `theme: myTheme` →
  passes through; `theme: undefined` → no-op.
- Snapshot / DOM test: after `generateMeasures` with a theme, the target SVG has
  the expected `style="--sunett-color-fg: …; ..."` attribute.
- Visual smoke test in the playground: theme switcher dropdown that flips
  between presets on click, so we can eyeball each preset.

## Docs

- README: new "Theming" section, three tiers:
  1. **No setup** — everything renders via `currentColor`.
  2. **Preset** — `import "@zklau/sunett-engine/themes/dark.css"` _or_
     `generateMeasures(0, { theme: "dark" })`.
  3. **Custom** — `defineTheme({...})` or override CSS vars in your own stylesheet.
- `CLAUDE.md`: replace the _"Styling lives in the consumer, not the library"_ line
  with the new convention: safe inline defaults via CSS vars, base stylesheet
  and preset themes ship in the package, consumers override via vars or
  `defineTheme`.

## Open questions

- **Preset lineup** — is the 5-preset list right, or do we want to ship with
  fewer (e.g. just `default` + `dark`) and add the rest post-launch?
- **`classic` scope** — how faithful to Guitar Pro's look? Just colors + fonts,
  or should it also nudge string thickness / spacing constants? If the latter,
  we're theming layout too, which pushes into the constants space and should be
  a separate discussion.
- **Fonts** — do presets bundle a web font, or stay system-font-only? Recommend
  system-only for launch (zero external assets, no CSP concerns).
- **`prefers-color-scheme`** — does `default` auto-switch dark on OS-dark, or
  does it always follow `currentColor` and require the user to opt into `dark`
  explicitly? Recommend explicit — auto-switching surprises people who
  intentionally want light-on-dark or dark-on-light UIs.
