import type { Beat } from "../beats/beat";
import type { Measure } from "../measure";
import type { BeatLayout } from "./noteLayout";

export type RhythmRenderRequest = {
  parent: SVGGElement;
  measure: Measure;
  beatLayouts: BeatLayout[];
  staffTop: number;
  staffBottom: number;
};

export type RhythmBeat = {
  beat: Beat;
  layout: BeatLayout;
};
