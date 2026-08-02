/** A labelled, colored time range marked on the tab for the current song. */
export type Selection = {
  /** Unique id, generated when the selection is added. */
  id: string;
  /** Hash of the song the selection belongs to. */
  songId: string;
  /** Range start, in milliseconds from the song's beginning. */
  startMs: number;
  /** Range end, in milliseconds from the song's beginning. */
  endMs: number;
  /** Optional plain-text label drawn above the region. */
  label?: string;
  /** Optional CSS color; falls back to the theme selection color. */
  color?: string;
};

/** The fields a caller supplies when adding a selection. */
export type SelectionInput = Omit<Selection, "id" | "songId">;

/** The mutable fields accepted when updating a selection. */
export type SelectionUpdate = Partial<Omit<Selection, "id" | "songId">>;

/** The fields accepted when updating the in-progress draft selection. */
export type SelectionDraftUpdate = Partial<SelectionInput>;

/** Adapter that persists and restores a song's selections. */
export type SelectionStore = {
  /**
   * Loads the selections previously saved for a song.
   * @param songId The song whose selections to load.
   * @returns The stored selections, or an empty array if none.
   */
  load(songId: string): Promise<Selection[]>;
  /**
   * Persists the selections for a song. Called fire-and-forget on change.
   * @param songId The song the selections belong to.
   * @param selections The selections to persist.
   */
  save(songId: string, selections: Selection[]): Promise<void>;
};

/** Payloads emitted for each selection lifecycle event. */
export type SelectionEventMap = {
  selectionAdded: Selection;
  selectionUpdated: Selection;
  selectionRemoved: Selection;
  selectionsChanged: Selection[];
};

/** Supplies the selections a renderer draws as overlay regions. */
export type SelectionSource = {
  getSelections(): Selection[];
  /** The in-progress draft selection, drawn distinctly, if any. */
  getDraftSelection?(): Selection | undefined;
};
