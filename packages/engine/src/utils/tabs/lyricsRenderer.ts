import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { MeasureNotationRequest } from "../../types/UI/measureNotationRender";
import { createSvgElement } from "./svg";
import { applyMutedText } from "./svgDefaults";

export function renderLyrics(request: MeasureNotationRequest) {
  const bottomY =
    request.bounds.y +
    constants.MEASURE_TOP_PADDING +
    (request.stringCount - 1) * request.bounds.stringSpacing;

  request.lyrics.forEach((syllable) => {
    const layout = request.beatLayouts.find((candidate) => {
      return (
        candidate.voiceIndex === 0 && candidate.beatIndex === syllable.beatIndex
      );
    });
    if (!layout) {
      return;
    }

    const text = createSvgElement("text");
    text.setAttribute("class", "lyric");
    text.setAttribute("data-line-index", `${syllable.lineIndex}`);
    text.setAttribute("data-beat-index", `${syllable.beatIndex}`);
    text.setAttribute("x", `${layout.x}`);
    text.setAttribute(
      "y",
      `${
        bottomY +
        constants.LYRICS_OFFSET +
        syllable.lineIndex * constants.LYRICS_LINE_GAP
      }`,
    );
    applyMutedText(text);
    text.setAttribute("text-anchor", "middle");
    text.textContent = syllable.text;
    request.parent.append(text);
  });
}
