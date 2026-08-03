import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Song } from "../../types/song";
import type { Track } from "../../types/track";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { RenderPass } from "../../types/UI/renderPass";
import type {
  TabRendererOptions,
  TabsRendererConfig,
} from "../../types/UI/rendererOptions";
import type { Selection } from "../../types/selection";

import { normalizeOptions } from "./tabsOptionsNormalizer";
import { LayoutCalculation } from "./layoutCalculation";
import { buildSongTimeline } from "../timing/measureTimeline";
import type { SnapMode } from "../timing/snapTime";
import { TabInteraction } from "./tabInteraction";
import { renderMeasure } from "./measureRenderer";
import { createSvgElement } from "./svg";
import { buildLyricsByMeasure } from "./lyricsLayout";
import { resolveNoteMetrics } from "./noteMetrics";
import { buildNoteStyles } from "./notesStyles";
import { visibleMeasureRange } from "./measureVisibility";
import { shouldReverseStrings } from "./stringOrder";
import { stringTuningLabels } from "./stringTuning";
import { ThemeVariables, themeVar } from "../../theme/variables";
import type { Theme } from "../../theme/theme";
import { applyTheme, clearTheme, mergeThemes } from "../../theme/theme";
import type { ThemeLike } from "../../theme/resolveTheme";
import { coerceTheme } from "../../theme/resolveTheme";

export class TabsRenderer {
  private song: Song;
  private currentTheme: Theme;
  private lastRequest?: { trackIndex: number; options: TabRendererOptions };
  private currentRender?: () => void;
  private lastSvg?: SVGSVGElement;
  private readonly interaction: TabInteraction;
  private readonly rendererCleanups = new WeakMap<SVGSVGElement, () => void>();

  constructor(song: Song, config: TabsRendererConfig = {}) {
    this.song = song;
    this.currentTheme = coerceTheme(config.theme);
    this.interaction = new TabInteraction(config.selections);
  }

  getTracks(): Track[] {
    return this.song.tracks;
  }

  /** The renderer's current resolved theme. */
  getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Merges `theme` into the current theme and re-renders the last drawn tab.
   * Accepts a preset name, a `ThemeInput`, or a `Theme`. Returns the merged
   * theme. No-ops on the render if nothing has been drawn yet.
   */
  setTheme(theme: ThemeLike): Theme {
    this.currentTheme = mergeThemes(this.currentTheme, coerceTheme(theme));

    if (this.lastRequest) {
      this.generateMeasures(this.lastRequest.trackIndex, {
        ...this.lastRequest.options,
        theme: undefined,
      });
    }

    return this.currentTheme;
  }

  generateMeasures(trackIndex = 0, options: TabRendererOptions = {}) {
    const svg = this.findSvgElement(options.target ?? constants.DEFAULT_TARGET);

    if (!svg) {
      return;
    }

    this.rendererCleanups.get(svg)?.();
    this.lastSvg = svg;

    if (options.theme !== undefined) {
      this.currentTheme = coerceTheme(options.theme);
    }
    this.lastRequest = { trackIndex, options };

    const config = normalizeOptions(options, this.currentTheme.sizing);
    const resolvedTrackIndex = options.trackIndex ?? trackIndex;
    const track = this.song.tracks[resolvedTrackIndex] ?? this.song.tracks[0];

    if (!track) {
      return;
    }

    const activeTrackIndex = this.song.tracks[resolvedTrackIndex]
      ? resolvedTrackIndex
      : 0;

    const allMeasures = this.getMeasureContexts(track);
    const measures = config.hideEmptyMeasures
      ? visibleMeasureRange(allMeasures)
      : allMeasures;
    const reverseStrings = shouldReverseStrings(track);
    const tuningLabels = config.showTuning ? stringTuningLabels(track) : [];
    if (reverseStrings) {
      tuningLabels.reverse();
    }

    const layoutCalculation = new LayoutCalculation(track, config);
    const timeline = buildSongTimeline(this.song, track);
    const render = () => {
      const parentWidth = svg.parentElement?.clientWidth ?? svg.clientWidth;
      const svgWidth = parentWidth || config.defaultMeasureWidth;
      const layout = layoutCalculation.calculateLayout(svgWidth, measures);

      const rowCount = layout.rowCount;
      const width = layout.contentWidth + config.paddingX * 2;
      const height =
        rowCount * layout.measureHeight +
        (rowCount - 1) * config.rowGap +
        config.paddingY * 2;

      this.clearSvg(svg);
      this.applyThemeVariables(svg);
      this.renderBackground(svg, width, height);
      this.renderDefaultStyles(svg, config);

      const pass: RenderPass = {
        song: this.song,
        stringByIndex: this.currentTheme.stringByIndex,
        layout,
        config,
        metrics: resolveNoteMetrics(config.notes, layout.stringSpacing),
        totalMeasures: measures.length,
        reverseStrings,
        tuningLabels,
        lyricsByMeasure: buildLyricsByMeasure(
          this.song,
          track,
          resolvedTrackIndex,
        ),
        previousNotes: [],
      };

      measures.forEach((measureContext, index) => {
        renderMeasure(svg, measureContext, index, pass, measures[index + 1]);
      });

      this.interaction.update({
        svg,
        layout,
        measures,
        timeline,
        trackIndex: activeTrackIndex,
      });

      svg.setAttribute("width", `${width}`);
      svg.setAttribute("height", `${height}`);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("role", "img");
    };

    this.currentRender = render;
    render();

    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(svg.parentElement ?? svg);

    const cleanup = () => {
      resizeObserver.disconnect();
      clearTheme(svg);
    };
    this.rendererCleanups.set(svg, cleanup);

    return cleanup;
  }

