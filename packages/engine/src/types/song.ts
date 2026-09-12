import type { KeySignature } from "./duration";
import type { MeasureHeader } from "./measure";
import type { Lyrics } from "./lyrics";
import type { Track } from "./track";
import type { MidiChannel } from "./channels";
import type { TripletFeel } from "./measure";

export type Song = {
  version: Version;
  name: string;
  album: string;
  writer: string;
  artist: string;
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
  triplet_feel?: typeof TripletFeel;
  tracks: Track[];
};

type Version = {
  data: string;
  clipboard: boolean;
  number: [number, number, number];
};
