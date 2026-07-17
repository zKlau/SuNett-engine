import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Song } from "../../types/song";
import type { Track } from "../../types/track";
import type { MeasureBounds } from "../../types/UI/measureBounds";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { TabRendererOptions } from "../../types/UI/rendererOptions";
import type { TabLayout } from "../../types/UI/tabLayout";

import { clamp } from "../functions/clamp";
import { normalizeOptions } from "./tabsOptionsNormalizer";
import { LayoutCalculation } from "./layoutCalculation";
import { calculateBeatLayouts } from "./notesLayout";
import { renderMeasureNotes } from "./notesRenderer";

type RepeatLine = {
  className: string;
  x: number;
  top: number;
  bottom: number;
  width: number;
};

type RendererConfig = ReturnType<typeof normalizeOptions>;

type RenderPass = {
  layout: TabLayout;
  config: RendererConfig;
  totalMeasures: number;
};

export class TabsRenderer {
  private static readonly SVG_NAMESPACE = "http://www.w3.org/2000/svg" as const;

  private song: Song;
  private readonly rendererCleanups = new WeakMap<SVGSVGElement, () => void>();

  constructor(song: Song) {
    this.song = song;
  }

  getTracks(): Track[] {
    return this.song.tracks;
  }

  generateMeasures(trackIndex = 0, options: TabRendererOptions = {}) {
    const svg = this.findSvgElement(options.target ?? constants.DEFAULT_TARGET);

    if (!svg) {
      return;
    }

    this.rendererCleanups.get(svg)?.();

    const config = normalizeOptions(options);
    const resolvedTrackIndex = options.trackIndex ?? trackIndex;
    const track = this.song.tracks[resolvedTrackIndex] ?? this.song.tracks[0];

    if (!track) {
      return;
    }

    const measures = this.getMeasureContexts(track);
    const layoutCalculation = new LayoutCalculation(track, config);
    const render = () => {
      const parentWidth = svg.parentElement?.clientWidth ?? svg.clientWidth;
      const svgWidth = parentWidth || config.defaultMeasureWidth;
      const layout = layoutCalculation.calculateLayout(svgWidth, measures);

      this.clearSvg(svg);

      const pass: RenderPass = {
        layout,
        config,
        totalMeasures: measures.length,
      };

      measures.forEach((measureContext, index) => {
        this.renderMeasure(svg, measureContext, index, pass);
      });

      const rowCount = layout.rowCount;
      const width = layout.contentWidth + config.paddingX * 2;
      const height =
        rowCount * layout.measureHeight +
        (rowCount - 1) * config.rowGap +
        config.paddingY * 2;

      svg.setAttribute("width", `${width}`);
      svg.setAttribute("height", `${height}`);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("role", "img");
    };

    render();

    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(svg.parentElement ?? svg);

    const cleanup = () => resizeObserver.disconnect();
    this.rendererCleanups.set(svg, cleanup);

    return cleanup;
  }

  private findSvgElement(target: string | SVGSVGElement) {
    if (typeof document === "undefined") {
      return;
    }

    const element =
      typeof target === "string" ? document.querySelector(target) : target;
    return element instanceof SVGSVGElement ? element : undefined;
  }

  private getMeasureContexts(track: Track): MeasureContext[] {
    return track.measures.map((measure, index) => ({
      measure,
      header:
        this.song.measure_headers[index] ??
        this.song.measure_headers[measure.header_index],
      index,
    }));
  }

