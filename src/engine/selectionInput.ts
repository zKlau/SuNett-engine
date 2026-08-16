import type {
  Selection,
  SelectionDraftUpdate,
  SelectionUpdate,
} from "../types/selection";
import type { Point } from "../types/UI/point";
import { SnapMode } from "../utils/timing/snapTime";
import { createEdgeAutoScroll } from "./edgeAutoScroll";
import {
  applyInteractionStyles,
  capturePointer,
  labelSelectionId,
  movedBeyondTolerance,
  vibrate,
} from "./pointerInteraction";

type SelectionInputEngine = {
  timeAtPoint(clientX: number, clientY: number): number | undefined;
  selectionAt(clientX: number, clientY: number): Selection | undefined;
  getSelection(id: string): Selection | undefined;
  getActiveTrackIndex(): number;
  snapTime(ms: number, mode: SnapMode): number;
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
  /** Minimum selected span, in ms, before a create commits. Default `40`. */
  minDurationMs?: number;
  /**
   * When `true`, a created selection is scoped to the active track, so it only
   * shows on that track. Default `false` (created selections apply to all
   * tracks). `onCreate` can still override the `trackIndex`.
   */
  trackScoped?: boolean;
  /**
   * Quantises times to the beat or measure grid. Default `"None"` (free
   * millisecond precision).
   */
  snap?: SnapMode;
  /**
   * On touch, press-and-hold a measure to anchor the selection start, then tap
   * another measure to set the end, so the page scrolls normally between the
   * two. Mouse and pen always drag to select. Default `true`. Set `false` to
   * make touch drag-select immediately, which blocks touch scrolling over the
   * tab.
   */
  holdToSelect?: boolean;
  /** Milliseconds to hold on touch before the start is anchored. Default `400`. */
  holdDurationMs?: number;
  /**
   * Supplies label/color as a selection commits.
   * @param range The selected time range.
   * @returns Fields to store on the new selection, or nothing.
   */
  onCreate?: (range: SelectionRange) => SelectionDraftUpdate | void;
  /**
   * Invoked on double-click of a selection, e.g. to rename it.
   * @param selection The selection under the pointer.
   * @returns Fields to update on the selection, or nothing.
   */
  onEdit?: (selection: Selection) => SelectionUpdate | void;
  /**
   * Invoked when a selection's label is clicked or tapped, giving touch a
   * single-tap rename path where double-click is awkward.
   * @param selection The selection whose label was clicked.
   * @returns Fields to update on the selection, or nothing.
   */
  onLabelClick?: (selection: Selection) => SelectionUpdate | void;
  /**
   * Invoked when a selection is tapped on touch, giving touch a delete path
   * where there is no right-click. Ignored while a start is anchored (there the
   * tap sets the selection end instead).
   * @param selection The tapped selection.
   * @returns `true` to remove it, e.g. after a confirmation prompt.
   */
  onDelete?: (selection: Selection) => boolean | void;
};

const DEFAULT_CREATE_BUTTON = 0;
const DEFAULT_MIN_DURATION_MS = 40;
const DEFAULT_HOLD_DURATION_MS = 400;

