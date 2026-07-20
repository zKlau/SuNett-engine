import type { TabNoteOptions } from "../../types/UI/tabNoteOptions";
import type { TabRendererOptions } from "../../types/UI/rendererOptions";
import type { ThemeSizing } from "../../theme/theme";
import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";

export function normalizeOptions(
  options: TabRendererOptions,
  sizing?: ThemeSizing,
) {
  return {
    trackIndex: options.trackIndex ?? 0,
    measuresPerRow: Math.max(
      1,
      options.measuresPerRow ?? constants.DEFAULT_MEASURES_PER_ROW,
    ),
    minMeasureWidth: options.minMeasureWidth ?? constants.MIN_MEASURE_WIDTH,

    defaultMeasureWidth:
      options.defaultMeasureWidth ?? constants.DEFAULT_MEASURE_WIDTH,

    maxMeasureWidth: options.maxMeasureWidth ?? constants.MAX_MEASURE_WIDTH,

    minStringSpacing:
      options.minStringSpacing ??
      sizing?.minStringSpacing ??
      constants.MIN_STRING_SPACING,

    stringSpacing:
      options.stringSpacing ??
      sizing?.stringSpacing ??
      constants.STRING_SPACING,

    maxStringSpacing:
      options.maxStringSpacing ??
      sizing?.maxStringSpacing ??
      constants.MAX_STRING_SPACING,

    invertStrings: options.invertStrings ?? constants.INVERT_STRINGS,

    showTuning: options.showTuning ?? constants.SHOW_TUNING,

    measureGap: options.measureGap ?? constants.MEASURE_GAP,

    rowGap: options.rowGap ?? sizing?.rowSpacing ?? constants.ROW_GAP,

    paddingX: options.paddingX ?? constants.TAB_PADDING_X,

    paddingY: options.paddingY ?? constants.TAB_PADDING_Y,

    notes: normalizeNoteOptions(options.notes ?? {}, sizing),
  };
}

function normalizeNoteOptions(options: TabNoteOptions, sizing?: ThemeSizing) {
  return {
    fontSize: options.fontSize ?? sizing?.noteFontSize,
    paddingX: options.paddingX ?? constants.NOTE_PADDING_X,
    backgroundHeight: options.backgroundHeight,
    background: options.background ?? true,
    classPrefix: options.classPrefix ?? constants.NOTE_CLASS_PREFIX,
    defaultStyles: options.defaultStyles ?? true,
    render: options.render,
    onCreate: options.onCreate,
    onClick: options.onClick,
    onPointerEnter: options.onPointerEnter,
    onPointerLeave: options.onPointerLeave,
  };
}