  private renderMeasure(
    svg: SVGSVGElement,
    measureContext: MeasureContext,
    index: number,
    pass: RenderPass,
  ) {
    const { layout, config, totalMeasures } = pass;
    const measureLayout = layout.measureLayouts[index];

    if (!measureLayout) {
      return;
    }

    const previousLayout = layout.measureLayouts[index - 1];
    const isRowStart =
      !previousLayout || previousLayout.row !== measureLayout.row;
    const isLastMeasure = index === totalMeasures - 1;

    const { x, y, width } = measureLayout;
    const measureGroup = this.createSvgElement("g");
    const stringsGroup = this.createSvgElement("g");
    const barlinesGroup = this.createSvgElement("g");
    const notesGroup = this.createSvgElement("g");
    const labelsGroup = this.createSvgElement("g");

    measureGroup.setAttribute("class", "measure");
    measureGroup.setAttribute("measure-index", `${measureContext.index}`);
    measureGroup.setAttribute(
      "measure-number",
      `${measureContext.measure.number}`,
    );
    measureGroup.setAttribute("x", `${x}`);
    measureGroup.setAttribute("y", `${y}`);

    stringsGroup.setAttribute("class", "measure-strings");
    barlinesGroup.setAttribute("class", "measure-barlines");
    notesGroup.setAttribute("class", "measure-notes");
    labelsGroup.setAttribute("class", "measure-labels");

    const bounds: MeasureBounds = {
      x,
      y,
      width,
      height: layout.measureHeight,
      stringSpacing: layout.stringSpacing,
      isLastMeasure,
    };

    this.renderMeasureIndex(labelsGroup, measureContext, x, y);
    this.renderStringLines(stringsGroup, bounds, layout.stringCount);
    this.renderRepeatLines(barlinesGroup, measureContext, bounds, isRowStart);
    this.renderNotes(notesGroup, measureContext, bounds, layout, config);

    measureGroup.append(stringsGroup, barlinesGroup, notesGroup, labelsGroup);
    svg.append(measureGroup);
  }

  private renderNotes(
    parent: SVGGElement,
    measureContext: MeasureContext,
    bounds: MeasureBounds,
    layout: TabLayout,
    config: RendererConfig,
  ) {
    const startPadding = Math.min(
      constants.MEASURE_CONTENT_PADDING_START,
      bounds.width / 3,
    );
    const endPadding = Math.min(
      constants.MEASURE_CONTENT_PADDING_END,
      bounds.width / 3,
    );
    const contentWidth = Math.max(0, bounds.width - startPadding - endPadding);

    const beatLayouts = calculateBeatLayouts(
      measureContext.measure,
      bounds.x + startPadding,
      contentWidth,
    );

    renderMeasureNotes({
      parent,
      measure: measureContext.measure,
      measureIndex: measureContext.index,
      beatLayouts,
      bounds,
      stringCount: layout.stringCount,
      invertStrings: config.invertStrings,
      config: config.notes,
    });
  }

  private renderMeasureIndex(
    parent: SVGGElement,
    measureContext: MeasureContext,
    measureX: number,
    measureY: number,
  ) {
    const measureIndex = this.createSvgElement("text");

    measureIndex.setAttribute("class", "measure-index");
    measureIndex.setAttribute("x", `${measureX}`);
    measureIndex.setAttribute(
      "y",
      `${measureY + constants.MEASURE_TOP_PADDING - constants.MEASURE_INDEX_OFFSET}`,
    );
    measureIndex.textContent = `${measureContext.index + 1}`;

    parent.append(measureIndex);
  }

  private renderStringLines(
    parent: SVGGElement,
    bounds: MeasureBounds,
    stringCount: number,
  ) {
    for (let stringIndex = 0; stringIndex < stringCount; stringIndex += 1) {
      const stringPath = this.createSvgElement("path");
      const y =
        bounds.y +
        constants.MEASURE_TOP_PADDING +
        stringIndex * bounds.stringSpacing;

      stringPath.setAttribute("class", "string");
      stringPath.setAttribute("string-index", `${stringIndex}`);
      stringPath.setAttribute(
        "d",
        `M ${bounds.x} ${y} H ${bounds.x + bounds.width}`,
      );

      parent.append(stringPath);
    }
  }

