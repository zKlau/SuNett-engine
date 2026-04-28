import type { BendEffect } from "./effects/bend";
import type { GraceEffect } from "./effects/grace";
import type { HarmonicEffect } from "./effects/harmonic";
import type { TremoloPickingEffect } from "./effects/tremoloPicking";
import type { TrillEffect } from "./effects/trill";

import type { Fingering } from "./fingering";
import type { SlideType } from "./effects/slide";

export type NoteEffect = {
  accentuated_note: boolean;
  bend?: BendEffect;
  ghost_note: boolean;
  grace?: GraceEffect;
  hammer: boolean;
  harmonic?: HarmonicEffect;
  heavy_accentuated_note: boolean;
  left_hand_finger: keyof typeof Fingering;
  let_ring: boolean;
  palm_mute: boolean;
  right_hand_finger: keyof typeof Fingering;
  slides: (keyof typeof SlideType)[];
  staccato: boolean;
  tremolo_picking?: TremoloPickingEffect;
  trill?: TrillEffect;
  vibrato: boolean;
  ornament?: string;
};
