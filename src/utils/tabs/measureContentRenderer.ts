import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { MeasureHeader } from "../../types/measure";
import type { MeasureContentRenderRequest } from "../../types/UI/measureContentRender";
import type { MeasureBounds } from "../../types/UI/measureBounds";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { BeatLayout } from "../../types/UI/noteLayout";
import { renderMeasureNotation } from "./measureNotationRenderer";
import { calculateBeatLayouts } from "./notesLayout";
import { renderMeasureNotes } from "./notesRenderer";
import { renderRhythm } from "./rhythmRenderer";

export function calculateMeasureBeatLayouts(
  measureContext: MeasureContext,
  bounds: MeasureBounds,
  showTimeSignature: boolean,
): BeatLayout[] {
  const startPadding = Math.min(
    constants.MEASURE_CONTENT_PADDING_START +
      (showTimeSignature ? constants.TIME_SIGNATURE_GUTTER : 0),
    bounds.width / 3,
  );
  const endPadding = Math.min(
    constants.MEASURE_CONTENT_PADDING_END,
    bounds.width / 3,
  );
  const contentWidth = Math.max(0, bounds.width - startPadding - endPadding);

  return calculateBeatLayouts(
    measureContext.measure,
    bounds.x + startPadding,
    contentWidth,
  );
}

export function renderMeasureContent(request: MeasureContentRenderRequest) {
  const beatLayouts = calculateMeasureBeatLayouts(
    request.measureContext,
    request.bounds,
    request.showTimeSignature,
  );
  const positionedNotes = renderMeasureNotes({
    parent: request.notesParent,
    measure: request.measureContext.measure,
    measureIndex: request.measureContext.index,
    beatLayouts,
    bounds: request.bounds,
    stringCount: request.stringCount,
    invertStrings: request.invertStrings,
    reverseStrings: request.reverseStrings,
    config: request.noteConfig,
    metrics: request.noteMetrics,
    previousNotes: request.previousNotes,
  });
  const staffTop = request.bounds.y + constants.MEASURE_TOP_PADDING;
  const staffBottom =
    staffTop + (request.stringCount - 1) * request.bounds.stringSpacing;

  renderRhythm({
    parent: request.rhythmParent,
    measure: request.measureContext.measure,
    beatLayouts,
    staffTop,
    staffBottom,
  });
  renderMeasureNotation({
    parent: request.notationParent,
    measureContext: request.measureContext,
    beatLayouts,
    bounds: request.bounds,
    stringCount: request.stringCount,
    showTimeSignature: request.showTimeSignature,
    lyrics: request.lyrics,
  });

  return positionedNotes;
}

export function shouldRenderTimeSignature(
  measureContext: MeasureContext,
  isFirstMeasure: boolean,
  previousHeader: MeasureHeader | undefined,
): boolean {
  if (measureContext.header?.free_time) {
    return false;
  }
  if (isFirstMeasure) {
    return true;
  }

  const current =
    measureContext.header?.time_signature ??
    measureContext.measure.time_signature;
  const previous = previousHeader?.time_signature;
  if (!current || !previous) {
    return false;
  }
  return (
    current.numerator !== previous.numerator ||
    current.denominator.value !== previous.denominator.value
  );
}
