import type { Chord } from "../chords/chord";
import type { Duration } from "../duration";
import type { MixTableChange } from "../mixTable";
import type { Note } from "../note";
import type { BendEffect } from "../notes/effects/bend";
import type { Octave } from "../octaves";
import type { BeatDisplay } from "./beatDisplay";
import type { SlapEffect } from "./slap";
import type { BeatStroke, BeatStrokeDirection } from "./stroke";

export type Beat = {
  notes: Note[];
  duration: Duration;
  text: string;
  start?: number;
  effect: BeatEffects;
  octave: keyof typeof Octave;
  display: BeatDisplay;
  status: keyof typeof BeatStatus;
};

type BeatEffects = {
  stroke: BeatStroke;
  has_rasgueado: boolean;
  pick_stroke: keyof typeof BeatStrokeDirection;
  chord: Chord;
  fade_in: boolean;
  tremolo_bar: BendEffect;
  mix_table_change: MixTableChange;
  slap_effect: keyof typeof SlapEffect;
  vibrato: boolean;
};

const BeatStatus = {
  Empty: "Empty",
  Normal: "Normal",
  Rest: "Rest",
} as const;
