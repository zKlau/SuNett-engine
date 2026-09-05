import type { CSSProperties } from "react";
import type {
  AutoScrollOptions,
  CursorOptions,
  PlaybackInputOptions,
  PlaybackState,
  Selection,
  SelectionInput,
  SelectionInputOptions,
  SelectionStore,
  Song,
  SunettEngine,
  TabRendererOptions,
  ThemeLike,
} from "@zklau/sunett-engine";

/** Layout options forwarded to the engine's `render`, minus what props already own. */
export type SunettTabRenderOptions = Omit<
  TabRendererOptions,
  "target" | "theme" | "trackIndex"
>;

/**
 * Props for `SunettTab`. Every field except `song` is optional. Changing a prop
 * re-applies it at runtime - a new `theme` re-themes, a new `trackIndex`
 * re-renders, and toggling `selectionInput`, `playbackInput`, or `autoScroll`
 * attaches or detaches that behavior without remounting.
 */
export type SunettTabProps = {
  /** The parsed song to render. Changing it reloads the engine and redraws. */
  song: Song;
  /** Index of the track to draw. Default `0`. Changing it re-renders. */
  trackIndex?: number;
  /** A preset name, `ThemeInput`, or built `Theme`. Re-themes on change. */
  theme?: ThemeLike;
  /** Layout options (spacing, virtualization, notes, …) forwarded to `render`. */
  options?: SunettTabRenderOptions;
  /**
   * Playback cursor artwork/class. Applied once when the engine is created;
   * later changes are ignored.
   */
  cursor?: CursorOptions;
  /**
   * Persistence adapter for selections. Applied once when the engine is created;
   * later changes are ignored.
   */
  selectionStore?: SelectionStore;
  /**
   * Enables drag-to-select pointer input. `true` uses defaults, an options object
   * configures it, and `false`/omitted leaves it off. Toggled at runtime.
   */
  selectionInput?: boolean | SelectionInputOptions;
  /**
   * Enables click-to-seek pointer input. `true` uses defaults, an options object
   * configures it, and `false`/omitted leaves it off. Toggled at runtime.
   */
  playbackInput?: boolean | PlaybackInputOptions;
  /**
   * Follows the playback cursor's row as it plays. `true` uses defaults, an
   * options object configures it, and `false`/omitted leaves it off. Toggled at
   * runtime.
   */
  autoScroll?: boolean | AutoScrollOptions;
  /** Selections added once, right after the song loads. */
  defaultSelections?: SelectionInput[];
  /** Called after the song has loaded and the engine is ready to drive. */
  onReady?: (engine: SunettEngine) => void;
  /** Called whenever the set of selections changes. */
  onSelectionsChanged?: (selections: Selection[]) => void;
  /** Called when a selection is added. */
  onSelectionAdded?: (selection: Selection) => void;
  /** Called when a selection is updated. */
  onSelectionUpdated?: (selection: Selection) => void;
  /** Called when a selection is removed. */
  onSelectionRemoved?: (selection: Selection) => void;
  /** Called on every playback position tick, with the time in milliseconds. */
  onPlaybackPositionChanged?: (positionMs: number) => void;
  /** Called when the transport starts, pauses, or stops. */
  onPlaybackStateChanged?: (state: PlaybackState) => void;
  /** Class applied to the rendered `<svg>`. */
  className?: string;
  /** Inline styles applied to the rendered `<svg>`. */
  style?: CSSProperties;
};

/** The subset of props forwarded to the engine's event subscriptions. */
export type SunettTabCallbacks = Pick<
  SunettTabProps,
  | "onSelectionsChanged"
  | "onSelectionAdded"
  | "onSelectionUpdated"
  | "onSelectionRemoved"
  | "onPlaybackPositionChanged"
  | "onPlaybackStateChanged"
>;
