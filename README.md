## Requierments

Vite projects require [vite-plugin-wasm](https://github.com/Menci/vite-plugin-wasm) to be added to the vite config plugins

```bash
npm install -D vite-plugin-wasm
```

## Theming

The renderer never hardcodes colours. Every visual property is written as an SVG
presentation attribute pointing at a `--sunett-*` CSS variable with a built-in
fallback. Presentation attributes sit below every CSS rule in the cascade, so
**your stylesheet always wins - no `!important` required.**

There are three tiers. Pick the lowest one that does what you need.

### 1. No setup

Render and you are done. Colours resolve through `currentColor`, so the tab
inherits the surrounding text colour and already reads correctly on light and
dark pages.

```ts
new TabsRenderer(song).generateMeasures(0);
```

### 2. A preset

Either route works - pick one, not both.

```ts
// Scoped to this one tab.
new TabsRenderer(song).generateMeasures(0, { theme: "dark" });
```

```ts
// Scoped to the whole page.
import "@zklau/sunett-engine/themes/dark.css";
```

| Preset          | Use it when                                                              |
| --------------- | ------------------------------------------------------------------------ |
| `default`       | Anything. Sets no colours; follows `currentColor`.                       |
| `dark`          | You want an explicit dark palette regardless of the host page.           |
| `high-contrast` | Accessibility. Built on CSS system colours; follows forced-colours mode. |

`dark` deliberately ignores `prefers-color-scheme` - importing it or passing it
is an explicit choice, so a page that intentionally runs inverted is never
overridden.

### 3. A custom theme

`defineTheme` is sugar over the variables - everything it does, a stylesheet can
do too. Every field is optional; whatever you omit keeps its fallback.

```ts
import { TabsRenderer, defineTheme } from "@zklau/sunett-engine";

const myTheme = defineTheme({
  colors: { fg: "#111", background: "#fff", accent: "#c084fc" },
  fonts: { noteFamily: "JetBrains Mono, ui-monospace, monospace" },
  opacity: { string: 0.7 },
  lines: { stringWidth: 2 },
  sizing: { noteFontSize: 14, stringSpacing: 22, maxStringSpacing: 28 },
});

new TabsRenderer(song).generateMeasures(0, { theme: myTheme });
```

`colors.background` fills the whole tab canvas (defaults to transparent, so an
unthemed tab shows the page behind it); `colors.noteBg` is only the pill behind
each fret number.

Use `colors.stringByIndex` to override individual displayed string rows while
keeping `colors.string` as the fallback. Index `0` is the top row.

```ts
defineTheme({
  colors: {
    string: "#64748b",
    stringByIndex: { 0: "#ef4444", 5: "#3b82f6" },
  },
});
```

`sizing` is the exception to "everything a stylesheet can do too": note font
size and string spacing feed the renderer's layout math, which a CSS variable
cannot reach, so they are numeric fields resolved before layout. That also means
**`sizing` works from `defineTheme` only - never from a preset CSS file.**
Explicit `TabRendererOptions` (`notes.fontSize`, `stringSpacing`) still outrank a
theme's `sizing`.

Start from a preset instead of restating it with `mergeThemes`:

```ts
import { ThemePresets, defineTheme, mergeThemes } from "@zklau/sunett-engine";

const theme = mergeThemes(
  ThemePresets.dark,
  defineTheme({ colors: { accent: "#f472b6" } }),
);
```

Or skip the JS API entirely and set the variables in your own CSS:

```css
:root {
  --sunett-color-fg: #111;
  --sunett-color-accent: #c084fc;
}
```

Import the baseline stylesheet if you want the variables declared on `:root`
where devtools can see them. It is optional - it declares variables only, never
element rules, so it can never outrank your CSS.

```ts
import "@zklau/sunett-engine/styles.css";
```

### Updating a theme at runtime

The renderer holds its theme as state. Pass an initial one at construction, then
mutate it with `setTheme` - it merges the new values over the current theme and
re-renders the last-drawn tab. `getTheme()` returns the active theme.

```ts
const renderer = new TabsRenderer(song, { theme: "dark" });
renderer.generateMeasures(0);

renderer.setTheme({ colors: { accent: "#f472b6" } }); // merges + re-renders
renderer.getTheme(); // the resolved Theme
```

Precedence: a `theme` passed to `generateMeasures` **replaces** the current
theme; `setTheme` **merges**. `setTheme` takes the same shapes as `defineTheme`
(a preset name, a `ThemeInput`, or a built `Theme`).

### Variables

| Variable                   | `defineTheme` field | Fallback                  |
| -------------------------- | ------------------- | ------------------------- |
| `--sunett-color-fg`        | `colors.fg`         | `currentColor`            |
| `--sunett-color-muted`     | `colors.muted`      | `currentColor` at 55%     |
| `--sunett-color-note-fg`   | `colors.noteFg`     | `--sunett-color-fg`       |
| `--sunett-color-note-bg`   | `colors.noteBg`     | `Canvas`                  |
| `--sunett-color-bg`        | `colors.background` | `transparent`             |
| `--sunett-color-string`    | `colors.string`     | `--sunett-color-fg`       |
| `--sunett-color-barline`   | `colors.barline`    | `--sunett-color-fg`       |
| `--sunett-color-accent`    | `colors.accent`     | `--sunett-color-fg`       |
| `--sunett-font-note`       | `fonts.noteFamily`  | `ui-monospace, monospace` |
| `--sunett-font-label`      | `fonts.labelFamily` | `system-ui, sans-serif`   |
| `--sunett-font-label-size` | `fonts.labelSize`   | `11px`                    |
| `--sunett-string-opacity`  | `opacity.string`    | `0.68`                    |
| `--sunett-barline-opacity` | `opacity.barline`   | `0.68`                    |
| `--sunett-string-width`    | `lines.stringWidth` | `1`                       |

`--sunett-string-width` is the stroke thickness of the string lines. It is a
real CSS variable (stroke width does not feed layout math), so unlike `sizing`
it also works from a stylesheet or preset, and a plain
`.string { stroke-width: 2px }` rule still wins over it.

`defineTheme` additionally takes a `sizing` section - `noteFontSize`,
`maxNoteFontSize`, `stringSpacing`, `minStringSpacing`, `maxStringSpacing`, and
`rowSpacing` - which has no CSS-variable equivalent; see
[String spacing](#string-spacing) and [Note size](#note-size).

Themes cover appearance and size. Other layout (widths, padding) stays in
`TabRendererOptions`, and per-note styling belongs in the `render` / `onCreate`
hooks on `TabNoteOptions`.

### String spacing

`sizing.stringSpacing` sets the vertical distance between string lines. It is
clamped to `[minStringSpacing, maxStringSpacing]` (default `9`-`24`) and scaled
with the measure width, so a value past the default ceiling is capped unless you
raise it too:

```ts
defineTheme({ sizing: { stringSpacing: 40, maxStringSpacing: 40 } });
```

Like note font size, spacing feeds the SVG viewBox, so it is a numeric `sizing`
field rather than a CSS variable (works from `defineTheme`, not a preset CSS
file). An explicit `TabRendererOptions.stringSpacing` still outranks the theme.

### Note size

Note text is **not** a theme variable, because the renderer measures it in
TypeScript to size each note's background - a CSS-only font size would leave the
background sized for the old value and the text would overflow it.

By default the note font size scales with the tab: it is derived from the string
spacing, which itself grows with the measure width, so notes keep their
proportions instead of shrinking away on wide screens. It is clamped to a
readable 8–15px; raise `sizing.maxNoteFontSize` (or `notes.maxFontSize`) to let
the auto-scaled size grow past the upper bound. The background height follows the
font size, so the two can never fall out of step.

To pin a fixed size, set it explicitly - it then overrides the scaling and stays
put at every width. Either per call:

```ts
new TabsRenderer(song).generateMeasures(0, {
  notes: { fontSize: 14 },
  stringSpacing: 22,
  maxStringSpacing: 28, // the default clamp of 24 would otherwise cap this
});
```

…or bundled into a reusable theme via its `sizing` section:

```ts
const roomy = defineTheme({ sizing: { noteFontSize: 14, stringSpacing: 22 } });
new TabsRenderer(song).generateMeasures(0, { theme: roomy });
```

Note `fonts.noteFamily` sets the note **typeface**, not its size - size lives in
`sizing.noteFontSize` for the reason above.
