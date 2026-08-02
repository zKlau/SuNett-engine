import type {
  Selection,
  SelectionDraftUpdate,
  SelectionEventMap,
  SelectionInput,
  SelectionUpdate,
} from "../types/selection";
import { Emitter } from "../utils/events/emitter";
import { createId } from "../utils/id/createId";

const DRAFT_ID = "draft" as const;

export class SelectionManager {
  private songId = "";
  private draft?: Selection;
  private readonly byId = new Map<string, Selection>();
  private readonly emitter = new Emitter<SelectionEventMap>();

  on<Key extends keyof SelectionEventMap>(
    event: Key,
    listener: (payload: SelectionEventMap[Key]) => void,
  ): () => void {
    return this.emitter.on(event, listener);
  }

  off<Key extends keyof SelectionEventMap>(
    event: Key,
    listener: (payload: SelectionEventMap[Key]) => void,
  ): void {
    this.emitter.off(event, listener);
  }

  getSongId(): string {
    return this.songId;
  }

  getSelections(): Selection[] {
    return [...this.byId.values()];
  }

  reset(songId: string, selections: Selection[]): void {
    this.songId = songId;
    this.draft = undefined;
    this.byId.clear();
    for (const selection of selections) {
      this.byId.set(selection.id, { ...selection, songId });
    }
    this.emitChanged();
  }

  setSelections(selections: Selection[]): void {
    this.byId.clear();
    for (const selection of selections) {
      this.byId.set(selection.id, { ...selection, songId: this.songId });
    }
    this.emitChanged();
  }

  add(input: SelectionInput): Selection {
    const selection: Selection = {
      ...input,
      id: createId(),
      songId: this.songId,
    };
    this.byId.set(selection.id, selection);
    this.emitter.emit("selectionAdded", selection);
    this.emitChanged();
    return selection;
  }

  update(id: string, updates: SelectionUpdate): void {
    const existing = this.byId.get(id);
    if (!existing) {
      return;
    }

    const next: Selection = {
      ...existing,
      ...updates,
      id: existing.id,
      songId: existing.songId,
    };
    this.byId.set(id, next);
    this.emitter.emit("selectionUpdated", next);
    this.emitChanged();
  }

  remove(id: string): void {
    const existing = this.byId.get(id);
    if (!existing) {
      return;
    }

    this.byId.delete(id);
    this.emitter.emit("selectionRemoved", existing);
    this.emitChanged();
  }

  getDraftSelection(): Selection | undefined {
    return this.draft;
  }

  beginDraft(startMs: number, endMs: number, extras: SelectionDraftUpdate = {}): void {
    this.draft = {
      ...extras,
      id: DRAFT_ID,
      songId: this.songId,
      startMs,
      endMs,
    };
  }

  updateDraft(updates: SelectionDraftUpdate): void {
    if (!this.draft) {
      return;
    }
    this.draft = {
      ...this.draft,
      ...updates,
      id: DRAFT_ID,
      songId: this.songId,
    };
  }

  cancelDraft(): void {
    this.draft = undefined;
  }

  commitDraft(extras: SelectionDraftUpdate = {}): Selection | undefined {
    if (!this.draft) {
      return undefined;
    }
    const draft = this.draft;
    this.draft = undefined;
    return this.add({
      label: draft.label,
      color: draft.color,
      ...extras,
      startMs: Math.min(draft.startMs, draft.endMs),
      endMs: Math.max(draft.startMs, draft.endMs),
    });
  }

  private emitChanged(): void {
    this.emitter.emit("selectionsChanged", this.getSelections());
  }
}
