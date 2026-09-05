import { useEffect } from "react";
import type { SunettEngine } from "@zklau/sunett-engine";
import type { SunettTabCallbacks } from "../types/props";
import { useLatestRef } from "./useLatestRef";

export const useEngineEvents = (
  engine: SunettEngine | undefined,
  callbacks: SunettTabCallbacks,
): void => {
  const callbacksRef = useLatestRef(callbacks);

  useEffect(() => {
    if (!engine) {
      return;
    }

    const emitState = () => {
      callbacksRef.current.onPlaybackStateChanged?.(engine.getPlaybackState());
    };

    const offs = [
      engine.on("selectionsChanged", (selections) =>
        callbacksRef.current.onSelectionsChanged?.(selections),
      ),
      engine.on("selectionAdded", (selection) =>
        callbacksRef.current.onSelectionAdded?.(selection),
      ),
      engine.on("selectionUpdated", (selection) =>
        callbacksRef.current.onSelectionUpdated?.(selection),
      ),
      engine.on("selectionRemoved", (selection) =>
        callbacksRef.current.onSelectionRemoved?.(selection),
      ),
      engine.on("playbackPositionChanged", (event) =>
        callbacksRef.current.onPlaybackPositionChanged?.(event.positionMs),
      ),
      engine.on("playbackStarted", emitState),
      engine.on("playbackPaused", emitState),
      engine.on("playbackStopped", emitState),
    ];

    return () => {
      for (const off of offs) {
        off();
      }
    };
  }, [engine, callbacksRef]);
};
