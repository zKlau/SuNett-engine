// oxlint-disable no-console
import "./style.css";

import { parse_guitar_pro } from "sunett-parser";
import type { Song } from "../../src/types/song.ts";
import { SunettEngine } from "../../src/engine/sunettEngine.ts";
import { ThemePresets } from "../../src/theme/presets/index.ts";
import type { PresetTheme } from "../../src/theme/presets/index.ts";

const TRACK_INDEX = 5;

async function main(filePath: string) {
  const response = await fetch(filePath);
  const bytes = new Uint8Array(await response.arrayBuffer());

  try {
    const song: Song = parse_guitar_pro(bytes, filePath);

    const engine = new SunettEngine();
    engine.on("selectionsChanged", (selections) =>
      console.log("selections changed:", selections),
    );

    await engine.loadSong(song);
    engine.render(TRACK_INDEX);
    console.log("tracks:", engine.getTracks());

    addDemoSelections(engine);
    displayTitle(song.name);
    setupThemePicker(engine);

    engine.enableSelectionInput({
      onCreate: () => ({
        label: prompt("Selection label:") ?? "practice",
        color: "#22c55e",
      }),
      onEdit: (selection) => {
        const label = prompt("New label:", selection.label ?? "");
        return label === null ? undefined : { label };
      },
    });
    console.log(
      "Drag to create a selection, right-click to delete, double-click to rename.",
    );
  } catch (e) {
    console.error("Parsing failed:", e);
  }
}

function addDemoSelections(engine: SunettEngine) {
  engine.addSelection({ startMs: 0, endMs: 6000, label: "intro" });
  engine.addSelection({
    startMs: 4000,
    endMs: 12000,
    label: "hard part",
    color: "#f97316",
  });
}

function setupThemePicker(engine: SunettEngine) {
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
    engine.setTheme(select.value as PresetTheme);
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
main("/tabs/hpb.gp5");