  private renderRepeatLines(
    parent: SVGGElement,
    measureContext: MeasureContext,
    bounds: MeasureBounds,
    isRowStart: boolean,
  ) {
    const top = bounds.y + constants.MEASURE_TOP_PADDING;
    const bottom = bounds.y + bounds.height - constants.MEASURE_BOTTOM_PADDING;
    const leftX = bounds.x;
    const rightX = bounds.x + bounds.width;

    const header = measureContext.header;
    const repeatCount = Math.max(0, header?.repeat_close ?? 0);
    const openRepeat = header?.repeat_open ?? false;
    const closeRepeat = repeatCount > 0;
    const doubleBar = Boolean(
      header?.double_bar || measureContext.measure.has_double_bar,
    );
    const finalBar = bounds.isLastMeasure && !closeRepeat;

    if (isRowStart) {
      this.appendRepeatLine(
        parent,
        this.measureBar("barline-start", leftX, top, bottom),
      );
    }

    if (openRepeat) {
      this.appendRepeatLine(
        parent,
        this.repeatLine(
          "barline-repeat-open",
          leftX + constants.REPEAT_BAR_GAP,
          top,
          bottom,
        ),
      );
      this.appendRepeatDots(
        parent,
        leftX + constants.REPEAT_DOT_OFFSET,
        top,
        bottom,
        bounds.stringSpacing,
      );
    }

    const rightEdge =
      finalBar || closeRepeat
        ? this.repeatLine("barline-end", rightX, top, bottom)
        : this.measureBar("barline-end", rightX, top, bottom);
    this.appendRepeatLine(parent, rightEdge);

    if (finalBar || doubleBar || closeRepeat) {
      this.appendRepeatLine(
        parent,
        this.measureBar(
          "barline-inner",
          rightX - constants.REPEAT_BAR_GAP,
          top,
          bottom,
        ),
      );
    }

    if (closeRepeat) {
      this.appendRepeatDots(
        parent,
        rightX - constants.REPEAT_DOT_OFFSET,
        top,
        bottom,
        bounds.stringSpacing,
      );

      if (repeatCount > 1) {
        this.appendRepeatCount(parent, repeatCount, rightX, top);
      }
    }
  }

  private measureBar(
    modifier: string,
    x: number,
    top: number,
    bottom: number,
  ): RepeatLine {
    return {
      className: `barline ${modifier}`,
      x,
      top,
      bottom,
      width: constants.MEASURE_BAR_WIDTH,
    };
  }

  private repeatLine(
    modifier: string,
    x: number,
    top: number,
    bottom: number,
  ): RepeatLine {
    return {
      className: `barline ${modifier}`,
      x,
      top,
      bottom,
      width: constants.REPEAT_LINE_WIDTH,
    };
  }

  private appendRepeatLine(parent: SVGGElement, line: RepeatLine) {
    const path = this.createSvgElement("path");

    path.setAttribute("class", line.className);
    path.setAttribute("stroke-width", `${line.width}`);
    path.setAttribute("d", `M ${line.x} ${line.top} V ${line.bottom}`);

    parent.append(path);
  }

  private appendRepeatDots(
    parent: SVGGElement,
    x: number,
    top: number,
    bottom: number,
    stringSpacing: number,
  ) {
    const radius = constants.REPEAT_DOT_RADIUS;
    const maxOffset = Math.max(0.5, (bottom - top) / stringSpacing - 0.5);
    const dotOffsets = [clamp(1.5, 0.5, maxOffset), clamp(3.5, 0.5, maxOffset)];
    const dotYs = Array.from(new Set(dotOffsets)).map(
      (offset) => top + stringSpacing * offset,
    );

    for (const cy of dotYs) {
      const dot = this.createSvgElement("path");

      dot.setAttribute("class", "repeat-dot");
      dot.setAttribute(
        "d",
        [
          `M ${x - radius} ${cy}`,
          `a ${radius} ${radius} 0 1 0 ${radius * 2} 0`,
          `a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`,
          "Z",
        ].join(" "),
      );

      parent.append(dot);
    }
  }

  private appendRepeatCount(
    parent: SVGGElement,
    repeatCount: number,
    measureEndX: number,
    firstStringY: number,
  ) {
    const repeatCountText = this.createSvgElement("text");

    repeatCountText.setAttribute("class", "repeat-count");
    repeatCountText.setAttribute(
      "x",
      `${measureEndX - constants.REPEAT_DOT_OFFSET - 4}`,
    );
    repeatCountText.setAttribute(
      "y",
      `${firstStringY - constants.MEASURE_INDEX_OFFSET}`,
    );
    repeatCountText.setAttribute("text-anchor", "end");
    repeatCountText.textContent = `x${repeatCount}`;

    parent.append(repeatCountText);
  }

  private clearSvg(svg: SVGSVGElement) {
    while (svg.firstChild) {
      svg.firstChild.remove();
    }
  }

  private createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K) {
    return document.createElementNS(TabsRenderer.SVG_NAMESPACE, tagName);
  }
}
