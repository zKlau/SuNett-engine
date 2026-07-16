import type { TabNoteOptions } from "./tabNoteOptions";

export type TabRendererOptions = {
  target?: string | SVGSVGElement;
  trackIndex?: number;
  measuresPerRow?: number;
  minMeasureWidth?: number;
  defaultMeasureWidth?: number;
  maxMeasureWidth?: number;
  minStringSpacing?: number;
  stringSpacing?: number;
  maxStringSpacing?: number;
  invertStrings?: boolean;
  measureGap?: number;
  rowGap?: number;
  paddingX?: number;
  paddingY?: number;
  notes?: TabNoteOptions;
};
