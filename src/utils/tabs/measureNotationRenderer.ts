import type { MeasureNotationRequest } from "../../types/UI/measureNotationRender";
import { renderTimeSignature } from "./timeSignatureRenderer";
import { renderBeatText } from "./beatTextRenderer";
import { renderLyrics } from "./lyricsRenderer";

export function renderMeasureNotation(request: MeasureNotationRequest) {
  if (request.showTimeSignature) {
    renderTimeSignature(request);
  }
  renderBeatText(request);
  renderLyrics(request);
}
