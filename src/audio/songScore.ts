import { resolveTrackProgram } from "./trackInstrument";
import type { Song } from "../types/song";
import type { Note } from "../types/note";
import type { Beat } from "../types/beats/beat";
import type { Duration } from "../types/duration";
import { buildSongTimeline } from "../utils/timing/measureTimeline";

export type SynthNote = {
  trackIndex: number;
  startMs: number;
  endMs: number;
  midi: number;
  velocity: number;
  instrument: number;
  percussion: boolean;
  muted: boolean;
  articulation?: "sustain" | "palm-mute" | "dead" | "staccato" | "hammer";
  vibrato?: boolean;
  pitch?: { offsetMs: number; cents: number }[];
  slideTo?: boolean;
  hammerTo?: boolean;
  letRing?: boolean;
  stringIndex?: number;
};

export type SynthScore = { notes: SynthNote[]; durationMs: number };

/** Musical length in quarter notes. Double dots supersede a single dot. */
export function durationInQuarters(duration: Duration): number {
  const value = positive(duration?.value, 4);
  const dots = duration?.double_dotted ? 1.75 : duration?.dotted ? 1.5 : 1;
  return (
    (4 / value) *
    dots *
    (positive(duration?.tuplet_times, 1) / positive(duration?.tuplet_enters, 1))
  );
}

/** Compiles the written score in the same linear measure order as the renderer. */
export function compileSynthScore(song: Song): SynthScore {
  const notes: SynthNote[] = [];
  let durationMs = 0;
  song.tracks.forEach((track, trackIndex) => {
    const timeline = buildSongTimeline(song, track);
    durationMs = Math.max(durationMs, timeline.durationMs);
    const previous = new Map<string, SynthNote>();
    track.measures.forEach((measure, index) => {
      const timing = timeline.measures[index];
      const denominator = positive(
        measure.time_signature?.denominator?.value,
        4,
      );
      const quarterMs = (timing.beatDurationMs * denominator) / 4;
      measure.voices.forEach((voice, voiceIndex) => {
        let cursor = timing.startMs;
        voice.beats.forEach((beat) => {
          if (beat.status === "Empty") {
            return;
          }
          const length = durationInQuarters(beat.duration) * quarterMs;
          if (
            Number.isFinite(beat.start) &&
            Number.isFinite(measure.start) &&
            beat.start! >= measure.start
          ) {
            cursor =
              timing.startMs +
              ((beat.start! - measure.start) / 960) * quarterMs;
          }
          const startMs = cursor;
          cursor += length;
          if (beat.status === "Rest" || startMs >= timing.endMs) {
            return;
          }
          const strokeOrder = strokeStrings(beat);
          beat.notes.forEach((note) => {
            const key = `${voiceIndex}:${note.string}`;
            const endMs = Math.min(timing.endMs, startMs + length);
            if (note.kind === "Tie") {
              const prior = previous.get(key);
              if (prior && Math.abs(prior.endMs - startMs) < 1) {
                prior.endMs = endMs;
              }
              return;
            }
            if (note.kind === "Rest") {
              return;
            }
            /** Parser string indices are zero-based; tuple labels are one-based. */
            const tuning = track.strings[note.string]?.[1];
            let midi = track.percussion_track
              ? note.value
              : (tuning ?? NaN) + note.value + (track.offset ?? 0);
            if (!Number.isFinite(midi) || midi < 0 || midi > 127) {
              return;
            }
            const effect = note.effect;
            if (
              !track.percussion_track &&
              effect?.harmonic?.kind === "Natural"
            ) {
              const interval = (
                { 12: 12, 7: 19, 5: 24, 4: 28, 9: 28, 3: 31 } as Record<
                  number,
                  number
                >
              )[note.value];
              if (interval !== undefined) {
                midi = tuning + (track.offset ?? 0) + interval;
              }
            }
            const prior = previous.get(key);
            const contiguous = prior && Math.abs(prior.endMs - startMs) < 1;
            if (prior?.slideTo && contiguous && !prior.pitch?.length) {
              const length = prior.endMs - prior.startMs;
              prior.pitch = [
                { offsetMs: 0, cents: 0 },
                { offsetMs: length * 0.6, cents: 0 },
                { offsetMs: length, cents: (midi - prior.midi) * 100 },
              ];
            }
            if (prior?.letRing) {
              prior.endMs = startMs;
            }
            const pitch =
              effect?.bend?.points
                ?.filter(
                  (p) =>
                    Number.isFinite(p.position) && Number.isFinite(p.value),
                )
                .map((p) => ({
                  offsetMs:
                    Math.max(
                      0,
                      Math.min(
                        1,
                        p.position / (effect.bend!.max_position || 12),
                      ),
                    ) * length,
                  cents: Math.max(
                    -2400,
                    Math.min(
                      2400,
                      (p.value * 50) / (effect.bend!.semitone_length || 1),
                    ),
                  ),
                }))
                .sort((a, b) => a.offsetMs - b.offsetMs) ?? [];
            if (
              !pitch.length &&
              effect?.slides?.some(
                (s) => s === "IntoFromAbove" || s === "IntoFromBelow",
              )
            ) {
              pitch.push(
                {
                  offsetMs: 0,
                  cents: effect.slides.includes("IntoFromAbove") ? 300 : -300,
                },
                { offsetMs: Math.min(length * 0.3, 120), cents: 0 },
              );
            }
            if (
              !pitch.length &&
              effect?.slides?.some(
                (s) => s === "OutDownwards" || s === "OutUpWards",
              )
            ) {
              pitch.push(
                { offsetMs: 0, cents: 0 },
                { offsetMs: length * 0.6, cents: 0 },
                {
                  offsetMs: length,
                  cents: effect.slides.includes("OutDownwards") ? -500 : 500,
                },
              );
            }
            const gate =
              positive(note.duration_percent, 1) * (effect?.staccato ? 0.5 : 1);
            const event: SynthNote = {
              trackIndex,
              startMs,
              endMs:
                effect?.let_ring && !track.percussion_track
                  ? timeline.durationMs
                  : Math.min(timing.endMs, startMs + length * gate),
              midi,
              velocity:
                Math.min(1, Math.max(0, (note.velocity ?? 95) / 127)) *
                (effect?.ghost_note ? 0.5 : 1) *
                (effect?.heavy_accentuated_note
                  ? 1.2
                  : effect?.accentuated_note
                    ? 1.1
                    : 1),
              articulation:
                note.kind === "Dead"
                  ? "dead"
                  : effect?.palm_mute
                    ? "palm-mute"
                    : effect?.staccato
                      ? "staccato"
                      : contiguous && prior?.hammerTo
                        ? "hammer"
                        : "sustain",
              pitch: track.percussion_track ? undefined : pitch,
              slideTo: effect?.slides?.some(
                (s) => s === "ShiftSlideTo" || s === "LegatoSlideTo",
              ),
              hammerTo:
                !!effect?.hammer || !!effect?.slides?.includes("LegatoSlideTo"),
              letRing: !!effect?.let_ring,
              vibrato: !!effect?.vibrato || !!beat.effect?.vibrato,
              stringIndex: note.string,
              instrument: resolveTrackProgram(song, track),
              percussion: !!track.percussion_track,
              muted: !!effect?.palm_mute || note.kind === "Dead",
            };
            event.velocity = Math.min(1, Math.max(0, event.velocity));
            const strokeIndex = strokeOrder.indexOf(note.string);
            if (strokeIndex >= 0 && strokeOrder.length > 1) {
              const spread = Math.min(
                length * 0.5,
                (quarterMs * 4) / positive(beat.effect.stroke.value, 64),
              );
              event.startMs +=
                (spread * strokeIndex) / (strokeOrder.length - 1);
            }
            const performance = realizeTechniques(event, note, quarterMs);
            notes.push(...performance);
            previous.set(key, performance[performance.length - 1]);
          });
        });
      });
    });
  });
  notes.sort((a, b) => a.startMs - b.startMs);
  return { notes, durationMs };
}

