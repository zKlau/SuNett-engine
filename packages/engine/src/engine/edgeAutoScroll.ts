type Scrollable = {
  top: number;
  bottom: number;
  scrollBy(delta: number): void;
};

export type EdgeAutoScroll = {
  track(clientY: number): void;
  stop(): void;
};

const DEFAULT_ZONE_PX = 56;
const DEFAULT_MAX_STEP_PX = 14;

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
