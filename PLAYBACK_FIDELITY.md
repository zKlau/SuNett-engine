# Score performance compilation

`compileSynthScore(song)` produces deterministic timed note events without creating an audio context or changing the input song. A synth can consume these events while the engine remains independent of sample libraries, amp models and live-input capture.

The public exports are `compileSynthScore`, `durationInQuarters`, `resolveTrackProgram`, `SynthScore` and `SynthNote`. Event times and pitch-curve offsets are milliseconds; MIDI pitches/programs are zero-based and velocity is normalized to 0–1. String indices follow the parser's zero-based indexing. Explicit GPIF MIDI programs take precedence over legacy channel metadata; names are only a fallback.

Implemented interpretation includes tuning/capo, percussion pitches, tuplets/dots, ties, accents, palm mute/dead/staccato selection, let-ring, bends, slides, natural-harmonic pitch, hammer-on transitions and vibrato flags. Brush strokes spread attacks in string order, grace notes precede the principal attack, and trills/tremolo picking expand at the notated rate. Header tempo changes persist until replaced.

## Limits

- Playback follows written measure order; repeat expansion and alternate endings are not implemented here.
- Mid-measure tempo changes, tempo ramps and mixer automation still require a shared tempo/automation map. Only measure-header tempos currently drive timing.
- Stroke spread and slide curves are deterministic approximations. Natural harmonics select pitch, not a dedicated sample. Grace slide/bend transitions do not yet have continuous transition curves.
- Repetition combined with a pitch curve currently retains the continuous pitched event; it does not expand attacks. Repetition expansion is capped at 1024 attacks per source note.
- Before-beat graces at song start become on-beat to avoid negative timestamps. A grace does not extend its source beat.
- This module does not render audio. Existing synth consumers must adopt this compiler to hear these changes; publishing the engine alone does not replace their bundled code or parser WASM.

Regression tests cover pitch, durations, ties, tempo persistence, bend/slide curves, harmonic pitch, strum order, ornaments and program selection. Existing visual/theme tests remain part of the full suite.
