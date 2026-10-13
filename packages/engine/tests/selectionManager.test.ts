import { SelectionManager } from "../src/selection/selectionManager";
import type { Selection } from "../src/types/selection";

function makeManager(songId = "song-1"): SelectionManager {
  const manager = new SelectionManager();
  manager.reset(songId, []);
  return manager;
}

describe("SelectionManager", () => {
  it("adds a selection with a generated id and the current song id", () => {
    const manager = makeManager("song-1");

    const selection = manager.add({ startMs: 0, endMs: 100, label: "intro" });

    expect(selection.id).toEqual(expect.any(String));
    expect(selection.id).not.toEqual("");
    expect(selection.songId).toBe("song-1");
    expect(manager.getSelections()).toEqual([selection]);
  });

  it("emits selectionAdded and selectionsChanged when adding", () => {
    const manager = makeManager();
    const added = jest.fn();
    const changed = jest.fn();
    manager.on("selectionAdded", added);
    manager.on("selectionsChanged", changed);

    const selection = manager.add({ startMs: 0, endMs: 100 });

    expect(added).toHaveBeenCalledWith(selection);
    expect(changed).toHaveBeenCalledWith([selection]);
  });

  it("updates a selection while preserving its id and song id", () => {
    const manager = makeManager("song-1");
    const updated = jest.fn();
    manager.on("selectionUpdated", updated);
    const selection = manager.add({ startMs: 0, endMs: 100 });

    manager.update(selection.id, {
      label: "chorus",
      id: "hacked",
      songId: "other",
    } as Partial<Selection>);

    const stored = manager.getSelections()[0];
    expect(stored.label).toBe("chorus");
    expect(stored.id).toBe(selection.id);
    expect(stored.songId).toBe("song-1");
    expect(updated).toHaveBeenCalledWith(stored);
  });

  it("ignores updates to an unknown id", () => {
    const manager = makeManager();
    const changed = jest.fn();
    manager.add({ startMs: 0, endMs: 100 });
    manager.on("selectionsChanged", changed);

    manager.update("missing", { label: "x" });

    expect(changed).not.toHaveBeenCalled();
  });

  it("removes a selection and emits selectionRemoved", () => {
    const manager = makeManager();
    const removed = jest.fn();
    manager.on("selectionRemoved", removed);
    const selection = manager.add({ startMs: 0, endMs: 100 });

    manager.remove(selection.id);

    expect(manager.getSelections()).toEqual([]);
    expect(removed).toHaveBeenCalledWith(selection);
  });

  it("ignores removal of an unknown id", () => {
    const manager = makeManager();
    const removed = jest.fn();
    manager.on("selectionRemoved", removed);

    manager.remove("missing");

    expect(removed).not.toHaveBeenCalled();
  });

  it("reset replaces selections, rescopes them, and sets the song id", () => {
    const manager = makeManager("song-1");
    manager.add({ startMs: 0, endMs: 100 });

    manager.reset("song-2", [
      {
        id: "kept",
        songId: "stale",
        startMs: 10,
        endMs: 20,
      },
    ]);

    expect(manager.getSongId()).toBe("song-2");
    expect(manager.getSelections()).toEqual([
      { id: "kept", songId: "song-2", startMs: 10, endMs: 20 },
    ]);
  });

  it("setSelections replaces selections and rescopes to the current song", () => {
    const manager = makeManager("song-1");

    manager.setSelections([
      { id: "a", songId: "elsewhere", startMs: 0, endMs: 50 },
    ]);

    expect(manager.getSelections()).toEqual([
      { id: "a", songId: "song-1", startMs: 0, endMs: 50 },
    ]);
  });

  it("returns a fresh array from getSelections", () => {
    const manager = makeManager();
    manager.add({ startMs: 0, endMs: 100 });

    manager.getSelections().push({
      id: "x",
      songId: "song-1",
      startMs: 0,
      endMs: 1,
    });

    expect(manager.getSelections()).toHaveLength(1);
  });

  describe("draft", () => {
    it("tracks a draft without adding it to the committed set", () => {
      const manager = makeManager("song-1");
      const changed = jest.fn();
      manager.on("selectionsChanged", changed);

      manager.beginDraft(100, 200, { label: "loop" });

      expect(manager.getDraftSelection()).toEqual({
        id: "draft",
        songId: "song-1",
        startMs: 100,
        endMs: 200,
        label: "loop",
      });
      expect(manager.getSelections()).toEqual([]);
      expect(changed).not.toHaveBeenCalled();
    });

    it("updates the draft in place", () => {
      const manager = makeManager();
      manager.beginDraft(100, 100);

      manager.updateDraft({ endMs: 400 });

      expect(manager.getDraftSelection()?.endMs).toBe(400);
    });

    it("commits the draft as a normalised selection and clears it", () => {
      const manager = makeManager("song-1");
      const added = jest.fn();
      manager.on("selectionAdded", added);
      manager.beginDraft(400, 100, { label: "loop" });

      const committed = manager.commitDraft();

      expect(committed).toMatchObject({
        songId: "song-1",
        startMs: 100,
        endMs: 400,
        label: "loop",
      });
      expect(committed?.id).not.toBe("draft");
      expect(manager.getDraftSelection()).toBeUndefined();
      expect(manager.getSelections()).toHaveLength(1);
      expect(added).toHaveBeenCalledTimes(1);
    });

    it("cancels the draft without committing", () => {
      const manager = makeManager();
      manager.beginDraft(0, 100);

      manager.cancelDraft();

      expect(manager.getDraftSelection()).toBeUndefined();
      expect(manager.getSelections()).toEqual([]);
    });

    it("commitDraft is a no-op when there is no draft", () => {
      const manager = makeManager();

      expect(manager.commitDraft()).toBeUndefined();
    });

    it("clears the draft on reset", () => {
      const manager = makeManager("song-1");
      manager.beginDraft(0, 100);

      manager.reset("song-2", []);

      expect(manager.getDraftSelection()).toBeUndefined();
    });
  });
});
