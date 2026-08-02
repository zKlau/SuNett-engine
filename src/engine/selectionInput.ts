import type {
  Selection,
  SelectionDraftUpdate,
  SelectionUpdate,
} from "../types/selection";

type SelectionInputEngine = {
  timeAtPoint(clientX: number, clientY: number): number | undefined;
  selectionAt(clientX: number, clientY: number): Selection | undefined;
  getActiveTrackIndex(): number;
  beginDraftSelection(startMs: number, endMs?: number): void;
  updateDraftSelection(updates: SelectionDraftUpdate): void;
  commitDraftSelection(extras?: SelectionDraftUpdate): Selection | undefined;
  cancelDraftSelection(): void;
  removeSelection(id: string): void;
  updateSelection(id: string, updates: SelectionUpdate): void;
};

/** A committed time range, passed to `onCreate`. */
export type SelectionRange = {
  startMs: number;
  endMs: number;
};

/** Configures the built-in pointer interaction. Every field is optional. */
export type SelectionInputOptions = {
  /** Mouse button that drags out a new selection. Default `0` (left). */
  createButton?: number;
  /** Minimum dragged span, in ms, before a create commits. Default `40`. */
  minDurationMs?: number;
  /**
   * When `true`, a created selection is scoped to the active track, so it only
   * shows on that track. Default `false` (created selections apply to all
   * tracks). `onCreate` can still override the `trackIndex`.
   */
  trackScoped?: boolean;
  /**
   * Supplies label/color as a drag commits into a selection.
   * @param range The dragged time range.
   * @returns Fields to store on the new selection, or nothing.
   */
  onCreate?: (range: SelectionRange) => SelectionDraftUpdate | void;
  /**
   * Invoked on double-click of a selection, e.g. to rename it.
   * @param selection The selection under the pointer.
   * @returns Fields to update on the selection, or nothing.
   */
  onEdit?: (selection: Selection) => SelectionUpdate | void;
};

const DEFAULT_CREATE_BUTTON = 0;
const DEFAULT_MIN_DURATION_MS = 40;

/**
 * Wires the default selection interaction onto an `<svg>`: drag with the create
 * button to add a selection, right-click to delete the one under the pointer,
 * and double-click to edit it. Uses only the engine's public primitives.
 * @param svg The rendered tab element to listen on.
 * @param engine The engine (or compatible object) driving the selections.
 * @param options Interaction configuration.
 * @returns A function that detaches every listener.
 */
export function attachSelectionInput(
  svg: SVGSVGElement,
  engine: SelectionInputEngine,
  options: SelectionInputOptions = {},
): () => void {
  const createButton = options.createButton ?? DEFAULT_CREATE_BUTTON;
  const minDurationMs = options.minDurationMs ?? DEFAULT_MIN_DURATION_MS;
  const previousTouchAction = svg.style.touchAction;
  svg.style.touchAction = "none";

  let anchorMs: number | undefined;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== createButton) {
      return;
    }
    const time = engine.timeAtPoint(event.clientX, event.clientY);
    if (time === undefined) {
      return;
    }
    anchorMs = time;
    engine.beginDraftSelection(time);
    capturePointer(svg, event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (anchorMs === undefined) {
      return;
    }
    const time = engine.timeAtPoint(event.clientX, event.clientY);
    if (time !== undefined) {
      engine.updateDraftSelection({ endMs: time });
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (anchorMs === undefined) {
      return;
    }
    const time = engine.timeAtPoint(event.clientX, event.clientY) ?? anchorMs;
    const range = {
      startMs: Math.min(anchorMs, time),
      endMs: Math.max(anchorMs, time),
    };
    anchorMs = undefined;

    if (range.endMs - range.startMs < minDurationMs) {
      engine.cancelDraftSelection();
      return;
    }
    const scoped = options.trackScoped
      ? { trackIndex: engine.getActiveTrackIndex() }
      : {};
    engine.commitDraftSelection({ ...scoped, ...(options.onCreate?.(range) ?? {}) });
  };

  const onPointerCancel = () => {
    if (anchorMs === undefined) {
      return;
    }
    anchorMs = undefined;
    engine.cancelDraftSelection();
  };

  const onContextMenu = (event: MouseEvent) => {
    const hit = engine.selectionAt(event.clientX, event.clientY);
    if (!hit) {
      return;
    }
    event.preventDefault();
    engine.removeSelection(hit.id);
  };

  const onDoubleClick = (event: MouseEvent) => {
    if (!options.onEdit) {
      return;
    }
    const hit = engine.selectionAt(event.clientX, event.clientY);
    if (!hit) {
      return;
    }
    const updates = options.onEdit(hit);
    if (updates) {
      engine.updateSelection(hit.id, updates);
    }
  };

  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointercancel", onPointerCancel);
  svg.addEventListener("contextmenu", onContextMenu);
  svg.addEventListener("dblclick", onDoubleClick);

  return () => {
    svg.style.touchAction = previousTouchAction;
    svg.removeEventListener("pointerdown", onPointerDown);
    svg.removeEventListener("pointermove", onPointerMove);
    svg.removeEventListener("pointerup", onPointerUp);
    svg.removeEventListener("pointercancel", onPointerCancel);
    svg.removeEventListener("contextmenu", onContextMenu);
    svg.removeEventListener("dblclick", onDoubleClick);
  };
}

function capturePointer(svg: SVGSVGElement, event: PointerEvent): void {
  if (
    typeof svg.setPointerCapture === "function" &&
    event.pointerId !== undefined
  ) {
    svg.setPointerCapture(event.pointerId);
  }
}
