export type ViewportSpan = { top: number; bottom: number };

export function resolveScrollContainer(
  tab: Element | undefined,
  override?: Element | Window,
): Element | Window {
  if (override) {
    return override;
  }

  const view = tab?.ownerDocument?.defaultView;
  let node = tab?.parentElement ?? null;
  while (node && view) {
    const overflowY = view.getComputedStyle(node).overflowY;
    const scrollable =
      overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    if (scrollable && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }

  return view ?? window;
}

export function viewportSpan(container: Element | Window): ViewportSpan {
  if (isWindow(container)) {
    return { top: 0, bottom: container.innerHeight };
  }
  const rect = container.getBoundingClientRect();
  return { top: rect.top, bottom: rect.bottom };
}

export function isWindow(container: Element | Window): container is Window {
  return typeof Window !== "undefined" && container instanceof Window;
}
