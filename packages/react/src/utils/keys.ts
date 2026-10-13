import type {
  AutoScrollOptions,
  PlaybackInputOptions,
  SelectionInputOptions,
  ThemeLike,
} from "@zklau/sunett-engine";
import type { SunettTabRenderOptions } from "../types/props";
import { resolveFlag } from "./flags";
import type { Flag } from "./flags";

export const renderKeyOf = (
  trackIndex: number,
  theme: ThemeLike | undefined,
  options: SunettTabRenderOptions | undefined,
): string => {
  const layout = options ? { ...options, scrollContainer: undefined } : options;
  return JSON.stringify({ trackIndex, theme, layout });
};

export const selectionInputKeyOf = (
  value: Flag<SelectionInputOptions>,
): string => {
  const resolved = resolveFlag(value);
  if (!resolved) {
    return "off";
  }
  return JSON.stringify({
    createButton: resolved.createButton,
    minDurationMs: resolved.minDurationMs,
    trackScoped: resolved.trackScoped,
    snap: resolved.snap,
    holdToSelect: resolved.holdToSelect,
    holdDurationMs: resolved.holdDurationMs,
    hasOnCreate: Boolean(resolved.onCreate),
    hasOnEdit: Boolean(resolved.onEdit),
    hasOnLabelClick: Boolean(resolved.onLabelClick),
    hasOnDelete: Boolean(resolved.onDelete),
  });
};

export const playbackInputKeyOf = (
  value: Flag<PlaybackInputOptions>,
): string => {
  const resolved = resolveFlag(value);
  if (!resolved) {
    return "off";
  }
  return JSON.stringify({
    seekButton: resolved.seekButton,
    snap: resolved.snap,
    moveTolerancePx: resolved.moveTolerancePx,
  });
};

export const autoScrollKeyOf = (value: Flag<AutoScrollOptions>): string => {
  const resolved = resolveFlag(value);
  if (!resolved) {
    return "off";
  }
  return JSON.stringify({
    margin: resolved.margin,
    align: resolved.align,
    behavior: resolved.behavior,
    hasContainer: Boolean(resolved.container),
  });
};
