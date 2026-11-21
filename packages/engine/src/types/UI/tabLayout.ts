export type BeatColumn = {
  time: number;
  minWidth: number;
  beats: { voiceIndex: number; beatIndex: number }[];
};

export type MeasureFragment = {
  part: number;
  last: boolean;
  start: number;
  end: number;
  columns: BeatColumn[];
};

export type MeasureLayout = {
  x: number;
  y: number;
  width: number;
  row: number;
  measurePosition?: number;
  fragment?: MeasureFragment;
};

export type TabLayout = {
  stringCount: number;
  measureLayouts: MeasureLayout[];
  stringSpacing: number;
  measureHeight: number;
  bottomPadding?: number;
  rowHeight: number;
  contentWidth: number;
  measureGap: number;
  paddingX: number;
  paddingY: number;
  rowCount: number;
  tuningGutter: number;
};
