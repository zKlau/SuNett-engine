// oxlint-disable no-console
import "./style.css";

import { parse_guitar_pro } from "sunett-parser";
import type { Song } from "../../src/types/song.ts";
import { TabsRenderer } from "../../src/utils/tabs/tabsRenderer.ts";
import { ThemePresets } from "../../src/theme/presets/index.ts";
import type { PresetTheme } from "../../src/theme/presets/index.ts";

const TRACK_INDEX = 5;

async function main(filePath: string) {
  const response = await fetch(filePath);
  const bytes = new Uint8Array(await response.arrayBuffer());

  try {
    const song: Song = parse_guitar_pro(bytes, filePath);

    const t = new TabsRenderer(song);
    t.generateMeasures(TRACK_INDEX);
    console.log(song.tracks);

    displayTitle(song.name);
    setupThemePicker(t);
  } catch (e) {
    console.error("Parsing failed:", e);
  }
}

function setupThemePicker(renderer: TabsRenderer) {
  const select = document.getElementById("themeSelect");
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  for (const name of Object.keys(ThemePresets)) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.append(option);
  }

  select.addEventListener("change", () => {
    renderer.generateMeasures(TRACK_INDEX, {
      theme: select.value as PresetTheme,
    });
  });
}
function displayTitle(name: string) {
  const element = document.getElementById("songTitle");
  if (element) {
    element.textContent = name;
  }
}

// main("/tabs/7string.gp");
// main("/tabs/hpb.gp5");
main("/tabs/mop.gp")

