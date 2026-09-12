import type { Selection } from "../types/selection";

export function isSelectionVisible(
  selection: Selection,
  activeTrackIndex: number,
): boolean {
  const scope = selection.trackIndex;
  return scope === null || scope === undefined || scope === activeTrackIndex;
}

export function visibleSelections(
  selections: Selection[],
  activeTrackIndex: number,
): Selection[] {
  return selections.filter((selection) =>
    isSelectionVisible(selection, activeTrackIndex),
  );
}
