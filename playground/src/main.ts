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
    setupInteractiveSelection(engine);
    console.log("Drag on the tab to create a selection; click one to remove it.");
  } catch (e) {
    console.error("Parsing failed:", e);
  }
}

function setupInteractiveSelection(engine: SunettEngine) {
  const svg = document.getElementById("tabs");
  if (!(svg instanceof SVGSVGElement)) {
    return;
  }
  svg.style.touchAction = "none";

  let anchorMs: number | null = null;

  svg.addEventListener("pointerdown", (event) => {
    const existing = engine.selectionAt(event.clientX, event.clientY);
    if (existing) {
      engine.removeSelection(existing.id);
      return;
    }

    const time = engine.timeAtPoint(event.clientX, event.clientY);
    if (time == null) {
      return;
    }
    anchorMs = time;
    engine.beginDraftSelection(time);
    svg.setPointerCapture(event.pointerId);
  });

  svg.addEventListener("pointermove", (event) => {
    if (anchorMs == null) {
      return;
    }
    const time = engine.timeAtPoint(event.clientX, event.clientY);
    if (time != null) {
      engine.updateDraftSelection({ endMs: time });
    }
  });

  svg.addEventListener("pointerup", (event) => {
    if (anchorMs == null) {
      return;
    }
    const time = engine.timeAtPoint(event.clientX, event.clientY) ?? anchorMs;
    const dragged = Math.abs(time - anchorMs) > 50;
    anchorMs = null;
    if (dragged) {
      engine.commitDraftSelection({ label: "practice", color: "#22c55e" });
    } else {
      engine.cancelDraftSelection();
    }
  });

  svg.addEventListener("pointercancel", () => {
    anchorMs = null;
    engine.cancelDraftSelection();
  });
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
