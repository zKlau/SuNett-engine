import { useEffect } from "react";
import type { RefObject } from "react";
import type { SunettEngine, ThemeLike } from "@zklau/sunett-engine";
import type { SunettTabRenderOptions } from "../types/props";
import { renderKeyOf } from "../utils/keys";
import { useLatestRef } from "./useLatestRef";

type UseTabRenderParams = {
  engine: SunettEngine | undefined;
  ready: boolean;
  svgRef: RefObject<SVGSVGElement | null>;
  trackIndex: number;
  theme: ThemeLike | undefined;
  options: SunettTabRenderOptions | undefined;
};

export const useTabRender = (params: UseTabRenderParams): void => {
  const { engine, ready, svgRef, trackIndex, theme, options } = params;
  const themeRef = useLatestRef(theme);
  const optionsRef = useLatestRef(options);

  useEffect(() => {
    if (!engine || !ready || !svgRef.current) {
      return;
    }

    engine.render(trackIndex, {
      ...optionsRef.current,
      target: svgRef.current,
      theme: themeRef.current,
    });
  }, [
    engine,
    ready,
    trackIndex,
    svgRef,
    themeRef,
    optionsRef,
    renderKeyOf(trackIndex, theme, options),
  ]);
};
