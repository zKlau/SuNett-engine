import type { Duration, TimeSignature, KeySignature } from "./duration";
import type { MeasureHeader, TripletFeel } from "./measure";
import type { Lyrics } from "./lyrics";
import type { Track } from "./track"; 
import { MidiChannel } from "./channels";

export type Song = {
    version: Version;
    name: string;
    album: string;
    writer: string;
    artist:string;
    copyright?: string;
    tempo: number;
    hide_tempo: boolean;
    tempo_name: string;
    measure_headers: MeasureHeader[];
    transcriber: string;
    channels: MidiChannel[];
    date: string;
    lyrics: Lyrics;
    key: KeySignature;
    triplet_feel?: TripletFeel;
    tracks: Track[],
};

type Version = {
    data: string;
    clipboard: boolean;
    number: [number, number, number];
};
