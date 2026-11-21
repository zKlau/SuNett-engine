import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Measure } from "../../types/measure";
import type { BeatLayout } from "../../types/UI/noteLayout";
import type { BeatColumn, MeasureFragment } from "../../types/UI/tabLayout";
import { durationInWholeNotes } from "../timing/durationLength";
import { measureLengthInWholeNotes } from "../timing/measureTimeline";
import { fitBeatWidths } from "./notesLayout";

const TIME_PRECISION = 1e-9;

export function splitMeasure(
  measure: Measure,
  minimumWidths: number[][],
  rowWidth: number,
  showTimeSignature: boolean,
): MeasureFragment[] {
  const { columns, duration } = measureColumns(measure, minimumWidths);
  if (columns.length < 2) {
    return [];
  }
  const pulse = 1 / (measure.time_signature?.denominator.value || 4);
  const fragments: MeasureFragment[] = [];
  let start = 0;
  while (start < columns.length) {
    const available =
      rowWidth -
      constants.MEASURE_CONTENT_PADDING_END -
      measureStartPadding(showTimeSignature && start === 0);
    const end = fragmentEnd(columns, start, available, pulse);
    const last = end === columns.length;
    fragments.push({
      part: fragments.length,
      last,
      start: columns[start].time / duration,
      end: last ? 1 : columns[end].time / duration,
      columns: columns.slice(start, end).map((column) => ({
        ...column,
        time: column.time / duration,
      })),
    });
    start = end;
  }
  return fragments.length > 1 ? fragments : [];
}

export function layoutFragmentBeats(
  fragment: MeasureFragment,
  startX: number,
  availableWidth: number,
): BeatLayout[] {
  const { columns, end, start } = fragment;
  const lengths = columns.map(
    (column, index) => (columns[index + 1]?.time ?? end) - column.time,
  );
  const minimums = columns.map((column) => column.minWidth);
  const minWidth = minimums.reduce((sum, width) => sum + width, 0);
  const widths =
    minWidth > availableWidth
      ? minimums.map((width) => (width / minWidth) * availableWidth)
      : fitBeatWidths(lengths, end - start, availableWidth, minimums);
  let x = startX;
  return columns.flatMap((column, index) => {
    const width = widths[index];
    const center = x + width / 2;
    x += width;
    return column.beats.map((beat) => ({ ...beat, x: center, width }));
  });
}

export function measureStartPadding(showTimeSignature: boolean): number {
  return (
    constants.MEASURE_CONTENT_PADDING_START +
    (showTimeSignature ? constants.TIME_SIGNATURE_GUTTER : 0)
  );
}

export function measureFragmentNotes(
  measure: Measure,
  fragment?: MeasureFragment,
): Measure {
  if (!fragment) {
    return measure;
  }
  const voices = measure.voices.map((voice) => ({
    ...voice,
    beats: [] as typeof voice.beats,
  }));
  for (const column of fragment.columns) {
    for (const { voiceIndex, beatIndex } of column.beats) {
      voices[voiceIndex].beats.push(
        measure.voices[voiceIndex].beats[beatIndex],
      );
    }
  }
  return { ...measure, voices };
}

function measureColumns(measure: Measure, minimumWidths: number[][]) {
  const columns = new Map<number, BeatColumn>();
  let duration = measureLengthInWholeNotes(measure);
  measure.voices.forEach((voice, voiceIndex) => {
    let time = 0;
    voice.beats.forEach((beat, beatIndex) => {
      const key = Math.round(time / TIME_PRECISION);
      const column = columns.get(key) ?? { time, minWidth: 0, beats: [] };
      column.beats.push({ voiceIndex, beatIndex });
      column.minWidth = Math.max(
        column.minWidth,
        minimumWidths[voiceIndex][beatIndex],
      );
      columns.set(key, column);
      time += durationInWholeNotes(beat.duration);
    });
    duration = Math.max(duration, time);
  });
  return {
    columns: [...columns.values()].sort((a, b) => a.time - b.time),
    duration,
  };
}

function fragmentEnd(
  columns: BeatColumn[],
  start: number,
  availableWidth: number,
  pulse: number,
): number {
  let width = columns[start].minWidth;
  let end = start + 1;
  let preferred = start;
  while (
    end < columns.length &&
    width + columns[end].minWidth <= availableWidth
  ) {
    width += columns[end].minWidth;
    end += 1;
    const time = columns[end]?.time;
    if (
      time !== undefined &&
      Math.abs(time - Math.round(time / pulse) * pulse) < TIME_PRECISION
    ) {
      preferred = end;
    }
  }
  return end < columns.length && preferred - start >= (end - start) / 2
    ? preferred
    : end;
}
