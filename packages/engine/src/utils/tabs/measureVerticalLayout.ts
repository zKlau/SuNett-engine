import { BravuraNotationGlyphs } from "../../constants/notationGlyphPaths";
import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Track } from "../../types/track";
import type { LyricsByMeasure } from "../../types/UI/measureNotationRender";
import type { NormalizedRendererOptions } from "../../types/UI/normalizedRendererOptions";
import { clamp } from "../functions/clamp";
import { resolveNoteMetrics } from "./noteMetrics";
import { shouldReverseStrings, stringDisplayRow } from "./stringOrder";

export type MeasureAnnotations = {
  lyricsByMeasure?: LyricsByMeasure;
  labelFontSize?: number;
  stringOffset?: number;
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
  const labelFontSize =
    annotations.labelFontSize ?? constants.BEAT_TEXT_FONT_SIZE;
  const stringSpacing = clamp(
    config.stringSpacing,
    config.minStringSpacing,
    config.maxStringSpacing,
  );
  const vibratoHeight =
    BravuraNotationGlyphs.GUITAR_SHAKE.height *
    constants.NOTE_EFFECT_GUITAR_SHAKE_SCALE;
  const reverseStrings = shouldReverseStrings(track);
  let lowerExtent = 0;
  let upperExtent = constants.MEASURE_INDEX_OFFSET + labelFontSize;

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

        if (beat.text) {
          upperExtent = Math.max(
            upperExtent,
            constants.BEAT_TEXT_OFFSET + labelFontSize / 2,
          );
        }
        const vibrato = beat.notes.some((note) => note.effect?.vibrato);
        if (vibrato) {
          upperExtent = Math.max(
            upperExtent,
            constants.NOTE_EFFECT_VIBRATO_OFFSET + vibratoHeight / 2,
          );
        }
        beat.notes.forEach((note) => {
          if (note.effect?.palm_mute || note.effect?.let_ring) {
            upperExtent = Math.max(
              upperExtent,
              constants.NOTE_EFFECT_SPAN_OFFSET +
                (note.effect.let_ring
                  ? constants.NOTE_EFFECT_TEXT_OFFSET +
                    constants.NOTE_EFFECT_SPAN_END_CAP_HEIGHT
                  : 0) +
                effectFontSize / 2,
            );
          }
          const bend = note.effect?.bend;
          if (!bend || bend.kind === "None") {
            return;
          }
          const stringRow = stringDisplayRow(
            note.string - (annotations.stringOffset ?? 0),
            track.strings.length || constants.DEFAULT_STRING_COUNT,
            reverseStrings,
            config.invertStrings,
          );
          upperExtent = Math.max(
            upperExtent,
            metrics.backgroundHeight / 2 +
              constants.NOTE_EFFECT_NOTE_GAP +
              constants.NOTE_EFFECT_BEND_HEIGHT +
              arrowHeight +
              constants.NOTE_EFFECT_BEND_LABEL_GAP +
              effectFontSize / 2 -
              Math.max(0, stringRow) * stringSpacing +
              (vibrato
                ? vibratoHeight + constants.MEASURE_NOTATION_CLEARANCE
                : 0),
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
        upperExtent +
        constants.MEASURE_NOTATION_CLEARANCE -
        constants.MEASURE_TOP_PADDING -
        config.rowGap,
    ),
  );
}
