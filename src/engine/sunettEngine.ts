import type { Song } from "../types/song";
import type { Track } from "../types/track";
import type {
  Selection,
  SelectionDraftUpdate,
  SelectionEventMap,
  SelectionInput,
  SelectionStore,
  SelectionUpdate,
} from "../types/selection";
import type { TabRendererOptions } from "../types/UI/rendererOptions";
import type { ThemeLike } from "../theme/resolveTheme";
import type { Theme } from "../theme/theme";
import type { SelectionInputOptions } from "./selectionInput";
import { attachSelectionInput } from "./selectionInput";
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
  private detachInput?: () => void;
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
   * Maps a screen point to a song time, for turning a click or drag into a
   * selection time. Pass a pointer event's `clientX`/`clientY`.
   * @param clientX Screen x in CSS pixels.
   * @param clientY Screen y in CSS pixels.
   * @returns The time in ms, or `undefined` if the point is off the tab.
   */
  timeAtPoint(clientX: number, clientY: number): number | undefined {
    return this.renderer?.timeAtPoint(clientX, clientY);
  }

  /**
   * Finds the selection drawn under a screen point, for hit-testing edits.
   * @param clientX Screen x in CSS pixels.
   * @param clientY Screen y in CSS pixels.
   * @returns The selection under the point, or `undefined`.
   */
  selectionAt(clientX: number, clientY: number): Selection | undefined {
    return this.renderer?.selectionAt(clientX, clientY);
  }

  /**
   * Starts an in-progress draft selection, drawn distinctly but not yet
   * committed. Typically called on pointer down.
   * @param startMs The anchored start time in ms.
   * @param endMs The initial end time in ms; defaults to `startMs`.
   */
  beginDraftSelection(startMs: number, endMs = startMs): void {
    this.selections.beginDraft(startMs, endMs);
    this.renderer?.rerender();
  }

  /**
   * Updates the in-progress draft, e.g. as the pointer moves. No-op when there
   * is no draft.
   * @param updates The draft fields to change (typically `endMs`).
   */
  updateDraftSelection(updates: SelectionDraftUpdate): void {
    this.selections.updateDraft(updates);
    this.renderer?.rerender();
  }

  /**
   * Commits the in-progress draft into a real selection, normalising its time
   * range. Typically called on pointer up.
   * @param extras Fields to merge in on commit, e.g. `label` or `color`.
   * @returns The stored selection, or `undefined` if there was no draft.
   */
  commitDraftSelection(extras: SelectionDraftUpdate = {}): Selection | undefined {
    return this.selections.commitDraft(extras);
  }

  /** Discards the in-progress draft without committing it. */
  cancelDraftSelection(): void {
    this.selections.cancelDraft();
    this.renderer?.rerender();
  }

  /** The in-progress draft selection, if any. */
  getDraftSelection(): Selection | undefined {
    return this.selections.getDraftSelection();
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
   * Attaches the built-in pointer interaction to the rendered tab: drag to
   * create a selection, right-click to delete the one under the pointer, and
   * double-click to edit it. Call after `render`. Any previous attachment is
   * replaced, and it is torn down on `dispose`.
   * @param options Interaction configuration (buttons, commit/edit hooks).
   * @returns A function that detaches the interaction.
   */
  enableSelectionInput(options: SelectionInputOptions = {}): () => void {
    this.detachInput?.();
    const svg = this.renderer?.getElement();
    if (!svg) {
      this.detachInput = undefined;
      return () => {};
    }
    this.detachInput = attachSelectionInput(svg, this, options);
    return this.detachInput;
  }

  /**
   * Releases the engine's resources: detaches any pointer interaction, tears
   * down the renderer's `ResizeObserver`, and stops listening for selection
   * changes. Call this when the engine is no longer needed.
   */
  dispose(): void {
    this.detachInput?.();
    this.detachInput = undefined;
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