  /** Redraws the last rendered tab, e.g. after its selections change. */
  rerender(): void {
    this.currentRender?.();
  }

  /** The `<svg>` of the last render, or `undefined` before the first render. */
  getElement(): SVGSVGElement | undefined {
    return this.lastSvg;
  }

  /** Index of the track drawn by the last render. */
  getActiveTrackIndex(): number {
    return this.interaction.getActiveTrackIndex();
  }

  /**
   * Quantises a time in ms to the beat or measure grid of the rendered song.
   * @param ms The time to snap.
   * @param mode `"Beat"`, `"Measure"`, or `"None"` (returns `ms` unchanged).
   * @returns The snapped time, or `ms` if nothing has been rendered yet.
   */
  snapTime(ms: number, mode: SnapMode): number {
    return this.interaction.snapTime(ms, mode);
  }

  /**
   * The song time, in milliseconds, at a screen point. Use with a pointer
   * event's `clientX`/`clientY` to map a click or drag to a selection time.
   * @param clientX Screen x in CSS pixels.
   * @param clientY Screen y in CSS pixels.
   * @returns The time in ms, or `undefined` if the point is off the tab.
   */
  timeAtPoint(clientX: number, clientY: number): number | undefined {
    return this.interaction.timeAtPoint(clientX, clientY);
  }

  /**
   * The selection drawn under a screen point, if any (topmost wins).
   * @param clientX Screen x in CSS pixels.
   * @param clientY Screen y in CSS pixels.
   * @returns The selection under the point, or `undefined`.
   */
  selectionAt(clientX: number, clientY: number): Selection | undefined {
    return this.interaction.selectionAt(clientX, clientY);
  }

  /**
   * Tears down the last render: disconnects its `ResizeObserver` and clears the
   * theme variables scoped to the target `<svg>`.
   */
  dispose(): void {
    if (this.lastSvg) {
      this.rendererCleanups.get(this.lastSvg)?.();
      this.rendererCleanups.delete(this.lastSvg);
    }
  }

  private applyThemeVariables(svg: SVGSVGElement) {
    clearTheme(svg);
    applyTheme(this.currentTheme, svg);
  }

  private renderBackground(svg: SVGSVGElement, width: number, height: number) {
    const rect = createSvgElement("rect");
    rect.setAttribute("class", "tab-background");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", `${width}`);
    rect.setAttribute("height", `${height}`);
    rect.setAttribute("fill", themeVar(ThemeVariables.COLOR_BG));
    svg.append(rect);
  }

  private renderDefaultStyles(
    svg: SVGSVGElement,
    config: RenderPass["config"],
  ) {
    if (!config.notes.defaultStyles) {
      return;
    }

    const style = createSvgElement("style");
    style.textContent = buildNoteStyles(config.notes.classPrefix);
    svg.append(style);
  }

  private clearSvg(svg: SVGSVGElement) {
    while (svg.firstChild) {
      svg.firstChild.remove();
    }
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
}