/**
 * Wires the default selection interaction onto an `<svg>`. Mouse and pen drag
 * with the create button to add a selection, right-click deletes the one under
 * the pointer, and double-click edits it. On touch, an ordinary swipe scrolls
 * the page, a press-and-hold anchors a selection start, a following tap sets its
 * end (so the page scrolls freely between the two), and a tap on an existing
 * selection deletes it through `onDelete`. A click or tap on a selection's label
 * fires `onLabelClick` (a single-tap rename path for touch). Mouse drags
 * auto-scroll the page once they reach a screen edge. Uses only the engine's
 * public primitives.
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

  let dragAnchorMs: number | undefined;
  let dragging = false;
  let pendingStartMs: number | undefined;
  let anchoredThisGesture = false;
  let labelPressId: string | undefined;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let holdOrigin: Point | undefined;
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

  const commitRange = (startMs: number, endMs: number) => {
    if (Math.abs(endMs - startMs) < minDurationMs) {
      engine.cancelDraftSelection();
      return;
    }
    const range = {
      startMs: Math.min(startMs, endMs),
      endMs: Math.max(startMs, endMs),
    };
    const scoped = options.trackScoped
      ? { trackIndex: engine.getActiveTrackIndex() }
      : {};
    engine.commitDraftSelection({ ...scoped, ...options.onCreate?.(range) });
  };

  const beginDrag = (time: number, event: PointerEvent) => {
    dragAnchorMs = time;
    dragging = true;
    engine.beginDraftSelection(time);
    capturePointer(svg, event);
  };

  const endDrag = () => {
    autoScroll.stop();
    dragging = false;
    dragAnchorMs = undefined;
  };

  const anchorStart = (time: number) => {
    pendingStartMs = time;
    anchoredThisGesture = true;
    engine.beginDraftSelection(time);
    vibrate();
  };

  const onTap = (event: PointerEvent) => {
    if (pendingStartMs !== undefined) {
      const end = timeAtCoords(event.clientX, event.clientY);
      if (end === undefined) {
        return;
      }
      const start = pendingStartMs;
      pendingStartMs = undefined;
      engine.updateDraftSelection({ endMs: end });
      commitRange(start, end);
      return;
    }
    if (!options.onDelete) {
      return;
    }
    const hit = engine.selectionAt(event.clientX, event.clientY);
    if (hit && options.onDelete(hit)) {
      engine.removeSelection(hit.id);
    }
  };

  const handleLabelClick = (id: string) => {
    const selection = engine.getSelection(id);
    if (!selection) {
      return;
    }
    const updates = options.onLabelClick?.(selection);
    if (updates) {
      engine.updateSelection(id, updates);
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    lastPointerType = event.pointerType;
    if (event.button !== createButton) {
      return;
    }
    if (options.onLabelClick) {
      const labelId = labelSelectionId(event.target);
      if (labelId !== undefined) {
        labelPressId = labelId;
        holdOrigin = { x: event.clientX, y: event.clientY };
        return;
      }
    }
    const time = timeAtCoords(event.clientX, event.clientY);
    if (time === undefined) {
      return;
    }
    anchoredThisGesture = false;
    if (holdToSelect && event.pointerType === "touch") {
      holdOrigin = { x: event.clientX, y: event.clientY };
      holdTimer = setTimeout(() => {
        holdTimer = undefined;
        holdOrigin = undefined;
        anchorStart(time);
      }, holdDurationMs);
      return;
    }
    beginDrag(time, event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (dragging) {
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      extendTo(event.clientX, event.clientY);
      if (event.pointerType === "touch") {
        autoScroll.track(event.clientY);
      }
      return;
    }
    if (holdOrigin !== undefined && movedBeyondTolerance(holdOrigin, event)) {
      clearHold();
      labelPressId = undefined;
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (dragging) {
      const start = dragAnchorMs;
      const end = timeAtCoords(event.clientX, event.clientY) ?? start;
      endDrag();
      if (start !== undefined && end !== undefined) {
        commitRange(start, end);
      }
      return;
    }
    if (labelPressId !== undefined) {
      const id = labelPressId;
      labelPressId = undefined;
      holdOrigin = undefined;
      handleLabelClick(id);
      return;
    }
    if (anchoredThisGesture) {
      anchoredThisGesture = false;
      return;
    }
    if (holdOrigin !== undefined) {
      clearHold();
      onTap(event);
    }
  };

  const onPointerCancel = () => {
    clearHold();
    anchoredThisGesture = false;
    labelPressId = undefined;
    if (dragging) {
      endDrag();
      engine.cancelDraftSelection();
    }
  };

  const onTouchMove = (event: TouchEvent) => {
    if (dragging) {
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
    if (pendingStartMs !== undefined) {
      engine.cancelDraftSelection();
      pendingStartMs = undefined;
    }
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
