import { useEffect } from "react";
import type { SelectionInputOptions, SunettEngine } from "@zklau/sunett-engine";
import { resolveFlag } from "../utils/flags";
import type { Flag } from "../utils/flags";
import { selectionInputKeyOf } from "../utils/keys";
import { useLatestRef } from "./useLatestRef";

type SelectionCallbacks = Pick<
  SelectionInputOptions,
  "onCreate" | "onEdit" | "onLabelClick" | "onDelete"
>;

const liveCallbacks = (
  latest: () => SelectionInputOptions | undefined,
): SelectionCallbacks => {
  const snapshot = latest();
  return {
    onCreate: snapshot?.onCreate && ((range) => latest()?.onCreate?.(range)),
    onEdit: snapshot?.onEdit && ((selection) => latest()?.onEdit?.(selection)),
    onLabelClick:
      snapshot?.onLabelClick &&
      ((selection) => latest()?.onLabelClick?.(selection)),
    onDelete:
      snapshot?.onDelete && ((selection) => latest()?.onDelete?.(selection)),
  };
};

export const useSelectionInput = (
  engine: SunettEngine | undefined,
  ready: boolean,
  selectionInput: Flag<SelectionInputOptions>,
): void => {
  const selectionInputRef = useLatestRef(selectionInput);

  useEffect(() => {
    if (!engine || !ready) {
      return;
    }

    const resolved = resolveFlag(selectionInputRef.current);

    if (!resolved) {
      return;
    }

    return engine.enableSelectionInput({
      ...resolved,
      ...liveCallbacks(() => resolveFlag(selectionInputRef.current)),
    });
  }, [engine, ready, selectionInputRef, selectionInputKeyOf(selectionInput)]);
};
