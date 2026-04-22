export type BendEffect = {
    kind: keyof typeof BendType,
    value: number,
    points: BendPoint[],
    semitone_length: number, // The note offset per bend point offset
    max_position: number, // The max position of the bend points (x axis)
    max_value: number, // The max value of the bend points (y axis)
};

const BendType = {
    None: "None",
    Bend: "Bend",
    BendRelease: "BendRelease",
    BendReleaseBend: "BendReleaseBend",
    Prebend: "Prebend",
    PrebendRelease: "PrebendRelease",
    Dip: "Dip",
    Dive: "Dive",
    ReleaseUp: "ReleaseUp",
    InvertedDip: "InvertedDip",
    Return: "Return",
    ReleaseDown: "ReleaseDown",
} as const;

type BendPoint = {
    position: number,
    value: number,
    vibrato: boolean,
};