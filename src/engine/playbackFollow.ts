import type { CursorGeometry } from "../playback/cursorGeometry";
import type { PlaybackPositionEvent } from "../types/playback";
import {
  resolveScrollContainer,
  viewportSpan,
} from "../utils/tabs/scrollTarget";

/** Where the followed row is placed in the viewport. */
export const FollowAlign = {
  Start: "start",
  Center: "center",
} as const;

export type FollowAlign = (typeof FollowAlign)[keyof typeof FollowAlign];

/** Configures playback auto-scroll (row-follow). Every field is optional. */
export type AutoScrollOptions = {
  /**
   * The element (or `window`) that scrolls. Defaults to the nearest scrollable
   * ancestor of the tab, falling back to `window`.
   */
  container?: Element | Window;
  /** Gap kept between the cursor and the viewport edge, in px. Default `48`. */
  margin?: number;
  /** Where to place the followed row. Default `"start"`. */
  align?: FollowAlign;
  /** Scroll behavior passed to the scroll call. Default `"smooth"`. */
  behavior?: ScrollBehavior;
};

/** The cursor state and DOM handles auto-scroll needs from the engine. */
export type PlaybackFollowSource = {
  on(
    event: "playbackPositionChanged",
    listener: (payload: PlaybackPositionEvent) => void,
  ): () => void;
  getCursorGeometry(): CursorGeometry | undefined;
  getCursorRect(): DOMRect | undefined;
  getTabElement(): SVGSVGElement | undefined;
};

type Span = { top: number; bottom: number };

const DEFAULT_MARGIN = 48;

/**
 * Scrolls the cursor's row into view whenever it changes row. Row changes are
 * detected from the cursor's tab-space `y` (constant within a row), so no
 * layout is forced per frame - only on the rare row change.
 * @returns A function that detaches the follow behavior.
 */
export function attachPlaybackFollow(
  source: PlaybackFollowSource,
  options: AutoScrollOptions = {},
): () => void {
  const margin = options.margin ?? DEFAULT_MARGIN;
  const align = options.align ?? FollowAlign.Start;
  const behavior = options.behavior ?? "smooth";
  let lastRowY: number | undefined;

  const follow = () => {
    const geometry = source.getCursorGeometry();
    if (!geometry) {
      return;
    }
    if (geometry.y === lastRowY) {
      return;
    }
    lastRowY = geometry.y;

    const rect = source.getCursorRect();
    if (!rect) {
      return;
    }
    const container = resolveScrollContainer(
      source.getTabElement(),
      options.container,
    );
    const view = viewportSpan(container);
    const delta = followScrollDelta(rect, view, margin, align);
    if (delta !== null) {
      container.scrollBy({ top: delta, behavior });
    }
  };

  return source.on("playbackPositionChanged", follow);
}

/**
 * The vertical scroll delta needed to bring `cursor` into view with `margin`,
 * or `null` when it is already comfortably visible.
 */
export function followScrollDelta(
  cursor: Span,
  view: Span,
  margin: number,
  align: FollowAlign,
): number | null {
  const visible =
    cursor.top >= view.top + margin && cursor.bottom <= view.bottom - margin;
  if (visible) {
    return null;
  }
  if (align === FollowAlign.Center) {
    const viewCenter = (view.top + view.bottom) / 2;
    const cursorCenter = (cursor.top + cursor.bottom) / 2;
    return cursorCenter - viewCenter;
  }
  return cursor.top - (view.top + margin);
}
