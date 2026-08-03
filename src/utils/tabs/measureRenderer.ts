import type { MeasureBounds } from "../../types/UI/measureBounds";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { RenderPass } from "../../types/UI/renderPass";
import { createSvgElement } from "./svg";
import { renderBarlines } from "./barlineRenderer";
import {
  renderMeasureIndex,
  renderStringLines,
  renderTempo,
  renderTuningLabels,
} from "./measureFrameRenderer";
import {
  renderMeasureContent,
  shouldRenderTimeSignature,
} from "./measureContentRenderer";

export function renderMeasure(
  svg: SVGSVGElement,
  measureContext: MeasureContext,
  index: number,
  pass: RenderPass,
  nextMeasureContext?: MeasureContext,
): void {
  const { layout, totalMeasures } = pass;
  const measureLayout = layout.measureLayouts[index];

  if (!measureLayout) {
    return;
  }

  const previousLayout = layout.measureLayouts[index - 1];
  const nextLayout = layout.measureLayouts[index + 1];
  const isRowStart =
    !previousLayout || previousLayout.row !== measureLayout.row;
  const isRowEnd = !nextLayout || nextLayout.row !== measureLayout.row;
  const isFirstMeasure = index === 0;
  const isLastMeasure = index === totalMeasures - 1;

  const { x, y, width } = measureLayout;
  const measureGroup = createSvgElement("g");
  const stringsGroup = createSvgElement("g");
  const barlinesGroup = createSvgElement("g");
  const notesGroup = createSvgElement("g");
  const rhythmGroup = createSvgElement("g");
  const notationGroup = createSvgElement("g");
  const labelsGroup = createSvgElement("g");

  measureGroup.setAttribute("class", "measure");
  measureGroup.setAttribute("measure-index", `${measureContext.index}`);
  measureGroup.setAttribute(
    "measure-number",
    `${measureContext.measure.number}`,
  );
  measureGroup.setAttribute("x", `${x}`);
  measureGroup.setAttribute("y", `${y}`);

  stringsGroup.setAttribute("class", "measure-strings");
  barlinesGroup.setAttribute("class", "measure-barlines");
  notesGroup.setAttribute("class", "measure-notes");
  rhythmGroup.setAttribute("class", "measure-rhythm");
  notationGroup.setAttribute("class", "measure-notation");
  labelsGroup.setAttribute("class", "measure-labels");

  const bounds: MeasureBounds = {
    x,
    y,
    width,
    height: layout.measureHeight,
    stringSpacing: layout.stringSpacing,
    isLastMeasure,
  };
  const showTimeSignature = shouldRenderTimeSignature(
    measureContext,
    isFirstMeasure,
    pass.song.measure_headers[measureContext.index - 1],
  );

  renderMeasureIndex(labelsGroup, measureContext, x, y);
  renderStringLines(
    stringsGroup,
    bounds,
    layout.stringCount,
    pass.stringByIndex,
  );
  if (isFirstMeasure) {
    renderTempo(labelsGroup, bounds, pass.song);
    renderTuningLabels(
      labelsGroup,
      bounds,
      pass.tuningLabels,
      layout.stringCount,
    );
  }
  renderBarlines({
    parent: barlinesGroup,
    measureContext,
    bounds,
    isRowStart,
    isFirstMeasure,
  });

  const previousMeasureNotes =
    pass.previousMeasureIndex === measureContext.index - 1
      ? pass.previousNotes
      : [];
  const previousNotes =
    pass.previousMeasureRow === measureLayout.row ? previousMeasureNotes : [];
  const positionedNotes = renderMeasureContent({
    notesParent: notesGroup,
    rhythmParent: rhythmGroup,
    notationParent: notationGroup,
    measureContext,
    bounds,
    stringCount: layout.stringCount,
    invertStrings: pass.config.invertStrings,
    reverseStrings: pass.reverseStrings,
    noteConfig: pass.config.notes,
    noteMetrics: pass.metrics,
    previousNotes,
    previousMeasureNotes,
    nextMeasure:
      nextLayout?.row === measureLayout.row
        ? nextMeasureContext?.measure
        : undefined,
    nextRowMeasure:
      isRowEnd && nextMeasureContext ? nextMeasureContext.measure : undefined,
    showTimeSignature,
    lyrics: pass.lyricsByMeasure.get(measureContext.index) ?? [],
  });

  measureGroup.append(
    stringsGroup,
    barlinesGroup,
    notesGroup,
    rhythmGroup,
    notationGroup,
    labelsGroup,
  );
  svg.append(measureGroup);

  pass.previousMeasureIndex = measureContext.index;
  pass.previousMeasureRow = measureLayout.row;
  pass.previousNotes = positionedNotes;
}
