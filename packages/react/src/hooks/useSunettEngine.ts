import { useEffect, useRef, useState } from "react";
import { SunettEngine } from "@zklau/sunett-engine";
import type {
  SelectionInput,
  Song,
  SunettEngineConfig,
} from "@zklau/sunett-engine";
import { useLatestRef } from "./useLatestRef";

type UseSunettEngineParams = {
  song: Song;
  /** Construction config captured once on mount; later changes are ignored. */
  config: SunettEngineConfig;
  defaultSelections?: SelectionInput[];
  onReady?: (engine: SunettEngine) => void;
};

type UseSunettEngineResult = {
  engine: SunettEngine | undefined;
  ready: boolean;
};

export const useSunettEngine = (
  params: UseSunettEngineParams,
): UseSunettEngineResult => {
  const [engine, setEngine] = useState<SunettEngine>();
  const [ready, setReady] = useState(false);

  const initialConfigRef = useRef(params.config);
  const defaultSelectionsRef = useLatestRef(params.defaultSelections);
  const onReadyRef = useLatestRef(params.onReady);

  useEffect(() => {
    const created = new SunettEngine(initialConfigRef.current);
    setEngine(created);

    return () => {
      created.dispose();
      setEngine(undefined);
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!engine) {
      return;
    }

    let cancelled = false;

    setReady(false);

    void (async () => {
      await engine.loadSong(params.song);

      if (cancelled) {
        return;
      }

      const initial = defaultSelectionsRef.current;

      if (initial) {
        for (const selection of initial) {
          engine.addSelection(selection);
        }
      }

      setReady(true);
      onReadyRef.current?.(engine);
    })();
    return () => {
      cancelled = true;
    };
  }, [engine, params.song, defaultSelectionsRef, onReadyRef]);

  return { engine, ready };
};
