import type { Song } from "../types/song";
import type { Track } from "../types/track";
import type {
  Selection,
  SelectionEventMap,
  SelectionInput,
  SelectionStore,
  SelectionUpdate,
} from "../types/selection";
import type { TabRendererOptions } from "../types/UI/rendererOptions";
import type { ThemeLike } from "../theme/resolveTheme";
import type { Theme } from "../theme/theme";
import { SelectionManager } from "../selection/selectionManager";
import { TabsRenderer } from "../utils/tabs/tabsRenderer";
import { computeSongHash } from "../utils/song/songHash";

export type SunettEngineConfig = {
  /** Initial theme: a preset name, a `ThemeInput`, or a built `Theme`. */
  theme?: ThemeLike;
  /** Adapter used to persist and restore selections across sessions. */
  selectionStore?: SelectionStore;
};

/**
 * The primary entry point of the package: load a song, render it as a tab, and
 * manage the selections drawn over it. Prefer this over `TabsRenderer` — it
 * covers the same rendering surface and adds song lifecycle, selection state,
 * events, and optional persistence.
 */
export class SunettEngine {
  private readonly selections = new SelectionManager();
  private readonly store?: SelectionStore;
  private readonly theme?: ThemeLike;
  private readonly unsubscribe: () => void;
  private song?: Song;
  private renderer?: TabsRenderer;
  private loadGeneration = 0;
  private loading = false;

  constructor(config: SunettEngineConfig = {}) {
    this.theme = config.theme;
    this.store = config.selectionStore;
    this.unsubscribe = this.selections.on("selectionsChanged", (selections) =>
      this.onSelectionsChanged(selections),
    );
  }

  /**
   * Loads a song: builds a renderer for it, clears any prior selections, and,
   * when a `selectionStore` is configured, restores persisted selections. A
   * later `loadSong` supersedes an in-flight one, so its restored selections
   * are discarded.
   * @param song The parsed song to render and manage selections for.
   */
  async loadSong(song: Song): Promise<void> {
    const generation = ++this.loadGeneration;
    this.renderer?.dispose();
    this.song = song;
    this.renderer = new TabsRenderer(song, {
      theme: this.theme,
      selections: this.selections,
    });

    const songId = computeSongHash(song);
    if (!this.store) {
      this.selections.reset(songId, []);
      return;
    }

    this.loading = true;
    try {
      this.selections.reset(songId, []);
      const restored = await this.store.load(songId);
      if (generation !== this.loadGeneration) {
        return;
      }
      this.selections.reset(songId, restored);
    } finally {
      if (generation === this.loadGeneration) {
        this.loading = false;
      }
    }
  }

  /**
   * Draws the loaded song into its target `<svg>`. Selection changes redraw
   * automatically afterwards.
   * @param trackIndex Index of the track to render.
   * @param options Renderer options forwarded to `TabsRenderer`.
   */
  render(trackIndex = 0, options: TabRendererOptions = {}): void {
    this.renderer?.generateMeasures(trackIndex, options);
  }

  /** Redraws the current tab without recomputing the song setup. */
  rerender(): void {
    this.renderer?.rerender();
  }

  /** The currently loaded song, or `undefined` before the first `loadSong`. */
  getSong(): Song | undefined {
    return this.song;
  }

  /** The tracks of the loaded song, or an empty array if none is loaded. */
  getTracks(): Track[] {
    return this.renderer?.getTracks() ?? [];
  }

  /** The id (hash) of the loaded song, or an empty string if none. */
  getSongId(): string {
    return this.selections.getSongId();
  }

  /**
   * Merges a theme into the renderer and redraws.
   * @param theme A preset name, `ThemeInput`, or built `Theme`.
   * @returns The merged theme, or `undefined` if no song is loaded.
   */
  setTheme(theme: ThemeLike): Theme | undefined {
    return this.renderer?.setTheme(theme);
  }

  /** The renderer's current resolved theme, or `undefined` if none is loaded. */
  getTheme(): Theme | undefined {
    return this.renderer?.getTheme();
  }

  /**
   * Adds a selection to the current song.
   * @param selection The selection without `id`/`songId`, which are generated.
   * @returns The stored selection with `id` and `songId` filled in.
   */
  addSelection(selection: SelectionInput): Selection {
    return this.selections.add(selection);
  }

  /**
   * Updates an existing selection in place.
   * @param id The id of the selection to update.
   * @param updates The fields to change; `id` and `songId` are ignored.
   */
  updateSelection(id: string, updates: SelectionUpdate): void {
    this.selections.update(id, updates);
  }

  /**
   * Removes a selection from the current song.
   * @param id The id of the selection to remove.
   */
  removeSelection(id: string): void {
    this.selections.remove(id);
  }

  /**
   * Lists the selections held for the current song.
   * @returns A copy of the current selections.
   */
  getSelections(): Selection[] {
    return this.selections.getSelections();
  }

  /**
   * Replaces every selection for the current song, e.g. when loading a saved
   * set.
   * @param selections The selections to store; each is scoped to the current
   * song.
   */
  setSelections(selections: Selection[]): void {
    this.selections.setSelections(selections);
  }

  /**
   * Subscribes to a selection lifecycle event.
   * @param event The event name to listen for.
   * @param listener Handler invoked with the event payload.
   * @returns A function that removes the listener.
   */
  on<Key extends keyof SelectionEventMap>(
    event: Key,
    listener: (payload: SelectionEventMap[Key]) => void,
  ): () => void {
    return this.selections.on(event, listener);
  }

  /**
   * Removes a previously registered selection event listener.
   * @param event The event name the listener was registered for.
   * @param listener The handler to remove.
   */
  off<Key extends keyof SelectionEventMap>(
    event: Key,
    listener: (payload: SelectionEventMap[Key]) => void,
  ): void {
    this.selections.off(event, listener);
  }

  /**
   * The underlying `TabsRenderer`, for advanced rendering not surfaced here.
   * @returns The renderer, or `undefined` before the first `loadSong`.
   */
  getRenderer(): TabsRenderer | undefined {
    return this.renderer;
  }

  /**
   * Releases the engine's resources: tears down the renderer's
   * `ResizeObserver` and stops listening for selection changes. Call this when
   * the engine is no longer needed.
   */
  dispose(): void {
    this.renderer?.dispose();
    this.renderer = undefined;
    this.unsubscribe();
  }

  private onSelectionsChanged(selections: Selection[]): void {
    this.renderer?.rerender();
    if (this.store && !this.loading) {
      void this.store.save(this.selections.getSongId(), selections);
    }
  }
}
