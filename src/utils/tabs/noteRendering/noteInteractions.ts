import type { NoteRenderContext } from "../../../types/UI/noteRenderContext";
import type { NoteRenderConfig } from "../../../types/UI/notesRender";

export function attachNoteInteractions(
  element: SVGElement,
  context: NoteRenderContext,
  config: NoteRenderConfig,
) {
  const { onClick, onPointerEnter, onPointerLeave } = config;

  if (onClick) {
    element.addEventListener("click", (event) => onClick(context, event));
    element.setAttribute("cursor", "pointer");
  }
  if (onPointerEnter) {
    element.addEventListener("pointerenter", (event) =>
      onPointerEnter(context, event),
    );
  }
  if (onPointerLeave) {
    element.addEventListener("pointerleave", (event) =>
      onPointerLeave(context, event),
    );
  }
}
