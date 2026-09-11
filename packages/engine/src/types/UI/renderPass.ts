import type { Song } from "../song";
import type { LyricsByMeasure } from "./measureNotationRender";
import type { NoteMetrics } from "./noteMetrics";
import type { PositionedNote } from "./noteEffectsRender";
import type { NormalizedRendererOptions } from "./normalizedRendererOptions";
import type { TabLayout } from "./tabLayout";

export type RenderPass = {
  song: Song;
  stringByIndex?: Readonly<Record<number, string>>;
  layout: TabLayout;
  config: NormalizedRendererOptions;
  metrics: NoteMetrics;
  labelFontSize: number;
  totalMeasures: number;
  reverseStrings: boolean;
  tuningLabels: string[];
  lyricsByMeasure: LyricsByMeasure;
  previousMeasureIndex?: number;
  previousMeasureRow?: number;
  previousNotes: PositionedNote[];
};
