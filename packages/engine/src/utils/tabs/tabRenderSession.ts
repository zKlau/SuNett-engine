import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Song } from "../../types/song";
import type { Track } from "../../types/track";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { NormalizedRendererOptions } from "../../types/UI/normalizedRendererOptions";
import type { RenderPass } from "../../types/UI/renderPass";
import type { TabLayout } from "../../types/UI/tabLayout";
import type { Theme } from "../../theme/theme";
import { resolveLabelFontSize } from "../../theme/theme";
import { applyTheme, clearTheme } from "../../theme/themeDom";
import type { SongTimeline } from "../timing/measureTimeline";
import { LayoutCalculation } from "./layoutCalculation";
import type { MeasureAnnotations } from "./measureVerticalLayout";
import type { TabRendererOptions } from "../../types/UI/rendererOptions";
import { normalizeOptions } from "./tabsOptionsNormalizer";
import type { TabInteraction } from "./tabInteraction";
import type { MeasureRange } from "./measureWindow";
import {
  measureIndicesForRows,
  sameRange,
  visibleRowRange,
} from "./measureWindow";
import { isWindow, resolveScrollContainer, viewportSpan } from "./scrollTarget";
import { rafScheduler } from "./rafScheduler";
import type { RafScheduler } from "./rafScheduler";
import { clearSvg, renderNoteStyles, renderTabBackground } from "./svgFrame";
import { createSvgElement } from "./svg";
import { renderMeasure } from "./measureRenderer";
import { resolveNoteMetrics } from "./noteMetrics";
import { buildLyricsByMeasure } from "./lyricsLayout";

export type TabRenderSessionParams = {
  svg: SVGSVGElement;
  song: Song;
  track: Track;
  theme: Theme;
  config: NormalizedRendererOptions;
  measures: MeasureContext[];
  options: TabRendererOptions;
  layoutAnnotations: MeasureAnnotations;
  timeline: SongTimeline;
  interaction: TabInteraction;
  reverseStrings: boolean;
  stringOffset: number;
  tuningLabels: string[];
  resolvedTrackIndex: number;
  activeTrackIndex: number;
};

export class TabRenderSession {
  private readonly params: TabRenderSessionParams;
  private readonly virtualize: boolean;
  private readonly scrollContainer?: Element | Window;
  private readonly frameScheduler: RafScheduler;
  private readonly windowScheduler: RafScheduler;

  private layout?: TabLayout;
  private pass?: RenderPass;
  private container?: SVGGElement;
  private viewBoxHeight = 0;
  private lastRange: MeasureRange;
  private resizeObserver?: ResizeObserver;

  constructor(params: TabRenderSessionParams) {
    this.params = params;
    this.virtualize =
      params.config.virtualize && typeof requestAnimationFrame === "function";
    this.scrollContainer = this.virtualize
      ? resolveScrollContainer(params.svg, params.config.scrollContainer)
      : undefined;
    this.frameScheduler = rafScheduler(() => this.renderFrame());
    this.windowScheduler = rafScheduler(() => this.renderWindow(false));
  }

  start(): () => void {
    this.renderFrame();

    this.resizeObserver = new ResizeObserver(this.frameScheduler.schedule);
    this.resizeObserver.observe(
      this.params.svg.parentElement ?? this.params.svg,
    );

    if (this.virtualize && this.scrollContainer) {
      this.scrollContainer.addEventListener(
        "scroll",
        this.windowScheduler.schedule,
        { passive: true },
      );
      if (!isWindow(this.scrollContainer)) {
        window.addEventListener("scroll", this.windowScheduler.schedule, {
          passive: true,
        });
      }
    }

    return () => this.stop();
  }

  rerender(): void {
    this.renderFrame();
  }

