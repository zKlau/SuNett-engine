import { Barre } from "../barre";
import { Fingering } from "../notes/fingering";
import { PitchClass } from "../pitch";
import { ChordAlteration } from "./alteration";
import { ChordType } from "./chordType";

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