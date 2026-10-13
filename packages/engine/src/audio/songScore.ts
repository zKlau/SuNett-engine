import type { Beat } from "../types/beats/beat";
import type { Duration } from "../types/duration";
import type { Note } from "../types/note";
import type { Song } from "../types/song";
import type { Track } from "../types/track";
import type { Voice } from "../types/voice";
import type {
  MeasureTiming,
  SongTimeline,
} from "../utils/timing/measureTimeline";
import { buildSongTimeline } from "../utils/timing/measureTimeline";
import { resolveTrackProgram } from "./trackInstrument";

const TICKS_PER_QUARTER = 960;
const DEFAULT_MIDI_VELOCITY = 95;
const MAX_MIDI_VELOCITY = 127;
const MIN_MIDI_NOTE = 0;
const MAX_MIDI_NOTE = 127;
const MAX_REPETITION_COUNT = 1024;
const DEFAULT_BEND_MAX_POSITION = 12;
const DEFAULT_BEND_SEMITONE_LENGTH = 1;
const MAX_BEND_CENTS = 2400;
const MIN_BEND_CENTS = -2400;
const SLIDE_INTO_CENTS = 300;
const SLIDE_OUT_CENTS = 500;
const DEFAULT_STRUM_VALUE = 64;
const DEFAULT_GRACE_VALUE = 32;

const NATURAL_HARMONIC_INTERVALS: Record<number, number> = {
  12: 12,
  7: 19,
  5: 24,
  4: 28,
  9: 28,
  3: 31,
};

export type SynthArticulation =
  | "sustain"
  | "palm-mute"
  | "dead"
  | "staccato"
  | "hammer";

export type SynthPitchPoint = {
  offsetMs: number;
  cents: number;
};

export type SynthNote = {
  trackIndex: number;
  startMs: number;
  endMs: number;
  midi: number;
  velocity: number;
  instrument: number;
  percussion: boolean;
  muted: boolean;
  articulation?: SynthArticulation;
  vibrato?: boolean;
  pitch?: SynthPitchPoint[];
  slideTo?: boolean;
  hammerTo?: boolean;
  letRing?: boolean;
  stringIndex?: number;
};

export type SynthScore = {
  notes: SynthNote[];
  durationMs: number;
};

type VoiceCompilationContext = {
  song: Song;
  track: Track;
  trackIndex: number;
  timeline: SongTimeline;
  timing: MeasureTiming;
  quarterMs: number;
  measureStart?: number;
  voice: Voice;
  voiceIndex: number;
  previousNotes: Map<string, SynthNote>;
  outNotes: SynthNote[];
};

type NoteCompilationContext = {
  context: VoiceCompilationContext;
  beat: Beat;
  note: Note;
  startMs: number;
  endMs: number;
  length: number;
  strokeOrder: number[];
};

export function durationInQuarters(duration: Duration): number {
  const value = positive(duration?.value, 4);
  let dots = 1;
  if (duration?.double_dotted) {
    dots = 1.75;
  } else if (duration?.dotted) {
    dots = 1.5;
  }
  const times = positive(duration?.tuplet_times, 1);
  const enters = positive(duration?.tuplet_enters, 1);
  return (4 / value) * dots * (times / enters);
}

export function compileSynthScore(song: Song): SynthScore {
  const notes: SynthNote[] = [];
  let durationMs = 0;

  for (let trackIndex = 0; trackIndex < song.tracks.length; trackIndex++) {
    const track = song.tracks[trackIndex];
    const timeline = buildSongTimeline(song, track);
    if (timeline.durationMs > durationMs) {
      durationMs = timeline.durationMs;
    }
    compileTrackNotes(song, track, trackIndex, timeline, notes);
  }

  notes.sort((a, b) => a.startMs - b.startMs);
  return { notes, durationMs };
}

function compileTrackNotes(
  song: Song,
  track: Track,
  trackIndex: number,
  timeline: SongTimeline,
  outNotes: SynthNote[],
): void {
  const previousNotes = new Map<string, SynthNote>();

  for (
    let measureIndex = 0;
    measureIndex < track.measures.length;
    measureIndex++
  ) {
    const measure = track.measures[measureIndex];
    const timing = timeline.measures[measureIndex];
    const denominator = positive(measure.time_signature?.denominator?.value, 4);
    const quarterMs = (timing.beatDurationMs * denominator) / 4;

    for (let voiceIndex = 0; voiceIndex < measure.voices.length; voiceIndex++) {
      const voice = measure.voices[voiceIndex];
      compileVoiceNotes({
        song,
        track,
        trackIndex,
        timeline,
        timing,
        quarterMs,
        measureStart: measure.start,
        voice,
        voiceIndex,
        previousNotes,
        outNotes,
      });
    }
  }
}

