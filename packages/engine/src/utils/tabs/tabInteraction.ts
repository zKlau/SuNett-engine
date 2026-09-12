import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Selection, SelectionSource } from "../../types/selection";
import type { CursorOptions } from "../../types/UI/cursorOptions";
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
import type { CursorGeometry } from "../../playback/cursorGeometry";
import { cursorGeometryAt } from "../../playback/cursorGeometry";
import { CursorLayer } from "./cursorLayer";

export type InteractionUpdate = {
  svg: SVGSVGElement;
  layout: TabLayout;
  measures: MeasureContext[];
  timeline: SongTimeline;
  trackIndex: number;
};

export class TabInteraction {
  private readonly selectionSource?: SelectionSource;
  private readonly cursorLayer: CursorLayer;
  private svg?: SVGSVGElement;
  private timeline?: SongTimeline;
  private trackIndex = 0;
  private context?: SelectionLayoutContext;

  constructor(
    selectionSource?: SelectionSource,
    cursorOptions?: CursorOptions,
  ) {
    this.selectionSource = selectionSource;
    this.cursorLayer = new CursorLayer(cursorOptions);
  }

  update(input: InteractionUpdate): void {
    const context = buildContext(input);
    this.svg = input.svg;
    this.timeline = input.timeline;
    this.trackIndex = input.trackIndex;
    this.context = context;

    if (this.selectionSource) {
      const regions = computeSelectionRegions(
        visibleSelections(
          this.selectionSource.getSelections(),
          this.trackIndex,
        ),
        context,
      );
      const draft = this.selectionSource.getDraftSelection?.();
      const draftRegions = draft
        ? computeSelectionRegions([draft], context).map((region) => ({
            ...region,
            draft: true,
          }))
        : [];

      renderSelections(input.svg, [...regions, ...draftRegions]);
    }

    this.cursorLayer.sync(input.svg, context);
  }

  setCursor(ms: number | undefined): void {
    this.cursorLayer.setCursor(ms);
  }

  teardownCursor(): void {
    this.cursorLayer.teardown();
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

  getCursorGeometry(): CursorGeometry | undefined {
    return this.cursorLayer.getGeometry();
  }

  getCursorRect(): DOMRect | undefined {
    return this.cursorLayer.getRect();
  }

  pointAtTime(
    ms: number,
  ): { x: number; y: number; height: number } | undefined {
    const svg = this.svg;
    if (!svg || !this.context || typeof svg.getScreenCTM !== "function") {
      return undefined;
    }
    const geometry = cursorGeometryAt(ms, this.context);
    const matrix = svg.getScreenCTM();
    if (!geometry || !matrix) {
      return undefined;
    }

    const top = svg.createSVGPoint();
    top.x = geometry.x;
    top.y = geometry.y;
    const bottom = svg.createSVGPoint();
    bottom.x = geometry.x;
    bottom.y = geometry.y + geometry.height;
    const topScreen = top.matrixTransform(matrix);
    const bottomScreen = bottom.matrixTransform(matrix);
    return {
      x: topScreen.x,
      y: topScreen.y,
      height: bottomScreen.y - topScreen.y,
    };
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
