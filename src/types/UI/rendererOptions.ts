import type { TabNoteOptions } from "./tabNoteOptions";
import type { ThemeLike } from "../../theme/resolveTheme";

/**
 * Construction-time configuration for `TabsRenderer`. The `theme` here is the
 * renderer's initial theme; `setTheme` mutates it and a per-call `theme` on
 * `generateMeasures` replaces it.
 */
export type TabsRendererConfig = {
  theme?: ThemeLike;
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
  measureGap?: number;
  rowGap?: number;
  paddingX?: number;
  paddingY?: number;
  notes?: TabNoteOptions;
};
