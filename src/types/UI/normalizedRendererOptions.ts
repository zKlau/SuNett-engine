import type { NoteRenderConfig } from "./notesRender";

export type NormalizedRendererOptions = {
  trackIndex: number;
  measuresPerRow?: number;
  minMeasureWidth: number;
  defaultMeasureWidth: number;
  maxMeasureWidth: number;
  minStringSpacing: number;
  stringSpacing: number;
  maxStringSpacing: number;
  invertStrings: boolean;
  showTuning: boolean;
  hideEmptyMeasures: boolean;
  measureGap: number;
  rowGap: number;
  paddingX: number;
  paddingY: number;
  notes: NoteRenderConfig;
};
