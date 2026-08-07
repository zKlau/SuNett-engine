import type { TabNoteOptions } from "./tabNoteOptions";
import type { CursorOptions } from "./cursorOptions";
import type { ThemeLike } from "../../theme/resolveTheme";
import type { SelectionSource } from "../selection";

/**
 * Construction-time configuration for `TabsRenderer`. The `theme` here is the
 * renderer's initial theme; `setTheme` mutates it and a per-call `theme` on
 * `generateMeasures` replaces it.
 */
export type TabsRendererConfig = {
  theme?: ThemeLike;
  /** Supplies the selections drawn as overlay regions on each render. */
  selections?: SelectionSource;
  /** Customises the playback cursor's artwork and CSS class. */
  cursor?: CursorOptions;
};

export type TabRendererOptions = {
  target?: string | SVGSVGElement;
  /**
   * A built-in preset name, a {@link ThemeInput}, or a `Theme` from
   * `defineTheme`. Replaces the renderer's current theme for this render and
   * subsequent re-renders; applied as CSS variables scoped to the target `<svg>`.
   */
  theme?: ThemeLike;
  trackIndex?: number;
  measuresPerRow?: number;
  minMeasureWidth?: number;
  defaultMeasureWidth?: number;
  maxMeasureWidth?: number;
  minStringSpacing?: number;
  stringSpacing?: number;
  maxStringSpacing?: number;
  invertStrings?: boolean;
  showTuning?: boolean;
  hideEmptyMeasures?: boolean;
  measureGap?: number;
  rowGap?: number;
  paddingX?: number;
  paddingY?: number;
  notes?: TabNoteOptions;
};
