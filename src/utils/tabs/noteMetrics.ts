import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import { clamp } from "../functions/clamp";

export type NoteMetrics = {
  fontSize: number;
  backgroundHeight: number;
};

type NoteSizeOptions = {
  fontSize?: number;
  backgroundHeight?: number;
};

/**
 * Resolves note text and background sizes for one render pass.
 *
 * The font size scales with the layout's string spacing - which itself grows
 * with the measure width - so notes keep their proportions instead of looking
 * progressively smaller as the tab widens. The background is derived from the
 * resolved font size so the two can never desync.
 *
 * An explicit option wins and stays fixed at that value.
 */
export function resolveNoteMetrics(
  options: NoteSizeOptions,
  stringSpacing: number,
): NoteMetrics {
  const fontSize =
    options.fontSize ??
    clamp(
      stringSpacing * constants.NOTE_FONT_SIZE_RATIO,
      constants.MIN_NOTE_FONT_SIZE,
      constants.MAX_NOTE_FONT_SIZE,
    );

  return {
    fontSize,
    backgroundHeight:
      options.backgroundHeight ?? fontSize * constants.NOTE_BACKGROUND_RATIO,
  };
}