  private stop(): void {
    this.resizeObserver?.disconnect();
    this.frameScheduler.cancel();
    this.windowScheduler.cancel();

    if (this.virtualize && this.scrollContainer) {
      this.scrollContainer.removeEventListener(
        "scroll",
        this.windowScheduler.schedule,
      );
      if (!isWindow(this.scrollContainer)) {
        window.removeEventListener("scroll", this.windowScheduler.schedule);
      }
    }

    clearTheme(this.params.svg);
  }

  private renderFrame(): void {
    const { svg, measures, options, theme, track, layoutAnnotations } =
      this.params;
    const parentWidth = svg.parentElement?.clientWidth || svg.clientWidth;
    const config = normalizeOptions(
      options,
      theme.sizing,
      parentWidth || undefined,
    );
    this.params.config = config;
    const svgWidth = parentWidth || config.defaultMeasureWidth;
    const layout = new LayoutCalculation(
      track,
      config,
      layoutAnnotations,
    ).calculateLayout(svgWidth, measures);
    this.layout = layout;

    const width = layout.contentWidth + config.paddingX * 2;
    const height =
      layout.rowCount * layout.measureHeight +
      (layout.rowCount - 1) * config.rowGap +
      config.paddingY * 2;
    this.viewBoxHeight = height;

    clearSvg(svg);
    clearTheme(svg);
    applyTheme(this.params.theme, svg);
    renderTabBackground(svg, width, height);
    renderNoteStyles(svg, config);

    this.container = createSvgElement("g");
    this.container.setAttribute("class", "measures");
    svg.append(this.container);

    this.pass = this.buildPass(layout);

    svg.setAttribute("width", `${width}`);
    svg.setAttribute("height", `${height}`);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");

    this.lastRange = undefined;
    this.renderWindow(true);

    this.params.interaction.update({
      svg,
      layout,
      measures,
      timeline: this.params.timeline,
      trackIndex: this.params.activeTrackIndex,
    });
  }

  private renderWindow(force: boolean): void {
    if (!this.layout || !this.pass || !this.container) {
      return;
    }

    const range = this.windowRange();
    if (!force && sameRange(range, this.lastRange)) {
      return;
    }
    this.lastRange = range;

    while (this.container.firstChild) {
      this.container.firstChild.remove();
    }
    this.pass.previousMeasureIndex = undefined;
    this.pass.previousMeasureRow = undefined;
    this.pass.previousNotes = [];

    if (!range) {
      return;
    }
    const { measures } = this.params;
    for (let index = range.first; index <= range.last; index += 1) {
      renderMeasure(
        this.container,
        measures[index],
        index,
        this.pass,
        measures[index + 1],
      );
    }
  }

  private windowRange(): MeasureRange {
    if (!this.layout) {
      return undefined;
    }

    const { measures } = this.params;
    if (!this.virtualize || !this.scrollContainer) {
      return measures.length > 0
        ? { first: 0, last: measures.length - 1 }
        : undefined;
    }

    const rows = visibleRowRange(
      this.params.svg.getBoundingClientRect(),
      viewportSpan(this.scrollContainer),
      this.layout,
      this.viewBoxHeight,
      this.params.config.overscanRows,
    );
    return measureIndicesForRows(this.layout, rows);
  }

  private buildPass(layout: TabLayout): RenderPass {
    const { song, track, theme, config, measures, resolvedTrackIndex } =
      this.params;
    return {
      song,
      stringByIndex: theme.stringByIndex,
      layout,
      config,
      metrics: resolveNoteMetrics(config.notes, layout.stringSpacing),
      labelFontSize:
        resolveLabelFontSize(theme) ?? constants.BEAT_TEXT_FONT_SIZE,
      totalMeasures: measures.length,
      reverseStrings: this.params.reverseStrings,
      stringOffset: this.params.stringOffset,
      tuningLabels: this.params.tuningLabels,
      lyricsByMeasure: buildLyricsByMeasure(song, track, resolvedTrackIndex),
      previousNotes: [],
    };
  }
}