function compileVoiceNotes(context: VoiceCompilationContext): void {
  const { voice, timing, quarterMs, measureStart } = context;
  let cursor = timing.startMs;

  for (const beat of voice.beats) {
    if (beat.status === "Empty") {
      continue;
    }

    const length = durationInQuarters(beat.duration) * quarterMs;
    if (
      Number.isFinite(beat.start) &&
      Number.isFinite(measureStart) &&
      beat.start! >= measureStart!
    ) {
      cursor =
        timing.startMs +
        ((beat.start! - measureStart!) / TICKS_PER_QUARTER) * quarterMs;
    }

    const startMs = cursor;
    cursor += length;

    if (beat.status === "Rest" || startMs >= timing.endMs) {
      continue;
    }

    compileBeatNotes(context, beat, startMs, length);
  }
}

function compileBeatNotes(
  context: VoiceCompilationContext,
  beat: Beat,
  startMs: number,
  length: number,
): void {
  const strokeOrder = getStrokeStrings(beat);
  const endMs = Math.min(context.timing.endMs, startMs + length);

  for (const note of beat.notes) {
    compileNoteEvent({
      context,
      beat,
      note,
      startMs,
      endMs,
      length,
      strokeOrder,
    });
  }
}

function compileNoteEvent(params: NoteCompilationContext): void {
  const { context, beat, note, startMs, endMs, length, strokeOrder } = params;
  const {
    track,
    trackIndex,
    timeline,
    timing,
    voiceIndex,
    previousNotes,
    song,
  } = context;
  const key = `${voiceIndex}:${note.string}`;

  if (note.kind === "Tie") {
    const prior = previousNotes.get(key);
    if (prior && Math.abs(prior.endMs - startMs) < 1) {
      prior.endMs = endMs;
    }
    return;
  }

  if (note.kind === "Rest") {
    return;
  }

  const midi = resolveNoteMidi(track, note);
  if (!Number.isFinite(midi) || midi < MIN_MIDI_NOTE || midi > MAX_MIDI_NOTE) {
    return;
  }

  const effect = note.effect;
  const prior = previousNotes.get(key);
  const contiguous = prior !== undefined && Math.abs(prior.endMs - startMs) < 1;

  if (
    prior?.slideTo &&
    contiguous &&
    (!prior.pitch || prior.pitch.length === 0)
  ) {
    const priorLength = prior.endMs - prior.startMs;
    prior.pitch = [
      { offsetMs: 0, cents: 0 },
      { offsetMs: priorLength * 0.6, cents: 0 },
      { offsetMs: priorLength, cents: (midi - prior.midi) * 100 },
    ];
  }

  if (prior?.letRing) {
    prior.endMs = startMs;
  }

  const pitch = resolvePitchCurve(
    effect,
    length,
    Boolean(track.percussion_track),
  );
  let gate = positive(note.duration_percent, 1);
  if (effect?.staccato) {
    gate *= 0.5;
  }

  let eventEndMs = Math.min(timing.endMs, startMs + length * gate);
  if (effect?.let_ring && !track.percussion_track) {
    eventEndMs = timeline.durationMs;
  }

  const event: SynthNote = {
    trackIndex,
    startMs,
    endMs: eventEndMs,
    midi,
    velocity: resolveVelocity(note, effect),
    instrument: resolveTrackProgram(song, track),
    percussion: Boolean(track.percussion_track),
    muted: Boolean(effect?.palm_mute || note.kind === "Dead"),
    articulation: resolveArticulation(note, effect, contiguous, prior),
    pitch,
    slideTo: Boolean(
      effect?.slides?.some(
        (s) => s === "ShiftSlideTo" || s === "LegatoSlideTo",
      ),
    ),
    hammerTo:
      Boolean(effect?.hammer) ||
      Boolean(effect?.slides?.includes("LegatoSlideTo")),
    letRing: Boolean(effect?.let_ring),
    vibrato: Boolean(effect?.vibrato || beat.effect?.vibrato),
    stringIndex: note.string,
  };

  const strokeIndex = strokeOrder.indexOf(note.string);
  if (strokeIndex >= 0 && strokeOrder.length > 1) {
    const strokeValue = positive(
      beat.effect?.stroke?.value,
      DEFAULT_STRUM_VALUE,
    );
    const maxSpread = (context.quarterMs * 4) / strokeValue;
    const spread = Math.min(
      length * 0.5,
      (event.endMs - event.startMs) * 0.5,
      maxSpread,
    );
    event.startMs += (spread * strokeIndex) / (strokeOrder.length - 1);
  }

  const performance = realizeTechniques(event, note, context.quarterMs, endMs);
  context.outNotes.push(...performance);
  previousNotes.set(key, performance[performance.length - 1]);
}

