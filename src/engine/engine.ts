import type { Song } from "../types/song";
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

export type EngineConfig = {
  theme?: ThemeLike;
  selectionStore?: SelectionStore;
};

/**
 * The public entry point for rendering a song and managing its selections.
 * Selections are held in memory, scoped to the loaded song, and drawn as
 * overlay regions on the tab.
 */
export class Engine {
  private readonly selections = new SelectionManager();
  private readonly store?: SelectionStore;
  private readonly theme?: ThemeLike;
  private renderer?: TabsRenderer;
  private cleanup?: () => void;
  private loading = false;

  constructor(config: EngineConfig = {}) {
    this.theme = config.theme;
    this.store = config.selectionStore;
    this.selections.on("selectionsChanged", (selections) =>
      this.onSelectionsChanged(selections),
    );
  }

  /**
   * Loads a song: builds a renderer for it, clears any prior selections, and,
   * when a `selectionStore` is configured, restores persisted selections.
   * @param song The parsed song to render selections against.
   */
  async loadSong(song: Song): Promise<void> {
    this.cleanup?.();
    this.cleanup = undefined;
    this.renderer = new TabsRenderer(song, {
      theme: this.theme,
      selections: this.selections,
    });

    const songId = computeSongHash(song);
    this.loading = true;
    this.selections.reset(songId, []);
    if (this.store) {
      const restored = await this.store.load(songId);
      this.selections.reset(songId, restored);
    }
    this.loading = false;
  }

  /**
   * Draws the loaded song into its target `<svg>`. Selection changes redraw
   * automatically afterwards.
   * @param trackIndex Index of the track to render.
   * @param options Renderer options forwarded to `TabsRenderer`.
   */
  render(trackIndex = 0, options: TabRendererOptions = {}): void {
    this.cleanup = this.renderer?.generateMeasures(trackIndex, options);
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

  /** The id of the currently loaded song, or an empty string if none. */
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

  private onSelectionsChanged(selections: Selection[]): void {
    this.renderer?.rerender();
    if (this.store && !this.loading) {
      void this.store.save(this.selections.getSongId(), selections);
    }
  }
}
