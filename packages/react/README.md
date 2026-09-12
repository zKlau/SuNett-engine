# @zklau/sunett-react

React adapter for [`@zklau/sunett-engine`](../../README.md). Renders a parsed
Guitar Pro song as a guitar-tab `<svg>` through a single declarative component,
`<SunettTab>`, while exposing the full engine for runtime control.

```bash
npm install @zklau/sunett-react @zklau/sunett-engine react
```

## Basic usage

The component owns the `<svg>` and the engine's lifecycle. You give it a `song`;
it loads, renders, resizes, and disposes on unmount.

```tsx
import { SunettTab } from "@zklau/sunett-react";

export function Tab({ song }) {
  return <SunettTab song={song} trackIndex={0} theme="dark" />;
}
```

## Runtime-modifiable config (declarative)

Every prop re-applies when it changes — no remount. Drive them from state and the
tab updates live:

```tsx
const [track, setTrack] = useState(0);
const [following, setFollowing] = useState(false);
const [snap, setSnap] = useState<SnapMode>(SnapMode.None);

<SunettTab
  song={song}
  trackIndex={track}
  theme={dark ? "dark" : "high-contrast"}
  autoScroll={following}
  selectionInput={{
    snap,
    onCreate: (range) => ({ label: "practice", color: "#22c55e" }),
    onEdit: (selection) => ({ label: prompt("New label:") ?? selection.label }),
  }}
  playbackInput
  options={{ measuresPerRow: 4, showTuning: true }}
/>;
```

- `theme` → re-themes in place.
- `trackIndex` / `options` → re-renders.
- `autoScroll`, `selectionInput`, `playbackInput` → attach/detach or reconfigure
  the behavior. Pass `true` for defaults, an options object to configure, or omit
  to leave it off. Callback props (`onCreate`, `onEdit`, …) always use their
  latest value without re-attaching listeners.

`cursor` and `selectionStore` are applied once when the engine is created and are
not re-applied on change.

## Runtime control (imperative)

For actions rather than state — playback transport, seeking, loops, selection
edits — reach the engine through the `ref`. It is the `SunettEngine` itself, so
every engine method is available and stays in sync with the library:

```tsx
import { useRef } from "react";
import { SunettTab, type SunettTabHandle } from "@zklau/sunett-react";

function Player({ song }) {
  const tab = useRef<SunettTabHandle>(null);

  return (
    <>
      <button onClick={() => tab.current?.play()}>Play</button>
      <button onClick={() => tab.current?.pause()}>Pause</button>
      <button onClick={() => tab.current?.seek(0)}>Restart</button>
      <button onClick={() => tab.current?.setLoop({ startMs: 0, endMs: 8000 })}>
        Loop intro
      </button>
      <SunettTab
        ref={tab}
        song={song}
        onPlaybackPositionChanged={(ms) => console.log(ms)}
        onSelectionsChanged={(selections) => console.log(selections)}
      />
    </>
  );
}
```

`onReady(engine)` hands you the same engine as soon as the song has loaded, for
imperative setup that shouldn't wait for a user event.

## Events

`onReady`, `onSelectionsChanged`, `onSelectionAdded`, `onSelectionUpdated`,
`onSelectionRemoved`, `onPlaybackPositionChanged`, and `onPlaybackStateChanged`
mirror the engine's event surface as props.
