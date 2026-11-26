/**
 * @jest-environment jsdom
 */
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import { BravuraNotationGlyphs } from "../src/constants/notationGlyphPaths";
import type { BendEffect } from "../src/types/notes/effects/bend";
import { effectFontSize } from "../src/utils/tabs/noteEffects/effectSvg";
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

function makeBendBeat(
  kind: BendEffect["kind"],
  pitches: number[],
  noteKind: "Normal" | "Tie" = "Normal",
) {
  const note = makeNote({ kind: noteKind, value: 3 });
  note.effect.bend = {
    kind,
    value: Math.max(...pitches) * 2,
    semitone_length: 1,
    max_position: 12,
    max_value: 12,
    points: pitches.map((value, index) => ({
      position: index * 6,
      value,
      vibrato: false,
    })),
  };
  return makeBeat({ notes: [note] });
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

  it.each([false, true])(
    "keeps chord vibrato close to its staff and clear of staccato (%s)",
    (staccato) => {
      const parent = makeParent();
      const bounds = makeBounds({ y: 20 });
      const vibratoEffect = {
        ...makeNote().effect,
        vibrato: true,
        staccato,
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
      expect(vibrato.length).toBeGreaterThan(1);
      const translateY = Number(
        vibrato[0]
          .getAttribute("transform")!
          .match(/translate\([^ ]+ ([^)]+)\)/)![1],
      );
      const centerY =
        translateY -
        BravuraNotationGlyphs.GUITAR_SHAKE.centerY *
          constants.NOTE_EFFECT_GUITAR_SHAKE_SCALE;
      const staffTop = bounds.y + constants.MEASURE_TOP_PADDING;
      if (staccato) {
        const circle = parent.querySelector('[data-effect="staccato"] circle')!;
        const circleTop =
          Number(circle.getAttribute("cy")) - Number(circle.getAttribute("r"));
        const vibratoBottom =
          centerY +
          (BravuraNotationGlyphs.GUITAR_SHAKE.height *
            constants.NOTE_EFFECT_GUITAR_SHAKE_SCALE) /
            2;
        expect(circleTop - vibratoBottom).toBeGreaterThanOrEqual(8);
      } else {
        expect(staffTop - centerY).toBe(18);
      }
      vibrato.forEach((path) => {
        expect(path.getAttribute("d")).toBe(
          BravuraNotationGlyphs.GUITAR_SHAKE.path,
        );
        expect(path.getAttribute("fill")).toContain("--sunett-color-muted");
        expect(path.getAttribute("stroke")).toBe("none");
        expect(path.getAttribute("transform")).toContain("scale(");
      });
    },
  );

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
          semitone_length: 1,
          max_position: 60,
          max_value: 100,
          points: [
            { position: 0, value: 0, vibrato: false },
            { position: 30, value: 4, vibrato: false },
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
    expect(effect.querySelectorAll("path")).toHaveLength(3);
    expect(effect.querySelector("text")!.textContent).toBe("full");
    const paths = effect.querySelectorAll("path");
    expect(paths[0].getAttribute("d")).toContain("C");
    expect(paths[0].getAttribute("stroke")).toContain("--sunett-color-note-fg");
    expect(paths[1].getAttribute("d")).toBe(
      BravuraNotationGlyphs.BEND_ARROW_UP.path,
    );
    expect(paths[2].getAttribute("d")).toBe(
      BravuraNotationGlyphs.BEND_ARROW_DOWN.path,
    );
    expect(paths[1].getAttribute("fill")).toContain("--sunett-color-note-fg");
    expect(paths[1].getAttribute("stroke")).toBe("none");
  });

  it("renders parser bend values as a full-height full bend", () => {
    const note = makeNote({
      effect: {
        ...makeNote().effect,
        bend: {
          kind: "Bend",
          value: 100,
          semitone_length: 1,
          max_position: 12,
          max_value: 12,
          points: [
            { position: 0, value: 0, vibrato: false },
            { position: 3, value: 4, vibrato: false },
            { position: 12, value: 4, vibrato: false },
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
    const paths = effect.querySelectorAll("path");
    const bendPath = paths[0].getAttribute("d")!.split(" ");
    const background = parent.querySelector(".tab-note-bg")!;

    expect(effect.querySelector("text")!.textContent).toBe("full");
    expect(Number(bendPath[1])).toBeCloseTo(
      Number(background.getAttribute("x")) +
        Number(background.getAttribute("width")) +
        constants.NOTE_EFFECT_NOTE_GAP,
    );
    expect(Number(bendPath[2])).toBeCloseTo(
      Number(background.getAttribute("y")) - constants.NOTE_EFFECT_NOTE_GAP,
    );
    expect(Number(bendPath[2]) - Number(bendPath[bendPath.length - 1])).toBe(
      constants.NOTE_EFFECT_BEND_HEIGHT,
    );
    expect(paths[1].getAttribute("d")).toBe(
      BravuraNotationGlyphs.BEND_ARROW_UP.path,
    );
  });

  it.each([
    { value: 4, points: [0, 1, 2], label: "1/2" },
    { value: 8, points: [0, 2, 4], label: "full" },
  ])(
    "labels normalized parser bends ($value) and removes the artificial middle wave",
    ({ value, points, label }) => {
      const note = makeNote({
        effect: {
          ...makeNote().effect,
          bend: {
            kind: "Bend",
            value,
            semitone_length: 1,
            max_position: 12,
            max_value: 12,
            points: points.map((value, index) => ({
              position: index * 6,
              value,
              vibrato: false,
            })),
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
      expect(effect.querySelector("text")!.textContent).toBe(label);
      const path = effect.querySelector("path")!.getAttribute("d")!;
      expect(path.match(/ C /g)).toHaveLength(1);
      const coordinates = path.split(" ");
      expect(coordinates[6]).toBe(coordinates[8]);
      expect(effect.querySelectorAll("path")).toHaveLength(2);
    },
  );

  it("draws a vertical prebend and preserves its release", () => {
    const note = makeNote({
      effect: {
        ...makeNote().effect,
        bend: {
          kind: "PrebendRelease",
          value: 8,
          semitone_length: 1,
          max_position: 12,
          max_value: 12,
          points: [
            { position: 0, value: 4, vibrato: false },
            { position: 12, value: 0, vibrato: false },
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
    const paths = parent.querySelectorAll(".tab-note-effect--bend path");
    expect(paths[0].getAttribute("d")).toMatch(/ L .* C /);
    expect(paths[1].getAttribute("d")).toBe(
      BravuraNotationGlyphs.BEND_ARROW_UP.path,
    );
    expect(paths[2].getAttribute("d")).toBe(
      BravuraNotationGlyphs.BEND_ARROW_DOWN.path,
    );
  });

  it.each([
    { pitches: [0, 1, 2], label: "1/2" },
    { pitches: [0, 2, 4], label: "full" },
  ])(
    "joins a $label bend to its tied release within the measure",
    ({ pitches, label }) => {
      const parent = makeParent();
      const bounds = makeBounds({ width: 178 });
      const measure = makeMeasureFromVoices([
        [
          makeBendBeat("Bend", pitches),
          makeBendBeat("ReleaseUp", [...pitches].reverse(), "Tie"),
        ],
      ]);
      const metrics = makeNoteMetrics();
      const originX = 55;
      const releaseX = 140;
      renderMeasureNotes({
        parent,
        measure,
        measureIndex: 0,
        beatLayouts: [
          makeBeatLayout({ x: originX, width: 70 }),
          makeBeatLayout({ beatIndex: 1, x: releaseX, width: 80 }),
        ],
        bounds,
        stringCount: 6,
        config: makeNoteConfig(),
        metrics,
      });

      const bends = parent.querySelectorAll('[data-effect="bend"]');
      expect(bends).toHaveLength(1);
      expect(bends[0].getAttribute("data-bend-kind")).toBe("BendRelease");
      const [curve, up, down] = bends[0].querySelectorAll("path");
      expect(up.getAttribute("d")).toBe(
        BravuraNotationGlyphs.BEND_ARROW_UP.path,
      );
      expect(down.getAttribute("d")).toBe(
        BravuraNotationGlyphs.BEND_ARROW_DOWN.path,
      );
      const path = curve.getAttribute("d")!;
      expect(path.match(/ C /g)).toHaveLength(2);
      const coordinates = path.split(" ");
      expect(Number(coordinates[1])).toBeGreaterThan(originX);
      expect(Number(coordinates[1])).toBeLessThan(releaseX);
      expect(Number(coordinates.at(-1))).toBeCloseTo(Number(coordinates[2]));
      const downArrowLeft = Number(
        down.getAttribute("transform")!.split("(")[1].split(" ")[0],
      );
      const downArrowRight =
        downArrowLeft +
        BravuraNotationGlyphs.BEND_ARROW_DOWN.width *
          constants.NOTE_EFFECT_BEND_ARROW_SCALE;
      expect(downArrowRight).toBeLessThanOrEqual(bounds.width);
      const labels = bends[0].querySelectorAll("text");
      expect(labels).toHaveLength(1);
      expect(labels[0].textContent).toBe(label);
      const labelHalfWidth =
        (label.length *
          effectFontSize(metrics.fontSize) *
          constants.NOTE_GLYPH_WIDTH_RATIO) /
        2;
      expect(
        Number(labels[0].getAttribute("x")) + labelHalfWidth,
      ).toBeLessThanOrEqual(bounds.width);
      expect(parent.querySelectorAll('[data-effect="tie"]')).toHaveLength(1);
    },
  );

  it("starts a tied release at the held pitch after a row break", () => {
    const firstRow = makeParent();
    const secondRow = makeParent();
    const bend = makeMeasureFromVoices([[makeBendBeat("Bend", [0, 2, 4])]]);
    const release = makeMeasureFromVoices([
      [makeBendBeat("ReleaseUp", [4, 2, 0], "Tie")],
    ]);
    const options = {
      beatLayouts: [makeBeatLayout()],
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    };
    const previousMeasureNotes = renderMeasureNotes({
      ...options,
      parent: firstRow,
      measure: bend,
      measureIndex: 0,
      bounds: makeBounds(),
      nextRowMeasure: release,
    });
    renderMeasureNotes({
      ...options,
      parent: secondRow,
      measure: release,
      measureIndex: 1,
      bounds: makeBounds({ y: 200 }),
      previousMeasureNotes,
    });

    const rise = firstRow.querySelector('[data-effect="bend"]')!;
    const fall = secondRow.querySelector('[data-effect="bend"]')!;
    const risingPaths = rise.querySelectorAll("path");
    const fallingPaths = fall.querySelectorAll("path");
    expect(risingPaths).toHaveLength(2);
    expect(fallingPaths).toHaveLength(2);
    expect(risingPaths[1].getAttribute("d")).toBe(
      BravuraNotationGlyphs.BEND_ARROW_UP.path,
    );
    expect(fallingPaths[1].getAttribute("d")).toBe(
      BravuraNotationGlyphs.BEND_ARROW_DOWN.path,
    );
    expect(rise.querySelector("text")?.textContent).toBe("full");
    expect(fall.querySelector("text")).toBeNull();
  });

  it("keeps an inherited bend without a release and fits its label at the right edge", () => {
    const parent = makeParent();
    const bounds = makeBounds({ width: 180 });
    const metrics = makeNoteMetrics();
    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBendBeat("Bend", [0, 2, 4]),
          makeBeat({ notes: [makeNote({ kind: "Tie" })] }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [
        makeBeatLayout({ x: 50, width: 90 }),
        makeBeatLayout({ beatIndex: 1, x: 140, width: 60 }),
      ],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics,
    });

    const bend = parent.querySelector('[data-effect="bend"]')!;
    expect(bend.getAttribute("data-beat-index")).toBe("1");
    const paths = bend.querySelectorAll("path");
    expect(paths).toHaveLength(2);
    expect(paths[1].getAttribute("d")).toBe(
      BravuraNotationGlyphs.BEND_ARROW_UP.path,
    );
    const label = bend.querySelector("text")!;
    expect(label.textContent).toBe("full");
    const fontSize = Number(label.getAttribute("font-size"));
    const labelHalfWidth = 2 * fontSize * constants.NOTE_GLYPH_WIDTH_RATIO;
    expect(
      Number(label.getAttribute("x")) + labelHalfWidth,
    ).toBeLessThanOrEqual(bounds.width);
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
