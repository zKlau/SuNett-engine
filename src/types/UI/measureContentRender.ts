import type { LyricSyllable } from "./measureNotationRender";
import type { Measure } from "../measure";
import type { MeasureBounds } from "./measureBounds";
import type { MeasureContext } from "./measureContext";
import type { NoteMetrics } from "./noteMetrics";
import type { NoteRenderConfig } from "./notesRender";
import type { PositionedNote } from "./noteEffectsRender";

export type MeasureContentRenderRequest = {
  notesParent: SVGGElement;
  rhythmParent: SVGGElement;
  notationParent: SVGGElement;
  measureContext: MeasureContext;
  bounds: MeasureBounds;
  stringCount: number;
  invertStrings: boolean;
  reverseStrings: boolean;
  noteConfig: NoteRenderConfig;
  noteMetrics: NoteMetrics;
  previousNotes: PositionedNote[];
  previousMeasureNotes: PositionedNote[];
  nextMeasure?: Measure;
  nextRowMeasure?: Measure;
  showTimeSignature: boolean;
  lyrics: LyricSyllable[];
  rowRightX?: number;
  labelFontSize?: number;
};
