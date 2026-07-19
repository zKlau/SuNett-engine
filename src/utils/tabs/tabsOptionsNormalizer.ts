import type { TabNoteOptions } from "../../types/UI/tabNoteOptions";
import type { TabRendererOptions } from "../../types/UI/rendererOptions";
import type { Theme } from "../../theme/theme";
import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import { isPresetTheme, resolvePreset } from "../../theme/presets";

export function normalizeOptions(options: TabRendererOptions) {
  return {
    theme: normalizeTheme(options.theme),

    trackIndex: options.trackIndex ?? 0,
    measuresPerRow: Math.max(
      1,
      options.measuresPerRow ?? constants.DEFAULT_MEASURES_PER_ROW,
    ),
    minMeasureWidth: options.minMeasureWidth ?? constants.MIN_MEASURE_WIDTH,

    defaultMeasureWidth:
      options.defaultMeasureWidth ?? constants.DEFAULT_MEASURE_WIDTH,

    maxMeasureWidth: options.maxMeasureWidth ?? constants.MAX_MEASURE_WIDTH,

    minStringSpacing: options.minStringSpacing ?? constants.MIN_STRING_SPACING,

    stringSpacing: options.stringSpacing ?? constants.STRING_SPACING,

    maxStringSpacing: options.maxStringSpacing ?? constants.MAX_STRING_SPACING,

    invertStrings: options.invertStrings ?? constants.INVERT_STRINGS,

    showTuning: options.showTuning ?? constants.SHOW_TUNING,

    measureGap: options.measureGap ?? constants.MEASURE_GAP,

    rowGap: options.rowGap ?? constants.ROW_GAP,

    paddingX: options.paddingX ?? constants.TAB_PADDING_X,

    paddingY: options.paddingY ?? constants.TAB_PADDING_Y,

    notes: normalizeNoteOptions(options.notes ?? {}),
  };
}

/**
 * Resolves the `theme` option to a {@link Theme}, or `undefined` when no theme
 * was requested. An unknown preset name resolves to `undefined` rather than
 * throwing, so a typo degrades to the unthemed fallbacks instead of a blank tab.
 */
function normalizeTheme(theme: TabRendererOptions["theme"]): Theme | undefined {
  if (!theme) {
    return undefined;
  }
  if (typeof theme === "string") {
    return isPresetTheme(theme) ? resolvePreset(theme) : undefined;
  }
  return theme;
}

function normalizeNoteOptions(options: TabNoteOptions) {
  return {
    fontSize: options.fontSize ?? constants.NOTE_FONT_SIZE,
    paddingX: options.paddingX ?? constants.NOTE_PADDING_X,
    backgroundHeight:
      options.backgroundHeight ?? constants.NOTE_BACKGROUND_HEIGHT,
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
