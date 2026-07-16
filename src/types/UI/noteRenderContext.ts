import type { Beat } from "../beats/beat";
import type { Measure } from "../measure";
import type { Note } from "../note";

export type NoteRenderContext = {
  note: Note;
  beat: Beat;
  measure: Measure;
  measureIndex: number;
  voiceIndex: number;
  beatIndex: number;
  x: number;
  y: number;
  fontSize: number;
  createElement: <K extends keyof SVGElementTagNameMap>(
    tag: K,
  ) => SVGElementTagNameMap[K];
};
