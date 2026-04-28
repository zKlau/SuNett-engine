import type { Measure } from "./measure";

type TrackSettings = {
  tablature: boolean;
  notation: boolean;
  diagram_are_below: boolean;
  show_rythm: boolean;
  force_horizontal: boolean;
  force_channels: boolean;
  diagram_list: boolean;
  diagram_in_score: boolean;
  auto_let_ring: boolean;
  auto_brush: boolean;
  extend_rythmic: boolean;
};

export type Track = {
  number: number;
  offset: number;
  channel_index: number;
  solo: boolean;
  mute: boolean;
  visible: boolean;
  name: string;
  short_name: string;
  strings: [number, number][];
  color: number;
  percussion_track: boolean;
  twelve_stringed_guitar_track: boolean;
  banjo_track: boolean;
  port: number;
  fret_count: number;
  indicate_tuning: boolean;
  // use_rse:boolean; Shouldn't be neccessary
  // rse: TrackRse; Shouldn't be neccessary
  measures: Measure[];
  settings: TrackSettings;
};
