export type BendEffect = {
  kind: keyof typeof BendType;
  value: number;
  points: BendPoint[];
  semitone_length: number;
  max_position: number;
  max_value: number;
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
  position: number;
  value: number;
  vibrato: boolean;
};
