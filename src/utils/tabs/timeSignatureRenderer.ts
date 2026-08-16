import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../theme/variables";
import type { MeasureNotationRequest } from "../../types/UI/measureNotationRender";
import { createSvgElement } from "./svg";

export function renderTimeSignature(request: MeasureNotationRequest) {
  const signature =
    request.measureContext.header?.time_signature ??
    request.measureContext.measure.time_signature;
  if (!signature || request.measureContext.header?.free_time) {
    return;
  }

  const staffTop = request.bounds.y + constants.MEASURE_TOP_PADDING;
  const centerY =
    staffTop + ((request.stringCount - 1) * request.bounds.stringSpacing) / 2;
  const x = request.bounds.x + constants.TIME_SIGNATURE_X_OFFSET;
  const offset =
    request.bounds.stringSpacing * constants.TIME_SIGNATURE_LINE_OFFSET;
  const fontSize =
    request.bounds.stringSpacing * constants.TIME_SIGNATURE_FONT_RATIO;
  const group = createSvgElement("g");
  group.setAttribute("class", "time-signature");
  group.setAttribute("data-numerator", `${signature.numerator}`);
  group.setAttribute("data-denominator", `${signature.denominator.value}`);
  group.append(
    createSignatureText(
      `${signature.numerator}`,
      x,
      centerY - offset,
      fontSize,
    ),
    createSignatureText(
      `${signature.denominator.value}`,
      x,
      centerY + offset,
      fontSize,
    ),
  );
  request.parent.append(group);
}

function createSignatureText(
  value: string,
  x: number,
  y: number,
  fontSize: number,
): SVGTextElement {
  const text = createSvgElement("text");
  text.setAttribute("x", `${x}`);
  text.setAttribute("y", `${y}`);
  text.setAttribute("fill", themeVar(ThemeVariables.COLOR_NOTE_FG));
  text.setAttribute("stroke", themeVar(ThemeVariables.COLOR_NOTE_BG));
  text.setAttribute("stroke-width", `${constants.TIME_SIGNATURE_STROKE_WIDTH}`);
  text.setAttribute("paint-order", "stroke fill");
  text.setAttribute("font-family", themeVar(ThemeVariables.FONT_LABEL));
  text.setAttribute("font-size", `${fontSize}`);
  text.setAttribute("font-weight", "600");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.textContent = value;
  return text;
}
