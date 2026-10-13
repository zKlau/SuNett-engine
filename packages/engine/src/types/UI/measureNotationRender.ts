import type { MeasureBounds } from "./measureBounds";
import type { MeasureContext } from "./measureContext";
import type { BeatLayout } from "./noteLayout";

export type LyricSyllable = {
  beatIndex: number;
  lineIndex: number;
  text: string;
};

export type LyricsByMeasure = Map<number, LyricSyllable[]>;

export type MeasureNotationRequest = {
  parent: SVGGElement;
  measureContext: MeasureContext;
  beatLayouts: BeatLayout[];
  bounds: MeasureBounds;
  stringCount: number;
  showTimeSignature: boolean;
  lyrics: LyricSyllable[];
  rowRightX?: number;
  labelFontSize?: number;
};
