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

const CURSOR_PATH =
  "M23 4.99999C23 2.23857 25.2386 0 28 0H102.5H177C179.761 0 182 2.23858 182 5V725.952C182 726.609 181.871 727.259 181.62 727.865L107.12 907.84C105.416 911.956 99.5843 911.956 97.8802 907.84L23.3802 727.865C23.1292 727.259 23 726.609 23 725.952V4.99999Z";

const CURSOR_BARS = [
  { y: 28, height: 22, rx: 5 },
  { y: 723, height: 22, rx: 5 },
] as const;

/**
 * Builds the playback cursor: the marker artwork scaled to the staff height and
 * horizontally centred on the playhead. Returns the group moved by
 * {@link positionCursorLine}.
 */
export function createCursorLine(
  parent: SVGSVGElement,
  height: number,
): SVGGElement {
  const artWidth = constants.CURSOR_ART_WIDTH;
  const artHeight = constants.CURSOR_ART_HEIGHT;
  const width = (height * artWidth) / artHeight;
  const fill = themeVar(ThemeVariables.COLOR_CURSOR);

  const group = createSvgElement("g");
  group.setAttribute("class", "playback-cursor");
  group.setAttribute("pointer-events", "none");
  group.style.willChange = "transform";

  const art = createSvgElement("svg");
  art.setAttribute("viewBox", `0 0 ${artWidth} ${artHeight}`);
  art.setAttribute("width", `${width}`);
  art.setAttribute("height", `${height}`);
  art.setAttribute("x", `${-width / 2}`);
  art.setAttribute("y", "0");
  art.setAttribute("preserveAspectRatio", "none");

  const path = createSvgElement("path");
  path.setAttribute("d", CURSOR_PATH);
  path.setAttribute("fill", fill);
  art.append(path);

  for (const bar of CURSOR_BARS) {
    const rect = createSvgElement("rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", `${bar.y}`);
    rect.setAttribute("width", `${artWidth}`);
    rect.setAttribute("height", `${bar.height}`);
    rect.setAttribute("rx", `${bar.rx}`);
    rect.setAttribute("fill", fill);
    art.append(rect);
  }

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
