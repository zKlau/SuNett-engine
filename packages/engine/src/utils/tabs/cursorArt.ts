import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { CursorOptions } from "../../types/UI/cursorOptions";
import { ThemeVariables, themeVar } from "../../theme/variables";
import { createSvgElement } from "./svg";

const CURSOR_PATH =
  "M23 4.99999C23 2.23857 25.2386 0 28 0H102.5H177C179.761 0 182 2.23858 182 5V725.952C182 726.609 181.871 727.259 181.62 727.865L107.12 907.84C105.416 911.956 99.5843 911.956 97.8802 907.84L23.3802 727.865C23.1292 727.259 23 726.609 23 725.952V4.99999Z";

const CURSOR_BARS = [
  { y: 28, height: 22, rx: 5 },
  { y: 723, height: 22, rx: 5 },
] as const;

export function resolveCursorArt(
  cursor?: CursorOptions,
): SVGElement | undefined {
  if (!cursor?.svg || typeof document === "undefined") {
    return undefined;
  }
  if (typeof cursor.svg === "function") {
    return cursor.svg(document);
  }
  return parseSvg(cursor.svg);
}

export function aspectRatioOf(art: SVGElement): number {
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

export function buildDefaultCursorArt(): SVGSVGElement {
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
