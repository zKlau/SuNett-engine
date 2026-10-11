import type { NoteRenderContext } from "../types/UI/noteRenderContext";
import type { TabNoteOptions } from "../types/UI/tabNoteOptions";

const NOTE_REF_ATTRIBUTE = "data-note-ref";

/** Identifies one rendered note: its beat position and string number. */
export type NoteRef = {
  measureIndex: number;
  voiceIndex: number;
  beatIndex: number;
  string: number;
};

export class NoteClassRegistry {
  private readonly classes = new Map<string, string[]>();

  set(ref: NoteRef, classNames: string[], root?: ParentNode): void {
    const key = noteRefKey(ref);
    const previous = this.classes.get(key) ?? [];
    const next = classNames.filter((name) => name.length > 0);
    if (next.length > 0) {
      this.classes.set(key, next);
    } else {
      this.classes.delete(key);
    }
    for (const element of findNoteElements(root, key)) {
      element.classList.remove(...previous);
      element.classList.add(...next);
    }
  }

  get(ref: NoteRef): string[] {
    return this.classes.get(noteRefKey(ref)) ?? [];
  }

  clear(root?: ParentNode): void {
    for (const [key, classNames] of this.classes) {
      for (const element of findNoteElements(root, key)) {
        element.classList.remove(...classNames);
      }
    }
    this.classes.clear();
  }

  wrap(notes: TabNoteOptions = {}): TabNoteOptions {
    const { render, onCreate } = notes;
    return {
      ...notes,
      render: render
        ? (context) => {
            const element = render(context);
            if (element) {
              this.decorate(element, context);
            }
            return element;
          }
        : undefined,
      onCreate: (element, context) => {
        this.decorate(element, context);
        onCreate?.(element, context);
      },
    };
  }

  private decorate(element: SVGElement, context: NoteRenderContext): void {
    const key = noteRefKey({
      measureIndex: context.measureIndex,
      voiceIndex: context.voiceIndex,
      beatIndex: context.beatIndex,
      string: context.note.string,
    });
    element.setAttribute(NOTE_REF_ATTRIBUTE, key);
    const classNames = this.classes.get(key);
    if (classNames) {
      element.classList.add(...classNames);
    }
  }
}

function noteRefKey(ref: NoteRef): string {
  return `${ref.measureIndex}:${ref.voiceIndex}:${ref.beatIndex}:${ref.string}`;
}

function findNoteElements(
  root: ParentNode | undefined,
  key: string,
): Element[] {
  if (!root) {
    return [];
  }
  return Array.from(root.querySelectorAll(`[${NOTE_REF_ATTRIBUTE}="${key}"]`));
}
