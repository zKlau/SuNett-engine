import type { Measure } from "../../types/measure";

export function measureHasNotes(measure: Measure): boolean {
  return measure.voices.some((voice) =>
    voice.beats.some((beat) => beat.notes.length > 0),
  );
}

export function visibleMeasureRange<T extends { measure: Measure }>(
  measures: T[],
): T[] {
  let first = 0;
  while (first < measures.length && !measureHasNotes(measures[first].measure)) {
    first += 1;
  }

  if (first === measures.length) {
    return measures;
  }

  let last = measures.length - 1;
  while (last > first && !measureHasNotes(measures[last].measure)) {
    last -= 1;
  }

  return measures.slice(first, last + 1);
}
