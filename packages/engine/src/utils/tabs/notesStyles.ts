import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";

export function buildNoteStyles(classPrefix: string): string {
  return (
    `.${classPrefix} { ` +
    `transform-box: ${constants.NOTE_TRANSFORM_BOX}; ` +
    `transform-origin: ${constants.NOTE_TRANSFORM_ORIGIN}; }`
  );
}
