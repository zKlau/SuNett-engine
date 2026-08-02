import { SunettEngine } from "../src/engine/sunettEngine";
import type { Selection, SelectionStore } from "../src/types/selection";
import { makeMeasure, makeSong, makeTrack } from "./fixtures";

function song(name: string) {
  return makeSong([makeTrack(6, [makeMeasure(1)])], name);
}

describe("SunettEngine selections", () => {
  it("fills in id and songId when adding a selection", async () => {
    const engine = new SunettEngine();
    await engine.loadSong(song("A"));

    const selection = engine.addSelection({ startMs: 0, endMs: 1000 });

    expect(selection.id).toEqual(expect.any(String));
    expect(selection.songId).toBe(engine.getSongId());
    expect(engine.getSelections()).toEqual([selection]);
  });

  it("fires the lifecycle events for each operation", async () => {
    const engine = new SunettEngine();
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
    const engine = new SunettEngine();
    await engine.loadSong(song("A"));
    engine.addSelection({ startMs: 0, endMs: 1000 });

    await engine.loadSong(song("B"));

    expect(engine.getSelections()).toEqual([]);
  });

  it("assigns a different song id per song", async () => {
    const engine = new SunettEngine();
    await engine.loadSong(song("A"));
    const first = engine.getSongId();
    await engine.loadSong(song("B"));

    expect(engine.getSongId()).not.toBe(first);
  });

  describe("rendering facade", () => {
    it("exposes the loaded song and its tracks", async () => {
      const loaded = song("A");
      const engine = new SunettEngine();
      await engine.loadSong(loaded);

      expect(engine.getSong()).toBe(loaded);
      expect(engine.getTracks()).toBe(loaded.tracks);
    });

    it("returns empty tracks and no song before a song is loaded", () => {
      const engine = new SunettEngine();

      expect(engine.getSong()).toBeUndefined();
      expect(engine.getTracks()).toEqual([]);
      expect(engine.getRenderer()).toBeUndefined();
    });

    it("resolves a theme once a song is loaded", async () => {
      const engine = new SunettEngine({ theme: "dark" });
      await engine.loadSong(song("A"));

      expect(engine.getTheme()).toBeDefined();
      expect(engine.getRenderer()).toBeDefined();
    });

    it("has no theme before a song is loaded", () => {
      expect(new SunettEngine().getTheme()).toBeUndefined();
    });

    it("enableSelectionInput returns a disposer and is safe to dispose", async () => {
      const engine = new SunettEngine();
      await engine.loadSong(song("A"));

      const detach = engine.enableSelectionInput();

      expect(typeof detach).toBe("function");
      expect(() => {
        detach();
        engine.dispose();
      }).not.toThrow();
    });
  });

  describe("draft selection", () => {
    it("holds a draft separate from the committed selections", async () => {
      const engine = new SunettEngine();
      await engine.loadSong(song("A"));

      engine.beginDraftSelection(100, 200);

      expect(engine.getDraftSelection()).toMatchObject({
        startMs: 100,
        endMs: 200,
      });
      expect(engine.getSelections()).toEqual([]);
    });

    it("commits a draft into a real selection and fires selectionAdded", async () => {
      const engine = new SunettEngine();
      await engine.loadSong(song("A"));
      const added = jest.fn();
      engine.on("selectionAdded", added);

      engine.beginDraftSelection(100);
      engine.updateDraftSelection({ endMs: 900, label: "loop" });
      const committed = engine.commitDraftSelection();

      expect(committed).toMatchObject({ startMs: 100, endMs: 900, label: "loop" });
      expect(engine.getDraftSelection()).toBeUndefined();
      expect(engine.getSelections()).toHaveLength(1);
      expect(added).toHaveBeenCalledTimes(1);
    });

    it("cancels a draft without committing", async () => {
      const engine = new SunettEngine();
      await engine.loadSong(song("A"));

      engine.beginDraftSelection(0, 500);
      engine.cancelDraftSelection();

      expect(engine.getDraftSelection()).toBeUndefined();
      expect(engine.getSelections()).toEqual([]);
    });
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
      const engine = new SunettEngine({ selectionStore: store });

      await engine.loadSong(song("A"));

      expect(store.load).toHaveBeenCalledWith(engine.getSongId());
      expect(engine.getSelections()).toEqual([
        { id: "a", songId: engine.getSongId(), startMs: 0, endMs: 500 },
      ]);
    });

    it("does not save while loading", async () => {
      const { store } = makeStore();
      const engine = new SunettEngine({ selectionStore: store });

      await engine.loadSong(song("A"));

      expect(store.save).not.toHaveBeenCalled();
    });

    it("saves whenever selections change after loading", async () => {
      const { store } = makeStore();
      const engine = new SunettEngine({ selectionStore: store });
      await engine.loadSong(song("A"));

      const selection = engine.addSelection({ startMs: 0, endMs: 1000 });

      expect(store.save).toHaveBeenCalledWith(engine.getSongId(), [selection]);
    });

    it("recovers so saves resume after a rejected load", async () => {
      const store: SelectionStore = {
        load: jest.fn(async () => {
          throw new Error("load failed");
        }),
        save: jest.fn(async () => {}),
      };
      const engine = new SunettEngine({ selectionStore: store });

      await expect(engine.loadSong(song("A"))).rejects.toThrow("load failed");
      const selection = engine.addSelection({ startMs: 0, endMs: 100 });

      expect(store.save).toHaveBeenCalledWith(engine.getSongId(), [selection]);
    });

    it("lets a later load supersede an in-flight one", async () => {
      const deferred: Array<(selections: Selection[]) => void> = [];
      const store: SelectionStore = {
        load: jest.fn(
          () => new Promise<Selection[]>((resolve) => deferred.push(resolve)),
        ),
        save: jest.fn(async () => {}),
      };
      const engine = new SunettEngine({ selectionStore: store });

      const first = engine.loadSong(song("A"));
      const second = engine.loadSong(song("B"));
      const songB = engine.getSongId();

      deferred[1]([{ id: "b", songId: "x", startMs: 0, endMs: 10 }]);
      deferred[0]([{ id: "a", songId: "x", startMs: 0, endMs: 10 }]);
      await Promise.all([first, second]);

      expect(engine.getSongId()).toBe(songB);
      expect(engine.getSelections()).toEqual([
        { id: "b", songId: songB, startMs: 0, endMs: 10 },
      ]);
    });

    it("stops saving after dispose", async () => {
      const { store } = makeStore();
      const engine = new SunettEngine({ selectionStore: store });
      await engine.loadSong(song("A"));

      engine.dispose();
      engine.addSelection({ startMs: 0, endMs: 100 });

      expect(store.save).not.toHaveBeenCalled();
    });
  });
});
