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
import { isWindow, resolveScrollContainer, viewportSpan } from "./scrollTarget";
import { measureIndicesForRows, visibleRowRange } from "./measureWindow";
import type { MeasureRange } from "./measureWindow";
import type { TabLayout } from "../../types/UI/tabLayout";
import { buildSongTimeline } from "../timing/measureTimeline";
import type { CursorGeometry } from "../../playback/cursorGeometry";
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
import {
  applyTheme,
  clearTheme,
  mergeThemes,
  resolveLabelFontSize,
} from "../../theme/theme";
import type { ThemeLike } from "../../theme/resolveTheme";
import { coerceTheme } from "../../theme/resolveTheme";

export class TabsRenderer {
  private song: Song;
  private currentTheme: Theme;
  private lastRequest?: { trackIndex: number; options: TabRendererOptions };
  private currentRender?: () => void;
  private lastSvg?: SVGSVGElement;
  private songDurationMs = 0;
  private readonly interaction: TabInteraction;
  private readonly rendererCleanups = new WeakMap<SVGSVGElement, () => void>();

  constructor(song: Song, config: TabsRendererConfig = {}) {
    this.song = song;
    this.currentTheme = coerceTheme(config.theme);
    this.interaction = new TabInteraction(config.selections, config.cursor);
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
    this.songDurationMs = timeline.durationMs;

    const virtualize =
      config.virtualize && typeof requestAnimationFrame === "function";
    const scrollContainer = virtualize
      ? resolveScrollContainer(svg, config.scrollContainer)
      : undefined;

    let layout: TabLayout | undefined;
    let pass: RenderPass | undefined;
    let container: SVGGElement | undefined;
    let viewBoxHeight = 0;
    let lastRange: MeasureRange;

    const windowRange = (): MeasureRange => {
      if (!layout) {
        return undefined;
      }
      if (!virtualize || !scrollContainer) {
        return measures.length > 0
          ? { first: 0, last: measures.length - 1 }
          : undefined;
      }
      const rows = visibleRowRange(
        svg.getBoundingClientRect(),
        viewportSpan(scrollContainer),
        layout,
        viewBoxHeight,
        config.overscanRows,
      );
      return measureIndicesForRows(layout, rows);
    };

    const renderWindow = (force: boolean) => {
      if (!layout || !pass || !container) {
        return;
      }
      const range = windowRange();
      if (!force && sameRange(range, lastRange)) {
        return;
      }
      lastRange = range;

      while (container.firstChild) {
        container.firstChild.remove();
      }
      pass.previousMeasureIndex = undefined;
      pass.previousMeasureRow = undefined;
      pass.previousNotes = [];

      if (!range) {
        return;
      }
      for (let index = range.first; index <= range.last; index += 1) {
        renderMeasure(
          container,
          measures[index],
          index,
          pass,
          measures[index + 1],
        );
      }
    };

    const renderFrame = () => {
      const parentWidth = svg.parentElement?.clientWidth ?? svg.clientWidth;
      const svgWidth = parentWidth || config.defaultMeasureWidth;
      layout = layoutCalculation.calculateLayout(svgWidth, measures);

      const rowCount = layout.rowCount;
      const width = layout.contentWidth + config.paddingX * 2;
      const height =
        rowCount * layout.measureHeight +
        (rowCount - 1) * config.rowGap +
        config.paddingY * 2;
      viewBoxHeight = height;

      this.clearSvg(svg);
      this.applyThemeVariables(svg);
      this.renderBackground(svg, width, height);
      this.renderDefaultStyles(svg, config);

      container = createSvgElement("g");
      container.setAttribute("class", "measures");
      svg.append(container);

      pass = {
        song: this.song,
        stringByIndex: this.currentTheme.stringByIndex,
        layout,
        config,
        metrics: resolveNoteMetrics(config.notes, layout.stringSpacing),
        labelFontSize:
          resolveLabelFontSize(this.currentTheme) ??
          constants.BEAT_TEXT_FONT_SIZE,
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

      svg.setAttribute("width", `${width}`);
      svg.setAttribute("height", `${height}`);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("role", "img");

      lastRange = undefined;
      renderWindow(true);

      this.interaction.update({
        svg,
        layout,
        measures,
        timeline,
        trackIndex: activeTrackIndex,
      });
    };

    this.currentRender = renderFrame;

    const frameScheduler = rafScheduler(renderFrame);
    const windowScheduler = rafScheduler(() => renderWindow(false));

    renderFrame();

    const resizeObserver = new ResizeObserver(frameScheduler.schedule);
    resizeObserver.observe(svg.parentElement ?? svg);

    if (virtualize && scrollContainer) {
      scrollContainer.addEventListener("scroll", windowScheduler.schedule, {
        passive: true,
      });
      if (!isWindow(scrollContainer)) {
        window.addEventListener("scroll", windowScheduler.schedule, {
          passive: true,
        });
      }
    }

    const cleanup = () => {
      resizeObserver.disconnect();
      frameScheduler.cancel();
      windowScheduler.cancel();
      if (virtualize && scrollContainer) {
        scrollContainer.removeEventListener("scroll", windowScheduler.schedule);
        if (!isWindow(scrollContainer)) {
          window.removeEventListener("scroll", windowScheduler.schedule);
        }
      }
      clearTheme(svg);
    };
    this.rendererCleanups.set(svg, cleanup);

    return cleanup;
  }

  /** Redraws the last rendered tab, e.g. after its selections change. */
  rerender(): void {
    this.currentRender?.();
  }

  /**
   * Moves the playback cursor to a song time, or removes it when `undefined`.
   * Repositions the overlay in place without a full re-render.
   * @param ms The song time in milliseconds, or `undefined` to hide the cursor.
   */
  setCursor(ms: number | undefined): void {
    this.interaction.setCursor(ms);
  }

  /** Total playing time of the rendered track in ms; `0` before any render. */
  getSongDurationMs(): number {
    return this.songDurationMs;
  }

  /** The cursor's geometry in tab coordinates at its current position. */
  getCursorGeometry(): CursorGeometry | undefined {
    return this.interaction.getCursorGeometry();
  }

  /** The cursor's bounding rect in client space, or `undefined` if not drawn. */
  getCursorRect(): DOMRect | undefined {
    return this.interaction.getCursorRect();
  }

  /**
   * The cursor's client-space position at a song time, the inverse of
   * {@link timeAtPoint}.
   * @param ms The song time in milliseconds.
   * @returns `{ x, y, height }` in CSS pixels, or `undefined` if not rendered.
   */
  pointAtTime(
    ms: number,
  ): { x: number; y: number; height: number } | undefined {
    return this.interaction.pointAtTime(ms);
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
    this.interaction.teardownCursor();
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

type RafScheduler = { schedule: () => void; cancel: () => void };

function rafScheduler(run: () => void): RafScheduler {
  const hasRaf = typeof requestAnimationFrame === "function";
  let handle: number | undefined;

  const schedule = () => {
    if (!hasRaf) {
      run();
      return;
    }
    if (handle !== undefined) {
      return;
    }
    handle = requestAnimationFrame(() => {
      handle = undefined;
      run();
    });
  };

  const cancel = () => {
    if (handle !== undefined && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(handle);
      handle = undefined;
    }
  };

  return { schedule, cancel };
}

function sameRange(a: MeasureRange, b: MeasureRange): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return a.first === b.first && a.last === b.last;
}
