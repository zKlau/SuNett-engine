import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Measure } from "../../types/measure";
import type { BeatLayout } from "../../types/UI/noteLayout";
import { durationInWholeNotes } from "../timing/durationLength";

export function calculateBeatLayouts(
  measure: Measure,
  startX: number,
  availableWidth: number,
): BeatLayout[] {
  if (availableWidth <= 0) {
    return [];
  }

  return measure.voices.flatMap((voice, voiceIndex) => {
    if (voice.beats.length === 0) {
      return [];
    }

    const lengths = voice.beats.map((beat) =>
      durationInWholeNotes(beat.duration),
    );
    const totalLength = lengths.reduce((sum, length) => sum + length, 0) || 1;

    const proportionalWidths = lengths.map(
      (length) => (length / totalLength) * availableWidth,
    );
    const equalWidth = availableWidth / lengths.length;
    const smallestWidth = Math.min(...proportionalWidths);
    const minimumWidth = Math.min(constants.MIN_BEAT_WIDTH, equalWidth);
    const spacingBlend =
      smallestWidth < minimumWidth && equalWidth > smallestWidth
        ? (minimumWidth - smallestWidth) / (equalWidth - smallestWidth)
        : 0;
    const layouts: BeatLayout[] = [];
    let cursor = 0;
    voice.beats.forEach((beat, beatIndex) => {
      const width =
        proportionalWidths[beatIndex] * (1 - spacingBlend) +
        equalWidth * spacingBlend;
      const beatStartX = startX + cursor;
      const isSingleTie =
        voice.beats.length === 1 &&
        beat.notes.some((note) => note.kind === "Tie");
      layouts.push({
        beatIndex,
        voiceIndex,
        x: isSingleTie
          ? beatStartX + width * constants.TIED_BEAT_POSITION_RATIO
          : beatStartX + width / 2,
        width,
      });
      cursor += width;
    });
    return layouts;
  });
}
