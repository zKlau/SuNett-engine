import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { CursorGeometry } from "../../playback/cursorGeometry";
import type { CursorOptions } from "../../types/UI/cursorOptions";
import { ThemeVariables, themeVar } from "../../theme/variables";
import { createSvgElement } from "./svg";

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

const CURSOR_PATH =
  "M23 4.99999C23 2.23857 25.2386 0 28 0H102.5H177C179.761 0 182 2.23858 182 5V725.952C182 726.609 181.871 727.259 181.62 727.865L107.12 907.84C105.416 911.956 99.5843 911.956 97.8802 907.84L23.3802 727.865C23.1292 727.259 23 726.609 23 725.952V4.99999Z";

const CURSOR_BARS = [
  { y: 28, height: 22, rx: 5 },
  { y: 723, height: 22, rx: 5 },
] as const;

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

function resolveCursorArt(cursor?: CursorOptions): SVGElement | undefined {
  if (!cursor?.svg || typeof document === "undefined") {
    return undefined;
  }
  if (typeof cursor.svg === "function") {
    return cursor.svg(document);
  }
  return parseSvg(cursor.svg);
}

function parseSvg(markup: string): SVGElement | undefined {
  if (typeof DOMParser === "undefined") {
    return undefined;
  }
  const root = new DOMParser().parseFromString(
    markup,
    "image/svg+xml",
  ).documentElement;
  if (root.nodeName.toLowerCase() !== "svg") {
    return undefined;
  }
  return document.importNode(root, true) as unknown as SVGElement;
}

function aspectRatioOf(art: SVGElement): number {
  const viewBox = art.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return parts[2] / parts[3];
    }
  }
  const width = parseFloat(art.getAttribute("width") ?? "");
  const height = parseFloat(art.getAttribute("height") ?? "");
  if (width > 0 && height > 0) {
    return width / height;
  }
  return constants.CURSOR_ART_WIDTH / constants.CURSOR_ART_HEIGHT;
}

function buildDefaultCursorArt(): SVGSVGElement {
  const art = createSvgElement("svg");
  art.setAttribute(
    "viewBox",
    `0 0 ${constants.CURSOR_ART_WIDTH} ${constants.CURSOR_ART_HEIGHT}`,
  );
  art.setAttribute("preserveAspectRatio", "none");

  const fill = themeVar(ThemeVariables.COLOR_CURSOR);
  const path = createSvgElement("path");
  path.setAttribute("d", CURSOR_PATH);
  path.setAttribute("fill", fill);
  art.append(path);

  for (const bar of CURSOR_BARS) {
    const rect = createSvgElement("rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", `${bar.y}`);
    rect.setAttribute("width", `${constants.CURSOR_ART_WIDTH}`);
    rect.setAttribute("height", `${bar.height}`);
    rect.setAttribute("rx", `${bar.rx}`);
    rect.setAttribute("fill", fill);
    art.append(rect);
  }

  return art;
}
