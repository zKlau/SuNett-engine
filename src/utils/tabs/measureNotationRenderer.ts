import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../theme/variables";
import type { MeasureNotationRequest } from "../../types/UI/measureNotationRender";
import { createSvgElement } from "./svg";

export function renderMeasureNotation(request: MeasureNotationRequest) {
  if (request.showTimeSignature) {
    renderTimeSignature(request);
  }
  renderBeatText(request);
  renderLyrics(request);
}

function renderTimeSignature(request: MeasureNotationRequest) {
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

function renderBeatText(request: MeasureNotationRequest) {
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

function renderLyrics(request: MeasureNotationRequest) {
  const bottomY =
    request.bounds.y +
    constants.MEASURE_TOP_PADDING +
    (request.stringCount - 1) * request.bounds.stringSpacing;

  request.lyrics.forEach((syllable) => {
    const layout = request.beatLayouts.find((candidate) => {
      return (
        candidate.voiceIndex === 0 && candidate.beatIndex === syllable.beatIndex
      );
    });
    if (!layout) {
      return;
    }

    const text = createSvgElement("text");
    text.setAttribute("class", "lyric");
    text.setAttribute("data-line-index", `${syllable.lineIndex}`);
    text.setAttribute("data-beat-index", `${syllable.beatIndex}`);
    text.setAttribute("x", `${layout.x}`);
    text.setAttribute(
      "y",
      `${
        bottomY +
        constants.LYRICS_OFFSET +
        syllable.lineIndex * constants.LYRICS_LINE_GAP
      }`,
    );
    applyMutedText(text);
    text.setAttribute("text-anchor", "middle");
    text.textContent = syllable.text;
    request.parent.append(text);
  });
}

function applyMutedText(text: SVGTextElement) {
  text.setAttribute("fill", themeVar(ThemeVariables.COLOR_MUTED));
  text.setAttribute("font-family", themeVar(ThemeVariables.FONT_LABEL));
  text.setAttribute("font-size", themeVar(ThemeVariables.FONT_LABEL_SIZE));
  text.setAttribute("dominant-baseline", "central");
}
