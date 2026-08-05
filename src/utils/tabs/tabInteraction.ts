import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Selection, SelectionSource } from "../../types/selection";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { TabLayout } from "../../types/UI/tabLayout";
import type { SongTimeline } from "../timing/measureTimeline";
import type { SnapMode } from "../timing/snapTime";
import { snapTime } from "../timing/snapTime";
import type {
  SelectionLayoutContext,
  SelectionMeasure,
} from "../../selection/selectionRegions";
import { computeSelectionRegions } from "../../selection/selectionRegions";
import {
  selectionAtPoint,
  timeAtPoint,
} from "../../selection/selectionHitTest";
import { visibleSelections } from "../../selection/selectionVisibility";
import { renderSelections } from "./selectionRenderer";
import { cursorGeometryAt } from "../../playback/cursorGeometry";
import { createCursorLine, positionCursorLine } from "./cursorRenderer";

export type InteractionUpdate = {
  svg: SVGSVGElement;
  layout: TabLayout;
  measures: MeasureContext[];
  timeline: SongTimeline;
  trackIndex: number;
};

/**
 * Owns the spatial/temporal index of the last render and the selection overlay
 * drawn on top of it. Keeps the interaction concerns (hit-testing, time mapping,
 * snapping, overlay drawing) out of the renderer itself.
 */
export class TabInteraction {
  private readonly selectionSource?: SelectionSource;
  private svg?: SVGSVGElement;
  private timeline?: SongTimeline;
  private trackIndex = 0;
  private context?: SelectionLayoutContext;
  private cursorMs?: number;
  private cursorLine?: SVGLineElement;

  constructor(selectionSource?: SelectionSource) {
    this.selectionSource = selectionSource;
  }

  update(input: InteractionUpdate): void {
    this.svg = input.svg;
    this.timeline = input.timeline;
    this.trackIndex = input.trackIndex;
    this.context = buildContext(input);
    this.cursorLine = undefined;

    if (this.selectionSource) {
      const regions = computeSelectionRegions(
        visibleSelections(
          this.selectionSource.getSelections(),
          this.trackIndex,
        ),
        this.context,
      );
      const draft = this.selectionSource.getDraftSelection?.();
      const draftRegions = draft
        ? computeSelectionRegions([draft], this.context).map((region) => ({
            ...region,
            draft: true,
          }))
        : [];

      renderSelections(input.svg, [...regions, ...draftRegions]);
    }

    this.drawCursor();
  }

  setCursor(ms: number | undefined): void {
    this.cursorMs = ms;
    this.drawCursor();
  }

  getActiveTrackIndex(): number {
    return this.trackIndex;
  }

  snapTime(ms: number, mode: SnapMode): number {
    return this.timeline ? snapTime(ms, mode, this.timeline) : ms;
  }

  timeAtPoint(clientX: number, clientY: number): number | undefined {
    const point = this.toUserSpace(clientX, clientY);
    if (!point || !this.context) {
      return undefined;
    }
    return timeAtPoint(point, this.context);
  }

  selectionAt(clientX: number, clientY: number): Selection | undefined {
    const point = this.toUserSpace(clientX, clientY);
    if (!point || !this.context) {
      return undefined;
    }
    return selectionAtPoint(
      point,
      visibleSelections(
        this.selectionSource?.getSelections() ?? [],
        this.trackIndex,
      ),
      this.context,
    );
  }

  private drawCursor(): void {
    const svg = this.svg;
    if (!svg || !this.context || this.cursorMs === undefined) {
      this.removeCursor();
      return;
    }

    const geometry = cursorGeometryAt(this.cursorMs, this.context);
    if (!geometry) {
      this.removeCursor();
      return;
    }

    if (!this.cursorLine || this.cursorLine.parentNode !== svg) {
      this.cursorLine = createCursorLine(svg);
    }
    positionCursorLine(this.cursorLine, geometry);
  }

  private removeCursor(): void {
    this.cursorLine?.remove();
    this.cursorLine = undefined;
  }

  private toUserSpace(
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | undefined {
    const svg = this.svg;
    if (!svg || typeof svg.getScreenCTM !== "function") {
      return undefined;
    }

    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return undefined;
    }

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const user = point.matrixTransform(matrix.inverse());
    return { x: user.x, y: user.y };
  }
}

function buildContext(input: InteractionUpdate): SelectionLayoutContext {
  const measures: SelectionMeasure[] = [];
  input.measures.forEach((measureContext, index) => {
    const measureLayout = input.layout.measureLayouts[index];
    if (measureLayout) {
      measures.push({ index: measureContext.index, layout: measureLayout });
    }
  });

  return {
    timeline: input.timeline,
    measures,
    measureHeight: input.layout.measureHeight,
    topPadding: constants.MEASURE_TOP_PADDING,
    bottomPadding: constants.MEASURE_BOTTOM_PADDING,
    labelOffset: constants.SELECTION_LABEL_OFFSET,
    minWidth: constants.SELECTION_MIN_WIDTH,
  };
}
