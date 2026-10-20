import type { TabNoteOptions } from "../../types/UI/tabNoteOptions";
import type { NormalizedRendererOptions } from "../../types/UI/normalizedRendererOptions";
import type { TabRendererOptions } from "../../types/UI/rendererOptions";
import type { ThemeSizing } from "../../theme/theme";
import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";

export function normalizeOptions(
  options: TabRendererOptions,
  sizing?: ThemeSizing,
  width?: number,
): NormalizedRendererOptions {
  const mobile =
    width !== undefined && width <= constants.COMPACT_MOBILE_MAX_WIDTH;
  return {
    trackIndex: options.trackIndex ?? 0,
    measuresPerRow:
      options.measuresPerRow !== undefined
        ? Math.max(1, options.measuresPerRow)
        : mobile
          ? 1
          : undefined,
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
      (mobile ? constants.MOBILE_STRING_SPACING : constants.STRING_SPACING),

    maxStringSpacing:
      options.maxStringSpacing ??
      sizing?.maxStringSpacing ??
      constants.MAX_STRING_SPACING,

    invertStrings: options.invertStrings ?? constants.INVERT_STRINGS,

    showTuning: options.showTuning ?? constants.SHOW_TUNING,

    hideEmptyMeasures:
      options.hideEmptyMeasures ?? constants.HIDE_EMPTY_MEASURES,

    measureGap: options.measureGap ?? constants.MEASURE_GAP,

    rowGap:
      options.rowGap ??
      sizing?.rowSpacing ??
      (mobile ? constants.MOBILE_ROW_GAP : constants.ROW_GAP),
    measureBottomPadding: Math.max(
      0,
      options.measureBottomPadding ??
        (mobile
          ? constants.MOBILE_MEASURE_BOTTOM_PADDING
          : constants.MEASURE_BOTTOM_PADDING),
    ),
    rhythmStemLength: Math.max(
      constants.RHYTHM_STEM_START_OFFSET + constants.RHYTHM_MIN_STEM_LENGTH,
      options.rhythmStemLength ??
        (mobile
          ? constants.MOBILE_RHYTHM_STEM_LENGTH
          : constants.RHYTHM_STEM_LENGTH),
    ),

    paddingX:
      options.paddingX ??
      (mobile ? constants.MOBILE_PADDING_X : constants.TAB_PADDING_X),

    paddingY: options.paddingY ?? constants.TAB_PADDING_Y,

    virtualize: options.virtualize ?? constants.VIRTUALIZE,

    overscanRows: options.overscanRows ?? constants.DEFAULT_OVERSCAN_ROWS,

    scrollContainer: options.scrollContainer,

    notes: normalizeNoteOptions(options.notes ?? {}, sizing),
  };
}

function normalizeNoteOptions(options: TabNoteOptions, sizing?: ThemeSizing) {
  return {
    fontSize: options.fontSize ?? sizing?.noteFontSize,
    maxFontSize: options.maxFontSize ?? sizing?.maxNoteFontSize,
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
