import { Engine } from "../src/engine/engine";
import type { Selection, SelectionStore } from "../src/types/selection";
import { makeMeasure, makeSong, makeTrack } from "./fixtures";

function song(name: string) {
  return makeSong([makeTrack(6, [makeMeasure(1)])], name);
}

describe("Engine selections", () => {
  it("fills in id and songId when adding a selection", async () => {
    const engine = new Engine();
    await engine.loadSong(song("A"));

    const selection = engine.addSelection({ startMs: 0, endMs: 1000 });

    expect(selection.id).toEqual(expect.any(String));
    expect(selection.songId).toBe(engine.getSongId());
    expect(engine.getSelections()).toEqual([selection]);
  });

  it("fires the lifecycle events for each operation", async () => {
    const engine = new Engine();
    await engine.loadSong(song("A"));
    const added = jest.fn();
    const updated = jest.fn();
    const removed = jest.fn();
    const changed = jest.fn();
    engine.on("selectionAdded", added);
    engine.on("selectionUpdated", updated);
    engine.on("selectionRemoved", removed);
    engine.on("selectionsChanged", changed);

    const selection = engine.addSelection({ startMs: 0, endMs: 1000 });
    engine.updateSelection(selection.id, { label: "chorus" });
    engine.removeSelection(selection.id);

    expect(added).toHaveBeenCalledTimes(1);
    expect(updated).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(3);
  });

  it("clears selections when a new song is loaded", async () => {
    const engine = new Engine();
    await engine.loadSong(song("A"));
    engine.addSelection({ startMs: 0, endMs: 1000 });

    await engine.loadSong(song("B"));

    expect(engine.getSelections()).toEqual([]);
  });

  it("assigns a different song id per song", async () => {
    const engine = new Engine();
    await engine.loadSong(song("A"));
    const first = engine.getSongId();
    await engine.loadSong(song("B"));

    expect(engine.getSongId()).not.toBe(first);
  });

  describe("with a selection store", () => {
    function makeStore(initial: Selection[] = []) {
      const state = { saved: [] as Selection[] };
      const store: SelectionStore = {
        load: jest.fn(async () => initial),
        save: jest.fn(async (_songId, selections) => {
          state.saved = selections;
        }),
      };
      return { store, state };
    }

    it("restores persisted selections after loading a song", async () => {
      const restored: Selection[] = [
        { id: "a", songId: "old", startMs: 0, endMs: 500 },
      ];
      const { store } = makeStore(restored);
      const engine = new Engine({ selectionStore: store });

      await engine.loadSong(song("A"));

      expect(store.load).toHaveBeenCalledWith(engine.getSongId());
      expect(engine.getSelections()).toEqual([
        { id: "a", songId: engine.getSongId(), startMs: 0, endMs: 500 },
      ]);
    });

    it("does not save while loading", async () => {
      const { store } = makeStore();
      const engine = new Engine({ selectionStore: store });

      await engine.loadSong(song("A"));

      expect(store.save).not.toHaveBeenCalled();
    });

    it("saves whenever selections change after loading", async () => {
      const { store } = makeStore();
      const engine = new Engine({ selectionStore: store });
      await engine.loadSong(song("A"));

      const selection = engine.addSelection({ startMs: 0, endMs: 1000 });

      expect(store.save).toHaveBeenCalledWith(engine.getSongId(), [selection]);
    });
  });
});
