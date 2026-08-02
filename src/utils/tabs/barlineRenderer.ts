import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { MeasureBounds } from "../../types/UI/measureBounds";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { RepeatLine } from "../../types/UI/repeatLine";
import { ThemeVariables, themeVar } from "../../theme/variables";
import { clamp } from "../functions/clamp";
import { createSvgElement } from "./svg";
import { applyLabelDefaults, applyLineDefaults } from "./svgDefaults";

export type BarlineRenderContext = {
  parent: SVGGElement;
  measureContext: MeasureContext;
  bounds: MeasureBounds;
  isRowStart: boolean;
  isFirstMeasure: boolean;
};

export function renderBarlines(context: BarlineRenderContext): void {
  const { parent, measureContext, bounds, isRowStart, isFirstMeasure } =
    context;
  const top = bounds.y + constants.MEASURE_TOP_PADDING;
  const bottom = bounds.y + bounds.height - constants.MEASURE_BOTTOM_PADDING;
  const leftX = bounds.x;
  const rightX = bounds.x + bounds.width;

  const header = measureContext.header;
  const repeatCount = Math.max(0, header?.repeat_close ?? 0);
  const openRepeat = header?.repeat_open ?? false;
  const closeRepeat = repeatCount > 0;
  const doubleBar = Boolean(
    header?.double_bar || measureContext.measure.has_double_bar,
  );
  const finalBar = bounds.isLastMeasure && !closeRepeat;

  if (isRowStart && !isFirstMeasure) {
    appendRepeatLine(parent, measureBar("barline-start", leftX, top, bottom));
  }

  if (openRepeat) {
    appendRepeatLine(
      parent,
      repeatLine(
        "barline-repeat-open",
        leftX + constants.REPEAT_BAR_GAP,
        top,
        bottom,
      ),
    );
    appendRepeatDots(
      parent,
      leftX + constants.REPEAT_DOT_OFFSET,
      top,
      bottom,
      bounds.stringSpacing,
    );
  }

  const rightEdge =
    finalBar || closeRepeat
      ? repeatLine("barline-end", rightX, top, bottom)
      : measureBar("barline-end", rightX, top, bottom);
  appendRepeatLine(parent, rightEdge);

  if (finalBar || doubleBar || closeRepeat) {
    appendRepeatLine(
      parent,
      measureBar(
        "barline-inner",
        rightX - constants.REPEAT_BAR_GAP,
        top,
        bottom,
      ),
    );
  }

  if (closeRepeat) {
    appendRepeatDots(
      parent,
      rightX - constants.REPEAT_DOT_OFFSET,
      top,
      bottom,
      bounds.stringSpacing,
    );

    if (repeatCount > 1) {
      appendRepeatCount(parent, repeatCount, rightX, top);
    }
  }
}

function measureBar(
  modifier: string,
  x: number,
  top: number,
  bottom: number,
): RepeatLine {
  return {
    className: `barline ${modifier}`,
    x,
    top,
    bottom,
    width: constants.MEASURE_BAR_WIDTH,
  };
}

function repeatLine(
  modifier: string,
  x: number,
  top: number,
  bottom: number,
): RepeatLine {
  return {
    className: `barline ${modifier}`,
    x,
    top,
    bottom,
    width: constants.REPEAT_LINE_WIDTH,
  };
}

function appendRepeatLine(parent: SVGGElement, line: RepeatLine): void {
  const path = createSvgElement("path");

  path.setAttribute("class", line.className);
  path.setAttribute("stroke-width", `${line.width}`);
  path.setAttribute("d", `M ${line.x} ${line.top} V ${line.bottom}`);
  applyLineDefaults(
    path,
    ThemeVariables.COLOR_BARLINE,
    ThemeVariables.BARLINE_OPACITY,
  );

  parent.append(path);
}

function appendRepeatDots(
  parent: SVGGElement,
  x: number,
  top: number,
  bottom: number,
  stringSpacing: number,
): void {
  const radius = constants.REPEAT_DOT_RADIUS;
  const maxOffset = Math.max(0.5, (bottom - top) / stringSpacing - 0.5);
  const dotOffsets = [clamp(1.5, 0.5, maxOffset), clamp(3.5, 0.5, maxOffset)];
  const dotYs = Array.from(new Set(dotOffsets)).map(
    (offset) => top + stringSpacing * offset,
  );

  for (const cy of dotYs) {
    const dot = createSvgElement("path");

    dot.setAttribute("class", "repeat-dot");
    dot.setAttribute("fill", themeVar(ThemeVariables.COLOR_BARLINE));
    dot.setAttribute("stroke", "none");
    dot.setAttribute(
      "d",
      [
        `M ${x - radius} ${cy}`,
        `a ${radius} ${radius} 0 1 0 ${radius * 2} 0`,
        `a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`,
        "Z",
      ].join(" "),
    );

    parent.append(dot);
  }
}

function appendRepeatCount(
  parent: SVGGElement,
  repeatCount: number,
  measureEndX: number,
  firstStringY: number,
): void {
  const repeatCountText = createSvgElement("text");

  repeatCountText.setAttribute("class", "repeat-count");
  applyLabelDefaults(repeatCountText);
  repeatCountText.setAttribute(
    "x",
    `${measureEndX - constants.REPEAT_DOT_OFFSET - 4}`,
  );
  repeatCountText.setAttribute(
    "y",
    `${firstStringY - constants.MEASURE_INDEX_OFFSET}`,
  );
  repeatCountText.setAttribute("text-anchor", "end");
  repeatCountText.textContent = `x${repeatCount}`;

  parent.append(repeatCountText);
}
