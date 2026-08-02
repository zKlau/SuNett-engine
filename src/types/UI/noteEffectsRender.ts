import type { NoteRenderContext } from "./noteRenderContext";

export type PositionedNote = {
  context: NoteRenderContext;
  width: number;
  glyphWidth: number;
};

export type NoteEffectsRenderRequest = {
  parent: SVGGElement;
  notes: PositionedNote[];
  classPrefix: string;
  spanY: number;
  staffTop: number;
  previousNotes?: PositionedNote[];
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
