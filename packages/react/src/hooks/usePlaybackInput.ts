import { useEffect } from "react";
import type { PlaybackInputOptions, SunettEngine } from "@zklau/sunett-engine";
import { resolveFlag } from "../utils/flags";
import type { Flag } from "../utils/flags";
import { playbackInputKeyOf } from "../utils/keys";
import { useLatestRef } from "./useLatestRef";

export const usePlaybackInput = (
  engine: SunettEngine | undefined,
  ready: boolean,
  playbackInput: Flag<PlaybackInputOptions>,
): void => {
  const playbackInputRef = useLatestRef(playbackInput);

  useEffect(() => {
    if (!engine || !ready) {
      return;
    }

    const resolved = resolveFlag(playbackInputRef.current);

    if (!resolved) {
      return;
    }

    return engine.enablePlaybackInput(resolved);
  }, [engine, ready, playbackInputRef, playbackInputKeyOf(playbackInput)]);
};
