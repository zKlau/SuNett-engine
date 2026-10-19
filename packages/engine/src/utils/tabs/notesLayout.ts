import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Measure } from "../../types/measure";
import type { BeatLayout } from "../../types/UI/noteLayout";
import type { NoteMetrics } from "../../types/UI/noteMetrics";
import type { NoteRenderConfig } from "../../types/UI/notesRender";
import { durationInWholeNotes } from "../timing/durationLength";
import {
  noteLabel,
  resolveGlyphWidth,
} from "./noteRendering/noteElementRenderer";

export function measureBeatMinimumWidths(
  measure: Measure,
  config: NoteRenderConfig,
  metrics: NoteMetrics,
): number[][] {
  return measure.voices.map((voice) =>
    voice.beats.map((beat) => {
      const glyphWidth = Math.max(
        metrics.backgroundHeight,
        ...beat.notes.map((note) =>
          resolveGlyphWidth(noteLabel(note), metrics.fontSize, config, metrics),
        ),
      );
      const hasBend = beat.notes.some(
        (note) => note.effect?.bend && note.effect.bend.kind !== "None",
      );
      const hasSlide = beat.notes.some((note) =>
        note.effect?.slides.some((slide) => slide !== "None"),
      );
      return (
        glyphWidth +
        constants.NOTE_MIN_GAP +
        (hasBend
          ? 2 *
            (constants.NOTE_EFFECT_NOTE_GAP +
              constants.NOTE_EFFECT_BEND_MIN_WIDTH +
              constants.NOTE_EFFECT_BEND_END_GAP)
          : 0) +
        (hasSlide
          ? 2 * constants.NOTE_EFFECT_SLIDE_MIN_LENGTH +
            constants.NOTE_EFFECT_SLIDE_PAIR_GAP
          : 0)
      );
    }),
  );
}

export function calculateBeatLayouts(
  measure: Measure,
  startX: number,
  availableWidth: number,
  minimumWidths?: number[][],
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
    const widths = fitBeatWidths(
      lengths,
      totalLength,
      availableWidth,
      minimumWidths?.[voiceIndex],
    );

    const layouts: BeatLayout[] = [];
    let cursor = 0;
    voice.beats.forEach((beat, beatIndex) => {
      const width = widths[beatIndex];
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

function fitBeatWidths(
  lengths: number[],
  totalLength: number,
  availableWidth: number,
  minimumWidths: number[] = lengths.map(() => 0),
): number[] {
  const widths = lengths.map(() => 0);
  const pending = new Set(lengths.map((_, index) => index));
  let remainingWidth = Math.max(
    availableWidth,
    minimumWidths.reduce((sum, width) => sum + width, 0),
  );
  let remainingLength = totalLength;

  while (pending.size > 0) {
    const constrained = [...pending].filter(
      (index) =>
        (lengths[index] / remainingLength) * remainingWidth <
        minimumWidths[index],
    );
    if (constrained.length === 0) {
      pending.forEach((index) => {
        widths[index] = (lengths[index] / remainingLength) * remainingWidth;
      });
      break;
    }
    constrained.forEach((index) => {
      widths[index] = minimumWidths[index];
      remainingWidth -= widths[index];
      remainingLength -= lengths[index];
      pending.delete(index);
    });
  }
  return widths;
}
