# SuNett-engine

Render guitar tablature as SVG in the browser from parsed Guitar Pro song data.

## Install

```bash
npm install @zklau/sunett-engine
```

## Song data

The engine renders a `Song` object, the parsed Guitar Pro model. It does not parse files itself, so bring your own parser; any source works as long as it produces the `Song` shape. Import the type to check your data against it:

```ts
import type { Song } from "@zklau/sunett-engine";
```

## Quick start

Add an `<svg>` with the target id (default `#tabs`):

```html
<svg id="tabs"></svg>
```

Load a `Song` and render a track:

```ts
import { SunettEngine } from "@zklau/sunett-engine";
import type { Song } from "@zklau/sunett-engine";

const song: Song = getYourParsedSong();

const engine = new SunettEngine();
await engine.loadSong(song);
engine.render(0);
```

`render(trackIndex)` draws a track. The tab is responsive and redraws on resize. Call `engine.dispose()` when you are done.

Switch tracks by rendering another index; list them with `getTracks`:

```ts
engine.getTracks().forEach((track, i) => console.log(i, track.name));
engine.render(2);
```

## Virtualization

By default only the measures near the viewport are drawn, added and removed as the tab scrolls, so long songs stay fast. Turn it off to draw every measure up front:

```ts
engine.render(0, { virtualize: false });
```

It follows the nearest scrollable ancestor of the `<svg>` (falling back to `window`). Point it at a specific container, and tune how many extra rows stay rendered past each edge, when a wrapper owns the scroll:

```ts
engine.render(0, {
  scrollContainer: document.getElementById("tab-scroll")!,
  overscanRows: 5,
});
```

## Playback

```ts
engine.play();
engine.pause();
engine.stop();
engine.seek(4000);

engine.on("playbackPositionChanged", ({ positionMs }) => {
  console.log(positionMs);
});

engine.enableAutoScroll();
```

### Looping

Set a loop range and playback wraps within it, for practising a passage. Pass `null` to clear it:

```ts
engine.setLoop({ startMs: 4000, endMs: 12000 });
engine.play();

engine.setLoop(null);
```

## Cursor

A playhead marker tracks the playback position. By default it is a built-in marker scaled to the staff height. Customise its artwork and CSS hooks through the `cursor` config:

```ts
new SunettEngine({
  cursor: {
    svg: `<svg viewBox="0 0 4 100"><rect width="4" height="100" /></svg>`,
    className: "my-cursor",
  },
});
```

`svg` takes SVG markup or a factory `(document) => SVGElement`; it is scaled to the staff and centred on the playhead. The cursor element always carries the `playback-cursor` class, and `className` adds your own, so both can be styled from a stylesheet:

```css
.playback-cursor {
  fill: #ef4444;
}
```

## Selections

Attach the built-in pointer interaction, or manage selections directly:

```ts
engine.enableSelectionInput();
engine.enablePlaybackInput();

const selection = engine.addSelection({
  startMs: 0,
  endMs: 6000,
  label: "intro",
});

engine.on("selectionsChanged", (selections) => console.log(selections));
```

`enableSelectionInput` lets a user drag to create, right-click to delete, and double-click to edit. Hooks decide what a new selection stores and confirm edits and deletes:

```ts
engine.enableSelectionInput({
  onCreate: (range) => ({ label: "practice", color: "#22c55e" }),
  onEdit: (selection) => ({ label: prompt("New label:") ?? selection.label }),
  onDelete: (selection) => confirm(`Delete "${selection.label}"?`),
});
```

`enablePlaybackInput` makes a click seek to that time while a drag still selects.

### Snapping

Both inputs, and `snapTime`, quantise times to the grid with `SnapMode` (`None`, `Beat`, `Measure`):

```ts
import { SnapMode } from "@zklau/sunett-engine";

engine.enableSelectionInput({ snap: SnapMode.Beat });
engine.enablePlaybackInput({ snap: SnapMode.Measure });

engine.snapTime(4123, SnapMode.Beat);
```

Pass a `selectionStore` to persist selections across sessions. It is an adapter with `load` and `save`, keyed by song id, so you decide where selections live (localStorage, a database, an API):

```ts
import type { SelectionStore, Selection } from "@zklau/sunett-engine";

const localStore: SelectionStore = {
  async load(songId): Promise<Selection[]> {
    return JSON.parse(localStorage.getItem(`sel:${songId}`) ?? "[]");
  },
  async save(songId, selections): Promise<void> {
    localStorage.setItem(`sel:${songId}`, JSON.stringify(selections));
  },
};

new SunettEngine({ selectionStore: localStore });
```

On `loadSong`, saved selections are restored; on every change, `save` runs fire-and-forget.

## Theming

Colours are never hardcoded. Every visual property is an SVG presentation attribute pointing at a `--sunett-*` CSS variable, so your stylesheet always wins without `!important`. Pick the lowest tier that fits.

### No setup

Colours follow `currentColor`, so the tab reads correctly on light and dark pages with no configuration.

```ts
engine.render(0);
```

### A preset

Scope to one tab, or to the whole page. Pick one route, not both.

```ts
engine.setTheme("dark");
```

```ts
import "@zklau/sunett-engine/themes/dark.css";
```

| Preset          | Use it when                                                    |
| --------------- | -------------------------------------------------------------- |
| `default`       | Anything. Sets no colours; follows `currentColor`.             |
| `dark`          | You want an explicit dark palette regardless of the host page. |
| `high-contrast` | Accessibility. Follows forced-colours mode.                    |

`dark` ignores `prefers-color-scheme`; importing or passing it is an explicit choice.

### A custom theme

`defineTheme` is sugar over the variables. Every field is optional; omitted fields keep their fallback.

```ts
import { SunettEngine, defineTheme } from "@zklau/sunett-engine";

const myTheme = defineTheme({
  colors: { fg: "#111", background: "#fff", accent: "#c084fc" },
  fonts: { noteFamily: "JetBrains Mono, monospace" },
  lines: { stringWidth: 2 },
  sizing: { noteFontSize: 14, stringSpacing: 22 },
});

new SunettEngine({ theme: myTheme });
```

Start from a preset instead of restating it:

```ts
import { ThemePresets, defineTheme, mergeThemes } from "@zklau/sunett-engine";

const theme = mergeThemes(
  ThemePresets.dark,
  defineTheme({ colors: { accent: "#f472b6" } }),
);
```

Or set the variables in your own CSS:

```css
:root {
  --sunett-color-fg: #111;
  --sunett-color-accent: #c084fc;
}
```

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

`sizing` fields (`noteFontSize`, `stringSpacing`, `rowSpacing`, and their clamps) feed layout math, so they are numeric and work from `defineTheme` only, never a preset CSS file. An explicit `TabRendererOptions` value (`notes.fontSize`, `stringSpacing`) outranks a theme's `sizing`.
