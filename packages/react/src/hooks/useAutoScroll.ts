import { useEffect } from "react";
import type { AutoScrollOptions, SunettEngine } from "@zklau/sunett-engine";
import { resolveFlag } from "../utils/flags";
import type { Flag } from "../utils/flags";
import { autoScrollKeyOf } from "../utils/keys";
import { useLatestRef } from "./useLatestRef";

export const useAutoScroll = (
  engine: SunettEngine | undefined,
  ready: boolean,
  autoScroll: Flag<AutoScrollOptions>,
): void => {
  const autoScrollRef = useLatestRef(autoScroll);

  useEffect(() => {
    if (!engine || !ready) {
      return;
    }

    const resolved = resolveFlag(autoScrollRef.current);
    if (!resolved) {
      return;
    }

    return engine.enableAutoScroll(resolved);
  }, [engine, ready, autoScrollRef, autoScrollKeyOf(autoScroll)]);
};
