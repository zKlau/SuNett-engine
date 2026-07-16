import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";

// Default, package-shipped styles for tab notes. These set the transform box
// and origin so any consumer CSS transform (scale, rotate, …) applied to a note
// pivots around the note's own centre rather than the SVG origin. Appearance
// still lives in the consumer's stylesheet — only transform geometry is set here.
export function buildNoteStyles(classPrefix: string): string {
  return (
    `.${classPrefix} { ` +
    `transform-box: ${constants.NOTE_TRANSFORM_BOX}; ` +
    `transform-origin: ${constants.NOTE_TRANSFORM_ORIGIN}; }`
  );
}
