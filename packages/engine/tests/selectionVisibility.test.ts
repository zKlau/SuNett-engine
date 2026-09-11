import {
  isSelectionVisible,
  visibleSelections,
} from "../src/selection/selectionVisibility";
import type { Selection } from "../src/types/selection";

function make(trackIndex?: number | null): Selection {
  return { id: "s", songId: "song", startMs: 0, endMs: 100, trackIndex };
}

describe("isSelectionVisible", () => {
  it("shows a selection scoped to the active track", () => {
    expect(isSelectionVisible(make(2), 2)).toBe(true);
  });

  it("hides a selection scoped to another track", () => {
    expect(isSelectionVisible(make(2), 0)).toBe(false);
  });

  it("shows a null-scoped selection on every track", () => {
    expect(isSelectionVisible(make(null), 0)).toBe(true);
    expect(isSelectionVisible(make(null), 5)).toBe(true);
  });

  it("treats an omitted track as all tracks", () => {
    expect(isSelectionVisible(make(undefined), 3)).toBe(true);
  });
});

describe("visibleSelections", () => {
  it("keeps global and active-track selections only", () => {
    const selections = [make(0), make(1), make(null), make(undefined)];

    const visible = visibleSelections(selections, 1);

    expect(visible).toEqual([selections[1], selections[2], selections[3]]);
  });
});
