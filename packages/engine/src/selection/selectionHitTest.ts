import type { Selection } from "../types/selection";
import type { MeasureLayout } from "../types/UI/tabLayout";
import type { Rect } from "../types/UI/rect";
import type {
  SelectionLayoutContext,
  SelectionMeasure,
} from "./selectionRegions";
import { computeSelectionRegions } from "./selectionRegions";
import { clamp } from "../utils/functions/clamp";

type Point = {
  x: number;
  y: number;
};

export function timeAtPoint(
  point: Point,
  context: SelectionLayoutContext,
): number | undefined {
  const rowMeasures = context.measures.filter(
    (measure) =>
      point.y >= measure.layout.y &&
      point.y <= measure.layout.y + context.measureHeight,
  );
  if (rowMeasures.length === 0) {
    return undefined;
  }

  const hit = measureAtX(point.x, rowMeasures);
  const timing = context.timeline.measures[hit.index];
  if (!timing) {
    return undefined;
  }

  const fraction = clamp((point.x - hit.layout.x) / hit.layout.width, 0, 1);
  return timing.startMs + fraction * timing.durationMs;
}

export function selectionAtPoint(
  point: Point,
  selections: Selection[],
  context: SelectionLayoutContext,
): Selection | undefined {
  const regions = computeSelectionRegions(selections, context);
  for (let index = regions.length - 1; index >= 0; index -= 1) {
    const region = regions[index];
    if (region.rects.some((rect) => rectContains(rect, point))) {
      return region.selection;
    }
  }
  return undefined;
}

function measureAtX(x: number, measures: SelectionMeasure[]): SelectionMeasure {
  const containing = measures.find(
    (measure) =>
      x >= measure.layout.x && x <= measure.layout.x + measure.layout.width,
  );
  if (containing) {
    return containing;
  }

  return measures.reduce((nearest, measure) =>
    distanceToX(x, measure.layout) < distanceToX(x, nearest.layout)
      ? measure
      : nearest,
  );
}

function distanceToX(x: number, layout: MeasureLayout): number {
  if (x < layout.x) {
    return layout.x - x;
  }
  const right = layout.x + layout.width;
  return x > right ? x - right : 0;
}

function rectContains(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}
