const SVG_NAMESPACE = "http://www.w3.org/2000/svg" as const;

export function createNoteSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NAMESPACE, tag);
}
