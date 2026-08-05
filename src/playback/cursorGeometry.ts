import type { SelectionLayoutContext } from "../selection/selectionRegions";
import type { MeasureLayout } from "../types/UI/tabLayout";
import { clamp } from "../utils/functions/clamp";

export type CursorGeometry = {
  x: number;
  y: number;
  height: number;
};

export function cursorGeometryAt(
  ms: number,
  context: SelectionLayoutContext,
): CursorGeometry | undefined {
  let last:
    | { layout: MeasureLayout; startMs: number; durationMs: number }
    | undefined;

  for (const { index, layout } of context.measures) {
    const timing = context.timeline.measures[index];
    if (!timing) {
      continue;
    }
    last = { layout, startMs: timing.startMs, durationMs: timing.durationMs };
    if (ms < timing.endMs) {
      return geometryFor(ms, last, context);
    }
  }

  return last ? geometryFor(ms, last, context) : undefined;
}

function geometryFor(
  ms: number,
  measure: { layout: MeasureLayout; startMs: number; durationMs: number },
  context: SelectionLayoutContext,
): CursorGeometry {
  const duration = measure.durationMs > 0 ? measure.durationMs : 1;
  const fraction = clamp((ms - measure.startMs) / duration, 0, 1);

  return {
    x: measure.layout.x + fraction * measure.layout.width,
    y: measure.layout.y + context.topPadding,
    height: context.measureHeight - context.topPadding - context.bottomPadding,
  };
}
