import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Track } from "../../types/track";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { MeasureLayout } from "../../types/UI/tabLayout";
import { clamp } from "../functions/clamp";
import type { normalizeOptions } from "./tabsOptionsNormalizer";
import { measureBeatMinimumWidths } from "./notesLayout";
import { resolveNoteMetrics } from "./noteMetrics";
import { shouldRenderTimeSignature } from "./measureContentRenderer";
import { resolveMeasureBottomPadding } from "./measureVerticalLayout";
import type { MeasureAnnotations } from "./measureVerticalLayout";
import { measureStartPadding, splitMeasure } from "./measureFragments";

type RendererConfig = ReturnType<typeof normalizeOptions>;
type MeasureWidth = Pick<
  MeasureLayout,
  "width" | "measurePosition" | "fragment"
>;

export class LayoutCalculation {
  private track: Track;
  private config: RendererConfig;
  private annotations: MeasureAnnotations;
  constructor(
    track: Track,
    config: RendererConfig,
    annotations: MeasureAnnotations = {},
  ) {
    this.track = track;
    this.config = config;
    this.annotations = annotations;
  }

  private calculateMeasureWidths(
    measures: MeasureContext[],
    baseMeasureWidth: number,
    availableWidth: number,
  ): MeasureWidth[] {
    const maxWidth = Math.min(this.config.maxMeasureWidth, availableWidth);
    const minWidth = Math.min(this.config.minMeasureWidth, maxWidth);
    const measureWeights = measures.map((measureContext) =>
      this.calculateWeights(measureContext),
    );

    const averageWeight =
      measureWeights.reduce((total, weight) => total + weight, 0) /
      Math.max(1, measureWeights.length);

    const metrics = resolveNoteMetrics(
      this.config.notes,
      clamp(
        this.config.stringSpacing,
        this.config.minStringSpacing,
        this.config.maxStringSpacing,
      ),
    );

    return measureWeights.flatMap((weight, measurePosition) => {
      const context = measures[measurePosition];
      const showTimeSignature = shouldRenderTimeSignature(
        context,
        measurePosition === 0,
        measures[measurePosition - 1]?.header,
      );
      const minimums = measureBeatMinimumWidths(
        context.measure,
        this.config.notes,
        metrics,
      );
      const minContentWidth =
        measureStartPadding(showTimeSignature) +
        constants.MEASURE_CONTENT_PADDING_END +
        Math.max(
          0,
          ...minimums.map((widths) =>
            widths.reduce((sum, width) => sum + width, 0),
          ),
        );
      const width = Math.max(
        clamp(baseMeasureWidth * (weight / averageWeight), minWidth, maxWidth),
        minContentWidth,
      );
      if (this.config.wrapMeasures && width > availableWidth) {
        const fragments = splitMeasure(
          context.measure,
          minimums,
          availableWidth,
          showTimeSignature,
        );
        if (fragments.length > 0) {
          return fragments.map((fragment) => ({
            width: availableWidth,
            measurePosition,
            fragment,
          }));
        }
      }
      return [{ width, measurePosition }];
    });
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

  private getRowWidth(measureWidths: MeasureWidth[], measureGap: number) {
    return (
      measureWidths.reduce((total, measure) => total + measure.width, 0) +
      Math.max(0, measureWidths.length - 1) * measureGap
    );
  }

  private calculateMeasureLayouts(
    measureWidths: MeasureWidth[],
    availableWidth: number,
    measureHeight: number,
    tuningGutter: number,
  ): MeasureLayout[] {
    const measureRows: MeasureWidth[][] = [];
    let currentRow: MeasureWidth[] = [];
    let currentRowWidth = 0;

    measureWidths.forEach((measure) => {
      const measureWidth = measure.width;
      let widthGap = 0;

      if (currentRowWidth === 0) {
        widthGap = measureWidth;
      } else {
        widthGap = measureWidth + this.config.measureGap;
      }

      if (
        currentRowWidth > 0 &&
        (currentRowWidth + widthGap > availableWidth ||
          (this.config.measuresPerRow !== undefined &&
            currentRow.length >= this.config.measuresPerRow))
      ) {
        measureRows.push(currentRow);
        currentRow = [];
        currentRowWidth = 0;
      }

      currentRow.push(measure);

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

      const extraMeasureWidth =
        Math.max(0, availableWidth - rowWidth) / measureRow.length;

      let x = this.config.paddingX + tuningGutter;
      const y =
        this.config.paddingY + row * (measureHeight + this.config.rowGap);

      return measureRow.map((measure) => {
        const width = measure.width + extraMeasureWidth;

        const measureLayout = {
          ...measure,
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

    const maxMeasureWidth: number = Math.min(
      this.config.maxMeasureWidth,
      availableWidth,
    );
    const minMeasureWidth: number = Math.min(
      this.config.minMeasureWidth,
      maxMeasureWidth,
    );

    const measureWidth: number = clamp(
      this.config.measuresPerRow !== undefined
        ? Math.floor(availableWidth / this.config.measuresPerRow)
        : this.config.defaultMeasureWidth,
      minMeasureWidth,
      maxMeasureWidth,
    );

    const stringSpacing: number = clamp(
      this.config.stringSpacing,
      this.config.minStringSpacing,
      this.config.maxStringSpacing,
    );
    const stringCount: number = this.track.percussion_track
      ? constants.PERCUSSION_LINE_COUNT
      : this.track.strings.length || constants.DEFAULT_STRING_COUNT;

    const bottomPadding = resolveMeasureBottomPadding(
      this.track,
      this.config,
      this.annotations,
    );
    const measureHeight: number =
      constants.MEASURE_TOP_PADDING +
      stringSpacing * (stringCount - 1) +
      bottomPadding;

    const totalMeasureWidths = this.calculateMeasureWidths(
      measures,
      measureWidth,
      availableWidth,
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
      bottomPadding,
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
