import { FollowAlign, followScrollDelta } from "../src/engine/playbackFollow";

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
