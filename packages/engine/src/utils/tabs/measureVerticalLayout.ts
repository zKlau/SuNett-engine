import { BravuraNotationGlyphs } from "../../constants/notationGlyphPaths";
import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Track } from "../../types/track";
import type { LyricsByMeasure } from "../../types/UI/measureNotationRender";
import type { NormalizedRendererOptions } from "../../types/UI/normalizedRendererOptions";
import { clamp } from "../functions/clamp";
import { resolveNoteMetrics } from "./noteMetrics";

export type MeasureAnnotations = {
  lyricsByMeasure?: LyricsByMeasure;
  labelFontSize?: number;
};

export function resolveMeasureBottomPadding(
  track: Track,
  config: NormalizedRendererOptions,
  annotations: MeasureAnnotations,
): number {
  const metrics = resolveNoteMetrics(
    config.notes,
    clamp(
      config.stringSpacing,
      config.minStringSpacing,
      config.maxStringSpacing,
    ),
  );
  const arrowHeight =
    BravuraNotationGlyphs.BEND_ARROW_UP.height *
    constants.NOTE_EFFECT_BEND_ARROW_SCALE;
  const effectFontSize = Math.max(
    constants.NOTE_EFFECT_MIN_FONT_SIZE,
    metrics.fontSize * constants.NOTE_EFFECT_FONT_RATIO,
  );
  let lowerExtent = 0;
  let upperOverflow = 0;

  track.measures.forEach((measure) => {
    measure.voices.forEach((voice, voiceIndex) => {
      voice.beats.forEach((beat) => {
        if (beat.status !== "Normal") {
          return;
        }
        const beamLevel = Math.max(
          0,
          Math.floor(Math.log2(beat.duration.value / 4)),
        );
        const beams =
          Math.max(0, beamLevel - 1) * constants.RHYTHM_SECONDARY_BEAM_GAP +
          constants.RHYTHM_BEAM_WIDTH / 2;
        const tuplet =
          beat.duration.tuplet_enters > 1
            ? constants.RHYTHM_TUPLET_BRACKET_OFFSET +
              constants.RHYTHM_TUPLET_FONT_SIZE / 2
            : 0;
        lowerExtent = Math.max(
          lowerExtent,
          config.rhythmStemLength +
            voiceIndex * constants.RHYTHM_VOICE_OFFSET +
            Math.max(beams, tuplet, constants.RHYTHM_DOT_RADIUS),
        );

        beat.notes.forEach((note) => {
          const bend = note.effect?.bend;
          if (!bend || bend.kind === "None") {
            return;
          }
          upperOverflow = Math.max(
            upperOverflow,
            metrics.backgroundHeight / 2 +
              constants.NOTE_EFFECT_NOTE_GAP +
              constants.NOTE_EFFECT_BEND_HEIGHT +
              arrowHeight +
              constants.NOTE_EFFECT_BEND_LABEL_GAP +
              effectFontSize / 2 -
              constants.MEASURE_TOP_PADDING,
          );
          if (bend.points.some((point) => point.value < 0)) {
            lowerExtent = Math.max(
              lowerExtent,
              constants.NOTE_EFFECT_BEND_HEIGHT + arrowHeight,
            );
          }
        });
      });
    });
  });

  const lyricFontSize =
    annotations.labelFontSize ?? constants.BEAT_TEXT_FONT_SIZE;
  annotations.lyricsByMeasure?.forEach((syllables) => {
    syllables.forEach((syllable) => {
      lowerExtent = Math.max(
        lowerExtent,
        constants.LYRICS_OFFSET +
          syllable.lineIndex * constants.LYRICS_LINE_GAP +
          lyricFontSize / 2,
      );
    });
  });

  return Math.ceil(
    Math.max(
      config.measureBottomPadding,
      lowerExtent + constants.MEASURE_NOTATION_CLEARANCE,
      lowerExtent +
        upperOverflow +
        constants.MEASURE_NOTATION_CLEARANCE -
        Math.max(0, config.rowGap),
    ),
  );
}
