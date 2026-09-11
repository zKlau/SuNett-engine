import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Song } from "../../types/song";
import type { Track } from "../../types/track";
import type { MeasureContext } from "../../types/UI/measureContext";
import type {
  TabRendererOptions,
  TabsRendererConfig,
} from "../../types/UI/rendererOptions";
import type { Selection } from "../../types/selection";

import { normalizeOptions } from "./tabsOptionsNormalizer";
import { LayoutCalculation } from "./layoutCalculation";
import { buildSongTimeline } from "../timing/measureTimeline";
import type { CursorGeometry } from "../../playback/cursorGeometry";
import type { SnapMode } from "../timing/snapTime";
import { TabInteraction } from "./tabInteraction";
import { findSvgTarget } from "./svgFrame";
import { TabRenderSession } from "./tabRenderSession";
import { visibleMeasureRange } from "./measureVisibility";
import { shouldReverseStrings } from "./stringOrder";
import { stringTuningLabels } from "./stringTuning";
import type { Theme } from "../../theme/theme";
import type { ThemeLike } from "../../theme/resolveTheme";
import { coerceTheme } from "../../theme/resolveTheme";

export class TabsRenderer {
  private song: Song;
  private currentTheme: Theme;
  private lastRequest?: { trackIndex: number; options: TabRendererOptions };
  private currentSession?: TabRenderSession;
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
   * Replaces the current theme with `theme` and re-renders the last drawn tab.
   * Accepts a preset name, a `ThemeInput`, or a `Theme`. Switching themes fully
   * resets the previous one - no variables carry over. To layer a tweak onto the
   * current theme, merge it in yourself: `setTheme(mergeThemes(getTheme(), tweak))`.
   * Returns the resolved theme. No-ops on the render if nothing has been drawn yet.
   */
  setTheme(theme: ThemeLike): Theme {
    this.currentTheme = coerceTheme(theme);

    if (this.lastRequest) {
      this.generateMeasures(this.lastRequest.trackIndex, {
        ...this.lastRequest.options,
        theme: undefined,
      });
    }

    return this.currentTheme;
  }

  generateMeasures(trackIndex = 0, options: TabRendererOptions = {}) {
    const svg = findSvgTarget(options.target ?? constants.DEFAULT_TARGET);

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

    const timeline = buildSongTimeline(this.song, track);
    this.songDurationMs = timeline.durationMs;

    this.currentSession = new TabRenderSession({
      svg,
      song: this.song,
      track,
      theme: this.currentTheme,
      config,
      measures,
      layoutCalculation: new LayoutCalculation(track, config),
      timeline,
      interaction: this.interaction,
      reverseStrings,
      tuningLabels,
      resolvedTrackIndex,
      activeTrackIndex,
    });

    const cleanup = this.currentSession.start();
    this.rendererCleanups.set(svg, cleanup);

    return cleanup;
  }

  /** Redraws the last rendered tab, e.g. after its selections change. */
  rerender(): void {
    this.currentSession?.rerender();
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
