import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { NoteMetrics, NoteSizeOptions } from "../../types/UI/noteMetrics";
import { clamp } from "../functions/clamp";

export function resolveNoteMetrics(
  options: NoteSizeOptions,
  stringSpacing: number,
): NoteMetrics {
  const maxFontSize = Math.min(
    options.maxFontSize ?? constants.MAX_NOTE_FONT_SIZE,
    stringSpacing,
  );
  const fontSize = clamp(
    options.fontSize ?? stringSpacing * constants.NOTE_FONT_SIZE_RATIO,
    Math.min(constants.MIN_NOTE_FONT_SIZE, maxFontSize),
    maxFontSize,
  );

  return {
    fontSize,
    backgroundHeight:
      options.backgroundHeight ?? fontSize * constants.NOTE_BACKGROUND_RATIO,
  };
}
