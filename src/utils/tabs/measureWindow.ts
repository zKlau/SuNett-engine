import type { TabLayout } from "../../types/UI/tabLayout";
import { clamp } from "../functions/clamp";

export type RowRange = { minRow: number; maxRow: number };

export type MeasureRange = { first: number; last: number } | undefined;

type Span = { top: number; bottom: number };

export function visibleRowRange(
  svgRect: Span,
  viewport: Span,
  layout: TabLayout,
  viewBoxHeight: number,
  overscanRows: number,
): RowRange {
  const renderedHeight = svgRect.bottom - svgRect.top;
  const lastRow = Math.max(0, layout.rowCount - 1);

  if (renderedHeight <= 0 || viewBoxHeight <= 0) {
    return { minRow: 0, maxRow: lastRow };
  }

  const scale = viewBoxHeight / renderedHeight;
  const topUser = (Math.max(viewport.top, svgRect.top) - svgRect.top) * scale;
  const bottomUser =
    (Math.min(viewport.bottom, svgRect.bottom) - svgRect.top) * scale;

  return {
    minRow: clamp(rowAt(topUser, layout) - overscanRows, 0, lastRow),
    maxRow: clamp(rowAt(bottomUser, layout) + overscanRows, 0, lastRow),
  };
}

export function measureIndicesForRows(
  layout: TabLayout,
  range: RowRange,
): MeasureRange {
  let first: number | undefined;
  let last: number | undefined;

  layout.measureLayouts.forEach((measureLayout, index) => {
    if (measureLayout.row < range.minRow || measureLayout.row > range.maxRow) {
      return;
    }
    if (first === undefined) {
      first = index;
    }
    last = index;
  });

  if (first === undefined || last === undefined) {
    return undefined;
  }
  return { first, last };
}

function rowAt(userY: number, layout: TabLayout): number {
  const row = Math.floor((userY - layout.paddingY) / layout.rowHeight);
  return clamp(row, 0, Math.max(0, layout.rowCount - 1));
}
