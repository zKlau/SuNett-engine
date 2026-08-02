import { Emitter } from "../src/utils/events/emitter";

type Events = {
  ping: number;
  pong: string;
};

describe("Emitter", () => {
  it("delivers payloads to subscribers of the matching event", () => {
    const emitter = new Emitter<Events>();
    const received: number[] = [];

    emitter.on("ping", (value) => received.push(value));
    emitter.emit("ping", 1);
    emitter.emit("ping", 2);

    expect(received).toEqual([1, 2]);
  });

  it("does not deliver an event to listeners of another event", () => {
    const emitter = new Emitter<Events>();
    const pong = jest.fn();

    emitter.on("pong", pong);
    emitter.emit("ping", 1);

    expect(pong).not.toHaveBeenCalled();
  });

  it("stops delivering after the returned unsubscribe runs", () => {
    const emitter = new Emitter<Events>();
    const listener = jest.fn();

    const unsubscribe = emitter.on("ping", listener);
    emitter.emit("ping", 1);
    unsubscribe();
    emitter.emit("ping", 2);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("off removes a specific listener", () => {
    const emitter = new Emitter<Events>();
    const listener = jest.fn();

    emitter.on("ping", listener);
    emitter.off("ping", listener);
    emitter.emit("ping", 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it("tolerates a listener that unsubscribes during emit", () => {
    const emitter = new Emitter<Events>();
    const calls: string[] = [];

    const unsubscribe = emitter.on("ping", () => {
      calls.push("first");
      unsubscribe();
    });
    emitter.on("ping", () => calls.push("second"));

    emitter.emit("ping", 1);
    emitter.emit("ping", 2);

    expect(calls).toEqual(["first", "second", "second"]);
  });
});
