/**
 * @jest-environment jsdom
 */
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import { renderMeasureNotes } from "../src/utils/tabs/notesRenderer";
import {
  makeBeat,
  makeBeatLayout,
  makeBounds,
  makeMeasureFromVoices,
  makeNote,
  makeNoteConfig,
  makeNoteMetrics,
} from "./fixtures";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeParent(): SVGGElement {
  return document.createElementNS(SVG_NS, "g");
}

describe("note technique effects", () => {
  it("wraps ghost-note fret values in parentheses", () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({
          notes: [
            makeNote({
              value: 7,
              effect: {
                ...makeNote().effect,
                ghost_note: true,
              },
            }),
          ],
        }),
      ],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelector(".tab-note-text")!.textContent).toBe("(7)");
  });

  it("renders one staccato dot for an affected chord beat", () => {
    const parent = makeParent();
    const bounds = makeBounds({ y: 20 });
    const staccatoEffect = {
      ...makeNote().effect,
      staccato: true,
    };

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 0, effect: staccatoEffect }),
              makeNote({ string: 1, effect: staccatoEffect }),
            ],
          }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout({ x: 75 })],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const dots = parent.querySelectorAll(".tab-note-effect--staccato circle");
    expect(dots).toHaveLength(1);
    expect(dots[0].getAttribute("cx")).toBe("75");
    expect(dots[0].getAttribute("cy")).toBe(
      `${
        bounds.y +
        constants.MEASURE_TOP_PADDING -
        constants.NOTE_EFFECT_STACCATO_OFFSET
      }`,
    );
  });

  it("renders one beat-width vibrato line above an affected chord", () => {
    const parent = makeParent();
    const bounds = makeBounds({ y: 20 });
    const vibratoEffect = {
      ...makeNote().effect,
      vibrato: true,
    };

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 1, effect: vibratoEffect }),
              makeNote({ string: 2, effect: vibratoEffect }),
            ],
          }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout({ x: 100, width: 180 })],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const vibrato = parent.querySelectorAll(".tab-note-effect--vibrato path");
    const noteBackground = parent.querySelector(".tab-note-bg")!;
    const expectedY =
      bounds.y +
      constants.MEASURE_TOP_PADDING -
      constants.NOTE_EFFECT_VIBRATO_OFFSET;
    const path = vibrato[0].getAttribute("d")!;

    expect(vibrato).toHaveLength(1);
    expect(path).toMatch(
      new RegExp(`^M ${noteBackground.getAttribute("x")} ${expectedY} `),
    );
    expect(path).toContain(
      `L ${100 + 90 - constants.NOTE_EFFECT_NOTE_GAP} ${expectedY}`,
    );
    expect(path.match(/L /g)!.length).toBeGreaterThan(10);
    expect(vibrato[0].getAttribute("stroke")).toContain("--sunett-color-muted");
  });

  it("omits linked techniques when no following note exists", () => {
    const note = makeNote({
      effect: {
        ...makeNote().effect,
        hammer: true,
        slides: ["ShiftSlideTo"],
      },
    });
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([[makeBeat({ notes: [note] })]]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelector(".tab-note-effect--hammer")).toBeNull();
    expect(parent.querySelector(".tab-note-effect--slide")).toBeNull();
    expect(parent.querySelector(".tab-note")).not.toBeNull();
  });

  it("renders bend points, direction, value, arrow, and label", () => {
    const note = makeNote({
      effect: {
        ...makeNote().effect,
        bend: {
          kind: "BendRelease",
          value: 100,
          semitone_length: 100,
          max_position: 60,
          max_value: 100,
          points: [
            { position: 0, value: 0, vibrato: false },
            { position: 30, value: 100, vibrato: false },
            { position: 60, value: 0, vibrato: false },
          ],
        },
      },
    });
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([[makeBeat({ notes: [note] })]]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const effect = parent.querySelector(".tab-note-effect--bend")!;
    expect(effect.getAttribute("data-bend-kind")).toBe("BendRelease");
    expect(effect.getAttribute("data-bend-value")).toBe("100");
    expect(effect.querySelectorAll("path")).toHaveLength(2);
    expect(effect.querySelector("text")!.textContent).toBe("full");
    expect(effect.querySelector("path")!.getAttribute("stroke")).toContain(
      "--sunett-color-note-fg",
    );
  });

  it("groups consecutive palm-muted beats into P.M. notation spans", () => {
    const palmMuted = (value: number) =>
      makeNote({
        value,
        effect: { ...makeNote().effect, palm_mute: true },
      });
    const parent = makeParent();
    const bounds = makeBounds({ y: 20, stringSpacing: 12 });

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({ notes: [palmMuted(0)] }),
          makeBeat({ notes: [palmMuted(0)] }),
          makeBeat({ notes: [makeNote({ value: 12 })] }),
          makeBeat({ notes: [palmMuted(0)] }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [
        makeBeatLayout({ beatIndex: 0, x: 40, width: 40 }),
        makeBeatLayout({ beatIndex: 1, x: 80, width: 40 }),
        makeBeatLayout({ beatIndex: 2, x: 120, width: 40 }),
        makeBeatLayout({ beatIndex: 3, x: 160, width: 40 }),
      ],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const spans = parent.querySelectorAll(".tab-note-effect--palm-mute");
    expect(spans).toHaveLength(2);
    expect(spans[0].getAttribute("data-start-beat")).toBe("0");
    expect(spans[0].getAttribute("data-end-beat")).toBe("1");
    expect(spans[0].querySelector("text")!.textContent).toBe("P. M.");
    expect(spans[0].querySelector("text")!.getAttribute("fill")).toContain(
      "--sunett-color-muted",
    );
    expect(spans[0].querySelectorAll("path")).toHaveLength(2);
    expect(
      spans[0].querySelector("path")!.getAttribute("stroke-dasharray"),
    ).not.toBeNull();
    expect(spans[1].getAttribute("data-start-beat")).toBe("3");
    expect(spans[1].getAttribute("data-end-beat")).toBe("3");
    expect(spans[1].querySelector("path")).toBeNull();

    const expectedY =
      bounds.y +
      constants.MEASURE_TOP_PADDING +
      -constants.NOTE_EFFECT_SPAN_OFFSET;
    expect(Number(spans[0].querySelector("text")!.getAttribute("y"))).toBe(
      expectedY,
    );
  });

  it("renders standalone symbols above and below the fret number", () => {
    const note = makeNote({
      string: 2,
      effect: {
        ...makeNote().effect,
        vibrato: true,
        palm_mute: true,
        let_ring: true,
        staccato: true,
        accentuated_note: true,
        trill: {
          fret: 8,
          duration: {
            value: 16,
            dotted: false,
            double_dotted: false,
            min_time: 0,
            tuplet_enters: 1,
            tuplet_times: 1,
          },
        },
        harmonic: { kind: "Natural" },
      },
    });
    const parent = makeParent();
    const bounds = makeBounds({ y: 20, stringSpacing: 12 });

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([[makeBeat({ notes: [note] })]]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const noteY =
      bounds.y + constants.MEASURE_TOP_PADDING + 2 * bounds.stringSpacing;
    const effectNames = [
      "vibrato",
      "palm-mute",
      "let-ring",
      "staccato",
      "accent",
      "trill",
      "harmonic",
    ];
    effectNames.forEach((effect) => {
      expect(
        parent.querySelector(`.tab-note-effect--${effect}`),
      ).not.toBeNull();
    });

    const palmMute = parent.querySelector(".tab-note-effect--palm-mute text")!;
    const accent = parent.querySelector(".tab-note-effect--accent text")!;
    expect(Number(palmMute.getAttribute("y"))).toBeLessThan(noteY);
    expect(Number(accent.getAttribute("y"))).toBeLessThan(noteY);
    expect(
      parent
        .querySelector(".tab-note-effect--let-ring path")!
        .getAttribute("stroke-dasharray"),
    ).not.toBeNull();
    expect(
      parent.querySelector(".tab-note-effect--harmonic polygon"),
    ).not.toBeNull();
  });

  it("uses the configured class prefix for notes and effect symbols", () => {
    const parent = makeParent();
    const note = makeNote({
      effect: { ...makeNote().effect, vibrato: true },
    });

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([[makeBeat({ notes: [note] })]]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig({ classPrefix: "fret" }),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelector(".fret")).not.toBeNull();
    expect(parent.querySelector(".fret-effect--vibrato")).not.toBeNull();
    expect(parent.querySelector(".tab-note-effect")).toBeNull();
  });
});
