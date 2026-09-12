import type { NoteRenderContext } from "./noteRenderContext";
import type { Measure } from "../measure";

export type PositionedNote = {
  context: NoteRenderContext;
  width: number;
  glyphWidth: number;
  glyphHeight: number;
  displayValue: number;
  deferBend: boolean;
};

export type NoteEffectsRenderRequest = {
  parent: SVGGElement;
  notes: PositionedNote[];
  classPrefix: string;
  spanY: number;
  staffTop: number;
  measureStartX: number;
  measureEndX: number;
  previousNotes?: PositionedNote[];
  nextRowMeasure?: Measure;
};

export type EffectRenderState = {
  parent: SVGGElement;
  entry: PositionedNote;
  next?: PositionedNote;
  classPrefix: string;
};

export type EffectBeat = {
  voiceIndex: number;
  beatIndex: number;
  x: number;
  width: number;
  notes: PositionedNote[];
};

export type EffectSpan = {
  start: EffectBeat;
  end: EffectBeat;
};

export type SpanRenderConfig = {
  effect: "palm-mute" | "let-ring";
  label: string;
  active: (note: PositionedNote) => boolean;
  lineOnSingle: boolean;
};
