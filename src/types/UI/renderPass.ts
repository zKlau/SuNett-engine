import type { LyricsByMeasure } from "./measureNotationRender";
import type { NoteMetrics } from "./noteMetrics";
import type { PositionedNote } from "./noteEffectsRender";
import type { NormalizedRendererOptions } from "./normalizedRendererOptions";
import type { TabLayout } from "./tabLayout";

export type RenderPass = {
  layout: TabLayout;
  config: NormalizedRendererOptions;
  metrics: NoteMetrics;
  totalMeasures: number;
  reverseStrings: boolean;
  tuningLabels: string[];
  lyricsByMeasure: LyricsByMeasure;
  previousMeasureIndex?: number;
  previousMeasureRow?: number;
  previousNotes: PositionedNote[];
};
