import type {
  SelectionLayoutContext,
  SelectionMeasure,
} from "../selection/selectionRegions";
import type { MeasureTiming } from "../utils/timing/measureTimeline";
import { clamp } from "../utils/functions/clamp";
import { measureAnchors, xAtTime } from "./measureTimeMap";

export type CursorGeometry = {
  x: number;
  y: number;
  height: number;
  rowTop: number;
  rowHeight: number;
};

type TimedMeasure = {
  measure: SelectionMeasure;
  timing: MeasureTiming;
};

export function cursorGeometryAt(
  ms: number,
  context: SelectionLayoutContext,
): CursorGeometry | undefined {
  let last: TimedMeasure | undefined;

  for (const measure of context.measures) {
    const timing = context.timeline.measures[measure.index];
    if (!timing) {
      continue;
    }
    last = { measure, timing };
    if (ms < timing.endMs) {
      return geometryFor(ms, last, context);
    }
  }

  return last ? geometryFor(ms, last, context) : undefined;
}

function geometryFor(
  ms: number,
  { measure, timing }: TimedMeasure,
  context: SelectionLayoutContext,
): CursorGeometry {
  const { layout } = measure;
  const anchors = measureAnchors(
    context.anchorsFor,
    measure.index,
    timing,
    layout,
  );
  const clampedMs = clamp(ms, timing.startMs, timing.endMs);

  return {
    x: xAtTime(anchors, clampedMs) ?? layout.x,
    y: layout.y + context.topPadding,
    height: context.measureHeight - context.topPadding - context.bottomPadding,
    rowTop: layout.y,
    rowHeight: context.measureHeight,
  };
}
