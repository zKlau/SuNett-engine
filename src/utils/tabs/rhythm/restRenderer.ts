import { RhythmRestGlyphs } from "../../../constants/restGlyphPaths";
import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../../theme/variables";
import type { Beat } from "../../../types/beats/beat";
import { createSvgElement } from "../svg";

export function renderRest(
  parent: SVGGElement,
  beat: Beat,
  x: number,
  staffCenter: number,
) {
  const rest = createSvgElement("g");
  rest.setAttribute("class", "rhythm-rest");
  rest.setAttribute("data-duration", `${beat.duration.value}`);
  rest.setAttribute("transform", `translate(${x} ${staffCenter})`);
  rest.setAttribute("fill", themeVar(ThemeVariables.COLOR_REST));
  rest.setAttribute("aria-hidden", "true");
  const [glyph, kind] = resolveRestGlyph(beat.duration.value);
  rest.setAttribute("data-rest-kind", kind);
  rest.append(createGlyphPath(glyph));

  parent.append(rest);
}

function resolveRestGlyph(duration: number) {
  if (duration <= 1) {
    return [RhythmRestGlyphs.WHOLE, "whole"] as const;
  }

  if (duration === 2) {
    return [RhythmRestGlyphs.HALF, "half"] as const;
  }

  if (duration === 4) {
    return [RhythmRestGlyphs.QUARTER, "quarter"] as const;
  }

  if (duration === 8) {
    return [RhythmRestGlyphs.EIGHTH, "flagged"] as const;
  }

  if (duration === 16) {
    return [RhythmRestGlyphs.SIXTEENTH, "flagged"] as const;
  }

  return [RhythmRestGlyphs.THIRTY_SECOND, "flagged"] as const;
}

function createGlyphPath(
  glyph: (typeof RhythmRestGlyphs)[keyof typeof RhythmRestGlyphs],
) {
  const path = createSvgElement("path");
  const scale = constants.RHYTHM_REST_GLYPH_SCALE;
  path.setAttribute("d", glyph.path);
  path.setAttribute(
    "transform",
    `translate(${-glyph.centerX * scale} ${glyph.centerY * scale}) scale(${scale} ${-scale})`,
  );
  return path;
}
