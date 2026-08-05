// oxlint-disable no-console
import "./style.css";

import { parse_guitar_pro } from "sunett-parser";
import type { Song } from "../../src/types/song.ts";
import { SunettEngine } from "../../src/engine/sunettEngine.ts";
import { SnapMode } from "../../src/utils/timing/snapTime.ts";
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
    setupTrackPicker(engine);
    setupTransport(engine);
    const scopeToggle = createScopeToggle();

    const attachInput = (snap: SnapMode) => {
      engine.enableSelectionInput({
        snap,
        onCreate: () => ({
          label: prompt("Selection label:") ?? "practice",
          color: "#22c55e",
          trackIndex: scopeToggle.checked ? engine.getActiveTrackIndex() : null,
        }),
        onEdit: (selection) => renamePrompt(selection.label),
        onLabelClick: (selection) => renamePrompt(selection.label),
        onDelete: (selection) =>
          confirm(`Delete "${selection.label ?? "selection"}"?`),
      });
    };

    attachInput(SnapMode.None);
    engine.enablePlaybackInput();
    setupSnapPicker(attachInput);
    console.log(
      "Mouse: drag to create, right-click to delete, double-click or click the label to rename. Touch: press-and-hold a measure to start, scroll, then tap another measure to finish; tap a selection to delete; tap its label to rename. Use the pickers to switch track, scope, and snapping.",
    );
  } catch (e) {
    console.error("Parsing failed:", e);
  }
}

function addDemoSelections(engine: SunettEngine) {
  engine.addSelection({
    startMs: 0,
    endMs: 6000,
    label: "intro (all tracks)",
    trackIndex: null,
  });
  engine.addSelection({
    startMs: 4000,
    endMs: 12000,
    label: "hard part",
    color: "#f97316",
    trackIndex: TRACK_INDEX,
  });
}

function setupTransport(engine: SunettEngine) {
  const bar = document.createElement("div");
  const play = button("Play", () => engine.play());
  const pause = button("Pause", () => engine.pause());
  const stop = button("Stop", () => engine.stop());
  const position = document.createElement("span");

  engine.on("playbackPositionChanged", ({ positionMs }) => {
    position.textContent = ` ${(positionMs / 1000).toFixed(2)}s`;
  });

  bar.append(play, pause, stop, position);
  document.getElementById("themePicker")?.after(bar);
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}

function setupSnapPicker(onChange: (snap: SnapMode) => void) {
  const select = document.createElement("select");
  for (const mode of Object.keys(SnapMode) as SnapMode[]) {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = `Snap: ${mode}`;
    select.append(option);
  }

  select.addEventListener("change", () => {
    onChange(select.value as SnapMode);
  });

  document.getElementById("themePicker")?.after(select);
}

function createScopeToggle(): HTMLInputElement {
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = true;
  label.append(
    checkbox,
    document.createTextNode(" Scope new selections to active track"),
  );

  const picker = document.getElementById("themePicker");
  picker?.after(label);
  return checkbox;
}

function setupTrackPicker(engine: SunettEngine) {
  const select = document.createElement("select");
  engine.getTracks().forEach((track, index) => {
    const option = document.createElement("option");
    option.value = `${index}`;
    option.textContent = track.name || `Track ${index + 1}`;
    option.selected = index === TRACK_INDEX;
    select.append(option);
  });

  select.addEventListener("change", () => {
    engine.render(Number(select.value));
  });

  const picker = document.getElementById("themePicker");
  picker?.after(select);
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

function renamePrompt(current?: string): { label: string } | undefined {
  const label = prompt("New label:", current ?? "");
  return label === null ? undefined : { label };
}

function displayTitle(name: string) {
  const element = document.getElementById("songTitle");
  if (element) {
    element.textContent = name;
  }
}

// main("/tabs/7string.gp");
//main("/tabs/hpb.gp5");
 main("/tabs/mop.gp");
