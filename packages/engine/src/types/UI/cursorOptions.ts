/** Builds the cursor artwork. Should return an `<svg>` element with a viewBox. */
export type CursorSvgFactory = (document: Document) => SVGElement;

/** Customises the playback cursor's artwork and CSS hooks. */
export type CursorOptions = {
  /**
   * Custom cursor artwork: a string of SVG markup (a full `<svg>…</svg>`) or a
   * factory returning an `SVGElement`. It is scaled to the staff height and
   * centred on the playhead. Defaults to the built-in marker.
   */
  svg?: string | CursorSvgFactory;
  /**
   * Extra class name(s) added to the cursor element, so it (and its children)
   * can be styled from a consumer stylesheet. The `playback-cursor` class is
   * always present.
   */
  className?: string;
};
