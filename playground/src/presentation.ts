import "./presentation.css";
import { SunettEngine, SnapMode } from "../../packages/engine/src/index.ts";
import { createPresentationSong } from "./presentationSong.ts";

const TRACK_DESCRIPTIONS = [
  "A gentle arpeggio, with a little room to breathe.",
  "A little more bite. Palm mutes, hammer-ons, and vibrato.",
];
const DEFAULT_HINT = matchMedia("(pointer: coarse)").matches
  ? "Hold a measure, then tap another to mark a section."
  : "Drag across the score to mark a practice section.";

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing presentation element: ${selector}`);
  }
  return element;
}

async function initializeDemo(): Promise<void> {
  const target = requiredElement<SVGSVGElement>("#presentation-tabs");
  const card = requiredElement<HTMLElement>("#demo-card");
  const trackPicker = requiredElement<HTMLSelectElement>("#demo-track");
  const highlightButton =
    requiredElement<HTMLButtonElement>("#highlight-phrase");
  const resetButton = requiredElement<HTMLButtonElement>("#reset-selections");
  const status = requiredElement<HTMLElement>("#selection-status");
  const themeButtons =
    card.querySelectorAll<HTMLButtonElement>("[data-demo-theme]");
  const engine = new SunettEngine({ theme: "paper" });
  let phraseId: string | undefined;
  let measuresPerRow = 0;

  function getMeasuresPerRow(): number {
    const width = target.getBoundingClientRect().width;
    return width < 420 ? 1 : width < 800 ? 2 : 4;
  }

  function renderTrack(): void {
    const trackIndex = Number(trackPicker.value);
    measuresPerRow = getMeasuresPerRow();
    engine.render(trackIndex, {
      target,
      measuresPerRow,
      minMeasureWidth: 170,
      maxMeasureWidth: 1000,
      measureGap: 0,
      paddingX: 8,
      paddingY: 15,
      rowGap: 36,
      stringSpacing: 15,
      notes: { fontSize: 11 },
      showTuning: true,
    });
    requiredElement<HTMLElement>("#track-description").textContent =
      TRACK_DESCRIPTIONS[trackIndex];
    target.setAttribute(
      "aria-label",
      `Four measures of original ${engine.getTracks()[trackIndex].name.toLowerCase()} tablature in E standard tuning`,
    );
  }

  function updateSelectionControls(): void {
    const count = engine.getSelections().length;
    const phraseSelected =
      phraseId !== undefined && engine.getSelection(phraseId) !== undefined;
    highlightButton.setAttribute("aria-pressed", String(phraseSelected));
    resetButton.disabled = count === 0;
    status.textContent =
      count > 0
        ? `${count} practice ${count === 1 ? "section" : "sections"} marked. Switch tracks to see them stay in sync.`
        : DEFAULT_HINT;
  }

  const song = createPresentationSong();
  await engine.loadSong(song);
  renderTrack();
  engine.enableSelectionInput({
    snap: SnapMode.Beat,
    onCreate: () => ({ label: "practice", color: "#8b976a", trackIndex: null }),
    onDelete: () => true,
  });
  engine.on("selectionsChanged", updateSelectionControls);
  trackPicker.addEventListener("change", renderTrack);

  for (const button of themeButtons) {
    button.addEventListener("click", () => {
      const theme = button.dataset.demoTheme;
      if (theme !== "paper" && theme !== "midnight") {
        return;
      }
      engine.setTheme(theme);
      card.dataset.theme = theme;
      for (const themeButton of themeButtons) {
        themeButton.setAttribute(
          "aria-pressed",
          String(themeButton === button),
        );
      }
    });
    button.disabled = false;
  }

  highlightButton.addEventListener("click", () => {
    if (phraseId && engine.getSelection(phraseId)) {
      engine.removeSelection(phraseId);
      phraseId = undefined;
    } else {
      const measureDuration = (60_000 / song.tempo) * 4;
      phraseId = engine.addSelection({
        startMs: measureDuration,
        endMs: measureDuration * 3,
        label: "the good part",
        color: "#8b976a",
        trackIndex: null,
      }).id;
    }
    updateSelectionControls();
  });
  resetButton.addEventListener("click", () => {
    engine.setSelections([]);
    phraseId = undefined;
    updateSelectionControls();
  });

  trackPicker.disabled = false;
  highlightButton.disabled = false;
  requiredElement<HTMLElement>("#score-area").setAttribute(
    "aria-busy",
    "false",
  );
  updateSelectionControls();

  const resizeObserver = new ResizeObserver(() => {
    if (getMeasuresPerRow() !== measuresPerRow) {
      renderTrack();
    }
  });
  resizeObserver.observe(target);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      resizeObserver.disconnect();
      engine.dispose();
    });
  }
}

function initializeCopy(): void {
  const button = requiredElement<HTMLButtonElement>("#copy-example");
  const label = requiredElement<HTMLSpanElement>("#copy-example span");
  const code = requiredElement<HTMLElement>("#integration-code");
  const status = requiredElement<HTMLElement>("#copy-status");
  let resetTimer: ReturnType<typeof setTimeout>;

  button.addEventListener("click", async () => {
    clearTimeout(resetTimer);
    try {
      await navigator.clipboard.writeText(code.textContent ?? "");
      label.textContent = "Copied!";
      status.textContent = "Integration code copied to the clipboard.";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      label.textContent = "Select & copy";
      status.textContent =
        "Automatic copying is unavailable. The code is selected; use your device’s copy command.";
    }
    resetTimer = setTimeout(() => {
      label.textContent = "Copy";
    }, 2500);
  });
}

initializeCopy();
void initializeDemo().catch(() => {
  requiredElement<HTMLElement>("#demo-error").hidden = false;
  requiredElement<HTMLElement>("#score-area").setAttribute(
    "aria-busy",
    "false",
  );
});
