import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Track } from "../../types/track";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { MeasureLayout } from "../../types/UI/tabLayout";
import { clamp } from "../functions/clamp";
import type { normalizeOptions } from "./tabsOptionsNormalizer";

type RendererConfig = ReturnType<typeof normalizeOptions>;

export class LayoutCalculation {
  private track: Track;
  private config: RendererConfig;
  constructor(track: Track, config: RendererConfig) {
    this.track = track;
    this.config = config;
  }

  private calculateMeasureWidths(
    measures: MeasureContext[],
    baseMeasureWidth: number,
  ): number[] {
    const measureWeights = measures.map((measureContext) =>
      this.calculateWeights(measureContext),
    );

    const averageWeight =
      measureWeights.reduce((total, weight) => total + weight, 0) /
      Math.max(1, measureWeights.length);

    return measureWeights.map((weight) =>
      clamp(
        baseMeasureWidth * (weight / averageWeight),
        this.config.minMeasureWidth,
        this.config.maxMeasureWidth,
      ),
    );
  }

  private calculateWeights(measureContext: MeasureContext) {
    const beats = measureContext.measure.voices.flatMap((voice) => voice.beats);
    const noteCount = beats.reduce(
      (total, beat) => total + beat.notes.length,
      0,
    );

    return Math.max(
      1,
      beats.length * constants.MEASURE_BEAT_WEIGHT +
        noteCount * constants.MEASURE_NOTE_WEIGHT,
    );
  }

  private getRowWidth(measureWidths: number[], measureGap: number) {
    return (
      measureWidths.reduce((total, measureWidth) => total + measureWidth, 0) +
      Math.max(0, measureWidths.length - 1) * measureGap
    );
  }

  private calculateMeasureLayouts(
    measureWidths: number[],
    availableWidth: number,
    measureHeight: number,
    tuningGutter: number,
  ): MeasureLayout[] {
    const measureRows: number[][] = [];
    let currentRow: number[] = [];
    let currentRowWidth = 0;

    measureWidths.forEach((measureWidth) => {
      let widthGap = 0;

      if (currentRowWidth === 0) {
        widthGap = measureWidth;
      } else {
        widthGap = measureWidth + this.config.measureGap;
      }

      if (currentRowWidth > 0 && currentRowWidth + widthGap > availableWidth) {
        measureRows.push(currentRow);
        currentRow = [];
        currentRowWidth = 0;
      }

      currentRow.push(measureWidth);

      if (currentRowWidth === 0) {
        currentRowWidth += measureWidth;
      } else {
        currentRowWidth += measureWidth + this.config.measureGap;
      }
    });

    if (currentRow.length > 0) {
      measureRows.push(currentRow);
    }

    const measureLayouts = measureRows.flatMap((measureRow, row) => {
      const rowWidth = this.getRowWidth(measureRow, this.config.measureGap);

      let extraMeasureWidth = 0;
      if (measureRow.length === 1) {
        extraMeasureWidth = 0;
      } else {
        extraMeasureWidth =
          Math.max(0, availableWidth - rowWidth) / measureRow.length;
      }

      let x = this.config.paddingX + tuningGutter;
      const y =
        this.config.paddingY + row * (measureHeight + this.config.rowGap);

      return measureRow.map((measureWidth) => {
        const width = measureWidth + extraMeasureWidth;

        const measureLayout = {
          x,
          y,
          width,
          row,
        };
        x += width + this.config.measureGap;
        return measureLayout;
      });
    });
    return measureLayouts;
  }

  public calculateLayout(svgWidth: number, measures: MeasureContext[]) {
    const hasTuning =
      !this.track.percussion_track && this.track.strings.length > 0;
    const tuningGutter: number =
      this.config.showTuning && hasTuning ? constants.TUNING_GUTTER : 0;

    const availableWidth: number = Math.max(
      0,
      svgWidth - this.config.paddingX * 2 - tuningGutter,
    );

    const measureWidth: number = clamp(
      this.config.measuresPerRow !== undefined
        ? Math.floor(availableWidth / this.config.measuresPerRow)
        : this.config.defaultMeasureWidth,
      this.config.minMeasureWidth,
      this.config.maxMeasureWidth,
    );

    const stringSpacing: number = clamp(
      this.config.stringSpacing,
      this.config.minStringSpacing,
      this.config.maxStringSpacing,
    );
    const stringCount: number = this.track.percussion_track
      ? constants.PERCUSSION_LINE_COUNT
      : this.track.strings.length || constants.DEFAULT_STRING_COUNT;

    const measureHeight: number =
      constants.MEASURE_TOP_PADDING +
      stringSpacing * (stringCount - 1) +
      constants.MEASURE_BOTTOM_PADDING;

    const totalMeasureWidths: number[] = this.calculateMeasureWidths(
      measures,
      measureWidth,
    );
    const measureLayouts: MeasureLayout[] = this.calculateMeasureLayouts(
      totalMeasureWidths,
      availableWidth,
      measureHeight,
      tuningGutter,
    );

    const contentWidth: number = measureLayouts.reduce(
      (maxWidth, measureLayout) =>
        Math.max(
          maxWidth,
          measureLayout.x + measureLayout.width - this.config.paddingX,
        ),
      0,
    );
    const rowCount =
      measureLayouts.reduce(
        (maxRow, measureLayout) => Math.max(maxRow, measureLayout.row),
        0,
      ) + 1;

    return {
      measureLayouts,
      stringSpacing,
      measureHeight,
      rowHeight: measureHeight + this.config.rowGap,
      contentWidth,
      measureGap: this.config.measureGap,
      paddingX: this.config.paddingX,
      paddingY: this.config.paddingY,
      rowCount,
      stringCount,
      tuningGutter,
    };
  }
}
