import type { TabNoteOptions } from "./tabNoteOptions";
import type { PresetTheme } from "../../theme/presets";
import type { Theme } from "../../theme/theme";

export type TabRendererOptions = {
  target?: string | SVGSVGElement;
  /**
   * A built-in preset name or a {@link Theme} from `defineTheme`. Applied as
   * CSS variables on the target `<svg>`, so it scopes to that tab alone.
   */
  theme?: Theme | PresetTheme;
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
