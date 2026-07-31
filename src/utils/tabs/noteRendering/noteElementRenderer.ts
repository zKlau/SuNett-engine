import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../../theme/variables";
import type { Note } from "../../../types/note";
import type { NoteMetrics } from "../../../types/UI/noteMetrics";
import type { NoteRenderContext } from "../../../types/UI/noteRenderContext";
import type {
  NoteRenderConfig,
  NoteRenderRequest,
} from "../../../types/UI/notesRender";
import { attachNoteInteractions } from "./noteInteractions";

export function renderNoteElement(
  request: NoteRenderRequest,
  context: NoteRenderContext,
) {
  const { parent, config, metrics } = request;
  const customElement = config.render?.(context);
  if (customElement) {
    attachNoteInteractions(customElement, context, config);
    parent.append(customElement);
    return;
  }

  const noteGroup = buildDefaultNote(context, config, metrics);
  config.onCreate?.(noteGroup, context);
  attachNoteInteractions(noteGroup, context, config);
  parent.append(noteGroup);
}

export function resolveGlyphWidth(
  label: string,
  fontSize: number,
  config: NoteRenderConfig,
  metrics: NoteMetrics,
): number {
  return Math.max(
    metrics.backgroundHeight,
    label.length * fontSize * constants.NOTE_GLYPH_WIDTH_RATIO +
      config.paddingX * 2,
  );
}

export function noteLabel(note: Note): string {
  const value = note.kind === "Dead" ? "x" : `${note.value}`;
  return note.effect?.ghost_note || note.kind === "Tie" ? `(${value})` : value;
}

function buildDefaultNote(
  context: NoteRenderContext,
  config: NoteRenderConfig,
  metrics: NoteMetrics,
): SVGGElement {
  const { note, x, y, fontSize } = context;
  const prefix = config.classPrefix;
  const group = context.createElement("g");
  const modifiers = modifierClasses(note, prefix);
  const className = modifiers ? `${prefix} ${modifiers}` : prefix;

  group.setAttribute("class", className);
  group.setAttribute("x", `${x}`);
  group.setAttribute("y", `${y}`);
  group.setAttribute("data-fret", `${note.value}`);
  group.setAttribute("data-string", `${note.string}`);
  group.setAttribute("data-kind", note.kind);
  group.setAttribute("data-beat-index", `${context.beatIndex}`);
  group.setAttribute("data-measure-index", `${context.measureIndex}`);
  group.setAttribute("data-voice-index", `${context.voiceIndex}`);

  const label = noteLabel(note);
  const glyphWidth = resolveGlyphWidth(label, fontSize, config, metrics);

  if (config.background) {
    const background = context.createElement("rect");
    background.setAttribute("class", `${prefix}-bg`);
    background.setAttribute("fill", themeVar(ThemeVariables.COLOR_NOTE_BG));
    background.setAttribute("stroke", "none");
    background.setAttribute("x", `${x - glyphWidth / 2}`);
    background.setAttribute("y", `${y - metrics.backgroundHeight / 2}`);
    background.setAttribute("width", `${glyphWidth}`);
    background.setAttribute("height", `${metrics.backgroundHeight}`);
    group.append(background);
  }

  const text = context.createElement("text");
  text.setAttribute("class", `${prefix}-text`);
  text.setAttribute("fill", themeVar(ThemeVariables.COLOR_NOTE_FG));
  text.setAttribute("font-family", themeVar(ThemeVariables.FONT_NOTE));
  text.setAttribute("x", `${x}`);
  text.setAttribute("y", `${y}`);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("font-size", `${fontSize}`);
  text.textContent = label;
  group.append(text);

  return group;
}

function modifierClasses(note: Note, prefix: string): string {
  const modifiers: string[] = [];
  if (note.kind === "Dead") {
    modifiers.push(`${prefix}--dead`);
  }
  if (note.kind === "Tie") {
    modifiers.push(`${prefix}--tie`);
  }
  if (note.effect?.ghost_note) {
    modifiers.push(`${prefix}--ghost`);
  }
  if (note.effect?.hammer) {
    modifiers.push(`${prefix}--hammer`);
  }
  if (note.effect?.palm_mute) {
    modifiers.push(`${prefix}--palm-mute`);
  }
  if (note.effect?.let_ring) {
    modifiers.push(`${prefix}--let-ring`);
  }
  if (note.effect?.bend && note.effect.bend.kind !== "None") {
    modifiers.push(`${prefix}--bend`);
  }
  if (note.effect?.vibrato) {
    modifiers.push(`${prefix}--vibrato`);
  }
  if (note.effect?.staccato) {
    modifiers.push(`${prefix}--staccato`);
  }
  if (note.effect?.accentuated_note || note.effect?.heavy_accentuated_note) {
    modifiers.push(`${prefix}--accent`);
  }
  if (note.effect?.trill) {
    modifiers.push(`${prefix}--trill`);
  }
  if (note.effect?.harmonic) {
    modifiers.push(`${prefix}--harmonic`);
  }
  if (note.effect?.slides.some((slide) => slide !== "None")) {
    modifiers.push(`${prefix}--slide`);
  }
  return modifiers.join(" ");
}
