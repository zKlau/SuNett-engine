import type { NoteEffect } from "./notes/noteEffects";
import type { NoteType } from "./notes/noteType";

export type Note = {
  value: number;
  velocity: number;
  string: number;
  effect: NoteEffect;
  duration_percent: number;
  swap_accidentals: boolean;
  kind: keyof typeof NoteType;
  duration?: number;
  tuplet?: number;
};
