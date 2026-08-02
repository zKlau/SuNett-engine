import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../theme/variables";
import type { MeasureNotationRequest } from "../../types/UI/measureNotationRender";

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

  const text = createSvgElement("text");
  text.setAttribute("class", "beat-text");
  text.setAttribute("x", `${request.bounds.x}`);
  text.setAttribute(
    "y",
    `${
      request.bounds.y +
      constants.MEASURE_TOP_PADDING -
      constants.BEAT_TEXT_OFFSET
    }`,
  );
  applyMutedText(text);
  text.setAttribute("text-anchor", "start");
  text.textContent = segments.join(" ");
  request.parent.append(text);
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

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}
