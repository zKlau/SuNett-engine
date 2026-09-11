import type { Barre } from "../barre";
import type { Fingering } from "../notes/fingering";
import type { PitchClass } from "../pitch";
import type { ChordAlteration } from "./alteration";
import type { ChordType } from "./chordType";

export type Chord = {
  length: number;
  sharp?: boolean;
  root?: PitchClass;
  kind?: keyof typeof ChordType;
  extension?: keyof typeof ChordExtension;
  bass?: PitchClass;
  tonality?: keyof typeof ChordAlteration;
  add?: boolean;
  name: string;
  fifth?: keyof typeof ChordAlteration;
  ninth?: keyof typeof ChordAlteration;
  eleventh?: keyof typeof ChordAlteration;
  first_fret?: number;
  strings: number[];
  barres: Barre[];
  omissions: boolean[];
  fingerings: keyof (typeof Fingering)[];
  show?: boolean;
  new_format?: boolean;
};

const ChordExtension = {
  None: "None",
  Ninth: "Ninth",
  Eleventh: "Eleventh",
  Thirteenth: "Thirteenth",
} as const;