function resolveNoteMidi(track: Track, note: Note): number {
  if (track.percussion_track) {
    return note.value;
  }
  const tuning = track.strings[note.string]?.[1];
  if (typeof tuning !== "number") {
    return NaN;
  }
  const trackOffset = track.offset ?? 0;
  if (note.effect?.harmonic?.kind === "Natural") {
    const interval = NATURAL_HARMONIC_INTERVALS[note.value];
    if (interval !== undefined) {
      return tuning + trackOffset + interval;
    }
  }
  return tuning + note.value + trackOffset;
}

function resolvePitchCurve(
  effect: Note["effect"] | undefined,
  length: number,
  isPercussion: boolean,
): SynthPitchPoint[] | undefined {
  if (isPercussion) {
    return undefined;
  }
  const bendPoints = resolveBendPoints(effect?.bend, length);
  if (bendPoints.length > 0) {
    return bendPoints;
  }
  const slidePoints = resolveSlidePoints(effect?.slides, length);
  if (slidePoints.length > 0) {
    return slidePoints;
  }
  return [];
}

function resolveBendPoints(
  bend: Note["effect"]["bend"] | undefined,
  length: number,
): SynthPitchPoint[] {
  if (!bend?.points) {
    return [];
  }
  const maxPosition = bend.max_position || DEFAULT_BEND_MAX_POSITION;
  const semitoneLength = bend.semitone_length || DEFAULT_BEND_SEMITONE_LENGTH;

  return bend.points
    .filter((p) => Number.isFinite(p.position) && Number.isFinite(p.value))
    .map((p) => {
      const positionRatio = Math.max(0, Math.min(1, p.position / maxPosition));
      const rawCents = (p.value * 50) / semitoneLength;
      return {
        offsetMs: positionRatio * length,
        cents: Math.max(MIN_BEND_CENTS, Math.min(MAX_BEND_CENTS, rawCents)),
      };
    })
    .sort((a, b) => a.offsetMs - b.offsetMs);
}

function resolveSlidePoints(
  slides: string[] | undefined,
  length: number,
): SynthPitchPoint[] {
  if (!slides || slides.length === 0) {
    return [];
  }
  const hasIntoAbove = slides.includes("IntoFromAbove");
  const hasIntoBelow = slides.includes("IntoFromBelow");
  if (hasIntoAbove || hasIntoBelow) {
    let cents = -SLIDE_INTO_CENTS;
    if (hasIntoAbove) {
      cents = SLIDE_INTO_CENTS;
    }
    return [
      { offsetMs: 0, cents },
      { offsetMs: Math.min(length * 0.3, 120), cents: 0 },
    ];
  }

  const hasOutDown = slides.includes("OutDownwards");
  const hasOutUp = slides.includes("OutUpWards");
  if (hasOutDown || hasOutUp) {
    let cents = SLIDE_OUT_CENTS;
    if (hasOutDown) {
      cents = -SLIDE_OUT_CENTS;
    }
    return [
      { offsetMs: 0, cents: 0 },
      { offsetMs: length * 0.6, cents: 0 },
      { offsetMs: length, cents },
    ];
  }

  return [];
}

