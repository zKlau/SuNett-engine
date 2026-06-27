import type { TabRendererOptions } from "../../types/UI/rendererOptions";
import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";

export function normalizeOptions(options: TabRendererOptions) {
  return {
    trackIndex: options.trackIndex ?? 0,
    preferredMeasuresPerRow: Math.max(
      1,
      options.preferredMeasuresPerRow ?? constants.DEFAULT_MEASURES_PER_ROW,
    ),
    minMeasureWidth: options.minMeasureWidth ?? constants.MIN_MEASURE_WIDTH,

    defaultMeasureWidth:
      options.defaultMeasureWidth ?? constants.DEFAULT_MEASURE_WIDTH,

    maxMeasureWidth: options.maxMeasureWidth ?? constants.MAX_MEASURE_WIDTH,

    minStringSpacing: options.minStringSpacing ?? constants.MIN_STRING_SPACING,

    defaultStringSpacing:
      options.defaultStringSpacing ?? constants.DEFAULT_STRING_SPACING,

    maxStringSpacing: options.maxStringSpacing ?? constants.MAX_STRING_SPACING,

    measureGap: options.measureGap ?? constants.MEASURE_GAP,

    rowGap: options.rowGap ?? constants.ROW_GAP,

    paddingX: options.paddingX ?? constants.PADDING_X,

    paddingY: options.paddingY ?? constants.PADDING_Y,
  };
}
