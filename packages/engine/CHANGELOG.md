# @zklau/sunett-engine

## 1.2.0

### Minor Changes

- c8c8965: Expose score compilation with expressive guitar events and preserve saved playback metadata.

## 1.1.0

### Minor Changes

- 1fb57b2: Add a per-beat timeline (`getBeatTimeline`, `getBeatsAt`, `getCurrentBeats`, `getNextBeatTime`, `getPreviousBeatTime`) and a `beatChanged` event, a playback rate (`setPlaybackRate`/`getPlaybackRate`), caller-defined note classes that survive re-renders (`setNoteClasses`/`getNoteClasses`/`clearNoteClasses`), and export `Emitter`, `BeatTracker`, the timeline helpers and the `Duration`, `TimeSignature` and `Chord` types.

  Fix Guitar Pro 3-5 tabs, whose notes number strings from 1: notes on the lowest string were dropped and the others were drawn one line off. String numbering is now resolved per file format; `noteStringIndex` and `openStringPitch` expose the same mapping.