function resolveVelocity(
  note: Note,
  effect: Note["effect"] | undefined,
): number {
  const noteVelocity = note.velocity ?? DEFAULT_MIDI_VELOCITY;
  let normalized = noteVelocity / MAX_MIDI_VELOCITY;
  if (effect?.ghost_note) {
    normalized *= 0.5;
  }
  if (effect?.heavy_accentuated_note) {
    normalized *= 1.2;
  } else if (effect?.accentuated_note) {
    normalized *= 1.1;
  }
  return Math.min(1, Math.max(0, normalized));
}

function resolveArticulation(
  note: Note,
  effect: Note["effect"] | undefined,
  contiguous: boolean,
  prior: SynthNote | undefined,
): SynthArticulation {
  if (note.kind === "Dead") {
    return "dead";
  }
  if (effect?.palm_mute) {
    return "palm-mute";
  }
  if (effect?.staccato) {
    return "staccato";
  }
  if (contiguous && prior?.hammerTo) {
    return "hammer";
  }
  return "sustain";
}

function getStrokeStrings(beat: Beat): number[] {
  const stroke = beat.effect?.stroke;
  if (!stroke || stroke.direction === "None") {
    return [];
  }
  const ascending = (stroke.direction === "Up") !== Boolean(stroke.swap);
  const uniqueStrings = [...new Set(beat.notes.map((note) => note.string))];
  return uniqueStrings.sort((a, b) => {
    if (ascending) {
      return a - b;
    }
    return b - a;
  });
}

function realizeTechniques(
  event: SynthNote,
  note: Note,
  quarterMs: number,
  writtenEndMs: number,
): SynthNote[] {
  const result: SynthNote[] = [];
  const effect = note.effect;
  const grace = effect?.grace;

  if (grace && !event.percussion && Number.isFinite(grace.fret)) {
    const graceDivisor = positive(grace.duration, DEFAULT_GRACE_VALUE);
    const maxGraceDuration =
      (Math.min(event.endMs, writtenEndMs) - event.startMs) * 0.5;
    const duration = Math.min((quarterMs * 4) / graceDivisor, maxGraceDuration);
    const onBeat = Boolean(grace.is_on_beat) || event.startMs < duration;
    let start = event.startMs - duration;
    if (onBeat) {
      start = event.startMs;
    }

    let graceMidi = event.midi;
    if (!grace.is_dead) {
      graceMidi = event.midi - note.value + grace.fret;
    }

    if (
      graceMidi >= MIN_MIDI_NOTE &&
      graceMidi <= MAX_MIDI_NOTE &&
      duration > 0
    ) {
      let articulation: SynthArticulation = "sustain";
      if (grace.is_dead) {
        articulation = "dead";
      }

      result.push({
        ...event,
        midi: graceMidi,
        startMs: start,
        endMs: start + duration,
        velocity: Math.min(1, Math.max(0, grace.velocity / MAX_MIDI_VELOCITY)),
        articulation,
        pitch: undefined,
        letRing: false,
        hammerTo: grace.transition === "Hammer",
        slideTo: false,
      });

      if (onBeat) {
        event.startMs += duration;
      }
      if (grace.transition === "Hammer") {
        event.articulation = "hammer";
      }
    }
  }

  const repetition =
    effect?.trill?.duration ?? effect?.tremolo_picking?.duration;
  if (
    !repetition ||
    (event.pitch && event.pitch.length > 0) ||
    event.percussion
  ) {
    result.push(event);
    return result;
  }

  const step = Math.max(1, durationInQuarters(repetition) * quarterMs);
  const repeatEndMs = Math.min(event.endMs, writtenEndMs);
  const count = Math.min(
    MAX_REPETITION_COUNT,
    Math.ceil((repeatEndMs - event.startMs) / step),
  );

  for (let index = 0; index < count; index++) {
    let midi = event.midi;
    if (effect?.trill && index % 2 !== 0) {
      midi = event.midi - note.value + effect.trill.fret;
    }
    if (
      !Number.isFinite(midi) ||
      midi < MIN_MIDI_NOTE ||
      midi > MAX_MIDI_NOTE
    ) {
      continue;
    }

    let articulation = event.articulation;
    if (effect?.trill && index > 0) {
      articulation = "hammer";
    }

    result.push({
      ...event,
      midi,
      startMs: event.startMs + index * step,
      endMs: Math.min(repeatEndMs, event.startMs + (index + 1) * step),
      articulation,
      letRing: false,
    });
  }

  if (result.length > 0) {
    return result;
  }
  return [event];
}

function positive(value: number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return fallback;
}
