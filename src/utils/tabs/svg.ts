const SVG_NAMESPACE = "http://www.w3.org/2000/svg" as const;

export function createSvgElement<Key extends keyof SVGElementTagNameMap>(
  tagName: Key,
): SVGElementTagNameMap[Key] {
  return document.createElementNS(SVG_NAMESPACE, tagName);
}
