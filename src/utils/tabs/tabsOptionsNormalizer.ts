import type { TabNoteOptions } from "../../types/UI/tabNoteOptions";
import type { TabRendererOptions } from "../../types/UI/rendererOptions";
import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";

export function normalizeOptions(options: TabRendererOptions) {
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

    minStringSpacing: options.minStringSpacing ?? constants.MIN_STRING_SPACING,

    stringSpacing: options.stringSpacing ?? constants.STRING_SPACING,

    maxStringSpacing: options.maxStringSpacing ?? constants.MAX_STRING_SPACING,

    invertStrings: options.invertStrings ?? constants.INVERT_STRINGS,

    measureGap: options.measureGap ?? constants.MEASURE_GAP,

    rowGap: options.rowGap ?? constants.ROW_GAP,

    paddingX: options.paddingX ?? constants.TAB_PADDING_X,

    paddingY: options.paddingY ?? constants.TAB_PADDING_Y,

    notes: normalizeNoteOptions(options.notes ?? {}),
  };
}

function normalizeNoteOptions(options: TabNoteOptions) {
  return {
    fontSize: options.fontSize ?? constants.NOTE_FONT_SIZE,
    paddingX: options.paddingX ?? constants.NOTE_PADDING_X,
    backgroundHeight:
      options.backgroundHeight ?? constants.NOTE_BACKGROUND_HEIGHT,
    background: options.background ?? true,
    classPrefix: options.classPrefix ?? constants.NOTE_CLASS_PREFIX,
    render: options.render,
    onCreate: options.onCreate,
    onClick: options.onClick,
    onPointerEnter: options.onPointerEnter,
    onPointerLeave: options.onPointerLeave,
  };
}
