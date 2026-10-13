import { SnapMode } from "../utils/timing/snapTime";

type PlaybackInputEngine = {
  timeAtPoint(clientX: number, clientY: number): number | undefined;
  snapTime(ms: number, mode: SnapMode): number;
  seek(positionMs: number): void;
};

/** Configures the click-to-seek interaction. Every field is optional. */
export type PlaybackInputOptions = {
  /** Mouse button that seeks. Default `0` (left). */
  seekButton?: number;
  /**
   * Quantises the seeked time to the beat or measure grid. Default `"None"`
   * (free millisecond precision).
   */
  snap?: SnapMode;
  /**
   * How far the pointer may move between press and release and still count as a
   * click rather than a drag, in pixels. Default `6`.
   */
  moveTolerancePx?: number;
};

const DEFAULT_SEEK_BUTTON = 0;
const DEFAULT_MOVE_TOLERANCE_PX = 6;

/**
 * Wires click-to-seek onto an `<svg>`: a click (not a drag) moves the playback
 * cursor to the clicked time. Coexists with the selection interaction - a drag
 * selects, a plain click seeks. Uses only the engine's public primitives.
 * @param svg The rendered tab element to listen on.
 * @param engine The engine (or compatible object) to seek.
 * @param options Interaction configuration.
 * @returns A function that detaches every listener.
 */
export function attachPlaybackInput(
  svg: SVGSVGElement,
  engine: PlaybackInputEngine,
  options: PlaybackInputOptions = {},
): () => void {
  const seekButton = options.seekButton ?? DEFAULT_SEEK_BUTTON;
  const snap = options.snap ?? SnapMode.None;
  const tolerance = options.moveTolerancePx ?? DEFAULT_MOVE_TOLERANCE_PX;

  let originX = 0;
  let originY = 0;
  let candidate = false;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== seekButton) {
      return;
    }
    originX = event.clientX;
    originY = event.clientY;
    candidate = true;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!candidate) {
      return;
    }
    const distance = Math.hypot(
      event.clientX - originX,
      event.clientY - originY,
    );
    if (distance > tolerance) {
      candidate = false;
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!candidate) {
      return;
    }
    candidate = false;
    const time = engine.timeAtPoint(event.clientX, event.clientY);
    if (time !== undefined) {
      engine.seek(engine.snapTime(time, snap));
    }
  };

  const onPointerCancel = () => {
    candidate = false;
  };

  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointercancel", onPointerCancel);

  return () => {
    svg.removeEventListener("pointerdown", onPointerDown);
    svg.removeEventListener("pointermove", onPointerMove);
    svg.removeEventListener("pointerup", onPointerUp);
    svg.removeEventListener("pointercancel", onPointerCancel);
  };
}
