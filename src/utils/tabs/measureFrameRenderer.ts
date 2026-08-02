import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Song } from "../../types/song";
import type { MeasureBounds } from "../../types/UI/measureBounds";
import type { MeasureContext } from "../../types/UI/measureContext";
import { ThemeVariables, themeVar } from "../../theme/variables";
import { createSvgElement } from "./svg";
import { applyLabelDefaults, applyLineDefaults } from "./svgDefaults";

export function renderStringLines(
  parent: SVGGElement,
  bounds: MeasureBounds,
  stringCount: number,
  stringByIndex?: Readonly<Record<number, string>>,
): void {
  for (let stringIndex = 0; stringIndex < stringCount; stringIndex += 1) {
    const stringPath = createSvgElement("path");
    const y =
      bounds.y +
      constants.MEASURE_TOP_PADDING +
      stringIndex * bounds.stringSpacing;

    stringPath.setAttribute("class", "string");
    stringPath.setAttribute("string-index", `${stringIndex}`);
    stringPath.setAttribute(
      "d",
      `M ${bounds.x} ${y} H ${bounds.x + bounds.width}`,
    );
    applyLineDefaults(
      stringPath,
      ThemeVariables.COLOR_STRING,
      ThemeVariables.STRING_OPACITY,
    );
    const color = stringByIndex?.[stringIndex];
    if (color !== undefined) {
      stringPath.setAttribute("stroke", color);
    }
    stringPath.setAttribute(
      "stroke-width",
      themeVar(ThemeVariables.STRING_WIDTH),
    );

    parent.append(stringPath);
  }
}

export function renderTuningLabels(
  parent: SVGGElement,
  bounds: MeasureBounds,
  tuningLabels: string[],
  stringCount: number,
): void {
  for (let stringIndex = 0; stringIndex < stringCount; stringIndex += 1) {
    const label = tuningLabels[stringIndex];
    if (!label) {
      continue;
    }

    const tuningLabel = createSvgElement("text");
    const y =
      bounds.y +
      constants.MEASURE_TOP_PADDING +
      stringIndex * bounds.stringSpacing;

    tuningLabel.setAttribute("class", "tuning-label");
    applyLabelDefaults(tuningLabel);
    tuningLabel.setAttribute("string-index", `${stringIndex}`);
    tuningLabel.setAttribute("x", `${bounds.x - constants.TUNING_LABEL_OFFSET}`);
    tuningLabel.setAttribute("y", `${y}`);
    tuningLabel.setAttribute("text-anchor", "middle");
    tuningLabel.setAttribute("dominant-baseline", "central");
    tuningLabel.textContent = label;

    parent.append(tuningLabel);
  }
}

export function renderMeasureIndex(
  parent: SVGGElement,
  measureContext: MeasureContext,
  measureX: number,
  measureY: number,
): void {
  const measureIndex = createSvgElement("text");

  measureIndex.setAttribute("class", "measure-index");
  applyLabelDefaults(measureIndex);
  measureIndex.setAttribute("x", `${measureX}`);
  measureIndex.setAttribute(
    "y",
    `${measureY + constants.MEASURE_TOP_PADDING - constants.MEASURE_INDEX_OFFSET}`,
  );
  measureIndex.textContent = `${measureContext.index + 1}`;

  parent.append(measureIndex);
}

export function renderTempo(
  parent: SVGGElement,
  bounds: MeasureBounds,
  song: Song,
): void {
  if (song.hide_tempo || !Number.isFinite(song.tempo)) {
    return;
  }

  const tempo = createSvgElement("text");

  tempo.setAttribute("class", "tempo");
  applyLabelDefaults(tempo);
  tempo.setAttribute(
    "x",
    `${bounds.x + constants.MEASURE_CONTENT_PADDING_START * 2}`,
  );
  tempo.setAttribute(
    "y",
    `${bounds.y + constants.MEASURE_TOP_PADDING - constants.MEASURE_INDEX_OFFSET}`,
  );
  tempo.textContent = `${song.tempo} BPM`;

  parent.append(tempo);
}
