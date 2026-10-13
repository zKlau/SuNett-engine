import type { Selection } from "../types/selection";
import type { MeasureLayout } from "../types/UI/tabLayout";
import type { Rect } from "../types/UI/rect";
import type { SongTimeline } from "../utils/timing/measureTimeline";
import { clamp } from "../utils/functions/clamp";

export type SelectionMeasure = {
  index: number;
  layout: MeasureLayout;
};

export type SelectionLayoutContext = {
  timeline: SongTimeline;
  measures: SelectionMeasure[];
  measureHeight: number;
  topPadding: number;
  bottomPadding: number;
  labelOffset: number;
  minWidth: number;
};

export type SelectionLabel = {
  x: number;
  y: number;
  text: string;
};

export type SelectionRegion = {
  selection: Selection;
  rects: Rect[];
  label?: SelectionLabel;
  draft?: boolean;
};

export function computeSelectionRegions(
  selections: Selection[],
  context: SelectionLayoutContext,
): SelectionRegion[] {
  return selections
    .map((selection) => buildRegion(selection, context))
    .filter((region): region is SelectionRegion => region.rects.length > 0);
}

function buildRegion(
  selection: Selection,
  context: SelectionLayoutContext,
): SelectionRegion {
  const rects: Rect[] = [];

  for (const { index, layout } of context.measures) {
    const rect = measureRect(selection, index, layout, context);
    if (rect) {
      rects.push(rect);
    }
  }

  return { selection, rects, label: labelFor(selection, rects, context) };
}

function measureRect(
  selection: Selection,
  index: number,
  layout: MeasureLayout,
  context: SelectionLayoutContext,
): Rect | undefined {
  const timing = context.timeline.measures[index];
  if (!timing) {
    return undefined;
  }

  const startMs = Math.min(selection.startMs, selection.endMs);
  const endMs = Math.max(selection.startMs, selection.endMs);
  if (endMs <= timing.startMs || startMs >= timing.endMs) {
    return undefined;
  }

  const duration = timing.durationMs > 0 ? timing.durationMs : 1;
  const startFraction = clamp((startMs - timing.startMs) / duration, 0, 1);
  const endFraction = clamp((endMs - timing.startMs) / duration, 0, 1);

  const x = layout.x + startFraction * layout.width;
  const rawWidth = (endFraction - startFraction) * layout.width;
  const width = Math.max(rawWidth, context.minWidth);

  return {
    x,
    y: layout.y + context.topPadding,
    width,
    height: context.measureHeight - context.topPadding - context.bottomPadding,
  };
}

function labelFor(
  selection: Selection,
  rects: Rect[],
  context: SelectionLayoutContext,
): SelectionLabel | undefined {
  if (!selection.label || rects.length === 0) {
    return undefined;
  }

  const anchor = rects.reduce((topLeft, rect) =>
    rect.y < topLeft.y || (rect.y === topLeft.y && rect.x < topLeft.x)
      ? rect
      : topLeft,
  );

  return {
    x: anchor.x,
    y: anchor.y - context.labelOffset,
    text: selection.label,
  };
}
