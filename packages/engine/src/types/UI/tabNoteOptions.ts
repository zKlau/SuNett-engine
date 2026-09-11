import type { NoteRenderContext } from "./noteRenderContext";

export type TabNoteOptions = {
  render?: (context: NoteRenderContext) => SVGElement | null | undefined;
  onCreate?: (element: SVGGElement, context: NoteRenderContext) => void;
  onClick?: (context: NoteRenderContext, event: MouseEvent) => void;
  onPointerEnter?: (context: NoteRenderContext, event: PointerEvent) => void;
  onPointerLeave?: (context: NoteRenderContext, event: PointerEvent) => void;
  fontSize?: number;
  maxFontSize?: number;
  paddingX?: number;
  backgroundHeight?: number;
  background?: boolean;
  classPrefix?: string;
  defaultStyles?: boolean;
};
