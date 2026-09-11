import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { MeasureNotationRequest } from "../../types/UI/measureNotationRender";
import { createSvgElement } from "./svg";
import { applyMutedText } from "./svgDefaults";

export function renderBeatText(request: MeasureNotationRequest) {
  const segments: string[] = [];

  request.beatLayouts.forEach((layout) => {
    const beat =
      request.measureContext.measure.voices[layout.voiceIndex]?.beats[
        layout.beatIndex
      ];
    const value = beat?.text.trim().replace(/\s+/g, " ");
    if (!value || segments.includes(value)) {
      return;
    }
    segments.push(value);
  });

  if (segments.length === 0) {
    return;
  }

  const baseY =
    request.bounds.y +
    constants.MEASURE_TOP_PADDING -
    constants.BEAT_TEXT_OFFSET;
  const rightX = request.rowRightX ?? request.bounds.x + request.bounds.width;
  const maxWidth = Math.max(
    0,
    rightX - request.bounds.x - constants.MEASURE_CONTENT_PADDING_END,
  );
  const fontSize = request.labelFontSize ?? constants.BEAT_TEXT_FONT_SIZE;
  const glyphWidth = fontSize * constants.BEAT_TEXT_GLYPH_WIDTH_RATIO;
  const lineHeight = fontSize * constants.BEAT_TEXT_LINE_HEIGHT_RATIO;
  const lines = wrapText(segments.join(" "), maxWidth, glyphWidth);

  const blockHeight = (lines.length - 1) * lineHeight;
  const topY = Math.max(baseY - blockHeight, fontSize);

  const text = createSvgElement("text");
  text.setAttribute("class", "beat-text");
  text.setAttribute("x", `${request.bounds.x}`);
  text.setAttribute("y", `${topY + blockHeight}`);
  applyMutedText(text);
  text.setAttribute("text-anchor", "start");

  lines.forEach((line, index) => {
    const isLastLine = index === lines.length - 1;
    const tspan = createSvgElement("tspan");
    tspan.setAttribute("x", `${request.bounds.x}`);
    tspan.setAttribute("y", `${topY + index * lineHeight}`);
    tspan.textContent = isLastLine ? line : `${line} `;
    text.append(tspan);
  });

  request.parent.append(text);
}

function wrapText(
  value: string,
  maxWidth: number,
  glyphWidth: number,
): string[] {
  if (maxWidth <= 0 || glyphWidth <= 0) {
    return [value];
  }

  const maxChars = Math.max(1, Math.floor(maxWidth / glyphWidth));
  const lines: string[] = [];
  let current = "";

  value.split(" ").forEach((word) => {
    if (current.length === 0) {
      current = word;
      return;
    }
    if (current.length + 1 + word.length <= maxChars) {
      current = `${current} ${word}`;
      return;
    }
    lines.push(current);
    current = word;
  });

  if (current.length > 0) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [value];
}
