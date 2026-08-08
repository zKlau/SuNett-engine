export type RafScheduler = { schedule: () => void; cancel: () => void };

export function rafScheduler(run: () => void): RafScheduler {
  const hasRaf = typeof requestAnimationFrame === "function";
  let handle: number | undefined;

  const schedule = () => {
    if (!hasRaf) {
      run();
      return;
    }
    if (handle !== undefined) {
      return;
    }
    handle = requestAnimationFrame(() => {
      handle = undefined;
      run();
    });
  };

  const cancel = () => {
    if (handle !== undefined && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(handle);
      handle = undefined;
    }
  };

  return { schedule, cancel };
}
