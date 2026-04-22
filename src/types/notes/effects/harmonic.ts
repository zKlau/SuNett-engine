import { Octave } from "../../octaves";
import { PitchClass } from "../../pitch";

export type HarmonicEffect = {
    kind: keyof typeof HarmonicType,
    pitch?: PitchClass,
    octave?: keyof typeof Octave,
    fret?: number,
};

const HarmonicType = {
    Natural: "Natural",
    Artificial: "Artificial",
    Tapped: "Tapped",
    Pinch: "Pinch",
    Semi: "Semi",
} as const;

