import type { Duration, TimeSignature, KeySignature } from "./duration";
import { Voice } from "./voice";

export type Measure = {
    number: number;
    start: number;
    has_double_bar: boolean;
    key_signature: KeySignature;
    time_signature: TimeSignature;
    track_index: number;
    header_index: number;
    clef: keyof typeof MeasureClef;
    line_break: keyof typeof LineBreak;
    simile_mark?: string;
    voices: Voice[];
};

export type MeasureHeader = {
    number: number;
    start: number;
    time_signature: TimeSignature;
    tempo: number;
    repeat_open: boolean;
    repeat_close:number
    repeat_alternative: number;
    triplet_feel: keyof typeof TripletFeel;
    key_signature: KeySignature;
    double_bar: boolean;
    fermatas: MeasureFermata[];
    free_time: boolean;
};

export const TripletFeel = {
    None: "None",
    Eighth: "Eighth",
    Sixteenth: "Sixteenth",
} as const;

type MeasureFermata = {
    fermata_type: keyof typeof FermataType;
    offset: [number, number];
};

const MeasureClef = {
    Treble: "Treble",
    Bass: "Bass",
    Tenor: "Tenor",
    Alto: "Alto",
    Percussion: "Percussion",
} as const;

const LineBreak = {
    None: "None",
    Break: "Break",
    Page: "Page",
} as const;
const FermataType = {
    Short: "Short",
    Medium: "Medium",
    Long: "Long",
} as const;
