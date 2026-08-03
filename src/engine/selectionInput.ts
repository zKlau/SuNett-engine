import type {
  Selection,
  SelectionDraftUpdate,
  SelectionUpdate,
} from "../types/selection";
import { SnapMode } from "../utils/timing/snapTime";
import { createEdgeAutoScroll } from "./edgeAutoScroll";

type SelectionInputEngine = {
  timeAtPoint(clientX: number, clientY: number): number | undefined;
  selectionAt(clientX: number, clientY: number): Selection | undefined;
  getActiveTrackIndex(): number;
  snapTime(ms: number, mode: SnapMode): number;
  beginDraftSelection(startMs: number, endMs?: number): void;
  updateDraftSelection(updates: SelectionDraftUpdate): void;
  commitDraftSelection(extras?: SelectionDraftUpdate): Selection | undefined;
  cancelDraftSelection(): void;
  removeSelection(id: string): void;
  updateSelection(id: string, updates: SelectionUpdate): void;
};

type MutableStyle = CSSStyleDeclaration & {
  webkitUserSelect?: string;
  webkitTouchCallout?: string;
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
   * Quantises drag times to the beat or measure grid. Default `"None"` (free
   * millisecond precision).
   */
  snap?: SnapMode;
  /**
   * On touch, require a press-and-hold before a drag starts a selection, so an
   * ordinary swipe scrolls the page instead of selecting. Mouse and pen always
   * start on drag. Default `true`. Set `false` to make touch match the mouse
   * (drag starts immediately and blocks touch scrolling over the tab).
   */
  holdToSelect?: boolean;
  /** Milliseconds to hold on touch before a selection begins. Default `400`. */
  holdDurationMs?: number;
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
const DEFAULT_HOLD_DURATION_MS = 400;
const HOLD_MOVE_TOLERANCE_PX = 10;

/**
 * Wires the default selection interaction onto an `<svg>`: drag with the create
 * button to add a selection, right-click to delete the one under the pointer,
 * and double-click to edit it. On touch, an ordinary swipe scrolls the page and
 * a press-and-hold begins a selection (configurable via `holdToSelect`); while
 * selecting, the page holds still and only auto-scrolls once the drag reaches a
 * screen edge, so a selection can span measures that wrapped off screen. Uses
 * only the engine's public primitives.
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
  const snap = options.snap ?? SnapMode.None;
  const holdToSelect = options.holdToSelect ?? true;
  const holdDurationMs = options.holdDurationMs ?? DEFAULT_HOLD_DURATION_MS;
  const restoreStyles = applyInteractionStyles(svg, !holdToSelect);

  let anchorMs: number | undefined;
  let active = false;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let holdOrigin: { x: number; y: number } | undefined;
  let lastPointerType: string | undefined;
  let lastClientX = 0;
  let lastClientY = 0;

  const timeAtCoords = (
    clientX: number,
    clientY: number,
  ): number | undefined => {
    const time = engine.timeAtPoint(clientX, clientY);
    return time === undefined ? undefined : engine.snapTime(time, snap);
  };

  const extendTo = (clientX: number, clientY: number) => {
    const time = timeAtCoords(clientX, clientY);
    if (time !== undefined) {
      engine.updateDraftSelection({ endMs: time });
    }
  };

  const autoScroll = createEdgeAutoScroll(svg, () =>
    extendTo(lastClientX, lastClientY),
  );

  const clearHold = () => {
    if (holdTimer !== undefined) {
      clearTimeout(holdTimer);
    }
    holdTimer = undefined;
    holdOrigin = undefined;
  };

  const beginSelection = (time: number, event: PointerEvent) => {
    anchorMs = time;
    active = true;
    engine.beginDraftSelection(time);
    capturePointer(svg, event);
  };

  const endGesture = () => {
    autoScroll.stop();
    active = false;
    anchorMs = undefined;
  };

  const onPointerDown = (event: PointerEvent) => {
    lastPointerType = event.pointerType;
    if (event.button !== createButton) {
      return;
    }
    const time = timeAtCoords(event.clientX, event.clientY);
    if (time === undefined) {
      return;
    }
    if (holdToSelect && event.pointerType === "touch") {
      holdOrigin = { x: event.clientX, y: event.clientY };
      holdTimer = setTimeout(() => {
        holdTimer = undefined;
        holdOrigin = undefined;
        beginSelection(time, event);
        vibrate();
      }, holdDurationMs);
      return;
    }
    beginSelection(time, event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (holdOrigin !== undefined) {
      if (movedBeyondTolerance(holdOrigin, event)) {
        clearHold();
      }
      return;
    }
    if (!active) {
      return;
    }
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    extendTo(event.clientX, event.clientY);
    if (event.pointerType === "touch") {
      autoScroll.track(event.clientY);
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (holdOrigin !== undefined) {
      clearHold();
      return;
    }
    if (!active || anchorMs === undefined) {
      return;
    }
    const time = timeAtCoords(event.clientX, event.clientY) ?? anchorMs;
    const range = {
      startMs: Math.min(anchorMs, time),
      endMs: Math.max(anchorMs, time),
    };
    endGesture();

    if (range.endMs - range.startMs < minDurationMs) {
      engine.cancelDraftSelection();
      return;
    }
    const scoped = options.trackScoped
      ? { trackIndex: engine.getActiveTrackIndex() }
      : {};
    engine.commitDraftSelection({
      ...scoped,
      ...options.onCreate?.(range),
    });
  };

  const onPointerCancel = () => {
    clearHold();
    if (!active) {
      return;
    }
    endGesture();
    engine.cancelDraftSelection();
  };

  const onTouchMove = (event: TouchEvent) => {
    if (active) {
      event.preventDefault();
    }
  };

  const onContextMenu = (event: MouseEvent) => {
    if (lastPointerType === "touch") {
      event.preventDefault();
      return;
    }
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
  svg.addEventListener("touchmove", onTouchMove, { passive: false });
  svg.addEventListener("contextmenu", onContextMenu);
  svg.addEventListener("dblclick", onDoubleClick);

  return () => {
    clearHold();
    autoScroll.stop();
    restoreStyles();
    svg.removeEventListener("pointerdown", onPointerDown);
    svg.removeEventListener("pointermove", onPointerMove);
    svg.removeEventListener("pointerup", onPointerUp);
    svg.removeEventListener("pointercancel", onPointerCancel);
    svg.removeEventListener("touchmove", onTouchMove);
    svg.removeEventListener("contextmenu", onContextMenu);
    svg.removeEventListener("dblclick", onDoubleClick);
  };
}

function applyInteractionStyles(
  svg: SVGSVGElement,
  blockTouchScroll: boolean,
): () => void {
  const style = svg.style as MutableStyle;
  const previous = {
    userSelect: style.userSelect,
    webkitUserSelect: style.webkitUserSelect,
    webkitTouchCallout: style.webkitTouchCallout,
    touchAction: style.touchAction,
  };
  style.userSelect = "none";
  style.webkitUserSelect = "none";
  style.webkitTouchCallout = "none";
  if (blockTouchScroll) {
    style.touchAction = "none";
  }
  return () => {
    style.userSelect = previous.userSelect;
    style.webkitUserSelect = previous.webkitUserSelect ?? "";
    style.webkitTouchCallout = previous.webkitTouchCallout ?? "";
    style.touchAction = previous.touchAction;
  };
}

function movedBeyondTolerance(
  origin: { x: number; y: number },
  event: PointerEvent,
): boolean {
  const distance = Math.hypot(
    event.clientX - origin.x,
    event.clientY - origin.y,
  );
  return distance > HOLD_MOVE_TOLERANCE_PX;
}

function vibrate(): void {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    navigator.vibrate(10);
  }
}

function capturePointer(svg: SVGSVGElement, event: PointerEvent): void {
  if (
    typeof svg.setPointerCapture === "function" &&
    event.pointerId !== undefined
  ) {
    svg.setPointerCapture(event.pointerId);
  }
}
