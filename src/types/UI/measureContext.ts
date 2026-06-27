import type { Measure, MeasureHeader } from "../measure";

export type MeasureContext = {
  measure: Measure;
  header?: MeasureHeader;
  index: number;
};
