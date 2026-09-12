import { forwardRef, useImperativeHandle, useRef } from "react";
import { useSunettEngine } from "./hooks/useSunettEngine";
import { useEngineEvents } from "./hooks/useEngineEvents";
import { useTabRender } from "./hooks/useTabRender";
import { useSelectionInput } from "./hooks/useSelectionInput";
import { usePlaybackInput } from "./hooks/usePlaybackInput";
import { useAutoScroll } from "./hooks/useAutoScroll";
import type { SunettTabHandle, SunettTabProps } from "./types";

export const SunettTab = forwardRef<SunettTabHandle, SunettTabProps>(
  (props, ref) => {
    const {
      song,
      trackIndex = 0,
      theme,
      options,
      selectionInput,
      playbackInput,
      autoScroll,
      className,
      style,
    } = props;

    const svgRef = useRef<SVGSVGElement>(null);

    const { engine, ready } = useSunettEngine({
      song,
      config: {
        theme: props.theme,
        cursor: props.cursor,
        selectionStore: props.selectionStore,
      },
      defaultSelections: props.defaultSelections,
      onReady: props.onReady,
    });

    useEngineEvents(engine, {
      onSelectionsChanged: props.onSelectionsChanged,
      onSelectionAdded: props.onSelectionAdded,
      onSelectionUpdated: props.onSelectionUpdated,
      onSelectionRemoved: props.onSelectionRemoved,
      onPlaybackPositionChanged: props.onPlaybackPositionChanged,
      onPlaybackStateChanged: props.onPlaybackStateChanged,
    });

    useTabRender({ engine, ready, svgRef, trackIndex, theme, options });
    useSelectionInput(engine, ready, selectionInput);
    usePlaybackInput(engine, ready, playbackInput);
    useAutoScroll(engine, ready, autoScroll);

    useImperativeHandle<SunettTabHandle | null, SunettTabHandle | null>(
      ref,
      () => engine ?? null,
      [engine],
    );

    return <svg ref={svgRef} className={className} style={style} />;
  },
);

SunettTab.displayName = "SunettTab";
