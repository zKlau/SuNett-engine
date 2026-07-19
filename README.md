## Requierments

Vite projects require [vite-plugin-wasm](https://github.com/Menci/vite-plugin-wasm) to be added to the vite config plugins

```bash
npm install -D vite-plugin-wasm
```

## Theming

The renderer never hardcodes colours. Every visual property is written as an SVG
presentation attribute pointing at a `--sunett-*` CSS variable with a built-in
fallback. Presentation attributes sit below every CSS rule in the cascade, so
**your stylesheet always wins — no `!important` required.**

There are three tiers. Pick the lowest one that does what you need.

### 1. No setup

Render and you are done. Colours resolve through `currentColor`, so the tab
inherits the surrounding text colour and already reads correctly on light and
dark pages.

```ts
new TabsRenderer(song).generateMeasures(0);
```

### 2. A preset

Either route works — pick one, not both.

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

`dark` deliberately ignores `prefers-color-scheme` — importing it or passing it
is an explicit choice, so a page that intentionally runs inverted is never
overridden.

### 3. A custom theme

`defineTheme` is sugar over the variables — everything it does, a stylesheet can
do too. Every field is optional; whatever you omit keeps its fallback.

```ts
import { TabsRenderer, defineTheme } from "@zklau/sunett-engine";

const myTheme = defineTheme({
  colors: { fg: "#111", noteBg: "#fff", accent: "#c084fc" },
  fonts: { note: "JetBrains Mono, ui-monospace, monospace" },
  opacity: { string: 0.7 },
});

new TabsRenderer(song).generateMeasures(0, { theme: myTheme });
```

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
where devtools can see them. It is optional — it declares variables only, never
element rules, so it can never outrank your CSS.

```ts
import "@zklau/sunett-engine/styles.css";
```

### Variables

| Variable                   | `defineTheme` field | Fallback                  |
| -------------------------- | ------------------- | ------------------------- |
| `--sunett-color-fg`        | `colors.fg`         | `currentColor`            |
| `--sunett-color-muted`     | `colors.muted`      | `currentColor` at 55%     |
| `--sunett-color-note-fg`   | `colors.noteFg`     | `--sunett-color-fg`       |
| `--sunett-color-note-bg`   | `colors.noteBg`     | `Canvas`                  |
| `--sunett-color-string`    | `colors.string`     | `--sunett-color-fg`       |
| `--sunett-color-barline`   | `colors.barline`    | `--sunett-color-fg`       |
| `--sunett-color-accent`    | `colors.accent`     | `--sunett-color-fg`       |
| `--sunett-font-note`       | `fonts.note`        | `ui-monospace, monospace` |
| `--sunett-font-label`      | `fonts.label`       | `system-ui, sans-serif`   |
| `--sunett-string-opacity`  | `opacity.string`    | `0.68`                    |
| `--sunett-barline-opacity` | `opacity.barline`   | `0.68`                    |

Themes cover appearance only. Layout (spacing, widths, padding) stays in
`TabRendererOptions`, and per-note styling belongs in the `render` / `onCreate`
hooks on `TabNoteOptions`.
