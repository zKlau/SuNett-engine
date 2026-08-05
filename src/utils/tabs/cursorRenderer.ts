import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { CursorGeometry } from "../../playback/cursorGeometry";
import { ThemeVariables, themeVar } from "../../theme/variables";
import { createSvgElement } from "./svg";

/**
 * Wraps `svg` in a `position: relative` container so the cursor overlay can be
 * inset over it and stay aligned regardless of surrounding layout. Returns the
 * wrapper, reusing an existing one.
 */
export function wrapForCursor(svg: SVGSVGElement): HTMLElement | undefined {
  const existing = svg.parentElement;
  if (existing?.dataset.sunettCursorWrap === "true") {
    return existing;
  }
  if (!existing || !svg.ownerDocument) {
    return undefined;
  }

  const wrapper = svg.ownerDocument.createElement("div");
  wrapper.dataset.sunettCursorWrap = "true";
  wrapper.style.position = "relative";
  wrapper.style.display = "block";
  existing.insertBefore(wrapper, svg);
  wrapper.append(svg);
  return wrapper;
}

/** Removes the cursor wrapper, returning `svg` to its original parent. */
export function unwrapCursor(wrapper: HTMLElement, svg: SVGSVGElement): void {
  wrapper.parentElement?.insertBefore(svg, wrapper);
  wrapper.remove();
}

export function createCursorOverlay(wrapper: HTMLElement): SVGSVGElement {
  const overlay = createSvgElement("svg");
  overlay.setAttribute("class", "playback-cursor-layer");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.pointerEvents = "none";
  overlay.style.overflow = "visible";
  wrapper.append(overlay);
  return overlay;
}

export function createCursorLine(
  parent: SVGSVGElement,
  height: number,
): SVGLineElement {
  const line = createSvgElement("line");
  line.setAttribute("class", "playback-cursor");
  line.setAttribute("pointer-events", "none");
  line.setAttribute("stroke", themeVar(ThemeVariables.COLOR_CURSOR));
  line.setAttribute("stroke-width", `${constants.CURSOR_WIDTH}`);
  line.setAttribute("x1", "0");
  line.setAttribute("x2", "0");
  line.setAttribute("y1", "0");
  line.setAttribute("y2", `${height}`);
  line.style.willChange = "transform";
  parent.append(line);
  return line;
}

export function positionCursorLine(
  line: SVGLineElement,
  geometry: CursorGeometry,
): void {
  line.style.transform = `translate(${geometry.x}px, ${geometry.y}px)`;
}
