import type { Beat } from "../beats/beat";
import type { Measure } from "../measure";
import type { Note } from "../note";
import type { MeasureBounds } from "./measureBounds";
import type { BeatLayout } from "./noteLayout";
import type { NoteMetrics } from "./noteMetrics";
import type { NoteRenderContext } from "./noteRenderContext";
import type { PositionedNote } from "./noteEffectsRender";

export type NoteRenderConfig = {
  fontSize?: number;
  maxFontSize?: number;
  paddingX: number;
  backgroundHeight?: number;
  background: boolean;
  classPrefix: string;
  defaultStyles: boolean;
  render?: (context: NoteRenderContext) => SVGElement | null | undefined;
  onCreate?: (element: SVGGElement, context: NoteRenderContext) => void;
  onClick?: (context: NoteRenderContext, event: MouseEvent) => void;
  onPointerEnter?: (context: NoteRenderContext, event: PointerEvent) => void;
  onPointerLeave?: (context: NoteRenderContext, event: PointerEvent) => void;
};

export type NotesRenderRequest = {
  parent: SVGGElement;
  measure: Measure;
  measureIndex: number;
  beatLayouts: BeatLayout[];
  bounds: MeasureBounds;
  stringCount: number;
  invertStrings?: boolean;
  reverseStrings?: boolean;
  config: NoteRenderConfig;
  metrics: NoteMetrics;
  previousNotes?: PositionedNote[];
  previousMeasureNotes?: PositionedNote[];
  nextMeasure?: Measure;
  nextRowMeasure?: Measure;
};

export type NoteRenderRequest = {
  parent: SVGGElement;
  measure: Measure;
  measureIndex: number;
  beat: Beat;
  beatLayout: BeatLayout;
  note: Note;
  bounds: MeasureBounds;
  stringCount: number;
  invertStrings: boolean;
  reverseStrings: boolean;
  config: NoteRenderConfig;
  metrics: NoteMetrics;
};

export type PositionedNoteRender = {
  request: NoteRenderRequest;
  context: NoteRenderContext;
  width: number;
  glyphWidth: number;
  glyphHeight: number;
  label: string;
  displayValue: number;
  deferBend: boolean;
};
