# @zklau/sunett-engine

## 1.2.2

### Patch Changes

- 7ca9359: Make the compact desktop and mobile layout the engine default, including shorter rhythm stems, smaller footers, and the approved 70px reduction from the former app presets. Recompute responsive defaults when the tab container resizes, preserving explicit renderer and theme sizing overrides and collision clearance. No website-specific presets or bundled engine archive are needed.

## 1.2.1

### Patch Changes

- af5db44: Allow shorter rhythm stems and smaller measure footers. Preserve staff-aligned barlines and playback cursors, and reserve clearance for tuplets, multiple voices, bends, and lyrics when compact rows are requested.
- af5db44: Preserve readable fret spacing at narrow widths, honor measures per row, follow dense bars horizontally during playback, and render smooth bend curves with labels derived from normalized pitch points.
- af5db44: Reserve space for slide marks and constrain their paths to the gap between notes. Treat hidden tied fret labels as invisible anchors so outgoing and incoming slides cannot cross the next fret number.

## 1.2.0

### Minor Changes

- c8c8965: Expose score compilation with expressive guitar events and preserve saved playback metadata.

## 1.1.0

### Minor Changes

- 1fb57b2: Add a per-beat timeline (`getBeatTimeline`, `getBeatsAt`, `getCurrentBeats`, `getNextBeatTime`, `getPreviousBeatTime`) and a `beatChanged` event, a playback rate (`setPlaybackRate`/`getPlaybackRate`), caller-defined note classes that survive re-renders (`setNoteClasses`/`getNoteClasses`/`clearNoteClasses`), and export `Emitter`, `BeatTracker`, the timeline helpers and the `Duration`, `TimeSignature` and `Chord` types.

  Fix Guitar Pro 3-5 tabs, whose notes number strings from 1: notes on the lowest string were dropped and the others were drawn one line off. String numbering is now resolved per file format; `noteStringIndex` and `openStringPitch` expose the same mapping.
