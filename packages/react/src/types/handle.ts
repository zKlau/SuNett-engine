import type { SunettEngine } from "@zklau/sunett-engine";

/**
 * Imperative handle exposed on `SunettTab`'s `ref`. It is the engine itself,
 * minus the lifecycle methods (`loadSong`, `render`, `dispose`) the component
 * owns - so playback, selection, theming, and query methods are all available at
 * runtime and stay in sync with the engine's API.
 */
export type SunettTabHandle = Omit<
  SunettEngine,
  "loadSong" | "render" | "dispose"
>;
