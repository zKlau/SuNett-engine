type Scrollable = {
  top: number;
  bottom: number;
  scrollBy(delta: number): void;
};

/** Drives the viewport while a selection drag rests against a screen edge. */
export type EdgeAutoScroll = {
  /**
   * Reports the pointer's viewport y. Starts scrolling while it sits within the
   * edge zone and stops once it moves back inside.
   */
  track(clientY: number): void;
  /** Stops any in-progress scrolling. */
  stop(): void;
};

const DEFAULT_ZONE_PX = 56;
const DEFAULT_MAX_STEP_PX = 14;

/**
 * Auto-scrolls the tab's scroll container when a selection drag reaches the top
 * or bottom of the screen, so a drag can extend onto measures that wrapped off
 * screen without the page scrolling on its own.
 * @param element The rendered tab element, used to find its scroll container.
 * @param onScroll Called after each scroll step, to re-extend the draft.
 * @param zonePx Distance from an edge, in px, that arms scrolling. Default `56`.
 * @param maxStepPx Fastest scroll step per frame, in px. Default `14`.
 * @returns A controller to feed pointer positions and to stop scrolling.
 */
export function createEdgeAutoScroll(
  element: Element,
  onScroll: () => void,
  zonePx = DEFAULT_ZONE_PX,
  maxStepPx = DEFAULT_MAX_STEP_PX,
): EdgeAutoScroll {
  let frame: number | undefined;
  let clientY = 0;

  const tick = () => {
    frame = undefined;
    const target = resolveScrollable(element);
    const delta = edgeVelocity(clientY, target, zonePx, maxStepPx);
    if (delta === 0) {
      return;
    }
    target.scrollBy(delta);
    onScroll();
    frame = requestAnimationFrame(tick);
  };

  return {
    track(nextClientY: number): void {
      clientY = nextClientY;
      if (frame === undefined && typeof requestAnimationFrame === "function") {
        frame = requestAnimationFrame(tick);
      }
    },
    stop(): void {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
        frame = undefined;
      }
    },
  };
}

function edgeVelocity(
  clientY: number,
  target: Scrollable,
  zonePx: number,
  maxStepPx: number,
): number {
  const topDepth = zonePx - (clientY - target.top);
  if (topDepth > 0) {
    return -stepFor(topDepth, zonePx, maxStepPx);
  }
  const bottomDepth = zonePx - (target.bottom - clientY);
  if (bottomDepth > 0) {
    return stepFor(bottomDepth, zonePx, maxStepPx);
  }
  return 0;
}

function stepFor(depth: number, zonePx: number, maxStepPx: number): number {
  const ratio = Math.min(1, depth / zonePx);
  return Math.max(1, Math.round(ratio * maxStepPx));
}

function resolveScrollable(element: Element): Scrollable {
  const scroller = findScrollParent(element);
  if (scroller) {
    const rect = scroller.getBoundingClientRect();
    return {
      top: Math.max(rect.top, 0),
      bottom: Math.min(rect.bottom, viewportHeight()),
      scrollBy: (delta) => {
        scroller.scrollTop += delta;
      },
    };
  }
  return {
    top: 0,
    bottom: viewportHeight(),
    scrollBy: (delta) => {
      window.scrollBy(0, delta);
    },
  };
}

function findScrollParent(element: Element): HTMLElement | undefined {
  let node = element.parentElement;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return undefined;
}

function viewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}
