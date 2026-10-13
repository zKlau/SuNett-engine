import {
  attachPlaybackFollow,
  FollowAlign,
  followScrollDelta,
} from "../src/engine/playbackFollow";
import type { PlaybackFollowSource } from "../src/engine/playbackFollow";
import type { CursorGeometry } from "../src/playback/cursorGeometry";
import type { PlaybackPositionEvent } from "../src/types/playback";

const VIEW = { top: 0, bottom: 500 };
const MARGIN = 48;

describe("followScrollDelta", () => {
  it("returns null when the cursor is comfortably in view", () => {
    expect(
      followScrollDelta(
        { top: 100, bottom: 150 },
        VIEW,
        MARGIN,
        FollowAlign.Start,
      ),
    ).toBeNull();
  });

  it("treats the margin edges as still visible", () => {
    expect(
      followScrollDelta(
        { top: 48, bottom: 452 },
        VIEW,
        MARGIN,
        FollowAlign.Start,
      ),
    ).toBeNull();
  });

  it("scrolls down to bring a below-viewport row to the margin", () => {
    expect(
      followScrollDelta(
        { top: 480, bottom: 530 },
        VIEW,
        MARGIN,
        FollowAlign.Start,
      ),
    ).toBe(432);
  });

  it("scrolls up to bring an above-viewport row to the margin", () => {
    expect(
      followScrollDelta(
        { top: 10, bottom: 60 },
        VIEW,
        MARGIN,
        FollowAlign.Start,
      ),
    ).toBe(-38);
  });

  it("centers the row when align is center", () => {
    expect(
      followScrollDelta(
        { top: 480, bottom: 530 },
        VIEW,
        MARGIN,
        FollowAlign.Center,
      ),
    ).toBe(255);
  });
});

describe("attachPlaybackFollow", () => {
  function makeContainer(scrolls: number[]) {
    return {
      getBoundingClientRect: () => ({ top: 0, bottom: 500 }),
      scrollBy: ({ top }: { top: number }) => scrolls.push(top),
    } as unknown as Element;
  }

  function makeSource(geometry: CursorGeometry, rect: DOMRect) {
    let listener: ((payload: PlaybackPositionEvent) => void) | undefined;
    const source: PlaybackFollowSource = {
      on: (_event, next) => {
        listener = next;
        return () => {};
      },
      getCursorGeometry: () => geometry,
      getCursorRect: () => rect,
      getTabElement: () => undefined,
    };
    return {
      source,
      fire: () => listener?.({} as PlaybackPositionEvent),
    };
  }

  it("scrolls to keep the whole row visible even when the staff line is in view", () => {
    // Staff line client rect [300,400] sits comfortably inside [0,500], but the
    // full row spans [250,550], so its lower half is cut off and must scroll.
    const geometry: CursorGeometry = {
      x: 0,
      y: 100,
      height: 100,
      rowTop: 50,
      rowHeight: 300,
    };
    const rect = { top: 300, bottom: 400, height: 100 } as DOMRect;

    const scrolls: number[] = [];
    const { source, fire } = makeSource(geometry, rect);
    attachPlaybackFollow(source, {
      container: makeContainer(scrolls),
      behavior: "auto",
    });

    fire();

    expect(scrolls).toEqual([202]);
  });
});
