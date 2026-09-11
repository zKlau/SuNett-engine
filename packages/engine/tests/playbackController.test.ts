import { PlaybackController } from "../src/playback/playbackController";
import type { FrameScheduler } from "../src/playback/playbackController";

function makeScheduler() {
  let nextHandle = 0;
  const frames = new Map<number, (timeMs: number) => void>();

  const scheduler: FrameScheduler = {
    request(callback) {
      nextHandle += 1;
      frames.set(nextHandle, callback);
      return nextHandle;
    },
    cancel(handle) {
      frames.delete(handle);
    },
  };

  function flush(timeMs: number) {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) {
      callback(timeMs);
    }
  }

  return { scheduler, flush, pending: () => frames.size };
}

function makeController() {
  const { scheduler, flush, pending } = makeScheduler();
  const controller = new PlaybackController({ scheduler });
  return { controller, flush, pending };
}

describe("PlaybackController", () => {
  it("starts stopped at position zero", () => {
    const { controller } = makeController();

    expect(controller.getState()).toBe("stopped");
    expect(controller.getPosition()).toBe(0);
  });

  it("advances the position by elapsed frame time while playing", () => {
    const { controller, flush } = makeController();
    const positions: number[] = [];
    controller.on("playbackPositionChanged", ({ positionMs }) =>
      positions.push(positionMs),
    );

    controller.play();
    flush(0);
    flush(1000);
    flush(1500);

    expect(controller.getState()).toBe("playing");
    expect(controller.getPosition()).toBe(1500);
    expect(positions).toEqual([1000, 1500]);
  });

  it("emits playbackStarted once and treats play while playing as a no-op", () => {
    const { controller } = makeController();
    const started = jest.fn();
    controller.on("playbackStarted", started);

    controller.play();
    controller.play();

    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith({ positionMs: 0 });
  });

  it("pauses in place and stops advancing", () => {
    const { controller, flush, pending } = makeController();
    const paused = jest.fn();
    controller.on("playbackPaused", paused);

    controller.play();
    flush(0);
    flush(500);
    controller.pause();

    expect(controller.getState()).toBe("paused");
    expect(controller.getPosition()).toBe(500);
    expect(paused).toHaveBeenCalledWith({ positionMs: 500 });
    expect(pending()).toBe(0);
  });

  it("stops and resets to the start", () => {
    const { controller, flush } = makeController();
    const stopped = jest.fn();
    controller.on("playbackStopped", stopped);

    controller.play();
    flush(0);
    flush(700);
    controller.stop();

    expect(controller.getState()).toBe("stopped");
    expect(controller.getPosition()).toBe(0);
    expect(stopped).toHaveBeenCalledWith({ positionMs: 0 });
  });

  it("seeks and keeps playing from the new position", () => {
    const { controller, flush } = makeController();

    controller.play();
    flush(0);
    flush(400);
    controller.seek(2000);
    flush(500);
    flush(600);

    expect(controller.getState()).toBe("playing");
    expect(controller.getPosition()).toBe(2100);
  });

  it("clamps seeks to the configured duration", () => {
    const { controller } = makeController();
    controller.setDuration(3000);

    controller.seek(5000);

    expect(controller.getPosition()).toBe(3000);
  });

  it("pauses at the end of the song when it reaches the duration", () => {
    const { controller, flush } = makeController();
    const paused = jest.fn();
    controller.setDuration(1000);
    controller.on("playbackPaused", paused);

    controller.play();
    flush(0);
    flush(2000);

    expect(controller.getState()).toBe("paused");
    expect(controller.getPosition()).toBe(1000);
    expect(paused).toHaveBeenCalledWith({ positionMs: 1000 });
  });

  it("wraps within an active loop range instead of stopping", () => {
    const { controller, flush } = makeController();
    controller.setDuration(10000);
    controller.setLoop({ startMs: 1000, endMs: 2000 });
    controller.seek(1500);

    controller.play();
    flush(0);
    flush(800);

    expect(controller.getState()).toBe("playing");
    expect(controller.getPosition()).toBe(1300);
  });

  it("resets to the loop start on stop when a loop is set", () => {
    const { controller } = makeController();
    controller.setLoop({ startMs: 4000, endMs: 8000 });

    controller.stop();

    expect(controller.getPosition()).toBe(4000);
  });
});
