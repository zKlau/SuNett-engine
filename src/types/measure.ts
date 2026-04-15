import type { Duration, TimeSignature, KeySignature } from "./duration.ts";

export type Measure = {
    number: number;
    start: number;
    has_double_bar: boolean;
    key_signature: KeySignature;
    time_signature: TimeSignature;
    track_index: number;
    header_index: number;
    clef: MeasureClef;
    // voices: Voice[]; // Might not be neccessary for now
    line_break: LineBreak;
    simile_mark?: string;
};

export type MeasureHeader = {
    number: number;
    start: number;
    time_signature: TimeSignature;
    tempo: number;
    repeat_open: boolean;
    triplet_feel: TripletFeel;
    key_signature: KeySignature;
    double_bar: boolean;
    fermatas: MeasureFermata[];
    free_time: boolean;
};

export enum TripletFeel {
    None = "None",
    Eighth = "Eighth",
    Sixteenth = "Sixteenth",
}

type MeasureFermata = {
    fermata_type: FermataType;
    offset: [number, number];
};

enum MeasureClef {
    Treble = "Treble",
    Bass = "Bass",
    Tenor = "Tenor",
    Alto = "Alto",
    Percussion = "Percussion",
}

enum LineBreak {
    None = "None",
    Break = "Break",
    Page = "Page",
}
enum FermataType {
    Short = "Short",
    Medium = "Medium",
    Long = "Long",
}

/* Stores the information about a group of measures which are repeated.

type RepeatGroup = {
    measure_headers: [],
    closings: [],
    openings: [],
    is_closed: boolean,
};

*/