function positive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value! > 0 ? value! : fallback;
}

/** Orders physical strings for a brush stroke; a pick-direction label alone is not a strum. */
function strokeStrings(beat: Beat): number[] {
  const stroke = beat.effect?.stroke;
  if (!stroke || stroke.direction === "None") {
    return [];
  }
  const ascending = (stroke.direction === "Up") !== !!stroke.swap;
  return [...new Set(beat.notes.map((note) => note.string))].sort((a, b) =>
    ascending ? a - b : b - a,
  );
}

/** Realizes discrete ornaments while preserving the containing beat's endpoint. */
function realizeTechniques(
  event: SynthNote,
  note: Note,
  quarterMs: number,
): SynthNote[] {
  const result: SynthNote[] = [];
  const effect = note.effect;
  const grace = effect?.grace;
  if (grace && !event.percussion && Number.isFinite(grace.fret)) {
    const duration = Math.min(
      (quarterMs * 4) / positive(grace.duration, 32),
      (event.endMs - event.startMs) * 0.5,
    );
    const onBeat = grace.is_on_beat || event.startMs < duration;
    const start = onBeat ? event.startMs : event.startMs - duration;
    const graceMidi = grace.is_dead
      ? event.midi
      : event.midi - note.value + grace.fret;
    if (graceMidi >= 0 && graceMidi <= 127 && duration > 0) {
      result.push({
        ...event,
        midi: graceMidi,
        startMs: start,
        endMs: start + duration,
        velocity: Math.min(1, Math.max(0, grace.velocity / 127)),
        articulation: grace.is_dead ? "dead" : "sustain",
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
  if (!repetition || event.pitch?.length || event.percussion) {
    result.push(event);
    return result;
  }
  const step = Math.max(1, durationInQuarters(repetition) * quarterMs);
  const count = Math.min(1024, Math.ceil((event.endMs - event.startMs) / step));
  for (let index = 0; index < count; index++) {
    const midi =
      effect?.trill && index % 2
        ? event.midi - note.value + effect.trill.fret
        : event.midi;
    if (!Number.isFinite(midi) || midi < 0 || midi > 127) {
      continue;
    }
    result.push({
      ...event,
      midi,
      startMs: event.startMs + index * step,
      endMs: Math.min(event.endMs, event.startMs + (index + 1) * step),
      articulation: effect?.trill && index > 0 ? "hammer" : event.articulation,
      letRing: false,
    });
  }
  return result.length ? result : [event];
}
