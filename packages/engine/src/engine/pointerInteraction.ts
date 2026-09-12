import type { Point } from "../types/UI/point";

type MutableStyle = CSSStyleDeclaration & {
  webkitUserSelect?: string;
  webkitTouchCallout?: string;
};

const HOLD_MOVE_TOLERANCE_PX = 10;

export function applyInteractionStyles(
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

export function labelSelectionId(
  target: EventTarget | null,
): string | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }
  const label = target.closest(".selection-label");
  if (!label) {
    return undefined;
  }
  return (
    label.closest("[selection-id]")?.getAttribute("selection-id") ?? undefined
  );
}

export function movedBeyondTolerance(
  origin: Point,
  event: PointerEvent,
): boolean {
  const distance = Math.hypot(
    event.clientX - origin.x,
    event.clientY - origin.y,
  );
  return distance > HOLD_MOVE_TOLERANCE_PX;
}

export function vibrate(): void {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    navigator.vibrate(10);
  }
}

export function capturePointer(svg: SVGSVGElement, event: PointerEvent): void {
  if (
    typeof svg.setPointerCapture === "function" &&
    event.pointerId !== undefined
  ) {
    svg.setPointerCapture(event.pointerId);
  }
}
