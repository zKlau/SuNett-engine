# @zklau/sunett-react

## 0.1.0

### Minor Changes

- f406c86: Initial release of the React adapter. Adds the `<SunettTab>` component wrapping `SunettEngine`: it owns the `<svg>` and engine lifecycle, re-applies props at runtime (theme, track, layout options, and `selectionInput`/`playbackInput`/`autoScroll` toggles), forwards the engine's selection and playback events as callbacks, and exposes the engine on a `ref` for imperative control.
