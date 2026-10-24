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
  const defaults = resolveLayoutDefaults(width);
  let measuresPerRow = defaults.measuresPerRow;
  if (options.measuresPerRow !== undefined) {
    measuresPerRow = Math.max(1, options.measuresPerRow);
  }

  return {
    trackIndex: options.trackIndex ?? 0,
    measuresPerRow,
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
      defaults.stringSpacing,

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
      defaults.rowGap,
    measureBottomPadding: Math.max(
      0,
      options.measureBottomPadding ?? defaults.measureBottomPadding,
    ),
    rhythmStemLength: Math.max(
      constants.RHYTHM_STEM_START_OFFSET + constants.RHYTHM_MIN_STEM_LENGTH,
      options.rhythmStemLength ?? defaults.rhythmStemLength,
    ),

    paddingX: options.paddingX ?? defaults.paddingX,

    paddingY: options.paddingY ?? constants.TAB_PADDING_Y,

    virtualize: options.virtualize ?? constants.VIRTUALIZE,

    overscanRows: options.overscanRows ?? constants.DEFAULT_OVERSCAN_ROWS,

    scrollContainer: options.scrollContainer,

    notes: normalizeNoteOptions(options.notes ?? {}, sizing),
  };
}

function resolveLayoutDefaults(width?: number) {
  if (width !== undefined && width <= constants.COMPACT_MOBILE_MAX_WIDTH) {
    return {
      measuresPerRow: 1,
      stringSpacing: constants.MOBILE_STRING_SPACING,
      rowGap: constants.MOBILE_ROW_GAP,
      measureBottomPadding: constants.MOBILE_MEASURE_BOTTOM_PADDING,
      rhythmStemLength: constants.MOBILE_RHYTHM_STEM_LENGTH,
      paddingX: constants.MOBILE_PADDING_X,
    };
  }

  return {
    measuresPerRow: undefined,
    stringSpacing: constants.STRING_SPACING,
    rowGap: constants.ROW_GAP,
    measureBottomPadding: constants.MEASURE_BOTTOM_PADDING,
    rhythmStemLength: constants.RHYTHM_STEM_LENGTH,
    paddingX: constants.TAB_PADDING_X,
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
