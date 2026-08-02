import type { MeasureTiming, SongTimeline } from "./measureTimeline";
import { clamp } from "../functions/clamp";

/** How a selection time is quantised. */
export const SnapMode = {
  /** No snapping: full millisecond precision. */
  None: "None",
  /** Snap to the nearest beat (the metric pulse). */
  Beat: "Beat",
  /** Snap to the nearest measure boundary. */
  Measure: "Measure",
} as const;

export type SnapMode = keyof typeof SnapMode;

export function snapTime(
  ms: number,
  mode: SnapMode,
  timeline: SongTimeline,
): number {
  if (mode === SnapMode.Beat) {
    return snapToBeat(ms, timeline);
  }
  if (mode === SnapMode.Measure) {
    return snapToMeasure(ms, timeline);
  }
  return ms;
}

function snapToBeat(ms: number, timeline: SongTimeline): number {
  const measure = measureAt(ms, timeline);
  if (!measure || measure.beatDurationMs <= 0) {
    return ms;
  }

  const beat = clamp(
    Math.round((ms - measure.startMs) / measure.beatDurationMs),
    0,
    measure.beatCount,
  );
  return measure.startMs + beat * measure.beatDurationMs;
}

function snapToMeasure(ms: number, timeline: SongTimeline): number {
  const boundaries = timeline.measures.map((measure) => measure.startMs);
  const last = timeline.measures[timeline.measures.length - 1];
  if (last) {
    boundaries.push(last.endMs);
  }
  if (boundaries.length === 0) {
    return ms;
  }

  return boundaries.reduce((nearest, boundary) =>
    Math.abs(boundary - ms) < Math.abs(nearest - ms) ? boundary : nearest,
  );
}

function measureAt(
  ms: number,
  timeline: SongTimeline,
): MeasureTiming | undefined {
  const { measures } = timeline;
  if (measures.length === 0) {
    return undefined;
  }
  if (ms <= measures[0].startMs) {
    return measures[0];
  }
  const found = measures.find(
    (measure) => ms >= measure.startMs && ms < measure.endMs,
  );
  return found ?? measures[measures.length - 1];
}
