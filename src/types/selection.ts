export type Selection = {
  id: string;
  songId: string;
  startMs: number;
  endMs: number;
  label?: string;
  color?: string;
};

export type SelectionInput = Omit<Selection, "id" | "songId">;

export type SelectionUpdate = Partial<Omit<Selection, "id" | "songId">>;

export type SelectionStore = {
  load(songId: string): Promise<Selection[]>;
  save(songId: string, selections: Selection[]): Promise<void>;
};

export type SelectionEventMap = {
  selectionAdded: Selection;
  selectionUpdated: Selection;
  selectionRemoved: Selection;
  selectionsChanged: Selection[];
};

export type SelectionSource = {
  getSelections(): Selection[];
};
