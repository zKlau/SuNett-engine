export type MeasureLayout = {
  x: number;
  y: number;
  width: number;
  row: number;
};

export type TabLayout = {
  stringCount: number;
  measureLayouts: MeasureLayout[];
  stringSpacing: number;
  measureHeight: number;
  rowHeight: number;
  contentWidth: number;
  measureGap: number;
  paddingX: number;
  paddingY: number;
  rowCount: number;
  tuningGutter: number;
};
