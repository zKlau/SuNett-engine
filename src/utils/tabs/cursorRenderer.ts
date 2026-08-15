import type { CursorGeometry } from "../../playback/cursorGeometry";
import type { CursorOptions } from "../../types/UI/cursorOptions";
import { createSvgElement } from "./svg";
import {
  aspectRatioOf,
  buildDefaultCursorArt,
  resolveCursorArt,
} from "./cursorArt";

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
  cursor?: CursorOptions,
): SVGGElement {
  const group = createSvgElement("g");
  group.setAttribute("class", cursorClassName(cursor));
  group.setAttribute("pointer-events", "none");
  group.style.willChange = "transform";

  const art = resolveCursorArt(cursor) ?? buildDefaultCursorArt();
  const width = height * aspectRatioOf(art);
  art.setAttribute("width", `${width}`);
  art.setAttribute("height", `${height}`);
  art.setAttribute("x", `${-width / 2}`);
  art.setAttribute("y", "0");

  group.append(art);
  parent.append(group);
  return group;
}

export function positionCursorLine(
  line: SVGGElement,
  geometry: CursorGeometry,
): void {
  line.style.transform = `translate(${geometry.x}px, ${geometry.y}px)`;
}

function cursorClassName(cursor?: CursorOptions): string {
  return cursor?.className
    ? `playback-cursor ${cursor.className}`
    : "playback-cursor";
}
