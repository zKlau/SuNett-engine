// oxlint-disable no-console
import "./style.css";

import { parse_guitar_pro } from "sunett-parser";
import type { Song } from "../../src/types/song.ts";
import { TabsRenderer } from "../../src/utils/tabs/tabsRenderer.ts";

async function main(filePath: string) {
  const response = await fetch(filePath);
  const bytes = new Uint8Array(await response.arrayBuffer());

  try {
    const song: Song = parse_guitar_pro(bytes, filePath);

    const t = new TabsRenderer(song);
    t.generateMeasures(1);
    console.log(song.tracks);

    displayTitle(song.name);
  } catch (e) {
    console.error("Parsing failed:", e);
  }
}
function displayTitle(name: string) {
  const element = document.getElementById("songTitle");
  if (element) {
    element.textContent = name;
  }
}

// main("/tabs/test.gpx");
main("/tabs/hpb.gp5");
