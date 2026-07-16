import type { Duration } from "../../types/duration";
import type { Measure } from "../../types/measure";
import type { BeatLayout } from "../../types/UI/noteLayout";

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

    const lengths = voice.beats.map((beat) => beatLength(beat.duration));
    const totalLength = lengths.reduce((sum, length) => sum + length, 0) || 1;

    const layouts: BeatLayout[] = [];
    let cursor = 0;
    voice.beats.forEach((_beat, beatIndex) => {
      const width = (lengths[beatIndex] / totalLength) * availableWidth;
      layouts.push({
        beatIndex,
        voiceIndex,
        x: startX + cursor + width / 2,
        width,
      });
      cursor += width;
    });
    return layouts;
  });
}

function beatLength(duration: Duration): number {
  const base = 1 / Math.max(1, duration.value);

  let multiplier = 1;
  if (duration.dotted) {
    multiplier *= 1.5;
  }
  if (duration.double_dotted) {
    multiplier *= 1.75;
  }

  const tupletEnters = Math.max(1, duration.tuplet_enters);
  const tupletTimes = Math.max(1, duration.tuplet_times);
  return base * multiplier * (tupletTimes / tupletEnters);
}
